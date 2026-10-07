import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminContactAgents.css'

export default function AdminContactAgents() {
  const [agents, setAgents] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [name, setName] = useState('')
  const [contactLink, setContactLink] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState('1')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    loadAgents()
  }, [])

  async function loadAgents() {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('contact_agents')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (loadError) {
      console.error('Contact agents load error:', loadError)
      setError(loadError.message || 'Unable to load contact agents.')
    } else {
      setAgents(data || [])
    }

    setLoading(false)
  }

  function clearForm() {
    setEditingId(null)
    setName('')
    setContactLink('')
    setDescription('')
    setSortOrder('1')
    setIsActive(true)
    setError('')
    setSuccess('')
  }

  function editAgent(agent) {
    setEditingId(agent.id)
    setName(agent.name || '')
    setContactLink(agent.contact_link || '')
    setDescription(agent.description || '')
    setSortOrder(String(agent.sort_order ?? 0))
    setIsActive(Boolean(agent.is_active))

    setError('')
    setSuccess('')

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  function normalizeContactLink(value) {
    const trimmed = value.trim()

    if (!trimmed) {
      return ''
    }

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://')
    ) {
      return trimmed
    }

    return `https://${trimmed}`
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const cleanName = name.trim()
    const cleanLink = normalizeContactLink(contactLink)
    const cleanDescription = description.trim()

    if (!cleanName) {
      setError('Agent name is required.')
      return
    }

    if (!cleanLink) {
      setError('Contact link is required.')
      return
    }

    const numericOrder = Number(sortOrder)

    if (
      Number.isNaN(numericOrder) ||
      numericOrder < 0
    ) {
      setError('Order must be a valid number.')
      return
    }

    setSaving(true)

    try {
      if (editingId) {
        const { error: updateError } = await supabase
          .from('contact_agents')
          .update({
            name: cleanName,
            contact_link: cleanLink,
            description: cleanDescription || null,
            sort_order: numericOrder,
            is_active: isActive,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingId)

        if (updateError) {
          throw updateError
        }

        setSuccess('Contact agent updated successfully.')
      } else {
        const { error: insertError } = await supabase
          .from('contact_agents')
          .insert({
            name: cleanName,
            contact_link: cleanLink,
            description: cleanDescription || null,
            sort_order: numericOrder,
            is_active: isActive
          })

        if (insertError) {
          throw insertError
        }

        setSuccess('Contact agent added successfully.')
      }

      clearForm()
      setSuccess(
        editingId
          ? 'Contact agent updated successfully.'
          : 'Contact agent added successfully.'
      )

      await loadAgents()
    } catch (saveError) {
      console.error('Contact agent save error:', saveError)

      setError(
        saveError?.message ||
          'Unable to save contact agent.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function toggleAgent(agent) {
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('contact_agents')
      .update({
        is_active: !agent.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', agent.id)

    if (updateError) {
      console.error('Contact agent toggle error:', updateError)

      setError(
        updateError.message ||
          'Unable to update contact agent.'
      )

      return
    }

    setSuccess(
      agent.is_active
        ? 'Contact agent disabled.'
        : 'Contact agent enabled.'
    )

    await loadAgents()
  }

  async function deleteAgent(agent) {
    const confirmed = window.confirm(
      `Delete contact agent "${agent.name}"?`
    )

    if (!confirmed) {
      return
    }

    setError('')
    setSuccess('')

    const { error: deleteError } = await supabase
      .from('contact_agents')
      .delete()
      .eq('id', agent.id)

    if (deleteError) {
      console.error('Contact agent delete error:', deleteError)

      setError(
        deleteError.message ||
          'Unable to delete contact agent.'
      )

      return
    }

    if (editingId === agent.id) {
      clearForm()
    }

    setSuccess('Contact agent deleted.')

    await loadAgents()
  }

  return (
    <div className="admin-contact-agents-page">

      <div className="admin-contact-agents-header">
        <div>
          <span className="admin-contact-agents-kicker">
            ADMIN CONTROL
          </span>

          <h1>Contact Agents</h1>

          <p>
            Manage the agents users can contact for support.
          </p>
        </div>
      </div>

      {error ? (
        <div className="admin-contact-agents-alert error">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="admin-contact-agents-alert success">
          {success}
        </div>
      ) : null}

      <section className="admin-contact-agents-card">

        <div className="admin-contact-agents-card-heading">
          <div>
            <span>
              {editingId ? 'EDIT AGENT' : 'ADD AGENT'}
            </span>

            <h2>
              {editingId
                ? 'Edit Contact Agent'
                : 'New Contact Agent'}
            </h2>
          </div>

          {editingId ? (
            <button
              type="button"
              className="admin-contact-agents-secondary"
              onClick={clearForm}
            >
              Cancel
            </button>
          ) : null}
        </div>

        <form
          className="admin-contact-agents-form"
          onSubmit={handleSubmit}
        >

          <label>
            <span>Agent Name</span>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="VERITAS Agent"
            />
          </label>

          <label>
            <span>Contact Link</span>

            <input
              type="text"
              value={contactLink}
              onChange={(event) =>
                setContactLink(event.target.value)
              }
              placeholder="t.me/L3G3ND"
            />

            <small>
              Telegram now. WhatsApp links can be added later.
            </small>
          </label>

          <label>
            <span>Description</span>

            <input
              type="text"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="VERITAS customer support"
            />
          </label>

          <label>
            <span>Display Order</span>

            <input
              type="number"
              min="0"
              value={sortOrder}
              onChange={(event) =>
                setSortOrder(event.target.value)
              }
            />
          </label>

          <label className="admin-contact-agents-toggle-row">
            <span>Active</span>

            <button
              type="button"
              className={
                isActive
                  ? 'admin-contact-agents-toggle active'
                  : 'admin-contact-agents-toggle'
              }
              onClick={() =>
                setIsActive((current) => !current)
              }
            >
              {isActive ? 'ACTIVE' : 'DISABLED'}
            </button>
          </label>

          <button
            type="submit"
            className="admin-contact-agents-save"
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : editingId
                ? 'Save Changes'
                : 'Add Contact Agent'}
          </button>

        </form>
      </section>

      <section className="admin-contact-agents-card">

        <div className="admin-contact-agents-card-heading">
          <div>
            <span>AGENTS</span>
            <h2>Contact Agents</h2>
          </div>

          <strong className="admin-contact-agents-count">
            {agents.length}
          </strong>
        </div>

        {loading ? (
          <div className="admin-contact-agents-empty">
            Loading contact agents...
          </div>
        ) : agents.length === 0 ? (
          <div className="admin-contact-agents-empty">
            No contact agents have been added yet.
          </div>
        ) : (
          <div className="admin-contact-agents-list">

            {agents.map((agent) => (
              <div
                className="admin-contact-agent-row"
                key={agent.id}
              >

                <div className="admin-contact-agent-main">

                  <div className="admin-contact-agent-icon">
                    ◉
                  </div>

                  <div>
                    <strong>
                      {agent.name}
                    </strong>

                    <small>
                      {agent.contact_link}
                    </small>

                    {agent.description ? (
                      <small>
                        {agent.description}
                      </small>
                    ) : null}
                  </div>

                </div>

                <div className="admin-contact-agent-meta">

                  <span
                    className={
                      agent.is_active
                        ? 'agent-status active'
                        : 'agent-status disabled'
                    }
                  >
                    {agent.is_active
                      ? 'ACTIVE'
                      : 'DISABLED'}
                  </span>

                  <span>
                    Order {agent.sort_order}
                  </span>

                </div>

                <div className="admin-contact-agent-actions">

                  <button
                    type="button"
                    onClick={() => editAgent(agent)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleAgent(agent)}
                  >
                    {agent.is_active
                      ? 'Disable'
                      : 'Enable'}
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() => deleteAgent(agent)}
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
  )
}

