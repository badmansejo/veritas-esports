import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handlePasswordUpdate(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!password || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Your password has been updated successfully.");

    setTimeout(() => {
      navigate("/login");
    }, 1800);
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
          <span>SECURITY</span>
          <h2>New Password</h2>
          <p>Choose a new password for your VERITAS account.</p>
        </div>

        <form onSubmit={handlePasswordUpdate} className="auth-form">
          <label>
            New Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          <label>
            Confirm New Password
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              autoComplete="new-password"
              disabled={loading}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          {message && <div className="auth-success">{message}</div>}

          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}