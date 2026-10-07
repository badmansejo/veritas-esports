import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminTransactions.css'

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [sourceFilter, setSourceFilter] = useState('All')

  const loadTransactions = async () => {
    setLoading(true)

    const { data, error } = await supabase.rpc(
      'admin_get_wallet_transactions'
    )

    if (error) {
      alert(error.message)
      setTransactions([])
    } else {
      setTransactions(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  const transactionTypes = useMemo(() => {
    return [
      'All',
      ...Array.from(
        new Set(
          transactions
            .map((item) => item.transaction_type)
            .filter(Boolean)
        )
      ),
    ]
  }, [transactions])

  const sources = useMemo(() => {
    return [
      'All',
      ...Array.from(
        new Set(
          transactions
            .map((item) => item.source_type)
            .filter(Boolean)
        )
      ),
    ]
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()

    return transactions.filter((item) => {
      const matchesSearch =
        !query ||
        String(item.username || '').toLowerCase().includes(query) ||
        String(item.veritas_user_id || '').toLowerCase().includes(query) ||
        String(item.email || '').toLowerCase().includes(query) ||
        String(item.reference || '').toLowerCase().includes(query) ||
        String(item.description || '').toLowerCase().includes(query)

      const matchesType =
        typeFilter === 'All' ||
        item.transaction_type === typeFilter

      const matchesSource =
        sourceFilter === 'All' ||
        item.source_type === sourceFilter

      return matchesSearch && matchesType && matchesSource
    })
  }, [transactions, search, typeFilter, sourceFilter])

  const moneyIn = useMemo(() => {
    return transactions
      .filter((item) => Number(item.amount) > 0)
      .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  }, [transactions])

  const moneyOut = useMemo(() => {
    return transactions
      .filter((item) => Number(item.amount) < 0)
      .reduce((sum, item) => sum + Math.abs(Number(item.amount || 0)), 0)
  }, [transactions])

  const formatMoney = (value) => {
    return Number(value || 0).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const escapeCsv = (value) => {
    const text = String(value ?? '')
    return `"${text.replace(/"/g, '""')}"`
  }

  const exportTransactions = () => {
    if (!transactions.length) {
      alert('There are no transactions to export.')
      return
    }

    setExporting(true)

    try {
      const headers = [
        'Date',
        'Username',
        'VERITAS User ID',
        'Email',
        'Transaction Type',
        'Amount',
        'Balance Before',
        'Balance After',
        'Withdrawal Method',
        'Reference',
        'Source',
        'Description',
      ]

      const rows = transactions.map((item) => [
        item.created_at
          ? new Date(item.created_at).toLocaleString('en-KE')
          : '',
        item.username || '',
        item.veritas_user_id || '',
        item.email || '',
        item.transaction_type || '',
        item.amount ?? '',
        item.balance_before ?? '',
        item.balance_after ?? '',
        item.withdrawal_method || '',
        item.reference || '',
        item.source_type || '',
        item.description || '',
      ])

      const csv = [
        headers.map(escapeCsv).join(','),
        ...rows.map((row) =>
          row.map(escapeCsv).join(',')
        ),
      ].join('\r\n')

      const blob = new Blob([csv], {
        type: 'text/csv;charset=utf-8;',
      })

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      link.href = url
      link.download = `veritas-wallet-transactions-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`

      document.body.appendChild(link)
      link.click()
      link.remove()

      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const deleteAllTransactions = async () => {
    const firstConfirm = window.confirm(
      'DELETE ALL WALLET TRANSACTIONS? This action cannot be undone.'
    )

    if (!firstConfirm) return

    const secondConfirm = window.confirm(
      'FINAL WARNING: This will permanently delete the complete VERITAS wallet transaction history. Continue?'
    )

    if (!secondConfirm) return

    setDeleting(true)

    const { error } = await supabase.rpc(
      'admin_delete_all_wallet_transactions'
    )

    if (error) {
      alert(error.message)
      setDeleting(false)
      return
    }

    alert('All wallet transactions have been deleted.')
    setTransactions([])
    setDeleting(false)
  }

  return (
    <div className="admin-transactions-page">
      <div className="admin-transactions-header">
        <div>
          <div className="admin-transactions-eyebrow">
            VERITAS FINANCE
          </div>

          <h1>Transactions</h1>

          <p>
            Complete wallet transaction ledger and financial audit history.
          </p>
        </div>

        <div className="admin-transactions-actions">
          <button
            type="button"
            className="admin-transaction-export"
            onClick={exportTransactions}
            disabled={exporting || !transactions.length}
          >
            {exporting ? 'Exporting...' : 'Export All'}
          </button>

          <button
            type="button"
            className="admin-transaction-delete"
            onClick={deleteAllTransactions}
            disabled={deleting || !transactions.length}
          >
            {deleting ? 'Deleting...' : 'Delete All'}
          </button>
        </div>
      </div>

      <div className="admin-transaction-summary">
        <div>
          <span>Total Transactions</span>
          <strong>{transactions.length}</strong>
        </div>

        <div>
          <span>Money In</span>
          <strong>KES {formatMoney(moneyIn)}</strong>
        </div>

        <div>
          <span>Money Out</span>
          <strong>KES {formatMoney(moneyOut)}</strong>
        </div>
      </div>

      <div className="admin-transaction-filters">
        <input
          type="text"
          placeholder="Search user, ID, reference..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          {transactionTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value)}
        >
          {sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="admin-transaction-refresh"
          onClick={loadTransactions}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="admin-transaction-table-wrap">
        <table className="admin-transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Balance</th>
              <th>Withdrawal Method</th>
              <th>Reference</th>
              <th>Source</th>
              <th>Description</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="admin-transaction-empty">
                  Loading transactions...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan="9" className="admin-transaction-empty">
                  No transactions found.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString('en-KE')
                      : '—'}
                  </td>

                  <td>
                    <strong>{item.username || '—'}</strong>
                    <small>
                      {item.veritas_user_id || ''}
                    </small>
                  </td>

                  <td>
                    <span className="admin-transaction-type">
                      {item.transaction_type || '—'}
                    </span>
                  </td>

                  <td
                    className={
                      Number(item.amount) >= 0
                        ? 'transaction-positive'
                        : 'transaction-negative'
                    }
                  >
                    {Number(item.amount) >= 0 ? '+' : '-'}KES{' '}
                    {formatMoney(Math.abs(Number(item.amount || 0)))}
                  </td>

                  <td>
                    KES {formatMoney(item.balance_after)}
                  </td>

                  <td>
                    {item.withdrawal_method || '—'}
                  </td>

                  <td>
                    {item.reference || '—'}
                  </td>

                  <td>
                    {item.source_type || '—'}
                  </td>

                  <td>
                    {item.description || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
