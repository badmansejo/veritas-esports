import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminReferralEarnings.css'

const money = value => Number(value || 0).toLocaleString('en-KE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const dateTime = value => {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const amountLabel = (type, amount) =>
  `${String(type || '').toUpperCase() === 'KES' ? 'KES ' : ''}${money(amount)}${String(type || '').toUpperCase() === 'VCOINS' ? ' V Coins' : ''}`

export default function AdminReferralEarnings() {
  const [requests, setRequests] = useState([])
  const [batches, setBatches] = useState([])
  const [profiles, setProfiles] = useState({})
  const [rewardsByRequest, setRewardsByRequest] = useState({})
  const [available, setAvailable] = useState({ KES: 0, VCOINS: 0 })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [expandedBatch, setExpandedBatch] = useState(null)
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')

    const [requestResult, batchResult, rewardResult, itemResult] = await Promise.all([
      supabase.from('referral_withdrawal_requests')
        .select('id,user_id,amount,reward_type,status,batch_id,created_at,admin_note,processed_at')
        .order('created_at', { ascending: false }),
      supabase.from('referral_withdrawal_batches')
        .select('id,batch_code,status,request_count,total_amount,total_kes,total_vcoins,created_at,processed_at')
        .order('created_at', { ascending: false }),
      supabase.from('referral_rewards')
        .select('id,recipient_user_id,recipient_role,reward_type,amount,status,created_at')
        .eq('status', 'approved'),
      supabase.from('referral_withdrawal_items')
        .select('request_id,reward_id,amount,reward_type'),
    ])

    const firstError =
      requestResult.error ||
      batchResult.error ||
      rewardResult.error ||
      itemResult.error

    if (firstError) {
      setError(firstError.message)
      setLoading(false)
      return
    }

    const requestRows = requestResult.data || []
    const batchRows = batchResult.data || []
    const rewardRows = rewardResult.data || []
    const itemRows = itemResult.data || []

    const claimedRewardIds = new Set(itemRows.map(row => row.reward_id))
    const totals = { KES: 0, VCOINS: 0 }

    // Available referral earnings exclude signup rewards and already-requested rewards.
    rewardRows.forEach(reward => {
      if (String(reward.recipient_role || '').toLowerCase() === 'new_user') return
      if (claimedRewardIds.has(reward.id)) return

      const type = String(reward.reward_type || '').toUpperCase()
      if (type === 'KES' || type === 'VCOINS') {
        totals[type] += Number(reward.amount || 0)
      }
    })

    const userIds = [...new Set(requestRows.map(row => row.user_id).filter(Boolean))]
    const profileMap = {}

    if (userIds.length) {
      const { data: userRows, error: userError } = await supabase
        .from('profiles')
        .select('id,username,veritas_user_id')
        .in('id', userIds)

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      ;(userRows || []).forEach(profile => {
        profileMap[profile.id] = profile
      })
    }

    const itemMap = {}
    itemRows.forEach(item => {
      if (!itemMap[item.request_id]) itemMap[item.request_id] = []
      itemMap[item.request_id].push(item)
    })

    setRequests(requestRows)
    setBatches(batchRows)
    setProfiles(profileMap)
    setRewardsByRequest(itemMap)
    setAvailable(totals)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function runAction(label, action) {
    if (busy) return

    setBusy(true)
    setMessage('')
    setError('')

    try {
      const { data, error: rpcError } = await action()

      if (rpcError) {
        setError(`${label} failed: ${rpcError.message}`)
        return
      }

      if (data && typeof data === 'object' && data.success === false) {
        setError(data.message || `${label} could not be completed.`)
        return
      }

      setMessage(
        data?.message ||
        (typeof data === 'string' ? data : `${label} completed successfully.`)
      )

      await loadData()
    } catch (err) {
      setError(`${label} failed: ${err.message || 'Unexpected error.'}`)
    } finally {
      setBusy(false)
    }
  }

  const pending = useMemo(
    () => requests.filter(row => String(row.status).toLowerCase() === 'pending'),
    [requests]
  )

  const unbatched = useMemo(
    () => pending.filter(row => !row.batch_id),
    [pending]
  )

  const stats = useMemo(() => ({
    pending: pending.length,
    waiting: unbatched.length,
    processing: batches.filter(row => ['processing', 'in_progress'].includes(String(row.status).toLowerCase())).length,
    approved: batches.filter(row => String(row.status).toLowerCase() === 'approved').length,
    rejected: batches.filter(row => String(row.status).toLowerCase() === 'rejected').length,
  }), [pending, unbatched, batches])

  const filteredBatches = useMemo(() => {
    const query = search.trim().toLowerCase()

    return batches.filter(batch => {
      const status = String(batch.status || '').toLowerCase()
      const statusMatches = filter === 'all' || status === filter
      const batchRequests = requests.filter(row => row.batch_id === batch.id)
      const searchMatches = !query ||
        String(batch.batch_code || '').toLowerCase().includes(query) ||
        batchRequests.some(row => {
          const profile = profiles[row.user_id]
          return String(profile?.username || '').toLowerCase().includes(query) ||
            String(profile?.veritas_user_id || '').toLowerCase().includes(query) ||
            String(row.user_id || '').toLowerCase().includes(query)
        })

      return statusMatches && searchMatches
    })
  }, [batches, requests, profiles, filter, search])

  function exportBatch(batch) {
    const batchRequests = requests.filter(row => row.batch_id === batch.id)
    const rows = [
      ['Batch Code', 'Username', 'VERITAS User ID', 'Reward Type', 'Amount', 'Status', 'Request ID', 'Created At'],
      ...batchRequests.map(row => {
        const profile = profiles[row.user_id] || {}
        return [
          batch.batch_code || '',
          profile.username || '',
          profile.veritas_user_id || '',
          row.reward_type || '',
          row.amount || 0,
          row.status || '',
          row.id,
          row.created_at || '',
        ]
      }),
    ]

    const csv = rows.map(row =>
      row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\r\n')

    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${batch.batch_code || 'referral-batch'}-referrals.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  async function approveBatch(batch) {
    const batchRequests = requests.filter(row => row.batch_id === batch.id)
    const containsSignupReward = batchRequests.some(row =>
      (rewardsByRequest[row.id] || []).some(item => {
        const reward = item
        return String(reward.recipient_role || '').toLowerCase() === 'new_user'
      })
    )

    if (containsSignupReward) {
      setError('This batch may contain signup rewards. Do not approve it; reject it and create a clean batch.')
      return
    }

    if (batchRequests.length > 20) {
      setError('This batch exceeds the 20-request limit.')
      return
    }

    if (!window.confirm(
      `Approve ${batch.batch_code} and credit all included users?\n\nRequests: ${batchRequests.length}\nKES: ${money(batch.total_kes)}\nV Coins: ${money(batch.total_vcoins)}\n\nThis action credits users immediately.`
    )) return

    await runAction('Approve batch', () =>
      supabase.rpc('admin_approve_referral_withdrawal_batch', {
        p_batch_id: batch.id,
      })
    )
  }

  async function rejectBatch(batch) {
    const note = window.prompt(`Reason for rejecting ${batch.batch_code}:`, '')
    if (note === null) return

    if (!window.confirm(`Reject ${batch.batch_code}? Users will be notified.`)) return

    await runAction('Reject batch', () =>
      supabase.rpc('admin_reject_referral_withdrawal_batch', {
        p_batch_id: batch.id,
        p_reason: note.trim() || null,
      })
    )
  }

  return (
    <main className="are-page">
      <header className="are-header">
        <div>
          <span className="are-eyebrow">VERITAS ADMIN CONTROL</span>
          <h1>Referral Earnings</h1>
          <p>Review automatically created referral withdrawal batches and approve or reject payouts.</p>
        </div>
        <button className="are-button are-button-ghost" type="button" onClick={loadData} disabled={loading || busy}>
          ↻ Refresh
        </button>
      </header>

      {message && <div className="are-alert are-success" role="status">{message}</div>}
      {error && <div className="are-alert are-error" role="alert">{error}</div>}

      <section className="are-stats">
        <article className="are-stat">
          <span>Available KES</span>
          <strong>KES {money(available.KES)}</strong>
          <small>Approved, unrequested referrer earnings</small>
        </article>
        <article className="are-stat">
          <span>Available V Coins</span>
          <strong>{money(available.VCOINS)}</strong>
          <small>Signup rewards excluded</small>
        </article>
        <article className="are-stat">
          <span>Pending Requests</span>
          <strong>{stats.pending}</strong>
          <small>All unprocessed requests</small>
        </article>
        <article className="are-stat">
          <span>Waiting for Batch</span>
          <strong>{stats.waiting}</strong>
          <small>Not yet assigned to a batch</small>
        </article>
        <article className="are-stat">
          <span>Approved Batches</span>
          <strong>{stats.approved}</strong>
          <small>Completed and credited</small>
        </article>
      </section>

      <section className="are-panel">
        <div className="are-section-heading">
          <div>
            <span className="are-eyebrow">BATCH OPERATIONS</span>
            <h2>Withdrawal Batches</h2>
            <p>Eligible referral withdrawal requests are assigned automatically to batches of up to 20. Approve a batch to credit wallets.</p>
          </div>
        </div>

        <div className="are-toolbar">
          <input
            type="search"
            aria-label="Search batches"
            placeholder="Search batch code, username or VERITAS ID…"
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <select aria-label="Filter batches by status" value={filter} onChange={event => setFilter(event.target.value)}>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All batches</option>
          </select>
        </div>

        {loading ? <div className="are-empty">Loading referral data…</div> :
          filteredBatches.length === 0 ? <div className="are-empty">No matching referral batches.</div> : (
            <div className="are-batch-list">
              {filteredBatches.map(batch => {
                const items = requests.filter(row => row.batch_id === batch.id)
                const status = String(batch.status || 'pending').toLowerCase()
                const isExpanded = expandedBatch === batch.id

                return (
                  <article className="are-batch" key={batch.id}>
                    <div className="are-batch-top">
                      <div>
                        <span className="are-eyebrow">BATCH REFERENCE</span>
                        <h3>{batch.batch_code || batch.id}</h3>
                        <p>Created {dateTime(batch.created_at)}</p>
                      </div>
                      <span className={`are-status are-status-${status.replace(/\s+/g, '-')}`}>{status.replace(/_/g, ' ')}</span>
                    </div>

                    <div className="are-batch-stats">
                      <div><span>Requests</span><strong>{items.length || batch.request_count || 0} / 20</strong></div>
                      <div><span>KES total</span><strong>KES {money(batch.total_kes)}</strong></div>
                      <div><span>V Coins total</span><strong>{money(batch.total_vcoins)}</strong></div>
                      <div><span>Combined total</span><strong>{money(batch.total_amount)}</strong></div>
                    </div>

                    <div className="are-actions">
                      <button className="are-button are-button-ghost" type="button" onClick={() => setExpandedBatch(isExpanded ? null : batch.id)}>
                        {isExpanded ? 'Hide Requests' : 'View Requests'}
                      </button>
                      <button className="are-button are-button-ghost" type="button" onClick={() => exportBatch(batch)}>
                        Export CSV
                      </button>
                      {status === 'pending' && (
                        <>
                          <button className="are-button are-button-success" type="button" disabled={busy || items.length === 0 || items.length > 20} onClick={() => approveBatch(batch)}>
                            ✓ Approve & Credit
                          </button>
                          <button className="are-button are-button-danger" type="button" disabled={busy} onClick={() => rejectBatch(batch)}>
                            ✕ Reject Batch
                          </button>
                        </>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="are-table-wrap">
                        {items.length === 0 ? <p className="are-empty">No requests assigned to this batch.</p> : (
                          <table className="are-table">
                            <thead>
                              <tr><th>User</th><th>VERITAS ID</th><th>Type</th><th>Amount</th><th>Status</th><th>Requested</th></tr>
                            </thead>
                            <tbody>
                              {items.map(row => {
                                const profile = profiles[row.user_id] || {}
                                return (
                                  <tr key={row.id}>
                                    <td>{profile.username || row.user_id}</td>
                                    <td>{profile.veritas_user_id || '—'}</td>
                                    <td><span className={`are-type are-type-${String(row.reward_type).toLowerCase()}`}>{row.reward_type}</span></td>
                                    <td>{amountLabel(row.reward_type, row.amount)}</td>
                                    <td>{row.status}</td>
                                    <td>{dateTime(row.created_at)}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
      </section>

      <section className="are-panel">
        <div className="are-section-heading">
          <div>
            <span className="are-eyebrow">REQUEST AUDIT</span>
            <h2>All Withdrawal Requests</h2>
            <p>Every referrer request and its current batch assignment.</p>
          </div>
          <span className="are-count">{requests.length} requests</span>
        </div>

        {loading ? <div className="are-empty">Loading requests…</div> : requests.length === 0 ? (
          <div className="are-empty">No referral withdrawal requests yet.</div>
        ) : (
          <div className="are-table-wrap">
            <table className="are-table">
              <thead>
                <tr><th>User</th><th>VERITAS ID</th><th>Type</th><th>Amount</th><th>Status</th><th>Batch</th><th>Requested</th></tr>
              </thead>
              <tbody>
                {requests.map(row => {
                  const profile = profiles[row.user_id] || {}
                  const batch = batches.find(item => item.id === row.batch_id)
                  return (
                    <tr key={row.id}>
                      <td>{profile.username || row.user_id}</td>
                      <td>{profile.veritas_user_id || '—'}</td>
                      <td><span className={`are-type are-type-${String(row.reward_type).toLowerCase()}`}>{row.reward_type}</span></td>
                      <td>{amountLabel(row.reward_type, row.amount)}</td>
                      <td><span className={`are-status are-status-${String(row.status || '').toLowerCase()}`}>{row.status}</span></td>
                      <td>{batch?.batch_code || '—'}</td>
                      <td>{dateTime(row.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

