import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminReferralSettings.css'

const defaults = {
  referrals_enabled: false,
  referrer_reward_enabled: true,
  referrer_kes_reward: 0,
  referrer_vcoins_reward: 0,
  new_user_reward_enabled: true,
  new_user_kes_reward: 0,
  new_user_vcoins_reward: 10,
  qualification_type: 'min_activity',
  minimum_deposit_kes: 0,
  minimum_matches_played: 0,
  minimum_tournaments_joined: 0,
  minimum_tournaments_completed: 0,
  maximum_rewards_per_referrer: 100,
  maximum_total_referral_rewards: 10000,
  require_telegram_linked: false,
  require_whatsapp_saved: false,
  require_deposit_approved: false,
}

const qualificationOptions = [
  {
    key: 'require_telegram_linked',
    label: 'Telegram linked',
    description: 'The referred user must link their Telegram account.',
  },
  {
    key: 'require_whatsapp_saved',
    label: 'WhatsApp number saved',
    description: 'The referred user must save a WhatsApp number to their profile.',
  },
  {
    key: 'require_deposit_approved',
    label: 'Deposit approved',
    description: 'The referred user must have an approved deposit.',
  },
]

const rewardGroups = [
  {
    title: 'Referrer Rewards',
    description: 'Rewards paid to the person who shared the referral link.',
    enabledKey: 'referrer_reward_enabled',
    fields: [
      ['referrer_kes_reward', 'KES reward', '0.01'],
      ['referrer_vcoins_reward', 'V Coins reward', '1'],
    ],
  },
  {
    title: 'New User Welcome Rewards',
    description: 'Welcome rewards paid to the person who joins through a referral link.',
    enabledKey: 'new_user_reward_enabled',
    fields: [
      ['new_user_kes_reward', 'KES reward', '0.01'],
      ['new_user_vcoins_reward', 'V Coins reward', '1'],
    ],
  },
]

export default function AdminReferralSettings() {
  const [settings, setSettings] = useState(defaults)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadSettings() {
      const { data, error: loadError } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (!active) return

      if (loadError) {
        setError(loadError.message)
      } else if (data) {
        setSettings({ ...defaults, ...data })
      }

      setLoading(false)
    }

    loadSettings()
    return () => { active = false }
  }, [])

  function updateField(name, value) {
    setSettings(current => ({ ...current, [name]: value }))
    setMessage('')
    setError('')
  }

  async function saveSettings(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    const payload = { ...settings }

    const numericFields = [
      'referrer_kes_reward',
      'referrer_vcoins_reward',
      'new_user_kes_reward',
      'new_user_vcoins_reward',
      'minimum_deposit_kes',
      'maximum_rewards_per_referrer',
      'maximum_total_referral_rewards',
    ]

    for (const key of numericFields) {
      const value = Number(payload[key])

      if (!Number.isFinite(value) || value < 0) {
        setError(`${key} must be zero or greater.`)
        setSaving(false)
        return
      }

      if (
        ['referrer_vcoins_reward', 'new_user_vcoins_reward',
          'maximum_rewards_per_referrer', 'maximum_total_referral_rewards'].includes(key) &&
        !Number.isInteger(value)
      ) {
        setError(`${key} must be a whole number.`)
        setSaving(false)
        return
      }

      payload[key] = value
    }

    const selectedRequirements = qualificationOptions.filter(
      option => payload[option.key]
    )

    if (payload.referrals_enabled && selectedRequirements.length === 0) {
      setError('Select at least one qualification option before enabling referrals.')
      setSaving(false)
      return
    }

    // Retain legacy columns for compatibility; matches and tournaments are not used.
    payload.qualification_type = 'min_activity'
    payload.minimum_matches_played = 0
    payload.minimum_tournaments_joined = 0
    payload.minimum_tournaments_completed = 0

    const { error: saveError } = await supabase.rpc(
      'admin_save_referral_settings',
      { p_settings: payload }
    )

    if (saveError) {
      setError(saveError.message)
    } else {
      setSettings(payload)
      setMessage('Referral settings saved successfully.')
    }

    setSaving(false)
  }

  function toggle(name, label, description = '') {
    return (
      <label className="referral-toggle" key={name}>
        <span>
          <strong>{label}</strong>
          {description && <small>{description}</small>}
        </span>
        <input
          type="checkbox"
          checked={Boolean(settings[name])}
          onChange={event => updateField(name, event.target.checked)}
        />
      </label>
    )
  }

  function numberField(key, label, step = '1') {
    return (
      <label className="referral-field" key={key}>
        <span>{label}</span>
        <input
          type="number"
          min="0"
          step={step}
          value={settings[key] ?? 0}
          onChange={event => updateField(key, event.target.value)}
        />
      </label>
    )
  }

  if (loading) {
    return <main className="referral-admin"><p>Loading referral settings...</p></main>
  }

  return (
    <main className="referral-admin">
      <header className="referral-header">
        <div>
          <p className="referral-eyebrow">VERITAS ADMIN PANEL</p>
          <h1>Referral Settings</h1>
          <p>Control eligibility, welcome rewards, and referrer rewards.</p>
        </div>
        <Link className="referral-back" to="/admin">Back to Admin</Link>
      </header>

      {error && <div className="referral-alert referral-error">{error}</div>}
      {message && <div className="referral-alert referral-success">{message}</div>}

      <form onSubmit={saveSettings}>
        <section className="referral-panel">
          <h2>Referral Program</h2>
          {toggle('referrals_enabled', 'Enable the referral program')}
          <p className="referral-note">
            When disabled, new referral rewards must not be issued.
          </p>
        </section>

        <section className="referral-panel">
          <h2>Qualification Options</h2>
          <p className="referral-note">
            Select one, two, or all three. Every selected option must be satisfied.
            Email confirmation remains part of your existing sign-in process and is
            not a referral option.
          </p>

          {qualificationOptions.map(option =>
            toggle(option.key, option.label, option.description)
          )}

          <div className="referral-grid referral-deposit-minimum">
            {numberField('minimum_deposit_kes', 'Minimum approved deposit (KES)', '0.01')}
          </div>
          <p className="referral-note">
            The minimum amount applies when Deposit approved is selected.
          </p>
        </section>

        <section className="referral-panel">
          <h2>Reward Amounts</h2>
          <p className="referral-note">
            Configure each recipient separately. You can enable either reward type
            independently or enable both.
          </p>

          <div className="referral-reward-cards">
            {rewardGroups.map(group => (
              <section className="referral-reward-card" key={group.enabledKey}>
                <div className="referral-reward-card-heading">
                  <div>
                    <h3>{group.title}</h3>
                    <p>{group.description}</p>
                  </div>
                  <span className="referral-reward-tag">REWARD SETTINGS</span>
                </div>

                {toggle(group.enabledKey, `Enable ${group.title.toLowerCase()}`)}

                <div className="referral-grid">
                  {group.fields.map(([key, label, step]) =>
                    numberField(key, label, step)
                  )}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="referral-panel">
          <h2>Reward Limits</h2>
          <p className="referral-note">
            Set limits for referral rewards across the program.
          </p>
          <div className="referral-grid">
            {numberField('maximum_rewards_per_referrer', 'Maximum rewards per referrer')}
            {numberField('maximum_total_referral_rewards', 'Maximum total referral rewards')}
          </div>
        </section>

        <button className="referral-save" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save Referral Settings'}
        </button>
      </form>
    </main>
  )
}
