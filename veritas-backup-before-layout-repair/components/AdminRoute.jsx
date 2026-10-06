import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'

import {
  useAuth,
} from '../context/AuthContext'

export default function AdminRoute() {
  const {
    session,
    loading,
    isAdmin,
  } = useAuth()

  const location = useLocation()

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

  if (!isAdmin) {
    return (
      <Navigate
        to="/"
        replace
      />
    )
  }

  return <Outlet />
}
