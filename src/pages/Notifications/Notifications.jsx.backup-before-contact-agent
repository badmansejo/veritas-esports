import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import './Notifications.css'

const TABS = [
  'All',
  'Matches',
  'Tournaments',
  'Wallet',
  'Rewards',
  'Security',
  'Announcements',
]

function formatTime(value) {
  if (!value) return ''

  const date = new Date(value)
  const now = new Date()

  const seconds = Math.floor(
    (now.getTime() - date.getTime()) / 1000
  )

  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)

  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString()
}

function iconFor(category) {
  switch (category) {
    case 'Matches':
      return '⚽'
    case 'Tournaments':
      return '🏆'
    case 'Wallet':
      return '💰'
    case 'Rewards':
      return '🎁'
    case 'Security':
      return '🔐'
    case 'Announcements':
      return '📢'
    default:
      return '🔔'
  }
}

export default function Notifications() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [notifications, setNotifications] =
    useState([])

  const [activeTab, setActiveTab] =
    useState('All')

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  async function loadNotifications() {
    if (!user?.id) {
      setNotifications([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const {
      data,
      error: fetchError,
    } = await supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        category,
        type,
        title,
        message,
        is_read,
        link,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })

    if (fetchError) {
      console.error(
        'VERITAS notifications error:',
        fetchError
      )

      setError(fetchError.message)
      setNotifications([])
    } else {
      setNotifications(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadNotifications()
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(
        `veritas-notifications-${user.id}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((current) => [
            payload.new,
            ...current,
          ])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'postgres_changes',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const unreadCount =
    notifications.filter(
      (item) => !item.is_read
    ).length

  const filteredNotifications =
    useMemo(() => {
      if (activeTab === 'All') {
        return notifications
      }

      return notifications.filter(
        (item) =>
          (item.category || item.type) ===
          activeTab
      )
    }, [
      notifications,
      activeTab,
    ])

  async function markRead(id) {
    const {
      error: updateError,
    } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('id', id)
      .eq('user_id', user.id)

    if (updateError) {
      console.error(
        'VERITAS mark read error:',
        updateError
      )
      return
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              is_read: true,
            }
          : item
      )
    )
  }

  async function markAllRead() {
    if (
      !user?.id ||
      unreadCount === 0
    ) {
      return
    }

    const {
      error: updateError,
    } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (updateError) {
      console.error(
        'VERITAS mark all read error:',
        updateError
      )
      return
    }

    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        is_read: true,
      }))
    )
  }

  async function clearAll() {
    if (
      !user?.id ||
      notifications.length === 0
    ) {
      return
    }

    if (
      !window.confirm(
        'Clear all notifications?'
      )
    ) {
      return
    }

    const {
      error: deleteError,
    } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error(
        'VERITAS clear notifications error:',
        deleteError
      )
      return
    }

    setNotifications([])
  }

  function openNotification(item) {
    markRead(item.id)

    if (item.link) {
      navigate(item.link)
    }
  }

  return (
    <div className="notifications-page">

      <div className="notifications-container">

        <div className="notifications-header">

          <button
            className="notifications-back"
            onClick={() =>
              navigate('/settings')
            }
          >
            ←
          </button>

          <div>

            <h1>
              Notifications
            </h1>

            <p>
              Stay updated with your VERITAS activity
            </p>

          </div>

        </div>

        <div className="notifications-actions">

          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </button>

          <button
            onClick={clearAll}
            disabled={
              notifications.length === 0
            }
          >
            Clear all
          </button>

        </div>

        <div className="notifications-tabs">

          {TABS.map((tab) => (
            <button
              key={tab}
              className={
                activeTab === tab
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTab(tab)
              }
            >

              {tab}

              {tab === 'All' &&
                unreadCount > 0 && (
                  <span>
                    {unreadCount}
                  </span>
                )}

            </button>
          ))}

        </div>

        {error && (
          <div className="notifications-error">
            {error}
          </div>
        )}

        <div className="notifications-list">

          {loading ? (
            <div className="notifications-empty">

              <div className="notifications-empty-icon">
                🔄
              </div>

              <h2>
                Loading notifications...
              </h2>

            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notifications-empty">

              <div className="notifications-empty-icon">
                🔔
              </div>

              <h2>
                No notifications
              </h2>

              <p>
                You're all caught up.
              </p>

            </div>
          ) : (
            filteredNotifications.map(
              (item) => {
                const category =
                  item.category ||
                  item.type ||
                  'Announcements'

                return (
                  <button
                    key={item.id}
                    className={
                      item.is_read
                        ? 'notification-item'
                        : 'notification-item unread'
                    }
                    onClick={() =>
                      openNotification(item)
                    }
                  >

                    <div className="notification-icon">
                      {iconFor(category)}
                    </div>

                    <div className="notification-content">

                      <div className="notification-top">

                        <strong>
                          {item.title}
                        </strong>

                        <span>
                          {formatTime(
                            item.created_at
                          )}
                        </span>

                      </div>

                      <p>
                        {item.message}
                      </p>

                      <small>
                        {category}
                      </small>

                    </div>

                    {!item.is_read && (
                      <div className="notification-dot" />
                    )}

                  </button>
                )
              }
            )
          )}

        </div>

      </div>

    </div>
  )
}
