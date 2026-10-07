import React, {
  useEffect,
  useState,
} from 'react'
import { supabase } from '../../../lib/supabaseClient'
import './Telegram.css'

export default function Telegram() {
  const [user, setUser] = useState(null)
  const [connection, setConnection] =
    useState(null)
  const [settings, setSettings] =
    useState(null)
  const [loading, setLoading] =
    useState(true)
  const [connecting, setConnecting] =
    useState(false)
  const [disconnecting, setDisconnecting] =
    useState(false)
  const [message, setMessage] =
    useState('')
  const [error, setError] =
    useState('')

  useEffect(() => {
    loadData()

    const interval = setInterval(
      loadData,
      3000
    )

    return () => clearInterval(interval)
  }, [])

  async function loadData() {
    try {
      const {
        data: {
          user: currentUser,
        },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        setLoading(false)
        return
      }

      setUser(currentUser)

      const [
        connectionResult,
        settingsResult,
      ] = await Promise.all([
        supabase
          .from('telegram_connections')
          .select('*')
          .eq(
            'user_id',
            currentUser.id
          )
          .order('created_at', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),

        supabase
          .from('telegram_bot_settings')
          .select('*')
          .order('updated_at', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),
      ])

      if (
        connectionResult.error &&
        connectionResult.error.code !==
          'PGRST116'
      ) {
        throw connectionResult.error
      }

      if (settingsResult.error) {
        throw settingsResult.error
      }

      setConnection(
        connectionResult.data || null
      )

      setSettings(
        settingsResult.data || null
      )
    } catch (err) {
      setError(
        err?.message ||
          'Unable to load Telegram settings.'
      )
    } finally {
      setLoading(false)
    }
  }

  function getActiveBotNumber() {
    return Math.min(
      6,
      Math.max(
        1,
        Number(
          settings?.active_bot_number || 6
        )
      )
    )
  }

  function getActiveBotUsername() {
    const number =
      getActiveBotNumber()

    return (
      settings?.[
        `bot_${number}_username`
      ] ||
      '@Veritasesportsbot'
    )
  }

  function generateCode() {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

    let code = ''

    for (let i = 0; i < 6; i++) {
      code +=
        chars[
          Math.floor(
            Math.random() *
              chars.length
          )
        ]
    }

    return code
  }

  async function createConnection() {
    if (!user) return

    setConnecting(true)
    setMessage('')
    setError('')

    try {
      const code =
        generateCode()

      const expiresAt =
        new Date(
          Date.now() +
            5 * 60 * 1000
        ).toISOString()

      await supabase
        .from(
          'telegram_connections'
        )
        .delete()
        .eq(
          'user_id',
          user.id
        )

      const {
        data,
        error: insertError,
      } = await supabase
        .from(
          'telegram_connections'
        )
        .insert({
          user_id: user.id,
          verification_code:
            code,
          connected: false,
          expires_at:
            expiresAt,
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      setConnection(data)

      setMessage(
        'Connection code created. It expires in 5 minutes.'
      )
    } catch (err) {
      setError(
        err?.message ||
          'Unable to create connection code.'
      )
    } finally {
      setConnecting(false)
    }
  }

  async function disconnectTelegram() {
    if (!user) return

    setDisconnecting(true)
    setMessage('')
    setError('')

    try {
      const {
        error: deleteError,
      } = await supabase
        .from(
          'telegram_connections'
        )
        .delete()
        .eq(
          'user_id',
          user.id
        )

      if (deleteError) {
        throw deleteError
      }

      setConnection(null)

      setMessage(
        'Telegram disconnected.'
      )
    } catch (err) {
      setError(
        err?.message ||
          'Unable to disconnect Telegram.'
      )
    } finally {
      setDisconnecting(false)
    }
  }

  async function recordBotOpen() {
    if (!user) return

    const botNumber =
      getActiveBotNumber()

    const {
      data: notification,
    } = await supabase
      .from(
        'telegram_bot_switch_notifications'
      )
      .select(
        'id, to_bot_number'
      )
      .eq(
        'to_bot_number',
        botNumber
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle()

    if (!notification) {
      return
    }

    await supabase.rpc(
      'record_telegram_bot_open',
      {
        p_notification_id:
          notification.id,
        p_bot_number:
          botNumber,
      }
    )
  }

  function openTelegram() {
    const username =
      getActiveBotUsername()
        .replace('@', '')
        .trim()

    const popup =
      window.open(
        `https://t.me/${username}`,
        '_blank',
        'noopener,noreferrer'
      )

    if (popup) {
      recordBotOpen()
    } else {
      recordBotOpen()
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-card">
          <p>Loading Telegram...</p>
        </div>
      </div>
    )
  }

  const activeBotNumber =
    getActiveBotNumber()

  const activeBot =
    getActiveBotUsername()

  const isConnected =
    connection?.connected === true

  return (
    <div className="settings-page">
      <div className="settings-card">
        <div className="settings-header">
          <h1>Telegram</h1>
          <p>
            Connect your VERITAS account to
            Telegram notifications.
          </p>
        </div>

        {message && (
          <div className="settings-success">
            {message}
          </div>
        )}

        {error && (
          <div className="settings-error">
            {error}
          </div>
        )}

        <div className="telegram-info-grid">
          <div className="telegram-info-item">
            <span>ACTIVE BOT</span>
            <strong>
              Bot {activeBotNumber}
            </strong>
            <small>
              {activeBot}
            </small>
          </div>

          <div className="telegram-info-item">
            <span>STATUS</span>
            <strong>
              {isConnected
                ? 'CONNECTED'
                : 'NOT CONNECTED'}
            </strong>
          </div>
        </div>

        {isConnected ? (
          <>
            <div className="telegram-wallet-box">
              <div className="telegram-section-title">
                TELEGRAM CONNECTION
              </div>

              <div className="telegram-wallet-row">
                <span>
                  Telegram Chat ID
                </span>

                <strong>
                  {connection.telegram_chat_id}
                </strong>
              </div>

              <div className="telegram-wallet-row">
                <span>
                  Connected
                </span>

                <strong>
                  {connection.connected_at
                    ? new Date(
                        connection.connected_at
                      ).toLocaleString()
                    : 'Active'}
                </strong>
              </div>
            </div>

            <div className="telegram-updates-box">
              <div className="telegram-section-title">
                NOTIFICATIONS
              </div>

              <div className="telegram-update-item">
                Match updates
              </div>

              <div className="telegram-update-item">
                Tournament updates
              </div>

              <div className="telegram-update-item">
                Wallet updates
              </div>

              <div className="telegram-update-item">
                VERITAS announcements
              </div>
            </div>

            <button
              type="button"
              className="settings-secondary-button"
              onClick={openTelegram}
            >
              OPEN ACTIVE VERITAS BOT
            </button>

            <button
              type="button"
              className="settings-danger-button"
              onClick={
                disconnectTelegram
              }
              disabled={
                disconnecting
              }
            >
              {disconnecting
                ? 'DISCONNECTING...'
                : 'DISCONNECT TELEGRAM'}
            </button>
          </>
        ) : (
          <>
            <div className="telegram-wallet-box">
              <div className="telegram-section-title">
                CONNECT YOUR ACCOUNT
              </div>

              <p
                style={{
                  color: '#9ca3af',
                  lineHeight: 1.6,
                }}
              >
                Your active VERITAS Telegram
                bot is:
                <br />
                <strong
                  style={{
                    color: '#ffffff',
                  }}
                >
                  {activeBot}
                </strong>
              </p>

              {connection &&
              !connection.connected ? (
                <>
                  <div
                    style={{
                      marginTop: 20,
                      padding: 20,
                      borderRadius: 12,
                      background:
                        '#111827',
                      textAlign:
                        'center',
                    }}
                  >
                    <div
                      style={{
                        color:
                          '#9ca3af',
                        fontSize:
                          11,
                        fontWeight:
                          900,
                        letterSpacing:
                          2,
                        marginBottom:
                          8,
                      }}
                    >
                      YOUR CONNECTION CODE
                    </div>

                    <div
                      style={{
                        color:
                          '#ffffff',
                        fontSize:
                          32,
                        fontWeight:
                          900,
                        letterSpacing:
                          6,
                      }}
                    >
                      {
                        connection.verification_code
                      }
                    </div>

                    <p
                      style={{
                        color:
                          '#9ca3af',
                        marginTop:
                          12,
                      }}
                    >
                      Open the active bot
                      and send:
                      <br />
                      <strong
                        style={{
                          color:
                            '#ffffff',
                        }}
                      >
                        /connect{' '}
                        {
                          connection.verification_code
                        }
                      </strong>
                    </p>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="settings-primary-button"
                  onClick={
                    createConnection
                  }
                  disabled={
                    connecting
                  }
                >
                  {connecting
                    ? 'CREATING CODE...'
                    : 'GENERATE CONNECTION CODE'}
                </button>
              )}
            </div>

            <button
              type="button"
              className="settings-secondary-button"
              onClick={openTelegram}
            >
              OPEN ACTIVE VERITAS BOT
            </button>
          </>
        )}
      </div>
    </div>
  )
}
