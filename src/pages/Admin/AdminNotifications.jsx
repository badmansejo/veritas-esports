import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminNotifications.css'

const CATEGORIES = [
  'Announcements',
  'Matches',
  'Tournaments',
  'Wallet',
  'Rewards',
  'Security',
]

export default function AdminNotifications() {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const [sendMode, setSendMode] = useState('one')
  const [userId, setUserId] = useState('')
  const [category, setCategory] = useState('Announcements')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoadingUsers(true)
    setMessage('')

    const {
      data,
      error,
    } = await supabase
      .from('profiles')
      .select(
        'id, username, email, veritas_user_id'
      )
      .order('username', {
        ascending: true,
      })

    if (error) {
      console.error(
        'Admin users error:',
        error
      )

      setMessage(error.message)
    } else {
      setUsers(data || [])
    }

    setLoadingUsers(false)
  }

  async function sendPushToUser(
    targetUserId,
    notification
  ) {
    const {
      data: subscriptions,
      error,
    } = await supabase
      .from('push_subscriptions')
      .select(
        'endpoint, p256dh, auth'
      )
      .eq('user_id', targetUserId)

    if (error) {
      console.error(
        'Push subscription lookup error:',
        error
      )
      return
    }

    if (!subscriptions?.length) {
      return
    }

    for (const subscription of subscriptions) {
      try {
        const {
          error: pushError,
        } = await supabase.functions.invoke(
          'send-push-notification',
          {
            body: {
              endpoint:
                subscription.endpoint,
              p256dh:
                subscription.p256dh,
              auth:
                subscription.auth,
              title:
                notification.title,
              message:
                notification.message,
              link:
                notification.link ||
                '/notifications',
            },
          }
        )

        if (pushError) {
          console.error(
            'Push function error:',
            pushError
          )
        }
      } catch (error) {
        console.error(
          'Push send error:',
          error
        )
      }
    }
  }

  async function sendNotification(event) {
    event.preventDefault()

    setMessage('')

    if (sendMode === 'one' && !userId) {
      setMessage('Select a user.')
      return
    }

    if (!title.trim()) {
      setMessage(
        'Enter a notification title.'
      )
      return
    }

    if (!body.trim()) {
      setMessage(
        'Enter a notification message.'
      )
      return
    }

    if (
      sendMode === 'all' &&
      users.length === 0
    ) {
      setMessage(
        'There are no users to notify.'
      )
      return
    }

    setSending(true)

    const notificationData = {
      category,
      type: category,
      title: title.trim(),
      message: body.trim(),
      is_read: false,
      link: link.trim() || null,
    }

    let targetUsers = []

    if (sendMode === 'all') {
      targetUsers = users
    } else {
      const selectedUser =
        users.find(
          (user) =>
            user.id === userId
        )

      if (selectedUser) {
        targetUsers = [
          selectedUser,
        ]
      }
    }

    const insertData =
      targetUsers.map((user) => ({
        ...notificationData,
        user_id: user.id,
      }))

    const {
      error,
    } = await supabase
      .from('notifications')
      .insert(insertData)

    if (error) {
      console.error(
        'Admin notification error:',
        error
      )

      setMessage(error.message)
      setSending(false)
      return
    }

    for (const user of targetUsers) {
      await sendPushToUser(
        user.id,
        notificationData
      )
    }

    setMessage(
      sendMode === 'all'
        ? `Notification sent to ${targetUsers.length} users successfully.`
        : 'Notification sent successfully.'
    )

    setTitle('')
    setBody('')
    setLink('')
    setUserId('')
    setSending(false)
  }

  return (
    <div className="admin-notifications-page">
      <div className="admin-notifications-container">

        <div className="admin-notifications-header">
          <div>
            <h1>Notifications</h1>

            <p>
              Send notifications to VERITAS users.
            </p>
          </div>
        </div>

        <form
          className="admin-notifications-card"
          onSubmit={sendNotification}
        >

          <div className="admin-field">
            <label>
              Send To
            </label>

            <select
              value={sendMode}
              onChange={(event) => {
                setSendMode(
                  event.target.value
                )
                setUserId('')
                setMessage('')
              }}
            >
              <option value="one">
                One User
              </option>

              <option value="all">
                All Users
              </option>
            </select>
          </div>

          {sendMode === 'one' && (
            <div className="admin-field">
              <label>
                User
              </label>

              <select
                value={userId}
                onChange={(event) =>
                  setUserId(
                    event.target.value
                  )
                }
                disabled={loadingUsers}
              >
                <option value="">
                  {loadingUsers
                    ? 'Loading users...'
                    : 'Select user'}
                </option>

                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.username ||
                      'No username'}
                    {' — '}
                    {user.veritas_user_id ||
                      ''}
                    {' — '}
                    {user.email || ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {sendMode === 'all' && (
            <div className="admin-recipient-info">
              This notification will be sent to all{' '}
              <strong>
                {users.length}
              </strong>{' '}
              users.
            </div>
          )}

          <div className="admin-field">
            <label>
              Category
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
            >
              {CATEGORIES.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-field">
            <label>
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="Notification title"
            />
          </div>

          <div className="admin-field">
            <label>
              Message
            </label>

            <textarea
              value={body}
              onChange={(event) =>
                setBody(
                  event.target.value
                )
              }
              placeholder="Notification message"
              rows="5"
            />
          </div>

          <div className="admin-field">
            <label>
              App Link
            </label>

            <input
              type="text"
              value={link}
              onChange={(event) =>
                setLink(
                  event.target.value
                )
              }
              placeholder="/notifications"
            />
          </div>

          {message && (
            <div className="admin-notification-message">
              {message}
            </div>
          )}

          <button
            className="admin-send-notification"
            type="submit"
            disabled={sending}
          >
            {sending
              ? 'Sending...'
              : sendMode === 'all'
                ? 'Send To All Users'
                : 'Send Notification'}
          </button>

        </form>

      </div>
    </div>
  )
}
