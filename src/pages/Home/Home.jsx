import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { registerPushNotifications } from '../../lib/pushNotifications'

export default function Home() {
  const navigate = useNavigate()

  const {
    user,
    profile,
    refreshProfile,
    signOut,
    isAdmin,
  } = useAuth()

  const [tournaments, setTournaments] = useState([])
  const [myTournaments, setMyTournaments] = useState([])
  const [myTournamentTab, setMyTournamentTab] = useState('Active')

  const [loadingTournaments, setLoadingTournaments] = useState(true)
  const [loadingMyTournaments, setLoadingMyTournaments] = useState(true)

  const [menuOpen, setMenuOpen] = useState(false)
  const [equippedItems, setEquippedItems] = useState([])

  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [pushStatus, setPushStatus] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported')
  const [notificationToast, setNotificationToast] = useState(null)

  useEffect(() => {
    loadHomeData()
  }, [user])

  useEffect(() => {
    if (!user?.id) return

    registerPushNotifications(user.id).catch((error) => {
      console.error('Push registration error:', error)
    })

    loadUnreadNotifications()

    const channel = supabase
      .channel(`home-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new

          setUnreadNotifications((count) => count + 1)

          setNotificationToast({
            id: notification.id,
            title: notification.title || 'VERITAS',
            message:
              notification.message ||
              'You have a new notification.',
          })

          playNotificationSound()

          setTimeout(() => {
            setNotificationToast((current) =>
              current?.id === notification.id
                ? null
                : current
            )
          }, 6000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  async function loadUnreadNotifications() {
    if (!user?.id) return

    const { count, error } = await supabase
      .from('notifications')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (!error) {
      setUnreadNotifications(count || 0)
    }
  }

  function playNotificationSound() {
    try {
      const AudioContext =
        window.AudioContext ||
        window.webkitAudioContext

      if (!AudioContext) return

      const audioContext = new AudioContext()

      const oscillator =
        audioContext.createOscillator()

      const gain =
        audioContext.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(
        880,
        audioContext.currentTime
      )

      oscillator.frequency.exponentialRampToValueAtTime(
        1320,
        audioContext.currentTime + 0.12
      )

      gain.gain.setValueAtTime(
        0.0001,
        audioContext.currentTime
      )

      gain.gain.exponentialRampToValueAtTime(
        0.18,
        audioContext.currentTime + 0.02
      )

      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audioContext.currentTime + 0.35
      )

      oscillator.connect(gain)
      gain.connect(audioContext.destination)

      oscillator.start()
      oscillator.stop(
        audioContext.currentTime + 0.35
      )
    } catch (error) {
      console.error(
        'Notification sound error:',
        error
      )
    }
  }

  async function loadHomeData() {
    if (!user) return

    setLoadingTournaments(true)
    setLoadingMyTournaments(true)

    try {
      await refreshProfile()

      const {
        data: equippedData,
        error: equippedError,
      } = await supabase
        .from('equipped_items')
        .select(`
          id,
          item_id,
          slot_type,
          equipped_at,
          marketplace_items (
            id,
            name,
            item_type,
            description,
            preview_data
          )
        `)
        .eq('user_id', user.id)

      if (equippedError) {
        console.error(
          'Equipped items loading error:',
          equippedError
        )
        setEquippedItems([])
      } else {
        setEquippedItems(equippedData || [])
      }

      const {
        data,
        error,
      } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          game,
          creator_id,
          tournament_code,
          players,
          format,
          match_format,
          match_rule,
          management,
          entry_type,
          round_deadline,
          rules,
          setup_mode,
          status,
          start_time,
          is_sponsored,
          created_at
        `)
        .in('status', [
          'Open',
          'Starting Soon',
          'Live',
        ])
        .order('start_time', {
          ascending: true,
        })
        .limit(6)

      if (!error) {
        setTournaments(data || [])
      } else {
        console.error(
          'Tournament loading error:',
          error
        )
        setTournaments([])
      }

      const {
        data: participantData,
        error: participantError,
      } = await supabase
        .from('tournament_participants')
        .select(`
          id,
          tournament_id,
          user_id,
          status,
          joined_at,
          tournaments (
            id,
            creator_id,
            tournament_code,
            name,
            game,
            players,
            format,
            match_format,
            match_rule,
            management,
            entry_type,
            start_time,
            round_deadline,
            rules,
            status,
            setup_mode,
            is_sponsored,
            sponsor_name,
            prize_pool,
            first_prize,
            second_prize,
            third_prize,
            creator_started,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', {
          ascending: false,
        })

      if (participantError) {
        console.error(
          'My tournaments loading error:',
          participantError
        )
        setMyTournaments([])
      } else {
        setMyTournaments(
          (participantData || [])
            .filter((item) => item.tournaments)
            .map((item) => ({
              ...item.tournaments,
              participant_status: item.status,
              joined_at: item.joined_at,
            }))
        )
      }
    } catch (error) {
      console.error(
        'Home loading error:',
        error
      )
    } finally {
      setLoadingTournaments(false)
      setLoadingMyTournaments(false)
    }
  }

  const getMyTournamentStatus = (tournament) => {
    if (tournament.status === 'Completed') {
      return 'Completed'
    }

    if (
      tournament.status === 'Live' ||
      tournament.creator_started === true
    ) {
      return 'Active'
    }

    return 'Upcoming'
  }

  const filteredMyTournaments =
    myTournaments.filter(
      (tournament) =>
        getMyTournamentStatus(tournament) ===
        myTournamentTab
    )

  async function handleLogout() {
    const { error } = await signOut()

    if (error) {
      alert(error.message)
      return
    }

    navigate('/login', {
      replace: true,
    })
  }

  const displayName =
    profile?.username ||
    user?.user_metadata?.username ||
    user?.email?.split('@')[0] ||
    'VERITAS Player'

  const userId =
    profile?.veritas_user_id || '-----'

  const kesBalance =
    Number(profile?.kes_balance || 0).toFixed(2)

  const vcoins =
    profile?.vcoins ?? 0

  const wins =
    profile?.tournament_wins ?? 0

  const badges =
    profile?.badges_count ?? 0

  const sponsorBadge =
    profile?.sponsor_badge ?? 0

  const fairPlay =
    profile?.fair_play_score ?? 100

  const hasSlot = (slot) =>
    equippedItems.some(
      (item) => item.slot_type === slot
    )

  const hasFont = hasSlot('Font')
  const hasGlow = hasSlot('Glow')
  const hasFire = hasSlot('Fire')
  const hasIce = hasSlot('Ice')
  const hasElectric = hasSlot('Electric')

  const fontItem =
    equippedItems.find(
      (item) => item.slot_type === 'Font'
    )

  const fontName =
    fontItem?.marketplace_items?.name || ''

  let usernameFontFamily = 'inherit'
  let usernameFontWeight = 700
  let usernameLetterSpacing = 'normal'

  if (
    hasFont &&
    fontName === 'Titan Font'
  ) {
    usernameFontFamily =
      'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif'

    usernameFontWeight = 900
    usernameLetterSpacing = '0.5px'
  }

  let usernameTextShadow = 'none'

  if (hasGlow) {
    usernameTextShadow =
      '0 0 6px rgba(255,255,255,0.75), 0 0 14px rgba(80,180,255,0.75)'
  }

  if (hasFire) {
    usernameTextShadow =
      usernameTextShadow === 'none'
        ? '0 0 7px rgba(255,100,30,0.9), 0 0 18px rgba(255,45,0,0.65)'
        : `${usernameTextShadow}, 0 0 7px rgba(255,100,30,0.9)`
  }

  if (hasIce) {
    usernameTextShadow =
      usernameTextShadow === 'none'
        ? '0 0 7px rgba(130,220,255,0.95), 0 0 18px rgba(40,150,255,0.7)'
        : `${usernameTextShadow}, 0 0 7px rgba(130,220,255,0.9)`
  }

  if (hasElectric) {
    usernameTextShadow =
      usernameTextShadow === 'none'
        ? '0 0 7px rgba(120,180,255,0.95), 0 0 18px rgba(50,100,255,0.7)'
        : `${usernameTextShadow}, 0 0 7px rgba(120,180,255,0.9)`
  }

  const usernameStyle = {
    fontFamily: usernameFontFamily,
    fontWeight: usernameFontWeight,
    letterSpacing: usernameLetterSpacing,
    textShadow: usernameTextShadow,
  }

  return (
    
<div className="veritas-app">

      {notificationToast && (
        <button
          type="button"
          className="notification-toast"
          onClick={() => {
            setNotificationToast(null)
            navigate('/notifications')
          }}
        >
          <strong>
            {notificationToast.title}
          </strong>

          <span>
            {notificationToast.message}
          </span>
        </button>
      )}

      <header className="veritas-topbar">

        <div
          className="veritas-logo"
          onClick={() => navigate('/')}
          role="button"
          tabIndex={0}
        >
          <span>V</span>
          <strong>VERITAS</strong>
        </div>

        <div className="topbar-actions">

          <button
            type="button"
            className="icon-button notification-icon-button"
            onClick={() => navigate('/notifications')}
            title="Notifications"
            aria-label="Notifications"
          >
            &#x1F514;

            {unreadNotifications > 0 && (
              <span className="notification-count">
                {unreadNotifications > 99
                  ? '99+'
                  : unreadNotifications}
              </span>
            )}
          </button>

          <button
            type="button"
            className="profile-mini"
            onClick={() =>
              setMenuOpen((value) => !value)
            }
            aria-label="Open profile menu"
          >
            <div className="mini-avatar">
              {displayName
                .charAt(0)
                .toUpperCase()}
            </div>

            <span style={usernameStyle}>
              {displayName}
            </span>

            <span>&#x25BC;</span>
          </button>

          {menuOpen && (
            <div className="profile-dropdown">

              <button
                type="button"
                onClick={() =>
                  navigate('/settings')
                }
              >
                Settings
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="logout-button"
              >
                Logout
              </button>

            </div>
          )}

        </div>
      </header>

      <div className="veritas-layout">

        <aside className="veritas-sidebar">

          <button
            type="button"
            className="sidebar-link active"
            onClick={() => navigate('/')}
          >
            <span>&#x1F3E0;</span>
            <span>Home</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              navigate('/tournaments')
            }
          >
            <span>&#x1F3C6;</span>
            <span>Tournaments</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              navigate('/matches')
            }
          >
            <span>&#x2694;&#xFE0F;</span>
            <span>My Matches</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              navigate('/wallet')
            }
          >
            <span>&#x1F4B5;</span>
            <span>Wallet</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              navigate('/vcoins')
            }
          >
            <span>&#x1FA99;</span>
            <span>V Coins</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              navigate('/marketplace')
            }
          >
            <span>&#x1F6D2;</span>
            <span>Marketplace</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              navigate('/inventory')
            }
          >
            <span>&#x1F392;</span>
            <span>Inventory</span>
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              navigate('/notifications')
            }
          >
            <span>&#x1F514;</span>
            <span>Notifications</span>

            {unreadNotifications > 0 && (
              <span className="sidebar-notification-count">
                {unreadNotifications > 99
                  ? '99+'
                  : unreadNotifications}
              </span>
            )}
          </button>

          <div className="sidebar-divider" />

          {isAdmin && (
            <button
              type="button"
              className="sidebar-link"
              onClick={() =>
                navigate('/admin')
              }
            >
              <span>&#x2699;&#xFE0F;</span>
              <span>Admin</span>
            </button>
          )}

          <button
            type="button"
            className="sidebar-link"
            onClick={() =>
              navigate('/settings')
            }
          >
            <span>&#x1F48E;</span>
            <span>Settings</span>
          </button>

          <button
            type="button"
            className="sidebar-link sidebar-logout"
            onClick={handleLogout}
          >
            <span>&#x2192;</span>
            <span>Logout</span>
          </button>

        </aside>

        <main className="veritas-content">

          <section className="welcome-section">

            <div>

              <p className="small-label">
                WELCOME BACK
              </p>

              <h1 style={usernameStyle}>
                {displayName}
              </h1>

              <p className="user-id-line">
                VERITAS ID:
                <strong>{userId}</strong>
              </p>

            </div>

            <div className="fair-play-card">
              <span>Fair Play</span>
              <strong>{fairPlay}%</strong>
            </div>

          </section>

          <section className="balance-grid">

            <div className="balance-card kes-card">

              <div>
                <span className="balance-label">
                  KES BALANCE
                </span>

                <strong>
                  KES {kesBalance}
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate('/wallet')
                }
                aria-label="Open wallet"
              >
                +
              </button>

            </div>

            <div className="balance-card coin-card">

              <div>
                <span className="balance-label">
                  V COINS
                </span>

                <strong>
                  {vcoins}
                </strong>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate('/vcoins')
                }
                aria-label="Open V Coins"
              >
                +
              </button>

            </div>

          </section>

          <section className="stats-grid">

            <div className="stat-card">
              <span>&#x1F3C6;</span>

              <div>
                <small>
                  Tournament Wins
                </small>

                <strong>{wins}</strong>
              </div>
            </div>

            <div className="stat-card">
              <span>&#x1F3C5;</span>

              <div>
                <small>Badges</small>

                <strong>{badges}</strong>
              </div>
            </div>

            <div className="stat-card">
              <span>&#x1F48E;</span>

              <div>
                <small>Sponsored</small>

                <strong>
                  {sponsorBadge}
                </strong>
              </div>
            </div>

          </section>

          <section className="home-section">

            <div className="section-heading">

              <div>
                <p className="small-label">
                  PLAY
                </p>

                <h2>Quick Actions</h2>
              </div>

            </div>

            <div className="quick-actions">

              <button
                type="button"
                onClick={() =>
                  navigate('/tournaments')
                }
                className="action-card"
              >
                <span>&#x1F3C6;</span>

                <strong>
                  Create Tournament
                </strong>

                <small>
                  Create your own competition
                </small>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('/tournaments')
                }
                className="action-card"
              >
                <span>&#x1F3AE;</span>

                <strong>
                  Join Tournament
                </strong>

                <small>
                  Enter using a tournament code
                </small>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('/tournaments')
                }
                className="action-card"
              >
                <span>&#x1F4B0;</span>

                <strong>
                  Sponsor Tournament
                </strong>

                <small>
                  Support a tournament
                </small>
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate('/matches')
                }
                className="action-card"
              >
                <span>&#x26BD;</span>

                <strong>
                  View My Matches
                </strong>

                <small>
                  See your upcoming matches
                </small>
              </button>

            </div>
          </section>

          <section className="home-section">

            <div className="section-heading">

              <div>
                <p className="small-label">
                  YOUR ACTIVITY
                </p>

                <h2>My Tournaments</h2>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  navigate('/tournaments')
                }
              >
                View All &#x2192;
              </button>

            </div>

            <div className="tournament-tabs">

              {[
                'Upcoming',
                'Active',
                'Completed',
              ].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={
                    myTournamentTab === tab
                      ? 'selected'
                      : ''
                  }
                  onClick={() =>
                    setMyTournamentTab(tab)
                  }
                >
                  {tab}
                </button>
              ))}

            </div>

            {loadingMyTournaments ? (
              <div className="loading-box">
                Loading your tournaments...
              </div>
            ) : filteredMyTournaments.length === 0 ? (
              <div className="empty-tournament">

                <div>&#x1F3C6;</div>

                <h3>
                  No{' '}
                  {myTournamentTab.toLowerCase()}{' '}
                  tournaments
                </h3>

                <p>
                  Tournaments you create or join
                  will appear here.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/tournaments')
                  }
                >
                  Explore Tournaments
                </button>

              </div>
            ) : (
              <div className="tournament-grid">

                {filteredMyTournaments.map(
                  (tournament) => (
                    <div
                      className="tournament-card"
                      key={tournament.id}
                    >

                      <div className="tournament-card-top">

                        <span>
                          {tournament.game}
                        </span>

                        <span className="status-badge">
                          {tournament.status}
                        </span>

                      </div>

                      <h3>
                        {tournament.name}
                      </h3>

                      <div className="tournament-info">

                        <span>
                          P {tournament.players}{' '}
                          players
                        </span>

                        <span>
                          {tournament.participant_status}
                        </span>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            '/tournaments/' +
                              tournament.id
                          )
                        }
                      >
                        View Tournament
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          <section className="home-section">

            <div className="section-heading">

              <div>
                <p className="small-label">
                  COMPETE
                </p>

                <h2>
                  Featured Tournaments
                </h2>
              </div>

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  navigate('/tournaments')
                }
              >
                See All &#x2192;
              </button>

            </div>

            {loadingTournaments ? (
              <div className="loading-box">
                Loading tournaments...
              </div>
            ) : tournaments.length === 0 ? (
              <div className="empty-tournament">

                <div>&#x1F3C6;</div>

                <h3>
                  No tournaments available yet
                </h3>

                <p>
                  Featured and sponsored
                  tournaments will appear here.
                </p>

              </div>
            ) : (
              <div className="tournament-grid">

                {tournaments.map(
                  (tournament) => (
                    <div
                      className="tournament-card"
                      key={tournament.id}
                    >

                      <div className="tournament-card-top">

                        <span>
                          {tournament.game ||
                            'Football'}
                        </span>

                        {tournament.is_sponsored && (
                          <span className="sponsored-tag">
                            Sponsored
                          </span>
                        )}

                      </div>

                      <h3>
                        {tournament.name}
                      </h3>

                      <div className="tournament-info">

                        <span>
                          P {tournament.players || 0}{' '}
                          players
                        </span>

                        <span>
                          {tournament.status}
                        </span>

                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            '/tournaments/' +
                              tournament.id
                          )
                        }
                      >
                        View Tournament
                      </button>

                    </div>
                  )
                )}

              </div>
            )}

          </section>

          <section className="feature-grid">

            <div className="feature-panel">

              <span>&#x2605;</span>

              <div>

                <p className="small-label">
                  CHAMPIONS
                </p>

                <h3>
                  VERITAS Champions
                </h3>

                <p>
                  Follow the players dominating
                  the tournaments.
                </p>

              </div>

            </div>

            <div className="feature-panel">

              <span>&#x1F4E2;</span>

              <div>

                <p className="small-label">
                  VERITAS NEWS
                </p>

                <h3>Announcements</h3>

                <p>
                  Important announcements and
                  promotions will appear here.
                </p>

              </div>

            </div>

          </section>

        </main>
      </div>
    </div>
  )
}


