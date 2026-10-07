import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import './AdminWithdrawals.css'

export default function AdminWithdrawals() {
  const [batches, setBatches] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [profiles, setProfiles] = useState([])
  const [payoutMethods, setPayoutMethods] = useState([])
  const [payoutTypes, setPayoutTypes] = useState([])

  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [processingWithdrawal, setProcessingWithdrawal] = useState(null)

  const [filter, setFilter] = useState('Pending')
  const [selectedBatch, setSelectedBatch] = useState(null)

  const [withdrawalFee, setWithdrawalFee] = useState('11')
  const [minimumWithdrawal, setMinimumWithdrawal] = useState('60')
  const [savingSettings, setSavingSettings] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadData() {
    setLoading(true)
    setError('')

    const [
      batchResult,
      withdrawalResult,
      profileResult,
      settingsResult,
      payoutResult,
      payoutMethodsResult,
    ] = await Promise.all([
      supabase
        .from('withdrawal_batches')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('withdrawals')
        .select('*')
        .order('requested_at', { ascending: false }),

      supabase
        .from('profiles')
        .select('id, veritas_user_id, username'),

      supabase
        .from('app_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'withdrawal_platform_fee_percent',
          'minimum_withdrawal',
        ]),

      supabase
        .from('payout_method_types')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),

      supabase
        .from('payout_methods')
        .select('*'),
    ])

    if (batchResult.error) {
      setError(batchResult.error.message)
      setLoading(false)
      return
    }

    if (withdrawalResult.error) {
      setError(withdrawalResult.error.message)
      setLoading(false)
      return
    }

    if (profileResult.error) {
      setError(profileResult.error.message)
      setLoading(false)
      return
    }

    if (settingsResult.error) {
      setError(settingsResult.error.message)
      setLoading(false)
      return
    }

    if (payoutResult.error) {
      setError(payoutResult.error.message)
      setLoading(false)
      return
    }

    if (payoutMethodsResult.error) {
      setError(payoutMethodsResult.error.message)
      setLoading(false)
      return
    }

    const settings = settingsResult.data || []

    const feeSetting = settings.find(
      (item) =>
        item.setting_key ===
        'withdrawal_platform_fee_percent'
    )

    const minimumSetting = settings.find(
      (item) =>
        item.setting_key ===
        'minimum_withdrawal'
    )

    function settingNumber(setting, fallback) {
      if (!setting) return fallback

      let value = setting.setting_value

      if (
        typeof value === 'object' &&
        value !== null
      ) {
        value =
          value.value ??
          value.percent ??
          value.default ??
          value
      }

      const number = Number(value)

      return Number.isFinite(number)
        ? number
        : fallback
    }

    setWithdrawalFee(
      String(
        settingNumber(
          feeSetting,
          11
        )
      )
    )

    setMinimumWithdrawal(
      String(
        settingNumber(
          minimumSetting,
          60
        )
      )
    )

    setBatches(batchResult.data || [])
    setWithdrawals(withdrawalResult.data || [])
    setProfiles(profileResult.data || [])
    setPayoutTypes(payoutResult.data || [])
    setPayoutMethods(
      payoutMethodsResult.data || []
    )

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const profileMap = useMemo(() => {
    const map = {}

    profiles.forEach((profile) => {
      map[profile.id] = profile
    })

    return map
  }, [profiles])

  const payoutMethodMap = useMemo(() => {
    const map = {}

    payoutMethods.forEach((method) => {
      map[method.id] = method
    })

    return map
  }, [payoutMethods])

  const payoutTypeMap = useMemo(() => {
    const map = {}

    payoutTypes.forEach((method) => {
      map[method.method_code] = method
    })

    return map
  }, [payoutTypes])

  const withdrawalMap = useMemo(() => {
    const map = {}

    withdrawals.forEach((withdrawal) => {
      if (!map[withdrawal.batch_id]) {
        map[withdrawal.batch_id] = []
      }

      map[withdrawal.batch_id].push(withdrawal)
    })

    return map
  }, [withdrawals])

  const filteredBatches = useMemo(() => {
    if (filter === 'All') return batches

    return batches.filter(
      (batch) => batch.status === filter
    )
  }, [batches, filter])

  const stats = useMemo(() => {
    const pending = batches.filter(
      (batch) =>
        batch.status === 'Pending'
    ).length

    const inProgress = batches.filter(
      (batch) =>
        batch.status ===
        'Disbursement in Progress'
    ).length

    const paid = batches.filter(
      (batch) =>
        batch.status === 'Paid'
    ).length

    const pendingWithdrawals =
      withdrawals.filter(
        (withdrawal) =>
          withdrawal.status ===
          'Pending'
      ).length

    const pendingAmount =
      withdrawals
        .filter(
          (withdrawal) =>
            withdrawal.status ===
            'Pending'
        )
        .reduce(
          (sum, withdrawal) =>
            sum +
            Number(
              withdrawal.requested_amount ||
              0
            ),
          0
        )

    return {
      pending,
      inProgress,
      paid,
      pendingWithdrawals,
      pendingAmount,
    }
  }, [batches, withdrawals])

  const activePayoutTypes = useMemo(() => {
    return payoutTypes.filter(
      (method) =>
        method.is_active === true
    )
  }, [payoutTypes])

  function money(value) {
    return `KES ${Number(
      value || 0
    ).toLocaleString('en-KE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  function dateTime(value) {
    if (!value) return '-'

    return new Date(value).toLocaleString(
      'en-KE',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    )
  }

  function getBatchWithdrawals(batchId) {
    return (
      withdrawalMap[batchId] || []
    )
  }

  function getBatchTotals(batchId) {
    const items =
      getBatchWithdrawals(batchId)

    return items.reduce(
      (totals, withdrawal) => {
        totals.requested += Number(
          withdrawal.requested_amount ||
            0
        )

        totals.fees += Number(
          withdrawal.fee_amount ||
            0
        )

        totals.net += Number(
          withdrawal.net_amount ||
            0
        )

        return totals
      },
      {
        requested: 0,
        fees: 0,
        net: 0,
      }
    )
  }

  function getPayoutDetails(
    withdrawal
  ) {
    const savedMethod =
      payoutMethodMap[
        withdrawal.payout_method_id
      ]

    const methodType =
      payoutTypeMap[
        savedMethod?.method_type
      ]

    const details =
      withdrawal.payout_details ||
      {}

    return {
      method:
        methodType?.name ||
        details.method_type ||
        details.method ||
        savedMethod?.method_type ||
        '-',

      accountName:
        details.account_name ||
        savedMethod?.account_name ||
        '-',

      account:
        details.account_identifier ||
        details.phone ||
        details.account_number ||
        savedMethod?.account_identifier ||
        '-',
    }
  }

  async function saveWithdrawalSettings(
    event
  ) {
    event.preventDefault()

    setSavingSettings(true)
    setMessage('')
    setError('')

    const fee = Number(
      withdrawalFee
    )

    const minimum = Number(
      minimumWithdrawal
    )

    if (
      !Number.isFinite(fee) ||
      fee < 0 ||
      fee > 100
    ) {
      setError(
        'Withdrawal fee must be between 0 and 100 percent.'
      )
      setSavingSettings(false)
      return
    }

    if (
      !Number.isFinite(minimum) ||
      minimum <= 0
    ) {
      setError(
        'Minimum withdrawal must be greater than zero.'
      )
      setSavingSettings(false)
      return
    }

    const {
      data,
      error: rpcError,
    } = await supabase.rpc(
      'admin_save_withdrawal_settings',
      {
        p_fee_percent: fee,
        p_minimum_withdrawal:
          minimum,
      }
    )

    if (rpcError) {
      setError(
        rpcError.message
      )
      setSavingSettings(false)
      return
    }

    if (!data?.success) {
      setError(
        'Withdrawal settings were not saved.'
      )
      setSavingSettings(false)
      return
    }

    setWithdrawalFee(
      String(data.fee_percent)
    )

    setMinimumWithdrawal(
      String(
        data.minimum_withdrawal
      )
    )

    setMessage(
      'Withdrawal settings saved successfully.'
    )

    setSavingSettings(false)

    await loadData()
  }

  async function startBatch(
    batchId
  ) {
    if (
      !window.confirm(
        'Start disbursement for this batch?'
      )
    ) {
      return
    }

    setProcessing(true)
    setMessage('')
    setError('')

    const {
      error: rpcError,
    } = await supabase.rpc(
      'start_withdrawal_batch',
      {
        p_batch_id: batchId,
      }
    )

    if (rpcError) {
      setError(
        rpcError.message
      )
      setProcessing(false)
      return
    }

    setMessage(
      'Disbursement started successfully.'
    )

    await loadData()
    setProcessing(false)
  }

  async function markBatchPaid(
    batchId
  ) {
    if (
      !window.confirm(
        'Mark this entire batch as PAID?'
      )
    ) {
      return
    }

    setProcessing(true)
    setMessage('')
    setError('')

    const {
      error: rpcError,
    } = await supabase.rpc(
      'mark_withdrawal_batch_paid',
      {
        p_batch_id: batchId,
      }
    )

    if (rpcError) {
      setError(
        rpcError.message
      )
      setProcessing(false)
      return
    }

    setMessage(
      'Batch marked as paid successfully.'
    )

    await loadData()
    setProcessing(false)
  }

  async function markWithdrawalPaid(
    withdrawal
  ) {
    if (
      withdrawal.status !==
      'Disbursement in Progress'
    ) {
      setError(
        'Start the batch disbursement before marking an individual payment as paid.'
      )
      return
    }

    const profile =
      profileMap[
        withdrawal.user_id
      ] || {}

    if (
      !window.confirm(
        `Mark ${profile.username || 'this user'}'s withdrawal of ${money(
          withdrawal.requested_amount
        )} as PAID?`
      )
    ) {
      return
    }

    setProcessingWithdrawal(
      withdrawal.id
    )
    setMessage('')
    setError('')

    const {
      error: rpcError,
    } = await supabase.rpc(
      'admin_mark_withdrawal_paid',
      {
        p_withdrawal_id:
          withdrawal.id,
      }
    )

    if (rpcError) {
      setError(
        rpcError.message
      )
      setProcessingWithdrawal(
        null
      )
      return
    }

    setMessage(
      `${profile.username || 'User'}'s withdrawal marked as paid.`
    )

    await loadData()

    setProcessingWithdrawal(
      null
    )
  }

  async function declineWithdrawal(
    withdrawal
  ) {
    if (
      withdrawal.status ===
        'Paid' ||
      withdrawal.status ===
        'Rejected' ||
      withdrawal.status ===
        'Cancelled'
    ) {
      return
    }

    const profile =
      profileMap[
        withdrawal.user_id
      ] || {}

    const confirmed =
      window.confirm(
        `DECLINE & RETURN\n\n` +
        `${profile.username || 'This user'}\n` +
        `Amount: ${money(
          withdrawal.requested_amount
        )}\n\n` +
        `The FULL requested amount will be returned to the user's KES balance.\n\n` +
        `Continue?`
      )

    if (!confirmed) {
      return
    }

    const note =
      window.prompt(
        'Optional reason for declining this withdrawal:',
        ''
      )

    setProcessingWithdrawal(
      withdrawal.id
    )
    setMessage('')
    setError('')

    const {
      error: rpcError,
    } = await supabase.rpc(
      'admin_decline_withdrawal',
      {
        p_withdrawal_id:
          withdrawal.id,
        p_admin_note:
          note?.trim() || null,
      }
    )

    if (rpcError) {
      setError(
        rpcError.message
      )
      setProcessingWithdrawal(
        null
      )
      return
    }

    setMessage(
      `${profile.username || 'User'}'s withdrawal was declined and the full amount was returned.`
    )

    await loadData()

    setProcessingWithdrawal(
      null
    )
  }

  function exportBatch(
    batch
  ) {
    const items =
      getBatchWithdrawals(
        batch.id
      )

    const rows = [
      [
        'Batch Code',
        'VERITAS User ID',
        'Username',
        'Requested Amount',
        'Fee %',
        'Fee Amount',
        'Net Payout',
        'Payout Method',
        'Account Name',
        'Account Identifier',
        'Status',
        'Requested At',
      ],
    ]

    items.forEach(
      (withdrawal) => {
        const profile =
          profileMap[
            withdrawal.user_id
          ] || {}

        const payout =
          getPayoutDetails(
            withdrawal
          )

        rows.push([
          batch.batch_code,
          profile.veritas_user_id ||
            '',
          profile.username ||
            '',
          withdrawal.requested_amount ||
            0,
          withdrawal.fee_percent ||
            0,
          withdrawal.fee_amount ||
            0,
          withdrawal.net_amount ||
            0,
          payout.method,
          payout.accountName,
          payout.account,
          withdrawal.status ||
            '',
          withdrawal.requested_at ||
            '',
        ])
      }
    )

    const csv =
      rows
        .map((row) =>
          row
            .map(
              (value) =>
                `"${String(
                  value
                ).replace(
                  /"/g,
                  '""'
                )}"`
            )
            .join(',')
        )
        .join('\n')

    const blob =
      new Blob(
        [csv],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      )

    const url =
      URL.createObjectURL(
        blob
      )

    const link =
      document.createElement(
        'a'
      )

    link.href = url

    link.download =
      `${batch.batch_code}-withdrawals.csv`

    link.click()

    URL.revokeObjectURL(
      url
    )
  }

  return (
    <div className="admin-withdrawals-page">

      <div className="admin-withdrawals-header">
        <div>
          <h1>
            Withdrawals
          </h1>

          <p>
            Manage withdrawal settings,
            payout methods and
            disbursement batches.
          </p>
        </div>
      </div>


      <section className="withdrawal-settings-card">

        <div className="withdrawal-section-heading">
          <div>
            <span className="withdrawal-eyebrow">
              SETTINGS
            </span>

            <h2>
              Withdrawal Settings
            </h2>

            <p>
              These settings are used
              when users request
              withdrawals.
            </p>
          </div>
        </div>

        <form
          className="withdrawal-settings-form"
          onSubmit={
            saveWithdrawalSettings
          }
        >

          <div className="withdrawal-form-group">

            <label htmlFor="withdrawal-fee">
              VERITAS Fee (%)
            </label>

            <input
              id="withdrawal-fee"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={
                withdrawalFee
              }
              onChange={(event) =>
                setWithdrawalFee(
                  event.target.value
                )
              }
            />

            <small>
              Example: 11 means
              VERITAS keeps 11% of
              the requested amount.
            </small>

          </div>


          <div className="withdrawal-form-group">

            <label htmlFor="minimum-withdrawal">
              Minimum Withdrawal
              (KES)
            </label>

            <input
              id="minimum-withdrawal"
              type="number"
              min="1"
              step="0.01"
              value={
                minimumWithdrawal
              }
              onChange={(event) =>
                setMinimumWithdrawal(
                  event.target.value
                )
              }
            />

            <small>
              Users cannot request
              below this amount.
            </small>

          </div>


          <button
            type="submit"
            className="withdrawal-save-settings"
            disabled={
              savingSettings
            }
          >
            {savingSettings
              ? 'Saving...'
              : 'Save Withdrawal Settings'}
          </button>

        </form>

      </section>


      <section className="withdrawal-payout-card">

        <div className="withdrawal-payout-header">

          <div>
            <span className="withdrawal-eyebrow">
              ACTIVE PAYOUT METHODS
            </span>

            <h2>
              {
                activePayoutTypes.length
              }
            </h2>

            <p>
              Activate or deactivate
              payout providers from
              Payout Methods.
            </p>
          </div>

          <Link
            to="/admin/payout-methods"
            className="withdrawal-manage-methods"
          >
            Manage Methods
          </Link>

        </div>


        <div className="withdrawal-payout-method-list">

          {activePayoutTypes.length === 0 ? (
            <div className="withdrawal-no-methods">
              No payout methods are
              currently active.
            </div>
          ) : (
            activePayoutTypes.map(
              (method) => (
                <div
                  className="withdrawal-payout-method"
                  key={method.id}
                >
                  <strong>
                    {method.name}
                  </strong>

                  <span>
                    {method.description ||
                      method.method_code}
                  </span>
                </div>
              )
            )
          )}

        </div>

      </section>


      <div className="withdrawal-summary-grid">

        <div className="withdrawal-summary-card">
          <span>
            Pending Batches
          </span>

          <strong>
            {stats.pending}
          </strong>
        </div>

        <div className="withdrawal-summary-card">
          <span>
            Disbursement
          </span>

          <strong>
            {stats.inProgress}
          </strong>
        </div>

        <div className="withdrawal-summary-card">
          <span>
            Paid Batches
          </span>

          <strong>
            {stats.paid}
          </strong>
        </div>

        <div className="withdrawal-summary-card">
          <span>
            Pending Withdrawals
          </span>

          <strong>
            {stats.pendingWithdrawals}
          </strong>
        </div>

        <div className="withdrawal-summary-card">
          <span>
            Pending Amount
          </span>

          <strong>
            {money(
              stats.pendingAmount
            )}
          </strong>
        </div>

      </div>


      {message && (
        <div className="withdrawal-success">
          {message}
        </div>
      )}


      {error && (
        <div className="withdrawal-error">
          {error}
        </div>
      )}


      <div className="withdrawal-filters">

        {[
          'Pending',
          'Disbursement in Progress',
          'Paid',
          'Rejected',
          'Cancelled',
          'All',
        ].map(
          (status) => (
            <button
              key={status}
              type="button"
              className={
                filter === status
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setFilter(status)
              }
            >
              {status}
            </button>
          )
        )}

      </div>


      {loading ? (
        <div className="withdrawal-empty">
          Loading withdrawals...
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="withdrawal-empty">
          No{' '}
          {filter === 'All'
            ? ''
            : filter.toLowerCase()}{' '}
          withdrawal batches.
        </div>
      ) : (
        <div className="withdrawal-batch-list">

          {filteredBatches.map(
            (batch) => {

              const items =
                getBatchWithdrawals(
                  batch.id
                )

              const totals =
                getBatchTotals(
                  batch.id
                )

              return (
                <div
                  className="withdrawal-batch-card"
                  key={batch.id}
                >

                  <div className="withdrawal-batch-top">

                    <div>
                      <div className="withdrawal-batch-code">
                        {batch.batch_code}
                      </div>

                      <div className="withdrawal-batch-date">
                        Created{' '}
                        {dateTime(
                          batch.created_at
                        )}
                      </div>
                    </div>

                    <span
                      className={`withdrawal-status withdrawal-status-${String(
                        batch.status
                      )
                        .toLowerCase()
                        .replace(
                          /\s+/g,
                          '-'
                        )}`}
                    >
                      {batch.status}
                    </span>

                  </div>


                  <div className="withdrawal-batch-stats">

                    <div>
                      <span>
                        Withdrawals
                      </span>

                      <strong>
                        {items.length}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Requested
                      </span>

                      <strong>
                        {money(
                          totals.requested
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Fees
                      </span>

                      <strong>
                        {money(
                          totals.fees
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Net Payout
                      </span>

                      <strong>
                        {money(
                          totals.net
                        )}
                      </strong>
                    </div>

                  </div>


                  <div className="withdrawal-batch-actions">

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedBatch(
                          selectedBatch ===
                            batch.id
                            ? null
                            : batch.id
                        )
                      }
                    >
                      {selectedBatch ===
                      batch.id
                        ? 'Hide Details'
                        : 'View Details'}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        exportBatch(
                          batch
                        )
                      }
                    >
                      Export CSV
                    </button>


                    {batch.status ===
                      'Pending' &&
                      items.some(
                        (item) =>
                          item.status ===
                          'Pending'
                      ) && (
                        <button
                          type="button"
                          className="withdrawal-primary-button"
                          disabled={
                            processing
                          }
                          onClick={() =>
                            startBatch(
                              batch.id
                            )
                          }
                        >
                          Start Disbursement
                        </button>
                      )}


                    {batch.status ===
                      'Disbursement in Progress' && (
                      <button
                        type="button"
                        className="withdrawal-paid-button"
                        disabled={
                          processing
                        }
                        onClick={() =>
                          markBatchPaid(
                            batch.id
                          )
                        }
                      >
                        Mark Batch as Paid
                      </button>
                    )}

                  </div>


                  {selectedBatch ===
                    batch.id && (
                    <div className="withdrawal-details">

                      {items.length === 0 ? (
                        <p>
                          No withdrawals
                          in this batch.
                        </p>
                      ) : (
                        items.map(
                          (withdrawal) => {

                            const profile =
                              profileMap[
                                withdrawal
                                  .user_id
                              ] || {}

                            const payout =
                              getPayoutDetails(
                                withdrawal
                              )

                            const isProcessing =
                              processingWithdrawal ===
                              withdrawal.id

                            const canPay =
                              withdrawal.status ===
                              'Disbursement in Progress'

                            const canDecline =
                              withdrawal.status !==
                                'Paid' &&
                              withdrawal.status !==
                                'Rejected' &&
                              withdrawal.status !==
                                'Cancelled'

                            return (
                              <div
                                className="withdrawal-detail-row"
                                key={
                                  withdrawal.id
                                }
                              >

                                <div className="withdrawal-user-info">

                                  <strong>
                                    {profile.username ||
                                      'Unknown User'}
                                  </strong>

                                  <span>
                                    ID:{' '}
                                    {profile.veritas_user_id ||
                                      '-'}
                                  </span>

                                </div>


                                <div>
                                  <span>
                                    Requested
                                  </span>

                                  <strong>
                                    {money(
                                      withdrawal.requested_amount
                                    )}
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Fee
                                  </span>

                                  <strong>
                                    {Number(
                                      withdrawal.fee_percent ||
                                        0
                                    )}
                                    % ·{' '}
                                    {money(
                                      withdrawal.fee_amount
                                    )}
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Net
                                  </span>

                                  <strong>
                                    {money(
                                      withdrawal.net_amount
                                    )}
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Method
                                  </span>

                                  <strong>
                                    {payout.method}
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Account Name
                                  </span>

                                  <strong>
                                    {
                                      payout.accountName
                                    }
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Account
                                  </span>

                                  <strong>
                                    {payout.account}
                                  </strong>
                                </div>


                                <div>
                                  <span>
                                    Status
                                  </span>

                                  <strong>
                                    {
                                      withdrawal.status
                                    }
                                  </strong>
                                </div>


                                <div
                                  style={{
                                    display:
                                      'flex',
                                    gap:
                                      '8px',
                                    alignItems:
                                      'center',
                                    flexWrap:
                                      'wrap',
                                    gridColumn:
                                      '1 / -1',
                                    marginTop:
                                      '8px',
                                  }}
                                >

                                  {canPay && (
                                    <button
                                      type="button"
                                      disabled={
                                        isProcessing
                                      }
                                      onClick={() =>
                                        markWithdrawalPaid(
                                          withdrawal
                                        )
                                      }
                                      style={{
                                        border:
                                          '1px solid rgba(70, 220, 130, 0.45)',
                                        background:
                                          'rgba(70, 220, 130, 0.12)',
                                        color:
                                          '#62e58c',
                                        padding:
                                          '9px 14px',
                                        borderRadius:
                                          '8px',
                                        fontWeight:
                                          700,
                                        cursor:
                                          isProcessing
                                            ? 'wait'
                                            : 'pointer',
                                      }}
                                    >
                                      {isProcessing
                                        ? 'Processing...'
                                        : '✓ Paid'}
                                    </button>
                                  )}


                                  {canDecline && (
                                    <button
                                      type="button"
                                      disabled={
                                        isProcessing
                                      }
                                      onClick={() =>
                                        declineWithdrawal(
                                          withdrawal
                                        )
                                      }
                                      style={{
                                        border:
                                          '1px solid rgba(255, 80, 100, 0.45)',
                                        background:
                                          'rgba(255, 80, 100, 0.12)',
                                        color:
                                          '#ff6678',
                                        padding:
                                          '9px 14px',
                                        borderRadius:
                                          '8px',
                                        fontWeight:
                                          700,
                                        cursor:
                                          isProcessing
                                            ? 'wait'
                                            : 'pointer',
                                      }}
                                    >
                                      {isProcessing
                                        ? 'Processing...'
                                        : '✕ Decline & Return'}
                                    </button>
                                  )}

                                </div>

                              </div>
                            )
                          }
                        )
                      )}

                    </div>
                  )}

                </div>
              )
            }
          )}

        </div>
      )}

    </div>
  )
}
