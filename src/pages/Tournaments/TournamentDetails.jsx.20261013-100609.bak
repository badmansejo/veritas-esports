import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'


import TournamentUsername from '../../components/TournamentUsername'
const styles = `
.td-page{min-height:100vh;background:#080c13;color:#f3f5f8;padding:20px 14px 50px;font-family:Inter,system-ui,sans-serif}
.td-wrap{max-width:1200px;margin:auto}
.td-card{background:#111721;border:1px solid #303a49;border-radius:15px;padding:18px;margin:14px 0}
.td-title{font-size:clamp(25px,4vw,38px);font-weight:900;overflow-wrap:anywhere;margin:8px 0}
.td-muted{color:#a7b1c0;font-size:13px;line-height:1.7}
.td-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.td-btn{background:#1b2330;border:1px solid #465164;color:#f4f6f9;padding:10px 14px;border-radius:9px;cursor:pointer;font-weight:750}
.td-primary{background:#d7b56d;border-color:#d7b56d;color:#11151b}
.td-btn:disabled{opacity:.5;cursor:not-allowed}
.td-tag{display:inline-block;padding:5px 9px;border:1px solid #485365;border-radius:999px;font-size:11px;margin:0 5px 5px 0}
.td-gold{border-color:#a58a50;color:#e7cb8c}
.td-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.td-stat{background:#0b111a;border:1px solid #303a49;border-radius:12px;padding:14px}
.td-stat strong{display:block;font-size:21px;margin-top:6px}
.td-section{font-size:21px;font-weight:850;margin:24px 0 12px}
.td-error{background:#35191b;border:1px solid #7e3438;color:#ffc8c8;padding:12px;border-radius:9px;margin:12px 0;overflow-wrap:anywhere}
.td-success{background:#14291f;border:1px solid #2d6a49;color:#b7f2ce;padding:12px;border-radius:9px;margin:12px 0}
.td-person{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #28313e}
.td-person:last-child{border-bottom:0}
.td-empty{padding:20px;text-align:center;color:#a7b1c0;border:1px dashed #414957;border-radius:12px}
.td-prize{font-size:18px;font-weight:850;color:#e7cb8c}
.td-logo{max-width:130px;max-height:100px;object-fit:contain}
.td-bracket-scroll{overflow-x:auto;padding:8px 0 16px}
.td-bracket{display:flex;align-items:stretch;gap:24px;min-width:max-content}
.td-round{width:245px;display:flex;flex-direction:column;gap:14px}
.td-round-title{color:#e7cb8c;font-size:12px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px}
.td-match{background:linear-gradient(145deg,#151e2b,#0c1119);border:1px solid #344256;border-radius:12px;padding:12px;box-shadow:0 5px 18px #0005;break-inside:avoid}
.td-match-top{display:flex;justify-content:space-between;gap:8px;color:#98a8bd;font-size:11px;margin-bottom:9px}
.td-player{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:9px 8px;background:#0a1018;border:1px solid #273345;border-radius:7px;margin-top:5px;overflow-wrap:anywhere}
.td-player.winner{border-color:#c4a45e;background:#292417}
.td-player-name{font-weight:800;font-size:13px}
.td-score{font-weight:900;color:#f3d68f;white-space:nowrap}
.td-bracket-hint{font-size:12px;color:#9aa8ba;margin:8px 0 14px}
@media(max-width:600px){.td-card{padding:13px}.td-round{width:220px}.td-section{font-size:19px}}
`

function money(value) {
  return `KES ${Number(value || 0).toLocaleString('en-KE')}`
}

function formatName(value) {
  if (value === 'Group+Knockout') return 'Groups to Knockout'
  return value || 'Knockout'
}

function statusClass(status) {
  return String(status || '').toLowerCase()
}

