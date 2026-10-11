import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'

const sections = [
  {
    title: 'Overview',
    items: [
      ['📊', 'Dashboard', 'Platform overview, activity and system alerts.', '/admin', true],
      ['👥', 'Users', 'Manage users, accounts, wallets and V Coins.'],
      ['🏆', 'Tournaments', 'View and delete tournaments.', '/admin/tournaments', true],
      ['⚽', 'Matches', 'Monitor matches, results, screenshots and disputes.'],
    ],
  },
  {
    title: 'Finance',
    items: [
      ['💰', 'Deposits', 'Review and manage manual deposit requests.', '/admin/deposits', true],
      ['🏦', 'Deposit Methods', 'Manage deposit methods, instructions and QR codes.', '/admin/deposit-methods', true],
      ['💸', 'Withdrawals', 'Manage fees, payout methods and disbursement batches.', '/admin/withdrawals', true],
      ['💳', 'Payout Methods', 'Manage M-Pesa, Airtel Money, Binance, Cash and other providers.', '/admin/payout-methods', true],
      ['🛡️', 'Manage Tournament Agents', 'Add or remove registered users who review tournament disputes.', '/admin/manage-agents', true],
      ['🧑‍⚖️', 'Assign Match Review', 'Assign unresolved disputes to designated agents.', '/admin/agent-assignments', true],
      ['👤', 'Contact Agents', 'Manage agents users can contact for payment support.', '/admin/contact-agents', true],
      ['📒', 'Transactions', 'View the wallet transaction ledger.', '/admin/transactions', true],
      ['🏆', 'Tournament Prize Pools', 'Track sponsored tournament prize-pool reservations.', '/admin/tournament-prize-pools', true],
    ['💸', 'Tournament Payout Approvals', 'Review winners and approve sponsored tournament payouts.', '/admin/tournament-payouts', true],
    ],
  },
  {
    title: 'App Customization',
    items: [
      ['🔤', 'App Font', 'Change the main app font.'],
      ['🖼️', 'App Logo', 'Upload and control the VERITAS logo.'],
      ['🌐', 'Favicon', 'Control the browser tab icon.'],
      ['📱', 'App Icon', 'Control the icon for future app packaging.'],
      ['🎨', 'Themes', 'Manage visual themes and presets.'],
      ['🎗️', 'Colors', 'Control platform colours.'],
      ['🧱', 'Backgrounds', 'Manage backgrounds and visual surfaces.'],
      ['🏷️', 'Branding', 'Control VERITAS branding.'],
    ],
  },
  {
    title: 'App Content',
    items: [
      ['🏠', 'Home Page', 'Control home page sections and promotions.'],
      ['✏️', 'Words & Labels', 'Change buttons, labels and headings.'],
      ['🏆', 'Tournament Instructions', 'Manage player guidance.'],
      ['📜', 'Tournament Rules', 'Manage tournament rules and requirements.'],
      ['⚽', 'Match Instructions', 'Control match and result guidance.'],
      ['💰', 'Wallet Content', 'Manage wallet explanations and messages.'],
      ['🏦', 'Deposit Instructions', 'Manage deposit guidance.'],
      ['💸', 'Withdrawal Instructions', 'Manage withdrawal guidance.'],
      ['🪙', 'V Coins Content', 'Manage V Coins explanations.'],
      ['🛒', 'Marketplace Content', 'Manage marketplace descriptions.'],
      ['🤝', 'Referral Content', 'Manage referral instructions.'],
      ['📢', 'Notifications', 'Manage notification wording and templates.'],
      ['📄', 'Terms & Conditions', 'Edit displayed terms.'],
      ['🔒', 'Privacy Policy', 'Edit the privacy policy.'],
      ['❓', 'Help / FAQ', 'Manage help articles and FAQs.'],
      ['📞', 'Contact Information', 'Control support details.'],
    ],
  },
  {
    title: 'Marketplace',
    items: [
      ['🛒', 'All Items', 'View and manage marketplace items.', '/admin/marketplace', true],
      ['➕', 'Create Item', 'Create marketplace products and rewards.', '/admin/marketplace', true],
      ['✏️', 'Edit Items', 'Change names, descriptions, prices and images.', '/admin/marketplace', true],
      ['⏸️', 'Paused Items', 'Temporarily hide items.', '/admin/marketplace', true],
      ['📦', 'Archived Items', 'Keep old items for historical records.', '/admin/marketplace', true],
      ['🏷️', 'Categories', 'Manage marketplace categories.', '/admin/marketplace', true],
      ['⭐', 'Featured Items', 'Choose featured marketplace items.', '/admin/marketplace', true],
      ['🔥', 'Promotions', 'Manage offers and limited promotions.', '/admin/marketplace', true],
      ['📦', 'Stock / Limits', 'Control quantities and purchase limits.', '/admin/marketplace', true],
      ['⚙️', 'Marketplace Settings', 'Control marketplace behaviour.', '/admin/marketplace', true],
    ],
  },
  {
    title: 'V Coins & Rewards',
    items: [
      ['🪙', 'V Coin Packages', 'Manage V Coin purchase packages.', '/admin/vcoins', true],
      ['🎁', 'Welcome Rewards', 'Control new-user rewards.'],
      ['🤝', 'Referral Rewards', 'Configure referral reward amounts.'],
      ['🏆', 'Tournament Rewards', 'Manage tournament reward configurations.'],
      ['🎉', 'Promotional Bonuses', 'Create promotional rewards.'],
      ['⚙️', 'V Coin Settings', 'Control V Coin system settings.'],
    ],
  },
  {
    title: 'Referrals',
    items: [
      ['🤝', 'Referral Settings', 'Enable and configure referrals.'],
      ['🎁', 'Rewards', 'Manage referral reward values.'],
      ['📋', 'Referral History', 'View referral activity.'],
      ['🏅', 'Top Referrers', 'View successful referrers.'],
      ['🛡️', 'Fraud / Abuse', 'Review suspicious referral activity.'],
    ],
  },
  {
    title: 'Notifications',
    items: [
      ['📢', 'Send Notification', 'Send announcements to users.', '/admin/notifications', true],
      ['📋', 'Templates', 'Manage notification templates.'],
      ['🕐', 'Scheduled Notifications', 'Schedule future notifications.'],
      ['📧', 'Email Broadcasts', 'Send email campaigns.'],
      ['✈️', 'Telegram Notifications', 'Manage Telegram broadcasts.'],
      ['🤖', 'Telegram Bot Settings', 'Manage Telegram bot settings and messages.', '/admin/telegram', true],
    ],
  },
  {
    title: 'Security',
    items: [
      ['🔐', 'Admin Accounts', 'Manage administrator accounts.'],
      ['👮', 'Admin Roles', 'Configure administrative permissions.'],
      ['🔑', 'Login Activity', 'Review login activity.'],
      ['🚫', 'Suspended Accounts', 'Manage suspended accounts.'],
      ['⚠️', 'Security Events', 'Review security events.'],
      ['🛡️', 'Security Settings', 'Control platform security settings.'],
    ],
  },
  {
    title: 'System Settings',
    items: [
      ['🟢', 'App Active / Inactive', 'Control platform availability.'],
      ['🔧', 'Maintenance Mode', 'Lock the user app while retaining admin access.'],
      ['👤', 'Registrations', 'Enable or disable registrations.'],
      ['🏆', 'Tournament Creation', 'Control tournament creation.'],
      ['🎮', 'Tournament Joining', 'Control tournament joining.'],
      ['💰', 'Deposits', 'Enable or disable deposits.'],
      ['💸', 'Withdrawals', 'Enable or disable withdrawals.'],
      ['💳', 'Paystack', 'Control Paystack availability.'],
      ['🏦', 'Manual Deposits', 'Control manual deposits.'],
      ['🪙', 'V Coins', 'Enable or disable V Coins.'],
      ['🛒', 'Marketplace', 'Enable or disable marketplace purchases.'],
      ['🤝', 'Referrals', 'Enable or disable referrals.'],
    ],
  },
  {
    title: 'Audit & Reports',
    items: [
      ['📝', 'Audit Log', 'Record administrator actions and changes.'],
      ['📦', 'Exports / Reports', 'Export finance, users and tournament reports.'],
      ['🔄', 'Version History', 'Preview and restore previous configurations.'],
    ],
  },
]

