import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import './PayoutMethods.css'

const METHOD_OPTIONS = [
  {
    value: 'M-Pesa',
    label: 'M-Pesa',
    placeholder: 'e.g. 0712345678'
  },
  {
    value: 'Airtel Money',
    label: 'Airtel Money',
    placeholder: 'e.g. 0734123456'
  },
  {
    value: 'Binance',
    label: 'Binance',
    placeholder: 'Enter Binance account / wallet identifier'
  },
  {
    value: 'Cash',
    label: 'Cash',
    placeholder: 'Enter account or identification details'
  },
  {
    value: 'Other',
    label: 'Other',
    placeholder: 'Enter payout account details'
  }
]

export default function PayoutMethods() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)

  const [methodType, setMethodType] = useState('M-Pesa')
  const [accountName, setAccountName] = useState('')
  const [accountIdentifier, setAccountIdentifier] = useState('')

  const profileId = profile?.id || user?.id || null

  const loadMethods = async () => {
    if (!profileId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('payout_methods')
      .select('*')
      .eq('user_id', profileId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error('Payout methods load error:', loadError)
      setError(loadError.message || 'Unable to load payout methods.')
      setMethods([])
    } else {
      setMethods(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadMethods()
  }, [profileId])

  const resetForm = () => {
    setEditingId(null)
    setMethodType('M-Pesa')
    setAccountName('')
    setAccountIdentifier('')
    setShowForm(false)
  }

  const openAdd = () => {
    setError('')
    setSuccess('')
    setEditingId(null)
    setMethodType('M-Pesa')
    setAccountName('')
    setAccountIdentifier('')
    setShowForm(true)
  }

  const openEdit = (method) => {
    setError('')
    setSuccess('')

    setEditingId(method.id)
    setMethodType(method.method_type || 'Other')
    setAccountName(method.account_name || '')
    setAccountIdentifier(method.account_identifier || '')
    setShowForm(true)
  }

  const handleSave = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!profileId) {
      setError('Your account session could not be found.')
      return
    }

    if (!accountName.trim()) {
      setError('Enter the account name.')
      return
    }

    if (!accountIdentifier.trim()) {
      setError('Enter the payout account or number.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        method_type: methodType,
        account_name: accountName.trim(),
        account_identifier: accountIdentifier.trim(),
        user_id: profileId,
        is_active: true
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('payout_methods')
          .update({
            method_type: payload.method_type,
            account_name: payload.account_name,
            account_identifier: payload.account_identifier
          })
          .eq('id', editingId)
          .eq('user_id', profileId)

        if (updateError) {
          throw updateError
        }

        setSuccess('Payout method updated successfully.')
      } else {
        const { error: insertError } = await supabase
          .from('payout_methods')
          .insert(payload)

        if (insertError) {
          throw insertError
        }

        setSuccess('Payout method added successfully.')
      }

      resetForm()
      await loadMethods()
    } catch (saveError) {
      console.error('Payout method save error:', saveError)

      setError(
        saveError?.message ||
          'Unable to save the payout method.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (method) => {
    if (!profileId || !method?.id) {
      return
    }

    const confirmed = window.confirm(
      `Remove ${method.method_type || 'this payout method'}?`
    )

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')

    const { error: removeError } = await supabase
      .from('payout_methods')
      .update({ is_active: false })
      .eq('id', method.id)
      .eq('user_id', profileId)

    if (removeError) {
      console.error('Payout method remove error:', removeError)
      setError(
        removeError.message ||
          'Unable to remove the payout method.'
      )
      return
    }

    setSuccess('Payout method removed.')
    await loadMethods()
  }

  const selectedOption =
    METHOD_OPTIONS.find(
      (option) => option.value === methodType
    ) || METHOD_OPTIONS[METHOD_OPTIONS.length - 1]

  return (
    <div className="payout-page">
      <div className="payout-container">

        <header className="payout-header">
          <div>
            <span className="payout-eyebrow">
              VERITAS WALLET
            </span>

            <h1>Payout Methods</h1>

            <p>
              Add the account where you want to receive
              your VERITAS withdrawals.
            </p>
          </div>

          <button
            type="button"
            className="payout-back-button"
            onClick={() => navigate('/wallet')}
          >
            Back to Wallet
          </button>
        </header>

        {error ? (
          <div className="payout-alert payout-alert-error">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="payout-alert payout-alert-success">
            {success}
          </div>
        ) : null}

        <section className="payout-panel">

          <div className="payout-panel-heading">
            <div>
              <h2>Your payout accounts</h2>
              <p>
                These accounts can be selected when you
                request a withdrawal.
              </p>
            </div>

            <button
              type="button"
              className="payout-primary-button"
              onClick={openAdd}
            >
              + Add Payout Method
            </button>
          </div>

          {loading ? (
            <div className="payout-empty">
              Loading payout methods...
            </div>
          ) : methods.length === 0 ? (
            <div className="payout-empty">
              <strong>No payout method saved</strong>

              <p>
                Add M-Pesa, Airtel Money, Binance or another
                supported payout account before requesting
                a withdrawal.
              </p>

              <button
                type="button"
                className="payout-primary-button"
                onClick={openAdd}
              >
                Add Your First Payout Method
              </button>
            </div>
          ) : (
            <div className="payout-method-list">
              {methods.map((method) => (
                <div
                  className="payout-method-card"
                  key={method.id}
                >
                  <div className="payout-method-main">
                    <span className="payout-method-type">
                      {method.method_type || 'Payout Method'}
                    </span>

                    <strong>
                      {method.account_name || 'Account holder'}
                    </strong>

                    <span className="payout-method-identifier">
                      {method.account_identifier || '-'}
                    </span>
                  </div>

                  <div className="payout-method-actions">
                    <button
                      type="button"
                      onClick={() => openEdit(method)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleRemove(method)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>

        {showForm ? (
          <div className="payout-modal-backdrop">
            <div className="payout-modal">

              <div className="payout-modal-header">
                <div>
                  <span className="payout-eyebrow">
                    VERITAS WALLET
                  </span>

                  <h2>
                    {editingId
                      ? 'Edit Payout Method'
                      : 'Add Payout Method'}
                  </h2>
                </div>

                <button
                  type="button"
                  className="payout-close-button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSave}>

                <label className="payout-field">
                  <span>Payout Method</span>

                  <select
                    value={methodType}
                    onChange={(event) =>
                      setMethodType(event.target.value)
                    }
                    disabled={saving}
                  >
                    {METHOD_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="payout-field">
                  <span>Account Name</span>

                  <input
                    type="text"
                    value={accountName}
                    onChange={(event) =>
                      setAccountName(event.target.value)
                    }
                    placeholder="Name registered on the account"
                    maxLength={120}
                    disabled={saving}
                    required
                  />
                </label>

                <label className="payout-field">
                  <span>
                    {methodType === 'M-Pesa' ||
                    methodType === 'Airtel Money'
                      ? 'Phone Number'
                      : 'Account / Wallet Details'}
                  </span>

                  <input
                    type="text"
                    value={accountIdentifier}
                    onChange={(event) =>
                      setAccountIdentifier(
                        event.target.value
                      )
                    }
                    placeholder={
                      selectedOption.placeholder
                    }
                    maxLength={200}
                    disabled={saving}
                    required
                  />
                </label>

                <div className="payout-modal-actions">
                  <button
                    type="button"
                    className="payout-secondary-button"
                    onClick={resetForm}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="payout-primary-button"
                    disabled={saving}
                  >
                    {saving
                      ? 'Saving...'
                      : editingId
                        ? 'Save Changes'
                        : 'Add Payout Method'}
                  </button>
                </div>

              </form>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  )
}
