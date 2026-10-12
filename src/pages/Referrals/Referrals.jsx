import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './Referrals.css'

const APP_URL = 'https://veritas-esportss.veritasesports.workers.dev'
const referralSettingsDefaults = {
  referrals_enabled: false,
  referrer_reward_enabled: true,
  referrer_kes_reward: 0,
  referrer_vcoins_reward: 0,
  new_user_reward_enabled: true,
  new_user_kes_reward: 0,
  new_user_vcoins_reward: 10,
  require_telegram_linked: false,
  require_whatsapp_saved: false,
  require_deposit_approved: false,
  minimum_deposit_kes: 0,
  maximum_rewards_per_referrer: 100,
  maximum_total_referral_rewards: 10000,
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
}

function money(value) {
  return `KES ${Number(value || 0).toLocaleString()}`
}

function statusClass(value) {
  return String(value || 'pending')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
}

export default function Referrals() {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [profile, setProfile] = useState(null)
  const [referralCode, setReferralCode] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [rewards, setRewards] = useState([])
  const [referralSettings, setReferralSettings] = useState(referralSettingsDefaults)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser()

      if (authError) throw authError

      const user = authData?.user

      if (!user) {
        throw new Error('Please sign in to view your referrals.')
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, veritas_user_id, email')
        .eq('id', user.id)
        .maybeSingle()

      if (profileError) throw profileError

      setProfile(profileData || { id: user.id, email: user.email })

      const { data: settingsData, error: settingsError } = await supabase
        .from('referral_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle()

      if (settingsError) throw settingsError

      setReferralSettings({
        ...referralSettingsDefaults,
        ...(settingsData || {}),
      })

      const { data: codes, error: codeError } = await supabase
        .from('referral_codes')
        .select('id, user_id, code, is_active, total_referrals, successful_referrals, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (codeError) throw codeError

      let code = codes?.[0] || null

      if (!code) {
        const username = String(profileData?.username || 'PLAYER')
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8) || 'PLAYER'

        const suffix = user.id.replace(/-/g, '').slice(0, 6).toUpperCase()
        const generatedCode = `${username}${suffix}`

        const { data: insertedCode, error: insertError } = await supabase
          .from('referral_codes')
          .insert({
            user_id: user.id,
            code: generatedCode,
            is_active: true,
          })
          .select('id, user_id, code, is_active, total_referrals, successful_referrals, created_at')
          .single()

        if (insertError) {
          // A code may have been created concurrently, so check once more.
          const { data: retryCodes, error: retryError } = await supabase
            .from('referral_codes')
            .select('id, user_id, code, is_active, total_referrals, successful_referrals, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)

          if (retryError) throw retryError
          if (!retryCodes?.[0]) throw insertError
          code = retryCodes[0]
        } else {
          code = insertedCode
        }
      }

      setReferralCode(code)

      const [referralsResult, rewardsResult] = await Promise.all([
        supabase
          .from('referrals')
          .select('id, referred_user_id, status, qualification_amount, reward_granted, created_at, qualified_at, rewarded_at')
          .eq('referrer_id', user.id)
          .order('created_at', { ascending: false }),

        supabase
          .from('referral_rewards')
          .select('id, referral_id, recipient_user_id, recipient_role, reward_type, amount, status, created_at, processed_at')
          .eq('recipient_user_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      if (referralsResult.error) throw referralsResult.error
      if (rewardsResult.error) throw rewardsResult.error

      const referralRows = referralsResult.data || []
      const rewardRows = rewardsResult.data || []

      setReferrals(referralRows)
      setRewards(rewardRows)
    } catch (err) {
      console.error('Referrals page error:', err)
      setError(err?.message || 'Could not load your referrals.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const inviteLink = referralCode?.code
    ? `${APP_URL}/register?ref=${encodeURIComponent(referralCode.code)}`
    : ''

  const copyText = async (value, label) => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setNotice(`${label} copied.`)
    } catch {
      setNotice('Copy failed. Please select and copy the text manually.')
    }
  }

  const shareInvite = async () => {
    if (!inviteLink) return

    const shareData = {
      title: 'Join VERITAS',
      text: `Join me on VERITAS! Use my referral code: ${referralCode.code}`,
      url: inviteLink,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await copyText(inviteLink, 'Invitation link')
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        await copyText(inviteLink, 'Invitation link')
      }
    }
  }

  const totalReferrals = referrals.length

  const successfulReferrals = referrals.filter(referral =>
    ['qualified', 'rewarded', 'completed', 'successful'].includes(
      String(referral.status || '').toLowerCase()
    )
  ).length

  const pendingCount = referrals.filter(referral =>
    ['pending', 'pending_qualification', 'under_review'].includes(
      String(referral.status || '').toLowerCase()
    )
  ).length

  const paidRewards = rewards.filter(reward =>
    String(reward.status || '').toLowerCase() === 'paid'
  )

  const paidKes = paidRewards
    .filter(reward => String(reward.reward_type || '').toUpperCase() === 'KES')
    .reduce((sum, reward) => sum + Number(reward.amount || 0), 0)

  const paidVCoins = paidRewards
    .filter(reward => String(reward.reward_type || '').toUpperCase() === 'VCOINS')
    .reduce((sum, reward) => sum + Number(reward.amount || 0), 0)

  if (loading) {
    return (
      <main className="referrals-page">
        <div className="referrals-loading">
          <div className="referrals-spinner" />
          <p>Loading your referral hub...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="referrals-page">
      <header className="referrals-header">
        <div>
          <span className="referrals-eyebrow">VERITAS REWARDS NETWORK</span>
          <h1>My <span>Referrals</span></h1>
          <p>Invite players, track their progress and view your rewards.</p>
        </div>

        <button
          type="button"
          className="referrals-refresh"
          onClick={loadData}
          disabled={busy}
        >
          ↻ Refresh
        </button>
      </header>

      {error && (
        <section className="referrals-alert referrals-alert-error">
          <strong>Unable to load referrals</strong>
          <p>{error}</p>
          <button type="button" onClick={loadData}>Try again</button>
        </section>
      )}

      {notice && (
        <button
          type="button"
          className="referrals-notice"
          onClick={() => setNotice('')}
          title="Dismiss notification"
        >
          ✓ {notice} <span>×</span>
        </button>
      )}

      <section className="referrals-panel referrals-qualification-panel">
        <div className="referrals-panel-heading">
          <div>
            <span className="referrals-eyebrow">PROGRAM INFORMATION</span>
            <h2>Qualification &amp; rewards</h2>
          </div>
          <span className={`referrals-status ${referralSettings.referrals_enabled ? 'status-qualified' : 'status-disabled'}`}>
            {referralSettings.referrals_enabled ? 'Program enabled' : 'Program unavailable'}
          </span>
        </div>

        {!referralSettings.referrals_enabled && (
          <div className="referrals-alert referrals-alert-error">
            <strong>Referrals are currently disabled.</strong>
            <p>You can view your existing referral history, but the referral program is not currently accepting eligible reward activity.</p>
          </div>
        )}

        <p>
          The requirements below are loaded from the current VERITAS Admin Referral Settings.
          Selected requirements must all be satisfied before a referral qualifies.
        </p>

        <div className="referrals-qualification-list">
          {[
            {
              key: 'require_telegram_linked',
              title: 'Telegram linked',
              description: 'The invited player must link their Telegram account.',
            },
            {
              key: 'require_whatsapp_saved',
              title: 'WhatsApp number saved',
              description: 'The invited player must save a WhatsApp number to their profile.',
            },
            {
              key: 'require_deposit_approved',
              title: 'Approved deposit',
              description: `The invited player must have an approved deposit${Number(referralSettings.minimum_deposit_kes || 0) > 0 ? ` of at least KES ${Number(referralSettings.minimum_deposit_kes).toLocaleString()}` : ''}.`,
            },
          ].map(item => (
            <article className="referrals-qualification-item" key={item.key}>
              <span className={`referrals-requirement-icon ${referralSettings[item.key] ? 'requirement-on' : 'requirement-off'}`}>
                {referralSettings[item.key] ? '✓' : '—'}
              </span>
              <div>
                <strong>{item.title}</strong>
                <p>{referralSettings[item.key] ? item.description : 'Not required by the current admin settings.'}</p>
              </div>
              <span className={`referrals-status ${referralSettings[item.key] ? 'status-qualified' : 'status-disabled'}`}>
                {referralSettings[item.key] ? 'Required' : 'Optional'}
              </span>
            </article>
          ))}
        </div>

        <div className="referrals-reward-settings-grid">
          <article className="referrals-reward-info">
            <span className="referrals-eyebrow">PERSON SHARING THE CODE</span>
            <h3>Referrer reward</h3>
            {referralSettings.referrer_reward_enabled ? (
              <>
                <strong>{money(referralSettings.referrer_kes_reward)}</strong>
                <p>{Number(referralSettings.referrer_vcoins_reward || 0).toLocaleString()} V Coins</p>
              </>
            ) : (
              <p>The referrer reward is disabled by the administrator.</p>
            )}
          </article>

          <article className="referrals-reward-info">
            <span className="referrals-eyebrow">INVITED PLAYER</span>
            <h3>Welcome reward</h3>
            {referralSettings.new_user_reward_enabled ? (
              <>
                <strong>{money(referralSettings.new_user_kes_reward)}</strong>
                <p>{Number(referralSettings.new_user_vcoins_reward || 0).toLocaleString()} V Coins</p>
              </>
            ) : (
              <p>The invited player's welcome reward is disabled by the administrator.</p>
            )}
          </article>
        </div>

        <div className="referrals-limits">
          <div>
            <span>Maximum rewards per referrer</span>
            <strong>{Number(referralSettings.maximum_rewards_per_referrer || 0).toLocaleString()}</strong>
          </div>
          <div>
            <span>Maximum total program rewards</span>
            <strong>{Number(referralSettings.maximum_total_referral_rewards || 0).toLocaleString()}</strong>
          </div>
        </div>

        <div className="referrals-rules">
          <h3>Important qualification and safety rules</h3>
          <ul>
            <li>Do not refer yourself or create duplicate or fraudulent accounts.</li>
            <li>Sharing a code alone does not guarantee a reward. Eligibility and qualification must be checked.</li>
            <li>Rewards remain subject to available program limits, fraud review and administrator processing.</li>
            <li>Reward amounts shown here are configured amounts, not confirmation that a reward has been paid.</li>
            <li>Actual reward payment timing is not configured on this settings screen. Check the reward status in your history for processing updates.</li>
          </ul>
        </div>
      </section>
      <section className="referrals-hero">
        <div className="referrals-hero-copy">
          <span className="referrals-pill">YOUR PERSONAL INVITE</span>
          <h2>Build your squad.</h2>
          <p>
            Share your unique code with friends. Referral rewards depend on
            the active VERITAS reward settings and qualification rules.
          </p>

          <label className="referrals-field-label" htmlFor="referral-code">
            YOUR REFERRAL CODE
          </label>

          <div className="referrals-code-row">
            <input
              id="referral-code"
              value={referralCode?.code || ''}
              readOnly
              placeholder="Your code will appear here"
            />
            <button
              type="button"
              disabled={!referralCode?.code}
              onClick={() => copyText(referralCode?.code, 'Referral code')}
            >
              Copy code
            </button>
          </div>

          <label className="referrals-field-label" htmlFor="referral-link">
            INVITATION LINK
          </label>

          <div className="referrals-link-row">
            <input
              id="referral-link"
              value={inviteLink}
              readOnly
              placeholder="Invitation link unavailable"
            />
            <button
              type="button"
              disabled={!inviteLink}
              onClick={() => copyText(inviteLink, 'Invitation link')}
            >
              Copy link
            </button>
          </div>

          <button
            type="button"
            className="referrals-share-button"
            disabled={!inviteLink}
            onClick={shareInvite}
          >
            ↗ Share invitation
          </button>
        </div>

        <div className="referrals-hero-art" aria-hidden="true">
          <div className="referrals-orbit referrals-orbit-one" />
          <div className="referrals-orbit referrals-orbit-two" />
          <div className="referrals-emblem">V</div>
          <span className="referrals-art-label">SQUAD UP</span>
        </div>
      </section>

      <section className="referrals-stats">
        <article className="referrals-stat-card">
          <span className="referrals-stat-icon">♧</span>
          <span className="referrals-stat-label">Total invited</span>
          <strong>{totalReferrals}</strong>
          <small>Players linked to your code</small>
        </article>

        <article className="referrals-stat-card">
          <span className="referrals-stat-icon">✓</span>
          <span className="referrals-stat-label">Qualified</span>
          <strong>{successfulReferrals}</strong>
          <small>Referrals meeting qualification</small>
        </article>

        <article className="referrals-stat-card">
          <span className="referrals-stat-icon">◷</span>
          <span className="referrals-stat-label">In progress</span>
          <strong>{pendingCount}</strong>
          <small>Awaiting qualification</small>
        </article>

        <article className="referrals-stat-card">
          <span className="referrals-stat-icon">KES</span>
          <span className="referrals-stat-label">KES rewards paid</span>
          <strong>{money(paidKes)}</strong>
          <small>Confirmed paid rewards only</small>
        </article>

        <article className="referrals-stat-card">
          <span className="referrals-stat-icon">VC</span>
          <span className="referrals-stat-label">V Coins paid</span>
          <strong>{paidVCoins.toLocaleString()}</strong>
          <small>Confirmed paid rewards only</small>
        </article>
      </section>

      <section className="referrals-panel">
        <div className="referrals-panel-heading">
          <div>
            <span className="referrals-eyebrow">YOUR NETWORK</span>
            <h2>Referral history</h2>
          </div>
          <span className="referrals-count">{referrals.length} records</span>
        </div>

        {referrals.length === 0 ? (
          <div className="referrals-empty">
            <div className="referrals-empty-icon">♧</div>
            <h3>Your squad starts here</h3>
            <p>
              No referrals are linked to your account yet. Share your code
              with friends to start building your network.
            </p>
          </div>
        ) : (
          <div className="referrals-table-wrap">
            <table className="referrals-table">
              <thead>
                <tr>
                  <th>Referral</th>
                  <th>Date joined</th>
                  <th>Status</th>
                  <th>Qualification</th>
                </tr>
              </thead>
              <tbody>
                {referrals.map(referral => (
                  <tr key={referral.id}>
                    <td>
                      <span className="referrals-member">
                        Player {String(referral.referred_user_id || '').slice(0, 8)}
                      </span>
                      <small className="referrals-muted">
                        ID {String(referral.id || '').slice(0, 8)}
                      </small>
                    </td>
                    <td>{formatDate(referral.created_at)}</td>
                    <td>
                      <span className={`referrals-status status-${statusClass(referral.status)}`}>
                        {String(referral.status || 'Pending').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {referral.qualification_amount != null
                        ? money(referral.qualification_amount)
                        : 'Not recorded'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="referrals-panel">
        <div className="referrals-panel-heading">
          <div>
            <span className="referrals-eyebrow">REWARD TRACKER</span>
            <h2>My rewards</h2>
          </div>
          <span className="referrals-count">{rewards.length} records</span>
        </div>

        {rewards.length === 0 ? (
          <div className="referrals-empty referrals-empty-compact">
            <h3>No rewards yet</h3>
            <p>
              Your referral rewards will appear here when they are created.
              Pending or approved rewards are not counted as paid.
            </p>
          </div>
        ) : (
          <div className="referrals-table-wrap">
            <table className="referrals-table">
              <thead>
                <tr>
                  <th>Reward</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {rewards.map(reward => (
                  <tr key={reward.id}>
                    <td>
                      <span className="referrals-member">
                        {String(reward.reward_type || 'Reward').toUpperCase()}
                      </span>
                      <small className="referrals-muted">
                        {reward.recipient_role || 'Referral reward'}
                      </small>
                    </td>
                    <td>
                      {String(reward.reward_type || '').toUpperCase() === 'KES'
                        ? money(reward.amount)
                        : `${Number(reward.amount || 0).toLocaleString()} ${reward.reward_type || ''}`}
                    </td>
                    <td>
                      <span className={`referrals-status status-${statusClass(reward.status)}`}>
                        {String(reward.status || 'Pending').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>{formatDate(reward.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="referrals-footnote">
        <strong>Important</strong>
        <p>
          Referral rewards are subject to the current platform settings,
          qualification checks, fraud review and admin processing. Sharing
          a code does not guarantee a reward. If your invitation link does
          not attach a new account to your referral history, registration
          must also be configured to record the referral code.
        </p>
      </section>
    </main>
  )
}

