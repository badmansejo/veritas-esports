import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import ResetPassword from './pages/Auth/ResetPassword'
import VerifyEmail from './pages/Auth/VerifyEmail'

import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home/Home'
import Tournaments from './pages/Tournaments/Tournaments'
import TournamentDetails from './pages/Tournaments/TournamentDetails'
import Marketplace from './pages/Marketplace/Marketplace'
import Inventory from './pages/Inventory/Inventory'

function ComingSoon({ title }) {
  return (
    <div className="coming-soon-page">
      <div className="coming-soon-card">
        <div className="coming-soon-icon">V</div>

        <h1>{title}</h1>

        <p>
          This VERITAS section is being connected to Supabase.
        </p>

        <button
          type="button"
          onClick={() => {
            window.location.href = '/'
          }}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>

      {/* =========================
          PUBLIC AUTH ROUTES
      ========================== */}

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


      {/* =========================
          PROTECTED APP
      ========================== */}

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
            <ComingSoon title="My Matches" />
          }
        />

        <Route
          path="/wallet"
          element={
            <ComingSoon title="Wallet" />
          }
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
          element={
            <ComingSoon title="Notifications" />
          }
        />

        <Route
          path="/settings"
          element={
            <ComingSoon title="Settings" />
          }
        />

      </Route>


      {/* =========================
          FALLBACK
      ========================== */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  )
}