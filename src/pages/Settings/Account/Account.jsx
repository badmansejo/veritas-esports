import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabaseClient'

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '14px',
  background: '#101827',
  border: '1px solid #263248',
  borderRadius: '10px',
  color: '#fff',
  fontSize: '16px',
  outline: 'none',
}

const labelStyle = {
  display: 'block',
  color: '#8995aa',
  fontSize: '13px',
  marginBottom: '8px',
}

const buttonStyle = {
  marginTop: '12px',
  width: '100%',
  padding: '14px',
  border: '0',
  borderRadius: '10px',
  background: '#fff',
  color: '#070b14',
  fontWeight: '900',
  fontSize: '15px',
  cursor: 'pointer',
}

export default function Account() {
  const navigate = useNavigate()
  const { user, profile, updateProfile, refreshProfile } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [veritasUserId, setVeritasUserId] = useState('')
  const [whatsappPhone, setWhatsappPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingPhone, setSavingPhone] = useState(false)
  const [copied, setCopied] = useState(false)
  const [phoneCopied, setPhoneCopied] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [phoneMessage, setPhoneMessage] = useState('')
  const [phoneError, setPhoneError] = useState('')

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setEmail(profile.email || user?.email || '')
      setVeritasUserId(profile.veritas_user_id ? String(profile.veritas_user_id) : '')

      const savedPhone = String(profile.whatsapp_phone || '').replace(/\D/g, '')
      let localDigits = savedPhone

      if (localDigits.startsWith('254')) {
        localDigits = localDigits.slice(3)
      } else if (localDigits.startsWith('0') && localDigits.length === 10) {
        localDigits = localDigits.slice(1)
      }

      setWhatsappPhone(localDigits.slice(0, 9))
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
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', user.id)
        .maybeSingle()

      if (checkError) throw checkError

      if (existingUser) {
        setError('That username is already taken. Please choose another.')
        return
      }

      await updateProfile({ username: cleanUsername, avatar_url: null })
      await refreshProfile()
      setMessage('Username updated successfully.')
    } catch (err) {
      console.error('Username update error:', err)
      const text = err?.message || err?.details || ''

      if (
        text.toLowerCase().includes('duplicate') ||
        text.toLowerCase().includes('unique') ||
        text.toLowerCase().includes('already')
      ) {
        setError('That username is already taken. Please choose another.')
      } else {
        setError(text || 'Unable to update username. Please try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveWhatsApp() {
    setPhoneMessage('')
    setPhoneError('')

    if (!user?.id) {
      setPhoneError('Please sign in again and try once more.')
      return
    }

    const digits = whatsappPhone.replace(/\D/g, '')

    if (digits && !/^(7|1)\d{8}$/.test(digits)) {
      setPhoneError('Enter a valid Kenyan mobile number: 9 digits after +254.')
      return
    }

    const cleanPhone = digits ? `+254${digits}` : ''

    if (cleanPhone === (profile?.whatsapp_phone || '')) {
      setPhoneMessage('WhatsApp number is already saved.')
      return
    }

    setSavingPhone(true)

    try {
      const { error: saveError } = await supabase
        .from('profiles')
        .update({ whatsapp_phone: cleanPhone || null })
        .eq('id', user.id)

      if (saveError) throw saveError

      await refreshProfile()
      setPhoneMessage(
        cleanPhone
          ? 'WhatsApp number saved successfully.'
          : 'WhatsApp number removed successfully.'
      )
    } catch (err) {
      console.error('WhatsApp number save error:', err)

      if (
        err?.code === '23505' ||
        (err?.message || '').toLowerCase().includes('unique')
      ) {
        setPhoneError('This WhatsApp number is already registered to another account.')
      } else {
        setPhoneError(err?.message || 'Unable to save your WhatsApp number. Please try again.')
      }
    } finally {
      setSavingPhone(false)
    }
  }

  async function copyText(value, setCopiedState) {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      setCopiedState(true)
      window.setTimeout(() => setCopiedState(false), 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  function statusMessage(text, isError = false) {
    return (
      <div style={{
        marginTop: '12px',
        padding: '12px',
        borderRadius: '10px',
        background: isError ? '#35151b' : '#102b20',
        border: `1px solid ${isError ? '#6b2737' : '#1f6b4b'}`,
        color: isError ? '#ff8fa3' : '#6ee7b7',
        fontSize: '14px',
      }}>
        {text}
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#070b14',
      color: '#fff',
      padding: '24px',
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
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

        <h1 style={{ margin: 0, fontSize: '30px', fontWeight: '900' }}>Account</h1>
        <p style={{ color: '#8995aa', marginTop: '6px', marginBottom: '28px' }}>
          Manage your VERITAS account information
        </p>

        <div style={{
          background: '#0d1422',
          border: '1px solid #202b3f',
          borderRadius: '16px',
          padding: '20px',
        }}>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Username</label>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                setMessage('')
                setError('')
              }}
              maxLength={20}
              autoComplete="username"
              style={fieldStyle}
            />
            <button onClick={handleSaveUsername} disabled={saving} style={buttonStyle}>
              {saving ? 'Saving...' : 'Save Username'}
            </button>
            {error && statusMessage(error, true)}
            {message && statusMessage(message)}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>WhatsApp Phone Number</label>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 14px',
                background: '#182235',
                border: '1px solid #263248',
                borderRadius: '10px',
                color: '#65f0b5',
                fontWeight: '900',
                whiteSpace: 'nowrap',
              }}>
                +254
              </div>

              <input
                type="tel"
                inputMode="numeric"
                value={whatsappPhone}
                onChange={(e) => {
                  setWhatsappPhone(e.target.value.replace(/\D/g, '').slice(0, 9))
                  setPhoneMessage('')
                  setPhoneError('')
                }}
                placeholder="712345678"
                autoComplete="tel-national"
                maxLength={9}
                style={{ ...fieldStyle, flex: 1, minWidth: 0 }}
              />
            </div>

            <p style={{ color: '#68758b', fontSize: '12px', marginTop: '8px' }}>
              Enter 9 digits after +254. Example: 712345678 or 112345678.
            </p>

            <button
              onClick={handleSaveWhatsApp}
              disabled={savingPhone}
              style={{
                ...buttonStyle,
                background: savingPhone ? '#334155' : '#65f0b5',
                cursor: savingPhone ? 'not-allowed' : 'pointer',
              }}
            >
              {savingPhone ? 'Saving...' : 'Save WhatsApp Number'}
            </button>

            {phoneError && statusMessage(phoneError, true)}
            {phoneMessage && statusMessage(phoneMessage)}
          </div>

          <div style={{ marginBottom: '22px' }}>
            <label style={labelStyle}>Email</label>
            <div style={{
              padding: '14px',
              background: '#101827',
              borderRadius: '10px',
              color: '#8995aa',
              overflowWrap: 'anywhere',
            }}>
              {email || 'Not available'}
            </div>
          </div>

          <div>
            <label style={labelStyle}>VERITAS User ID</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                flex: 1,
                padding: '14px',
                background: '#101827',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: '900',
                letterSpacing: '3px',
                fontSize: '17px',
                minHeight: '20px',
                overflowWrap: 'anywhere',
              }}>
                {veritasUserId || 'Loading...'}
              </div>

              <button
                onClick={() => copyText(veritasUserId, setCopied)}
                disabled={!veritasUserId}
                style={{
                  padding: '14px 18px',
                  border: '1px solid #263248',
                  borderRadius: '10px',
                  background: '#182235',
                  color: '#fff',
                  fontWeight: '800',
                  cursor: veritasUserId ? 'pointer' : 'not-allowed',
                  whiteSpace: 'nowrap',
                }}
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
            </div>

            <p style={{ color: '#68758b', fontSize: '12px', marginTop: '8px' }}>
              Use this ID when receiving tournament payments, deposits, or when another user needs to identify you.
            </p>

            {profile?.whatsapp_phone && (
              <button
                onClick={() => copyText(profile.whatsapp_phone, setPhoneCopied)}
                style={{
                  ...buttonStyle,
                  background: '#182235',
                  color: '#fff',
                  border: '1px solid #263248',
                }}
              >
                {phoneCopied ? 'WhatsApp Number Copied ✓' : 'Copy My WhatsApp Number'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


