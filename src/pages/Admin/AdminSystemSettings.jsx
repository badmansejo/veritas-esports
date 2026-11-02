import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminSystemSettings.css'

const settingGroups = [
  {
    title: 'General',
    description: 'Core platform availability and access.',
    settings: [
      { key: 'app_active', label: 'App Active', description: 'Allow normal user access.', type: 'boolean', defaultValue: true },
      { key: 'maintenance_mode', label: 'Maintenance Mode', description: 'Block player access while maintenance is active. Administrators retain access.', type: 'boolean', defaultValue: false },
      { key: 'maintenance_return_time', label: 'Expected Return Time', description: 'Date and time players should expect VERITAS to return. This does not automatically disable maintenance.', type: 'datetime', defaultValue: '' },
      { key: 'maintenance_message', label: 'Maintenance Announcement', description: 'Additional message displayed below the expected return time on the player maintenance screen.', type: 'textarea', defaultValue: '' },
      { key: 'registrations_enabled', label: 'Registrations', description: 'Allow new users to register.', type: 'boolean', defaultValue: true },
      { key: 'new_user_welcome_title', label: 'Welcome Notification Title', description: 'Title shown to newly registered users.', type: 'text', defaultValue: 'Welcome to VERITAS!' },
      { key: 'new_user_welcome_message', label: 'Welcome Notification Message', description: 'Message shown to newly registered users.', type: 'textarea', defaultValue: 'Welcome to VERITAS! Your account is ready. Good luck and enjoy competing!' },
    ],
  },
  {
    title: 'Tournaments',
    description: 'Control tournament participation.',
    settings: [
      { key: 'tournament_creation_enabled', label: 'Tournament Creation', description: 'Allow users to create tournaments.', type: 'boolean', defaultValue: true },
      { key: 'tournament_joining_enabled', label: 'Tournament Joining', description: 'Allow users to join tournaments.', type: 'boolean', defaultValue: true },
    ],
  },
  {
    title: 'Payments and Features',
    description: 'Enable or disable selected app features.',
    settings: [
      { key: 'deposits_enabled', label: 'Deposits', description: 'Allow deposit requests.', type: 'boolean', defaultValue: true },
      { key: 'withdrawals_enabled', label: 'Withdrawals', description: 'Allow withdrawal requests.', type: 'boolean', defaultValue: true },
      { key: 'paystack_enabled', label: 'Paystack', description: 'Enable Paystack where integration is configured.', type: 'boolean', defaultValue: false },
      { key: 'manual_deposits_enabled', label: 'Manual Deposits', description: 'Allow manual deposit requests.', type: 'boolean', defaultValue: true },
      { key: 'vcoins_enabled', label: 'V Coins', description: 'Enable V Coin features.', type: 'boolean', defaultValue: true },
    ],
  },
]

const existingSettings = [
  { key: 'marketplace_enabled', label: 'Marketplace', description: 'Control marketplace availability.' },
  { key: 'referral_enabled', label: 'Referrals', description: 'Control the referral programme.' },
]

function readBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value && typeof value === 'object' && typeof value.value === 'boolean') return value.value
  return fallback
}

