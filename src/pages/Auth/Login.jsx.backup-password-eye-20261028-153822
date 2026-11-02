import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleLogin(e) {
    e.preventDefault();

    setError("");

    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    navigate("/");
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-mark">V</div>
          <div>
            <h1>VERITAS</h1>
            <p>eFootball Tournament Platform</p>
          </div>
        </div>

        <div className="auth-heading">
          <span>WELCOME BACK</span>
          <h2>Player Login</h2>
          <p>Enter your credentials to continue.</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              disabled={loading}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Your password"
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          <div className="forgot-row">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Logging In..." : "Login"}
          </button>
        </form>

        <div className="auth-footer">
          Don't have a VERITAS account?
          <Link to="/register">Create Account</Link>
        </div>
      </div>
    </div>
  );
}