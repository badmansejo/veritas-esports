import { Link } from "react-router-dom";
import "./tournaments.css";

export default function SponsorTournament() {
  return (
    <div className="tournament-page">
      <div className="tournament-container narrow">

        <div className="page-back-row">
          <Link to="/tournaments" className="back-link">
            ← Back to Tournaments
          </Link>
        </div>

        <div className="form-page-heading">
          <span className="tournament-eyebrow">
            VERITAS SPONSORSHIP
          </span>

          <h1>Sponsor Tournament</h1>

          <p>
            Put your brand behind a VERITAS competition and help create
            bigger prizes for players.
          </p>
        </div>

        <div className="sponsor-coming-card">

          <div className="sponsor-icon">
            ★
          </div>

          <h2>Sponsorship is being prepared</h2>

          <p>
            The sponsorship system will connect tournament creation,
            sponsor payment, prize distribution, sponsor branding and
            VERITAS approval.
          </p>

          <div className="sponsor-feature-grid">

            <div>
              <strong>01</strong>
              <span>Sponsor Name & Logo</span>
            </div>

            <div>
              <strong>02</strong>
              <span>Prize Pool</span>
            </div>

            <div>
              <strong>03</strong>
              <span>1st / 2nd / 3rd Distribution</span>
            </div>

            <div>
              <strong>04</strong>
              <span>Sponsored Tournament Badge</span>
            </div>

          </div>

          <Link
            to="/tournaments/create"
            className="tournament-primary-btn"
          >
            Create a Free Tournament Instead
          </Link>

        </div>

      </div>
    </div>
  );
}