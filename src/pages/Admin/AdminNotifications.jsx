import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminNotifications() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState('ALL')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [link, setLink] = useState('/notifications')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, veritas_user_id, email')
      .order('username', { ascending: true })

    if (error) {
      console.error(error)
      setResult(error.message)
      return
    }

    setUsers(data || [])
  }

  async function sendToUser(userId) {
    const notificationResult = await supabase.rpc(
      'admin_create_notification',
      {
        p_user_id: userId,
        p_title: title.trim(),
        p_message: message.trim(),
        p_category: 'Announcements',
        p_link: link.trim() || '/notifications',
      }
    )

    if (notificationResult.error) {
      throw notificationResult.error
    }

    const pushResult = await supabase.functions.invoke(
      'send-push-notification',
      {
        body: {
          user_id: userId,
          title: title.trim(),
          message: message.trim(),
          link: link.trim() || '/notifications',
        },
      }
    )

    if (pushResult.error) {
      console.error('Push error:', pushResult.error)
    }

    return {
      notificationId: notificationResult.data,
      pushSent: pushResult.data?.sent || 0,
    }
  }

  async function getTelegramDeliveredCount(notificationIds) {
    if (!notificationIds.length) {
      return 0
    }

    const maxAttempts = 15

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { data, error } = await supabase.rpc(
        'admin_get_telegram_delivery_count',
        {
          p_notification_ids: notificationIds,
        }
      )

      if (error) {
        console.error(
          'Telegram delivery count error:',
          error
        )
        return 0
      }

      const delivered = Number(data || 0)

      if (delivered >= notificationIds.length) {
        return delivered
      }

      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        )
      }
    }

    const { data, error } = await supabase.rpc(
      'admin_get_telegram_delivery_count',
      {
        p_notification_ids: notificationIds,
      }
    )

    if (error) {
      console.error(
        'Final Telegram delivery count error:',
        error
      )
      return 0
    }

    return Number(data || 0)
  }

  async function sendNotification() {
    if (!title.trim() || !message.trim()) {
      setResult('Enter a title and message.')
      return
    }

    if (
      selectedUser !== 'ALL' &&
      !selectedUser
    ) {
      setResult('Select a user.')
      return
    }

    setSending(true)
    setResult('Sending...')

    try {
      let targetUsers = []

      if (selectedUser === 'ALL') {
        targetUsers = users
      } else {
        const selected = users.find(
          (user) => user.id === selectedUser
        )

        if (selected) {
          targetUsers = [selected]
        }
      }

      if (targetUsers.length === 0) {
        throw new Error('No users found.')
      }

      let pushSent = 0
      let saved = 0
      const notificationIds = []

      for (const user of targetUsers) {
        const resultData =
          await sendToUser(user.id)

        saved++
        pushSent += resultData.pushSent

        notificationIds.push(
          resultData.notificationId
        )
      }

      setResult(
        'Waiting for Telegram delivery...'
      )

      const telegramDelivered =
        await getTelegramDeliveredCount(
          notificationIds
        )

      if (selectedUser === 'ALL') {
        setResult(
          `Successfully sent to ${saved} users. Chrome push: ${pushSent}. Telegram delivered: ${telegramDelivered}.`
        )
      } else {
        setResult(
          `Notification sent successfully. Chrome push: ${pushSent}. Telegram delivered: ${telegramDelivered}.`
        )
      }

      setTitle('')
      setMessage('')
    } catch (error) {
      console.error(error)

      setResult(
        error?.message ||
          'Failed to send notification.'
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        padding: '32px',
        background: '#070b14',
        color: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: '700px',
          margin: '0 auto',
        }}
      >
        <h1>Admin Notifications</h1>

        <p style={{ color: '#9ca3af' }}>
          Send VERITAS notifications by Chrome push,
          in-app notification and Telegram.
        </p>

        <div
          style={{
            display: 'grid',
            gap: '16px',
            marginTop: '30px',
          }}
        >
          <select
            value={selectedUser}
            onChange={(e) =>
              setSelectedUser(e.target.value)
            }
            style={{
              padding: '14px',
              borderRadius: '8px',
              background: '#111827',
              color: '#fff',
              border: '1px solid #374151',
            }}
          >
            <option value="ALL">
              📢 ALL USERS
            </option>

            {users.map((user) => (
              <option
                key={user.id}
                value={user.id}
              >
                {user.username || 'No username'} —{' '}
                {user.veritas_user_id || user.id}
              </option>
            ))}
          </select>

          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Notification title"
            style={{
              padding: '14px',
              borderRadius: '8px',
              background: '#111827',
              color: '#fff',
              border: '1px solid #374151',
            }}
          />

          <textarea
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            placeholder="Notification message"
            rows={5}
            style={{
              padding: '14px',
              borderRadius: '8px',
              background: '#111827',
              color: '#fff',
              border: '1px solid #374151',
              resize: 'vertical',
            }}
          />

          <input
            value={link}
            onChange={(e) =>
              setLink(e.target.value)
            }
            placeholder="/notifications"
            style={{
              padding: '14px',
              borderRadius: '8px',
              background: '#111827',
              color: '#fff',
              border: '1px solid #374151',
            }}
          />

          <button
            type="button"
            onClick={sendNotification}
            disabled={sending}
            style={{
              padding: '15px',
              borderRadius: '8px',
              border: 'none',
              background: '#2563eb',
              color: '#fff',
              fontWeight: 800,
              cursor: sending
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            {sending
              ? 'SENDING...'
              : selectedUser === 'ALL'
                ? 'SEND TO ALL USERS'
                : 'SEND NOTIFICATION'}
          </button>

          {result && (
            <div
              style={{
                padding: '14px',
                borderRadius: '8px',
                background: '#111827',
                color: '#d1d5db',
              }}
            >
              {result}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
