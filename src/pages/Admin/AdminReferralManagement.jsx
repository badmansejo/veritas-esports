import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminReferralManagement.css'

const PAGE_INFO = {
  history: {
    title: 'Referral History',
    description: 'Audit referrals, qualification and reward processing.',
  },
  top: {
    title: 'Top Referrers',
    description: 'Rank referral partners by qualification and reward performance.',
  },
  fraud: {
    title: 'Fraud / Abuse Review',
    description: 'Investigate suspicious accounts and record review decisions.',
  },
}

const money = value =>
  `KES ${Number(value || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`

const statusText = value => String(value || 'pending').replaceAll('_', ' ')

const isProcessed = status =>
  ['approved', 'paid', 'rejected', 'reversed'].includes(
    String(status || '').toLowerCase()
  )

export default function AdminReferralManagement({ mode }) {
  const location = useLocation()
  const page = mode || (
    location.pathname.endsWith('/top')
      ? 'top'
      : location.pathname.endsWith('/fraud')
        ? 'fraud'
        : 'history'
  )

  const [referrals, setReferrals] = useState([])
  const [rewards, setRewards] = useState([])
  const [profiles, setProfiles] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [reviewDrafts, setReviewDrafts] = useState({})
  const [savingId, setSavingId] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    const results = await Promise.all([
      supabase.from('referrals').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase.from('referral_rewards').select('*').order('created_at', { ascending: false }).limit(2000),
      supabase.from('profiles').select('id, username, veritas_user_id, email, created_at').limit(5000),
      supabase.from('referral_fraud_reviews').select('*').order('updated_at', { ascending: false }).limit(1000),
    ])

    const failed = results.find(result => result.error)
    if (failed) {
      setError(failed.error.message)
      setLoading(false)
      return
    }

    setReferrals(results[0].data || [])
    setRewards(results[1].data || [])
    setProfiles(results[2].data || [])
    setReviews(results[3].data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const profileMap = useMemo(
    () => Object.fromEntries(profiles.map(profile => [profile.id, profile])),
    [profiles]
  )

  const reviewMap = useMemo(
    () => Object.fromEntries(reviews.map(review => [review.referral_id, review])),
    [reviews]
  )

  const rewardMap = useMemo(() => {
    const map = {}
    rewards.forEach(reward => {
      map[reward.referral_id] ||= []
      map[reward.referral_id].push(reward)
    })
    return map
  }, [rewards])

  const qualified = referral =>
    Boolean(referral.qualified_at) ||
    Boolean(referral.reward_granted) ||
    ['qualified', 'completed', 'rewarded'].includes(
      String(referral.status || '').toLowerCase()
    )

  const filteredReferrals = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return referrals

    return referrals.filter(referral => {
      const referrer = profileMap[referral.referrer_id]
      const referred = profileMap[referral.referred_user_id]
      const review = reviewMap[referral.id]
      return [
        referral.id, referral.status,
        referrer?.username, referrer?.veritas_user_id,
        referred?.username, referred?.veritas_user_id,
        review?.review_status,
      ].join(' ').toLowerCase().includes(query)
    })
  }, [referrals, search, profileMap, reviewMap])

  const leaderboard = useMemo(() => {
    const grouped = {}

    referrals.forEach(referral => {
      const id = referral.referrer_id
      if (!id) return
      grouped[id] ||= { id, total: 0, qualified: 0, rewarded: 0, kes: 0, vcoins: 0 }
      grouped[id].total += 1
      if (qualified(referral)) grouped[id].qualified += 1
      if (referral.reward_granted) grouped[id].rewarded += 1

      ;(rewardMap[referral.id] || []).forEach(reward => {
        if (!['approved', 'paid'].includes(String(reward.status || '').toLowerCase())) return
        if (reward.reward_type === 'KES') grouped[id].kes += Number(reward.amount || 0)
        if (reward.reward_type === 'VCOINS') grouped[id].vcoins += Number(reward.amount || 0)
      })
    })

    return Object.values(grouped).sort(
      (a, b) => b.qualified - a.qualified || b.rewarded - a.rewarded || b.total - a.total
    )
  }, [referrals, rewardMap])

  async function processReward(reward, action) {
    const actionLabel = action === 'approve' ? 'approve' : action === 'pay' ? 'PAY AND CREDIT' : 'reject'
    const recipient = profileMap[reward.recipient_user_id]
    const description = `${actionLabel} ${reward.reward_type} ${reward.amount} reward for ${recipient?.username || reward.recipient_user_id}`

    if (!window.confirm(`Are you sure you want to ${description}?`)) return

    setSavingId(reward.id)
    setError('')
    setNotice('')

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser()
      if (userError || !userResult?.user) {
        throw new Error(userError?.message || 'Please sign in again.')
      }

      const { data, error: rpcError } = await supabase.rpc(
        'admin_process_veritas_referral_reward',
        {
          p_reward_id: reward.id,
          p_action: action,
        }
      )

      if (rpcError) throw rpcError

      if (!data) {
        throw new Error('The database returned no reward record. Refresh and verify the reward status.')
      }

      setNotice(
        action === 'approve'
          ? 'Reward approved. It must be paid separately.'
          : action === 'pay'
            ? 'Reward paid and wallet credited successfully.'
            : 'Reward rejected.'
      )

      await loadData()
    } catch (err) {
      setError(err?.message || 'Could not process referral reward.')
    } finally {
      setSavingId('')
    }
  }

  async function saveReview(referralId) {
    setSavingId(referralId)
    setError('')
    setNotice('')

    try {
      const { data: userResult, error: userError } = await supabase.auth.getUser()
      if (userError || !userResult?.user) {
        throw new Error(userError?.message || 'Please sign in again.')
      }

      const draft = reviewDrafts[referralId] || {}
      const payload = {
        referral_id: referralId,
        review_status: draft.review_status || reviewMap[referralId]?.review_status || 'investigating',
        notes: String(draft.notes ?? reviewMap[referralId]?.notes ?? '').trim(),
        reviewed_by: userResult.user.id,
        updated_at: new Date().toISOString(),
      }

      const { error: saveError } = await supabase
        .from('referral_fraud_reviews')
        .upsert(payload, { onConflict: 'referral_id' })

      if (saveError) throw saveError

      setNotice('Review saved. No wallet balance was changed.')
      await loadData()
    } catch (err) {
      setError(err?.message || 'Could not save review.')
    } finally {
      setSavingId('')
    }
  }

  const info = PAGE_INFO[page] || PAGE_INFO.history
  const pendingRewards = rewards.filter(
    reward => ['pending', 'awaiting_approval', 'qualified'].includes(
      String(reward.status || '').toLowerCase()
    )
  )

  return (
    <main className="refman">
      <header className="refman-header">
        <div>
          <div className="refman-kicker">VERITAS / ADMIN</div>
          <h1>{info.title}</h1>
          <p>{info.description}</p>
        </div>
        <Link to="/admin" className="refman-back">← Admin dashboard</Link>
      </header>

      {page === 'history' && <div className="refman-purpose"><strong>Referral audit log</strong><span>Search referrals, inspect reward records and process eligible rewards.</span></div>}
      {page === 'top' && <div className="refman-purpose"><strong>Performance leaderboard</strong><span>Rank users by qualified referrals, rewards and referral volume.</span></div>}
      {page === 'fraud' && <div className="refman-purpose"><strong>Investigation workspace</strong><span>Record findings. Fraud review does not directly change wallet balances.</span></div>}

      <nav className="refman-tabs">
        <Link className={page === 'history' ? 'active' : ''} to="/admin/referrals/history">History & approvals</Link>
        <Link className={page === 'top' ? 'active' : ''} to="/admin/referrals/top">Top referrers</Link>
        <Link className={page === 'fraud' ? 'active' : ''} to="/admin/referrals/fraud">Fraud review</Link>
        <Link to="/admin/referrals/settings">Settings</Link>
      </nav>

      {error && <div className="refman-message error">{error}</div>}
      {notice && <div className="refman-message success">{notice}</div>}

      {loading ? <div className="refman-empty">Loading referral records…</div> : (
        <>
          <section className="refman-stats">
            <article><span>Total referrals</span><strong>{referrals.length}</strong></article>
            <article><span>Qualified</span><strong>{referrals.filter(qualified).length}</strong></article>
            <article><span>Rewards recorded</span><strong>{rewards.length}</strong></article>
            <article><span>Pending reward decisions</span><strong>{pendingRewards.length}</strong></article>
          </section>

          {page === 'top' ? (
            <section className="refman-panel">
              <div className="refman-panel-head">
                <div><h2>Referrer leaderboard</h2><p>Based on recorded referral qualification data.</p></div>
                <input aria-label="Search referrers" placeholder="Search username or ID…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="refman-table-wrap">
                <table>
                  <thead><tr><th>Rank</th><th>Referrer</th><th>Total</th><th>Qualified</th><th>Rewarded</th><th>Recorded KES</th><th>Recorded V Coins</th></tr></thead>
                  <tbody>
                    {leaderboard.filter(item => {
                      const profile = profileMap[item.id]
                      return `${profile?.username || ''} ${profile?.veritas_user_id || ''}`.toLowerCase().includes(search.toLowerCase())
                    }).map((item, index) => {
                      const profile = profileMap[item.id]
                      return <tr key={item.id}>
                        <td><span className="refman-rank">#{index + 1}</span></td>
                        <td><strong>{profile?.username || 'Unknown user'}</strong><small>{profile?.veritas_user_id || item.id}</small></td>
                        <td>{item.total}</td><td>{item.qualified}</td><td>{item.rewarded}</td>
                        <td>{money(item.kes)}</td><td>{item.vcoins.toLocaleString()}</td>
                      </tr>
                    })}
                    {!leaderboard.length && <tr><td colSpan="7" className="refman-empty">No referral records yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          ) : page === 'history' ? (
            <section className="refman-panel">
              <div className="refman-panel-head">
                <div><h2>Referral rewards & approvals</h2><p>Approve or reject pending rewards. The database function performs the protected wallet/reward transaction.</p></div>
                <input aria-label="Search rewards" placeholder="Search username, ID or status…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="refman-table-wrap">
                <table>
                  <thead><tr><th>Recipient</th><th>Role</th><th>Reward</th><th>Referral ID</th><th>Created</th><th>Status</th><th>Decision</th></tr></thead>
                  <tbody>
                    {rewards.filter(reward => {
                      const profile = profileMap[reward.recipient_user_id]
                      return [
                        profile?.username, profile?.veritas_user_id, reward.reward_type,
                        reward.status, reward.recipient_role, reward.referral_id,
                      ].join(' ').toLowerCase().includes(search.toLowerCase())
                    }).map(reward => {
                      const recipient = profileMap[reward.recipient_user_id]
                      const rewardStatus = String(reward.status || '').toLowerCase()
                      const pending = ['pending', 'awaiting_approval', 'qualified'].includes(rewardStatus)
                      const approved = rewardStatus === 'approved'
                      return <tr key={reward.id}>
                        <td><strong>{recipient?.username || 'Unknown user'}</strong><small>{recipient?.veritas_user_id || reward.recipient_user_id}</small></td>
                        <td>{statusText(reward.recipient_role)}</td>
                        <td><strong>{reward.reward_type === 'KES' ? money(reward.amount) : `${Number(reward.amount || 0).toLocaleString()} V Coins`}</strong></td>
                        <td><small>{reward.referral_id}</small></td>
                        <td>{reward.created_at ? new Date(reward.created_at).toLocaleString() : '—'}</td>
                        <td><span className={`refman-status ${['approved', 'paid'].includes(String(reward.status || '').toLowerCase()) ? 'qualified' : ''}`}>{statusText(reward.status)}</span>{reward.processed_at && <small>Processed {new Date(reward.processed_at).toLocaleString()}</small>}</td>
                        <td className="refman-actions">
                          {pending ? (
                            <>
                              <button className="refman-approve" disabled={savingId === reward.id} onClick={() => processReward(reward, 'approve')}>{savingId === reward.id ? 'Processing…' : 'Approve'}</button>
                              <button className="refman-reject" disabled={savingId === reward.id} onClick={() => processReward(reward, 'reject')}>Reject</button>
                            </>
                          ) : approved ? (
                            <button className="refman-approve" disabled={savingId === reward.id} onClick={() => processReward(reward, 'pay')}>{savingId === reward.id ? 'Processing…' : 'Pay & credit wallet'}</button>
                          ) : <small>No action available for this status.</small>}
                        </td>
                      </tr>
                    })}
                    {!rewards.length && <tr><td colSpan="7" className="refman-empty">No referral reward records yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <section className="refman-panel">
              <div className="refman-panel-head">
                <div><h2>Cases requiring review</h2><p>Review each case, record findings and save an auditable decision.</p></div>
                <input aria-label="Search referrals" placeholder="Search user, ID or status…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="refman-table-wrap">
                <table>
                  <thead><tr><th>Referrer</th><th>Referred user</th><th>Created</th><th>Referral status</th><th>Rewards</th><th>Review</th></tr></thead>
                  <tbody>
                    {filteredReferrals.map(referral => {
                      const referrer = profileMap[referral.referrer_id]
                      const referred = profileMap[referral.referred_user_id]
                      const review = reviewMap[referral.id]
                      const draft = reviewDrafts[referral.id] || {}
                      const referralRewards = rewardMap[referral.id] || []
                      return <tr key={referral.id}>
                        <td><strong>{referrer?.username || 'Unknown user'}</strong><small>{referrer?.veritas_user_id || referral.referrer_id || '—'}</small></td>
                        <td><strong>{referred?.username || 'Unknown user'}</strong><small>{referred?.veritas_user_id || referral.referred_user_id || '—'}</small></td>
                        <td>{referral.created_at ? new Date(referral.created_at).toLocaleDateString() : '—'}</td>
                        <td><span className={`refman-status ${qualified(referral) ? 'qualified' : ''}`}>{statusText(referral.status)}</span></td>
                        <td>{referralRewards.map(reward => <small key={reward.id}>{reward.reward_type} {reward.amount} · {statusText(reward.status)}</small>)}</td>
                        <td className="refman-review-cell">
                          <select value={draft.review_status ?? review?.review_status ?? 'investigating'} onChange={e => setReviewDrafts(current => ({ ...current, [referral.id]: { ...(current[referral.id] || {}), review_status: e.target.value } }))} aria-label="Review status">
                            <option value="investigating">Investigating</option><option value="flagged">Flagged</option><option value="cleared">Cleared</option><option value="confirmed_abuse">Confirmed abuse</option>
                          </select>
                          <textarea rows="2" placeholder="Admin notes…" value={draft.notes ?? review?.notes ?? ''} onChange={e => setReviewDrafts(current => ({ ...current, [referral.id]: { ...(current[referral.id] || {}), notes: e.target.value } }))} />
                          <button disabled={savingId === referral.id} onClick={() => saveReview(referral.id)}>{savingId === referral.id ? 'Saving…' : 'Save review'}</button>
                          {review?.updated_at && <small>Last reviewed {new Date(review.updated_at).toLocaleString()}</small>}
                        </td>
                      </tr>
                    })}
                    {!filteredReferrals.length && <tr><td colSpan="6" className="refman-empty">No matching referrals found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  )
}

