import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const APP_URL = 'https://veritas-esportss.veritasesports.workers.dev'

export default function Tournaments() {
  const navigate = useNavigate()

  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState('Open')
  const [user, setUser] = useState(null)

  const [form, setForm] = useState({
    name: '',
    room_type: 'Public',
    max_players: 8,
    format: 'Knockout',
    rules: '',
    start_date: '',
    start_time: '',
    creator_whatsapp: '',
  })

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)
  }

  async function loadTournaments() {
    setLoading(true)

    const { data, error } = await supabase
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
      .order('created_at', { ascending: false })

    if (!error) {
      const now = Date.now()

      const active = (data || []).filter((t) => {
        if (!t.expires_at) return true
        return new Date(t.expires_at).getTime() > now
      })

      setTournaments(active)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadUser()
    loadTournaments()
  }, [])

  function getJoinLink(tournamentCode) {
    return `${APP_URL}/tournaments/${tournamentCode}`
  }

  async function createTournament(e) {
    e.preventDefault()

    if (!form.name.trim()) {
      alert('Enter tournament name')
      return
    }

    if (!form.start_date || !form.start_time) {
      alert('Select start date and time')
      return
    }

    if (!creatorWhatsapp.trim()) {
      alert("Enter WhatsApp Number for Notifications number is required.")
      return
    }

    const { data, error } = await supabase.rpc('create_tournament', {
      p_name: form.name.trim(),
      p_room_type: form.room_type,
      p_max_players: Number(form.max_players),
      p_format: form.format,
      p_rules: form.rules.trim(),
      p_start_date: form.start_date,
      p_start_time: form.start_time,
      p_creator_whatsapp: form.creator_whatsapp.trim(),
    })

    if (error) {
      alert(error.message)
      return
    }

    setShowCreate(false)

    setForm({
      name: '',
      room_type: 'Public',
      max_players: 8,
      format: 'Knockout',
      rules: '',
      start_date: '',
      start_time: '',
      creator_whatsapp: '',
    })

    await loadTournaments()

    navigate(`/tournaments/${data}`)
  }

  const visible = tournaments.filter(
    (t) => t.status === activeTab
  )

  function copyLink(code) {
    const link = getJoinLink(code)

    navigator.clipboard
      .writeText(link)
      .then(() => alert('Join link copied'))
      .catch(() => prompt('Copy tournament link:', link))
  }

  function shareLink(code) {
    const link = getJoinLink(code)

    if (navigator.share) {
      navigator.share({
        title: 'VERITAS Football Tournament',
        url: link,
      })
    } else {
      copyLink(code)
    }
  }

  return (
    <div className="min-h-screen bg-[#070b14] px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              VERITAS FOOTBALL
            </h1>
<button
  type="button"
  onClick={() => navigate("/")}
  className="mb-5 mt-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white hover:bg-white/10"
>
  ← BACK TO DASHBOARD
</button>
            <p className="mt-1 text-sm text-gray-400">
              Create, join and manage tournaments.
            </p>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-white px-5 py-3 font-black text-black transition hover:bg-gray-200"
          >
            + CREATE TOURNAMENT
          </button>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto">
          {['Open', 'Ongoing', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-5 py-3 text-sm font-black ${
                activeTab === tab
                  ? 'bg-white text-black'
                  : 'bg-[#111827] text-gray-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-2xl bg-[#0d1422] p-10 text-center text-gray-400">
            Loading tournaments...
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl bg-[#0d1422] p-10 text-center">
            <p className="font-bold">No {activeTab.toLowerCase()} tournaments.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((tournament) => {
              const link = getJoinLink(tournament.tournament_code)

              return (
                <div
                  key={tournament.id}
                  className="rounded-2xl border border-white/10 bg-[#0d1422] p-5 shadow-xl"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black">
                        {tournament.name}
                      </h2>

                      <p className="mt-1 text-xs font-bold text-gray-500">
                        {tournament.game || 'Football'}
                      </p>
                    </div>

                    <span className="rounded-lg bg-white/10 px-2 py-1 text-xs font-black">
                      {tournament.room_type}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-black/20 p-3">
                      <div className="text-xs text-gray-500">Players</div>
                      <div className="mt-1 font-black">
                        {tournament.players || 0}/{tournament.max_players}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/20 p-3">
                      <div className="text-xs text-gray-500">Format</div>
                      <div className="mt-1 font-black">
                        {tournament.format}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/20 p-3">
                      <div className="text-xs text-gray-500">Start Date</div>
                      <div className="mt-1 font-black">
                        {tournament.start_date || '-'}
                      </div>
                    </div>

                    <div className="rounded-xl bg-black/20 p-3">
                      <div className="text-xs text-gray-500">Start Time</div>
                      <div className="mt-1 font-black">
                        {tournament.start_time || '-'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-2 text-xs font-black text-gray-500">
                      JOIN LINK
                    </div>

                    <div className="break-all text-xs font-bold text-gray-300">
                      {link}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => copyLink(tournament.tournament_code)}
                        className="flex-1 rounded-lg bg-white px-3 py-2 text-xs font-black text-black"
                      >
                        COPY LINK
                      </button>

                      <button
                        onClick={() => shareLink(tournament.tournament_code)}
                        className="flex-1 rounded-lg bg-gray-800 px-3 py-2 text-xs font-black"
                      >
                        SHARE
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() =>
                        navigate(`/tournaments/${tournament.id}`)
                      }
                      className="flex-1 rounded-xl bg-white py-3 text-sm font-black text-black"
                    >
                      VIEW TOURNAMENT
                    </button>

                    {user?.id === tournament.creator_id && (
                      <button
                        onClick={() =>
                          navigate(
                            `/tournaments/${tournament.id}?manage=1`
                          )
                        }
                        className="rounded-xl border border-white/20 px-4 py-3 text-sm font-black"
                      >
                        MANAGE
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={createTournament}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-[#0d1422] p-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black">
                CREATE TOURNAMENT
              </h2>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-gray-400"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Tournament Name"
                className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none"
              />

              <select
                value={form.room_type}
                onChange={(e) =>
                  setForm({ ...form, room_type: e.target.value })
                }
                className="w-full rounded-xl bg-black/30 px-4 py-3"
              >
                <option value="Public">Public</option>
                <option value="Private">Private</option>
              </select>

              <input
                type="number"
                min="2"
                value={form.max_players}
                onChange={(e) =>
                  setForm({
                    ...form,
                    max_players: e.target.value,
                  })
                }
                placeholder="Maximum Players"
                className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none"
              />

              <select
                value={form.format}
                onChange={(e) =>
                  setForm({ ...form, format: e.target.value })
                }
                className="w-full rounded-xl bg-black/30 px-4 py-3"
              >
                <option>Knockout</option>
                <option>League</option>
                <option>Group + Knockout</option>
              </select>

              <textarea
                value={form.rules}
                onChange={(e) =>
                  setForm({ ...form, rules: e.target.value })
                }
                placeholder="Rules (optional, max 200 words)"
                rows="5"
                className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none"
              />

              <input
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start_date: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-black/30 px-4 py-3"
              />

              <input
                type="time"
                value={form.start_time}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start_time: e.target.value,
                  })
                }
                className="w-full rounded-xl bg-black/30 px-4 py-3"
              />

              <input
                value={form.creator_whatsapp}
                onChange={(e) =>
                  setForm({
                    ...form,
                    creator_whatsapp: e.target.value,
                  })
                }
                placeholder="Enter WhatsApp Number for Notifications"
                className="w-full rounded-xl bg-black/30 px-4 py-3 outline-none"
              />
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-white py-4 font-black text-black"
            >
              CREATE TOURNAMENT
            </button>
          </form>
        </div>
      )}
    </div>
  )
}







