import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./tournaments.css";

function formatDate(date) {
  if (!date) return "Not scheduled";

  return new Date(date).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function JoinTournament() {
  const [searchParams] = useSearchParams();

  const [code, setCode] = useState(
    searchParams.get("code") || ""
  );

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const existingCode = searchParams.get("code");

    if (existingCode) {
      setCode(existingCode);
      searchTournament(existingCode);
    }
  }, [searchParams]);

  async function searchTournament(searchCode = code) {
    const cleanCode = searchCode.trim().toUpperCase();

    if (!cleanCode) {
      setMessage("Enter a tournament code.");
      return;
    }

    setLoading(true);
    setMessage("");
    setTournament(null);

    const { data, error } = await supabase
      .from("tournaments")
      .select(`
        *,
        profiles:creator_id (
          username,
          veritas_user_id
        )
      `)
      .eq("tournament_code", cleanCode)
      .maybeSingle();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      setMessage("No tournament was found with that code.");
      setLoading(false);
      return;
    }

    setTournament(data);
    setLoading(false);
  }

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
            JOIN COMPETITION
          </span>

          <h1>Join Tournament</h1>

          <p>
            Enter the unique tournament code shared by the tournament
            creator.
          </p>
        </div>

        <div className="join-code-box">

          <label>
            Tournament Code

            <div className="code-input-row">
              <input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.toUpperCase())
                }
                placeholder="XXXXXXXX"
                maxLength={8}
              />

              <button
                onClick={() => searchTournament()}
                disabled={loading}
              >
                {loading ? "Searching..." : "Find"}
              </button>
            </div>
          </label>

          {message && (
            <div className="tournament-error">
              {message}
            </div>
          )}
        </div>

        {tournament && (
          <div className="join-result-card">

            <div className="join-result-header">
              <div>
                <span className="status-pill open">
                  {tournament.status}
                </span>

                <h2>{tournament.name}</h2>

                <p>{tournament.game}</p>
              </div>

              <div className="large-code">
                <span>TOURNAMENT CODE</span>
                <strong>{tournament.tournament_code}</strong>
              </div>
            </div>

            <div className="tournament-details-grid large-grid">

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
                <span>RULE</span>
                <strong>{tournament.match_rule}</strong>
              </div>

            </div>

            <div className="join-info-list">

              <div>
                <span>START</span>
                <strong>
                  {formatDate(tournament.start_time)}
                </strong>
              </div>

              <div>
                <span>MANAGEMENT</span>
                <strong>
                  {tournament.management}
                </strong>
              </div>

              <div>
                <span>ENTRY</span>
                <strong>FREE</strong>
              </div>

              <div>
                <span>ROUND DEADLINE</span>
                <strong>10:00 PM</strong>
              </div>

            </div>

            {tournament.rules && (
              <div className="rules-display">
                <span>TOURNAMENT RULES</span>
                <p>{tournament.rules}</p>
              </div>
            )}

            <div className="join-notice">
              <strong>Joining system coming next</strong>

              <p>
                This batch verifies the tournament code and displays
                the tournament correctly. The player-entry system,
                brackets, matches and confirmations will be connected
                in the next tournament batches.
              </p>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}