import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import './AdminTelegramStats.css'

export default function AdminTelegramStats() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    setLoading(true)
    setError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('telegram_bot_switch_notifications')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
        .limit(50)

      if (fetchError) throw fetchError

      setRows(data || [])
    } catch (err) {
      setError(
        err?.message || 'Unable to load Telegram statistics.'
      )
    } finally {
      setLoading(false)
    }
  }

  const totalSent = rows.reduce(
    (sum, row) => sum + Number(row.sent_count || 0),
    0
  )

  const totalOpened = rows.reduce(
    (sum, row) => sum + Number(row.opened_count || 0),
    0
  )

  const openRate =
    totalSent > 0
      ? ((totalOpened / totalSent) * 100).toFixed(1)
      : '0.0'

  return (
    <div className="admin-telegram-stats-page">
      <div className="admin-telegram-stats-card">
        <div className="admin-telegram-stats-header">
          <h1>Telegram Statistics</h1>
          <p>
            Track bot-switch notifications and user opens.
          </p>
        </div>

        {error && (
          <div className="admin-telegram-stats-error">
            {error}
          </div>
        )}

        <div className="admin-telegram-stats-summary">
          <div className="admin-telegram-stat">
            <span>TOTAL SENT</span>
            <strong>{totalSent}</strong>
          </div>

          <div className="admin-telegram-stat">
            <span>TOTAL OPENED</span>
            <strong>{totalOpened}</strong>
          </div>

          <div className="admin-telegram-stat">
            <span>OPEN RATE</span>
            <strong>{openRate}%</strong>
          </div>
        </div>

        <div className="admin-telegram-stats-section">
          <div className="admin-telegram-stats-section-title">
            BOT SWITCH HISTORY
          </div>

          {loading ? (
            <p>Loading statistics...</p>
          ) : rows.length === 0 ? (
            <p>No bot switch notifications yet.</p>
          ) : (
            <div className="admin-telegram-stats-table">
              <div className="admin-telegram-stats-row admin-telegram-stats-head">
                <span>DATE</span>
                <span>SWITCH</span>
                <span>SENT</span>
                <span>OPENED</span>
                <span>RATE</span>
              </div>

              {rows.map((row) => {
                const sent = Number(row.sent_count || 0)
                const opened = Number(row.opened_count || 0)

                const rate =
                  sent > 0
                    ? ((opened / sent) * 100).toFixed(1)
                    : '0.0'

                return (
                  <div
                    className="admin-telegram-stats-row"
                    key={row.id}
                  >
                    <span>
                      {new Date(
                        row.created_at
                      ).toLocaleString()}
                    </span>

                    <span>
                      Bot {row.from_bot_number || '?'}
                      {' -> '}
                      Bot {row.to_bot_number}
                    </span>

                    <span>{sent}</span>

                    <span>{opened}</span>

                    <span>{rate}%</span>
                  </div>
                )
              })}
            </div>
          )}

          <button
            type="button"
            className="admin-telegram-stats-refresh"
            onClick={loadStats}
          >
            REFRESH STATISTICS
          </button>
        </div>
      </div>
    </div>
  )
}