export default function AdminDashboard() {
  const navigate = useNavigate()

  const [sponsoredEnabled, setSponsoredEnabled] = useState(false)
  const [sponsoredLoading, setSponsoredLoading] = useState(true)
  const [sponsoredSaving, setSponsoredSaving] = useState(false)
  const [sponsoredMessage, setSponsoredMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadSponsoredSetting() {
      const { data, error } = await supabase
        .from('veritas_tournament_settings')
        .select('setting_value')
        .eq('setting_key', 'sponsored_tournaments')
        .maybeSingle()

      if (!active) return

      if (error) {
        setSponsoredMessage(`Could not load setting: ${error.message}`)
      } else if (data) {
        setSponsoredEnabled(data.setting_value?.enabled === true)
      } else {
        setSponsoredMessage('Sponsored tournament setting was not found.')
      }

      setSponsoredLoading(false)
    }

    loadSponsoredSetting()

    return () => {
      active = false
    }
  }, [])

  async function toggleSponsoredTournaments() {
    if (sponsoredLoading || sponsoredSaving) return

    const nextValue = !sponsoredEnabled
    setSponsoredSaving(true)
    setSponsoredMessage('')

    const { data, error } = await supabase.rpc(
      'set_sponsored_tournaments_enabled',
      { p_enabled: nextValue }
    )

    if (error) {
      setSponsoredMessage(
        `Save failed: ${error.message}. Check the table's admin UPDATE policy.`
      )
    } else if (!data) {
      setSponsoredMessage(
        'No setting was updated. Check that the row exists and admins have UPDATE permission.'
      )
    } else {
      setSponsoredEnabled(data.enabled === true)
      setSponsoredMessage(
        data.enabled === true
          ? 'Sponsored tournaments are now ON.'
          : 'Sponsored tournaments are now OFF.'
      )
    }

    setSponsoredSaving(false)
  }

  const availableCount = sections.reduce(
    (total, section) =>
      total + section.items.filter(item => item[4] === true).length,
    0
  )

  const comingCount = sections.reduce(
    (total, section) =>
      total + section.items.filter(item => item[4] !== true).length,
    0
  )

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>VERITAS</div>
          <h1 style={styles.heading}>ADMIN DASHBOARD</h1>
          <p style={styles.subtitle}>
            Central control panel for the VERITAS platform.
          </p>
        </div>

        <button style={styles.backButton} onClick={() => navigate('/')}>
          ← BACK TO APP
        </button>
      </header>

      <div style={styles.stats}>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{sections.length}</span>
          <span style={styles.statLabel}>Control Sections</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{availableCount}</span>
          <span style={styles.statLabel}>Available Links</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statNumber}>{comingCount}</span>
          <span style={styles.statLabel}>Coming Next</span>
        </div>
      </div>

      <nav style={styles.quickLinks}>
        <button onClick={() => navigate('/admin/deposits')}>💰 Deposits</button>
        <button onClick={() => navigate('/admin/withdrawals')}>💸 Withdrawals</button>
        <button onClick={() => navigate('/admin/transactions')}>📒 Transactions</button>
  <button onClick={() => navigate('/admin/tournament-payouts')}>💵 Payout Approvals</button>
        <button onClick={() => navigate('/admin/manage-agents')}>🛡️ Agents</button>
        <button onClick={() => navigate('/admin/agent-assignments')}>🧑‍⚖️ Match Review</button>
      </nav>

      <section style={styles.sponsoredPanel}>
        <div>
          <div style={styles.sponsoredEyebrow}>TOURNAMENT CONTROLS</div>
          <h2 style={styles.sponsoredTitle}>Sponsored Tournaments</h2>
          <p style={styles.sponsoredDescription}>
            Allow or block the creation of sponsored tournaments platform-wide.
            Existing tournaments and their records are not deleted by this switch.
          </p>
          <div style={{
            ...styles.sponsoredStatus,
            color: sponsoredEnabled ? '#86efac' : '#fca5a5',
          }}>
            {sponsoredLoading
              ? 'Loading setting...'
              : sponsoredEnabled
                ? '● ENABLED'
                : '● DISABLED'}
          </div>
          {sponsoredMessage && (
            <p role="status" style={styles.sponsoredMessage}>
              {sponsoredMessage}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={toggleSponsoredTournaments}
          disabled={sponsoredLoading || sponsoredSaving}
          style={{
            ...styles.sponsoredToggle,
            background: sponsoredEnabled ? '#14532d' : '#7f1d1d',
            opacity: sponsoredLoading || sponsoredSaving ? 0.65 : 1,
          }}
        >
          {sponsoredSaving
            ? 'SAVING...'
            : sponsoredEnabled
              ? 'TURN OFF'
              : 'TURN ON'}
        </button>
      </section>

      {sections.map(section => (
        <section key={section.title} style={styles.section}>
          <h2 style={styles.sectionTitle}>{section.title}</h2>

          <div style={styles.grid}>
            {section.items.map(([icon, title, description, path, available]) => (
              <button
                key={`${section.title}-${title}`}
                type="button"
                disabled={!available}
                onClick={() => available && path && navigate(path)}
                style={{
                  ...styles.card,
                  ...(available ? styles.activeCard : styles.disabledCard),
                }}
                title={available ? `Open ${title}` : `${title} is coming next`}
              >
                <div style={styles.cardTop}>
                  <span style={styles.cardIcon}>{icon}</span>
                  <span
                    style={{
                      ...styles.badge,
                      ...(available ? styles.availableBadge : styles.comingBadge),
                    }}
                  >
                    {available ? 'Available' : 'Coming next'}
                  </span>
                </div>
                <strong style={styles.cardTitle}>{title}</strong>
                <span style={styles.cardDescription}>{description}</span>
                {available && (
                  <span style={styles.openLabel}>Open section →</span>
                )}
              </button>
            ))}
          </div>
        </section>
      ))}

      <footer style={styles.footer}>VERITAS ADMIN CONTROL CENTER</footer>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '24px',
    background: '#080b12',
    color: '#f3f4f6',
    fontFamily: 'Arial, Helvetica, sans-serif',
  },
  header: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    padding: '24px',
    border: '1px solid #242c3b',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #141b29, #0d111a)',
  },
  brand: {
    color: '#38bdf8',
    fontSize: '13px',
    fontWeight: 900,
    letterSpacing: '5px',
  },
  heading: {
    margin: '10px 0',
    fontSize: 'clamp(24px, 4vw, 36px)',
    fontWeight: 900,
  },
  subtitle: { margin: 0, color: '#9ca3af', lineHeight: 1.6 },
  backButton: {
    padding: '12px 16px',
    border: '1px solid #374151',
    borderRadius: '9px',
    background: '#111827',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 800,
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    margin: '18px 0',
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '18px',
    background: '#111722',
    border: '1px solid #242c3b',
    borderRadius: '12px',
  },
  statNumber: { fontSize: '27px', fontWeight: 900, color: '#38bdf8' },
  statLabel: { fontSize: '12px', color: '#9ca3af' },
  quickLinks: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginBottom: '30px',
  },
  section: { marginTop: '32px' },
  sectionTitle: {
    paddingBottom: '12px',
    borderBottom: '1px solid #293142',
    fontSize: '20px',
    fontWeight: 900,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
    gap: '13px',
  },
  card: {
    display: 'flex',
    minHeight: '170px',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '12px',
    padding: '16px',
    textAlign: 'left',
    borderRadius: '12px',
    border: '1px solid #293142',
    background: '#111722',
    color: '#f9fafb',
  },
  activeCard: { cursor: 'pointer' },
  disabledCard: { cursor: 'not-allowed', opacity: 0.68 },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  cardIcon: { fontSize: '24px' },
  badge: {
    padding: '5px 8px',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  availableBadge: { background: '#12372d', color: '#86efac' },
  comingBadge: { background: '#272b35', color: '#cbd5e1' },
  cardTitle: { fontSize: '14px', lineHeight: 1.4 },
  cardDescription: { color: '#9ca3af', fontSize: '12px', lineHeight: 1.6 },
  openLabel: { marginTop: 'auto', color: '#38bdf8', fontSize: '12px', fontWeight: 800 },
  sponsoredPanel: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '18px',
    marginTop: '20px',
    padding: '22px',
    border: '1px solid #36506a',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #101d2c, #111722)',
  },
  sponsoredEyebrow: {
    color: '#38bdf8',
    fontSize: '10px',
    fontWeight: 900,
    letterSpacing: '2px',
  },
  sponsoredTitle: { margin: '8px 0', fontSize: '20px', fontWeight: 900 },
  sponsoredDescription: {
    maxWidth: '620px',
    margin: '0',
    color: '#9ca3af',
    fontSize: '12px',
    lineHeight: 1.7,
  },
  sponsoredStatus: { marginTop: '12px', fontSize: '12px', fontWeight: 900 },
  sponsoredMessage: {
    marginBottom: 0,
    color: '#cbd5e1',
    fontSize: '12px',
    lineHeight: 1.6,
  },
  sponsoredToggle: {
    minWidth: '130px',
    padding: '13px 18px',
    border: '1px solid #475569',
    borderRadius: '9px',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 900,
  },
  footer: {
    marginTop: '40px',
    padding: '24px 0',
    borderTop: '1px solid #293142',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 900,
    letterSpacing: '3px',
  },
}





