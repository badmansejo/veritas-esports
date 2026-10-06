import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleRegister(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();

    if (!username || !email || !form.password || !form.confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        data: {
          username,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.user && !data.session) {
      setMessage(
        "Account created successfully. Check your email and click the verification link before logging in."
      );
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
          <span>CREATE ACCOUNT</span>
          <h2>Join VERITAS</h2>
          <p>Create your player account and start competing.</p>
        </div>

        <form onSubmit={handleRegister} className="auth-form">
          <label>
            Username
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Choose your username"
              autoComplete="username"
              disabled={loading}
            />
          </label>

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
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          <label>
            Confirm Password
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Repeat your password"
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          {message && <div className="auth-success">{message}</div>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Creating Account..." : "Create VERITAS Account"}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?
          <Link to="/login">Login</Link>
        </div>

        <div className="security-note">
          Your VERITAS User ID is generated automatically after registration.
        </div>
      </div>
    </div>
  );
}