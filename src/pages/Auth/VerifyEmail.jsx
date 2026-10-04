import { Link } from "react-router-dom";

export default function VerifyEmail() {
  return (
    <div className="auth-page">
      <div className="auth-card verification-card">
        <div className="verification-icon">✓</div>

        <div className="brand centered-brand">
          <div className="brand-mark">V</div>
          <div>
            <h1>VERITAS</h1>
            <p>eFootball Tournament Platform</p>
          </div>
        </div>

        <div className="auth-heading">
          <span>EMAIL VERIFICATION</span>
          <h2>Check Your Email</h2>
          <p>
            Your account has been created. Open the verification email sent to
            your email address and confirm your account.
          </p>
        </div>

        <div className="verification-info">
          <strong>Important</strong>
          <p>
            You must verify your email before logging into your VERITAS
            account.
          </p>
        </div>

        <Link to="/login" className="primary-button link-button">
          Go to Login
        </Link>
      </div>
    </div>
  );
}