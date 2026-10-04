import { useEffect, useState } from "react";
import { Link, Routes, Route, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import VerifyEmail from "./pages/Auth/VerifyEmail";
import ProtectedRoute from "./components/ProtectedRoute";

function Home({ session }) {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user?.id) {
        setLoadingProfile(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (!error) {
        setProfile(data);
      }

      setLoadingProfile(false);
    }

    loadProfile();
  }, [session]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <div className="brand-mark small-mark">V</div>
          <div>
            <strong>VERITAS</strong>
            <span>ESPORTS</span>
          </div>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="dashboard">
        <section className="welcome-card">
          <div>
            <span className="eyebrow">PLAYER DASHBOARD</span>

            <h1>
              Welcome,
              <br />
              <strong>
                {loadingProfile
                  ? "Loading..."
                  : profile?.username || session.user.email}
              </strong>
            </h1>

            <p>
              Your VERITAS tournament journey starts here.
            </p>
          </div>

          <div className="player-id-card">
            <span>VERITAS USER ID</span>
            <strong>
              {loadingProfile
                ? "-----"
                : profile?.veritas_user_id || "-----"}
            </strong>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span>TOURNAMENT WINS</span>
            <strong>{profile?.tournament_wins ?? 0}</strong>
          </div>

          <div className="stat-card">
            <span>BADGES</span>
            <strong>{profile?.badges_count ?? 0}</strong>
          </div>

          <div className="stat-card">
            <span>SPONSOR BADGE</span>
            <strong>{profile?.sponsor_badge ?? 0}</strong>
          </div>

          <div className="stat-card">
            <span>FAIR PLAY</span>
            <strong>{profile?.fair_play_score ?? 100}</strong>
          </div>
        </section>

        <section className="balance-grid">
          <div className="balance-card">
            <div>
              <span>KES BALANCE</span>
              <strong>
                KES{" "}
                {Number(profile?.kes_balance ?? 0).toLocaleString(
                  "en-KE",
                  {
                    minimumFractionDigits: 2,
                  }
                )}
              </strong>
            </div>

            <button>+</button>
          </div>

          <div className="balance-card">
            <div>
              <span>V COINS</span>
              <strong>{profile?.vcoins ?? 10}</strong>
            </div>

            <button>+</button>
          </div>
        </section>

        <section className="quick-actions">
          <h2>Quick Actions</h2>

          <div className="action-grid">
            <button className="action-card">
              <span>⚡</span>
              Create Tournament
            </button>

            <button className="action-card">
              <span>🎮</span>
              Join Tournament
            </button>

            <button className="action-card">
              <span>🏆</span>
              Sponsor Tournament
            </button>

            <button className="action-card">
              <span>⚽</span>
              View My Matches
            </button>
          </div>
        </section>

        <section className="coming-section">
          <span className="eyebrow">VERITAS</span>
          <h2>Tournaments are coming next.</h2>
          <p>
            Your account foundation is now connected to Supabase. We will
            build tournaments, matches, wallet, Telegram, sponsorship,
            marketplace and administration step by step.
          </p>
        </section>
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <span>VERITAS</span>
          <h2>Page Not Found</h2>
          <p>The page you requested does not exist.</p>
        </div>

        <Link to="/login" className="primary-button link-button">
          Return to Login
        </Link>
      </div>
    </div>
  );
}

export default function App() {
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
        path="/"
        element={
          <ProtectedRoute session={session}>
            <Home session={session} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/login"
        element={session ? <Home session={session} /> : <Login />}
      />

      <Route
        path="/register"
        element={session ? <Home session={session} /> : <Register />}
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}