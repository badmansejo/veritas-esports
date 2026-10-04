import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import "./tournaments.css";

export default function CreateTournament() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    game: "Football",
    players: "8",
    format: "Knockout",
    match_format: "Bo1",
    match_rule: "Extra Time",
    management: "Leader Managed",
    start_time: "",
    rules: "",
  });

  useEffect(() => {
    getUser();
  }, []);

  async function getUser() {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    setUser(currentUser);
    setLoadingUser(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!user) {
      setError("You must be logged in to create a tournament.");
      return;
    }

    if (!form.name.trim()) {
      setError("Enter a tournament name.");
      return;
    }

    if (!form.start_time) {
      setError("Choose a tournament start time.");
      return;
    }

    if (form.rules.length > 200) {
      setError("Tournament rules cannot exceed 200 characters.");
      return;
    }

    setSaving(true);

    const { data, error: insertError } = await supabase
      .from("tournaments")
      .insert({
        creator_id: user.id,
        name: form.name.trim(),
        game: form.game,
        players: Number(form.players),
        format: form.format,
        match_format: form.match_format,
        match_rule: form.match_rule,
        management: form.management,
        entry_type: "FREE",
        start_time: new Date(form.start_time).toISOString(),
        round_deadline: "22:00",
        rules: form.rules.trim(),
        status: "Open",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    navigate(`/tournaments/join?code=${data.tournament_code}`);
  }

  if (loadingUser) {
    return (
      <div className="tournament-loading">
        <div className="tournament-loader" />
        <p>Preparing tournament creator...</p>
      </div>
    );
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
            TOURNAMENT CREATOR
          </span>

          <h1>Create Tournament</h1>

          <p>
            Set up your competition. Player entry is FREE.
          </p>
        </div>

        {error && (
          <div className="tournament-error">
            {error}
          </div>
        )}

        <form
          className="tournament-form"
          onSubmit={handleSubmit}
        >

          <section className="form-section">
            <div className="form-section-heading">
              <span>01</span>
              <div>
                <h2>Basic Information</h2>
                <p>Name your tournament and choose the game.</p>
              </div>
            </div>

            <label>
              Tournament Name
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. VERITAS Weekend Cup"
                maxLength={80}
              />
            </label>

            <label>
              Game
              <select
                name="game"
                value={form.game}
                onChange={handleChange}
              >
                <option value="Football">Football</option>
                <option value="PUBG">PUBG</option>
                <option value="COD">COD</option>
                <option value="Mini Militia">Mini Militia</option>
              </select>
            </label>

            <div className="form-two-column">
              <label>
                Number of Players
                <select
                  name="players"
                  value={form.players}
                  onChange={handleChange}
                >
                  <option value="4">4 Players</option>
                  <option value="8">8 Players</option>
                  <option value="16">16 Players</option>
                  <option value="32">32 Players</option>
                  <option value="64">64 Players</option>
                </select>
              </label>

              <label>
                Entry
                <div className="locked-field">
                  FREE
                  <span>Player entry fees are disabled</span>
                </div>
              </label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <span>02</span>
              <div>
                <h2>Tournament Format</h2>
                <p>Choose how the competition will progress.</p>
              </div>
            </div>

            <div className="choice-grid">

              <label className="choice-card">
                <input
                  type="radio"
                  name="format"
                  value="Knockout"
                  checked={form.format === "Knockout"}
                  onChange={handleChange}
                />

                <strong>Knockout</strong>
                <span>
                  Lose and you are eliminated.
                </span>
              </label>

              <label className="choice-card">
                <input
                  type="radio"
                  name="format"
                  value="League"
                  checked={form.format === "League"}
                  onChange={handleChange}
                />

                <strong>League</strong>
                <span>
                  Players compete through a league table.
                </span>
              </label>

              <label className="choice-card">
                <input
                  type="radio"
                  name="format"
                  value="Group+Knockout"
                  checked={form.format === "Group+Knockout"}
                  onChange={handleChange}
                />

                <strong>Group + Knockout</strong>
                <span>
                  Groups first, then elimination rounds.
                </span>
              </label>

            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <span>03</span>
              <div>
                <h2>Match Rules</h2>
                <p>
                  These settings will guide matches in this tournament.
                </p>
              </div>
            </div>

            <label>
              Match Format

              <select
                name="match_format"
                value={form.match_format}
                onChange={handleChange}
              >
                <option value="Bo1">Best of 1</option>
                <option value="Bo3">Best of 3</option>
                <option value="Bo5">Best of 5</option>
              </select>

              <small className="field-help">
                Bo1 = one match. Bo3 = first player to win two.
                Bo5 = first player to win three.
              </small>
            </label>

            <label>
              Match Rule

              <select
                name="match_rule"
                value={form.match_rule}
                onChange={handleChange}
              >
                <option value="Golden Goal">Golden Goal</option>
                <option value="Extra Time">Extra Time</option>
                <option value="Penalties">Penalties</option>
              </select>

              <small className="field-help">
                Choose what happens when a match ends level.
              </small>
            </label>

            <label>
              Tournament Management

              <select
                name="management"
                value={form.management}
                onChange={handleChange}
              >
                <option value="Leader Managed">
                  Leader Managed
                </option>

                <option value="VERITAS Managed">
                  VERITAS Managed
                </option>
              </select>

              <small className="field-help">
                Leader Managed lets the tournament creator coordinate
                the competition. VERITAS Managed is controlled by the
                VERITAS system.
              </small>
            </label>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <span>04</span>
              <div>
                <h2>Schedule</h2>
                <p>
                  Set when your tournament begins.
                </p>
              </div>
            </div>

            <label>
              Tournament Start

              <input
                type="datetime-local"
                name="start_time"
                value={form.start_time}
                onChange={handleChange}
              />
            </label>

            <div className="deadline-box">
              <div>
                <strong>Round Deadline</strong>
                <span>
                  Every round currently closes at 10:00 PM.
                </span>
              </div>

              <strong className="deadline-time">
                10:00 PM
              </strong>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-heading">
              <span>05</span>
              <div>
                <h2>Rules</h2>
                <p>
                  Give players the important tournament instructions.
                </p>
              </div>
            </div>

            <label>
              Tournament Rules

              <textarea
                name="rules"
                value={form.rules}
                onChange={handleChange}
                maxLength={200}
                placeholder="Example: Contact your opponent after the match is assigned. Submit your score and screenshot after the match."
              />

              <small className="character-count">
                {form.rules.length}/200
              </small>
            </label>
          </section>

          <div className="form-submit-area">
            <button
              type="submit"
              className="tournament-primary-btn large"
              disabled={saving}
            >
              {saving
                ? "Creating Tournament..."
                : "Create Tournament"}
            </button>

            <p>
              Your tournament will receive a unique VERITAS code
              after creation.
            </p>
          </div>

        </form>
      </div>
    </div>
  );
}