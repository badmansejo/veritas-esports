import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminDeposits.css'

export default function AdminDeposits() {
  const [deposits, setDeposits] = useState([])
  const [users, setUsers] = useState({})
  const [filter, setFilter] = useState('Pending')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadDeposits()
  }, [])

  async function loadDeposits() {
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const rows = data || []
      setDeposits(rows)

      const userIds = [
        ...new Set(
          rows
            .map(row => row.user_id)
            .filter(Boolean)
        )
      ]

      if (userIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)

        if (!profileError && profileRows) {
          const userMap = {}

          profileRows.forEach(profile => {
            userMap[profile.id] = profile
          })

          setUsers(userMap)
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load manual deposits.')
    } finally {
      setLoading(false)
    }
  }

  function getUser(deposit) {
    return users[deposit.user_id] || null
  }

  function getUserCode(deposit) {
    const profile = getUser(deposit)

    return (
      deposit.user_code ||
      profile?.user_code ||
      '—'
    )
  }

  function getUsername(deposit) {
    const profile = getUser(deposit)

    return (
      profile?.username ||
      deposit.username ||
      'Unknown'
    )
  }

  function getDisplayAmount(deposit) {
    return Number(deposit.amount || 0).toFixed(2)
  }

  function getReference(deposit) {
    return (
      deposit.reference ||
      deposit.transaction_code ||
      deposit.transaction_reference ||
      '—'
    )
  }

  function getMethod(deposit) {
    return (
      deposit.method ||
      deposit.payment_method ||
      'Manual Deposit'
    )
  }

  function getProof(deposit) {
    return (
      deposit.proof_url ||
      deposit.proof_image_url ||
      deposit.screenshot_url ||
      deposit.payment_proof ||
      null
    )
  }

  function normaliseStatus(status) {
    return String(status || 'Pending').toLowerCase()
  }

  const filteredDeposits = useMemo(() => {
    if (filter === 'All') return deposits

    return deposits.filter(
      deposit =>
        normaliseStatus(deposit.status) ===
        filter.toLowerCase()
    )
  }, [deposits, filter])

  const counts = useMemo(() => {
    return {
      Pending: deposits.filter(
        d => normaliseStatus(d.status) === 'pending'
      ).length,

      Confirmed: deposits.filter(
        d =>
          normaliseStatus(d.status) === 'confirmed' ||
          normaliseStatus(d.status) === 'approved'
      ).length,

      Rejected: deposits.filter(
        d => normaliseStatus(d.status) === 'rejected'
      ).length,

      Cancelled: deposits.filter(
        d => normaliseStatus(d.status) === 'cancelled'
      ).length,

      All: deposits.length
    }
  }, [deposits])

  async function updateDepositStatus(deposit, newStatus) {
    if (!deposit?.id) return

    setProcessingId(deposit.id)
    setError('')
    setSuccess('')

    try {
      /*
       * Approval is handled by the database RPC when available.
       * This prevents the same deposit from being credited twice.
       */

      if (
        newStatus === 'Confirmed' ||
        newStatus === 'Approved'
      ) {
        const { data, error } = await supabase.rpc(
          'approve_manual_deposit',
          {
            p_deposit_id: deposit.id
          }
        )

        if (error) {
          /*
           * If the RPC does not exist yet, stop instead of
           * blindly updating the status and risking a duplicate credit.
           */
          throw new Error(
            `Approval function is not available: ${error.message}`
          )
        }

        setSuccess(
          data?.message ||
          `Deposit for ${getUsername(deposit)} approved successfully.`
        )
      } else {
        const { error } = await supabase
          .from('deposits')
          .update({
            status: newStatus
          })
          .eq('id', deposit.id)

        if (error) throw error

        setSuccess(
          `Deposit marked ${newStatus.toLowerCase()}.`
        )
      }

      await loadDeposits()
    } catch (err) {
      setError(err.message || 'Unable to update deposit.')
    } finally {
      setProcessingId(null)
    }
  }

  function formatDate(value) {
    if (!value) return '—'

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
      return String(value)
    }

    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  function statusClass(status) {
    const value = normaliseStatus(status)

    if (
      value === 'confirmed' ||
      value === 'approved'
    ) {
      return 'admin-deposit-status confirmed'
    }

    if (value === 'rejected') {
      return 'admin-deposit-status rejected'
    }

    if (value === 'cancelled') {
      return 'admin-deposit-status cancelled'
    }

    return 'admin-deposit-status pending'
  }

  return (
    <div className="admin-deposits-page">
      <div className="admin-deposits-header">
        <div>
          <span className="admin-deposits-eyebrow">
            WALLET
          </span>

          <h1>Manual Deposits</h1>

          <p>
            Review manual deposit requests and credit verified payments.
          </p>
        </div>

        <button
          className="admin-deposits-refresh"
          onClick={loadDeposits}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="admin-deposits-alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="admin-deposits-alert success">
          {success}
        </div>
      )}

      <div className="admin-deposits-tabs">
        {[
          'Pending',
          'Confirmed',
          'Rejected',
          'Cancelled',
          'All'
        ].map(tab => (
          <button
            key={tab}
            className={filter === tab ? 'active' : ''}
            onClick={() => setFilter(tab)}
          >
            {tab}

            <span>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      <div className="admin-deposits-table-wrap">
        <table className="admin-deposits-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User ID</th>
              <th>Username</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Transaction Code</th>
              <th>Status</th>
              <th>Proof</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {!loading && filteredDeposits.length === 0 && (
              <tr>
                <td
                  colSpan="9"
                  className="admin-deposits-empty"
                >
                  No {filter.toLowerCase()} deposits found.
                </td>
              </tr>
            )}

            {filteredDeposits.map(deposit => {
              const proof = getProof(deposit)
              const isProcessing =
                processingId === deposit.id

              return (
                <tr key={deposit.id}>
                  <td>
                    <strong>
                      {formatDate(
                        deposit.created_at ||
                        deposit.inserted_at
                      )}
                    </strong>
                  </td>

                  <td>
                    <span className="admin-deposits-user-code">
                      {getUserCode(deposit)}
                    </span>
                  </td>

                  <td>
                    <strong>
                      {getUsername(deposit)}
                    </strong>
                  </td>

                  <td>
                    <strong className="admin-deposits-amount">
                      KES {getDisplayAmount(deposit)}
                    </strong>
                  </td>

                  <td>
                    {getMethod(deposit)}
                  </td>

                  <td>
                    <span className="admin-deposits-reference">
                      {getReference(deposit)}
                    </span>
                  </td>

                  <td>
                    <span className={statusClass(deposit.status)}>
                      {deposit.status || 'Pending'}
                    </span>
                  </td>

                  <td>
                    {proof ? (
                      <a
                        href={proof}
                        target="_blank"
                        rel="noreferrer"
                        className="admin-deposits-proof"
                      >
                        View Proof
                      </a>
                    ) : (
                      <span className="admin-deposits-no-proof">
                        No proof
                      </span>
                    )}
                  </td>

                  <td>
                    <div className="admin-deposits-actions">
                      {normaliseStatus(deposit.status) === 'pending' && (
                        <>
                          <button
                            className="approve"
                            disabled={isProcessing}
                            onClick={() =>
                              updateDepositStatus(
                                deposit,
                                'Confirmed'
                              )
                            }
                          >
                            {isProcessing
                              ? 'Processing...'
                              : 'Approve'}
                          </button>

                          <button
                            className="reject"
                            disabled={isProcessing}
                            onClick={() =>
                              updateDepositStatus(
                                deposit,
                                'Rejected'
                              )
                            }
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {normaliseStatus(deposit.status) !== 'pending' && (
                        <span className="admin-deposits-dash">
                          —
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-deposits-mobile-list">
        {filteredDeposits.map(deposit => {
          const proof = getProof(deposit)
          const isProcessing =
            processingId === deposit.id

          return (
            <div
              className="admin-deposit-mobile-card"
              key={deposit.id}
            >
              <div className="admin-deposit-mobile-top">
                <div>
                  <span>USER ID</span>
                  <strong>
                    {getUserCode(deposit)}
                  </strong>
                </div>

                <span className={statusClass(deposit.status)}>
                  {deposit.status || 'Pending'}
                </span>
              </div>

              <div className="admin-deposit-mobile-user">
                {getUsername(deposit)}
              </div>

              <div className="admin-deposit-mobile-amount">
                KES {getDisplayAmount(deposit)}
              </div>

              <div className="admin-deposit-mobile-grid">
                <div>
                  <span>METHOD</span>
                  <strong>{getMethod(deposit)}</strong>
                </div>

                <div>
                  <span>TRANSACTION</span>
                  <strong>{getReference(deposit)}</strong>
                </div>

                <div>
                  <span>DATE</span>
                  <strong>
                    {formatDate(
                      deposit.created_at ||
                      deposit.inserted_at
                    )}
                  </strong>
                </div>

                <div>
                  <span>PROOF</span>
                  <strong>
                    {proof ? 'Available' : 'No proof'}
                  </strong>
                </div>
              </div>

              {proof && (
                <a
                  href={proof}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-deposits-mobile-proof"
                >
                  View Payment Proof
                </a>
              )}

              {normaliseStatus(deposit.status) === 'pending' && (
                <div className="admin-deposits-mobile-actions">
                  <button
                    className="approve"
                    disabled={isProcessing}
                    onClick={() =>
                      updateDepositStatus(
                        deposit,
                        'Confirmed'
                      )
                    }
                  >
                    {isProcessing
                      ? 'Processing...'
                      : 'Approve'}
                  </button>

                  <button
                    className="reject"
                    disabled={isProcessing}
                    onClick={() =>
                      updateDepositStatus(
                        deposit,
                        'Rejected'
                      )
                    }
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
