import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function AdminDashboard() {
  const navigate = useNavigate()

  const go = (path) => {
    navigate(path)
  }

  const sectionStyle = {
    marginBottom: '28px',
  }

  const sectionTitleStyle = {
    fontSize: '13px',
    fontWeight: 900,
    letterSpacing: '2px',
    color: '#8f8f8f',
    marginBottom: '12px',
    textTransform: 'uppercase',
  }

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  }

  const cardStyle = {
    background:
      'linear-gradient(145deg, #111111, #080808)',
    border:
      '1px solid rgba(255,255,255,0.09)',
    borderRadius: '16px',
    padding: '18px',
    minHeight: '105px',
    boxSizing: 'border-box',
  }

  const buttonCardStyle = {
    ...cardStyle,
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    color: '#ffffff',
    fontFamily: 'inherit',
  }

  const disabledCardStyle = {
    ...cardStyle,
    opacity: 0.58,
  }

  const titleStyle = {
    fontSize: '15px',
    fontWeight: 900,
    marginBottom: '7px',
    letterSpacing: '0.3px',
  }

  const descriptionStyle = {
    fontSize: '12px',
    lineHeight: 1.5,
    color: '#9d9d9d',
  }

  const badgeStyle = {
    display: 'inline-block',
    marginTop: '12px',
    padding: '5px 8px',
    borderRadius: '999px',
    fontSize: '9px',
    fontWeight: 900,
    letterSpacing: '1px',
    textTransform: 'uppercase',
    background: '#181818',
    color: '#777777',
  }

  const liveBadgeStyle = {
    ...badgeStyle,
    color: '#ffffff',
  }

  function AdminCard({
    title,
    description,
    path,
    live = false,
  }) {
    if (path) {
      return (
        <button
          type="button"
          onClick={() => go(path)}
          style={buttonCardStyle}
        >
          <div style={titleStyle}>
            {title}
          </div>

          <div style={descriptionStyle}>
            {description}
          </div>

          <span style={liveBadgeStyle}>
            {live ? 'Available' : 'Open'}
          </span>
        </button>
      )
    }

    return (
      <div style={disabledCardStyle}>
        <div style={titleStyle}>
          {title}
        </div>

        <div style={descriptionStyle}>
          {description}
        </div>

        <span style={badgeStyle}>
          Coming next
        </span>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#050505',
        color: '#ffffff',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '15px',
            flexWrap: 'wrap',
            marginBottom: '32px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 900,
                letterSpacing: '3px',
                color: '#777777',
                marginBottom: '6px',
              }}
            >
              VERITAS
            </div>

            <h1
              style={{
                margin: 0,
                fontSize: '30px',
                fontWeight: 1000,
                letterSpacing: '-1px',
              }}
            >
              ADMIN DASHBOARD
            </h1>

            <p
              style={{
                margin:
                  '8px 0 0',
                color: '#888888',
                fontSize: '13px',
              }}
            >
              Central control panel for the VERITAS platform.
            </p>
          </div>

          <button
            type="button"
            onClick={() => go('/')}
            style={{
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#101010',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '11px 16px',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            ← BACK TO APP
          </button>
        </div>

        {/* OVERVIEW */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            Overview
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="📊 Dashboard"
              description="Platform overview, activity and system alerts."
              live
            />

            <AdminCard
              title="👥 Users"
              description="Manage users, accounts, wallets and V Coins."
            />

            <AdminCard
              title="🏆 Tournaments"
              description="Control tournaments, games, formats and rules."
            />

            <AdminCard
              title="⚽ Matches"
              description="Monitor matches, results, screenshots and disputes."
            />
          </div>
        </section>

        {/* FINANCE */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            Finance
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="💰 Deposits"
              description="Review and manage manual deposit requests."
              path="/admin/deposits"
              live
            />

            <AdminCard
              title="🏦 Deposit Methods"
              description="Create and manage manual deposit methods, instructions and QR codes."
              path="/admin/deposit-methods"
              live
            />

            <AdminCard
              title="💸 Withdrawals"
              description="Manage withdrawal requests and disbursement batches."
            />

            <AdminCard
              title="📒 Transactions"
              description="View the complete wallet transaction ledger."
            />

            <AdminCard
              title="⚙️ Finance Settings"
              description="Control fees, limits, bonuses and payment settings."
            />

            <AdminCard
              title="📈 Finance Reports"
              description="Review and export financial reports."
            />
          </div>
        </section>

        {/* APP CUSTOMIZATION */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            App Customization
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="🔤 App Font"
              description="Change the main VERITAS app font while preserving the existing visual style."
            />

            <AdminCard
              title="🖼️ App Logo"
              description="Upload, replace and control the main VERITAS logo."
            />

            <AdminCard
              title="🌐 Favicon"
              description="Control the browser tab icon."
            />

            <AdminCard
              title="📱 App Icon"
              description="Control the application icon for future app packaging."
            />

            <AdminCard
              title="🎨 Themes"
              description="Manage visual themes and appearance presets."
            />

            <AdminCard
              title="🌓 Colors"
              description="Control the platform colour system."
            />

            <AdminCard
              title="🧱 Backgrounds"
              description="Manage backgrounds and visual surfaces."
            />

            <AdminCard
              title="🏷️ Branding"
              description="Control VERITAS branding across the platform."
            />
          </div>
        </section>

        {/* APP CONTENT */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            App Content
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="🏠 Home Page"
              description="Control dashboard wording, sections and promotional content."
            />

            <AdminCard
              title="✏️ Words & Labels"
              description="Change buttons, labels, headings and other app wording."
            />

            <AdminCard
              title="🏆 Tournament Instructions"
              description="Control tournament instructions and player guidance."
            />

            <AdminCard
              title="📜 Tournament Rules"
              description="Manage tournament rules and displayed requirements."
            />

            <AdminCard
              title="⚽ Match Instructions"
              description="Control match instructions and result guidance."
            />

            <AdminCard
              title="💰 Wallet Content"
              description="Control wallet explanations and messages."
            />

            <AdminCard
              title="🏦 Deposit Instructions"
              description="Control deposit instructions shown to users."
            />

            <AdminCard
              title="💸 Withdrawal Instructions"
              description="Control withdrawal guidance and information."
            />

            <AdminCard
              title="🪙 V Coins Content"
              description="Control V Coins explanations and reward information."
            />

            <AdminCard
              title="🛒 Marketplace Content"
              description="Control marketplace descriptions and information."
            />

            <AdminCard
              title="🤝 Referral Content"
              description="Control referral instructions and reward explanations."
            />

            <AdminCard
              title="📢 Notifications"
              description="Manage notification wording and templates."
            />

            <AdminCard
              title="📄 Terms & Conditions"
              description="Edit the terms displayed in the app."
            />

            <AdminCard
              title="🔒 Privacy Policy"
              description="Edit the privacy policy displayed in the app."
            />

            <AdminCard
              title="❓ Help / FAQ"
              description="Manage help articles and frequently asked questions."
            />

            <AdminCard
              title="📞 Contact Information"
              description="Control support and contact details."
            />
          </div>
        </section>

        {/* MARKETPLACE */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            Marketplace
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="🛒 All Items"
              description="View and manage every marketplace item."
            />

            <AdminCard
              title="➕ Create Item"
              description="Create new marketplace products and rewards."
            />

            <AdminCard
              title="✏️ Edit Items"
              description="Change item names, descriptions, prices, images and settings."
            />

            <AdminCard
              title="⏸️ Paused Items"
              description="Temporarily hide items without destroying their history."
            />

            <AdminCard
              title="📦 Archived Items"
              description="Keep old items for historical records."
            />

            <AdminCard
              title="🏷️ Categories"
              description="Create and manage marketplace categories."
            />

            <AdminCard
              title="⭐ Featured Items"
              description="Choose which marketplace items receive featured placement."
            />

            <AdminCard
              title="🔥 Promotions"
              description="Create limited offers, first-N-user promotions and special pricing."
            />

            <AdminCard
              title="📦 Stock / Limits"
              description="Control quantities, purchase limits and availability."
            />

            <AdminCard
              title="⚙️ Marketplace Settings"
              description="Control marketplace-wide rules and behaviour."
            />
          </div>
        </section>

        {/* V COINS */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            V Coins & Rewards
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="🪙 V Coin Packages"
              description="Create and manage V Coin purchase packages."
            />

            <AdminCard
              title="🎁 Welcome Rewards"
              description="Control rewards given to new users."
            />

            <AdminCard
              title="🤝 Referral Rewards"
              description="Control referral reward amounts and rules."
            />

            <AdminCard
              title="🏆 Tournament Rewards"
              description="Manage reward configurations."
            />

            <AdminCard
              title="🎉 Promotional Bonuses"
              description="Create promotional V Coin and reward bonuses."
            />

            <AdminCard
              title="⚙️ V Coin Settings"
              description="Control V Coin system settings."
            />
          </div>
        </section>

        {/* REFERRALS */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            Referrals
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="🤝 Referral Settings"
              description="Enable, disable and configure referrals."
            />

            <AdminCard
              title="🎁 Rewards"
              description="Manage referral reward values."
            />

            <AdminCard
              title="📋 Referral History"
              description="View referral activity and rewards."
            />

            <AdminCard
              title="🏅 Top Referrers"
              description="View the most successful referrers."
            />

            <AdminCard
              title="🛡️ Fraud / Abuse"
              description="Review suspicious referral activity."
            />
          </div>
        </section>

        {/* NOTIFICATIONS */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            Notifications
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="📢 Send Notification"
              description="Send announcements to users."
            />

            <AdminCard
              title="📋 Templates"
              description="Manage notification templates."
            />

            <AdminCard
              title="🕐 Scheduled Notifications"
              description="Schedule future notifications."
            />

            <AdminCard
              title="📧 Email Broadcasts"
              description="Send email announcements and campaigns."
            />

            <AdminCard
              title="✈️ Telegram Notifications"
              description="Manage Telegram notification broadcasts."
            />
          </div>
        </section>

        {/* SECURITY */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            Security
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="🔐 Admin Accounts"
              description="Manage administrator accounts."
            />

            <AdminCard
              title="👮 Admin Roles"
              description="Create role-based administrative permissions."
            />

            <AdminCard
              title="🔑 Login Activity"
              description="Review account and administrative login activity."
            />

            <AdminCard
              title="🚫 Suspended Accounts"
              description="Manage suspended users and restrictions."
            />

            <AdminCard
              title="⚠️ Security Events"
              description="Review important security events."
            />

            <AdminCard
              title="🛡️ Security Settings"
              description="Control platform security settings."
            />
          </div>
        </section>

        {/* SYSTEM SETTINGS */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            System Settings
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="🟢 App Active / Inactive"
              description="Control whether the platform is available."
            />

            <AdminCard
              title="🔧 Maintenance Mode"
              description="Temporarily lock the user app while keeping Admin access."
            />

            <AdminCard
              title="👤 Registrations"
              description="Enable or disable new account registration."
            />

            <AdminCard
              title="🏆 Tournament Creation"
              description="Control whether users can create tournaments."
            />

            <AdminCard
              title="🎮 Tournament Joining"
              description="Control tournament joining."
            />

            <AdminCard
              title="💰 Deposits"
              description="Enable or disable deposits."
            />

            <AdminCard
              title="💸 Withdrawals"
              description="Enable or disable withdrawals."
            />

            <AdminCard
              title="💳 Paystack"
              description="Control Paystack availability."
            />

            <AdminCard
              title="🏦 Manual Deposits"
              description="Control manual deposit availability."
            />

            <AdminCard
              title="🪙 V Coins"
              description="Enable or disable the V Coins system."
            />

            <AdminCard
              title="🛒 Marketplace"
              description="Enable or disable marketplace purchases."
            />

            <AdminCard
              title="🤝 Referrals"
              description="Enable or disable referrals."
            />
          </div>
        </section>

        {/* AUDIT */}

        <section style={sectionStyle}>
          <div style={sectionTitleStyle}>
            Audit & Reports
          </div>

          <div style={gridStyle}>
            <AdminCard
              title="📝 Audit Log"
              description="Record important administrator actions and changes."
            />

            <AdminCard
              title="📦 Exports / Reports"
              description="Export users, finance, tournaments, matches and marketplace data."
            />

            <AdminCard
              title="🔄 Version History"
              description="Preview, publish and restore previous configurations."
            />
          </div>
        </section>

        {/* FOOTER */}

        <div
          style={{
            marginTop: '35px',
            paddingTop: '20px',
            borderTop:
              '1px solid rgba(255,255,255,0.08)',
            color: '#666666',
            fontSize: '11px',
            lineHeight: 1.6,
          }}
        >
          VERITAS ADMIN CONTROL CENTER
          <br />
          Available controls will be activated section by section.
        </div>
      </div>
    </div>
  )
}

