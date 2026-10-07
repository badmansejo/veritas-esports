import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import './PayoutMethods.css'

function PayoutMethods() {
  const navigate = useNavigate()

  const [methodTypes, setMethodTypes] = useState([])
  const [savedMethods, setSavedMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [selectedType, setSelectedType] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [values, setValues] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError('')

    const [typesResult, methodsResult] =
      await Promise.all([
        supabase
          .from('payout_method_types')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', {
            ascending: true
          })
          .order('created_at', {
            ascending: true
          }),

        supabase
          .from('payout_methods')
          .select('*')
          .eq('is_active', true)
          .order('is_default', {
            ascending: false
          })
          .order('created_at', {
            ascending: true
          })
      ])

    if (typesResult.error) {
      setError(typesResult.error.message)
      setMethodTypes([])
    } else {
      setMethodTypes(typesResult.data || [])
    }

    if (methodsResult.error) {
      setError(methodsResult.error.message)
      setSavedMethods([])
    } else {
      setSavedMethods(methodsResult.data || [])
    }

    setLoading(false)
  }

  const selectedMethod = useMemo(
    () =>
      methodTypes.find(
        method =>
          method.method_code ===
          selectedType
      ) || null,
    [methodTypes, selectedType]
  )

  function getFields(method) {
    if (!method || !Array.isArray(method.fields)) {
      return []
    }

    return method.fields
      .filter(field => field && field.key)
      .map(field => ({
        key: field.key,
        label: field.label || field.key,
        type: field.type || 'text',
        required: field.required !== false
      }))
  }

  function startAdd(methodCode) {
    const method = methodTypes.find(
      item =>
        item.method_code === methodCode
    )

    if (!method) return

    const initialValues = {}

    getFields(method).forEach(field => {
      initialValues[field.key] = ''
    })

    setEditingId(null)
    setSelectedType(methodCode)
    setValues(initialValues)
    setError('')
    setMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  function startEdit(saved) {
    const method = methodTypes.find(
      item =>
        item.method_code ===
        saved.method_type
    )

    if (!method) {
      setError(
        'This payout method is no longer available.'
      )
      return
    }

    const nextValues = {}

    getFields(method).forEach(field => {
      if (field.key === 'account_name') {
        nextValues[field.key] =
          saved.account_name || ''
        return
      }

      if (
        field.key === 'account_identifier'
      ) {
        nextValues[field.key] =
          saved.account_identifier || ''
        return
      }

      nextValues[field.key] =
        saved.metadata?.[field.key] || ''
    })

    setEditingId(saved.id)
    setSelectedType(saved.method_type)
    setValues(nextValues)
    setError('')
    setMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  function cancelForm() {
    setEditingId(null)
    setSelectedType('')
    setValues({})
    setError('')
  }

  function handleTypeChange(methodCode) {
    const method = methodTypes.find(
      item =>
        item.method_code === methodCode
    )

    const nextValues = {}

    getFields(method).forEach(field => {
      nextValues[field.key] = ''
    })

    setSelectedType(methodCode)
    setEditingId(null)
    setValues(nextValues)
    setError('')
    setMessage('')
  }

  function updateValue(key, value) {
    setValues(prev => ({
      ...prev,
      [key]: value
    }))
  }

  function getAccountName(fields) {
    const accountNameField =
      fields.find(
        field =>
          field.key === 'account_name'
      )

    if (accountNameField) {
      return (
        values[accountNameField.key] ||
        ''
      ).trim()
    }

    const firstValueField =
      fields.find(
        field =>
          values[field.key]?.trim()
      )

    return firstValueField
      ? values[firstValueField.key].trim()
      : ''
  }

  function getAccountIdentifier(fields) {
    const identifierField =
      fields.find(
        field =>
          field.key ===
          'account_identifier'
      )

    if (identifierField) {
      return (
        values[identifierField.key] ||
        ''
      ).trim()
    }

    const preferredKeys = [
      'phone_number',
      'phone',
      'mobile_number',
      'account_number',
      'binance_id',
      'pay_id',
      'wallet_address',
      'number'
    ]

    for (const key of preferredKeys) {
      const field = fields.find(
        item => item.key === key
      )

      if (
        field &&
        values[field.key]?.trim()
      ) {
        return values[field.key].trim()
      }
    }

    const fallback = fields.find(
      field =>
        field.key !== 'account_name' &&
        values[field.key]?.trim()
    )

    return fallback
      ? values[fallback.key].trim()
      : ''
  }

  async function saveMethod(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (!selectedMethod) {
      setError(
        'Select a payout method first.'
      )
      return
    }

    const fields = getFields(selectedMethod)

    for (const field of fields) {
      if (
        field.required &&
        !String(values[field.key] || '').trim()
      ) {
        setError(
          `${field.label} is required.`
        )
        return
      }
    }

    const accountName =
      getAccountName(fields)

    const accountIdentifier =
      getAccountIdentifier(fields)

    if (!accountName) {
      setError(
        'Account name is required.'
      )
      return
    }

    if (!accountIdentifier) {
      setError(
        'A payout account identifier is required.'
      )
      return
    }

    const metadata = {}

    fields.forEach(field => {
      if (
        field.key !== 'account_name' &&
        field.key !==
          'account_identifier'
      ) {
        metadata[field.key] =
          String(values[field.key] || '').trim()
      }
    })

    setSaving(true)

    const { data, error } =
      await supabase.rpc(
        'save_user_payout_method',
        {
          p_method_type:
            selectedMethod.method_code,
          p_account_name:
            accountName,
          p_account_identifier:
            accountIdentifier,
          p_metadata: metadata,
          p_method_id: editingId
        }
      )

    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }

    if (!data?.success) {
      setError(
        'The payout method could not be saved.'
      )
      setSaving(false)
      return
    }

    setMessage(
      editingId
        ? 'Payout method updated successfully.'
        : 'Payout method saved successfully.'
    )

    setEditingId(null)
    setSelectedType('')
    setValues({})

    await loadData()

    setSaving(false)
  }

  async function deleteMethod(method) {
    const confirmed = window.confirm(
      `Remove ${getMethodName(
        method.method_type
      )} payout details?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    const { error } =
      await supabase.rpc(
        'delete_user_payout_method',
        {
          p_method_id: method.id
        }
      )

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      'Payout method removed successfully.'
    )

    if (editingId === method.id) {
      cancelForm()
    }

    await loadData()
  }

  function getMethodName(code) {
    const method = methodTypes.find(
      item => item.method_code === code
    )

    return method?.name || code
  }

  function getMethodFields(method) {
    if (!method) return []

    const fields = getFields(method)

    return fields.map(field => {
      let value = ''

      if (field.key === 'account_name') {
        value = method.savedAccountName || ''
      } else if (
        field.key === 'account_identifier'
      ) {
        value =
          method.savedAccountIdentifier || ''
      } else {
        value =
          method.savedMetadata?.[field.key] ||
          ''
      }

      return {
        ...field,
        value
      }
    })
  }

  return (
    <div className="wallet-payout-page">
      <div className="wallet-payout-header">
        <button
          type="button"
          className="back-button"
          onClick={() => navigate('/wallet')}
        >
          ← Wallet
        </button>

        <span className="wallet-payout-kicker">
          WALLET
        </span>

        <h1>Payout Methods</h1>

        <p>
          Add the account where you want VERITAS
          to send your withdrawal.
        </p>
      </div>

      {error && (
        <div className="wallet-payout-alert error">
          {error}
        </div>
      )}

      {message && (
        <div className="wallet-payout-alert success">
          {message}
        </div>
      )}

      {loading ? (
        <div className="wallet-payout-loading">
          Loading payout methods...
        </div>
      ) : (
        <>
          <section className="wallet-payout-card">
            <div className="wallet-payout-card-heading">
              <div>
                <span className="section-kicker">
                  AVAILABLE
                </span>

                <h2>
                  Choose Payout Provider
                </h2>

                <p>
                  Only methods currently enabled
                  by VERITAS are shown.
                </p>
              </div>
            </div>

            {methodTypes.length === 0 ? (
              <div className="wallet-payout-empty">
                No payout methods are currently
                available.
              </div>
            ) : (
              <div className="wallet-payout-provider-grid">
                {methodTypes.map(method => (
                  <button
                    type="button"
                    key={method.id}
                    className={`wallet-payout-provider ${
                      selectedType ===
                      method.method_code
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() =>
                      startAdd(
                        method.method_code
                      )
                    }
                  >
                    <span className="provider-icon">
                      {method.name
                        .charAt(0)
                        .toUpperCase()}
                    </span>

                    <span className="provider-content">
                      <strong>
                        {method.name}
                      </strong>

                      <small>
                        {method.description ||
                          'Payout method'}
                      </small>
                    </span>

                    <span className="provider-arrow">
                      →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          {selectedMethod && (
            <section className="wallet-payout-card payout-form-card">
              <div className="wallet-payout-card-heading">
                <div>
                  <span className="section-kicker">
                    {editingId
                      ? 'EDIT ACCOUNT'
                      : 'ADD ACCOUNT'}
                  </span>

                  <h2>
                    {selectedMethod.name}
                  </h2>

                  <p>
                    Enter the details exactly as
                    they should be used for your
                    payout.
                  </p>
                </div>

                <button
                  type="button"
                  className="form-cancel-button"
                  onClick={cancelForm}
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={saveMethod}>
                <div className="dynamic-fields">
                  {getFields(
                    selectedMethod
                  ).map(field => (
                    <div
                      className="wallet-payout-field"
                      key={field.key}
                    >
                      <label>
                        {field.label}

                        {field.required && (
                          <span className="required-star">
                            *
                          </span>
                        )}
                      </label>

                      <input
                        type={
                          field.type ===
                          'tel'
                            ? 'tel'
                            : field.type ===
                              'email'
                              ? 'email'
                              : field.type ===
                                'number'
                                ? 'number'
                                : 'text'
                        }
                        value={
                          values[field.key] ||
                          ''
                        }
                        onChange={event =>
                          updateValue(
                            field.key,
                            event.target
                              .value
                          )
                        }
                        placeholder={
                          field.label
                        }
                        required={
                          field.required
                        }
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="wallet-payout-save-button"
                  disabled={saving}
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Save Changes'
                      : 'Save Payout Method'}
                </button>
              </form>
            </section>
          )}

          <section className="wallet-payout-card">
            <div className="wallet-payout-card-heading">
              <div>
                <span className="section-kicker">
                  YOUR ACCOUNTS
                </span>

                <h2>
                  Saved Payout Methods
                </h2>

                <p>
                  These accounts can be selected
                  when you request a withdrawal.
                </p>
              </div>
            </div>

            {savedMethods.length === 0 ? (
              <div className="wallet-payout-empty">
                You have not added a payout
                account yet.
              </div>
            ) : (
              <div className="saved-payout-list">
                {savedMethods.map(method => {
                  const type =
                    methodTypes.find(
                      item =>
                        item.method_code ===
                        method.method_type
                    )

                  const displayMethod = {
                    ...type,
                    savedAccountName:
                      method.account_name,
                    savedAccountIdentifier:
                      method.account_identifier,
                    savedMetadata:
                      method.metadata || {}
                  }

                  const fields =
                    getMethodFields(
                      displayMethod
                    )

                  return (
                    <div
                      className="saved-payout-item"
                      key={method.id}
                    >
                      <div className="saved-payout-main">
                        <div className="saved-payout-icon">
                          {getMethodName(
                            method.method_type
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <div className="saved-payout-title">
                            <strong>
                              {getMethodName(
                                method.method_type
                              )}
                            </strong>

                            {method.is_default && (
                              <span className="default-pill">
                                DEFAULT
                              </span>
                            )}
                          </div>

                          <div className="saved-payout-fields">
                            {fields.map(
                              field => (
                                <div
                                  key={
                                    field.key
                                  }
                                >
                                  <span>
                                    {
                                      field.label
                                    }
                                  </span>

                                  <strong>
                                    {field.value ||
                                      '—'}
                                  </strong>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="saved-payout-actions">
                        <button
                          type="button"
                          onClick={() =>
                            startEdit(
                              method
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            deleteMethod(
                              method
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default PayoutMethods
