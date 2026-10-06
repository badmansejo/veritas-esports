import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import VerifyEmail from './pages/Auth/VerifyEmail'

import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import Home from './pages/Home/Home'
import Tournaments from './pages/Tournaments/Tournaments'
import TournamentDetails from './pages/Tournaments/TournamentDetails'
import Wallet from './pages/Wallet/Wallet'
import Marketplace from './pages/Marketplace/Marketplace'
import Inventory from './pages/Inventory/Inventory'
import Settings from './pages/Settings/Settings'
import Account from './pages/Settings/Account/Account'
import Profile from './pages/Settings/Profile/Profile'
import Security from './pages/Settings/Security/Security'
import Notifications from './pages/Notifications/Notifications'

import AdminDepositMethods from './pages/Admin/AdminDepositMethods'
import AdminDeposits from './pages/Admin/AdminDeposits'
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminNotifications from './pages/Admin/AdminNotifications'

function ComingSoon({ title }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#070b14',
        color: '#ffffff',
        padding: '24px',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: '500px',
        }}
      >
        <h1>{title}</h1>

        <p style={{ color: '#9ca3af' }}>
          This section is coming soon.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>

      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/reset-password"
        element={<ResetPassword />}
      />

      <Route
        path="/verify-email"
        element={<VerifyEmail />}
      />

      <Route element={<ProtectedRoute />}>

        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/tournaments"
          element={<Tournaments />}
        />

        <Route
          path="/tournaments/:id"
          element={<TournamentDetails />}
        />

        <Route
          path="/matches"
          element={
            <ComingSoon title="Matches" />
          }
        />

        <Route
          path="/wallet"
          element={<Wallet />}
        />

        <Route
          path="/vcoins"
          element={
            <ComingSoon title="V Coins" />
          }
        />

        <Route
          path="/marketplace"
          element={<Marketplace />}
        />

        <Route
          path="/inventory"
          element={<Inventory />}
        />

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="/settings/account"
          element={<Account />}
        />

        <Route
          path="/settings/profile"
          element={<Profile />}
        />

        <Route
          path="/settings/security"
          element={<Security />}
        />

      </Route>

      <Route element={<AdminRoute />}>

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        <Route
          path="/admin/deposit-methods"
          element={<AdminDepositMethods />}
        />

        <Route
          path="/admin/deposits"
          element={<AdminDeposits />}
        />

        <Route
          path="/admin/notifications"
          element={<AdminNotifications />}
        />

      </Route>

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  )
}
