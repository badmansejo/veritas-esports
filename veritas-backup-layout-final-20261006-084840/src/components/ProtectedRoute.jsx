import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'

import {
  useAuth,
} from '../context/AuthContext'

export default function ProtectedRoute() {
  const {
    session,
    loading,
  } = useAuth()

  const location =
    useLocation()

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

  return <Outlet />
}
