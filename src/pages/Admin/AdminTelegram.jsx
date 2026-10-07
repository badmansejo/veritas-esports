import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminTelegram.css'

const BOTS = [
  { number: 1, username: '@Veritasesports1bot' },
  { number: 2, username: '@Veritasesports2bot' },
  { number: 3, username: '@Veritasgamingbot' },
  { number: 4, username: '@Smartashbot' },
  { number: 5, username: '@Turrkisshbot' },
  { number: 6, username: '@Veritasesportsbot' },
]

const MESSAGE_FIELDS = [
  ['welcome_message', 'Welcome Message'],
  ['connection_instructions', 'Connection Instructions'],
  ['connected_message', 'Connected Message'],
  ['expired_message', 'Expired Code Message'],
  ['invalid_code_message', 'Invalid Code Message'],
  ['help_message', 'Help Message'],
  ['disconnect_message', 'Disconnect Message'],
  ['unknown_command_message', 'Unknown Command Message'],
  ['wallet_status_message', 'Wallet Status Message'],
  ['balance_message', 'Balance Message'],
  ['pending_withdrawal_message', 'Pending Withdrawal Message'],
  ['last_transaction_message', 'Last Transaction Message'],
  ['bot_switch_notification_title', 'Bot Switch Notification Title'],
  ['bot_switch_notification_message', 'Bot Switch Notification Message'],
]

