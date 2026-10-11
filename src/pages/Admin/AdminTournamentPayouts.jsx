import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const money = (value) => `KES ${Number(value || 0).toFixed(2)}`

const dateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

const statusColor = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'approved' || value === 'paid') return '#34d399'
  if (value === 'pending') return '#fbbf24'
  if (value === 'rejected' || value === 'failed') return '#fb7185'
  return '#cbd5e1'
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '24px',
    background: '#080d18',
    color: '#e5e7eb',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  heading: { marginTop: 0, marginBottom: 8 },
  muted: { color: '#94a3b8', margin: '6px 0' },
  panel: {
    marginTop: 22,
    padding: 20,
    border: '1px solid #30394b',
    borderRadius: 16,
    background: '#111827',
  },
  input: {
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
    padding: '12px 14px',
    color: '#f8fafc',
    background: '#0c1321',
    border: '1px solid #475569',
    borderRadius: 10,
    outline: 'none',
  },
  button: {
    padding: '12px 16px',
    color: '#f8fafc',
    background: '#1d4ed8',
    border: '1px solid #3b82f6',
    borderRadius: 10,
    fontWeight: 750,
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    minWidth: 650,
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  cell: {
    padding: '11px 10px',
    borderBottom: '1px solid #30394b',
    whiteSpace: 'nowrap',
  },
}

