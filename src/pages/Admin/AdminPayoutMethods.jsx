import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminPayoutMethods.css'

const EMPTY_FORM = {
  name: '',
  method_code: '',
  description: '',
  is_active: true,
  sort_order: 1,
  fields: []
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'tel', label: 'Phone Number' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Number' }
]

function AdminPayoutMethods() {
  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    loadMethods()
  }, [])

  async function loadMethods() {
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('payout_method_types')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
      setMethods([])
    } else {
      setMethods(data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setEditingId(null)

    setForm({
      ...EMPTY_FORM,
      sort_order: methods.length + 1
    })

    setError('')
    setMessage('')
  }

  function editMethod(method) {
    setEditingId(method.id)

    setForm({
      name: method.name || '',
      method_code: method.method_code || '',
      description: method.description || '',
      is_active: method.is_active !== false,
      sort_order: method.sort_order || 1,
      fields: Array.isArray(method.fields)
        ? method.fields.map(field => ({
            key: field.key || '',
            label: field.label || '',
            type: field.type || 'text',
            required: field.required !== false
          }))
        : []
    })

    setError('')
    setMessage('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  function handleNameChange(value) {
    setForm(prev => ({
      ...prev,
      name: value,
      method_code: editingId
        ? prev.method_code
        : slugify(value)
    }))
  }

  function addField() {
    setForm(prev => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          key: `field_${prev.fields.length + 1}`,
          label: '',
          type: 'text',
          required: true
        }
      ]
    }))
  }

  function updateField(index, key, value) {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) =>
        i === index
          ? {
              ...field,
              [key]: value
            }
          : field
      )
    }))
  }

  function removeField(index) {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }))
  }

  function moveField(index, direction) {
    setForm(prev => {
      const fields = [...prev.fields]
      const newIndex = index + direction

      if (
        newIndex < 0 ||
        newIndex >= fields.length
      ) {
        return prev
      }

      const temp = fields[index]
      fields[index] = fields[newIndex]
      fields[newIndex] = temp

      return {
        ...prev,
        fields
      }
    })
  }

  async function saveMethod(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    const name = form.name.trim()
    const methodCode = form.method_code.trim().toLowerCase()
    const description = form.description.trim()

    if (!name) {
      setError('Method name is required.')
      return
    }

    if (!methodCode) {
      setError('Method code is required.')
      return
    }

    if (!/^[a-z0-9_]+$/.test(methodCode)) {
      setError(
        'Method code can only contain lowercase letters, numbers and underscores.'
      )
      return
    }

    const cleanedFields = form.fields.map(field => ({
      key: field.key.trim().toLowerCase().replace(/\s+/g, '_'),
      label: field.label.trim(),
      type: field.type || 'text',
      required: field.required !== false
    }))

    if (
      cleanedFields.some(
        field => !field.key || !field.label
      )
    ) {
      setError(
        'Every account field must have a key and label.'
      )
      return
    }

    const duplicateKeys = cleanedFields
      .map(field => field.key)
      .filter(
        (key, index, array) =>
          array.indexOf(key) !== index
      )

    if (duplicateKeys.length > 0) {
      setError(
        'Account field keys must be unique.'
      )
      return
    }

    setSaving(true)

    const payload = {
      name,
      method_code: methodCode,
      description: description || null,
      fields: cleanedFields,
      is_active: form.is_active,
      sort_order:
        Number(form.sort_order) || 1
    }

    let result

    if (editingId) {
      result = await supabase
        .from('payout_method_types')
        .update(payload)
        .eq('id', editingId)
    } else {
      result = await supabase
        .from('payout_method_types')
        .insert(payload)
    }

    if (result.error) {
      setError(result.error.message)
      setSaving(false)
      return
    }

    setMessage(
      editingId
        ? `${name} updated successfully.`
        : `${name} added successfully.`
    )

    setEditingId(null)

    setForm({
      ...EMPTY_FORM,
      sort_order: methods.length + 2
    })

    await loadMethods()

    setSaving(false)
  }

  async function toggleMethod(method) {
    setError('')
    setMessage('')

    const { error } = await supabase
      .from('payout_method_types')
      .update({
        is_active: !method.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', method.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      `${method.name} is now ${
        !method.is_active
          ? 'active'
          : 'disabled'
      }.`
    )

    await loadMethods()
  }

  async function deleteMethod(method) {
    const confirmed = window.confirm(
      `Delete "${method.name}" permanently?`
    )

    if (!confirmed) return

    setError('')
    setMessage('')

    const { error } = await supabase
      .from('payout_method_types')
      .delete()
      .eq('id', method.id)

    if (error) {
      setError(error.message)
      return
    }

    setMessage(
      `${method.name} deleted successfully.`
    )

    if (editingId === method.id) {
      resetForm()
    }

    await loadMethods()
  }

  return (
    <div className="admin-payout-page">
      <div className="admin-payout-header">
        <div>
          <span className="admin-payout-kicker">
            ADMIN PANEL · PAYOUTS
          </span>

          <h1>Payout Methods</h1>

          <p>
            Configure exactly which payout providers
            users can use when withdrawing KES.
          </p>
        </div>

        <button
          className="admin-payout-secondary-btn"
          onClick={resetForm}
          type="button"
        >
          + New Method
        </button>
      </div>

      {error && (
        <div className="admin-payout-alert error">
          {error}
        </div>
      )}

      {message && (
        <div className="admin-payout-alert success">
          {message}
        </div>
      )}

      <div className="admin-payout-grid">
        <section className="admin-payout-card editor-card">
          <div className="card-title-row">
            <div>
              <span className="editor-kicker">
                CONFIGURATION
              </span>

              <h2>
                {editingId
                  ? 'Edit Payout Method'
                  : 'Add Payout Method'}
              </h2>

              <p>
                Everything configured here controls
                what users see in Wallet → Payout
                Methods.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                className="small-cancel-btn"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>

          <form onSubmit={saveMethod}>
            <div className="form-row">
              <div className="form-group">
                <label>Method Name</label>

                <input
                  value={form.name}
                  onChange={event =>
                    handleNameChange(
                      event.target.value
                    )
                  }
                  placeholder="M-Pesa"
                />
              </div>

              <div className="form-group">
                <label>Method Code</label>

                <input
                  value={form.method_code}
                  onChange={event =>
                    setForm(prev => ({
                      ...prev,
                      method_code:
                        event.target.value
                          .toLowerCase()
                          .replace(
                            /[^a-z0-9_]/g,
                            '_'
                          )
                    }))
                  }
                  placeholder="mpesa"
                  disabled={!!editingId}
                />

                <small>
                  Permanent internal identifier.
                </small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Description</label>

                <input
                  value={form.description}
                  onChange={event =>
                    setForm(prev => ({
                      ...prev,
                      description:
                        event.target.value
                    }))
                  }
                  placeholder="Kenya M-Pesa payout"
                />
              </div>

              <div className="form-group">
                <label>Display Order</label>

                <input
                  type="number"
                  min="1"
                  value={form.sort_order}
                  onChange={event =>
                    setForm(prev => ({
                      ...prev,
                      sort_order:
                        event.target.value
                    }))
                  }
                />
              </div>
            </div>

            <div className="active-control">
              <label className="toggle-line">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={event =>
                    setForm(prev => ({
                      ...prev,
                      is_active:
                        event.target.checked
                    }))
                  }
                />

                <span className="toggle-ui"></span>

                <span>
                  <strong>
                    Method Active
                  </strong>

                  <small>
                    Users can select this payout
                    provider.
                  </small>
                </span>
              </label>
            </div>

            <div className="fields-section">
              <div className="fields-heading">
                <div>
                  <span className="editor-kicker">
                    USER DATA
                  </span>

                  <h3>
                    Account Fields
                  </h3>

                  <p>
                    Decide exactly what information
                    users must enter.
                  </p>
                </div>

                <button
                  type="button"
                  className="add-field-btn"
                  onClick={addField}
                >
                  + Add Field
                </button>
              </div>

              {form.fields.length === 0 && (
                <div className="empty-fields">
                  <strong>
                    No account fields configured
                  </strong>

                  <span>
                    Add fields such as Account Name,
                    Phone Number or Binance ID.
                  </span>
                </div>
              )}

              <div className="field-editor-list">
                {form.fields.map(
                  (field, index) => (
                    <div
                      className="field-editor"
                      key={`${field.key}-${index}`}
                    >
                      <div className="field-number">
                        {index + 1}
                      </div>

                      <div className="field-control">
                        <label>
                          Field Key
                        </label>

                        <input
                          value={field.key}
                          onChange={event =>
                            updateField(
                              index,
                              'key',
                              event.target.value
                                .toLowerCase()
                                .replace(
                                  /[^a-z0-9_]/g,
                                  '_'
                                )
                            )
                          }
                          placeholder="phone_number"
                        />
                      </div>

                      <div className="field-control">
                        <label>
                          User Label
                        </label>

                        <input
                          value={field.label}
                          onChange={event =>
                            updateField(
                              index,
                              'label',
                              event.target.value
                            )
                          }
                          placeholder="Phone Number"
                        />
                      </div>

                      <div className="field-control">
                        <label>
                          Input Type
                        </label>

                        <select
                          value={
                            field.type ||
                            'text'
                          }
                          onChange={event =>
                            updateField(
                              index,
                              'type',
                              event.target.value
                            )
                          }
                        >
                          {FIELD_TYPES.map(
                            type => (
                              <option
                                key={
                                  type.value
                                }
                                value={
                                  type.value
                                }
                              >
                                {type.label}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <label className="required-control">
                        <input
                          type="checkbox"
                          checked={
                            field.required !==
                            false
                          }
                          onChange={event =>
                            updateField(
                              index,
                              'required',
                              event.target
                                .checked
                            )
                          }
                        />

                        <span>
                          Required
                        </span>
                      </label>

                      <div className="field-order-buttons">
                        <button
                          type="button"
                          onClick={() =>
                            moveField(
                              index,
                              -1
                            )
                          }
                          disabled={
                            index === 0
                          }
                          title="Move up"
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moveField(
                              index,
                              1
                            )
                          }
                          disabled={
                            index ===
                            form.fields
                              .length -
                              1
                          }
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>

                      <button
                        type="button"
                        className="remove-field-btn"
                        onClick={() =>
                          removeField(
                            index
                          )
                        }
                        title="Remove field"
                      >
                        ×
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>

            <button
              type="submit"
              className="admin-payout-save-btn"
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Save Changes'
                  : 'Add Payout Method'}
            </button>
          </form>
        </section>

        <section className="admin-payout-card methods-card">
          <div className="card-title-row">
            <div>
              <span className="editor-kicker">
                PAYOUT PROVIDERS
              </span>

              <h2>
                Available Methods
              </h2>

              <p>
                {methods.length} configured ·{' '}
                {
                  methods.filter(
                    method =>
                      method.is_active
                  ).length
                } active
              </p>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              Loading payout methods...
            </div>
          ) : methods.length === 0 ? (
            <div className="empty-state">
              <strong>
                No payout methods
              </strong>

              <span>
                Add your first payout provider.
              </span>
            </div>
          ) : (
            <div className="method-list">
              {methods.map(method => {
                const fields =
                  Array.isArray(
                    method.fields
                  )
                    ? method.fields
                    : []

                return (
                  <div
                    className={`method-item ${
                      !method.is_active
                        ? 'inactive'
                        : ''
                    }`}
                    key={method.id}
                  >
                    <div className="method-main">
                      <div className="method-icon">
                        {method.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="method-info">
                        <div className="method-name-row">
                          <h3>
                            {method.name}
                          </h3>

                          <span
                            className={`status-pill ${
                              method.is_active
                                ? 'active'
                                : 'inactive'
                            }`}
                          >
                            {method.is_active
                              ? 'ACTIVE'
                              : 'DISABLED'}
                          </span>
                        </div>

                        <p>
                          {method.description ||
                            'No description configured.'}
                        </p>

                        <div className="method-meta">
                          <span>
                            Code:{' '}
                            <strong>
                              {
                                method.method_code
                              }
                            </strong>
                          </span>

                          <span>
                            Order:{' '}
                            <strong>
                              {
                                method.sort_order
                              }
                            </strong>
                          </span>

                          <span>
                            Fields:{' '}
                            <strong>
                              {fields.length}
                            </strong>
                          </span>
                        </div>

                        {fields.length >
                          0 && (
                          <div className="method-field-preview">
                            {fields.map(
                              field => (
                                <span
                                  key={
                                    field.key
                                  }
                                >
                                  {
                                    field.label
                                  }
                                  {field.required
                                    ? ' *'
                                    : ''}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="method-actions">
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={() =>
                          editMethod(
                            method
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className={
                          method.is_active
                            ? 'disable-btn'
                            : 'enable-btn'
                        }
                        onClick={() =>
                          toggleMethod(
                            method
                          )
                        }
                      >
                        {method.is_active
                          ? 'Disable'
                          : 'Enable'}
                      </button>

                      <button
                        type="button"
                        className="delete-btn"
                        onClick={() =>
                          deleteMethod(
                            method
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default AdminPayoutMethods
