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

// Swift's UUID always serializes UPPERCASE, and the iOS host re-broadcasts each
// seat id as a Swift UUID. crypto.randomUUID() is lowercase, so we MUST uppercase
// ours — otherwise our own seat never string-matches in the host's state snapshot
// (p.id === playerId.current) and we'd time out with "no live game found".
const newId = () =>
  (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .toUpperCase()

export default function JoinGame() {
  const params = new URLSearchParams(window.location.search)
  const [code, setCode] = useState((params.get('code') || '').toUpperCase())
  // Remembered from last time (same phone, probably same person) — prefilled
  // but fully editable, so changing your name is just typing over it.
  const [name, setName] = useState(() => localStorage.getItem('rolligan:name') ?? '')
  const [stage, setStage] = useState('enter') // enter | connecting | live | ended | error
  const [error, setError] = useState('')
  const [game, setGame] = useState(null)
  // Stable per-device seat id: rejoining (refresh, new day, new game) reclaims
  // the SAME seat instead of minting a duplicate player.
  const playerId = useRef(localStorage.getItem('rolligan:pid') || newId())
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
    localStorage.setItem('rolligan:name', cleanName)
    localStorage.setItem('rolligan:pid', playerId.current)

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
        // Fires on FIRST subscribe AND on every auto-reconnect (phone slept,
        // network blipped). Re-announcing is idempotent — the host re-activates
        // our existing seat — so a sleeping phone rejoins by itself.
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
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        // Once seated, NEVER kick the player to the error screen — phones
        // sleep constantly mid-party. supabase-js reconnects on its own and
        // the SUBSCRIBED branch above re-seats us. Only a join that never
        // worked in the first place should error out.
        if (!seated.current) {
          setError('Couldn’t reach the game. Check the code and try again.')
          setStage('error')
        }
      }
    })
  }

  function bank() {
    channel.current?.send({ type: 'broadcast', event: 'bank',
      payload: { playerId: playerId.current } })
  }

  // Virtual dice: ask the host to roll for our seat. The host only honors it
  // when it's actually our turn, so a stray tap can never roll out of turn.
  function roll() {
    channel.current?.send({ type: 'broadcast', event: 'roll',
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
          : <LiveGame game={game} me={me} canBank={canBank} bank={bank} roll={roll} />
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

// One die face, pip-perfect, with a quick tumble animation on every new roll.
// Styled to read like the iOS app's 3D dice (rounded body, glossy top edge).
const PIP_GRID = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
function Die({ face, body, rollKey }) {
  const pips = PIP_GRID[Math.max(1, Math.min(6, face))] ?? []
  return (
    <div key={rollKey} className="rol-die" style={{
      background: `linear-gradient(145deg, ${body}, ${shade(body)})`,
    }}>
      <span className="rol-die-gloss" />
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="rol-pip" style={{ opacity: pips.includes(i) ? 1 : 0 }} />
      ))}
    </div>
  )
}
const shade = (hex) => hex === C.orange ? '#D14E1F' : '#37A89E'

