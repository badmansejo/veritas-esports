import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'

import {
  useEffect,
  useState,
} from 'react'

import {
  useAuth,
} from '../context/AuthContext'

import {
  supabase,
} from '../lib/supabaseClient'

function readMaintenanceBoolean(value) {
  if (typeof value === 'boolean') return value

  if (
    value &&
    typeof value === 'object' &&
    typeof value.value === 'boolean'
  ) {
    return value.value
  }

  return false
}

function formatReturnTime(value) {
  if (!value) return 'Return time will be announced.'

  try {
    const date = new Date(`${value}:00+03:00`)

    if (Number.isNaN(date.getTime())) {
      return value
    }

    return new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Africa/Nairobi',
    }).format(date) + ' EAT'
  } catch {
    return value
  }
}

function getMaintenanceCountdown(value, now) {
  if (!value) return null

  const target = new Date(`${value}:00+03:00`).getTime()

  if (Number.isNaN(target)) return null

  const totalSeconds = Math.max(
    0,
    Math.floor((target - now) / 1000)
  )

  return {
    totalSeconds,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

export default function ProtectedRoute() {
  const {
    session,
    loading,
    isAdmin,
  } = useAuth()

  const location = useLocation()

  const [maintenance, setMaintenance] = useState({
    status: 'checking',
    returnTime: '',
    message: '',
  })

  useEffect(() => {
    if (!session || isAdmin) {
      setMaintenance({
        status: 'normal',
        returnTime: '',
      })

      return
    }

    let active = true

    const checkMaintenance = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'maintenance_mode',
            'maintenance_return_time',
            'maintenance_message',
          ])

        if (error) throw error

        const modeRow = (data || []).find(
          item => item.setting_key === 'maintenance_mode'
        )

        const timeRow = (data || []).find(
          item => item.setting_key === 'maintenance_return_time'
        )

        const messageRow = (data || []).find(
          item => item.setting_key === 'maintenance_message'
        )

        const isMaintenanceActive = readMaintenanceBoolean(
          modeRow?.setting_value
        )

        if (!active) return

        setMaintenance({
          status: isMaintenanceActive ? 'maintenance' : 'normal',
          returnTime:
            typeof timeRow?.setting_value === 'string'
              ? timeRow.setting_value
              : '',
          message:
            typeof messageRow?.setting_value === 'string'
              ? messageRow.setting_value
              : '',
        })
      } catch (error) {
        console.error(
          'VERITAS maintenance status check failed:',
          error
        )

        if (!active) return

        setMaintenance({
          status: 'error',
          returnTime: '',
        })
      }
    }

    checkMaintenance()

    const interval = setInterval(
      checkMaintenance,
      5000
    )

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [session, isAdmin])

  const [countdownNow, setCountdownNow] = useState(Date.now())

  useEffect(() => {
    if (
      maintenance.status !== 'maintenance' ||
      !maintenance.returnTime
    ) {
      return
    }

    const interval = setInterval(() => {
      setCountdownNow(Date.now())
    }, 1000)

    return () => clearInterval(interval)
  }, [maintenance.status, maintenance.returnTime])

  const countdown = getMaintenanceCountdown(
    maintenance.returnTime,
    countdownNow
  )

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#050505',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          letterSpacing: '2px',
        }}
      >
        VERITAS...
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location,
        }}
      />
    )
  }

  // Administrators must always retain access.
  if (isAdmin) {
    return <Outlet />
  }

  if (maintenance.status === 'checking') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#050505',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          letterSpacing: '2px',
        }}
      >
        CHECKING VERITAS...
      </div>
    )
  }

  if (maintenance.status === 'error') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#050505',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <h1 style={{ fontSize: '24px', letterSpacing: '2px' }}>
          VERITAS
        </h1>

        <h2>Unable to verify platform status</h2>

        <p style={{ color: '#9ca3af', maxWidth: '420px' }}>
          We cannot currently verify whether VERITAS is available.
          Please try again shortly.
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '16px',
            padding: '12px 24px',
            border: '1px solid #64748b',
            borderRadius: '8px',
            background: '#111827',
            color: '#fff',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          TRY AGAIN
        </button>
      </div>
    )
  }

  if (maintenance.status === 'maintenance') {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          boxSizing: 'border-box',
          background:
            'radial-gradient(circle at top, #172033 0%, #080b12 45%, #050505 100%)',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '28px 20px',
        }}
      >
        <div
          style={{
            width: '76px',
            height: '76px',
            borderRadius: '22px',
            border: '1px solid rgba(148,163,184,0.35)',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            marginBottom: '28px',
          }}
        >
          ⚙
        </div>

        <div
          style={{
            color: '#94a3b8',
            fontSize: '12px',
            fontWeight: 900,
            letterSpacing: '4px',
            marginBottom: '14px',
          }}
        >
          VERITAS ESPORTS
        </div>

        <h1
          style={{
            fontSize: 'clamp(25px, 6vw, 42px)',
            fontWeight: 900,
            letterSpacing: '1px',
            margin: '0 0 16px',
          }}
        >
          MAINTENANCE MODE
        </h1>

        <p
          style={{
            color: '#cbd5e1',
            fontSize: '15px',
            lineHeight: 1.8,
            maxWidth: '480px',
            margin: '0 0 28px',
          }}
        >
          VERITAS is temporarily unavailable while we work
          on improving your experience. Your account is safe.
          Please come back at:
        </p>

        <div
          style={{
            padding: '18px 24px',
            border: '1px solid rgba(148,163,184,0.25)',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.05)',
            maxWidth: '100%',
          }}
        >
          <div
            style={{
              color: '#94a3b8',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '2px',
              marginBottom: '9px',
            }}
          >
            EXPECTED RETURN
          </div>

          <div
            style={{
              fontSize: '16px',
              fontWeight: 800,
              overflowWrap: 'anywhere',
            }}
          >
            {formatReturnTime(maintenance.returnTime)}
          </div>

          {countdown && (
            <>
              <div
                style={{
                  color: '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  marginTop: '22px',
                  marginBottom: '10px',
                }}
              >
                TIME REMAINING
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                  gap: '8px',
                }}
              >
                {[
                  { label: 'DAYS', value: countdown.days },
                  { label: 'HOURS', value: countdown.hours },
                  { label: 'MINUTES', value: countdown.minutes },
                  { label: 'SECONDS', value: countdown.seconds },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: '9px',
                      padding: '12px 5px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 'clamp(20px, 5vw, 28px)',
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {String(item.value).padStart(2, '0')}
                    </div>

                    <div
                      style={{
                        color: '#94a3b8',
                        fontSize: '9px',
                        fontWeight: 800,
                        letterSpacing: '1px',
                        marginTop: '5px',
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              {countdown.totalSeconds === 0 && (
                <p
                  style={{
                    color: '#fbbf24',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    marginTop: '14px',
                  }}
                >
                  The expected return time has passed.
                  Maintenance is still active.
                </p>
              )}
            </>
          )}
        </div>

        {maintenance.message?.trim() && (
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              boxSizing: 'border-box',
              marginTop: '18px',
              padding: '18px',
              border: '1px solid rgba(148,163,184,0.2)',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)',
              color: '#cbd5e1',
              fontSize: '14px',
              lineHeight: 1.8,
              textAlign: 'left',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
            }}
          >
            {maintenance.message}
          </div>
        )}

        <p
          style={{
            color: '#64748b',
            fontSize: '12px',
            marginTop: '28px',
          }}
        >
          Thank you for your patience.
        </p>
      </div>
    )
  }

  return <Outlet />
}

