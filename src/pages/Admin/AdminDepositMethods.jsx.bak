import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminDepositMethods.css'

const emptyForm = {
  name: '',
  method_code: '',
  description: '',
  sort_order: 0,
  is_active: true,
}

export default function AdminDepositMethods() {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)

  const loadMethods = async () => {
    setLoading(true)
    setError('')

    const { data, error: queryError } = await supabase
      .from('manual_deposit_methods')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (queryError) {
      console.error(queryError)
      setError(queryError.message)
      setMethods([])
    } else {
      setMethods(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadMethods()
  }, [])

  const resetForm = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const saveMethod = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!form.name.trim()) {
      setError('Enter a deposit method name.')
      return
    }

    if (!form.method_code.trim()) {
      setError('Enter a method code.')
      return
    }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      method_code: form.method_code.trim().toLowerCase().replace(/\s+/g, '_'),
      description: form.description.trim() || null,
      sort_order: Number(form.sort_order) || 0,
      is_active: Boolean(form.is_active),
    }

    let result

    if (editingId) {
      result = await supabase
        .from('manual_deposit_methods')
        .update(payload)
        .eq('id', editingId)
    } else {
      result = await supabase
        .from('manual_deposit_methods')
        .insert(payload)
    }

    if (result.error) {
      console.error(result.error)
      setError(result.error.message)
      setSaving(false)
      return
    }

    setSuccess(
      editingId
        ? 'Deposit method updated successfully.'
        : 'Deposit method added successfully.'
    )

    resetForm()
    await loadMethods()
    setSaving(false)
  }

  const editMethod = (method) => {
    setError('')
    setSuccess('')

    setEditingId(method.id)

    setForm({
      name: method.name || '',
      method_code: method.method_code || '',
      description: method.description || '',
      sort_order: method.sort_order || 0,
      is_active: method.is_active !== false,
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const toggleMethod = async (method) => {
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('manual_deposit_methods')
      .update({
        is_active: !method.is_active,
      })
      .eq('id', method.id)

    if (updateError) {
      console.error(updateError)
      setError(updateError.message)
      return
    }

    setSuccess(
      method.is_active
        ? `${method.name} disabled.`
        : `${method.name} enabled.`
    )

    await loadMethods()
  }

  const deleteMethod = async (method) => {
    const confirmed = window.confirm(
      `Delete "${method.name}"? This cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')

    const { error: deleteError } = await supabase
      .from('manual_deposit_methods')
      .delete()
      .eq('id', method.id)

    if (deleteError) {
      console.error(deleteError)
      setError(deleteError.message)
      return
    }

    setSuccess(`${method.name} deleted.`)

    if (editingId === method.id) {
      resetForm()
    }

    await loadMethods()
  }

  return (
    <div className="admin-deposit-methods-page">
      <div className="admin-deposit-methods-header">
        <div>
          <span className="admin-deposit-methods-eyebrow">
            ADMIN / WALLET
          </span>

          <h1>Deposit Methods</h1>

          <p>
            Create and manage the payment methods users can use
            for manual deposits.
          </p>
        </div>
      </div>

      {error ? (
        <div className="admin-deposit-methods-alert error">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="admin-deposit-methods-alert success">
          {success}
        </div>
      ) : null}

      <div className="admin-deposit-methods-grid">
        <section className="admin-deposit-methods-card">
          <div className="admin-deposit-methods-card-heading">
            <div>
              <h2>
                {editingId
                  ? 'Edit Deposit Method'
                  : 'Add Deposit Method'}
              </h2>

              <p>
                These methods appear automatically in the
                user's Deposit page.
              </p>
            </div>
          </div>

          <form onSubmit={saveMethod}>
            <div className="admin-deposit-methods-field">
              <label>Method Name</label>

              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. M-Pesa"
              />
            </div>

            <div className="admin-deposit-methods-field">
              <label>Method Code</label>

              <input
                type="text"
                value={form.method_code}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    method_code: event.target.value,
                  }))
                }
                placeholder="e.g. mpesa"
              />

              <small>
                Use a unique simple code such as mpesa,
                airtel_money or bank.
              </small>
            </div>

            <div className="admin-deposit-methods-field">
              <label>Description</label>

              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Short description shown to users."
                rows="4"
              />
            </div>

            <div className="admin-deposit-methods-two-column">
              <div className="admin-deposit-methods-field">
                <label>Sort Order</label>

                <input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      sort_order: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="admin-deposit-methods-toggle-field">
                <label>Active</label>

                <button
                  type="button"
                  className={
                    form.is_active
                      ? 'admin-deposit-toggle active'
                      : 'admin-deposit-toggle'
                  }
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      is_active: !current.is_active,
                    }))
                  }
                >
                  {form.is_active ? 'ACTIVE' : 'DISABLED'}
                </button>
              </div>
            </div>

            <div className="admin-deposit-methods-actions">
              <button
                type="submit"
                className="admin-deposit-primary-button"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Update Method'
                    : 'Add Method'}
              </button>

              {editingId ? (
                <button
                  type="button"
                  className="admin-deposit-secondary-button"
                  onClick={resetForm}
                  disabled={saving}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="admin-deposit-methods-card">
          <div className="admin-deposit-methods-card-heading">
            <div>
              <h2>Available Methods</h2>

              <p>
                Only active methods are shown to users.
              </p>
            </div>

            <span className="admin-deposit-count">
              {methods.length}
            </span>
          </div>

          {loading ? (
            <div className="admin-deposit-empty">
              Loading deposit methods...
            </div>
          ) : methods.length === 0 ? (
            <div className="admin-deposit-empty">
              No deposit methods have been added yet.
            </div>
          ) : (
            <div className="admin-deposit-method-list">
              {methods.map((method) => (
                <div
                  className="admin-deposit-method-item"
                  key={method.id}
                >
                  <div className="admin-deposit-method-main">
                    <div className="admin-deposit-method-title-row">
                      <h3>{method.name}</h3>

                      <span
                        className={
                          method.is_active
                            ? 'admin-deposit-status active'
                            : 'admin-deposit-status disabled'
                        }
                      >
                        {method.is_active
                          ? 'ACTIVE'
                          : 'DISABLED'}
                      </span>
                    </div>

                    <span className="admin-deposit-method-code">
                      {method.method_code}
                    </span>

                    {method.description ? (
                      <p>{method.description}</p>
                    ) : null}

                    <small>
                      Sort order: {method.sort_order ?? 0}
                    </small>
                  </div>

                  <div className="admin-deposit-method-actions">
                    <button
                      type="button"
                      onClick={() => editMethod(method)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleMethod(method)}
                    >
                      {method.is_active
                        ? 'Disable'
                        : 'Enable'}
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() => deleteMethod(method)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
