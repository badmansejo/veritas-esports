import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminTournamentPrizePools.css'

export default function AdminTournamentPrizePools() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const loadPools = async () => {
    setLoading(true)

    const { data, error } = await supabase.rpc('admin_get_wallet_transactions')

    if (error) {
      alert(`Could not load tournament prize pools: ${error.message}`)
      setTransactions([])
    } else {
      const rows = Array.isArray(data) ? data : []
      setTransactions(
        rows.filter((item) =>
          item.source_type === 'tournament_prize_reserve' ||
          String(item.description || '').toLowerCase().includes(
            'sponsored tournament prize pool reserved'
          )
        )
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    loadPools()
  }, [])

  const pools = useMemo(() => {
    const query = search.trim().toLowerCase()

    return transactions.filter((item) =>
      [
        item.username,
        item.veritas_user_id,
        item.email,
        item.reference,
        item.source_id,
        item.description,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    )
  }, [transactions, search])

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const totalReserved = transactions.reduce(
    (sum, item) => sum + Math.abs(Math.min(0, Number(item.amount || 0))),
    0
  )

  const copyText = async (value) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(String(value))
    } catch {
      window.prompt('Copy this value:', String(value))
    }
  }

  return (
    <main className="atpp-page">
      <header className="atpp-header">
        <div>
          <div className="atpp-eyebrow">VERITAS FINANCE / TOURNAMENTS</div>
          <h1>Tournament Prize Pools</h1>
          <p>Track KES reserved for sponsored tournament prizes.</p>
        </div>
        <button type="button" onClick={loadPools} disabled={loading}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
      </header>

      <section className="atpp-summary">
        <article>
          <span>Prize Pool Transactions</span>
          <strong>{transactions.length}</strong>
        </article>
        <article>
          <span>Total Recorded as Reserved</span>
          <strong>KES {formatMoney(totalReserved)}</strong>
        </article>
      </section>

      <div className="atpp-note">
        These totals come from recorded reservation transactions. This page does
        not independently verify whether a tournament has paid out or refunded
        its prize pool.
      </div>

      <div className="atpp-toolbar">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search creator, User ID, reference, tournament..."
        />
      </div>

      <div className="atpp-table-wrap">
        <table className="atpp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Creator</th>
              <th>Tournament</th>
              <th>Amount Reserved</th>
              <th>Balance Before</th>
              <th>Balance After</th>
              <th>Reference</th>
              <th>Record</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="8" className="atpp-empty">Loading prize pools...</td></tr>
            ) : pools.length === 0 ? (
              <tr>
                <td colSpan="8" className="atpp-empty">
                  No tournament prize-pool reservations found.
                </td>
              </tr>
            ) : pools.map((item) => (
              <tr key={item.id || item.reference}>
                <td>
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString('en-KE')
                    : '—'}
                </td>
                <td>
                  <strong>{item.username || 'Unknown user'}</strong>
                  <small>{item.veritas_user_id || 'No User ID'}</small>
                  <small>{item.email || ''}</small>
                </td>
                <td>
                  <strong>{item.source_id || 'Tournament'}</strong>
                  <small>{item.description || 'Prize pool reservation'}</small>
                </td>
                <td className="atpp-amount">
                  KES {formatMoney(Math.abs(Number(item.amount || 0)))}
                </td>
                <td>KES {formatMoney(item.balance_before)}</td>
                <td>KES {formatMoney(item.balance_after)}</td>
                <td>
                  <span className="atpp-reference">{item.reference || '—'}</span>
                  {item.reference && (
                    <button
                      className="atpp-copy"
                      type="button"
                      onClick={() => copyText(item.reference)}
                    >
                      Copy
                    </button>
                  )}
                </td>
                <td><span className="atpp-status">Reserved record</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
