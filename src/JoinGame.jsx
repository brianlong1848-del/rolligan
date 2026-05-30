// Rolligan — web join page (rolligan.com/join). Join-only client per
// MULTIPLAYER.md: enter a room code + name, see the live shared pot, and tap
// your own BANK. The iOS banker is the authority; we render its broadcasts.

import { useEffect, useRef, useState } from 'react'
import { supabase, roomChannel } from './supabaseClient.js'

const C = {
  bg: '#1A1A20', panel: '#22222A', panelMuted: '#121217',
  ink: '#F8F7F4', inkDim: 'rgba(248,247,244,0.5)', rule: 'rgba(248,247,244,0.12)',
  orange: '#FF6B35', mint: '#4ECDC4', charcoal: '#1A1A20',
}
const PLAYER_COLORS = ['#FF6B35', '#4ECDC4', '#F5C24B', '#B084FF', '#FF8FA3',
  '#76D672', '#5BB8FF', '#FF9E64', '#C9B789', '#E25AB8']

const newId = () =>
  (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

export default function JoinGame() {
  const params = new URLSearchParams(window.location.search)
  const [code, setCode] = useState((params.get('code') || '').toUpperCase())
  const [name, setName] = useState('')
  const [stage, setStage] = useState('enter') // enter | connecting | live | ended | error
  const [error, setError] = useState('')
  const [game, setGame] = useState(null)
  const playerId = useRef(newId())
  const channel = useRef(null)
  const lastRev = useRef(-1)
  const joinTimer = useRef(null)
  const seated = useRef(false)

  useEffect(() => () => {
    clearTimeout(joinTimer.current)
    channel.current?.unsubscribe()
  }, [])

  function join() {
    const cleanCode = code.trim().toUpperCase()
    const cleanName = name.trim()
    if (cleanCode.length < 4 || !cleanName) return
    if (!supabase) { setError('Live games aren’t configured yet.'); setStage('error'); return }

    setStage('connecting')
    seated.current = false
    const ch = supabase.channel(roomChannel(cleanCode), {
      config: { broadcast: { ack: true } },
    })
    channel.current = ch

    ch.on('broadcast', { event: 'state' }, ({ payload }) => {
      if (payload.rev <= lastRev.current) return
      lastRev.current = payload.rev
      setGame(payload)
      // Only go live once the host has actually given us a seat — anyone can
      // subscribe to any channel, so receiving state alone doesn't mean we're in.
      if (payload.players?.some((p) => p.id === playerId.current)) {
        seated.current = true
        clearTimeout(joinTimer.current)
        setStage((s) => (s === 'connecting' ? 'live' : s))
      }
    })
    ch.on('broadcast', { event: 'host-bye' }, () => setStage('ended'))

    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        ch.send({ type: 'broadcast', event: 'join',
          payload: { playerId: playerId.current, name: cleanName } })
        // If no seat arrives, the code is almost certainly wrong (or the game
        // is full / already finished). Don't spin forever.
        clearTimeout(joinTimer.current)
        joinTimer.current = setTimeout(() => {
          if (!seated.current) {
            setError(`No live game found for code ${cleanCode}, or it’s already full. Double-check the code with the banker.`)
            setStage('error')
          }
        }, 8000)
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setError('Couldn’t reach the game. Check the code and try again.')
        setStage('error')
      }
    })
  }

  function bank() {
    channel.current?.send({ type: 'broadcast', event: 'bank',
      payload: { playerId: playerId.current } })
  }

  const me = game?.players?.find((p) => p.id === playerId.current)
  const canBank = game?.bankingOpen && me?.status === 'in'

  return (
    <div style={S.root}>
      {stage === 'enter' && <EnterCard {...{ code, setCode, name, setName, join }} />}
      {stage === 'connecting' && <Centered>Joining {code}…</Centered>}
      {stage === 'error' && (
        <Centered>
          <div style={{ color: C.orange, marginBottom: 12 }}>{error}</div>
          <button style={S.secondary} onClick={() => setStage('enter')}>Back</button>
        </Centered>
      )}
      {stage === 'ended' && <Centered>The banker ended the game. 👋</Centered>}
      {stage === 'live' && game && (
        game.phase === 'finished'
          ? <Results game={game} meId={playerId.current} />
          : <LiveGame game={game} me={me} canBank={canBank} bank={bank} />
      )}
    </div>
  )
}

function EnterCard({ code, setCode, name, setName, join }) {
  return (
    <div style={S.card}>
      <div style={S.eyebrow}>JOIN A GAME</div>
      <h1 style={S.wordmark}>Rolligan</h1>
      <input style={S.input} value={code} placeholder="ROOM CODE"
        maxLength={4} autoCapitalize="characters"
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} />
      <input style={S.input} value={name} placeholder="Your name" maxLength={20}
        onChange={(e) => setName(e.target.value)} />
      <button style={{ ...S.primary, opacity: code.length >= 4 && name.trim() ? 1 : 0.4 }}
        disabled={code.length < 4 || !name.trim()} onClick={join}>
        JOIN GAME →
      </button>
      <div style={S.hint}>Get the code from whoever’s holding the dice.</div>
    </div>
  )
}

