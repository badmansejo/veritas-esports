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
import WalletPayoutMethods from './pages/Wallet/PayoutMethods'
import VCoins from './pages/VCoins'
import Marketplace from './pages/Marketplace/Marketplace'
import Inventory from './pages/Inventory/Inventory'
import Settings from './pages/Settings/Settings'
import Account from './pages/Settings/Account/Account'
import Profile from './pages/Settings/Profile/Profile'
import Security from './pages/Settings/Security/Security'
import Telegram from './pages/Settings/Telegram/Telegram'
import Notifications from './pages/Notifications/Notifications'

import AdminDepositMethods from './pages/Admin/AdminDepositMethods'
import AdminDeposits from './pages/Admin/AdminDeposits'
import AdminWithdrawals from './pages/Admin/AdminWithdrawals'
import AdminPayoutMethods from './pages/Admin/AdminPayoutMethods'
import PayoutMethods from './pages/PayoutMethods/PayoutMethods'
import AdminDashboard from './pages/Admin/AdminDashboard'
import AdminReferralSettings from './pages/Admin/AdminReferralSettings';
import AdminReferralManagement from './pages/Admin/AdminReferralManagement';
import AdminUsers from './pages/Admin/AdminUsers'
import AdminTournaments from './pages/Admin/AdminTournaments'
import AdminNotifications from './pages/Admin/AdminNotifications'
import AdminTelegram from './pages/Admin/AdminTelegram'
import AdminTelegramStats from './pages/Admin/AdminTelegramStats'
import AdminVCoins from './pages/Admin/AdminVCoins'
import AdminContactAgents from './pages/Admin/AdminContactAgents'
import AdminManageAgents from './pages/AdminManageAgents';
import AdminAgentAssignments from './pages/AdminAgentAssignments';
import AdminTransactions from './pages/Admin/AdminTransactions'
import AdminTournamentPrizePools from './pages/Admin/AdminTournamentPrizePools'
import AdminTournamentPayouts from './pages/Admin/AdminTournamentPayouts'
import AdminMarketplace from './pages/Admin/AdminMarketplace'

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
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<Home />} />
        <Route path="/tournaments" element={<Tournaments />} />
        <Route path="/tournaments/:id" element={<TournamentDetails />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/wallet/payout-methods" element={<WalletPayoutMethods />} />
        <Route path="/payout-methods" element={<WalletPayoutMethods />} />
        <Route path="/vcoins" element={<VCoins />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/account" element={<Account />} />
        <Route path="/settings/profile" element={<Profile />} />
        <Route path="/settings/security" element={<Security />} />
        <Route path="/settings/telegram" element={<Telegram />} />
      </Route>

      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/referrals/settings" element={<AdminReferralSettings />} />
        <Route path="/admin/referrals/history" element={<AdminReferralManagement mode="history" />} />
        <Route path="/admin/referrals/top" element={<AdminReferralManagement mode="top" />} />
        <Route path="/admin/referrals/fraud" element={<AdminReferralManagement mode="fraud" />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/tournaments" element={<AdminTournaments />} />
  <Route path="/admin/marketplace" element={<AdminMarketplace />} />
        <Route path="/admin/tournament-prize-pools" element={<AdminTournamentPrizePools />} />
          <Route path="/admin/tournament-payouts" element={<AdminTournamentPayouts />} />
          <Route
            path="/admin/transactions"
            element={<AdminTransactions />}
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
          path="/admin/withdrawals"
          element={<AdminWithdrawals />}
        />
        <Route
          path="/admin/payout-methods"
          element={<AdminPayoutMethods />}
        />

        <Route
          path="/admin/contact-agents"
          element={<AdminContactAgents />}
        />
        <Route path="/admin/notifications"
          element={<AdminNotifications />}
        />

        <Route
          path="/admin/telegram"
          element={<AdminTelegram />}
        />

        <Route
          path="/admin/telegram/stats"
          element={<AdminTelegramStats />}
        />

        <Route
          path="/admin/vcoins"
          element={<AdminVCoins />}
        />
        <Route path="/admin/manage-agents" element={<AdminManageAgents />} />
        <Route path="/admin/agent-assignments" element={<AdminAgentAssignments />} />
        <Route path="/admin/manage-agents" element={<AdminManageAgents />} />
        <Route path="/admin/agent-assignments" element={<AdminAgentAssignments />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    
        <Route path="/referrals" element={<Referrals />} />
      </Routes>
  )
}











import Matches from './pages/Matches/Matches'















import Referrals from './pages/Referrals/Referrals'
