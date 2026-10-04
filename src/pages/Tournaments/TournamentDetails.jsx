import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function TournamentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function loadTournament() {
    setLoading(true)
    setError('')

    const { data, error: tournamentError } = await supabase
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
      .eq('id', id)
      .maybeSingle()

    if (tournamentError) {
      setError(tournamentError.message)
      setLoading(false)
      return
    }

    if (!tournament) {
      setError('Tournament not found.')
      setLoading(false)
      return
    }

    setTournament(data)

    const { data: participantData, error: participantError } = await supabase
      .from('tournament_participants')
      .select(`
        id,
        user_id,
        status,
        joined_at,
        profiles (
          username,
          veritas_user_id,
          avatar_url
        )
      `)
      .eq('tournament_id', id)
      .order('joined_at', { ascending: true })

    if (!participantError) {
      setParticipants(participantData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadTournament()
  }, [id])

  async function handleJoin() {
    if (!tournament) return

    setJoining(true)
    setMessage('')
    setError('')

    const { error: joinError } = await supabase.rpc('join_tournament', {
      p_tournament_code: tournament.tournament_code
    })

    if (joinError) {
      setError(joinError.message)
      setJoining(false)
      return
    }

    setMessage('You have joined this tournament successfully.')
    await loadTournament()
    setJoining(false)
  }

  const isCreator = user?.id === tournament?.creator_id

  const alreadyJoined = participants.some(
    (participant) => participant.user_id === user?.id
  )

  const activeParticipants = participants.filter(
    (participant) =>
      participant.status !== 'Withdrawn' &&
      participant.status !== 'Disqualified'
  )

  function formatDate(dateValue) {
    if (!dateValue) return 'Not set'

    return new Date(dateValue).toLocaleString('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function formatPrize(value) {
    const amount = Number(value || 0)

    return `KES ${amount.toLocaleString('en-KE')}`
  }

  if (loading) {
    return (
      <div className="tournaments-page">
        <div className="tournament-empty">
          <div className="loading-spinner"></div>
          <p>Loading tournament...</p>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="tournaments-page">
        <div className="tournament-empty">
          <h2>Tournament Not Found</h2>
          <p>{error || 'This tournament could not be found.'}</p>

          <button
            type="button"
            className="primary-button"
            onClick={() => navigate('/tournaments')}
          >
            Back to Tournaments
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="tournaments-page">
      <div className="tournaments-header">
        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => navigate('/tournaments')}
          >
            ← Back
          </button>

          <h1>{tournament.name}</h1>

          <p>
            {tournament.game} • {tournament.format} •{' '}
            {tournament.match_format}
          </p>
        </div>

        <div className="tournament-header-actions">
          {tournament.status === 'Open' &&
            !isCreator &&
            !alreadyJoined && (
              <button
                type="button"
                className="primary-button"
                onClick={handleJoin}
                disabled={joining}
              >
                {joining ? 'Joining...' : 'Join Tournament'}
              </button>
            )}

          {alreadyJoined && !isCreator && (
            <div className="free-entry-box">
              ✓ You have joined
            </div>
          )}

          {isCreator && (
            <div className="free-entry-box">
              ✓ Tournament Creator
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="tournament-success">
          {message}
        </div>
      )}

      {error && (
        <div className="tournament-error">
          {error}
        </div>
      )}

      <div className="tournament-details-layout">
        <div className="tournament-details-main">
          <section className="tournament-detail-card">
            <div className="tournament-detail-card-header">
              <div>
                <span className="game-badge">
                  {tournament.game}
                </span>

                <span className="status-badge">
                  {tournament.status}
                </span>
              </div>

              {tournament.is_sponsored && (
                <span className="sponsored-label">
                  Sponsored
                </span>
              )}
            </div>

            <div className="tournament-code-box">
              <div>
                <span>Tournament Code</span>
                <strong>{tournament.tournament_code}</strong>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  navigator.clipboard.writeText(
                    tournament.tournament_code
                  )
                }
              >
                Copy Code
              </button>
            </div>

            <div className="tournament-info-grid">
              <div className="tournament-meta">
                <span>Players</span>
                <strong>
                  {activeParticipants.length} / {tournament.players}
                </strong>
              </div>

              <div className="tournament-meta">
                <span>Format</span>
                <strong>{tournament.format}</strong>
              </div>

              <div className="tournament-meta">
                <span>Match Format</span>
                <strong>{tournament.match_format}</strong>
              </div>

              <div className="tournament-meta">
                <span>Match Rule</span>
                <strong>{tournament.match_rule}</strong>
              </div>

              <div className="tournament-meta">
                <span>Management</span>
                <strong>{tournament.management}</strong>
              </div>

              <div className="tournament-meta">
                <span>Setup</span>
                <strong>{tournament.setup_mode}</strong>
              </div>

              <div className="tournament-meta">
                <span>Start Time</span>
                <strong>
                  {formatDate(tournament.start_time)}
                </strong>
              </div>

              <div className="tournament-meta">
                <span>Round Deadline</span>
                <strong>
                  {tournament.round_deadline || 'Not set'}
                </strong>
              </div>
            </div>
          </section>

          <section className="tournament-detail-card">
            <div className="modal-header">
              <div>
                <h2>Rules</h2>
                <p>Tournament rules provided by the creator.</p>
              </div>
            </div>

            <div className="tournament-rules-box">
              {tournament.rules ? (
                <p>{tournament.rules}</p>
              ) : (
                <p>No additional rules have been provided.</p>
              )}
            </div>
          </section>

          <section className="tournament-detail-card">
            <div className="modal-header">
              <div>
                <h2>Participants</h2>
                <p>
                  {activeParticipants.length} of{' '}
                  {tournament.players} places filled.
                </p>
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="tournament-empty">
                <p>No participants yet.</p>
              </div>
            ) : (
              <div className="participant-list">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="participant-row"
                  >
                    <div className="participant-avatar">
                      {participant.profiles?.avatar_url ? (
                        <img
                          src={participant.profiles.avatar_url}
                          alt=""
                        />
                      ) : (
                        <span>
                          {(participant.profiles?.username || 'V')
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="participant-info">
                      <strong>
                        {participant.profiles?.username ||
                          'VERITAS Player'}
                      </strong>

                      <span>
                        ID:{' '}
                        {participant.profiles?.veritas_user_id ||
                          '-----'}
                      </span>
                    </div>

                    <span className="participant-status">
                      {participant.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="tournament-details-sidebar">
          <section className="tournament-detail-card">
            <h2>Prize Pool</h2>

            <div className="prize-pool-total">
              {formatPrize(tournament.prize_pool)}
            </div>

            <div className="prize-row">
              <span>1st Place</span>
              <strong>
                {formatPrize(tournament.first_prize)}
              </strong>
            </div>

            <div className="prize-row">
              <span>2nd Place</span>
              <strong>
                {formatPrize(tournament.second_prize)}
              </strong>
            </div>

            <div className="prize-row">
              <span>3rd Place</span>
              <strong>
                {formatPrize(tournament.third_prize)}
              </strong>
            </div>
          </section>

          {tournament.is_sponsored && (
            <section className="tournament-detail-card">
              <h2>Sponsor</h2>

              <p>
                {tournament.sponsor_name ||
                  'VERITAS Sponsored Tournament'}
              </p>
            </section>
          )}

          <section className="tournament-detail-card">
            <h2>Tournament Status</h2>

            <div className="status-summary">
              <span>Status</span>
              <strong>{tournament.status}</strong>
            </div>

            <div className="status-summary">
              <span>Players</span>
              <strong>
                {activeParticipants.length} / {tournament.players}
              </strong>
            </div>

            <div className="status-summary">
              <span>Creator Started</span>
              <strong>
                {tournament.creator_started ? 'Yes' : 'No'}
              </strong>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}