function LiveGame({ game, me, canBank, bank }) {
  const roller = game.players.find((p) => p.id === game.currentRollerId)
  return (
    <div style={S.live}>
      <div style={S.topRow}>
        <span style={S.tracker}>ROUND {game.round} / {game.totalRounds}</span>
        <span style={S.tracker}>{game.players.filter((p) => p.status === 'in').length} IN</span>
      </div>

      <div style={{ ...S.banner,
        background: game.inSafePhase ? 'rgba(78,205,196,0.12)' : 'rgba(255,107,53,0.12)',
        color: game.inSafePhase ? C.mint : C.orange }}>
        {game.inSafePhase
          ? `SAFE · 7 = +70 · ${game.safeRollsRemaining} left`
          : 'DANGER · 7 BUSTS THE POT'}
      </div>

      {roller && (
        <div style={S.roller}>
          <span style={{ ...S.dot, background: colorFor(game, roller.id) }} />
          <b>{roller.name}</b>&nbsp;<span style={{ color: C.inkDim }}>up to roll</span>
        </div>
      )}

      <div style={S.potLabel}>POT THIS ROUND</div>
      <div style={S.pot}>{game.pot}</div>

      <div style={S.players}>
        {game.players.map((p) => (
          <div key={p.id} style={{ ...S.playerChip,
            border: `1.5px solid ${p.id === me?.id ? C.orange : 'transparent'}`,
            background: p.status === 'banked' ? 'rgba(78,205,196,0.14)' : C.panelMuted }}>
            <div style={{ fontWeight: 800 }}>{p.score}</div>
            <div style={{ fontSize: 11, color: C.inkDim }}>{p.name}{p.id === me?.id ? ' (you)' : ''}</div>
            <div style={{ fontSize: 10, fontWeight: 800,
              color: p.status === 'banked' ? C.mint : (p.status === 'in' ? C.ink : C.inkDim) }}>
              {p.status === 'banked' ? `✓ +${p.bankedThisRound ?? ''}` : p.status === 'in' ? 'IN' : 'OUT'}
            </div>
          </div>
        ))}
      </div>

      <button style={{ ...S.bank, opacity: canBank ? 1 : 0.35 }} disabled={!canBank} onClick={bank}>
        {me?.status === 'banked' ? 'BANKED ✓'
          : game.bankingOpen ? `BANK · lock in ${game.pot}`
          : 'BANK OPENS AFTER 3 ROLLS'}
      </button>
    </div>
  )
}

function Results({ game, meId }) {
  const sorted = [...game.players].sort((a, b) => b.score - a.score)
  const top = sorted[0]?.score ?? 0
  return (
    <div style={S.card}>
      <div style={S.eyebrow}>WINNER</div>
      <h1 style={{ ...S.wordmark, fontSize: 48 }}>
        {sorted.filter((p) => p.score === top).map((p) => p.name).join(' & ')}
      </h1>
      <div style={{ color: C.mint, marginBottom: 20 }}>with {top} points</div>
      {sorted.map((p) => (
        <div key={p.id} style={{ ...S.resultRow, color: p.score === top ? C.ink : C.inkDim }}>
          <span>{p.name}{p.id === meId ? ' (you)' : ''}</span>
          <span style={{ fontWeight: 800, color: p.score === top ? C.orange : C.inkDim }}>{p.score}</span>
        </div>
      ))}
    </div>
  )
}

const Centered = ({ children }) => <div style={S.centered}>{children}</div>
const colorFor = (game, id) =>
  PLAYER_COLORS[Math.max(0, game.players.findIndex((p) => p.id === id)) % PLAYER_COLORS.length]

const S = {
  root: { minHeight: '100vh', background: C.bg, color: C.ink,
    fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
    display: 'flex', justifyContent: 'center' },
  card: { width: '100%', maxWidth: 420, padding: '64px 24px',
    display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'stretch' },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh', gap: 12, color: C.inkDim, padding: 24, textAlign: 'center' },
  eyebrow: { color: C.orange, letterSpacing: 2.2, fontSize: 11, fontWeight: 700, textAlign: 'center' },
  wordmark: { color: C.orange, fontSize: 64, fontWeight: 800, textAlign: 'center', margin: '4px 0 16px', letterSpacing: -1.5 },
  input: { background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 12,
    padding: '16px 18px', color: C.ink, fontSize: 18, fontWeight: 600, outline: 'none' },
  primary: { background: C.orange, color: C.charcoal, border: 'none', borderRadius: 999,
    padding: '18px', fontSize: 16, fontWeight: 800, letterSpacing: 1, cursor: 'pointer', marginTop: 6 },
  secondary: { background: 'transparent', color: C.ink, border: `1.5px solid ${C.rule}`,
    borderRadius: 999, padding: '12px 28px', fontWeight: 600, cursor: 'pointer' },
  hint: { color: C.inkDim, fontSize: 13, textAlign: 'center', marginTop: 4 },
  live: { width: '100%', maxWidth: 460, padding: '24px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 },
  topRow: { display: 'flex', justifyContent: 'space-between' },
  tracker: { color: C.inkDim, fontSize: 11, fontWeight: 600, letterSpacing: 1.6 },
  banner: { borderRadius: 999, padding: '8px 14px', fontWeight: 800, fontSize: 14, textAlign: 'center' },
  roller: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, display: 'inline-block' },
  potLabel: { textAlign: 'center', color: C.inkDim, fontSize: 11, letterSpacing: 1.6, fontWeight: 600, marginTop: 8 },
  pot: { textAlign: 'center', color: C.orange, fontSize: 72, fontWeight: 800, lineHeight: 1 },
  players: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '8px 0' },
  playerChip: { borderRadius: 12, padding: '8px 12px', textAlign: 'center', minWidth: 64 },
  bank: { marginTop: 'auto', background: C.mint, color: C.charcoal, border: 'none',
    borderRadius: 999, padding: '18px', fontSize: 16, fontWeight: 800, letterSpacing: 0.8, cursor: 'pointer' },
  resultRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
    background: C.panelMuted, borderRadius: 12, marginBottom: 6 },
}
