import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'

const DEFAULT_AMOUNTS = '50, 100, 200, 300, 500, 1000'

function AdminDepositMethods() {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()

  const [methods, setMethods] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState({
    name: '',
    account_details: '',
    instructions: '',
    qr_code_url: '',
    available_amounts: DEFAULT_AMOUNTS,
    is_active: true,
    sort_order: 0,
  })

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true })
      return
    }

    if (isAdmin === false) {
      navigate('/', { replace: true })
      return
    }

    if (isAdmin === true) {
      loadMethods()
    }
  }, [user, isAdmin])

  async function loadMethods() {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('manual_deposit_methods')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (loadError) {
      console.error(loadError)
      setError(loadError.message)
    } else {
      setMethods(data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setEditingId(null)

    setForm({
      name: '',
      account_details: '',
      instructions: '',
      qr_code_url: '',
      available_amounts: DEFAULT_AMOUNTS,
      is_active: true,
      sort_order: 0,
    })
  }

  function editMethod(method) {
    setError('')
    setSuccess('')

    setEditingId(method.id)

    setForm({
      name: method.name || '',
      account_details: method.account_details || '',
      instructions: method.instructions || '',
      qr_code_url: method.qr_code_url || '',
      available_amounts: Array.isArray(method.available_amounts)
        ? method.available_amounts.join(', ')
        : '',
      is_active: method.is_active !== false,
      sort_order: Number(method.sort_order || 0),
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function parseAmounts(value) {
    return value
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isFinite(item) && item > 0)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!form.name.trim()) {
      setError('Enter the payment method name.')
      return
    }

    const amounts = parseAmounts(form.available_amounts)

    if (amounts.length === 0) {
      setError('Enter at least one valid deposit amount.')
      return
    }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      account_details: form.account_details.trim() || null,
      instructions: form.instructions.trim() || null,
      qr_code_url: form.qr_code_url.trim() || null,
      available_amounts: amounts,
      is_active: Boolean(form.is_active),
      sort_order: Number(form.sort_order || 0),
      updated_at: new Date().toISOString(),
    }

    let result

    if (editingId) {
      result = await supabase
        .from('manual_deposit_methods')
        .update(payload)
        .eq('id', editingId)
        .select('*')
        .single()
    } else {
      result = await supabase
        .from('manual_deposit_methods')
        .insert(payload)
        .select('*')
        .single()
    }

    if (result.error) {
      console.error(result.error)
      setError(result.error.message)
    } else {
      setSuccess(
        editingId
          ? 'Payment method updated successfully.'
          : 'Payment method created successfully.'
      )

      resetForm()
      await loadMethods()
    }

    setSaving(false)
  }

  async function toggleMethod(method) {
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('manual_deposit_methods')
      .update({
        is_active: !method.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', method.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(
      method.is_active
        ? 'Payment method deactivated.'
        : 'Payment method activated.'
    )

    await loadMethods()
  }

  async function deleteMethod(method) {
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
      setError(deleteError.message)
      return
    }

    setSuccess('Payment method deleted.')
    await loadMethods()
  }

  if (!user || isAdmin !== true) {
    return null
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07080c',
        color: '#fff',
        padding: '32px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '28px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '3px',
                opacity: 0.5,
                marginBottom: '8px',
              }}
            >
              VERITAS ADMIN
            </div>

            <h1 style={{ margin: 0 }}>
              Manual Deposit Methods
            </h1>

            <p style={{ opacity: 0.6 }}>
              Configure the payment options users see when they choose
              Manual Deposit.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={buttonStyle('#151922')}
          >
            Back Home
          </button>
        </div>

        {error ? (
          <div style={alertStyle('#3b1515')}>
            {error}
          </div>
        ) : null}

        {success ? (
          <div style={alertStyle('#12351f')}>
            {success}
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          style={{
            background: '#0d1017',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '18px',
            padding: '24px',
            marginBottom: '30px',
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {editingId ? 'Edit Payment Method' : 'Add Payment Method'}
          </h2>

          <div style={gridStyle}>
            <Field
              label="Payment Method Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Absa Next"
            />

            <Field
              label="Account / Phone / Paybill Details"
              name="account_details"
              value={form.account_details}
              onChange={handleChange}
              placeholder="e.g. Account number or phone number"
            />

            <Field
              label="QR Code Image URL"
              name="qr_code_url"
              value={form.qr_code_url}
              onChange={handleChange}
              placeholder="https://..."
            />

            <Field
              label="Available Amounts"
              name="available_amounts"
              value={form.available_amounts}
              onChange={handleChange}
              placeholder="50, 100, 200, 300, 500, 1000"
            />

            <Field
              label="Sort Order"
              name="sort_order"
              type="number"
              value={form.sort_order}
              onChange={handleChange}
              placeholder="0"
            />
          </div>

          <label style={{ display: 'block', marginTop: '18px' }}>
            <span style={labelStyle}>
              Instructions
            </span>

            <textarea
              name="instructions"
              value={form.instructions}
              onChange={handleChange}
              rows="5"
              placeholder="Tell the user exactly how to make the payment."
              style={inputStyle}
            />
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginTop: '18px',
            }}
          >
            <input
              type="checkbox"
              name="is_active"
              checked={form.is_active}
              onChange={handleChange}
            />

            <span>
              Active — users can see and select this method
            </span>
          </label>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '24px',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={buttonStyle('#d7ff2f', '#000')}
            >
              {saving
                ? 'Saving...'
                : editingId
                  ? 'Save Changes'
                  : 'Add Payment Method'}
            </button>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                style={buttonStyle('#151922')}
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <section>
          <h2>Configured Payment Methods</h2>

          {loading ? (
            <div style={emptyStyle}>
              Loading payment methods...
            </div>
          ) : methods.length === 0 ? (
            <div style={emptyStyle}>
              No manual payment methods configured yet.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: '16px',
              }}
            >
              {methods.map((method) => (
                <div
                  key={method.id}
                  style={{
                    background: '#0d1017',
                    border: '1px solid rgba(255,255,255,.08)',
                    borderRadius: '18px',
                    padding: '20px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0 }}>
                        {method.name}
                      </h3>

                      <div
                        style={{
                          marginTop: '8px',
                          opacity: 0.65,
                        }}
                      >
                        {method.account_details ||
                          'No account details configured'}
                      </div>
                    </div>

                    <span
                      style={{
                        padding: '6px 10px',
                        borderRadius: '999px',
                        background: method.is_active
                          ? '#153c22'
                          : '#3a1717',
                        color: method.is_active
                          ? '#7dff9b'
                          : '#ff8585',
                        fontSize: '11px',
                        fontWeight: 800,
                      }}
                    >
                      {method.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  {method.instructions ? (
                    <p
                      style={{
                        whiteSpace: 'pre-wrap',
                        opacity: 0.75,
                        lineHeight: 1.6,
                      }}
                    >
                      {method.instructions}
                    </p>
                  ) : null}

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap',
                      marginTop: '12px',
                    }}
                  >
                    {(Array.isArray(method.available_amounts)
                      ? method.available_amounts
                      : []
                    ).map((amount) => (
                      <span
                        key={amount}
                        style={{
                          padding: '7px 10px',
                          background: '#171b24',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      >
                        KES {amount}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      flexWrap: 'wrap',
                      marginTop: '18px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => editMethod(method)}
                      style={buttonStyle('#151922')}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleMethod(method)}
                      style={buttonStyle('#151922')}
                    >
                      {method.is_active ? 'Deactivate' : 'Activate'}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteMethod(method)}
                      style={buttonStyle('#421919')}
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

function Field({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
}) {
  return (
    <label>
      <span style={labelStyle}>
        {label}
      </span>

      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 800,
  opacity: 0.65,
  marginBottom: '8px',
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#080a0f',
  border: '1px solid rgba(255,255,255,.1)',
  color: '#fff',
  borderRadius: '10px',
  padding: '12px',
  outline: 'none',
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '16px',
}

const buttonStyle = (background, color = '#fff') => ({
  border: 'none',
  borderRadius: '10px',
  padding: '11px 16px',
  background,
  color,
  fontWeight: 800,
  cursor: 'pointer',
})

const alertStyle = (background) => ({
  background,
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: '12px',
  padding: '14px 16px',
  marginBottom: '18px',
})

const emptyStyle = {
  background: '#0d1017',
  border: '1px solid rgba(255,255,255,.08)',
  borderRadius: '16px',
  padding: '24px',
  opacity: 0.7,
}

export default AdminDepositMethods