export default function AdminTelegram() {
  const [settings, setSettings] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [stats, setStats] = useState([])
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    loadSettings()
    loadStats()
  }, [])

  async function loadSettings() {
    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('telegram_bot_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (data) {
        setSettings(data)
        setForm(data)
      }
    } catch (err) {
      setError(err?.message || 'Unable to load Telegram settings.')
    } finally {
      setLoading(false)
    }
  }

  async function loadStats() {
    setStatsLoading(true)

    try {
      const { data, error: statsError } = await supabase
        .from('telegram_bot_switch_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      if (statsError) throw statsError

      setStats(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setStatsLoading(false)
    }
  }

  function updateField(name, value) {
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function saveSettings() {
    setSaving(true)
    setMessage('')
    setError('')

    try {
      const previousBot = Number(settings?.active_bot_number || 6)

      const newBot = Math.min(
        6,
        Math.max(1, Number(form.active_bot_number || 6))
      )

      const payload = {
        ...form,
        active_bot_number: newBot,
        bot_username: form[`bot_${newBot}_username`] || '',
        updated_at: new Date().toISOString(),
      }

      delete payload.id

      const { data, error: saveError } = await supabase
        .from('telegram_bot_settings')
        .update(payload)
        .eq('id', settings.id)
        .select()
        .single()

      if (saveError) throw saveError

      setSettings(data)
      setForm(data)

      let notificationText = ''

      if (previousBot !== newBot) {
        try {
          const { data: notification, error: notificationError } =
            await supabase.functions.invoke(
              'notify-telegram-bot-switch',
              {
                body: {
                  from_bot_number: previousBot,
                  to_bot_number: newBot,
                },
              }
            )

          if (notificationError) {
            notificationText =
              ' Settings saved, but notifications failed.'
          } else {
            notificationText =
              ` ${notification?.sent_count || 0} Telegram users notified and ${notification?.app_notification_sent_count || 0} app notifications created.`
          }
        } catch {
          notificationText =
            ' Settings saved, but notifications failed.'
        }
      }

      setMessage(
        `Saved successfully. Bot ${newBot} is active.${notificationText}`
      )

      await loadStats()
    } catch (err) {
      setError(err?.message || 'Unable to save Telegram settings.')
    } finally {
      setSaving(false)
    }
  }

  const totalSent = stats.reduce(
    (sum, row) => sum + Number(row.sent_count || 0),
    0
  )

  const totalOpened = stats.reduce(
    (sum, row) => sum + Number(row.opened_count || 0),
    0
  )

  const totalAppNotifications = stats.reduce(
    (sum, row) =>
      sum + Number(row.app_notification_sent_count || 0),
    0
  )

  const openRate =
    totalSent > 0
      ? ((totalOpened / totalSent) * 100).toFixed(1)
      : '0.0'

  if (loading) {
    return (
      <div className="admin-telegram-page">
        <div className="admin-telegram-card">
          Loading Telegram settings...
        </div>
      </div>
    )
  }

  return (
    <div className="admin-telegram-page">
      <div className="admin-telegram-card">

        <div className="admin-telegram-header">
          <h1>Telegram Bot Settings</h1>
          <p>
            Manage all six VERITAS Telegram bots and select the active bot.
          </p>
        </div>

        {message && (
          <div className="admin-telegram-success">
            {message}
          </div>
        )}

        {error && (
          <div className="admin-telegram-error">
            {error}
          </div>
        )}

        <div
          style={{
            marginBottom: '24px',
            padding: '20px',
            border: '1px solid #273244',
            borderRadius: '14px',
            background: '#0d1421',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '15px',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '14px' }}>
                TELEGRAM STATISTICS
              </h2>

              <p
                style={{
                  margin: '6px 0 0',
                  color: '#9ca3af',
                  fontSize: '12px',
                }}
              >
                Telegram bot-switch notification performance.
              </p>
            </div>

            <button
              type="button"
              onClick={loadStats}
              style={{
                padding: '10px 14px',
                border: '1px solid #374151',
                borderRadius: '8px',
                background: '#111827',
                color: '#ffffff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              REFRESH
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '12px',
            }}
          >
            <div
              style={{
                padding: '16px',
                background: '#111827',
                borderRadius: '10px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  color: '#9ca3af',
                  fontSize: '10px',
                  fontWeight: 900,
                }}
              >
                TELEGRAM SENT
              </span>

              <strong
                style={{
                  display: 'block',
                  marginTop: '8px',
                  fontSize: '26px',
                }}
              >
                {totalSent}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                background: '#111827',
                borderRadius: '10px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  color: '#9ca3af',
                  fontSize: '10px',
                  fontWeight: 900,
                }}
              >
                APP NOTIFICATIONS
              </span>

              <strong
                style={{
                  display: 'block',
                  marginTop: '8px',
                  fontSize: '26px',
                }}
              >
                {totalAppNotifications}
              </strong>
            </div>

            <div
              style={{
                padding: '16px',
                background: '#111827',
                borderRadius: '10px',
              }}
            >
              <span
                style={{
                  display: 'block',
                  color: '#9ca3af',
                  fontSize: '10px',
                  fontWeight: 900,
                }}
              >
                TELEGRAM CLICKS
              </span>

              <strong
                style={{
                  display: 'block',
                  marginTop: '8px',
                  fontSize: '26px',
                }}
              >
                {totalOpened}
              </strong>
            </div>
          </div>

          <div style={{ marginTop: '18px', overflowX: 'auto' }}>
            {statsLoading ? (
              <p style={{ color: '#9ca3af' }}>
                Loading statistics...
              </p>
            ) : stats.length === 0 ? (
              <p style={{ color: '#9ca3af' }}>
                No bot switch notifications yet.
              </p>
            ) : (
              stats.map((row) => {
                const sent = Number(row.sent_count || 0)
                const opened = Number(row.opened_count || 0)
                const appSent = Number(
                  row.app_notification_sent_count || 0
                )

                const rate =
                  sent > 0
                    ? ((opened / sent) * 100).toFixed(1)
                    : '0.0'

                return (
                  <div
                    key={row.id}
                    style={{
                      minWidth: '760px',
                      display: 'grid',
                      gridTemplateColumns:
                        '1.4fr .8fr .8fr .8fr .6fr',
                      gap: '12px',
                      padding: '12px 0',
                      borderTop: '1px solid #1f2937',
                      color: '#d1d5db',
                      fontSize: '12px',
                    }}
                  >
                    <span>
                      {new Date(row.created_at).toLocaleString()}
                    </span>

                    <span>
                      Bot {row.from_bot_number || '?'} {' -> '} Bot{' '}
                      {row.to_bot_number}
                    </span>

                    <span>Telegram: {sent}</span>

                    <span>App: {appSent}</span>

                    <span>Clicks: {opened}</span>
                  </div>
                )
              })
            )}
          </div>

          <div
            style={{
              marginTop: '12px',
              color: '#9ca3af',
              fontSize: '11px',
            }}
          >
            Telegram click rate: {openRate}%
          </div>
        </div>

        <div className="admin-telegram-section">
          <h2>ACTIVE BOT</h2>

          <select
            value={form.active_bot_number || 6}
            onChange={(e) =>
              updateField(
                'active_bot_number',
                Number(e.target.value)
              )
            }
          >
            {BOTS.map((bot) => (
              <option key={bot.number} value={bot.number}>
                Bot {bot.number}
              </option>
            ))}
          </select>

          <div className="admin-telegram-active">
            Current active bot:{' '}
            <strong>
              Bot {form.active_bot_number || 6} -{' '}
              {form[`bot_${form.active_bot_number || 6}_username`] || ''}
            </strong>
          </div>

          <p
            style={{
              color: '#9ca3af',
              fontSize: '12px',
              marginTop: '12px',
            }}
          >
            Changing the active bot sends the bot update to Telegram users
            and creates an app notification.
          </p>
        </div>

        <div className="admin-telegram-section">
          <h2>TELEGRAM BOTS</h2>

          <div className="admin-telegram-bots">
            {BOTS.map((bot) => {
              const active =
                Number(form.active_bot_number || 6) === bot.number

              return (
                <div
                  className="admin-telegram-bot"
                  key={bot.number}
                >
                  <div className="admin-telegram-bot-title">
                    <strong>Bot {bot.number}</strong>

                    {active && <span>ACTIVE</span>}
                  </div>

                  <input
                    value={form[`bot_${bot.number}_username`] || ''}
                    onChange={(e) =>
                      updateField(
                        `bot_${bot.number}_username`,
                        e.target.value
                      )
                    }
                    placeholder={bot.username}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="admin-telegram-section">
          <h2>BOT MESSAGES</h2>

          {MESSAGE_FIELDS.map(([field, label]) => (
            <div
              className="admin-telegram-field"
              key={field}
            >
              <label>{label}</label>

              <textarea
                value={form[field] || ''}
                onChange={(e) =>
                  updateField(field, e.target.value)
                }
                rows={4}
              />
            </div>
          ))}
        </div>

        <button
          type="button"
          className="admin-telegram-save"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving
            ? 'SAVING...'
            : 'SAVE TELEGRAM SETTINGS'}
        </button>

      </div>
    </div>
  )
}
