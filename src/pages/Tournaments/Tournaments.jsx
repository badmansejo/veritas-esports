import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./tournaments.css";

function formatDate(date) {
  if (!date) return "Not scheduled";

  return new Date(date).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [filter, setFilter] = useState("Open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("tournaments")
      .select(`
        *,
        profiles:creator_id (
          username,
          veritas_user_id
        )
      `)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setTournaments([]);
    } else {
      setTournaments(data || []);
    }

    setLoading(false);
  }

  const filteredTournaments =
    filter === "All"
      ? tournaments
      : tournaments.filter((tournament) => tournament.status === filter);

  return (
    <div className="tournament-page">
      <div className="tournament-container">

        <div className="tournament-header">
          <div>
            <span className="tournament-eyebrow">VERITAS COMPETITION HUB</span>
            <h1>Tournaments</h1>
            <p>
              Find your next battle, create a tournament, or join one using a
              tournament code.
            </p>
          </div>

          <div className="tournament-header-actions">
            <Link to="/tournaments/create" className="tournament-primary-btn">
              + Create Tournament
            </Link>

            <Link to="/tournaments/join" className="tournament-secondary-btn">
              Join by Code
            </Link>
          </div>
        </div>

        <div className="tournament-filter-bar">
          {[
            "All",
            "Open",
            "Starting Soon",
            "Live",
            "Completed",
          ].map((item) => (
            <button
              key={item}
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {error && (
          <div className="tournament-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="tournament-loading">
            <div className="tournament-loader" />
            <p>Loading tournaments...</p>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="empty-tournaments">
            <div className="empty-icon">⚔</div>

            <h2>No tournaments here yet</h2>

            <p>
              Be the first player to create a VERITAS tournament.
            </p>

            <Link
              to="/tournaments/create"
              className="tournament-primary-btn"
            >
              Create Tournament
            </Link>
          </div>
        ) : (
          <div className="tournament-grid">
            {filteredTournaments.map((tournament) => (
              <article
                className="tournament-card"
                key={tournament.id}
              >
                <div className="tournament-card-top">
                  <span className={`status-pill ${tournament.status
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}>
                    {tournament.status}
                  </span>

                  {tournament.sponsor_name && (
                    <span className="sponsored-pill">
                      ★ Sponsored
                    </span>
                  )}
                </div>

                <div className="tournament-card-title">
                  <span className="game-icon">⚽</span>

                  <div>
                    <h2>{tournament.name}</h2>
                    <p>{tournament.game}</p>
                  </div>
                </div>

                <div className="tournament-details-grid">
                  <div>
                    <span>PLAYERS</span>
                    <strong>{tournament.players}</strong>
                  </div>

                  <div>
                    <span>FORMAT</span>
                    <strong>{tournament.format}</strong>
                  </div>

                  <div>
                    <span>MATCH</span>
                    <strong>{tournament.match_format}</strong>
                  </div>

                  <div>
                    <span>ENTRY</span>
                    <strong>FREE</strong>
                  </div>
                </div>

                <div className="tournament-card-info">
                  <p>
                    <span>START</span>
                    {formatDate(tournament.start_time)}
                  </p>

                  <p>
                    <span>CREATOR</span>
                    @{tournament.profiles?.username || "Player"}
                  </p>
                </div>

                <div className="tournament-card-footer">
                  <div>
                    <span>CODE</span>
                    <strong>{tournament.tournament_code}</strong>
                  </div>

                  <Link
                    to={`/tournaments/join?code=${tournament.tournament_code}`}
                    className="join-tournament-btn"
                  >
                    View / Join
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}