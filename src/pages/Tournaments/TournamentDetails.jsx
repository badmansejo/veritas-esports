import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import TournamentUsername from '../../components/TournamentUsername'

const APP_URL = 'https://veritas-esportss.veritasesports.workers.dev'

function contactTournamentManager() {
  const phone = tournament?.creator_whatsapp

  if (!phone) {
    alert('Tournament manager has not provided a WhatsApp number.')
    return
  }

  const cleanPhone = String(phone).replace(/\D/g, '')

  if (!cleanPhone) {
    alert('Tournament manager WhatsApp number is invalid.')
    return
  }

  const username =
    profile?.username ||
    user?.user_metadata?.username ||
    'Player'

  const tournamentName =
    tournament?.name ||
    'VERITAS Tournament'

  const message =
    `Hi ${username}, I need help with ${tournamentName}.`

  window.open(
    `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`,
    '_blank',
    'noopener,noreferrer'
  )
}
function getWhatsAppLink(number, message) {
  if (!number) return ''
  const cleanNumber = String(number).replace(/\D/g, '')
  if (!cleanNumber) return ''
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`
}




export default function TournamentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const manageMode = searchParams.get('manage') === '1'

  const [user, setUser] = useState(null)
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')
  const [showJoin, setShowJoin] = useState(false)
  const [starting, setStarting] = useState(false)

  const [editForm, setEditForm] = useState({
    name: '',
    max_players: 8,
    format: 'Knockout',
    rules: '',
    start_date: '',
    start_time: '',
    creator_whatsapp: '',
    room_type: 'Public',
  })

  const tournamentLink = useMemo(() => {
    if (!tournament?.tournament_code) return ''
    return `${APP_URL}/tournaments/${tournament.tournament_code}`
  }, [tournament])

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)
  }

  async function loadTournament() {
    setLoading(true)

    let query = supabase
      .from('tournaments')
      .select(`
        id,
        creator_id,
        tournament_code,
        private_room_code,
        private_room_link,
        name,
        game,
        room_type,
        players,
        max_players,
        format,
        rules,
        start_date,
        start_time,
        creator_whatsapp,
        status,
        creator_started,
        expires_at,
        created_at
      `)

    const isCode = String(id || '').toUpperCase().startsWith('VRT-')

    const { data, error } = isCode
      ? await query
          .eq('tournament_code', id)
          .maybeSingle()
      : await query
          .eq('id', id)
          .maybeSingle()

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      setTournament(null)
      setLoading(false)
      return
    }

    setTournament(data)

    setEditForm({
      name: data.name || '',
      max_players: data.max_players || 8,
      format: data.format || 'Knockout',
      rules: data.rules || '',
      start_date: data.start_date || '',
      start_time: data.start_time || '',
      creator_whatsapp: data.creator_whatsapp || '',
      room_type: data.room_type || 'Public',
    })

    const { data: players, error: playersError } = await supabase
      .from('tournament_participants')
      .select('id,tournament_id,user_id,seed,joined_at,status')
      .eq('tournament_id', data.id)
      .neq('status', 'Withdrawn')
      .order('joined_at', { ascending: true })

    if (!playersError) {
      setParticipants(players || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    loadTournament()
  }, [id])

  const isCreator =
    Boolean(user?.id) &&
    Boolean(tournament?.creator_id) &&
    user.id === tournament.creator_id

  const alreadyJoined = participants.some(
    (player) => player.user_id === user?.id
  )

  const isFull =
    participants.length >= Number(tournament?.max_players || 0)

  async function joinTournament() {
    if (!whatsapp.trim()) {
      alert("WhatsApp number is required to join this tournament.")
      return
    }
    e.preventDefault()

    if (!user) {
      navigate('/login')
      return
    }

    if (!whatsapp.trim()) {
      alert('Enter your WhatsApp number')
      return
    }

    setJoining(true)

    const { error } = await supabase.rpc('join_tournament', {
      p_tournament_code: tournament.tournament_code,
      p_whatsapp: whatsapp.trim(),
    })

    if (error) {
      alert(error.message)
      setJoining(false)
      return
    }

    setJoining(false)
    setShowJoin(false)
    setWhatsapp('')

    await loadTournament()
  }

  async function copyLink() {
    if (!tournamentLink) return

    try {
      await navigator.clipboard.writeText(tournamentLink)
      alert('Cloudflare join link copied')
    } catch {
      window.prompt('Copy tournament link:', tournamentLink)
    }
  }

  async function shareLink() {
    if (!tournamentLink) return

    if (navigator.share) {
      await navigator.share({
        title: tournament?.name || 'VERITAS Tournament',
        text: 'Join this VERITAS tournament',
        url: tournamentLink,
      })
    } else {
      await copyLink()
    }
  }

  async function saveTournament() {
    if (!isCreator) return

    if (tournament.status !== 'Open') {
      alert('Tournament can only be edited before it starts')
      return
    }

    if (!editForm.name.trim()) {
      alert('Tournament name is required')
      return
    }

    if (Number(editForm.max_players) < participants.length) {
      alert('Maximum players cannot be below current players')
      return
    }

    const { error } = await supabase
      .from('tournaments')
      .update({
        name: editForm.name.trim(),
        max_players: Number(editForm.max_players),
        format: editForm.format,
        rules: editForm.rules.trim(),
        start_date: editForm.start_date || null,
        start_time: editForm.start_time || null,
        creator_whatsapp: editForm.creator_whatsapp.trim(),
        room_type: editForm.room_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tournament.id)
      .eq('creator_id', user.id)

    if (error) {
      alert(error.message)
      return
    }

    alert('Tournament updated')
    await loadTournament()
  }

  async function startTournament() {
    if (!isCreator) return

    if (participants.length < 2) {
      alert('At least 2 players are required to start')
      return
    }

    if (!window.confirm('Start this tournament now? Joining will close.')) {
      return
    }

    setStarting(true)

    const { error } = await supabase.rpc('start_tournament', {
      p_tournament_id: tournament.id,
    })

    if (error) {
      alert(error.message)
      setStarting(false)
      return
    }

    setStarting(false)
    await loadTournament()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] p-8 text-white">
        <div className="mx-auto max-w-5xl text-center text-gray-400">
          Loading tournament...
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#070b14] p-8 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-2xl font-black">Tournament not found</h1>

          <button
            onClick={() => navigate('/tournaments')}
            className="mt-5 rounded-xl bg-white px-5 py-3 font-black text-black"
          >
            BACK TO TOURNAMENTS
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#070b14] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-5xl">

        <button
          onClick={() => navigate('/tournaments')}
          className="mb-5 text-sm font-black text-gray-400 hover:text-white"
        >
          ← TOURNAMENTS
        </button>

        <div className="rounded-3xl border border-white/10 bg-[#0d1422] p-5 shadow-2xl md:p-8">

          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-white px-3 py-1 text-xs font-black text-black">
                  {tournament.status}
                </span>

                <span className="rounded-lg bg-white/10 px-3 py-1 text-xs font-black">
                  {tournament.room_type}
                </span>
              </div>

              <h1 className="text-3xl font-black">
                {tournament.name}
              </h1>

              <p className="mt-2 text-sm font-bold text-gray-500">
                {tournament.game || 'Football'}
              </p>
            </div>

            {isCreator && (
              <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                <div className="text-xs font-black text-gray-500">
                  CREATOR
                </div>

                <div className="mt-1 font-black">
                  You created this tournament.
                </div>
              </div>
            )}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-black/20 p-4">
              <div className="text-xs font-black text-gray-500">
                PLAYERS
              </div>
              <div className="mt-1 text-xl font-black">
                {participants.length}/{tournament.max_players}
              </div>
            </div>

            <div className="rounded-2xl bg-black/20 p-4">
              <div className="text-xs font-black text-gray-500">
                FORMAT
              </div>
              <div className="mt-1 font-black">
                {tournament.format}
              </div>
            </div>

            <div className="rounded-2xl bg-black/20 p-4">
              <div className="text-xs font-black text-gray-500">
                START DATE
              </div>
              <div className="mt-1 font-black">
                {tournament.start_date || '-'}
              </div>
            </div>

            <div className="rounded-2xl bg-black/20 p-4">
              <div className="text-xs font-black text-gray-500">
                START TIME
              </div>
              <div className="mt-1 font-black">
                {tournament.start_time || '-'}
              </div>
            </div>
          </div>

          {tournament.expires_at && (
            <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm font-black text-red-400">
              Tournament expires:{' '}
              {new Date(tournament.expires_at).toLocaleString()}
            </div>
          )}

          {/* CLOUDflare JOIN LINK */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="text-xs font-black tracking-wider text-gray-500">
              JOIN LINK
            </div>

            <div className="mt-2 break-all rounded-xl bg-[#070b14] p-4 text-sm font-black text-white">
              {tournamentLink}
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={copyLink}
                className="flex-1 rounded-xl bg-white px-4 py-3 text-sm font-black text-black"
              >
                COPY JOIN LINK
              </button>

              <button
                onClick={shareLink}
                className="flex-1 rounded-xl bg-gray-800 px-4 py-3 text-sm font-black"
              >
                SHARE LINK
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-black/20 p-4">
              <div className="text-xs font-black text-gray-500">
                TOURNAMENT CODE
              </div>
              <div className="mt-1 font-black">
                {tournament.tournament_code}
              </div>
            </div>

            {tournament.private_room_code && (
              <div className="rounded-2xl bg-black/20 p-4">
                <div className="text-xs font-black text-gray-500">
                  PRIVATE ROOM CODE
                </div>
                <div className="mt-1 font-black">
                  {tournament.private_room_code}
                </div>
              </div>
            )}
          </div>

          {tournament.status === 'Open' && !alreadyJoined && !isFull && (
            <button
              onClick={() => setShowJoin(true)}
              className="mt-6 w-full rounded-2xl bg-white py-4 text-sm font-black text-black"
            >
              JOIN TOURNAMENT
            </button>
          )}

          {alreadyJoined && (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-center text-sm font-black">
              You are already a player in this tournament.
            </div>
          )}

          {isFull && !alreadyJoined && (
            <div className="mt-6 rounded-2xl bg-red-500/10 p-4 text-center text-sm font-black text-red-400">
              TOURNAMENT FULL
            </div>
          )}

          {/* CREATOR MANAGEMENT */}
          {isCreator && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black">
                    MANAGE TOURNAMENT
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Creator controls
                  </p>
                </div>

                <button
                  onClick={() =>
                    navigate(
                      `/tournaments/${tournament.id}${
                        manageMode ? '' : '?manage=1'
                      }`
                    )
                  }
                  className="rounded-xl bg-white px-4 py-3 text-xs font-black text-black"
                >
                  {manageMode ? 'CLOSE MANAGER' : 'OPEN MANAGER'}
                </button>
              </div>

              {manageMode && (
                <div className="space-y-6">

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      onClick={copyLink}
                      className="rounded-xl bg-white py-3 text-xs font-black text-black"
                    >
                      COPY TOURNAMENT LINK
                    </button>

                    <button
                      onClick={() =>
                        window.open(
                          tournamentLink,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      }
                      className="rounded-xl bg-gray-800 py-3 text-xs font-black"
                    >
                      OPEN JOIN PAGE
                    </button>
                  </div>

                  {tournament.status === 'Open' && (
                    <>
                      <div className="border-t border-white/10 pt-5">
                        <h3 className="mb-4 text-sm font-black">
                          EDIT TOURNAMENT
                        </h3>

                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                name: e.target.value,
                              })
                            }
                            placeholder="Tournament Name"
                            className="rounded-xl bg-[#070b14] px-4 py-3 outline-none"
                          />

                          <select
                            value={editForm.room_type}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                room_type: e.target.value,
                              })
                            }
                            className="rounded-xl bg-[#070b14] px-4 py-3"
                          >
                            <option value="Public">Public</option>
                            <option value="Private">Private</option>
                          </select>

                          <input
                            type="number"
                            min={participants.length || 2}
                            value={editForm.max_players}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                max_players: e.target.value,
                              })
                            }
                            placeholder="Maximum Players"
                            className="rounded-xl bg-[#070b14] px-4 py-3 outline-none"
                          />

                          <select
                            value={editForm.format}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                format: e.target.value,
                              })
                            }
                            className="rounded-xl bg-[#070b14] px-4 py-3"
                          >
                            <option>Knockout</option>
                            <option>League</option>
                            <option>Group + Knockout</option>
                          </select>

                          <input
                            type="date"
                            value={editForm.start_date}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                start_date: e.target.value,
                              })
                            }
                            className="rounded-xl bg-[#070b14] px-4 py-3"
                          />

                          <input
                            type="time"
                            value={editForm.start_time}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                start_time: e.target.value,
                              })
                            }
                            className="rounded-xl bg-[#070b14] px-4 py-3"
                          />
                        </div>

                        <textarea
                          value={editForm.rules}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              rules: e.target.value,
                            })
                          }
                          rows="4"
                          placeholder="Rules"
                          className="mt-3 w-full rounded-xl bg-[#070b14] px-4 py-3 outline-none"
                        />

                        <input
                          value={editForm.creator_whatsapp}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              creator_whatsapp: e.target.value,
                            })
                          }
                          placeholder="Creator WhatsApp"
                          className="mt-3 w-full rounded-xl bg-[#070b14] px-4 py-3 outline-none"
                        />

                        <button
                          onClick={saveTournament}
                          className="mt-3 w-full rounded-xl bg-white py-3 text-sm font-black text-black"
                        >
                          SAVE CHANGES
                        </button>
                      </div>

                      <div className="border-t border-white/10 pt-5">
                        <h3 className="mb-3 text-sm font-black">
                          TOURNAMENT TABLE
                        </h3>

                        <div className="rounded-xl bg-[#070b14] p-4 text-sm text-gray-400">
                          {tournament.format === 'League'
                            ? 'League table will be used when the tournament starts.'
                            : tournament.format === 'Group + Knockout'
                              ? 'Group arrangement and knockout table will be generated when the tournament starts.'
                              : 'Knockout bracket will be generated when the tournament starts.'}
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-5">
                        <button
                          onClick={startTournament}
                          disabled={starting || participants.length < 2}
                          className="w-full rounded-xl bg-white py-4 text-sm font-black text-black disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {starting
                            ? 'STARTING...'
                            : `START TOURNAMENT (${participants.length} PLAYERS)`}
                        </button>
                      </div>
                    </>
                  )}

                  {tournament.status !== 'Open' && (
                    <div className="rounded-xl bg-white/5 p-4 text-sm font-black">
                      Tournament has started. Editing is locked.
                    </div>
                  )}

                  <div className="border-t border-white/10 pt-5">
                    <button
                      onClick={() =>
                        window.location.href =
                          'https://wa.me/?text=' +
                          encodeURIComponent(
                            `Hello, I need help with the VERITAS tournament ${tournament.name} (${tournament.tournament_code})`
                          )
                      }
                      className="w-full rounded-xl bg-gray-800 py-3 text-sm font-black"
                    >
                      CONTACT TOURNAMENT MANAGER
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PLAYERS */}
          <div className="mt-8">
            <h2 className="mb-4 text-xl font-black">
              PLAYERS
            </h2>

            {participants.length === 0 ? (
              <div className="rounded-2xl bg-black/20 p-6 text-center text-sm text-gray-500">
                No players have joined yet.
              </div>
            ) : (
              <div className="space-y-2">
                {participants.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-xl bg-black/20 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-black">
                        {index + 1}
                      </span>

                      <TournamentUsername
                        userId={player.user_id}
                        username={
                          player.user_id === user?.id
                            ? 'You'
                            : `Player ${index + 1}`
                        }
                      />
                    </div>

                    <span className="text-xs font-black text-gray-500">
                      JOINED
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RULES */}
          <div className="mt-8">
            <h2 className="mb-3 text-xl font-black">
              RULES
            </h2>

            <div className="whitespace-pre-wrap rounded-2xl bg-black/20 p-5 text-sm leading-7 text-gray-300">
              {tournament.rules || 'No special rules provided.'}
            </div>
          </div>
        </div>
      </div>

      {showJoin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={joinTournament}
            className="w-full max-w-md rounded-2xl bg-[#0d1422] p-6"
          >
            <h2 className="text-2xl font-black">
              JOIN TOURNAMENT
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Enter your WhatsApp number for tournament communication.
            </p>

            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="WhatsApp number"
              className="mt-5 w-full rounded-xl bg-black/30 px-4 py-3 outline-none"
            />

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowJoin(false)}
                className="flex-1 rounded-xl bg-gray-800 py-3 text-sm font-black"
              >
                CANCEL
              </button>

              <button
                type="submit"
                disabled={joining}
                className="flex-1 rounded-xl bg-white py-3 text-sm font-black text-black disabled:opacity-50"
              >
                {joining ? 'JOINING...' : 'JOIN'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}







