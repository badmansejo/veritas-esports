import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabaseClient'
import './Security.css'

export default function Security() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function clearMessages() {
    setMessage('')
    setError('')
  }

  async function handleChangePassword(e) {
    e.preventDefault()

    clearMessages()

    if (!user?.email) {
      setError('Your account email could not be found.')
      return
    }

    if (!currentPassword) {
      setError('Enter your current password.')
      return
    }

    if (!newPassword) {
      setError('Enter a new password.')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.')
      return
    }

    if (newPassword === currentPassword) {
      setError('Your new password must be different from your current password.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    setSaving(true)

    try {
      const {
        error: verifyError,
      } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (verifyError) {
        throw new Error('Current password is incorrect.')
      }

      const {
        error: updateError,
      } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setMessage('Password changed successfully.')
    } catch (err) {
      console.error('Password change error:', err)

      setError(
        err?.message ||
        'Unable to change password. Please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleResetEmail() {
    clearMessages()

    if (!user?.email) {
      setError('Your account email could not be found.')
      return
    }

    setResetting(true)

    try {
      const {
        error: resetError,
      } = await supabase.auth.resetPasswordForEmail(
        user.email,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (resetError) {
        throw resetError
      }

      setMessage(
        `Password reset instructions have been sent to ${user.email}.`
      )
    } catch (err) {
      console.error('Password reset email error:', err)

      setError(
        err?.message ||
        'Unable to send password reset email.'
      )
    } finally {
      setResetting(false)
    }
  }

  async function handleSignOutAll() {
    clearMessages()

    const confirmed = window.confirm(
      'Sign out of all VERITAS sessions?'
    )

    if (!confirmed) return

    setSigningOut(true)

    try {
      const {
        error: signOutError,
      } = await supabase.auth.signOut({
        scope: 'global',
      })

      if (signOutError) {
        throw signOutError
      }

      await signOut()
    } catch (err) {
      console.error('Global sign out error:', err)

      setError(
        err?.message ||
        'Unable to sign out from all sessions.'
      )
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <div className="security-page">
      <div className="security-container">

        <button
          className="security-back"
          onClick={() => navigate('/settings')}
        >
          ←
        </button>

        <div className="security-heading">
          <h1>Security</h1>
          <p>Protect your VERITAS account</p>
        </div>

        <div className="security-card">

          <div className="security-section-title">
            <div className="security-icon">
              🔐
            </div>

            <div>
              <h2>Change Password</h2>
              <p>
                Update the password used to access your account.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword}>

            <div className="security-field">
              <label>Current Password</label>

              <input
                type="password"
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value)
                  clearMessages()
                }}
                autoComplete="current-password"
                placeholder="Enter current password"
              />
            </div>

            <div className="security-field">
              <label>New Password</label>

              <input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  clearMessages()
                }}
                autoComplete="new-password"
                placeholder="Enter new password"
              />
            </div>

            <div className="security-field">
              <label>Confirm New Password</label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  clearMessages()
                }}
                autoComplete="new-password"
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              className="security-primary"
              disabled={saving}
            >
              {saving
                ? 'Changing Password...'
                : 'Change Password'}
            </button>

          </form>

          {error && (
            <div className="security-message security-error">
              {error}
            </div>
          )}

          {message && (
            <div className="security-message security-success">
              {message}
            </div>
          )}

        </div>

        <div className="security-card">

          <div className="security-section-title">
            <div className="security-icon">
              📧
            </div>

            <div>
              <h2>Password Reset</h2>
              <p>
                Send a secure password reset link to your account email.
              </p>
            </div>
          </div>

          <div className="security-email">
            {user?.email || 'Email unavailable'}
          </div>

          <button
            className="security-secondary"
            onClick={handleResetEmail}
            disabled={resetting}
          >
            {resetting
              ? 'Sending...'
              : 'Send Reset Email'}
          </button>

        </div>

        <div className="security-card security-danger-card">

          <div className="security-section-title">
            <div className="security-icon">
              🚪
            </div>

            <div>
              <h2>Sessions</h2>
              <p>
                Sign out of VERITAS on all devices and browsers.
              </p>
            </div>
          </div>

          <button
            className="security-danger"
            onClick={handleSignOutAll}
            disabled={signingOut}
          >
            {signingOut
              ? 'Signing Out...'
              : 'Sign Out All Sessions'}
          </button>

        </div>

      </div>
    </div>
  )
}