export default function AdminTournamentPayouts() {
  const [tournamentCode, setTournamentCode] = useState('')
  const [batches, setBatches] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [approvingId, setApprovingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [historyFilter, setHistoryFilter] = useState('All')
  const [historyOpen, setHistoryOpen] = useState(true)

  const loadBatches = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data, error: batchesError } = await supabase.rpc(
        'admin_get_tournament_payout_batches'
      )
      if (batchesError) throw batchesError

      setBatches(Array.isArray(data) ? data : [])

      const { data: historyData, error: historyError } = await supabase.rpc(
        'admin_get_tournament_payout_history'
      )
      if (historyError) throw historyError

      setHistory(Array.isArray(historyData) ? historyData : [])
    } catch (err) {
      console.error('Unable to load tournament payouts:', err)
      setError(err?.message || 'Could not load tournament payouts.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadBatches()
  }, [loadBatches])

  const preparePayouts = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')

    const code = tournamentCode.trim()
    if (!code) {
      setError('Enter the tournament code first.')
      return
    }

    setPreparing(true)

    try {
      const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('id, name, tournament_code')
        .eq('tournament_code', code)
        .maybeSingle()

      if (tournamentError) throw tournamentError
      if (!tournament) throw new Error('No tournament found with that code.')

      const { error: prepareError } = await supabase.rpc(
        'admin_prepare_tournament_payouts',
        { p_tournament_id: tournament.id }
      )

      if (prepareError) throw prepareError

      setMessage(
        `Payout preparation requested for ${tournament.name || code}. Winners will only receive wallet credit after admin approval.`
      )
      await loadBatches()
    } catch (err) {
      console.error('Unable to prepare tournament payouts:', err)
      setError(err?.message || 'Could not prepare tournament payouts.')
    } finally {
      setPreparing(false)
    }
  }

  const approveBatch = async (batch) => {
    if (!batch?.id) return

    const confirmed = window.confirm(
      `Approve payout batch ${batch.id} and credit the listed winners' wallets?`
    )
    if (!confirmed) return

    setApprovingId(batch.id)
    setMessage('')
    setError('')

    try {
      const { error: approvalError } = await supabase.rpc(
        'admin_approve_tournament_payout_batch',
        { p_batch_id: batch.id }
      )

      if (approvalError) throw approvalError

      setMessage('Payout batch approved. The approval function has been called.')
      await loadBatches()
    } catch (err) {
      console.error('Unable to approve payout batch:', err)
      setError(err?.message || 'Could not approve this payout batch.')
    } finally {
      setApprovingId(null)
    }
  }

  const filteredHistory = useMemo(() => {
    const query = historySearch.trim().toLowerCase()

    return history.filter((batch) => {
      const matchesStatus =
        historyFilter === 'All' ||
        String(batch.status || '').toLowerCase() ===
          historyFilter.toLowerCase()

      const items = Array.isArray(batch.items) ? batch.items : []
      const searchable = [
        batch.tournament_name,
        batch.tournament_code,
        batch.id,
        batch.status,
        ...items.flatMap((item) => [
          item.username,
          item.veritas_user_id,
          item.user_id,
          item.status,
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesStatus && (!query || searchable.includes(query))
    })
  }, [history, historySearch, historyFilter])

  const historyTotal = useMemo(
    () =>
      filteredHistory.reduce(
        (sum, batch) =>
          sum +
          (Array.isArray(batch.items) ? batch.items : []).reduce(
            (itemSum, item) => itemSum + Number(item.amount || 0),
            0
          ),
        0
      ),
    [filteredHistory]
  )

  return (
    <main style={styles.page}>
      <h1 style={styles.heading}>Tournament Payouts</h1>
      <p style={styles.muted}>
        Prepare prize batches and review payout records. Wallet credits require
        manual admin approval.
      </p>

      {message && (
        <div
          role="status"
          style={{
            marginTop: 16,
            padding: 14,
            color: '#a7f3d0',
            background: '#064e3b',
            border: '1px solid #059669',
            borderRadius: 10,
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 16,
            padding: 14,
            color: '#fecaca',
            background: '#450a0a',
            border: '1px solid #b91c1c',
            borderRadius: 10,
          }}
        >
          {error}
        </div>
      )}

      <section style={styles.panel}>
        <h2 style={{ marginTop: 0 }}>Prepare tournament payouts</h2>
        <form
          onSubmit={preparePayouts}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <input
            value={tournamentCode}
            onChange={(event) => setTournamentCode(event.target.value)}
            placeholder="Enter tournament code"
            aria-label="Tournament code"
            style={{ ...styles.input, flex: '1 1 240px' }}
          />
          <button
            type="submit"
            disabled={preparing}
            style={{
              ...styles.button,
              opacity: preparing ? 0.65 : 1,
              cursor: preparing ? 'wait' : 'pointer',
            }}
          >
            {preparing ? 'Preparing…' : 'Prepare payouts'}
          </button>
        </form>
        <p style={styles.muted}>
          Preparation creates a batch for review; it does not itself approve
          or credit winners.
        </p>
      </section>

      <section style={styles.panel}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <h2 style={{ margin: 0 }}>Pending payout batches</h2>
          <button
            type="button"
            onClick={loadBatches}
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading && batches.length === 0 ? (
          <p style={styles.muted}>Loading payout batches…</p>
        ) : batches.length === 0 ? (
          <p style={styles.muted}>No payout batches awaiting review.</p>
        ) : (
          <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
            {batches.map((batch) => {
              const items = Array.isArray(batch.items) ? batch.items : []
              const total = items.reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0
              )

              return (
                <article
                  key={batch.id}
                  style={{
                    padding: 16,
                    background: '#0c1321',
                    border: '1px solid #30394b',
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 8px' }}>
                        {batch.tournament_name || 'Tournament payout batch'}
                      </h3>
                      <p style={styles.muted}>
                        Tournament code: {batch.tournament_code || '—'}
                      </p>
                      <p style={styles.muted}>Batch ID: {batch.id}</p>
                      <p style={styles.muted}>
                        Prepared: {dateTime(batch.prepared_at)}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: 21 }}>{money(total)}</strong>
                      <p
                        style={{
                          color: statusColor(batch.status),
                          fontWeight: 800,
                        }}
                      >
                        {batch.status || 'Pending'}
                      </p>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div style={{ overflowX: 'auto', marginTop: 12 }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.cell}>Position</th>
                            <th style={styles.cell}>Winner</th>
                            <th style={styles.cell}>VERITAS ID</th>
                            <th style={{ ...styles.cell, textAlign: 'right' }}>
                              Prize
                            </th>
                            <th style={styles.cell}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td style={styles.cell}>
                                {item.finishing_position ?? '—'}
                              </td>
                              <td style={styles.cell}>
                                {item.username || '—'}
                              </td>
                              <td style={styles.cell}>
                                {item.veritas_user_id || '—'}
                              </td>
                              <td style={{ ...styles.cell, textAlign: 'right' }}>
                                {money(item.amount)}
                              </td>
                              <td
                                style={{
                                  ...styles.cell,
                                  color: statusColor(item.status),
                                }}
                              >
                                {item.status || 'Pending'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => approveBatch(batch)}
                    disabled={
                      approvingId !== null ||
                      String(batch.status || 'Pending').toLowerCase() !==
                        'pending'
                    }
                    style={{
                      ...styles.button,
                      marginTop: 18,
                      background: '#047857',
                      borderColor: '#34d399',
                      opacity:
                        approvingId !== null ||
                        String(batch.status || 'Pending').toLowerCase() !==
                          'pending'
                          ? 0.65
                          : 1,
                      cursor:
                        approvingId !== null ||
                        String(batch.status || 'Pending').toLowerCase() !==
                          'pending'
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                  >
                    {approvingId === batch.id
                      ? 'Approving…'
                      : 'Approve & Credit Winners'}
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section style={styles.panel}>
        <button
          type="button"
          onClick={() => setHistoryOpen((open) => !open)}
          style={{
            ...styles.button,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>Tournament payout history ({history.length} batches)</span>
          <span>{historyOpen ? '−' : '+'}</span>
        </button>

        {historyOpen && (
          <div style={{ marginTop: 20 }}>
            <div
              style={{
                display: 'flex',
                gap: 10,
                flexWrap: 'wrap',
                marginBottom: 18,
              }}
            >
              <input
                value={historySearch}
                onChange={(event) => setHistorySearch(event.target.value)}
                placeholder="Search tournament, batch, winner or User ID"
                aria-label="Search payout history"
                style={{ ...styles.input, flex: '1 1 240px' }}
              />
              <select
                value={historyFilter}
                onChange={(event) => setHistoryFilter(event.target.value)}
                aria-label="Filter payout history"
                style={{ ...styles.input, flex: '0 1 180px' }}
              >
                <option value="All">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 18,
              }}
            >
              {[
                ['Batches shown', filteredHistory.length],
                [
                  'Prize records shown',
                  filteredHistory.reduce(
                    (sum, batch) =>
                      sum +
                      (Array.isArray(batch.items) ? batch.items.length : 0),
                    0
                  ),
                ],
                ['Prize total shown', money(historyTotal)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    flex: '1 1 150px',
                    padding: 14,
                    background: '#0c1321',
                    borderRadius: 12,
                    border: '1px solid #30394b',
                  }}
                >
                  <p style={styles.muted}>{label}</p>
                  <strong style={{ fontSize: 23 }}>{value}</strong>
                </div>
              ))}
            </div>

            {loading ? (
              <p style={styles.muted}>Loading history…</p>
            ) : filteredHistory.length === 0 ? (
              <p style={styles.muted}>
                No payout history matches these filters.
              </p>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                {filteredHistory.map((batch) => {
                  const items = Array.isArray(batch.items) ? batch.items : []
                  const total = items.reduce(
                    (sum, item) => sum + Number(item.amount || 0),
                    0
                  )

                  return (
                    <article
                      key={batch.id}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        background: '#0c1321',
                        border: '1px solid #30394b',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 12,
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <h3 style={{ margin: '0 0 6px' }}>
                            {batch.tournament_name || 'Tournament'}
                          </h3>
                          <p style={styles.muted}>
                            Code: {batch.tournament_code || '—'}
                          </p>
                          <p style={styles.muted}>
                            Prepared: {dateTime(batch.prepared_at)}
                          </p>
                          <p style={styles.muted}>
                            Approved: {dateTime(batch.approved_at)}
                          </p>
                          <p style={styles.muted}>Batch ID: {batch.id}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong style={{ fontSize: 19 }}>
                            {money(total)}
                          </strong>
                          <p
                            style={{
                              color: statusColor(batch.status),
                              fontWeight: 800,
                            }}
                          >
                            {batch.status || 'Unknown'}
                          </p>
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.cell}>Position</th>
                              <th style={styles.cell}>Recipient</th>
                              <th style={styles.cell}>VERITAS ID</th>
                              <th style={{ ...styles.cell, textAlign: 'right' }}>
                                Amount
                              </th>
                              <th style={styles.cell}>Payment status</th>
                              <th style={styles.cell}>Paid at</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.length === 0 ? (
                              <tr>
                                <td style={styles.cell} colSpan={6}>
                                  No individual prize records found.
                                </td>
                              </tr>
                            ) : (
                              items.map((item) => (
                                <tr key={item.id}>
                                  <td style={styles.cell}>
                                    {item.finishing_position ?? '—'}
                                  </td>
                                  <td style={styles.cell}>
                                    {item.username || '—'}
                                  </td>
                                  <td style={styles.cell}>
                                    {item.veritas_user_id || '—'}
                                  </td>
                                  <td style={{ ...styles.cell, textAlign: 'right' }}>
                                    {money(item.amount)}
                                  </td>
                                  <td
                                    style={{
                                      ...styles.cell,
                                      color: statusColor(item.status),
                                    }}
                                  >
                                    {item.status || '—'}
                                  </td>
                                  <td style={styles.cell}>
                                    {dateTime(item.paid_at)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
