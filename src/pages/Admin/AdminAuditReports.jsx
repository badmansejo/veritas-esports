import React, { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import './AdminAuditReports.css'

const tabs = [
  { id: 'audit', label: 'Audit Log' },
  { id: 'exports', label: 'Exports / Reports' },
  { id: 'versions', label: 'Version History' },
]

const reports = [
  { key: 'profiles', label: 'Users', description: 'User profiles and account details.' },
  { key: 'wallet_transactions', label: 'Wallet Transactions', description: 'Wallet ledger records.' },
  { key: 'deposits', label: 'Deposits', description: 'Deposit requests and statuses.' },
  { key: 'withdrawals', label: 'Withdrawals', description: 'Withdrawal requests and statuses.' },
  { key: 'tournaments', label: 'Tournaments', description: 'Tournament records.' },
  { key: 'matches', label: 'Matches', description: 'Match records.' },
]

function downloadCsv(filename, rows) {
  if (!rows.length) {
    throw new Error('No records are available to export.')
  }

  const columns = [...new Set(rows.flatMap(row => Object.keys(row)))]
  const cell = value => {
    const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    return '"' + text.replace(/"/g, '""') + '"'
  }

  const csv = [
    columns.map(cell).join(','),
    ...rows.map(row => columns.map(column => cell(row[column])).join(',')),
  ].join('\r\n')

  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function AdminAuditReports() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialTab = new URLSearchParams(location.search).get('tab')
  const [tab, setTab] = useState(tabs.some(item => item.id === initialTab) ? initialTab : 'audit')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState('')

  const loadAudit = useCallback(async () => {
    setLoading(true)
    setError('')
    setMessage('')
    setRows([])

    const { data, error: queryError } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)

    if (queryError) {
      setError(
        queryError.code === '42P01' || queryError.code === 'PGRST205'
          ? 'The admin_audit_logs table is not configured yet. Audit history needs a database migration before it can be displayed.'
          : `Could not load audit history: ${queryError.message}`
      )
    } else {
      setRows(data || [])
      if (!data?.length) setMessage('No audit records were returned.')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'audit') loadAudit()
  }, [tab, loadAudit])

  async function exportReport(report) {
    setExporting(report.key)
    setError('')
    setMessage('')

    try {
      const { data, error: queryError } = await supabase
        .from(report.key)
        .select('*')
        .limit(5000)

      if (queryError) throw new Error(queryError.message)
      if (!data?.length) throw new Error(`No ${report.label.toLowerCase()} records are available to export.`)

      downloadCsv(`veritas-${report.key}-${new Date().toISOString().slice(0, 10)}.csv`, data)
      setMessage(`Exported ${data.length} ${report.label.toLowerCase()} records.`)
    } catch (err) {
      setError(`Export failed: ${err.message}`)
    } finally {
      setExporting('')
    }
  }

  function changeTab(nextTab) {
    setTab(nextTab)
    navigate(`/admin/audit-reports?tab=${nextTab}`, { replace: true })
  }

  return (
    <main className="admin-audit-page">
      <header className="admin-audit-header">
        <div>
          <span className="admin-audit-eyebrow">VERITAS CONTROL CENTER</span>
          <h1>Audit &amp; Reports</h1>
          <p>Review recorded administrator activity and export platform records.</p>
        </div>
        <button type="button" onClick={() => navigate('/admin')}>← Admin Dashboard</button>
      </header>

      <nav className="admin-audit-tabs" aria-label="Audit and reports sections">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'active' : ''}
            onClick={() => changeTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error && <p className="admin-audit-error" role="alert">{error}</p>}
      {message && <p className="admin-audit-message" role="status">{message}</p>}

      {tab === 'audit' && (
        <section className="admin-audit-card">
          <div className="admin-audit-card-heading">
            <div>
              <h2>Administrator Activity</h2>
              <p>Latest 500 recorded events. Records are never fabricated by this page.</p>
            </div>
            <button type="button" onClick={loadAudit} disabled={loading}>
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </div>

          {loading ? <p>Loading audit history…</p> : rows.length === 0 ? (
            <p className="admin-audit-empty">No audit records to display.</p>
          ) : (
            <div className="admin-audit-table-wrap">
              <table>
                <thead>
                  <tr>
                    {['Date', 'Administrator', 'Action', 'Details'].map(label => <th key={label}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id || index}>
                      <td>{row.created_at ? new Date(row.created_at).toLocaleString() : '—'}</td>
                      <td>{row.admin_id || row.user_id || row.actor_id || '—'}</td>
                      <td>{row.action || row.action_type || row.event_type || '—'}</td>
                      <td>{row.details ? JSON.stringify(row.details) : row.description || row.entity_type || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'exports' && (
        <section className="admin-audit-card">
          <h2>Export Platform Data</h2>
          <p>Download up to 5,000 rows per report as a CSV file.</p>
          <div className="admin-audit-report-list">
            {reports.map(report => (
              <article className="admin-audit-report" key={report.key}>
                <div>
                  <strong>{report.label}</strong>
                  <p>{report.description}</p>
                </div>
                <button type="button" disabled={!!exporting} onClick={() => exportReport(report)}>
                  {exporting === report.key ? 'Exporting…' : 'Export CSV'}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === 'versions' && (
        <section className="admin-audit-card">
          <h2>Version History</h2>
          <p className="admin-audit-empty">
            Version history is not connected yet. No versions can be previewed or restored until a version-history table and safe restore procedure are configured.
          </p>
        </section>
      )}
    </main>
  )
}
