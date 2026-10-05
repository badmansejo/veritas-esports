import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('Pending')

  const loadDeposits = async () => {
    setLoading(true)
    setError('')

    try {
      let query = supabase
        .from('deposits')
        .select(`
          id,
          user_id,
          amount,
          method,
          reference,
          status,
          bonus_amount,
          proof_url,
          admin_note,
          processed_by,
          processed_at,
          created_at,
          updated_at,
          manual_deposit_method_id
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'All') {
        query = query.eq('status', filter)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      setDeposits(data || [])
    } catch (err) {
      setError(err.message || 'Failed to load deposits.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDeposits()
  }, [filter])

  const approveDeposit = async (depositId) => {
    const confirmed = window.confirm(
      'Approve this manual deposit? The amount will be added to the user wallet.'
    )

    if (!confirmed) return

    setProcessingId(depositId)
    setMessage('')
    setError('')

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'approve_manual_deposit',
        {
          p_deposit_id: depositId,
        }
      )

      if (rpcError) {
        throw rpcError
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Deposit approval failed.')
      }

      setMessage(
        `Deposit approved successfully. KES ${Number(
          data.total_credit || data.amount || 0
        ).toFixed(2)} has been credited.`
      )

      await loadDeposits()
    } catch (err) {
      setError(err.message || 'Failed to approve deposit.')
    } finally {
      setProcessingId(null)
    }
  }

  const rejectDeposit = async (depositId) => {
    const reason = window.prompt(
      'Enter the reason for rejecting this deposit:',
      'Payment could not be verified'
    )

    if (reason === null) return

    setProcessingId(depositId)
    setMessage('')
    setError('')

    try {
      const { data, error: rpcError } = await supabase.rpc(
        'reject_manual_deposit',
        {
          p_deposit_id: depositId,
          p_admin_note: reason.trim() || null,
        }
      )

      if (rpcError) {
        throw rpcError
      }

      if (!data?.success) {
        throw new Error(data?.message || 'Deposit rejection failed.')
      }

      setMessage('Manual deposit rejected successfully.')

      await loadDeposits()
    } catch (err) {
      setError(err.message || 'Failed to reject deposit.')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString()
  }

  const statusClass = (status) => {
    if (status === 'Confirmed') return 'status confirmed'
    if (status === 'Rejected') return 'status rejected'
    if (status === 'Cancelled') return 'status cancelled'
    return 'status pending'
  }

  return (
    <div className="admin-deposits-page">
      <div className="admin-deposits-header">
        <div>
          <h1>Manual Deposits</h1>
          <p>
            Review manual deposit requests and credit verified payments.
          </p>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={loadDeposits}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="deposit-filters">
        {['Pending', 'Confirmed', 'Rejected', 'Cancelled', 'All'].map(
          (item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'filter active' : 'filter'}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          )
        )}
      </div>

      {message && (
        <div className="admin-message success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="admin-message error-message">
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-state">
          Loading manual deposits...
        </div>
      ) : deposits.length === 0 ? (
        <div className="empty-state">
          <h3>No {filter.toLowerCase()} deposits</h3>
          <p>
            Manual deposit requests matching this filter will appear here.
          </p>
        </div>
      ) : (
        <div className="deposits-table-wrapper">
          <table className="deposits-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Transaction Code</th>
                <th>Status</th>
                <th>Proof</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {deposits.map((deposit) => (
                <tr key={deposit.id}>
                  <td>
                    <div className="date-cell">
                      <strong>{formatDate(deposit.created_at)}</strong>
                    </div>
                  </td>

                  <td>
                    <span className="user-id">
                      {deposit.user_id}
                    </span>
                  </td>

                  <td>
                    <strong className="amount">
                      KES {Number(deposit.amount || 0).toFixed(2)}
                    </strong>

                    {Number(deposit.bonus_amount || 0) > 0 && (
                      <small className="bonus">
                        + KES{' '}
                        {Number(deposit.bonus_amount).toFixed(2)} bonus
                      </small>
                    )}
                  </td>

                  <td>
                    <span>{deposit.method || 'Manual Deposit'}</span>
                  </td>

                  <td>
                    <span className="reference">
                      {deposit.reference || '-'}
                    </span>
                  </td>

                  <td>
                    <span className={statusClass(deposit.status)}>
                      {deposit.status}
                    </span>
                  </td>

                  <td>
                    {deposit.proof_url ? (
                      <a
                        href={deposit.proof_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="proof-link"
                      >
                        View Proof
                      </a>
                    ) : (
                      <span className="muted">No proof</span>
                    )}
                  </td>

                  <td>
                    {deposit.status === 'Pending' ? (
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="approve-button"
                          onClick={() => approveDeposit(deposit.id)}
                          disabled={processingId === deposit.id}
                        >
                          {processingId === deposit.id
                            ? 'Processing...'
                            : 'Approve'}
                        </button>

                        <button
                          type="button"
                          className="reject-button"
                          onClick={() => rejectDeposit(deposit.id)}
                          disabled={processingId === deposit.id}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="muted">
                        {deposit.admin_note || 'Processed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .admin-deposits-page {
          padding: 24px;
          color: #ffffff;
          min-height: 100%;
        }

        .admin-deposits-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .admin-deposits-header h1 {
          margin: 0 0 6px;
          font-size: 30px;
          font-weight: 900;
        }

        .admin-deposits-header p {
          margin: 0;
          color: #9ca3af;
        }

        .refresh-button {
          border: 0;
          border-radius: 10px;
          padding: 11px 18px;
          background: #ffffff;
          color: #000000;
          font-weight: 800;
          cursor: pointer;
        }

        .refresh-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .deposit-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 18px;
        }

        .filter {
          border: 1px solid #303030;
          background: #111111;
          color: #aaaaaa;
          padding: 9px 15px;
          border-radius: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .filter.active {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
        }

        .admin-message {
          padding: 13px 16px;
          border-radius: 10px;
          margin-bottom: 18px;
          font-weight: 700;
        }

        .success-message {
          background: rgba(34, 197, 94, 0.12);
          border: 1px solid rgba(34, 197, 94, 0.35);
          color: #86efac;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
        }

        .empty-state {
          padding: 60px 20px;
          text-align: center;
          border: 1px solid #252525;
          border-radius: 14px;
          background: #0d0d0d;
          color: #9ca3af;
        }

        .empty-state h3 {
          color: #ffffff;
          margin: 0 0 8px;
        }

        .empty-state p {
          margin: 0;
        }

        .deposits-table-wrapper {
          overflow-x: auto;
          border: 1px solid #252525;
          border-radius: 14px;
          background: #0d0d0d;
        }

        .deposits-table {
          width: 100%;
          min-width: 1100px;
          border-collapse: collapse;
        }

        .deposits-table th,
        .deposits-table td {
          padding: 14px;
          text-align: left;
          border-bottom: 1px solid #222222;
          vertical-align: middle;
        }

        .deposits-table th {
          color: #8f8f8f;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: #111111;
        }

        .deposits-table td {
          color: #dddddd;
        }

        .date-cell strong {
          font-size: 12px;
          font-weight: 600;
        }

        .user-id {
          display: inline-block;
          max-width: 120px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #a3a3a3;
          font-size: 11px;
        }

        .amount {
          display: block;
          color: #ffffff;
        }

        .bonus {
          display: block;
          color: #86efac;
          margin-top: 3px;
        }

        .reference {
          font-family: monospace;
          color: #ffffff;
        }

        .status {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
        }

        .status.pending {
          background: rgba(234, 179, 8, 0.14);
          color: #fde047;
        }

        .status.confirmed {
          background: rgba(34, 197, 94, 0.14);
          color: #86efac;
        }

        .status.rejected,
        .status.cancelled {
          background: rgba(239, 68, 68, 0.14);
          color: #fca5a5;
        }

        .proof-link {
          color: #ffffff;
          font-weight: 700;
          text-decoration: underline;
        }

        .muted {
          color: #666666;
          font-size: 12px;
        }

        .action-buttons {
          display: flex;
          gap: 7px;
        }

        .approve-button,
        .reject-button {
          border: 0;
          border-radius: 8px;
          padding: 8px 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .approve-button {
          background: #22c55e;
          color: #031208;
        }

        .reject-button {
          background: #ef4444;
          color: #ffffff;
        }

        .approve-button:disabled,
        .reject-button:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        @media (max-width: 700px) {
          .admin-deposits-page {
            padding: 14px;
          }

          .admin-deposits-header {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

