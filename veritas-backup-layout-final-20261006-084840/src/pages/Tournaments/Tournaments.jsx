import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

const GAMES = ['Football', 'PUBG', 'COD', 'Mini Militia']

const FORMATS = [
  {
    value: 'Knockout',
    title: 'Knockout',
    description: 'Players are eliminated after losing.'
  },
  {
    value: 'League',
    title: 'League',
    description: 'Players compete in league rounds and standings.'
  },
  {
    value: 'Group+Knockout',
    title: 'Group + Knockout',
    description: 'Players begin in groups before advancing to knockout.'
  }
]

const MATCH_FORMATS = ['Bo1', 'Bo3', 'Bo5']

const MATCH_RULES = [
  {
    value: 'Full Time',
    title: 'Full Time',
    description: 'Match ends when normal time is complete.'
  },
  {
    value: 'Golden Goal',
    title: 'Golden Goal',
    description: 'First goal during the deciding period wins.'
  },
  {
    value: 'Extra Time',
    title: 'Extra Time',
    description: 'Extra time is played before penalties.'
  },
  {
    value: 'Penalties',
    title: 'Penalties',
    description: 'A penalty shootout decides the winner.'
  }
]

const MATCH_DURATIONS = ['5', '6', '10', '15']

const MANAGEMENT_OPTIONS = [
  {
    value: 'Leader Managed',
    title: 'Leader Managed',
    description: 'Tournament creator manages the tournament.'
  },
  {
    value: 'VERITAS Managed',
    title: 'VERITAS Managed',
    description: 'VERITAS handles tournament management.'
  }
]

const SETUP_MODES = [
  {
    value: 'Automatic',
    title: 'Automatic',
    description: 'VERITAS automatically prepares the tournament.'
  },
  {
    value: 'Manual',
    title: 'Manual',
    description: 'The creator handles the tournament setup manually.'
  },
  {
    value: 'Creator Assisted',
    title: 'Creator Assisted',
    description: 'VERITAS assists while the creator controls the setup.'
  }
]

const FILTERS = [
  'All',
  'Open',
  'Starting Soon',
  'Live',
  'Sponsored',
  'University',
  'Completed'
]

function getDefaultForm(roundDeadline) {
  return {
    name: '',
    game: 'Football',
    players: 8,
    format: 'Knockout',
    matchFormat: 'Bo1',
    matchRule: 'Full Time',
    matchDuration: '10',
    management: 'Leader Managed',
    setupMode: 'Automatic',
    startTime: '',
    roundDeadline: roundDeadline || '22:00',
    rules: '',
    isSponsored: false
  }
}

function formatDate(value) {
  if (!value) return 'Not set'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Not set'
  }

  return date.toLocaleString()
}

function formatDeadline(value) {
  if (!value) return 'Not set'

  const parts = String(value).split(':')

  if (parts.length < 2) {
    return value
  }

  return parts[0] + ':' + parts[1]
}

