import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function DepositPanel({ user, onBalanceRefresh }) {
const [amount, setAmount] = useState('')
const [method, setMethod] = useState('Manual Deposit')
const [reference, setReference] = useState('')
const [deposits, setDeposits] = useState([])
const [loading, setLoading] = useState(false)
const [loadingHistory, setLoadingHistory] = useState(true)
const [message, setMessage] = useState('')
const [error, setError] = useState('')

useEffect(() => {
if (user?.id) {
loadDeposits()
}
}, [user?.id])

async function loadDeposits() {
if (!user?.id) return

```
setLoadingHistory(true)

try {
  const { data, error: depositsError } = await supabase
    .from('deposits')
    .select(
      'id, amount, method, reference, status, admin_note, created_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (depositsError) {
    throw depositsError
  }

  setDeposits(data || [])
} catch (loadError) {
  console.error('Deposit history error:', loadError)
  setError(
    loadError?.message ||
      'Unable to load your deposit history.'
  )
} finally {
  setLoadingHistory(false)
}
```

}

function createReference() {
const timestamp = Date.now().toString().slice(-8)

```
return (
  'VERITAS-' +
  timestamp +
  '-' +
  Math.random().toString(36).substring(2, 6).toUpperCase()
)
```

}

function formatAmount(value) {
const number = Number(value || 0)

```
return (
  'KES ' +
  number.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
)
```

}

function formatDate(value) {
if (!value) return '-'

```
const date = new Date(value)

if (Number.isNaN(date.getTime())) {
  return '-'
}

return date.toLocaleString('en-KE', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
```

}

function getStatusClass(status) {
const value = String(status || '').toLowerCase()

```
if (value === 'pending') {
  return 'pending'
}

if (
  value === 'confirmed' ||
  value === 'completed' ||
  value === 'paid' ||
  value === 'success'
) {
  return 'success'
}

if (
  value === 'rejected' ||
  value === 'failed' ||
  value === 'cancelled'
) {
  return 'failed'
}

return ''
```

}

function resetMessages() {
setError('')
setMessage('')
}

async function handleSubmit(event) {
event.preventDefault()

```
resetMessages()

const requestedAmount = Number(amount)

if (!requestedAmount || requestedAmount <= 0) {
  setError('Enter a valid deposit amount.')
  return
}

if (requestedAmount < 30) {
  setError('The minimum deposit is KES 30.')
  return
}

if (method === 'Paystack') {
  setError(
    'Paystack payment processing will be connected in the next wallet batch. Your money has not been charged.'
  )
  return
}

setLoading(true)

try {
  const generatedReference = createReference()

  const { data, error: insertError } = await supabase
    .from('deposits')
    .insert({
      user_id: user.id,
      amount: requestedAmount,
      method: method,
      reference: generatedReference,
      status: 'Pending',
    })
    .select(
      'id, amount, method, reference, status, admin_note, created_at'
    )
    .single()

  if (insertError) {
    throw insertError
  }

  setDeposits(function (current) {
    return [data].concat(current).slice(0, 10)
  })

  setReference(generatedReference)
  setAmount('')

  setMessage(
    'Deposit request created successfully. Your deposit is now Pending and will not be added to your KES balance until it is confirmed.'
  )

  if (typeof onBalanceRefresh === 'function') {
    await onBalanceRefresh()
  }
} catch (submitError) {
  console.error('Create deposit error:', submitError)

  setError(
    submitError?.message ||
      'Unable to create the deposit request. Please try again.'
  )
} finally {
  setLoading(false)
}
```

}

return ( <div className="wallet-deposit-panel"> <div className="wallet-section"> <h2>Deposit KES</h2>

```
    <p className="wallet-section-description">
      Add money to your VERITAS KES wallet. Deposits remain
      Pending until the payment is verified and confirmed.
    </p>

    {message && (
      <div className="wallet-message wallet-success">
        {message}
      </div>
    )}

    {error && (
      <div className="wallet-message wallet-error">
        {error}
      </div>
    )}

    <form onSubmit={handleSubmit}>
      <div className="wallet-form-group">
        <label htmlFor="wallet-deposit-amount">
          Deposit Amount
        </label>

        <input
          id="wallet-deposit-amount"
          type="number"
          min="30"
          step="1"
          value={amount}
          onChange={function (event) {
            setAmount(event.target.value)
            resetMessages()
          }}
          placeholder="Enter amount in KES"
          disabled={loading}
        />
      </div>

      <div className="wallet-form-group">
        <label>Payment Method</label>

        <div className="wallet-deposit-method-grid">
          <button
            type="button"
            className={
              method === 'Manual Deposit'
                ? 'wallet-deposit-method active'
                : 'wallet-deposit-method'
            }
            onClick={function () {
              setMethod('Manual Deposit')
              resetMessages()
            }}
            disabled={loading}
          >
            <span className="wallet-deposit-method-icon">
              📲
            </span>

            <strong>Manual Deposit</strong>

            <small>
              Pay using the VERITAS payment instructions.
            </small>
          </button>

          <button
            type="button"
            className={
              method === 'Paystack'
                ? 'wallet-deposit-method active'
                : 'wallet-deposit-method'
            }
            onClick={function () {
              setMethod('Paystack')
              resetMessages()
            }}
            disabled={loading}
          >
            <span className="wallet-deposit-method-icon">
              💳
            </span>

            <strong>Paystack</strong>

            <small>
              Secure online payment. Coming in the next batch.
            </small>
          </button>
        </div>
      </div>

      {method === 'Manual Deposit' && (
        <div className="wallet-notice">
          <strong>Manual Deposit</strong>
          <br />
          <br />
          After you submit this request, VERITAS will create a
          Pending deposit record. Payment instructions and QR
          options will be connected next.
          <br />
          <br />
          <strong>
            Do not send money to an unverified payment account.
          </strong>
        </div>
      )}

      {method === 'Paystack' && (
        <div className="wallet-notice">
          <strong>Paystack</strong>
          <br />
          <br />
          Paystack checkout will be connected in the next batch.
          Selecting this option does not charge your account.
        </div>
      )}

      <div className="wallet-modal-actions">
        <button
          type="submit"
          className="wallet-primary-button"
          disabled={loading}
        >
          {loading
            ? 'Creating Deposit...'
            : 'Create Deposit Request'}
        </button>
      </div>
    </form>

    {reference && (
      <div className="wallet-deposit-reference">
        <span>Latest Deposit Reference</span>
        <strong>{reference}</strong>
      </div>
    )}
  </div>

  <div className="wallet-section">
    <div className="wallet-section-heading">
      <div>
        <h2>Recent Deposits</h2>

        <p className="wallet-section-description">
          Your latest deposit requests and their current status.
        </p>
      </div>

      <button
        type="button"
        className="wallet-secondary-button"
        onClick={loadDeposits}
        disabled={loadingHistory}
      >
        {loadingHistory ? 'Loading...' : 'Refresh'}
      </button>
    </div>

    {loadingHistory ? (
      <div className="wallet-loading">
        Loading deposit history...
      </div>
    ) : deposits.length === 0 ? (
      <div className="wallet-empty">
        You have no deposit requests yet.
      </div>
    ) : (
      <div className="wallet-table-wrapper">
        <table className="wallet-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {deposits.map(function (deposit) {
              return (
                <tr key={deposit.id}>
                  <td>
                    {formatDate(deposit.created_at)}
                  </td>

                  <td>
                    {formatAmount(deposit.amount)}
                  </td>

                  <td>
                    {deposit.method || '-'}
                  </td>

                  <td>
                    <span className="wallet-reference">
                      {deposit.reference || '-'}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        'wallet-status ' +
                        getStatusClass(deposit.status)
                      }
                    >
                      {deposit.status || 'Pending'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
</div>
```

)
}