export default function TournamentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [profiles, setProfiles] = useState({})
  const [matches, setMatches] = useState([])
  const [creator, setCreator] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadDetails = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const currentUser = authData?.user || null
      setUser(currentUser)

      let query = supabase.from('tournaments').select('*')
      query = query.eq('id', id)

      let { data: tournamentData, error: tournamentError } = await query.maybeSingle()

      // Support links that use the tournament code instead of the UUID.
      if (!tournamentData && !tournamentError) {
        const result = await supabase
          .from('tournaments')
          .select('*')
          .eq('tournament_code', id)
          .maybeSingle()
        tournamentData = result.data
        tournamentError = result.error
      }

      if (tournamentError) throw tournamentError
      if (!tournamentData) throw new Error('Tournament not found or access is unavailable.')
      setTournament(tournamentData)

      const [participantResult, creatorResult, matchResult] = await Promise.all([
        supabase
          .from('tournament_participants')
          .select('*')
          .eq('tournament_id', tournamentData.id)
          .order('joined_at', { ascending: true }),
        supabase
          .from('tournament_player_profiles')
          .select('id,username,veritas_user_id')
          .eq('id', tournamentData.creator_id)
          .maybeSingle(),
        supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', tournamentData.id)
          .order('round_number', { ascending: true })
          .order('match_number', { ascending: true }),
      ])

      if (participantResult.error) throw participantResult.error
      setParticipants(participantResult.data || [])
      setCreator(creatorResult.data || null)
      setMatches(matchResult.error ? [] : (matchResult.data || []))

      const ids = [...new Set([
        tournamentData.creator_id,
        ...(participantResult.data || []).map((p) => p.user_id),
        ...(matchResult.data || []).flatMap((m) => [m.player_one_id, m.player_two_id, m.winner_id]),
      ].filter(Boolean))]

      if (ids.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from('tournament_player_profiles')
          .select('id,username,veritas_user_id')
          .in('id', ids)

        if (profileError) console.warn('Could not load player usernames:', profileError.message)

        const map = {}
        ;(profileRows || []).forEach((p) => { map[p.id] = p })
        setProfiles(map)
        setCreator(map[tournamentData.creator_id] || creatorResult.data || null)
      } else {
        setProfiles({})
      }
    } catch (err) {
      setError(err?.message || 'Could not load tournament details.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  const activeParticipants = participants.filter(
    (p) => !['Withdrawn', 'Disqualified', 'Removed'].includes(p.status)
  )
  const isCreator = Boolean(user && tournament && tournament.creator_id === user.id)
  const maxPlayers = Number(tournament?.max_players || tournament?.players || 0)
  const sponsored = Boolean(tournament?.is_sponsored)
  const canStart = isCreator &&
    tournament?.status === 'Open' &&
    activeParticipants.length >= 2 &&
    activeParticipants.length % 2 === 0 &&
    !tournament?.creator_started

  function playerNameText(userId) {
    if (!userId) return 'BYE / Waiting'
    const name = profiles[userId]?.username
    if (name) return `@${name}`
    return 'Player'
  }

  function playerName(userId) {
    if (!userId) return <span>BYE / Waiting</span>
    const name = profiles[userId]?.username || 'Player'
    return (
      <TournamentUsername
        userId={userId}
        username={name}
      />
    )
  }

  async function copyText(value, label) {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      setNotice(`${label} copied.`)
    } catch {
      setNotice(`${label}: ${value}`)
    }
  }

  async function startTournament() {
    if (!isCreator || !tournament) return

    if (activeParticipants.length < 2 || activeParticipants.length % 2 !== 0) {
      setError('Start requires at least two active players and an even number of players.')
      return
    }

    if (tournament.format === 'Group+Knockout' && activeParticipants.length < 8) {
      setError('Groups to Knockout requires at least eight players.')
      return
    }

    if (!window.confirm('Start this tournament and generate its fixtures?')) return

    setBusy(true)
    setError('')
    setNotice('')

    try {
      const { error: rpcError } = await supabase.rpc('start_tournament', {
        p_tournament_id: tournament.id,
      })
      if (rpcError) throw rpcError
      setNotice('Tournament started. Reloading fixtures...')
      await loadDetails()
    } catch (err) {
      setError(err?.message || 'Could not start the tournament.')
    } finally {
      setBusy(false)
    }
  }

  function downloadBracket() {
    if (!tournament || matches.length === 0) {
      setError('There are no generated matches to download yet.')
      return
    }

    const grouped = [...new Set(matches.map((m) => Number(m.round_number || 1)))].sort((a, b) => a - b)
    const cardWidth = 250
    const cardHeight = 94
    const gapY = 18
    const gapX = 55
    const margin = 30
    const maxRows = Math.max(...grouped.map((round) =>
      matches.filter((m) => Number(m.round_number || 1) === round).length
    ))
    const width = margin * 2 + grouped.length * cardWidth + Math.max(0, grouped.length - 1) * gapX
    const height = margin * 2 + maxRows * (cardHeight + gapY) + 50

    const esc = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    let content = `
      <rect width="100%" height="100%" fill="#080c13"/>
      <text x="${margin}" y="35" fill="#e7cb8c" font-family="Arial" font-size="23" font-weight="bold">${esc(tournament.name)}</text>
      <text x="${margin}" y="58" fill="#9aa8ba" font-family="Arial" font-size="12">${esc(formatName(tournament.format))} · VERITAS ESPORTS</text>
    `

    grouped.forEach((round, column) => {
      const roundMatches = matches
        .filter((m) => Number(m.round_number || 1) === round)
        .sort((a, b) => Number(a.match_number || 0) - Number(b.match_number || 0))
      const x = margin + column * (cardWidth + gapX)

      content += `<text x="${x}" y="88" fill="#e7cb8c" font-family="Arial" font-size="13" font-weight="bold">ROUND ${round}</text>`

      roundMatches.forEach((match, index) => {
        const y = 105 + index * (cardHeight + gapY)
        const p1 = playerNameText(match.player_one_id)
        const p2 = playerNameText(match.player_two_id)
        const score = match.player_one_score != null
          ? `${match.player_one_score} - ${match.player_two_score ?? 0}`
          : 'VS'
        const winner = match.winner_id

        content += `
          <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="10" fill="#111721" stroke="#465164"/>
          <text x="${x + 12}" y="${y + 19}" fill="#9aa8ba" font-family="Arial" font-size="10">MATCH ${esc(match.match_number || index + 1)} · ${esc(match.status || 'Pending')}</text>
          <text x="${x + 12}" y="${y + 43}" fill="${winner === match.player_one_id ? '#e7cb8c' : '#f3f5f8'}" font-family="Arial" font-size="12" font-weight="bold">${esc(p1)}</text>
          <text x="${x + cardWidth - 12}" y="${y + 43}" fill="#e7cb8c" font-family="Arial" font-size="12" text-anchor="end">${esc(score)}</text>
          <text x="${x + 12}" y="${y + 68}" fill="${winner === match.player_two_id ? '#e7cb8c' : '#f3f5f8'}" font-family="Arial" font-size="12" font-weight="bold">${esc(p2)}</text>
        `
      })
    })

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}</svg>`
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${String(tournament.name || 'veritas-bracket').replace(/[^a-z0-9_-]/gi, '-')}-bracket.svg`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setNotice('Bracket downloaded as an SVG file.')
  }

  const prizes = [
    ['1st place', tournament?.first_prize],
    ['2nd place', tournament?.second_prize],
    ['3rd place', tournament?.third_prize],
  ].filter(([, amount]) => Number(amount || 0) > 0)

  const rounds = [...new Set(matches.map((m) => Number(m.round_number || 1)))].sort((a, b) => a - b)

  if (loading) {
    return <div className="td-page"><style>{styles}</style><div className="td-wrap"><div className="td-card">Loading tournament...</div></div></div>
  }

  if (!tournament) {
    return <div className="td-page"><style>{styles}</style><div className="td-wrap"><button className="td-btn" onClick={() => navigate('/tournaments')}>← Tournaments</button>{error && <div className="td-error">{error}</div>}</div></div>
  }

  return (
    <div className="td-page">
      <style>{styles}</style>
      <div className="td-wrap">
        <div className="td-row">
          <button className="td-btn" onClick={() => navigate('/tournaments')}>← Tournaments</button>
          <div className="td-row">
            <button className="td-btn" onClick={loadDetails}>Refresh</button>
            {matches.length > 0 && <button className="td-btn td-primary" onClick={downloadBracket}>Download Bracket</button>}
          </div>
        </div>

        {error && <div className="td-error" role="alert">{error}</div>}
        {notice && <div className="td-success" role="status">{notice}</div>}

        <section className="td-card">
          <span className={`td-tag ${sponsored ? 'td-gold' : ''}`}>{sponsored ? 'SPONSORED' : 'NORMAL'}</span>
          <span className="td-tag">{tournament.status || 'Open'}</span>
          <h1 className="td-title">{tournament.name}</h1>
          <p className="td-muted">
            Created by <strong>{creator?.username ? `@${creator.username}` : 'VERITAS player'}</strong>
            {creator?.veritas_user_id ? ` · User ID ${creator.veritas_user_id}` : ''}
          </p>

          {tournament.status !== 'Open' && (
            <div className="td-success">
              <strong>🔒 TOURNAMENT LOCKED</strong>
              <div>Joining is closed because this tournament has started or is no longer open.</div>
            </div>
          )}

          {tournament.status === 'Completed' && (
            <div className="td-success" style={{ borderColor: '#c4a45e', background: '#292417', color: '#ffe6a6' }}>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 2 }}>🏆 TOURNAMENT WINNER</div>
              <div style={{ fontSize: 24, fontWeight: 950, marginTop: 8 }}>
                {tournament.winner_id
                  ? playerName(tournament.winner_id)
                  : 'Winner not recorded'}
              </div>
              {tournament.completed_at && (
                <div className="td-muted" style={{ marginTop: 6 }}>
                  Completed: {new Date(tournament.completed_at).toLocaleString()}
                </div>
              )}
              {tournament.expires_at && (
                <div className="td-muted">
                  Results available until: {new Date(tournament.expires_at).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {sponsored && (
            <div className="td-card">
              <div className="td-row">
                <div>
                  <div className="td-muted">Sponsor</div>
                  <h3>{tournament.sponsor_name || 'Sponsor'}</h3>
                  <div className="td-prize">Prize pool: {money(tournament.prize_pool)}</div>
                  <div className="td-muted">
                    {tournament.prize_pool_funded ? 'Prize pool verified' : 'Awaiting platform funding verification'}
                  </div>
                </div>
                {tournament.sponsor_logo_url && <img className="td-logo" src={tournament.sponsor_logo_url} alt="Sponsor logo" />}
              </div>
              {prizes.length > 0 && <div className="td-grid">{prizes.map(([label, amount]) => <div className="td-stat" key={label}><span className="td-muted">{label}</span><strong>{money(amount)}</strong></div>)}</div>}
            </div>
          )}

          <div className="td-grid">
            <div className="td-stat"><span className="td-muted">Players</span><strong>{activeParticipants.length}/{maxPlayers || '—'}</strong></div>
            <div className="td-stat"><span className="td-muted">Format</span><strong>{formatName(tournament.format)}</strong></div>
            <div className="td-stat"><span className="td-muted">Match format</span><strong>{tournament.match_format || 'Bo1'}</strong></div>
            <div className="td-stat"><span className="td-muted">Match rule</span><strong>{tournament.match_rule || 'Full Time'}</strong></div>
          </div>

          <h2 className="td-section">Tournament code & link</h2>
          <div className="td-row">
            <div><strong>{tournament.tournament_code || 'Unavailable'}</strong><div className="td-muted">Share the code with players.</div></div>
            {tournament.tournament_code && <button className="td-btn" onClick={() => copyText(tournament.tournament_code, 'Tournament code')}>Copy Code</button>}
          </div>
          <div className="td-row" style={{ marginTop: 12 }}>
            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
              <strong>{`${window.location.origin}/tournaments/${tournament.tournament_code || tournament.id}`}</strong>
              <div className="td-muted">Direct tournament link</div>
            </div>
            <button className="td-btn" onClick={() => copyText(`${window.location.origin}/tournaments/${tournament.tournament_code || tournament.id}`, 'Tournament link')}>Copy Link</button>
          </div>

          {tournament.rules && <><h2 className="td-section">Rules</h2><p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{tournament.rules}</p></>}

          {isCreator && tournament.status === 'Open' && (
            <div className="td-row" style={{ marginTop: 18 }}>
              <div className="td-muted">
                {activeParticipants.length < 2
                  ? 'At least 2 players are required.'
                  : activeParticipants.length % 2 !== 0
                    ? 'An even number of players is required.'
                    : 'Ready to generate fixtures.'}
              </div>
              <button className="td-btn td-primary" disabled={!canStart || busy} onClick={startTournament}>
                {busy ? 'Starting...' : 'Start Tournament'}
              </button>
            </div>
          )}
        </section>

        <h2 className="td-section">Players ({activeParticipants.length}/{maxPlayers || 'unlimited'})</h2>
        <section className="td-card">
          {activeParticipants.length === 0 ? <div className="td-empty">No players have joined yet.</div> : activeParticipants.map((p, index) => (
            <div className="td-person" key={p.id || p.user_id || index}>
              <div><strong>{index + 1}. <TournamentUsername userId={p.user_id} username={profiles[p.user_id]?.username || (p.user_id === tournament?.creator_id ? creator?.username : null) || "Player"} /></strong><div className="td-muted">{p.user_id === tournament.creator_id ? 'Tournament creator' : 'Participant'}</div></div>
              <span className="td-tag">{p.status || 'Joined'}</span>
            </div>
          ))}
        </section>

        <h2 className="td-section">Tournament Bracket</h2>
        <section className="td-card">
          <div className="td-row">
            <div><strong>{formatName(tournament.format)}</strong><div className="td-muted">Player pairings and results update when match records change.</div></div>
            {matches.length > 0 && <button className="td-btn" onClick={downloadBracket}>Download SVG</button>}
          </div>

          {matches.length === 0 ? (
            <div className="td-empty" style={{ marginTop: 14 }}>
              {tournament.status === 'Open' ? 'The bracket appears after the creator starts the tournament.' : 'No fixture records are available yet.'}
            </div>
          ) : (
            <>
              <div className="td-bracket-hint">Scroll horizontally to view every round. Download the bracket to save or print it.</div>
              <div className="td-bracket-scroll">
                <div className="td-bracket">
                  {rounds.map((round) => (
                    <div className="td-round" key={round}>
                      <div className="td-round-title">Round {round}</div>
                      {matches.filter((m) => Number(m.round_number || 1) === round).map((match, index) => (
                        <div className="td-match" key={match.id}>
                          <div className="td-match-top"><span>Match {match.match_number || index + 1}</span><span>{match.status || 'Pending'}</span></div>
                          <div className={`td-player ${match.winner_id === match.player_one_id ? 'winner' : ''}`}>
                            <span className="td-player-name">{playerName(match.player_one_id)}</span>
                            <span className="td-score">{match.player_one_score ?? '—'}</span>
                          </div>
                          <div className={`td-player ${match.winner_id === match.player_two_id ? 'winner' : ''}`}>
                            <span className="td-player-name">{playerName(match.player_two_id)}</span>
                            <span className="td-score">{match.player_two_score ?? '—'}</span>
                          </div>
                          {match.winner_id && <div className="td-success" style={{ marginTop: 8, padding: 8 }}>🏆 <strong>WINNER: {playerName(match.winner_id)}</strong></div>}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}