export default function Tournaments() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)

  const [activeFilter, setActiveFilter] = useState('All')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)

  const [joinCode, setJoinCode] = useState('')

  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [roundDeadlineDefault, setRoundDeadlineDefault] = useState('22:00')

  const [form, setForm] = useState(getDefaultForm('22:00'))

  const loadTournaments = async () => {
    setLoading(true)
    setError('')

    const { data, error: fetchError } = await supabase
      .from('tournaments')
      .select(`
        id,
        creator_id,
        tournament_code,
        name,
        game,
        players,
        format,
        match_format,
        match_rule,
        management,
        entry_type,
        start_time,
        round_deadline,
        rules,
        status,
        setup_mode,
        is_sponsored,
        sponsor_name,
        prize_pool,
        first_prize,
        second_prize,
        third_prize,
        creator_started,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setTournaments([])
    } else {
      setTournaments(data || [])
    }

    setLoading(false)
  }

  const loadRoundDeadline = async () => {
    const { data, error: settingsError } = await supabase
      .from('app_settings')
      .select('*')
      .eq('setting_key', 'round_deadline')
      .maybeSingle()

    if (settingsError || !data) {
      setRoundDeadlineDefault('22:00')
      return
    }

    let value = data.setting_value

    if (typeof value === 'object' && value !== null) {
      value =
        value.value ||
        value.time ||
        value.default ||
        value.setting ||
        null
    }

    if (typeof value === 'string') {
      value = value.replace(/"/g, '').trim()

      if (/^\d{2}:\d{2}/.test(value)) {
        value = value.substring(0, 5)
      }
    }

    if (value) {
      setRoundDeadlineDefault(value)

      setForm((current) => {
        if (!current.roundDeadline || current.roundDeadline === '22:00') {
          return {
            ...current,
            roundDeadline: value
          }
        }

        return current
      })
    }
  }

  useEffect(() => {
    loadTournaments()
    loadRoundDeadline()
  }, [])

  const filteredTournaments = useMemo(() => {
    if (activeFilter === 'All') {
      return tournaments
    }

    if (activeFilter === 'Sponsored') {
      return tournaments.filter((item) => item.is_sponsored)
    }

    if (activeFilter === 'University') {
      return tournaments.filter((item) => {
        const name = String(item.name || '').toLowerCase()
        const rules = String(item.rules || '').toLowerCase()

        return (
          name.includes('university') ||
          name.includes('campus') ||
          rules.includes('university') ||
          rules.includes('campus')
        )
      })
    }

    return tournaments.filter((item) => item.status === activeFilter)
  }, [activeFilter, tournaments])

  const updateForm = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }))
  }

  const resetCreateForm = () => {
    setForm(getDefaultForm(roundDeadlineDefault))
  }

  const openCreateModal = () => {
    setError('')
    setSuccess('')

    setForm((current) => ({
      ...current,
      roundDeadline: current.roundDeadline || roundDeadlineDefault
    }))

    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    if (creating) return

    setShowCreateModal(false)
    resetCreateForm()
  }

  const handleCreateTournament = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    if (!user) {
      setError('You must be logged in to create a tournament.')
      return
    }

    const name = form.name.trim()

    if (!name) {
      setError('Please enter a tournament name.')
      return
    }

    const players = Number(form.players)

    if (!Number.isInteger(players) || players < 2) {
      setError('Tournament players must be at least 2.')
      return
    }

    if (!form.startTime) {
      setError('Please select a tournament start time.')
      return
    }

    if (!form.roundDeadline) {
      setError('Please select a round deadline.')
      return
    }

    if (form.rules.trim().length > 200) {
      setError('Tournament rules must be 200 words or fewer.')
      return
    }

    setCreating(true)

    try {
      const { data, error: createError } = await supabase.rpc(
        'create_tournament',
        {
          p_name: name,
          p_game: form.game,
          p_players: players,
          p_format: form.format,
          p_match_format: form.matchFormat,
          p_match_rule: form.matchRule,
          p_management: form.management,
          p_start_time: new Date(form.startTime).toISOString(),
          p_round_deadline: form.roundDeadline,
          p_rules: form.rules.trim(),
          p_setup_mode: form.setupMode,
          p_is_sponsored: Boolean(form.isSponsored)
        }
      )

      if (createError) {
        throw createError
      }

      const createdTournament = Array.isArray(data) ? data[0] : data

      setShowCreateModal(false)

      resetCreateForm()

      setSuccess(
        'Tournament created successfully' +
          (createdTournament?.tournament_code
            ? ' â€” Code: ' + createdTournament.tournament_code
            : '.')
      )

      await loadTournaments()

      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
    } catch (createError) {
      console.error('Create tournament error:', createError)

      setError(
        createError?.message ||
          'Unable to create tournament. Please try again.'
      )
    } finally {
      setCreating(false)
    }
  }

  const handleJoinTournament = async (event) => {
    event.preventDefault()

    setError('')
    setSuccess('')

    const code = joinCode.trim().toUpperCase()

    if (!code) {
      setError('Please enter a tournament code.')
      return
    }

    setJoining(true)

    try {
      const { data, error: joinError } = await supabase.rpc(
        'join_tournament',
        {
          p_tournament_code: code
        }
      )

      if (joinError) {
        throw joinError
      }

      setShowJoinModal(false)
      setJoinCode('')

      setSuccess('You joined the tournament successfully.')

      await loadTournaments()

      console.log('Join result:', data)
    } catch (joinError) {
      console.error('Join tournament error:', joinError)

      setError(
        joinError?.message ||
          'Unable to join tournament. Please check the code.'
      )
    } finally {
      setJoining(false)
    }
  }

  const handleViewTournament = (tournament) => {
    if (!tournament?.id) return

    navigate('/tournaments/' + tournament.id)
  }

  return (
    <div className="tournaments-page">
      <header className="tournaments-header">
        <div>
          <button
            type="button"
            className="back-button"
            onClick={() => navigate('/')}
          >
            â† Back to Home
          </button>

          <h1>Tournaments</h1>

          <p>Find, create and join VERITAS competitions.</p>
        </div>

        <div className="tournament-header-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={() => {
              setError('')
              setSuccess('')
              setShowJoinModal(true)
            }}
          >
            Join Tournament
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={openCreateModal}
          >
            + Create Tournament
          </button>
        </div>
      </header>

      {success && (
        <div className="tournament-success">
          {success}
        </div>
      )}

      {error && (
        <div className="tournament-error">
          {error}
        </div>
      )}

      <div className="tournament-filters">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={
              activeFilter === filter ? 'active' : ''
            }
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      <main className="tournaments-content">
        {loading ? (
          <div className="tournament-empty">
            <div className="loading-spinner" />
            <h2>Loading tournaments</h2>
            <p>Please wait while VERITAS loads the tournaments.</p>
          </div>
        ) : filteredTournaments.length === 0 ? (
          <div className="tournament-empty">
            <div className="empty-icon">ðŸ†</div>

            <h2>
              {activeFilter === 'All'
                ? 'No tournaments yet'
                : 'No ' + activeFilter + ' tournaments'}
            </h2>

            <p>
              Create the first tournament or join one using a tournament
              code.
            </p>

            <button
              type="button"
              className="primary-action"
              onClick={openCreateModal}
            >
              + Create Tournament
            </button>
          </div>
        ) : (
          <div className="tournament-grid">
            {filteredTournaments.map((tournament) => (
              <article
                key={tournament.id}
                className="tournament-card"
              >
                <div className="tournament-card-top">
                  <span className="game-badge">
                    {tournament.game}
                  </span>

                  <span className="status-badge">
                    {tournament.status}
                  </span>
                </div>

                <h2>{tournament.name}</h2>

                {tournament.is_sponsored && (
                  <div className="sponsored-label">
                    â˜… Sponsored Tournament
                  </div>
                )}

                <div className="tournament-info-grid">
                  <div>
                    <small>Players</small>
                    <strong>{tournament.players}</strong>
                  </div>

                  <div>
                    <small>Format</small>
                    <strong>{tournament.format}</strong>
                  </div>

                  <div>
                    <small>Match</small>
                    <strong>{tournament.match_format}</strong>
                  </div>

                  <div>
                    <small>Rule</small>
                    <strong>{tournament.match_rule}</strong>
                  </div>
                </div>

                <div className="tournament-meta">
                  <div>
                    <span>Start</span>
                    <strong>
                      {formatDate(tournament.start_time)}
                    </strong>
                  </div>

                  <div>
                    <span>Round deadline</span>
                    <strong>
                      {formatDeadline(tournament.round_deadline)}
                    </strong>
                  </div>

                  <div>
                    <span>Entry</span>
                    <strong>
                      {tournament.entry_type || 'FREE'}
                    </strong>
                  </div>

                  {tournament.tournament_code && (
                    <div>
                      <span>Code</span>
                      <strong>
                        {tournament.tournament_code}
                      </strong>
                    </div>
                  )}
                </div>

                <div className="tournament-card-footer">
                  <span>
                    {tournament.management || 'Leader Managed'}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      handleViewTournament(tournament)
                    }
                  >
                    View Tournament
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* CREATE TOURNAMENT MODAL */}

      {showCreateModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal()
            }
          }}
        >
          <div
            className="tournament-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Create Tournament</h2>

                <p>
                  Set up your tournament and invite players to compete.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={closeCreateModal}
                disabled={creating}
              >
                Ã—
              </button>
            </div>

            <form onSubmit={handleCreateTournament}>
              {/* BASIC DETAILS */}

              <section className="form-section">
                <h3>Basic Details</h3>

                <label>
                  <span>Tournament Name</span>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateForm('name', event.target.value)
                    }
                    placeholder="Enter tournament name"
                    maxLength={80}
                    autoComplete="off"
                    required
                  />

                  <small className="field-help">
                    Choose a clear name players will recognize.
                  </small>
                </label>

                <label>
                  <span>Game</span>

                  <select
                    value={form.game}
                    onChange={(event) =>
                      updateForm('game', event.target.value)
                    }
                  >
                    {GAMES.map((game) => (
                      <option key={game} value={game}>
                        {game}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Number of Players</span>

                  <input
                    type="number"
                    min="2"
                    max="128"
                    value={form.players}
                    onChange={(event) =>
                      updateForm('players', event.target.value)
                    }
                    required
                  />

                  <small className="field-help">
                    Enter the maximum number of players allowed.
                  </small>
                </label>

                <div className="free-entry-box">
                  <strong>FREE ENTRY</strong>

                  <span>
                    Players do not pay an entry fee to join tournaments.
                  </span>
                </div>
              </section>

              {/* FORMAT */}

              <section className="form-section">
                <h3>Tournament Format</h3>

                <p className="field-help">
                  Choose how players will progress through the tournament.
                </p>

                <div className="option-list">
                  {FORMATS.map((option) => (
                    <label
                      key={option.value}
                      className={
                        'choice-card ' +
                        (form.format === option.value
                          ? 'selected'
                          : '')
                      }
                    >
                      <input
                        type="radio"
                        name="tournament-format"
                        value={option.value}
                        checked={form.format === option.value}
                        onChange={(event) =>
                          updateForm('format', event.target.value)
                        }
                      />

                      <span>
                        <strong>{option.title}</strong>

                        <small>{option.description}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>

              {/* MATCH SETTINGS */}

              <section className="form-section">
                <h3>Match Settings</h3>

                <div>
                  <span className="field-label">
                    Match Duration
                  </span>

                  <div className="choice-row">
                    {MATCH_DURATIONS.map((duration) => (
                      <button
                        key={duration}
                        type="button"
                        className={
                          'choice-button ' +
                          (form.matchDuration === duration
                            ? 'selected'
                            : '')
                        }
                        onClick={() =>
                          updateForm('matchDuration', duration)
                        }
                      >
                        {duration} min
                      </button>
                    ))}
                  </div>

                  <small className="field-help">
                    Select the game duration used for each match.
                  </small>
                </div>

                <div>
                  <span className="field-label">
                    Match Format
                  </span>

                  <div className="choice-row">
                    {MATCH_FORMATS.map((format) => (
                      <button
                        key={format}
                        type="button"
                        className={
                          'choice-button ' +
                          (form.matchFormat === format
                            ? 'selected'
                            : '')
                        }
                        onClick={() =>
                          updateForm('matchFormat', format)
                        }
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="field-label">
                    Match Ending Rule
                  </span>

                  <div className="option-list">
                    {MATCH_RULES.map((option) => (
                      <label
                        key={option.value}
                        className={
                          'choice-card ' +
                          (form.matchRule === option.value
                            ? 'selected'
                            : '')
                        }
                      >
                        <input
                          type="radio"
                          name="match-rule"
                          value={option.value}
                          checked={
                            form.matchRule === option.value
                          }
                          onChange={(event) =>
                            updateForm(
                              'matchRule',
                              event.target.value
                            )
                          }
                        />

                        <span>
                          <strong>{option.title}</strong>

                          <small>
                            {option.description}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              {/* SCHEDULE */}

              <section className="form-section">
                <h3>Schedule</h3>

                <label>
                  <span>Tournament Start Time</span>

                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(event) =>
                      updateForm(
                        'startTime',
                        event.target.value
                      )
                    }
                    required
                  />
                </label>

                <label>
                  <span>Round Deadline</span>

                  <input
                    type="time"
                    value={form.roundDeadline}
                    onChange={(event) =>
                      updateForm(
                        'roundDeadline',
                        event.target.value
                      )
                    }
                    required
                  />

                  <small className="field-help">
                    Current default from VERITAS settings:{' '}
                    {roundDeadlineDefault}.
                    You can change this tournament's deadline here.
                  </small>
                </label>
              </section>

              {/* MANAGEMENT */}

              <section className="form-section">
                <h3>Management</h3>

                <div>
                  <span className="field-label">
                    Tournament Management
                  </span>

                  <div className="option-list">
                    {MANAGEMENT_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={
                          'choice-card ' +
                          (form.management === option.value
                            ? 'selected'
                            : '')
                        }
                      >
                        <input
                          type="radio"
                          name="management"
                          value={option.value}
                          checked={
                            form.management === option.value
                          }
                          onChange={(event) =>
                            updateForm(
                              'management',
                              event.target.value
                            )
                          }
                        />

                        <span>
                          <strong>{option.title}</strong>

                          <small>
                            {option.description}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="field-label">
                    Setup Mode
                  </span>

                  <div className="option-list">
                    {SETUP_MODES.map((option) => (
                      <label
                        key={option.value}
                        className={
                          'choice-card ' +
                          (form.setupMode === option.value
                            ? 'selected'
                            : '')
                        }
                      >
                        <input
                          type="radio"
                          name="setup-mode"
                          value={option.value}
                          checked={
                            form.setupMode === option.value
                          }
                          onChange={(event) =>
                            updateForm(
                              'setupMode',
                              event.target.value
                            )
                          }
                        />

                        <span>
                          <strong>{option.title}</strong>

                          <small>
                            {option.description}
                          </small>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              {/* RULES */}

              <section className="form-section">
                <h3>Rules</h3>

                <label>
                  <span>Tournament Rules</span>

                  <textarea
                    value={form.rules}
                    onChange={(event) =>
                      updateForm('rules', event.target.value)
                    }
                    placeholder="Enter tournament rules. Maximum 200 words."
                    maxLength={1200}
                  />

                  <small className="field-help">
                    Keep the rules clear. Maximum 200 words.
                  </small>
                </label>
              </section>

              {/* SPONSOR */}

              <section className="form-section">
                <h3>Sponsorship</h3>

                <label className="choice-card">
                  <input
                    type="checkbox"
                    checked={form.isSponsored}
                    onChange={(event) =>
                      updateForm(
                        'isSponsored',
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    <strong>Sponsored Tournament</strong>

                    <small>
                      Sponsorship configuration and payment will be
                      connected through the VERITAS sponsorship system.
                    </small>
                  </span>
                </label>
              </section>

              {/* SUMMARY */}

              <section className="form-section">
                <h3>Tournament Summary</h3>

                <div className="tournament-info-grid">
                  <div>
                    <small>Name</small>
                    <strong>
                      {form.name.trim() || 'Not entered'}
                    </strong>
                  </div>

                  <div>
                    <small>Game</small>
                    <strong>{form.game}</strong>
                  </div>

                  <div>
                    <small>Players</small>
                    <strong>{form.players}</strong>
                  </div>

                  <div>
                    <small>Format</small>
                    <strong>{form.format}</strong>
                  </div>

                  <div>
                    <small>Match</small>
                    <strong>
                      {form.matchFormat}
                    </strong>
                  </div>

                  <div>
                    <small>Duration</small>
                    <strong>
                      {form.matchDuration} minutes
                    </strong>
                  </div>

                  <div>
                    <small>Ending</small>
                    <strong>
                      {form.matchRule}
                    </strong>
                  </div>

                  <div>
                    <small>Management</small>
                    <strong>
                      {form.management}
                    </strong>
                  </div>
                </div>
              </section>

              {/* ACTIONS */}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={closeCreateModal}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-action"
                  disabled={creating}
                >
                  {creating
                    ? 'Creating Tournament...'
                    : 'Create Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN TOURNAMENT MODAL */}

      {showJoinModal && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !joining) {
              setShowJoinModal(false)
            }
          }}
        >
          <div
            className="join-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2>Join Tournament</h2>

                <p>
                  Enter the tournament code provided by the creator.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowJoinModal(false)}
                disabled={joining}
              >
                Ã—
              </button>
            </div>

            <form onSubmit={handleJoinTournament}>
              <label>
                <span>Tournament Code</span>

                <input
                  type="text"
                  value={joinCode}
                  onChange={(event) =>
                    setJoinCode(
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="Enter tournament code"
                  maxLength={20}
                  autoComplete="off"
                  required
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => setShowJoinModal(false)}
                  disabled={joining}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-action"
                  disabled={joining}
                >
                  {joining
                    ? 'Joining...'
                    : 'Join Tournament'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
