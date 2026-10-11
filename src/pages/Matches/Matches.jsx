import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import TournamentUsername from '../../components/TournamentUsername'

const BUCKET = 'match-evidence'
const MAX_IMAGE_SIZE = 8 * 1024 * 1024

const MATCH_SELECT = `
  id,tournament_id,match_number,round_number,
  player_one_id,player_two_id,winner_id,status,
  player_one_score,player_two_score,scheduled_time,
  confirmation_deadline,dispute_deadline,created_at,
  tournaments(id,name,game,tournament_code,creator_id,is_sponsored,support_whatsapp,creator_whatsapp)
`

const normalize = value => String(value || '').trim().toLowerCase()

function phoneLink(phone, message) {
  if (!phone) return ''
  let number = String(phone).replace(/\D/g, '')
  if (number.startsWith('0')) number = `254${number.slice(1)}`
  if (number.startsWith('7') || number.startsWith('1')) number = `254${number}`
  if (number.length < 10) return ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function remainingTime(deadline) {
  if (!deadline) return ''
  const ms = new Date(deadline).getTime() - Date.now()
  if (!Number.isFinite(ms)) return ''
  if (ms <= 0) return 'Time expired'
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${String(seconds).padStart(2, '0')}s remaining`
}

export default function Matches() {
  const navigate = useNavigate()

  const [matches, setMatches] = useState([])
  const [results, setResults] = useState({})
  const [players, setPlayers] = useState({})
  const [phones, setPhones] = useState({})
  const [evidenceUrls, setEvidenceUrls] = useState({})
  const [scores, setScores] = useState({})
  const [evidence, setEvidence] = useState({})
  const [reasons, setReasons] = useState({})
  const [clocks, setClocks] = useState(Date.now())
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('pending')

  useEffect(() => {
    const timer = setInterval(() => setClocks(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const loadMatches = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!authData?.user) throw new Error('Please log in to view your matches.')

      const uid = authData.user.id
      setUserId(uid)

      const { data: participantRows, error: participantError } = await supabase
        .from('tournament_participants')
        .select('tournament_id,user_id,whatsapp_number')
        .eq('user_id', uid)

      if (participantError) throw participantError

      const { data: createdRows, error: createdError } = await supabase
        .from('tournaments')
        .select('id')
        .eq('creator_id', uid)

      if (createdError) throw createdError

      const tournamentIds = [...new Set([
        ...(participantRows || []).map(row => row.tournament_id),
        ...(createdRows || []).map(row => row.id)
      ].filter(Boolean))]

      if (!tournamentIds.length) {
        setMatches([])
        setResults({})
        setPlayers({})
        setPhones({})
        setEvidenceUrls({})
        return
      }

      const { data: matchRows, error: matchError } = await supabase
        .from('matches')
        .select(MATCH_SELECT)
        .in('tournament_id', tournamentIds)
        .order('created_at', { ascending: false })

      if (matchError) throw matchError

      const found = (matchRows || []).filter(match =>
        match.player_one_id === uid ||
        match.player_two_id === uid ||
        match.tournaments?.creator_id === uid
      )

      setMatches(found)

      const playerIds = [...new Set(found.flatMap(match =>
        [match.player_one_id, match.player_two_id].filter(Boolean)
      ))]

      if (playerIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from('tournament_player_profiles')
          .select('id,username,veritas_user_id')
          .in('id', playerIds)

        if (profileError) throw profileError

        const playerMap = {}
        ;(profileRows || []).forEach(row => { playerMap[row.id] = row })
        setPlayers(playerMap)
      } else {
        setPlayers({})
      }

      const phoneMap = {}
      ;(participantRows || []).forEach(row => {
        if (row.whatsapp_number) {
          phoneMap[`${row.tournament_id}:${row.user_id}`] = row.whatsapp_number
        }
      })

      const { data: allParticipants, error: allParticipantsError } = await supabase
        .from('tournament_participants')
        .select('tournament_id,user_id,whatsapp_number')
        .in('tournament_id', tournamentIds)
        .in('user_id', playerIds.length ? playerIds : [uid])

      if (!allParticipantsError) {
        ;(allParticipants || []).forEach(row => {
          if (row.whatsapp_number) {
            phoneMap[`${row.tournament_id}:${row.user_id}`] = row.whatsapp_number
          }
        })
      }
      setPhones(phoneMap)

      const matchIds = found.map(match => match.id)
      if (!matchIds.length) {
        setResults({})
        setEvidenceUrls({})
        return
      }

      const { data: resultRows, error: resultError } = await supabase
        .from('match_results')
        .select(`
          id,match_id,submitted_by,player_one_score,player_two_score,
          result_status,submitted_at,confirmed_at,confirmed_by,
          evidence_url,dispute_reason,disputed_at
        `)
        .in('match_id', matchIds)
        .order('submitted_at', { ascending: false })

      if (resultError) throw resultError

      const latest = {}
      ;(resultRows || []).forEach(row => {
        if (!latest[row.match_id]) latest[row.match_id] = row
      })
      setResults(latest)

      const urls = {}
      await Promise.all(Object.values(latest).map(async row => {
        if (!row.evidence_url) return
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(row.evidence_url, 300)
        if (data?.signedUrl) urls[row.id] = data.signedUrl
      }))
      setEvidenceUrls(urls)
    } catch (err) {
      setError(err?.message || 'Could not load matches.')
      setMatches([])
      setResults({})
      setEvidenceUrls({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMatches() }, [loadMatches])

  async function chooseEvidence(matchId, file) {
    const previous = evidence[matchId]
    if (previous?.preview) URL.revokeObjectURL(previous.preview)

    if (!file) {
      setEvidence(prev => ({ ...prev, [matchId]: null }))
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Choose a JPG, PNG, or WEBP screenshot.')
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError('Screenshot must be 8 MB or smaller.')
      return
    }

    setError('')
    setEvidence(prev => ({
      ...prev,
      [matchId]: { file, preview: URL.createObjectURL(file) }
    }))
  }

  async function submitResult(match) {
    const value = scores[match.id] || {}
    const mine = Number(value.mine)
    const opponent = Number(value.opponent)
    const selected = evidence[match.id]

    if (value.mine === '' || value.mine === undefined ||
        value.opponent === '' || value.opponent === undefined ||
        !Number.isInteger(mine) || !Number.isInteger(opponent) ||
        mine < 0 || opponent < 0) {
      setError('Enter both scores as non-negative whole numbers.')
      return
    }
    if (!selected?.file) {
      setError('Upload a screenshot before submitting the result.')
      return
    }

    setBusy(match.id)
    setError('')
    setNotice('')
    let path = ''

    try {
      const ext = (selected.file.name.split('.').pop() || 'jpg')
        .toLowerCase().replace(/[^a-z0-9]/g, '')
      path = `${userId}/${match.id}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, selected.file, {
          contentType: selected.file.type,
          upsert: false
        })
      if (uploadError) throw uploadError

      const isPlayerOne = match.player_one_id === userId
      const { error: rpcError } = await supabase.rpc('submit_match_result', {
        p_match_id: match.id,
        p_my_score: mine,
        p_opponent_score: opponent,
        p_evidence_url: path
      })
      if (rpcError) {
        await supabase.storage.from(BUCKET).remove([path])
        path = ''
        throw rpcError
      }

      setNotice('Result submitted. The opponent and tournament creator can review it.')
      if (selected.preview) URL.revokeObjectURL(selected.preview)
      setEvidence(prev => ({ ...prev, [match.id]: null }))
      setScores(prev => ({ ...prev, [match.id]: { mine: '', opponent: '' } }))
      await loadMatches()
    } catch (err) {
      setError(err?.message || 'Could not submit result.')
    } finally {
      setBusy('')
    }
  }

  async function confirmResult(match) {
    const result = results[match.id]
    if (!result) {
      setError('No submitted result is available to confirm.')
      return
    }

    const creator = match.tournaments?.creator_id === userId
    if (result.submitted_by === userId && !creator) {
      setError('You cannot confirm your own submitted result.')
      return
    }
    if (!window.confirm('Confirm this score and finalize the match?')) return

    setBusy(match.id)
    setError('')
    try {
      const { error: rpcError } = await supabase.rpc('confirm_match_result', {
        p_match_id: match.id
      })
      if (rpcError) throw rpcError
      setNotice('Result confirmed. The match status has been updated.')
      await loadMatches()
    } catch (err) {
      setError(err?.message || 'Could not confirm result.')
    } finally {
      setBusy('')
    }
  }

  async function disputeResult(match) {
    const reason = (reasons[match.id] || '').trim()
    if (reason.length < 5) {
      setError('Enter a dispute reason of at least 5 characters.')
      return
    }

    setBusy(match.id)
    setError('')
    try {
      const { error: rpcError } = await supabase.rpc('dispute_match_result', {
        p_match_id: match.id,
        p_reason: reason
      })
      if (rpcError) throw rpcError
      setNotice('Dispute submitted.')
      await loadMatches()
    } catch (err) {
      setError(err?.message || 'Could not submit dispute.')
    } finally {
      setBusy('')
    }
  }

  function getStatus(match) {
    const resultStatus = normalize(results[match.id]?.result_status)
    const matchStatus = normalize(match.status)

    if (['completed', 'confirmed', 'cancelled', 'forfeit'].includes(matchStatus)) {
      return 'completed'
    }
    if (resultStatus.includes('disput')) return 'disputed'
    if (results[match.id] || ['result submitted', 'disputed'].includes(matchStatus)) {
      return 'pending'
    }
    return 'pending'
  }

  function playerName(id) {
    return players[id]?.username ? `@${players[id].username}` : 'Waiting for player'
  }

  function playerCode(id) {
    return players[id]?.veritas_user_id || ''
  }

  function isActive(match) {
    return !['completed', 'confirmed', 'cancelled', 'forfeit'].includes(normalize(match.status))
  }

  const visibleMatches = matches.filter(match => {
    const status = getStatus(match)
    if (filter === 'pending') return status === 'pending' || status === 'disputed'
    if (filter === 'completed') return status === 'completed'
    return true
  })

  const styles = `
    .mt-page{min-height:100vh;background:#080c13;color:#f3f5f8;padding:22px 14px 48px;font-family:Inter,system-ui,sans-serif}
    .mt-wrap{max-width:1000px;margin:auto}
    .mt-back,.mt-btn{background:#1b2330;border:1px solid #465164;color:#f4f6f9;padding:10px 14px;border-radius:9px;cursor:pointer;font-weight:750;text-decoration:none;display:inline-block}
    .mt-primary{background:#d7b56d;border-color:#d7b56d;color:#11151b}
    .mt-title{font-size:clamp(27px,4vw,38px);font-weight:900;margin:24px 0 6px}
    .mt-muted{color:#a7b1c0;font-size:13px;line-height:1.65;overflow-wrap:anywhere}
    .mt-card{background:#111721;border:1px solid #303a49;border-radius:15px;padding:17px;margin-top:14px}
    .mt-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
    .mt-badge{display:inline-block;border:1px solid #485365;border-radius:99px;padding:5px 10px;font-size:11px}
    .mt-pending{border-color:#a58a50;color:#e7cb8c}
    .mt-disputed{border-color:#9d454b;color:#ffb8bd}
    .mt-completed{border-color:#397653;color:#a9edc3}
    .mt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}
    .mt-player{background:#0b111a;border:1px solid #303a49;border-radius:12px;padding:13px;min-width:0}
    .mt-player-name{font-size:17px;font-weight:900;overflow-wrap:anywhere}
    .mt-score{font-size:27px;font-weight:900;margin-top:5px}
    .mt-field{width:100%;box-sizing:border-box;background:#090e16;color:white;border:1px solid #394251;border-radius:9px;padding:11px;margin-top:5px}
    .mt-label{display:block;color:#b9c2d0;font-size:13px;margin-top:12px}
    .mt-upload{width:100%;box-sizing:border-box;background:#090e16;color:white;border:1px dashed #4b586b;padding:12px;border-radius:9px;margin-top:7px}
    .mt-preview{max-width:100%;max-height:260px;object-fit:contain;display:block;margin-top:12px;border-radius:10px}
    .mt-note{padding:12px;background:#0b111a;border:1px solid #303a49;border-radius:10px;margin-top:14px;overflow-wrap:anywhere}
    .mt-error{padding:12px;background:#35191b;border:1px solid #7e3438;color:#ffc8c8;border-radius:9px;margin-top:12px}
    .mt-success{padding:12px;background:#14291f;border:1px solid #2d6a49;color:#b7f2ce;border-radius:9px;margin-top:12px}
    .mt-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
    .mt-tabs button[aria-pressed="true"]{background:#d7b56d;color:#11151b;border-color:#d7b56d}
    @media(max-width:580px){.mt-grid{grid-template-columns:1fr}}
  `

  return (
    <main className="mt-page">
      <style>{styles}</style>
      <div className="mt-wrap">
        <button className="mt-back" onClick={() => navigate('/')}>← Dashboard</button>
        <div className="mt-row">
          <div>
            <h1 className="mt-title">My Matches</h1>
            <div className="mt-muted">Your matches across every tournament you joined or created.</div>
          </div>
          <button className="mt-btn" onClick={loadMatches} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && <div className="mt-error" role="alert">{error}</div>}
        {notice && <div className="mt-success" role="status">{notice}</div>}
        {loading && <div className="mt-card">Loading your matches…</div>}

        {!loading && !error && (
          <>
            <div className="mt-tabs">
              <button className="mt-btn" aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>Pending</button>
              <button className="mt-btn" aria-pressed={filter === 'completed'} onClick={() => setFilter('completed')}>Completed</button>
              <button className="mt-btn" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All matches</button>
            </div>

            {visibleMatches.length === 0 && (
              <div className="mt-card">
                <h3>{filter === 'completed' ? 'No completed matches yet' : 'No matches to show'}</h3>
                <p className="mt-muted">Once a tournament starts and fixtures are generated, your matches appear here.</p>
                <button className="mt-btn mt-primary" onClick={() => navigate('/tournaments')}>Browse tournaments</button>
              </div>
            )}

            {visibleMatches.map(match => {
              const result = results[match.id]
              const resultStatus = normalize(result?.result_status)
              const creator = match.tournaments?.creator_id === userId
              const playerOne = match.player_one_id === userId
              const playerTwo = match.player_two_id === userId
              const isPlayer = playerOne || playerTwo
              const opponentId = playerOne ? match.player_two_id : match.player_one_id
              const finished = getStatus(match) === 'completed'
              const disputed = getStatus(match) === 'disputed'
              const pendingResponse = Boolean(result) && !finished && !disputed
              const submittedByMe = result?.submitted_by === userId
              const canSubmit = isPlayer && isActive(match) &&
                (!result || ['rejected', 'expired'].includes(resultStatus))
              const canConfirm = isActive(match) && pendingResponse &&
                (creator || (isPlayer && !submittedByMe))
              const selected = evidence[match.id]
              const statusLabel = disputed ? 'DISPUTED' : finished ? 'COMPLETED' : result ? 'PENDING CONFIRMATION' : 'AWAITING RESULT'
              const statusClass = disputed ? 'mt-disputed' : finished ? 'mt-completed' : 'mt-pending'
              const opponentPhone = phones[`${match.tournament_id}:${opponentId}`]
              const creatorPhone = phones[`${match.tournament_id}:${match.tournaments?.creator_id}`]
              const message = `Hi, I'm contacting you about ${match.tournaments?.name || 'our tournament'} on VERITAS.`
              const opponentLink = isPlayer ? phoneLink(opponentPhone, message) : ''
              const creatorLink = phoneLink(creatorPhone || match.tournaments?.creator_whatsapp || match.tournaments?.support_whatsapp, `Hi, I need help with ${match.tournaments?.name || 'a tournament'} on VERITAS.`)
              const deadline = result?.submitted_at
                ? new Date(new Date(result.submitted_at).getTime() + 30 * 60 * 1000).toISOString()
                : match.confirmation_deadline

              return (
                <article className="mt-card" key={match.id}>
                  <div className="mt-row">
                    <div>
                      <h3 style={{ margin: '0 0 5px' }}>{match.tournaments?.name || 'Tournament match'}</h3>
                      <div className="mt-muted">
                        {match.tournaments?.game || 'Game'} · Round {match.round_number || 1} · Match {match.match_number || '—'}
                      </div>
                    </div>
                    <span className={`mt-badge ${statusClass}`}>{statusLabel}</span>
                  </div>

                  <div className="mt-grid">
                    {[match.player_one_id, match.player_two_id].map((id, index) => {
                      const score = index === 0
                        ? result?.player_one_score ?? match.player_one_score
                        : result?.player_two_score ?? match.player_two_score
                      return (
                        <div className="mt-player" key={`${match.id}-${index}`}>
                          <TournamentUsername
                            userId={id}
                            username={playerName(id)}
                            className="mt-player-name"
                          />
                          <div className="mt-muted">
                            {playerCode(id) ? `VERITAS ID: ${playerCode(id)}` : ''}
                            {id === userId ? ' · You' : ''}
                          </div>
                          <div className="mt-score">{score ?? '—'}</div>
                        </div>
                      )
                    })}
                  </div>

                  {result && (
                    <div className="mt-note">
                      <div><strong>Result:</strong> {result.result_status}</div>
                      {pendingResponse && deadline && (
                        <div className="mt-muted">Confirmation clock: {remainingTime(deadline, clocks)}</div>
                      )}
                      {result.dispute_reason && <p className="mt-muted">Dispute: {result.dispute_reason}</p>}
                      {evidenceUrls[result.id] && (
                        <a href={evidenceUrls[result.id]} target="_blank" rel="noreferrer" className="mt-btn" style={{ marginTop: 10 }}>
                          View screenshot proof
                        </a>
                      )}
                    </div>
                  )}

                  <div className="mt-row" style={{ marginTop: 12 }}>
                    {opponentLink && <a className="mt-btn" href={opponentLink} target="_blank" rel="noreferrer">Contact opponent</a>}
                    {creatorLink && isPlayer && <a className="mt-btn" href={creatorLink} target="_blank" rel="noreferrer">Contact creator</a>}
                    <button className="mt-btn" onClick={() => navigate(`/tournaments/${match.tournament_id}`)}>View tournament</button>
                  </div>

                  {canSubmit && (
                    <section style={{ marginTop: 18 }}>
                      <h4>Submit score and screenshot</h4>
                      <div className="mt-grid">
                        <label className="mt-label">Your score
                          <input className="mt-field" type="number" min="0" step="1" value={scores[match.id]?.mine ?? ''} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], mine: e.target.value } }))} />
                        </label>
                        <label className="mt-label">Opponent score
                          <input className="mt-field" type="number" min="0" step="1" value={scores[match.id]?.opponent ?? ''} onChange={e => setScores(prev => ({ ...prev, [match.id]: { ...prev[match.id], opponent: e.target.value } }))} />
                        </label>
                      </div>
                      <label className="mt-label">Screenshot proof (required)
                        <input className="mt-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => chooseEvidence(match.id, e.target.files?.[0] || null)} />
                      </label>
                      {selected?.preview && <img className="mt-preview" src={selected.preview} alt="Selected match screenshot" />}
                      <button className="mt-btn mt-primary" disabled={busy === match.id} onClick={() => submitResult(match)}>
                        {busy === match.id ? 'Submitting…' : 'Submit result'}
                      </button>
                    </section>
                  )}

                  {canConfirm && (
                    <section style={{ marginTop: 18 }}>
                      <p className="mt-muted">Review the submitted score and screenshot before confirming.</p>
                      <button className="mt-btn mt-primary" disabled={busy === match.id} onClick={() => confirmResult(match)}>
                        {busy === match.id ? 'Confirming…' : 'Confirm result'}
                      </button>
                      {isPlayer && !submittedByMe && (
                        <>
                          <label className="mt-label">Dispute reason
                            <input className="mt-field" value={reasons[match.id] || ''} onChange={e => setReasons(prev => ({ ...prev, [match.id]: e.target.value }))} placeholder="Explain what is incorrect" />
                          </label>
                          <button className="mt-btn" disabled={busy === match.id} onClick={() => disputeResult(match)}>Report dispute</button>
                        </>
                      )}
                    </section>
                  )}

                  {submittedByMe && pendingResponse && (
                    <p className="mt-muted" style={{ marginTop: 14 }}>Submitted. Waiting for the opponent or tournament creator to review.</p>
                  )}

                  {disputed && (
                    <p className="mt-muted" style={{ marginTop: 14 }}>
                      Disputed result. Contact the creator to resolve it{match.tournaments?.is_sponsored ? ' or request an admin review.' : '.'}
                    </p>
                  )}

                  {creator && !isPlayer && !finished && !result && (
                    <p className="mt-muted" style={{ marginTop: 14 }}>Creator view: waiting for the players to submit a result.</p>
                  )}
                </article>
              )
            })}
          </>
        )}
      </div>
    </main>
  )
}

