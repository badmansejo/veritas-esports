import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function AdminUsers() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [exporting, setExporting] = useState(false)

  async function loadUsers(showLoading = false) {
    if (showLoading) setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('profiles')
      .select('id, veritas_user_id, username, email, whatsapp_phone, kes_balance, vcoins, account_status, last_seen_at')
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(500)

    if (error) {
      setError(error.message)
    } else {
      setUsers(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadUsers(true)

    const interval = window.setInterval(() => {
      loadUsers(false)
    }, 30000)

    return () => window.clearInterval(interval)
  }, [])

  async function exportWhatsAppNumbers() {
    setExporting(true)
    setError('')

    try {
      const allUsers = []
      const pageSize = 1000
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('profiles')
          .select('veritas_user_id, username, email, whatsapp_phone')
          .not('whatsapp_phone', 'is', null)
          .order('username', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) throw error

        allUsers.push(...(data || []))

        if (!data || data.length < pageSize) break
        from += pageSize
      }

      if (allUsers.length === 0) {
        setError('No saved WhatsApp numbers were found to export.')
        return
      }

      const columns = ['VERITAS User ID', 'Username', 'Email', 'WhatsApp Number']
      const escapeCSV = value => {
        const text = String(value ?? '')
        return '"' + text.replace(/"/g, '""') + '"'
      }

      const csv = [
        columns.map(escapeCSV).join(','),
        ...allUsers.map(user => [
          user.veritas_user_id,
          user.username,
          user.email,
          user.whatsapp_phone,
        ].map(escapeCSV).join(','))
      ].join('\r\n')

      const blob = new Blob(['\uFEFF' + csv], {
        type: 'text/csv;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'veritas-whatsapp-numbers-' + new Date().toISOString().slice(0, 10) + '.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('WhatsApp export failed:', err)
      setError('Export failed: ' + (err?.message || 'Unable to retrieve WhatsApp numbers.'))
    } finally {
      setExporting(false)
    }
  }
  async function copyAllWhatsAppNumbers() {
    setError('')

    try {
      const allUsers = []
      const pageSize = 1000
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('profiles')
          .select('veritas_user_id, username, email, whatsapp_phone')
          .not('whatsapp_phone', 'is', null)
          .order('username', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) throw error

        allUsers.push(...(data || []))
        if (!data || data.length < pageSize) break
        from += pageSize
      }

      if (!allUsers.length) {
        setError('No saved WhatsApp numbers found.')
        return
      }

      const rows = [
        ['VERITAS User ID', 'Username', 'Email', 'WhatsApp Number'],
        ...allUsers.map(user => [
          user.veritas_user_id || '',
          user.username || '',
          user.email || '',
          user.whatsapp_phone || '',
        ]),
      ]

      const tableText = rows
        .map(row => row.map(value =>
          String(value).replace(/[\t\r\n]+/g, ' ')
        ).join('\t'))
        .join('\n')

      await navigator.clipboard.writeText(tableText)
      window.alert(`Copied ${allUsers.length} WhatsApp contacts. Paste into Excel or Google Sheets.`)
    } catch (err) {
      console.error('Copy contacts failed:', err)
      setError('Copy failed: ' + (err?.message || 'Unable to retrieve contacts.'))
    }
  }
  async function copyAllUserData() {
    setError('')

    try {
      const allUsers = []
      const pageSize = 1000
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('profiles')
          .select('veritas_user_id, username, email, whatsapp_phone, kes_balance, vcoins, account_status, last_seen_at')
          .order('username', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) throw error

        allUsers.push(...(data || []))
        if (!data || data.length < pageSize) break
        from += pageSize
      }

      if (!allUsers.length) {
        setError('No user records found to copy.')
        return
      }

      const columns = [
        'VERITAS User ID',
        'Username',
        'Email',
        'WhatsApp Number',
        'KES Balance',
        'V Coins',
        'Account Status',
        'Last Seen'
      ]

      const rows = [
        columns,
        ...allUsers.map(user => [
          user.veritas_user_id || '',
          user.username || '',
          user.email || '',
          user.whatsapp_phone || '',
          Number(user.kes_balance || 0),
          Number(user.vcoins || 0),
          user.account_status || '',
          user.last_seen_at || ''
        ])
      ]

      const tableText = rows
        .map(row => row.map(value =>
          String(value).replace(/[\t\r\n]+/g, ' ')
        ).join('\t'))
        .join('\n')

      await navigator.clipboard.writeText(tableText)
      window.alert(`Copied ${allUsers.length} user records. Paste into Excel or Google Sheets.`)
    } catch (err) {
      console.error('Copy all user data failed:', err)
      setError('Copy failed: ' + (err?.message || 'Unable to retrieve user data.'))
    }
  }
  async function copyBothTables() {
    setError('')

    try {
      const allUsers = []
      const pageSize = 1000
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('profiles')
          .select('veritas_user_id, username, email, whatsapp_phone, kes_balance, vcoins, account_status, last_seen_at')
          .order('username', { ascending: true })
          .range(from, from + pageSize - 1)

        if (error) throw error

        allUsers.push(...(data || []))
        if (!data || data.length < pageSize) break
        from += pageSize
      }

      const clean = value => String(value ?? '').replace(/[\t\r\n]+/g, ' ')

      const contacts = [
        ['WHATSAPP CONTACTS'],
        ['VERITAS User ID', 'Username', 'Email', 'WhatsApp Number'],
        ...allUsers
          .filter(user => user.whatsapp_phone)
          .map(user => [
            user.veritas_user_id,
            user.username,
            user.email,
            user.whatsapp_phone
          ])
      ]

      const userData = [
        ['ALL USER DATA'],
        ['VERITAS User ID', 'Username', 'Email', 'WhatsApp Number', 'KES Balance', 'V Coins', 'Account Status', 'Last Seen'],
        ...allUsers.map(user => [
          user.veritas_user_id,
          user.username,
          user.email,
          user.whatsapp_phone,
          user.kes_balance,
          user.vcoins,
          user.account_status,
          user.last_seen_at
        ])
      ]

      const tableText = [
        ...contacts.map(row => row.map(clean).join('\t')),
        '',
        ...userData.map(row => row.map(clean).join('\t'))
      ].join('\n')

      await navigator.clipboard.writeText(tableText)
      window.alert('Copied both tables: WhatsApp contacts and all user data. Paste into Excel or Google Sheets.')
    } catch (err) {
      console.error('Copy both tables failed:', err)
      setError('Copy failed: ' + (err?.message || 'Unable to copy both tables.'))
    }
  }
  async function copyPhone(user) {
    if (!user.whatsapp_phone) return

    try {
      await navigator.clipboard.writeText(user.whatsapp_phone)
      setCopiedId(user.id)
      window.setTimeout(() => setCopiedId(''), 2000)
    } catch (err) {
      console.error('WhatsApp copy failed:', err)
      setError('Could not copy the number. Check your browser clipboard permissions.')
    }
  }

  const filtered = users.filter(user => {
    const term = search.trim().toLowerCase()

    return !term || [
      user.username,
      user.email,
      user.veritas_user_id,
      user.whatsapp_phone,
    ].some(value => String(value || '').toLowerCase().includes(term))
  })

  const onlineCount = users.filter(user =>
    user.last_seen_at &&
    Date.now() - new Date(user.last_seen_at).getTime() < 2 * 60 * 1000
  ).length

  return (
    <main style={{
      minHeight: '100vh',
      background: '#080b12',
      color: '#f3f4f6',
      padding: 24,
      fontFamily: 'Arial, sans-serif',
    }}>
      <header style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
        alignItems: 'center',
      }}>
        <div>
          <div style={{ color: '#38bdf8', letterSpacing: 4, fontWeight: 900 }}>
            VERITAS ADMIN
          </div>
          <h1>Users & Activity</h1>
          <p style={{ color: '#9ca3af' }}>
            Registered accounts, wallet balances, WhatsApp contacts and activity.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'flex-end', maxWidth: 760 }}>
          <button
            onClick={exportWhatsAppNumbers}
            disabled={exporting}
            style={{
              ...buttonStyle,
              background: '#14532d',
              borderColor: '#166534',
              color: '#86efac',
              opacity: exporting ? 0.7 : 1,
            }}
          >
            {exporting ? 'Exporting...' : '↓ Export All WhatsApp Numbers'}
          </button>
                    <button
            onClick={copyAllWhatsAppNumbers}
            style={{
              ...buttonStyle,
              background: '#14532d',
              borderColor: '#166534',
              color: '#86efac',
            }}
          >
            Copy All WhatsApp Numbers
          </button>          <button
            onClick={copyBothTables}
            style={{ ...buttonStyle, background: '#1e3a8a', borderColor: '#2563eb', color: '#bfdbfe' }}
          >
            Copy Both Tables
          </button>
          <button onClick={() => loadUsers(true)} style={buttonStyle}>
            ↻ Refresh
          </button>
          <button onClick={() => navigate('/admin')} style={buttonStyle}>
            ← Dashboard
          </button>
        </div>
      </header>

      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
        gap: 12,
        margin: '24px 0',
      }}>
        <Stat label="Loaded Accounts" value={users.length} />
        <Stat label="Recently Active" value={onlineCount} />
        <Stat label="Matching Search" value={filtered.length} />
      </section>

      <input
        value={search}
        onChange={event => setSearch(event.target.value)}
        placeholder="Search username, email, User ID or WhatsApp number..."
        style={{
          boxSizing: 'border-box',
          width: '100%',
          padding: 14,
          marginBottom: 16,
          background: '#111722',
          border: '1px solid #293142',
          borderRadius: 10,
          color: 'white',
        }}
      />

      {error && (
        <p style={{ color: '#fca5a5' }}>Notice: {error}</p>
      )}

      {loading ? <p>Loading users...</p> : (
        <div style={{
          overflowX: 'auto',
          border: '1px solid #293142',
          borderRadius: 12,
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: 1150,
          }}>
            <thead>
              <tr>
                {[
                  'User ID',
                  'Username',
                  'Email',
                  'WhatsApp Number',
                  'KES Balance',
                  'V Coins',
                  'Account Status',
                  'Last Seen',
                ].map(label => (
                  <th key={label} style={cellStyle}>{label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map(user => {
                const recent = user.last_seen_at &&
                  Date.now() - new Date(user.last_seen_at).getTime() < 2 * 60 * 1000

                return (
                  <tr key={user.id}>
                    <td style={cellStyle}>{user.veritas_user_id || '—'}</td>
                    <td style={cellStyle}>{user.username || '—'}</td>
                    <td style={cellStyle}>{user.email || '—'}</td>

                    <td style={cellStyle}>
                      {user.whatsapp_phone ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'wrap',
                          minWidth: 280,
                          flexWrap: 'wrap',
                        }}>
                          <span style={{
                            color: '#86efac',
                            overflowWrap: 'anywhere',
                            marginRight: 4,
                          }}>
                            {user.whatsapp_phone}
                          </span>

                          <button
                            onClick={() => window.open(
                              'https://wa.me/' + String(user.whatsapp_phone).replace(/\D/g, '').replace(/^0/, '254'),
                              '_blank',
                              'noopener,noreferrer'
                            )}
                            style={{
                              ...buttonStyle,
                              background: '#14532d',
                              borderColor: '#166534',
                              color: '#86efac',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            WhatsApp Chat ↗
                          </button>

                          <button
                            onClick={() => copyPhone(user)}
                            style={{
                              ...buttonStyle,
                              background: copiedId === user.id ? '#14532d' : '#102a22',
                              borderColor: '#166534',
                              color: '#86efac',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {copiedId === user.id ? 'Copied ✓' : 'Copy'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#6b7280' }}>
                          Not provided
                        </span>
                      )}
                    </td>

                    <td style={cellStyle}>
                      {Number(user.kes_balance || 0).toLocaleString()}
                    </td>
                    <td style={cellStyle}>
                      {Number(user.vcoins || 0).toLocaleString()}
                    </td>
                    <td style={cellStyle}>{user.account_status || 'Unknown'}</td>

                    <td style={cellStyle}>
                      <span style={{ color: recent ? '#86efac' : '#9ca3af' }}>
                        {recent
                          ? '● Recently active'
                          : user.last_seen_at
                            ? new Date(user.last_seen_at).toLocaleString()
                            : 'Not tracked yet'}
                      </span>
                    </td>
                  </tr>
                )
              })}

              {!filtered.length && !loading && (
                <tr>
                  <td colSpan={8} style={cellStyle}>
                    No matching users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ color: '#9ca3af', fontSize: 12, marginTop: 14 }}>
        Recently active is based on last_seen_at. User data refreshes every 30 seconds.
        WhatsApp numbers appear when users add and save them in Settings → Account.
      </p>
    </main>
  )
}

function Stat({ label, value }) {
  return (
    <div style={{
      padding: 18,
      background: '#111722',
      border: '1px solid #293142',
      borderRadius: 12,
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: '#38bdf8' }}>
        {value}
      </div>
      <div style={{ color: '#9ca3af', fontSize: 12 }}>{label}</div>
    </div>
  )
}

const buttonStyle = {
  padding: '11px 14px',
  background: '#111827',
  color: '#fff',
  border: '1px solid #374151',
  borderRadius: 8,
  cursor: 'pointer',
}

const cellStyle = {
  padding: 12,
  borderBottom: '1px solid #293142',
  textAlign: 'left',
  fontSize: 13,
}