// Round recap on every browser — winner, everyone's points, own row
// highlighted. The host auto-advances after ~7s; the next broadcast
// (roundPhase back to readyToRoll) dismisses this automatically.
function RoundRecap({ game, meId }) {
  const ranked = [...game.players].sort((a, b) => b.score - a.score)
  const banked = game.players.filter((p) => (p.bankedThisRound ?? 0) > 0)
  const top = banked.sort((a, b) => (b.bankedThisRound ?? 0) - (a.bankedThisRound ?? 0))[0]
  const busted = !!game.roundBusted
  return (
    <div style={S.recapWrap}>
      <div className="recap-card" style={{ ...S.recapCard, borderColor: busted ? C.orange : C.mint }}>
        <div style={S.tracker}>ROUND {game.round} DONE</div>
        <div style={{ ...S.recapHead, color: busted ? C.orange : C.mint }}>
          {busted ? '💥 BUSTED — pot wiped' : '🏦 Everyone banked!'}
        </div>
        {top && (
          <div style={S.recapWinner}>👑 {top.name} +{top.bankedThisRound}</div>
        )}
        <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
          {ranked.map((p, idx) => (
            <div key={p.id} className="recap-row" style={{
              ...S.recapRow,
              animationDelay: `${0.15 + idx * 0.06}s`,
              background: p.id === meId ? 'rgba(255,107,53,0.16)' : C.panelMuted,
              border: `1.5px solid ${p.id === meId ? C.orange : 'transparent'}`,
            }}>
              <span style={{ ...S.recapRank, background: idx === 0 ? C.orange : C.inkDim }}>{idx + 1}</span>
              <span style={{ fontWeight: p.id === meId ? 800 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}{p.id === meId ? ' (you)' : ''}
              </span>
              <span style={{ marginLeft: 'auto', fontWeight: 800,
                color: (p.bankedThisRound ?? 0) > 0 ? C.mint : C.inkDim }}>
                {(p.bankedThisRound ?? 0) > 0 ? `+${p.bankedThisRound}` : '—'}
              </span>
              <span style={{ fontWeight: 800, minWidth: 44, textAlign: 'right' }}>{p.score}</span>
            </div>
          ))}
        </div>
        <div style={{ color: C.inkDim, fontSize: 12, marginTop: 12 }}>Next round starting…</div>
      </div>
    </div>
  )
}

function LiveGame({ game, me, canBank, bank, roll }) {
  const roller = game.players.find((p) => p.id === game.currentRollerId)
  const virtual = game.diceMode === 'virtual'
  const myRoll = virtual && roller?.id === me?.id
    && (game.roundPhase === 'readyToRoll' || game.roundPhase === 'awaitingAction')

  // The broadcast's roll counter is a natural animation key: it changes exactly
  // once per roll, so re-keying on it replays the tumble — and never on banks.
  const rollKey = `${game.round}-${game.rollsThisRound}`
  useEffect(() => {
    // Buzz on each new roll (Android supports vibrate; iOS Safari ignores it).
    if (game.rollsThisRound > 0) navigator.vibrate?.(60)
  }, [game.round, game.rollsThisRound])

  const rollerColor = roller ? (myRoll ? C.orange : colorFor(game, roller.id)) : C.inkDim
  return (
    <div style={S.live}>
      {game.roundPhase === 'roundOver' && <RoundRecap game={game} meId={me?.id} />}
      {/* Round — big and unmissable */}
      <div style={S.roundRow}>
        <span style={S.roundBig}>ROUND {game.round}</span>
        <span style={{ color: C.inkDim, fontWeight: 600 }}>of {game.totalRounds}</span>
        <span style={{ ...S.tracker, marginLeft: 'auto' }}>
          {game.players.filter((p) => p.status === 'in').length} IN
        </span>
      </div>

      <div style={{ ...S.banner,
        background: game.inSafePhase ? 'rgba(78,205,196,0.12)' : 'rgba(255,107,53,0.12)',
        color: game.inSafePhase ? C.mint : C.orange }}>
        {game.inSafePhase
          ? `SAFE · 7 = +70 · ${game.safeRollsRemaining} left`
          : 'DANGER · 7 BUSTS THE POT'}
      </div>

      {/* Whose turn — a real banner in the roller's color, not a whisper */}
      {roller && (
        <div className={myRoll ? 'rol-your-roll' : ''} style={{ ...S.rollerBanner,
          background: `${rollerColor}24`, borderColor: rollerColor }}>
          <span style={{ ...S.rollerAvatar, background: rollerColor }}>
            {roller.name.slice(0, 1).toUpperCase()}
          </span>
          <span style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800,
              color: myRoll ? C.orange : C.ink,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {myRoll ? 'YOUR ROLL 🎲' : roller.name}
            </div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: rollerColor }}>
              {myRoll ? 'THE DICE ARE IN YOUR HAND' : 'UP TO ROLL'}
            </div>
          </span>
        </div>
      )}

      {virtual && (
        <div style={S.diceRow}>
          <Die face={game.diceA ?? 1} body={C.orange} rollKey={`a-${rollKey}`} />
          <Die face={game.diceB ?? 1} body={C.mint} rollKey={`b-${rollKey}`} />
        </div>
      )}

      <div style={S.potLabel}>POT THIS ROUND</div>
      <div style={{ ...S.pot, fontSize: virtual ? 56 : 72 }}>{game.pot}</div>

      <Leaderboard game={game} meId={me?.id} />

      {myRoll && (
        <button className="rol-roll-btn" style={S.rollBtn} onClick={roll}>
          🎲 ROLL THE DICE
        </button>
      )}

      <button style={{ ...S.bank, opacity: canBank ? 1 : 0.35, marginTop: myRoll ? 0 : 'auto' }}
        disabled={!canBank} onClick={bank}>
        {me?.status === 'banked' ? 'BANKED ✓'
          : game.bankingOpen ? `BANK · lock in ${game.pot}`
          : 'BANK OPENS AFTER 3 ROLLS'}
      </button>
    </div>
  )
}

