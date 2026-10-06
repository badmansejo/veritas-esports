import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabaseClient'

export default function Account() {
  const navigate = useNavigate()

  const {
    user,
    profile,
    updateProfile,
    refreshProfile,
  } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [veritasUserId, setVeritasUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setEmail(profile.email || user?.email || '')
      setVeritasUserId(
        profile.veritas_user_id
          ? String(profile.veritas_user_id)
          : ''
      )
    } else if (user) {
      setEmail(user.email || '')
    }
  }, [profile, user])

  async function handleSaveUsername() {
    setMessage('')
    setError('')

    const cleanUsername = username.trim()

    if (!cleanUsername) {
      setError('Username cannot be empty.')
      return
    }

    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.')
      return
    }

    if (cleanUsername.length > 20) {
      setError('Username cannot be more than 20 characters.')
      return
    }

    if (cleanUsername === (profile?.username || '')) {
      setMessage('Username is already saved.')
      return
    }

    setSaving(true)

    try {
      const { data: existingUser, error: checkError } =
        await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanUsername)
          .neq('id', user.id)
          .maybeSingle()

      if (checkError) {
        throw checkError
      }

      if (existingUser) {
        setError(
          'That username is already taken. Please choose another.'
        )
        return
      }

      await updateProfile({
        username: cleanUsername,
        avatar_url: null,
      })

      await refreshProfile()

      setMessage('Username updated successfully.')
    } catch (err) {
      console.error('Username update error:', err)

      const text =
        err?.message ||
        err?.details ||
        ''

      if (
        text.toLowerCase().includes('duplicate') ||
        text.toLowerCase().includes('unique') ||
        text.toLowerCase().includes('already')
      ) {
        setError(
          'That username is already taken. Please choose another.'
        )
      } else {
        setError(
          text ||
          'Unable to update username. Please try again.'
        )
      }
    } finally {
      setSaving(false)
    }
  }

  async function copyUserId() {
    if (!veritasUserId) return

    try {
      await navigator.clipboard.writeText(veritasUserId)

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#070b14',
        color: '#fff',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: '850px',
          margin: '0 auto',
        }}
      >
        <button
          onClick={() => navigate('/settings')}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            border: '1px solid #263248',
            background: '#101827',
            color: '#fff',
            fontSize: '24px',
            cursor: 'pointer',
            marginBottom: '24px',
          }}
        >
          ←
        </button>

        <h1
          style={{
            margin: '0',
            fontSize: '30px',
            fontWeight: '900',
          }}
        >
          Account
        </h1>

        <p
          style={{
            color: '#8995aa',
            marginTop: '6px',
            marginBottom: '28px',
          }}
        >
          Manage your VERITAS account information
        </p>

        <div
          style={{
            background: '#0d1422',
            border: '1px solid #202b3f',
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          {/* USERNAME */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                color: '#8995aa',
                fontSize: '13px',
                marginBottom: '8px',
              }}
            >
              Username
            </label>

            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setMessage('')
                setError('')
              }}
              maxLength={20}
              autoComplete="username"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '14px',
                background: '#101827',
                border: '1px solid #263248',
                borderRadius: '10px',
                color: '#fff',
                fontSize: '16px',
                outline: 'none',
              }}
            />

            <button
              onClick={handleSaveUsername}
              disabled={saving}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '14px',
                border: '0',
                borderRadius: '10px',
                background: saving
                  ? '#334155'
                  : '#ffffff',
                color: '#070b14',
                fontWeight: '900',
                fontSize: '15px',
                cursor: saving
                  ? 'not-allowed'
                  : 'pointer',
              }}
            >
              {saving
                ? 'Saving...'
                : 'Save Username'}
            </button>

            {error && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#35151b',
                  border: '1px solid #6b2737',
                  color: '#ff8fa3',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            {message && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: '#102b20',
                  border: '1px solid #1f6b4b',
                  color: '#6ee7b7',
                  fontSize: '14px',
                }}
              >
                {message}
              </div>
            )}
          </div>

          {/* EMAIL */}
          <div style={{ marginBottom: '22px' }}>
            <label
              style={{
                display: 'block',
                color: '#8995aa',
                fontSize: '13px',
                marginBottom: '7px',
              }}
            >
              Email
            </label>

            <div
              style={{
                padding: '14px',
                background: '#101827',
                borderRadius: '10px',
                color: '#8995aa',
              }}
            >
              {email || 'Not available'}
            </div>
          </div>

          {/* VERITAS USER ID */}
          <div>
            <label
              style={{
                display: 'block',
                color: '#8995aa',
                fontSize: '13px',
                marginBottom: '7px',
              }}
            >
              VERITAS User ID
            </label>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  flex: 1,
                  padding: '14px',
                  background: '#101827',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: '900',
                  letterSpacing: '3px',
                  fontSize: '17px',
                  minHeight: '20px',
                }}
              >
                {veritasUserId || 'Loading...'}
              </div>

              <button
                onClick={copyUserId}
                disabled={!veritasUserId}
                style={{
                  padding: '14px 18px',
                  border: '1px solid #263248',
                  borderRadius: '10px',
                  background: '#182235',
                  color: '#fff',
                  fontWeight: '800',
                  cursor: veritasUserId
                    ? 'pointer'
                    : 'not-allowed',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            <p
              style={{
                color: '#68758b',
                fontSize: '12px',
                marginTop: '8px',
              }}
            >
              Use this ID when receiving tournament payments,
              deposits, or when another user needs to identify you.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
