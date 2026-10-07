import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function AdminTelegramStatsButton() {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate('/admin/telegram/stats')}
      style={{
        marginTop: '12px',
        padding: '18px',
        border: '1px solid #273244',
        borderRadius: '12px',
        background: '#0d1421',
        cursor: 'pointer',
        color: '#ffffff'
      }}
    >
      <strong>Telegram Statistics</strong>

      <p
        style={{
          color: '#9ca3af',
          margin: '6px 0 0'
        }}
      >
        View sent notifications, opened users and open rate.
      </p>
    </div>
  )
}