export default function AdminSystemSettings() {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedSetting = new URLSearchParams(location.search).get('setting')
  const [values, setValues] = useState({})
  const [original, setOriginal] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const allSettings = [
    ...settingGroups.flatMap(group => group.settings),
    ...existingSettings.map(setting => ({ ...setting, type: 'boolean', defaultValue: true })),
  ]

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setErrorMessage('')

      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', allSettings.map(setting => setting.key))

      if (!active) return

      if (error) {
        setErrorMessage(`Could not load settings: ${error.message}`)
        setLoading(false)
        return
      }

      const loaded = {}
      for (const setting of allSettings) {
        const row = (data || []).find(item => item.setting_key === setting.key)
        loaded[setting.key] = setting.type === 'boolean' ? readBoolean(row?.setting_value, setting.defaultValue) : (typeof row?.setting_value === 'string' ? row.setting_value : setting.defaultValue)
      }

      setValues(loaded)
      setOriginal(loaded)
      setLoading(false)
    }

    load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (loading || !selectedSetting) return
    const target = document.getElementById("system-setting-" + selectedSetting)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target.classList.add('system-setting-highlight')
      const cleanup = window.setTimeout(() => target.classList.remove('system-setting-highlight'), 2500)
      return () => window.clearTimeout(cleanup)
    }
  }, [loading, selectedSetting])

  async function saveSettings() {
    setSaving(true)
    setMessage('')
    setErrorMessage('')

    const changed = allSettings.filter(setting => values[setting.key] !== original[setting.key])

    if (changed.length === 0) {
      setMessage('There are no changes to save.')
      setSaving(false)
      return
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) {
      setErrorMessage('Your session could not be verified. Sign in again.')
      setSaving(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authData.user.id)
      .maybeSingle()

    if (profileError || profile?.is_admin !== true) {
      setErrorMessage('Administrator access is required to save settings.')
      setSaving(false)
      return
    }

    const rows = changed.map(setting => ({
      setting_key: setting.key,
      category: settingGroups.find(group => group.settings.some(item => item.key === setting.key))?.title.toLowerCase().replaceAll(' ', '_')
        || (setting.key === 'marketplace_enabled' ? 'marketplace' : 'referrals'),
      setting_value: values[setting.key],
      description: setting.description,
      is_public: true,
      updated_by: authData.user.id,
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('app_settings')
      .upsert(rows, { onConflict: 'setting_key' })

    if (error) {
      setErrorMessage(`Save failed: ${error.message}`)
      setSaving(false)
      return
    }

    setOriginal({ ...values })
    setMessage(`Saved ${changed.length} setting${changed.length === 1 ? '' : 's'}. Note: a switch only affects features whose app/backend code reads that setting.`)
    setSaving(false)
  }

  function renderSetting(setting) {
    const checked = values[setting.key] === true

    return (
      <div id={"system-setting-" + setting.key} className={"system-setting-row" + (selectedSetting === setting.key ? " system-setting-highlight" : "")} key={setting.key}>
        <div className="system-setting-copy">
          <strong>{setting.label}</strong>
          <p>{setting.description}</p>
        </div>
        {setting.type === 'text' ? (
          <input
            type="text"
            value={values[setting.key] ?? ''}
            maxLength={120}
            disabled={loading || saving}
            onChange={event => setValues(previous => ({ ...previous, [setting.key]: event.target.value }))}
            style={{ width: '100%', maxWidth: '420px', padding: '12px', marginTop: '10px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '8px' }}
          />
        ) : setting.type === 'datetime' ? (
          <input
            type="datetime-local"
            value={values[setting.key] ?? ''}
            disabled={loading || saving}
            onChange={event => setValues(previous => ({ ...previous, [setting.key]: event.target.value }))}
            style={{ width: '100%', maxWidth: '320px', padding: '12px', marginTop: '10px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '8px' }}
          />
        ) : setting.type === 'textarea' ? (
          <textarea
            value={values[setting.key] ?? ''}
            maxLength={1000}
            rows={3}
            disabled={loading || saving}
            onChange={event => setValues(previous => ({ ...previous, [setting.key]: event.target.value }))}
            style={{ width: '100%', maxWidth: '600px', padding: '12px', marginTop: '10px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '8px', resize: 'vertical' }}
          />
        ) : (
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={setting.label}
          className={`system-setting-switch ${checked ? 'is-on' : ''}`}
          disabled={loading || saving}
          onClick={() => setValues(previous => ({ ...previous, [setting.key]: !previous[setting.key] }))}
        >
          <span />
          <b>{checked ? 'ON' : 'OFF'}</b>
        </button>
        )}
      </div>
    )
  }

  return (
    <main className="admin-system-settings">
      <header className="system-settings-header">
        <div>
          <span className="system-settings-eyebrow">VERITAS CONTROL CENTER</span>
          <h1>System Settings</h1>
          <p>Manage platform switches and feature availability.</p>
        </div>
        <button type="button" className="system-settings-back" onClick={() => navigate('/admin')}>
          ← Back
        </button>
      </header>

      <div className="system-settings-warning">
        <strong>Important</strong>
        <p>Saving a switch stores its value in the database. Features only stop working when their frontend or backend code checks that setting. Maintenance mode is not yet a global access lock.</p>
      </div>

      {loading && <p className="system-settings-status">Loading settings…</p>}
      {errorMessage && <p className="system-settings-error" role="alert">{errorMessage}</p>}
      {message && <p className="system-settings-success" role="status">{message}</p>}

      {!loading && !errorMessage && (
        <>
          {settingGroups.map(group => (
            <section className="system-settings-card" key={group.title}>
              <h2>{group.title}</h2>
              <p className="system-settings-group-description">{group.description}</p>
              {group.settings.map(renderSetting)}
            </section>
          ))}

          <section className="system-settings-card">
            <h2>Existing Feature Settings</h2>
            <p className="system-settings-group-description">These settings already exist in your database.</p>
            {existingSettings.map(renderSetting)}
          </section>

          <div className="system-settings-actions">
            <button
              type="button"
              className="system-settings-reset"
              disabled={saving || JSON.stringify(values) === JSON.stringify(original)}
              onClick={() => { setValues({ ...original }); setMessage(''); setErrorMessage('') }}
            >
              Discard Changes
            </button>
            <button
              type="button"
              className="system-settings-save"
              disabled={saving || JSON.stringify(values) === JSON.stringify(original)}
              onClick={saveSettings}
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </>
      )}
    </main>
  )
}








