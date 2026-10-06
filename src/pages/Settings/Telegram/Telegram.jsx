import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../../context/AuthContext'
import './Telegram.css'

export default function Telegram() {
  const { user } = useAuth()

  const [connection, setConnection] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user?.id) return

    loadData()

    const interval = setInterval(() => {
      loadData()
    }, 3000)

    return () => clearInterval(interval)
  }, [user?.id])

  async function loadData() {
    if (!user?.id) return

    const [connectionResult, profileResult] =
      await Promise.all([
        supabase
          .from('telegram_connections')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),

        supabase
          .from('profiles')
          .select('username, kes_balance')
          .eq('id', user.id)
          .maybeSingle(),
      ])

    if (connectionResult.error) {
      console.error(connectionResult.error)
      setMessage(connectionResult.error.message)
    } else {
      setConnection(connectionResult.data)
    }

    if (!profileResult.error) {
      setProfile(profileResult.data)
    }

    setLoading(false)
  }

  function generateCode() {
    const chars =
      'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

    let code = ''

    for (let i = 0; i < 6; i++) {
      code += chars[
        Math.floor(Math.random() * chars.length)
      ]
    }

    return code
  }

  async function generateConnectionCode() {
    setGenerating(true)
    setMessage('')

    try {
      const code = generateCode()

      const expiresAt = new Date(
        Date.now() + 5 * 60 * 1000
      ).toISOString()

      const { error: resetError } =
        await supabase
          .from('telegram_connections')
          .update({
            connected: false,
            telegram_chat_id: null,
            connected_at: null,
            expires_at:
              new Date(0).toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('connected', false)

      if (resetError) throw resetError

      const { data, error } =
        await supabase
          .from('telegram_connections')
          .insert({
            user_id: user.id,
            verification_code: code,
            connected: false,
            expires_at: expiresAt,
          })
          .select()
          .single()

      if (error) throw error

      setConnection(data)
      setMessage('Connection code generated.')
    } catch (error) {
      setMessage(
        error?.message ||
          'Could not generate connection code.'
      )
    } finally {
      setGenerating(false)
    }
  }

  async function disconnectTelegram() {
    const confirmed = window.confirm(
      'Disconnect Telegram from your VERITAS account?'
    )

    if (!confirmed) return

    setDisconnecting(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('telegram_connections')
        .update({
          connected: false,
          telegram_chat_id: null,
          connected_at: null,
          expires_at:
            new Date(0).toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('connected', true)

      if (error) throw error

      setConnection(null)
      setMessage(
        '✓ Telegram disconnected successfully.'
      )
    } catch (error) {
      setMessage(
        error?.message ||
          'Could not disconnect Telegram.'
      )
    } finally {
      setDisconnecting(false)
    }
  }

  async function sendTestMessage() {
    setTesting(true)
    setMessage('')

    try {
      const { data, error } =
        await supabase.functions.invoke(
          'send-telegram-notification',
          {
            body: {
              user_id: user.id,
              title: '🎮 Telegram Test',
              message:
                '✅ Your VERITAS Telegram connection is working successfully!',
            },
          }
        )

      if (error) throw error

      if (data?.sent > 0) {
        setMessage(
          '✓ Test message sent to Telegram.'
        )
      } else {
        setMessage(
          'Could not send test message. Make sure Telegram is connected.'
        )
      }
    } catch (error) {
      setMessage(
        error?.message ||
          'Could not send Telegram test message.'
      )
    } finally {
      setTesting(false)
    }
  }

  function openTelegram() {
    window.open(
      'https://t.me/Veritasesportsbot',
      '_blank',
      'noopener,noreferrer'
    )
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-card">
          Loading Telegram settings...
        </div>
      </div>
    )
  }

  const isExpired =
    connection &&
    !connection.connected &&
    new Date(
      connection.expires_at
    ).getTime() < Date.now()

  const connectedDate =
    connection?.connected_at
      ? new Date(
          connection.connected_at
        ).toLocaleString()
      : null

  return (
    <div className="settings-page">
      <div className="settings-card">
        <h1>Telegram</h1>

        <p>
          Connect Telegram to receive important
          VERITAS updates directly in Telegram.
        </p>

        {connection?.connected ? (
          <>
            <div className="telegram-status connected">
              ✓ Telegram Connected Successfully
            </div>

            <div className="telegram-info-grid">
              <div className="telegram-info-item">
                <span>TELEGRAM</span>
                <strong>
                  {connection.telegram_chat_id
                    ? `Connected • ${connection.telegram_chat_id}`
                    : 'Connected'}
                </strong>
              </div>

              <div className="telegram-info-item">
                <span>CONNECTED</span>
                <strong>
                  {connectedDate || 'Recently'}
                </strong>
              </div>
            </div>

            <div className="telegram-wallet-box">
              <div className="telegram-section-title">
                💰 WALLET STATUS
              </div>

              <div className="telegram-wallet-row">
                <span>KES Balance</span>
                <strong>
                  KES{' '}
                  {Number(
                    profile?.kes_balance || 0
                  ).toLocaleString()}
                </strong>
              </div>

              <div className="telegram-wallet-row">
                <span>Wallet</span>
                <strong>Active</strong>
              </div>
            </div>

            <div className="telegram-updates-box">
              <div className="telegram-section-title">
                VERITAS UPDATES
              </div>

              <div className="telegram-update-item">
                🏆 Tournament updates
              </div>

              <div className="telegram-update-item">
                ⚔️ Match updates
              </div>

              <div className="telegram-update-item">
                🎁 Rewards
              </div>

              <div className="telegram-update-item">
                📢 Announcements
              </div>
            </div>

            <button
              type="button"
              onClick={sendTestMessage}
              disabled={testing}
              className="settings-primary-button"
            >
              {testing
                ? 'SENDING...'
                : '🧪 SEND TEST MESSAGE'}
            </button>

            <button
              type="button"
              onClick={openTelegram}
              className="settings-secondary-button"
            >
              🤖 OPEN VERITAS TELEGRAM BOT
            </button>

            <button
              type="button"
              onClick={disconnectTelegram}
              disabled={disconnecting}
              className="settings-danger-button"
            >
              {disconnecting
                ? 'DISCONNECTING...'
                : 'DISCONNECT TELEGRAM'}
            </button>
          </>
        ) : (
          <>
            <div className="telegram-status">
              Telegram Not Connected
            </div>

            {connection && !isExpired && (
              <div className="telegram-code-box">
                <div className="telegram-label">
                  YOUR CONNECTION CODE
                </div>

                <div className="telegram-code">
                  {connection.verification_code}
                </div>

                <div className="telegram-expiry">
                  Code expires in 5 minutes.
                </div>

                <div className="telegram-instructions">
                  <strong>1.</strong> Open the VERITAS
                  Telegram bot.
                  <br />
                  <strong>2.</strong> Send:
                  <br />
                  <code>
                    /connect{' '}
                    {connection.verification_code}
                  </code>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={generateConnectionCode}
              disabled={generating}
              className="settings-primary-button"
            >
              {generating
                ? 'GENERATING...'
                : 'GENERATE CONNECTION CODE'}
            </button>

            <button
              type="button"
              onClick={openTelegram}
              className="settings-secondary-button"
            >
              🤖 OPEN VERITAS TELEGRAM BOT
            </button>
          </>
        )}

        {message && (
          <div className="settings-message">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
