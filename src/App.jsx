import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import VerifyEmail from "./pages/Auth/VerifyEmail";
import ProtectedRoute from "./components/ProtectedRoute";

function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          veritas_user_id,
          username,
          email,
          avatar_url,
          tournament_wins,
          badges_count,
          sponsor_badge,
          kes_balance,
          vcoins,
          account_status,
          fair_play_score,
          telegram_linked
        `
        )
        .eq("id", user.id)
        .single();

      if (!error && mounted) {
        setProfile(data);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  async function copyUserId() {
    const userId = profile?.veritas_user_id;

    if (!userId) return;

    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      alert(`Your VERITAS ID is ${userId}`);
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">V</div>
        <p>Loading VERITAS...</p>
      </div>
    );
  }

  const username = profile?.username || "Player";
  const userId = profile?.veritas_user_id || "-----";
  const kesBalance = Number(profile?.kes_balance || 0).toFixed(2);
  const vcoins = profile?.vcoins ?? 0;

  return (
    <div className="app-shell">
      {/* TOP BAR */}
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark small-mark">V</div>

          <div>
            <strong>VERITAS</strong>
            <span>ESPORTS PLATFORM</span>
          </div>
        </div>

        <div className="topbar-right">
          <button
            className="topbar-icon"
            onClick={() => alert("Notifications coming soon.")}
            title="Notifications"
          >
            🔔
          </button>

          <button
            className="profile-mini"
            onClick={() => alert("Profile coming soon.")}
            title="Profile"
          >
            {username.charAt(0).toUpperCase()}
          </button>

          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard">
        {/* HERO */}
        <section className="hero-dashboard">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <div className="hero-copy">
            <div className="eyebrow hero-eyebrow">
              WELCOME BACK
            </div>

            <h1>
              <strong>{username}</strong>
            </h1>

            <p>
              Your arena is waiting. Compete, prove yourself and build your
              VERITAS legacy.
            </p>

            <div className="hero-status-row">
              <div className="status-pill">
                <span className="status-dot" />
                ACCOUNT ACTIVE
              </div>

              <div className="hero-id">
                VERITAS ID{" "}
                <strong>{userId}</strong>

                <button
                  className="copy-id-button"
                  onClick={copyUserId}
                  type="button"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>

          <div className="hero-emblem">
            <div className="emblem-ring">
              <div className="emblem-core">V</div>
            </div>

            <span>VERITAS</span>
            <small>COMPETE • PROVE • WIN</small>
          </div>
        </section>

        {/* PLAYER STATS */}
        <section className="stats-grid">
          <div className="stat-card stat-wins">
            <div className="stat-icon">🏆</div>
            <div>
              <span>TOURNAMENT WINS</span>
              <strong>{profile?.tournament_wins || 0}</strong>
            </div>
          </div>

          <div className="stat-card stat-badges">
            <div className="stat-icon">🏅</div>
            <div>
              <span>BADGES</span>
              <strong>{profile?.badges_count || 0}</strong>
            </div>
          </div>

          <div className="stat-card stat-sponsor">
            <div className="stat-icon">⭐</div>
            <div>
              <span>SPONSOR BADGE</span>
              <strong>{profile?.sponsor_badge || 0}</strong>
            </div>
          </div>

          <div className="stat-card stat-fair">
            <div className="stat-icon">⚔️</div>
            <div>
              <span>FAIR PLAY</span>
              <strong>{profile?.fair_play_score ?? 100}</strong>
            </div>
          </div>
        </section>

        {/* WALLETS */}
        <section className="wallet-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">YOUR FUNDS</span>
              <h2>Wallet</h2>
            </div>

            <button
              className="text-action"
              onClick={() => alert("Wallet coming soon.")}
            >
              View Wallet →
            </button>
          </div>

          <div className="balance-grid">
            <div className="balance-card kes-card">
              <div className="balance-content">
                <div className="balance-icon">KSh</div>

                <div>
                  <span>KES BALANCE</span>
                  <strong>KES {kesBalance}</strong>
                  <small>Available balance</small>
                </div>
              </div>

              <button
                className="wallet-add"
                onClick={() => alert("Add Money coming soon.")}
                title="Add Money"
              >
                +
              </button>
            </div>

            <div className="balance-card coin-card">
              <div className="balance-content">
                <div className="balance-icon coin-symbol">VC</div>

                <div>
                  <span>V COINS</span>
                  <strong>{vcoins}</strong>
                  <small>VERITAS marketplace currency</small>
                </div>
              </div>

              <button
                className="wallet-add"
                onClick={() => alert("V Coins coming soon.")}
                title="Get V Coins"
              >
                +
              </button>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className="quick-actions">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PLAY</span>
              <h2>Quick Actions</h2>
            </div>
          </div>

          <div className="action-grid">
            <button
              className="action-card create-action"
              onClick={() => navigate("/tournaments/create")}
            >
              <div className="action-top">
                <span className="action-icon">＋</span>
                <span className="action-arrow">↗</span>
              </div>

              <strong>Create Tournament</strong>
              <small>Build your own competition</small>
            </button>

            <button
              className="action-card join-action"
              onClick={() => navigate("/tournaments/join")}
            >
              <div className="action-top">
                <span className="action-icon">🎮</span>
                <span className="action-arrow">↗</span>
              </div>

              <strong>Join Tournament</strong>
              <small>Enter with a tournament code</small>
            </button>

            <button
              className="action-card sponsor-action"
              onClick={() => navigate("/tournaments/sponsor")}
            >
              <div className="action-top">
                <span className="action-icon">💎</span>
                <span className="action-arrow">↗</span>
              </div>

              <strong>Sponsor Tournament</strong>
              <small>Power the prize pool</small>
            </button>

            <button
              className="action-card match-action"
              onClick={() => navigate("/matches")}
            >
              <div className="action-top">
                <span className="action-icon">⚔️</span>
                <span className="action-arrow">↗</span>
              </div>

              <strong>View My Matches</strong>
              <small>See your upcoming battles</small>
            </button>
          </div>
        </section>

        {/* MY TOURNAMENTS */}
        <section className="dashboard-section tournament-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">YOUR ACTIVITY</span>
              <h2>My Tournaments</h2>
            </div>

            <button
              className="text-action"
              onClick={() => navigate("/tournaments")}
            >
              View All →
            </button>
          </div>

          <div className="tournament-tabs">
            <button className="active">Upcoming</button>
            <button>Active</button>
            <button>Completed</button>
          </div>

          <div className="empty-tournament">
            <div className="empty-icon">🏟️</div>

            <div>
              <h3>No tournaments yet</h3>
              <p>
                Join your first tournament or create one and start your VERITAS
                journey.
              </p>

              <button
                className="outline-action"
                onClick={() => navigate("/tournaments")}
              >
                Explore Tournaments →
              </button>
            </div>
          </div>
        </section>

        {/* FEATURED */}
        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">DISCOVER</span>
              <h2>Featured Tournaments</h2>
            </div>

            <button
              className="text-action"
              onClick={() => navigate("/tournaments")}
            >
              View All →
            </button>
          </div>

          <div className="featured-grid">
            <div className="featured-card featured-main">
              <div className="featured-image football-art">
                <span>⚽</span>
                <small>FOOTBALL</small>
              </div>

              <div className="featured-content">
                <span className="featured-label">
                  SPONSORED TOURNAMENT
                </span>

                <h3>VERITAS Championship</h3>

                <div className="featured-meta">
                  <div>
                    <span>PRIZE POOL</span>
                    <strong>KES —</strong>
                  </div>

                  <div>
                    <span>STATUS</span>
                    <strong>OPEN SOON</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="featured-card">
              <div className="featured-image esports-art">
                <span>🏆</span>
                <small>ESPORTS</small>
              </div>

              <div className="featured-content">
                <span className="featured-label">COMING SOON</span>

                <h3>VERITAS Open</h3>

                <div className="featured-meta">
                  <div>
                    <span>ENTRY</span>
                    <strong>FREE</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOWER INFORMATION */}
        <section className="lower-grid">
          <div className="info-panel champions-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">HALL OF FAME</span>
                <h2>Champions</h2>
              </div>

              <span className="panel-symbol">👑</span>
            </div>

            <div className="panel-empty">
              <div>👑</div>
              <p>Champions will appear here.</p>
            </div>
          </div>

          <div className="info-panel announcement-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">VERITAS NEWS</span>
                <h2>Announcements</h2>
              </div>

              <span className="panel-symbol">📢</span>
            </div>

            <div className="panel-empty">
              <div>📢</div>
              <p>No new announcements.</p>
            </div>
          </div>
        </section>

        {/* PROMOTION */}
        <section className="promotion-banner">
          <div className="promotion-v">V</div>

          <div>
            <span>VERITAS PROMOTIONS</span>
            <h2>Something big is coming.</h2>
            <p>
              Watch this space for VERITAS tournaments, rewards and special
              events.
            </p>
          </div>

          <div className="promotion-lines" />
        </section>

        {/* FOOTER */}
        <footer className="dashboard-footer">
          <div>
            <strong>VERITAS ESPORTS</strong>
            <span>Compete. Prove. Win.</span>
          </div>

          <div className="footer-actions">
            <button onClick={() => alert("Settings coming soon.")}>
              ⚙ Settings
            </button>

            <button onClick={handleLogout}>↪ Logout</button>
          </div>
        </footer>
      </main>
    </div>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function getSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setLoading(false);
      }
    }

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">V</div>
        <p>Loading VERITAS...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        path="/register"
        element={session ? <Navigate to="/" replace /> : <Register />}
      />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route
        path="/"
        element={
          <ProtectedRoute session={session}>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to={session ? "/" : "/login"} replace />}
      />
    </Routes>
  );
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}