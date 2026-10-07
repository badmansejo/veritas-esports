import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import './AdminVCoins.css'

const emptyForm = {
  name: '',
  vcoins: '',
  price_kes: '',
  description: '',
  sort_order: 0,
  is_active: true,
}

export default function AdminVCoins() {
  const navigate = useNavigate()

  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [giving, setGiving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState(null)

  const [form, setForm] = useState(emptyForm)
  const [userId, setUserId] = useState('')
  const [giveAmount, setGiveAmount] = useState('')
  const [foundUser, setFoundUser] = useState(null)

  const loadPackages = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('vcoin_packages')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setPackages(data || [])

    setLoading(false)
  }

  useEffect(() => {
    loadPackages()
  }, [])

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const startAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setSuccess('')
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setForm({
      name: item.name || '',
      vcoins: item.vcoins ?? '',
      price_kes: item.price_kes ?? '',
      description: item.description || '',
      sort_order: item.sort_order ?? 0,
      is_active: item.is_active !== false,
    })
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(emptyForm)
  }

  const savePackage = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    const name = form.name.trim()
    const vcoins = Number(form.vcoins)
    const priceKes = Number(form.price_kes)
    const sortOrder = Number(form.sort_order || 0)

    if (!name) {
      setError('Enter a package name.')
      return
    }

    if (!Number.isInteger(vcoins) || vcoins <= 0) {
      setError('V Coins must be a whole number greater than 0.')
      return
    }

    if (!Number.isFinite(priceKes) || priceKes < 0) {
      setError('Enter a valid KES price.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        name,
        vcoins,
        price_kes: priceKes,
        bonus_vcoins: 0,
        description: form.description.trim() || null,
        sort_order: Number.isInteger(sortOrder) ? sortOrder : 0,
        is_active: Boolean(form.is_active),
        updated_at: new Date().toISOString(),
      }

      let result

      if (editingId) {
        result = await supabase
          .from('vcoin_packages')
          .update(payload)
          .eq('id', editingId)
      } else {
        result = await supabase
          .from('vcoin_packages')
          .insert(payload)
      }

      if (result.error) throw result.error

      setSuccess(
        editingId
          ? 'V Coin package updated successfully.'
          : 'V Coin package added successfully.'
      )

      setEditingId(null)
      setForm(emptyForm)

      await loadPackages()
    } catch (err) {
      setError(err?.message || 'Unable to save package.')
    } finally {
      setSaving(false)
    }
  }

  const togglePackage = async (item) => {
    setError('')
    setSuccess('')

    const { error } = await supabase
      .from('vcoin_packages')
      .update({
        is_active: !item.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.id)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(
      item.is_active
        ? `${item.name} deactivated.`
        : `${item.name} activated.`
    )

    await loadPackages()
  }

  const deletePackage = async (item) => {
    if (!window.confirm(`Delete "${item.name}" permanently?`)) return

    setError('')
    setSuccess('')

    const { error } = await supabase
      .from('vcoin_packages')
      .delete()
      .eq('id', item.id)

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(`${item.name} deleted.`)
    await loadPackages()
  }

  const findUser = async () => {
    setError('')
    setSuccess('')
    setFoundUser(null)

    const code = userId.trim()

    if (!code) {
      setError('Enter the VERITAS User ID.')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id, veritas_user_id, username, email, vcoins, kes_balance, account_status'
      )
      .eq('veritas_user_id', code)
      .maybeSingle()

    if (error) {
      setError(error.message)
      return
    }

    if (!data) {
      setError('User not found.')
      return
    }

    setFoundUser(data)
  }

  const giveVCoins = async () => {
    setError('')
    setSuccess('')

    if (!foundUser) {
      setError('Find a user first.')
      return
    }

    const amount = Number(giveAmount)

    if (!Number.isInteger(amount) || amount <= 0) {
      setError('Enter a valid V Coin amount.')
      return
    }

    if (
      !window.confirm(
        `Give ${amount} V Coins to ${foundUser.username}?`
      )
    ) {
      return
    }

    setGiving(true)

    try {
      const { data, error } = await supabase.rpc(
        'admin_give_vcoins',
        {
          p_user_id: foundUser.id,
          p_amount: amount,
        }
      )

      if (error) throw error

      if (!data?.success) {
        throw new Error('V Coin award failed.')
      }

      setFoundUser((current) => ({
        ...current,
        vcoins: data.vcoins_after,
      }))

      setGiveAmount('')

      setSuccess(
        `${amount} V Coins successfully given to ${foundUser.username}. Notification sent.`
      )
    } catch (err) {
      setError(err?.message || 'Unable to give V Coins.')
    } finally {
      setGiving(false)
    }
  }
  return (
    <div className="admin-vcoins-page">
      <header className="admin-vcoins-header">
        <button
          type="button"
          className="admin-vcoins-back"
          onClick={() => navigate('/admin')}
        >
          ← Admin Dashboard
        </button>

        <h1>V Coins Management</h1>
        <p>Manage packages and manually give V Coins to users.</p>
      </header>

      {error && (
        <div className="admin-vcoins-alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="admin-vcoins-alert success">
          {success}
        </div>
      )}

      <main className="admin-vcoins-content">
        <section className="admin-vcoins-card">
          <div className="admin-vcoins-section-heading">
            <div>
              <h2>
                {editingId ? 'Edit V Coin Package' : 'Add V Coin Package'}
              </h2>
              <p>Set the exact V Coin amount and KES price.</p>
            </div>

            {editingId && (
              <button
                type="button"
                className="admin-vcoins-secondary"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>

          <form
            className="admin-vcoins-form"
            onSubmit={savePackage}
          >
            <label>
              <span>Package Name</span>
              <input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="Starter"
              />
            </label>

            <label>
              <span>V Coins</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.vcoins}
                onChange={(e) => updateForm('vcoins', e.target.value)}
                placeholder="50"
              />
            </label>

            <label>
              <span>Price (KES)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price_kes}
                onChange={(e) =>
                  updateForm('price_kes', e.target.value)
                }
                placeholder="5"
              />
            </label>

            <label>
              <span>Display Order</span>
              <input
                type="number"
                step="1"
                value={form.sort_order}
                onChange={(e) =>
                  updateForm('sort_order', e.target.value)
                }
              />
            </label>

            <label className="admin-vcoins-full">
              <span>Description</span>
              <textarea
                rows="3"
                value={form.description}
                onChange={(e) =>
                  updateForm('description', e.target.value)
                }
              />
            </label>

            <label className="admin-vcoins-checkbox">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  updateForm('is_active', e.target.checked)
                }
              />
              <span>Package is active</span>
            </label>

            <div className="admin-vcoins-form-actions">
              <button
                type="submit"
                className="admin-vcoins-primary"
                disabled={saving}
              >
                {saving
                  ? 'Saving...'
                  : editingId
                    ? 'Save Changes'
                    : 'Add Package'}
              </button>
            </div>
          </form>
        </section>

        <section className="admin-vcoins-card">
          <div className="admin-vcoins-section-heading">
            <div>
              <h2>Give V Coins to User</h2>
              <p>
                Enter the user's VERITAS User ID and give any amount.
              </p>
            </div>
          </div>

          <div className="admin-vcoins-give-search">
            <label>
              <span>VERITAS User ID</span>
              <input
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter User ID"
              />
            </label>

            <button
              type="button"
              className="admin-vcoins-primary"
              onClick={findUser}
            >
              Find User
            </button>
          </div>

          {foundUser && (
            <div className="admin-vcoins-user-box">
              <div className="admin-vcoins-user-details">
                <div>
                  <span>Username</span>
                  <strong>{foundUser.username}</strong>
                </div>

                <div>
                  <span>VERITAS ID</span>
                  <strong>{foundUser.veritas_user_id}</strong>
                </div>

                <div>
                  <span>KES Balance</span>
                  <strong>
                    KES {Number(foundUser.kes_balance || 0).toLocaleString()}
                  </strong>
                </div>

                <div>
                  <span>Current V Coins</span>
                  <strong>
                    {Number(foundUser.vcoins || 0).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="admin-vcoins-give-row">
                <label>
                  <span>V Coins to Give</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={giveAmount}
                    onChange={(e) => setGiveAmount(e.target.value)}
                    placeholder="50"
                  />
                </label>

                <button
                  type="button"
                  className="admin-vcoins-give-button"
                  onClick={giveVCoins}
                  disabled={giving}
                >
                  {giving ? 'Giving...' : 'Give V Coins'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="admin-vcoins-card">
          <div className="admin-vcoins-section-heading">
            <div>
              <h2>V Coin Packages</h2>
              <p>Active packages appear on the V Coins page.</p>
            </div>

            <button
              type="button"
              className="admin-vcoins-secondary"
              onClick={startAdd}
            >
              + New Package
            </button>
          </div>

          {loading ? (
            <div className="admin-vcoins-empty">
              Loading packages...
            </div>
          ) : packages.length === 0 ? (
            <div className="admin-vcoins-empty">
              No V Coin packages found.
            </div>
          ) : (
            <div className="admin-vcoins-table-wrap">
              <table className="admin-vcoins-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Package</th>
                    <th>V Coins</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {packages.map((item) => (
                    <tr key={item.id}>
                      <td>{item.sort_order}</td>

                      <td>
                        <strong>{item.name}</strong>
                        {item.description && (
                          <small>{item.description}</small>
                        )}
                      </td>

                      <td>
                        {Number(item.vcoins || 0).toLocaleString()}
                      </td>

                      <td>
                        KES {Number(item.price_kes || 0).toLocaleString()}
                      </td>

                      <td>
                        <span
                          className={
                            item.is_active
                              ? 'admin-vcoins-status active'
                              : 'admin-vcoins-status inactive'
                          }
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td>
                        <div className="admin-vcoins-actions">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => togglePackage(item)}
                          >
                            {item.is_active
                              ? 'Deactivate'
                              : 'Activate'}
                          </button>

                          <button
                            type="button"
                            className="danger"
                            onClick={() => deletePackage(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

