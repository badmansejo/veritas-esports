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

function renderMessageWithLinks(message) {
  const text = String(message || '')
  const parts = text.split(/(https?:\/\/[^\s<>\]]+)/g)

  return parts.map((part, index) => {
    const url = part.replace(/[),.!?]+$/, '')
    const trailing = part.slice(url.length)

    if (!/^https?:\/\/\S+$/i.test(url)) {
      return part
    }

    return (
      <React.Fragment key={`${index}-${url}`}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={event => event.stopPropagation()}
        >
          {url}
        </a>
        {trailing}
      </React.Fragment>
    )
  })
}

function normalizeContactLink(value) {
  const trimmed = String(value || '').trim()

  if (!trimmed) {
    return ''
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed
  }

  return `https://${trimmed}`
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

  const [agents, setAgents] =
    useState([])

  const [showAgents, setShowAgents] =
    useState(false)

  const [agentsLoading, setAgentsLoading] =
    useState(false)

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

  async function loadContactAgents() {
    setAgentsLoading(true)

    const {
      data,
      error: agentsError,
    } = await supabase
      .from('contact_agents')
      .select(`
        id,
        name,
        contact_link,
        description,
        sort_order
      `)
      .eq('is_active', true)
      .order('sort_order', {
        ascending: true,
      })
      .order('created_at', {
        ascending: true,
      })

    if (agentsError) {
      console.error(
        'VERITAS contact agents error:',
        agentsError
      )

      setAgents([])
    } else {
      setAgents(data || [])
    }

    setAgentsLoading(false)
  }

  async function openContactAgents() {
    setShowAgents(true)

    if (agents.length === 0) {
      await loadContactAgents()
    }
  }

  function closeContactAgents() {
    setShowAgents(false)
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

                const isWalletNotification =
                  category === 'Wallet'

                return (
                  <div
                    key={item.id}
                    className={
                      item.is_read
                        ? 'notification-item'
                        : 'notification-item unread'
                    }
                  >

                    <button
                      type="button"
                      className="notification-main-button"
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
                          {renderMessageWithLinks(item.message)}
                        </p>

                        <small>
                          {category}
                        </small>

                      </div>

                      {!item.is_read && (
                        <div className="notification-dot" />
                      )}

                    </button>

                    {isWalletNotification ? (
                      <button
                        type="button"
                        className="notification-contact-agent"
                        onClick={(event) => {
                          event.stopPropagation()
                          openContactAgents()
                        }}
                      >
                        👤 Contact Agent
                      </button>
                    ) : null}

                  </div>
                )
              }
            )
          )}

        </div>

      </div>

      {showAgents ? (
        <div
          className="notification-agent-overlay"
          onClick={closeContactAgents}
        >

          <div
            className="notification-agent-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="notification-agent-header">

              <div>
                <span>
                  VERITAS SUPPORT
                </span>

                <h2>
                  Contact Agent
                </h2>

                <p>
                  Choose an active VERITAS agent.
                </p>
              </div>

              <button
                type="button"
                onClick={closeContactAgents}
              >
                ×
              </button>

            </div>

            {agentsLoading ? (
              <div className="notification-agent-empty">
                Loading agents...
              </div>
            ) : agents.length === 0 ? (
              <div className="notification-agent-empty">
                No contact agents are currently available.
              </div>
            ) : (
              <div className="notification-agent-list">

                {agents.map((agent) => (
                  <a
                    key={agent.id}
                    href={normalizeContactLink(
                      agent.contact_link
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="notification-agent-card"
                  >

                    <div className="notification-agent-icon">
                      👤
                    </div>

                    <div>
                      <strong>
                        {agent.name}
                      </strong>

                      {agent.description ? (
                        <p>
                          {agent.description}
                        </p>
                      ) : null}

                      <span>
                        Contact Agent →
                      </span>
                    </div>

                  </a>
                ))}

              </div>
            )}

          </div>

        </div>
      ) : null}

    </div>
  )
}

