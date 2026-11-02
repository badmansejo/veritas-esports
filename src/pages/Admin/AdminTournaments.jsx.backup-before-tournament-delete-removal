import React, { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function AdminTournaments() {
  const navigate = useNavigate()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const loadTournaments = useCallback(async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('tournaments')
      .select('id, name, tournament_code, status, created_at, is_archived')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(`Loading failed: ${error.message}`)
    } else {
      setTournaments(data || [])
      setMessage('')
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadTournaments()
  }, [loadTournaments])

  async function hasFinancialHistory(id) {
    const tables = [
      'tournament_payouts',
      'tournament_payout_batches',
      'tournament_payout_batch_items',
    ]

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .eq('tournament_id', id)
        .limit(1)

      if (error) throw new Error(`${table}: ${error.message}`)
      if (data?.length) return true
    }

    return false
  }

  async function archiveTournament(tournament) {
    if (!window.confirm(
      `Archive "${tournament.name}"? It will remain in the database for financial history.`
    )) return

    setBusyId(tournament.id)
    setMessage('Archiving tournament...')

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .update({ is_archived: true })
        .eq('id', tournament.id)
        .select('id')

      if (error) throw error
      if (!data?.length) {
        throw new Error('No row updated. Check admin permissions and RLS.')
      }

      setMessage(`"${tournament.name}" archived successfully.`)
      await loadTournaments()
    } catch (error) {
      setMessage(`Archive failed: ${error.message}`)
    } finally {
      setBusyId('')
    }
  }

  async function deleteTournament(tournament) {
    setBusyId(tournament.id)
    setMessage('Checking tournament records...')

    try {
      const financialHistory = await hasFinancialHistory(tournament.id)

      if (financialHistory) {
        const archive = window.confirm(
          `"${tournament.name}" has payout history.\n\nArchive it instead of permanently deleting it?`
        )

        if (archive) {
          await archiveTournament(tournament)
        } else {
          setMessage('Deletion cancelled. Financial history was preserved.')
        }
        return
      }

      if (!window.confirm(
        `Permanently delete "${tournament.name}"? This cannot be undone.`
      )) {
        setMessage('Deletion cancelled.')
        return
      }

      const { data, error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournament.id)
        .select('id')

      if (error) throw error

      if (!data?.length) {
        throw new Error('Nothing was deleted. Check admin DELETE permissions and RLS.')
      }

      setMessage(`"${tournament.name}" deleted successfully.`)
      await loadTournaments()
    } catch (error) {
      setMessage(
        `Could not delete tournament: ${error.message}. Archive it to preserve its history.`
      )
    } finally {
      setBusyId('')
    }
  }

  const filtered = tournaments.filter(t => {
    const query = search.toLowerCase()
    return `${t.name || ''} ${t.tournament_code || ''} ${t.status || ''}`
      .toLowerCase()
      .includes(query)
  })

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#080b12',
      color: '#f4f6fb',
      padding: '24px',
      fontFamily: 'Inter, Arial, sans-serif',
    },
    panel: {
      maxWidth: '1000px',
      margin: '0 auto',
      background: '#111722',
      border: '1px solid #283244',
      borderRadius: '16px',
      padding: '22px',
    },
    input: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '12px',
      margin: '14px 0',
      background: '#080d16',
      color: '#fff',
      border: '1px solid #344157',
      borderRadius: '9px',
    },
    card: {
      background: '#0b111c',
      border: '1px solid #273348',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '12px',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
    },
    button: {
      padding: '10px 14px',
      border: '1px solid #43516a',
      borderRadius: '8px',
      cursor: 'pointer',
      color: '#fff',
      background: '#26344b',
      fontWeight: 700,
    },
    deleteButton: {
      padding: '10px 14px',
      border: '1px solid #963b49',
      borderRadius: '8px',
      cursor: 'pointer',
      color: '#fff',
      background: '#702532',
      fontWeight: 700,
    },
  }

  return (
    <main style={styles.page}>
      <section style={styles.panel}>
        <h1>🏆 Tournament Management</h1>
        <p style={{ color: '#a9b5c9' }}>
          Search tournaments, archive records, or delete tournaments without payout history.
        </p>

        <button style={styles.button} onClick={loadTournaments} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>

        <input
          style={styles.input}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, tournament code, or status..."
        />

        {message && (
          <p role="status" style={{ color: '#f0c674', overflowWrap: 'anywhere' }}>
            {message}
          </p>
        )}

        {loading ? (
          <p>Loading tournaments...</p>
        ) : filtered.length === 0 ? (
          <p>No tournaments found.</p>
        ) : (
          filtered.map(tournament => (
            <article key={tournament.id} style={styles.card}>
              <div style={{ flex: '1 1 250px', minWidth: 0 }}>
                <h3 style={{ margin: '0 0 8px' }}>
                  {tournament.name || 'Untitled tournament'}
                </h3>
                <div style={{ color: '#a9b5c9', fontSize: '13px', lineHeight: 1.8 }}>
                  Code: {tournament.tournament_code || 'N/A'}<br />
                  Status: {tournament.status || 'N/A'}<br />
                  Created: {tournament.created_at
                    ? new Date(tournament.created_at).toLocaleString()
                    : 'N/A'}
                </div>
                {tournament.is_archived && (
                  <p style={{ color: '#f0c674', marginBottom: 0 }}>Archived</p>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {!tournament.is_archived && (
                  <button
                    style={styles.button}
                    disabled={busyId === tournament.id}
                    onClick={() => archiveTournament(tournament)}
                  >
                    Archive
                  </button>
                )}
                <button
                  style={styles.deleteButton}
                  disabled={busyId === tournament.id}
                  onClick={() => deleteTournament(tournament)}
                >
                  {busyId === tournament.id ? 'Working...' : 'Delete'}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  )
}