// Live leaderboard: rows keep a stable DOM identity (keyed by player) and are
// POSITIONED by rank via translateY — so when a bank shuffles the standings,
// rows visibly glide up and down to their new spots.
const LB_ROW = 50
function Leaderboard({ game, meId }) {
  const ranked = [...game.players].sort((a, b) => b.score - a.score)
  const rankOf = {}
  ranked.forEach((p, i) => { rankOf[p.id] = i })
  return (
    <div style={{ position: 'relative', height: game.players.length * LB_ROW, margin: '4px 0' }}>
      {game.players.map((p) => {
        const banked = p.status === 'banked'
        const rank = rankOf[p.id]
        return (
          <div key={p.id} className="lb-row" style={{
            position: 'absolute', left: 0, right: 0, top: 0, height: LB_ROW - 8,
            transform: `translateY(${rank * LB_ROW}px)`,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 12px', borderRadius: 12, fontSize: 15, textAlign: 'left',
            background: p.id === meId ? 'rgba(255,107,53,0.16)' : C.panelMuted,
            border: `1.5px solid ${p.id === meId ? C.orange : 'transparent'}`,
          }}>
            <span style={{ width: 22, height: 22, borderRadius: 999, flex: 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: C.charcoal, fontWeight: 800, fontSize: 12,
              background: rank === 0 ? C.orange : C.inkDim }}>{rank + 1}</span>
            <span style={{ fontWeight: p.id === meId ? 800 : 600, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.name}{p.id === meId ? ' (you)' : ''}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, flex: 'none',
              color: banked ? C.mint : C.inkDim }}>
              {banked ? `✓ +${p.bankedThisRound ?? ''}` : p.status === 'in' ? 'IN' : 'OUT'}
            </span>
            <span style={{ fontWeight: 800, minWidth: 40, textAlign: 'right', flex: 'none',
              color: banked ? C.mint : C.ink }}>{p.score}</span>
          </div>
        )
      })}
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
  roundRow: { display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 4 },
  roundBig: { fontSize: 24, fontWeight: 800, letterSpacing: -0.5, color: C.ink },
  rollerBanner: { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 14,
    border: '2px solid', padding: '8px 12px' },
  rollerAvatar: { width: 34, height: 34, borderRadius: 999, flex: 'none',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: C.charcoal, fontWeight: 800, fontSize: 15 },
  banner: { borderRadius: 999, padding: '8px 14px', fontWeight: 800, fontSize: 14, textAlign: 'center' },
  roller: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 16 },
  dot: { width: 12, height: 12, borderRadius: 6, display: 'inline-block' },
  potLabel: { textAlign: 'center', color: C.inkDim, fontSize: 11, letterSpacing: 1.6, fontWeight: 600, marginTop: 8 },
  pot: { textAlign: 'center', color: C.orange, fontSize: 72, fontWeight: 800, lineHeight: 1 },
  players: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', margin: '8px 0' },
  diceRow: { display: 'flex', gap: 18, justifyContent: 'center', padding: '6px 0' },
  recapWrap: { position: 'fixed', inset: 0, zIndex: 80, display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: 20,
    background: 'rgba(10,10,14,0.72)' },
  recapCard: { width: '100%', maxWidth: 400, background: C.bg, borderRadius: 18,
    border: '2px solid', padding: '22px 18px', textAlign: 'center',
    boxShadow: '0 24px 70px rgba(0,0,0,0.55)' },
  recapHead: { fontSize: 22, fontWeight: 800, marginTop: 8 },
  recapWinner: { fontSize: 17, fontWeight: 800, marginTop: 6 },
  recapRow: { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12,
    padding: '8px 12px', textAlign: 'left', fontSize: 15 },
  recapRank: { width: 22, height: 22, borderRadius: 999, flex: 'none',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: C.charcoal, fontWeight: 800, fontSize: 12 },
  rollBtn: { marginTop: 'auto', background: C.orange, color: C.charcoal, border: 'none',
    borderRadius: 999, padding: '18px', fontSize: 16, fontWeight: 800, letterSpacing: 0.8,
    cursor: 'pointer', boxShadow: `0 0 24px rgba(255,107,53,0.45)` },
  playerChip: { borderRadius: 12, padding: '8px 12px', textAlign: 'center', minWidth: 64 },
  bank: { marginTop: 'auto', background: C.mint, color: C.charcoal, border: 'none',
    borderRadius: 999, padding: '18px', fontSize: 16, fontWeight: 800, letterSpacing: 0.8, cursor: 'pointer' },
  resultRow: { display: 'flex', justifyContent: 'space-between', padding: '12px 14px',
    background: C.panelMuted, borderRadius: 12, marginBottom: 6 },
}
