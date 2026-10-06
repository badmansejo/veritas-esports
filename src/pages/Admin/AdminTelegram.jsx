import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminTelegram() {
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    const { data, error } = await supabase
      .from('telegram_bot_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (error) {
      setResult(error.message)
      return
    }

    setSettings(data)
  }

  function update(field, value) {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }))
  }

  async function saveSettings() {
    if (!settings?.id) return

    setSaving(true)
    setResult('Saving...')

    const { error } = await supabase
      .from('telegram_bot_settings')
      .update({
        welcome_message: settings.welcome_message,
        connection_instructions:
          settings.connection_instructions,
        connected_message:
          settings.connected_message,
        expired_message:
          settings.expired_message,
        invalid_code_message:
          settings.invalid_code_message,
        help_message: settings.help_message,
        disconnect_message:
          settings.disconnect_message,
        unknown_command_message:
          settings.unknown_command_message,
        bot_username: settings.bot_username,
        wallet_status_message:
          settings.wallet_status_message,
        balance_message:
          settings.balance_message,
        pending_withdrawal_message:
          settings.pending_withdrawal_message,
        last_transaction_message:
          settings.last_transaction_message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', settings.id)

    if (error) {
      setResult(error.message)
    } else {
      setResult(
        '✓ Telegram bot settings saved successfully.'
      )
    }

    setSaving(false)
  }

  if (!settings) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          Loading Telegram settings...
        </div>
      </div>
    )
  }

  const fields = [
    ['bot_username', 'Bot Username'],
    ['welcome_message', 'Welcome Message'],
    [
      'connection_instructions',
      'Connection Instructions',
    ],
    [
      'connected_message',
      'Successful Connection Message',
    ],
    ['expired_message', 'Expired Code Message'],
    [
      'invalid_code_message',
      'Invalid Code Message',
    ],
    ['help_message', 'Help / Commands Message'],
    [
      'disconnect_message',
      'Disconnect Message',
    ],
    [
      'unknown_command_message',
      'Unknown Command Message',
    ],
    [
      'wallet_status_message',
      'Wallet Status Heading',
    ],
    [
      'balance_message',
      'Wallet Balance Message',
    ],
    [
      'pending_withdrawal_message',
      'Pending Withdrawal Message',
    ],
    [
      'last_transaction_message',
      'Last Transaction Message',
    ],
  ]

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={{ marginBottom: 8 }}>
          🤖 Telegram Bot
        </h1>

        <p style={{ color: '#9ca3af' }}>
          Edit what users see when they interact
          with the VERITAS Telegram bot.
        </p>

        {fields.map(([field, label]) => (
          <div key={field} style={fieldStyle}>
            <label style={labelStyle}>
              {label}
            </label>

            {field === 'bot_username' ? (
              <input
                value={settings[field] || ''}
                onChange={(e) =>
                  update(field, e.target.value)
                }
                style={inputStyle}
              />
            ) : (
              <textarea
                value={settings[field] || ''}
                onChange={(e) =>
                  update(field, e.target.value)
                }
                rows={
                  field === 'welcome_message'
                    ? 16
                    : 7
                }
                style={textareaStyle}
              />
            )}
          </div>
        ))}

        <p
          style={{
            marginTop: 20,
            color: '#9ca3af',
            fontSize: 13,
          }}
        >
          Wallet placeholders:
          <br />
          {'{balance}'} = current KES balance
          <br />
          {'{pending_withdrawal}'} = pending withdrawal amount
          <br />
          {'{last_transaction}'} = latest wallet transaction
        </p>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          style={buttonStyle}
        >
          {saving
            ? 'SAVING...'
            : '💾 SAVE TELEGRAM SETTINGS'}
        </button>

        {result && (
          <div style={resultStyle}>
            {result}
          </div>
        )}
      </div>
    </div>
  )
}

const pageStyle = {
  minHeight: '100vh',
  padding: '32px 20px',
  background: '#070b14',
  color: '#fff',
  boxSizing: 'border-box',
}

const containerStyle = {
  maxWidth: '850px',
  margin: '0 auto',
}

const cardStyle = {
  maxWidth: '850px',
  margin: '0 auto',
  padding: '30px',
  background: '#0d1422',
  borderRadius: '18px',
  color: '#fff',
}

const fieldStyle = {
  marginTop: '22px',
}

const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontWeight: 900,
}

const inputStyle = {
  width: '100%',
  padding: '14px',
  borderRadius: '10px',
  border: '1px solid #374151',
  background: '#111827',
  color: '#fff',
  boxSizing: 'border-box',
}

const textareaStyle = {
  width: '100%',
  padding: '14px',
  borderRadius: '10px',
  border: '1px solid #374151',
  background: '#111827',
  color: '#fff',
  boxSizing: 'border-box',
  resize: 'vertical',
  fontFamily: 'inherit',
  lineHeight: 1.5,
}

const buttonStyle = {
  width: '100%',
  marginTop: '28px',
  padding: '16px',
  border: 'none',
  borderRadius: '10px',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 900,
  cursor: 'pointer',
}

const resultStyle = {
  marginTop: '16px',
  padding: '14px',
  borderRadius: '10px',
  background: '#111827',
  color: '#d1d5db',
}
