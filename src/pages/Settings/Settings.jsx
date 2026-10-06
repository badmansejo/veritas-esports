import React from 'react'
import { useNavigate } from 'react-router-dom'
import './Settings.css'

export default function Settings() {
  const navigate = useNavigate()

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button
          className="settings-back"
          onClick={() => navigate('/')}
        >
          ←
        </button>

        <div>
          <h1>Settings</h1>
          <p>Manage your VERITAS account</p>
        </div>
      </div>

      <div className="settings-card">

        <button
          className="settings-row"
          onClick={() => navigate('/settings/account')}
        >
          <div className="settings-row-icon">👤</div>
          <div className="settings-row-content">
            <strong>Account</strong>
            <span>Username, email and account information</span>
          </div>
          <div className="settings-arrow">›</div>
        </button>

        <button
          className="settings-row"
          onClick={() => navigate('/settings/profile')}
        >
          <div className="settings-row-icon">🖼️</div>
          <div className="settings-row-content">
            <strong>Profile</strong>
            <span>Avatar and profile information</span>
          </div>
          <div className="settings-arrow">›</div>
        </button>

        <button
          className="settings-row"
          onClick={() => navigate('/settings/security')}
        >
          <div className="settings-row-icon">🔐</div>
          <div className="settings-row-content">
            <strong>Security</strong>
            <span>Password and account security</span>
          </div>
          <div className="settings-arrow">›</div>
        </button>

        <button
          className="settings-row"
          onClick={() => navigate('/notifications')}
        >
          <div className="settings-row-icon">🔔</div>
          <div className="settings-row-content">
            <strong>Notifications</strong>
            <span>Manage your notifications</span>
          </div>
          <div className="settings-arrow">›</div>
        </button>

        <button
          className="settings-row"
          onClick={() => alert('Telegram coming soon')}
        >
          <div className="settings-row-icon">✈️</div>
          <div className="settings-row-content">
            <strong>Telegram</strong>
            <span>Connect or manage Telegram</span>
          </div>
          <div className="settings-arrow">›</div>
        </button>

        <button
          className="settings-row"
          onClick={() => alert('Appearance coming soon')}
        >
          <div className="settings-row-icon">🎨</div>
          <div className="settings-row-content">
            <strong>Appearance</strong>
            <span>Customize your VERITAS experience</span>
          </div>
          <div className="settings-arrow">›</div>
        </button>

      </div>

      <button
        className="settings-logout"
        onClick={() => navigate('/login')}
      >
        Log Out
      </button>
    </div>
  )
}
