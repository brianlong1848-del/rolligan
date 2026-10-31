// Rolligan — web host / banker mode (the Android app). Runs the authoritative
// engine (src/engine) in this browser and hosts the room over Supabase
// Realtime exactly like the iOS banker, so iOS and web joiners work unchanged.
//
// Gate: hosting is offered only inside the Android app (Play Billing's Digital
// Goods API is the tell). First 3 games free, then one $2.99 unlock.

import { useEffect, useRef, useState } from 'react'
import { GameState, GamePhase, RoundPhase } from '../engine/GameState.js'
import { RoomHost } from '../engine/RoomHost.js'
import { makeConfig, DiceMode, ScoreEntry, MAX_PLAYERS, MIN_ROUNDS, MAX_ROUNDS,
  PRESET_ROUNDS, BONUS_PRESETS, SAFE_ROLLS_RANGE, DEFAULT_ROUNDS, DEFAULT_SAFE_ROLLS,
  DEFAULT_SAFE_SEVEN_BONUS } from '../engine/GameConfig.js'
import { makePlayer, RosterStore } from '../engine/Player.js'
import { C, PhotosCtx, colorFor, squareJpeg, wireFromDataUrl } from '../ui/shared.js'
import { Avatar, Die, Confetti } from '../ui/components.jsx'
import { hostingAvailable, canStartGame, recordGameStarted, freeGamesLeft, isPro,
  refreshEntitlement } from '../billing/entitlement.js'
import { useObservable } from './useObservable.js'
import { saveHostGame, loadHostGame, clearHostGame } from './hostSave.js'
import Paywall from './Paywall.jsx'
import { supabase } from '../supabaseClient.js'

export default function HostGame() {
  if (!hostingAvailable()) return <JoinOnly />
  if (!supabase) return <Centered>Live games aren’t configured yet (missing Supabase env).</Centered>
  return <HostApp />
}

function JoinOnly() {
  return (
    <Centered>
      <div style={S.eyebrow}>HOST A GAME</div>
      <div style={{ color: C.ink, fontWeight: 700, fontSize: 18 }}>Hosting lives in the Rolligan app.</div>
      <div>Get Rolligan on the App Store or Google Play to be the banker. Joining a friend’s game is free right here.</div>
      <a href="/join" style={{ ...S.primary, display: 'inline-block', textDecoration: 'none', marginTop: 10 }}>JOIN A GAME →</a>
    </Centered>
  )
}

// ── Remembered photos for one-phone players (by name, like iOS roster photos) ──
const PHOTOS_KEY = 'rolligan:hostPhotos'
const loadRosterPhotos = () => { try { return JSON.parse(localStorage.getItem(PHOTOS_KEY) || '{}') } catch { return {} } }
const saveRosterPhotos = (m) => { try { localStorage.setItem(PHOTOS_KEY, JSON.stringify(m)) } catch { /* full */ } }
const nameKey = (n) => (n || '').trim().toLowerCase()

function HostApp() {
  const [game] = useState(() => new GameState())
  const [host] = useState(() => new RoomHost(game))
  useObservable(game)
  useObservable(host)
  const [showPaywall, setShowPaywall] = useState(false)
  const [pro, setPro] = useState(isPro())

  useEffect(() => { refreshEntitlement().then(setPro) }, [])

  // Persist the live game (+ room code) so a killed tab can resume on the same channel.
  useEffect(() => game.subscribe(() => {
    if (game.phase === GamePhase.playing && host.code) saveHostGame(host, game)
    else clearHostGame()
  }), [game, host])

  // ?resume=1 → pick the saved game back up on its original code.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('resume')) return
    const save = loadHostGame()
    if (!save || game.phase !== GamePhase.setup) return
    game.restore(save.game)
    // +10: the save is written before the broadcast that follows it bumps rev.
    host.start(save.code, (save.rev ?? 0) + 10)
    const remembered = loadRosterPhotos()
    for (const p of game.players) {
      const d = remembered[nameKey(p.name)]
      if (d) wireFromDataUrl(d).then((w) => w && host.setAvatar(p.id, w))
    }
  }, [game, host])

  // Photos the room knows (remote joiners' + ours), by seat id.
  const photos = {}
  for (const p of game.players) { const d = host.avatarDataUrl(p.id); if (d) photos[p.id] = d }

  function start(config, photosById) {
    if (!canStartGame()) { setShowPaywall(true); return }
    recordGameStarted()
    RosterStore.save(config.players.map((p) => p.name))
    game.startGame(config)
    host.start()
    const remembered = loadRosterPhotos()
    for (const p of config.players) {
      const d = photosById[p.id]
      if (d) remembered[nameKey(p.name)] = d
      else if (photosById[p.id] === '') delete remembered[nameKey(p.name)]
      const use = d ?? remembered[nameKey(p.name)]
      if (use) wireFromDataUrl(use).then((w) => w && host.setAvatar(p.id, w))
    }
    saveRosterPhotos(remembered)
  }

  function leaveToSetup() {
    host.stop()
    clearHostGame()
    game.returnToSetup()
  }

  return (
    <PhotosCtx.Provider value={photos}>
      <div style={S.root}>
        {showPaywall && (
          <Paywall onUnlocked={() => { setPro(true); setShowPaywall(false) }} onClose={() => setShowPaywall(false)} />
        )}
        {!showPaywall && game.phase === GamePhase.setup && <Setup onStart={start} pro={pro} />}
        {!showPaywall && game.phase === GamePhase.playing && <Board game={game} host={host} onQuit={leaveToSetup} />}
        {!showPaywall && game.phase === GamePhase.finished && (
          <Results game={game} host={host} onNewGame={leaveToSetup}
            onPlayAgain={() => {
              const cfg = { ...game.config, players: game.config.players.map((p) => ({ ...p, score: 0 })) }
              host.stop()
              game.returnToSetup()
              start(cfg, {})
            }} />
        )}
      </div>
    </PhotosCtx.Provider>
  )
}

// ── Setup ─────────────────────────────────────────────────────────────────
function Setup({ onStart, pro }) {
  const [players, setPlayers] = useState(() => RosterStore.seedPlayers())
  const [photosById, setPhotosById] = useState({})
  const [remembered] = useState(() => loadRosterPhotos())
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS)
  const [safeRolls, setSafeRolls] = useState(DEFAULT_SAFE_ROLLS)
  const [bonus, setBonus] = useState(DEFAULT_SAFE_SEVEN_BONUS)
  const [diceMode, setDiceMode] = useState(DiceMode.physical)
  const [scoreEntry, setScoreEntry] = useState(ScoreEntry.soleBanker)
  const left = pro ? null : freeGamesLeft()
  const resume = loadHostGame()

  const setName = (i, name) => setPlayers((ps) => ps.map((p, k) => (k === i ? { ...p, name } : p)))
  const remove = (i) => setPlayers((ps) => (ps.length > 1 ? ps.filter((_, k) => k !== i) : ps))
  const add = () => setPlayers((ps) => (ps.length < MAX_PLAYERS ? [...ps, makePlayer('')] : ps))
  async function pick(id, file) {
    if (!file) return
    try { const d = await squareJpeg(file, 256, 0.8); setPhotosById((m) => ({ ...m, [id]: d })) } catch { /* ignore */ }
  }
  const photoFor = (p) => photosById[p.id] ?? (photosById[p.id] === '' ? null : remembered[nameKey(p.name)])

  function start() {
    const resolved = players.map((p, i) => ({ ...p, name: p.name.trim() || `Player ${i + 1}`, score: 0 }))
    onStart(makeConfig({ players: resolved, rounds, safeRolls, safeSevenBonus: bonus, diceMode, scoreEntry }), photosById)
  }

  return (
    <div style={S.card}>
      <div style={S.eyebrow}>HOST A GAME</div>
      <h1 style={S.wordmark}>Rolligan</h1>
      {resume && (
        <a href="/host?resume=1" style={{ ...S.secondary, textDecoration: 'none', textAlign: 'center', borderColor: C.mint, color: C.mint }}>
          RESUME GAME · ROOM {resume.code}
        </a>
      )}

      <div style={S.tracker}>PLAYERS ON THIS PHONE · {players.length}</div>
      <div style={S.hint}>Just you is fine — everyone else joins by code on their own phone.</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {players.map((p, i) => {
          const photo = photoFor(p)
          return (
            <div key={p.id} style={S.row}>
              <label style={{ cursor: 'pointer' }} title="Add a photo">
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={(e) => { pick(p.id, e.target.files?.[0]); e.target.value = '' }} />
                {photo
                  ? <img src={photo} alt="" style={{ width: 36, height: 36, borderRadius: 999, objectFit: 'cover' }} />
                  : <span style={{ ...S.circle, background: colorFor(players, p.id) }}>{(p.name.trim()[0] || `${i + 1}`).toUpperCase()}</span>}
              </label>
              <input style={S.input} value={p.name} placeholder={`Player ${i + 1}`} maxLength={20}
                onChange={(e) => setName(i, e.target.value)} />
              {photo && <button style={S.iconBtn} title="Remove photo"
                onClick={() => setPhotosById((m) => ({ ...m, [p.id]: '' }))}>📷✕</button>}
              <button style={{ ...S.iconBtn, opacity: players.length > 1 ? 1 : 0.3 }} disabled={players.length <= 1}
                onClick={() => remove(i)} aria-label="Remove player">✕</button>
            </div>
          )
        })}
      </div>
      <button style={S.secondary} onClick={add} disabled={players.length >= MAX_PLAYERS}>+ Add a player</button>

      <div style={S.tracker}>ROUNDS</div>
      <Segmented options={PRESET_ROUNDS.map((r) => [r, String(r)])} value={rounds} onChange={setRounds} />
      <Stepper value={rounds} min={MIN_ROUNDS} max={MAX_ROUNDS} onChange={setRounds} label="rounds" />

      <div style={S.tracker}>DICE</div>
      <Segmented options={[[DiceMode.physical, 'Real dice'], [DiceMode.virtual, 'Virtual dice']]} value={diceMode} onChange={setDiceMode} />
      {diceMode === DiceMode.physical ? (
        <>
          <div style={S.hint}>Who types each roll’s total?</div>
          <Segmented options={[[ScoreEntry.soleBanker, 'Just the banker'], [ScoreEntry.eachRoller, 'Each roller, own phone']]}
            value={scoreEntry} onChange={setScoreEntry} />
        </>
      ) : <div style={S.hint}>The app rolls — on this phone or the roller’s own.</div>}

      <div style={S.tracker}>HOUSE RULES</div>
      <Stepper value={safeRolls} min={SAFE_ROLLS_RANGE[0]} max={SAFE_ROLLS_RANGE[1]} onChange={setSafeRolls} label="safe rolls" />
      <div style={S.hint}>Bonus for a 7 during the safe rolls</div>
      <Segmented options={BONUS_PRESETS.map((b) => [b, `+${b}`])} value={bonus} onChange={setBonus} />

      <button style={{ ...S.primary, marginTop: 10 }} onClick={start}>START GAME →</button>
      <div style={S.hint}>
        {pro ? 'Unlocked ✓ · unlimited games'
          : left > 0 ? `${left} of 3 free games left, then $2.99 once.` : 'Free games used — unlock Rolligan to keep hosting.'}
      </div>
      <a href="/play" style={{ ...S.hint, display: 'block', color: C.inkDim }}>← Back</a>
    </div>
  )
}

function Segmented({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 6, background: C.panelMuted, borderRadius: 999, padding: 4 }}>
      {options.map(([v, label]) => (
        <button key={String(v)} onClick={() => onChange(v)} style={{
          flex: 1, border: 'none', borderRadius: 999, padding: '10px 6px', fontWeight: 700, fontSize: 13,
          fontFamily: 'inherit', cursor: 'pointer',
          background: v === value ? C.orange : 'transparent', color: v === value ? C.charcoal : C.inkDim,
        }}>{label}</button>
      ))}
    </div>
  )
}

function Stepper({ value, min, max, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
      <button style={S.stepBtn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>−</button>
      <span style={{ fontWeight: 800, fontSize: 20, minWidth: 110, textAlign: 'center' }}>{value} {label}</span>
      <button style={S.stepBtn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>+</button>
    </div>
  )
}

// ── Board ─────────────────────────────────────────────────────────────────
function Board({ game, host, onQuit }) {
  const [sheet, setSheet] = useState(null) // null | 'invite' | 'roster' | 'quit'
  const [splash, setSplash] = useState(null) // null | 'good' | 'goodDoubles' | 'danger'
  const seq = useRef(game.sevenSplashSeq)
  const wasSafe = useRef(game.inSafePhase)

  // Party moments, driven by engine notifications (an external store).
  useEffect(() => game.subscribe(() => {
    let next = null
    if (game.sevenSplashSeq !== seq.current) {
      seq.current = game.sevenSplashSeq
      next = game.sevenSplashDoubles ? 'goodDoubles' : 'good'
    } else if (wasSafe.current && !game.inSafePhase && game.phase === GamePhase.playing) {
      next = 'danger'
    }
    wasSafe.current = game.inSafePhase
    if (game.roundPhase === RoundPhase.readyToRoll) wasSafe.current = true
    if (next) {
      setSplash(next)
      navigator.vibrate?.(80)
      setTimeout(() => setSplash((s) => (s === next ? null : s)), next === 'danger' ? 2200 : 2600)
    }
  }), [game])

  const virtual = game.config.diceMode === DiceMode.virtual
  const roller = game.currentRoller
  const rollKey = `${game.roundNumber}-${game.rollsThisRound}`
  const inCount = game.activeCount
  const rollerColor = roller ? colorFor(game.players, roller.id) : C.inkDim

  return (
    <div style={S.live}>
      {game.roundPhase === RoundPhase.roundOver && game.roundSummary && <Recap game={game} />}
      {splash && <Splash kind={splash} />}
      {sheet === 'invite' && <InviteSheet host={host} onClose={() => setSheet(null)} />}
      {sheet === 'roster' && <RosterSheet game={game} host={host} onClose={() => setSheet(null)} />}
      {sheet === 'quit' && (
        <Sheet onClose={() => setSheet(null)} title="END THE GAME?">
          <button style={S.primary} onClick={() => { setSheet(null); game.endGameEarly() }}>FINISH NOW · SHOW RESULTS</button>
          <div style={S.hint}>Banked points count; the pot in play is forfeit.</div>
          <button style={{ ...S.secondary, borderColor: C.orange, color: C.orange }} onClick={onQuit}>QUIT WITHOUT RESULTS</button>
          <button style={S.linkBtn} onClick={() => setSheet(null)}>Keep playing</button>
        </Sheet>
      )}

      <div style={S.roundRow}>
        <span style={S.roundBig}>ROUND {game.roundNumber}</span>
        <span style={{ color: C.inkDim, fontWeight: 600 }}>of {game.totalRounds}</span>
        <button onClick={() => setSheet('invite')} style={S.codeChip} aria-label="Invite players">
          <span style={{ width: 8, height: 8, borderRadius: 999, background: host.status === 'connected' ? C.mint : C.orange }} />
          {host.code ?? '····'}
        </button>
      </div>

      <div style={{ ...S.banner, background: game.inSafePhase ? 'rgba(78,205,196,0.12)' : 'rgba(255,107,53,0.12)',
        color: game.inSafePhase ? C.mint : C.orange }}>
        {game.inSafePhase ? `SAFE · 7 = +${game.config.safeSevenBonus} · ${game.safeRollsRemaining} left` : 'DANGER · 7 BUSTS THE POT'}
        <span style={{ marginLeft: 10, color: C.inkDim }}>{inCount} IN</span>
      </div>

      {roller && (
        <div style={{ ...S.rollerBanner, background: `${rollerColor}24`, borderColor: rollerColor }}>
          <Avatar id={roller.id} name={roller.name} color={rollerColor} size={46} ring={rollerColor} />
          <span style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roller.name}</div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: rollerColor }}>
              {virtual ? 'UP TO ROLL · THEIR PHONE OR YOURS' : game.config.scoreEntry === ScoreEntry.eachRoller ? 'ROLLS, THEN ENTERS ON THEIR PHONE' : 'UP TO ROLL'}
            </div>
          </span>
        </div>
      )}

      {virtual && (
        <div style={S.diceRow}>
          <Die face={game.dice.a} body={C.orange} rollKey={`a-${rollKey}`} />
          <Die face={game.dice.b} body={C.mint} rollKey={`b-${rollKey}`} />
        </div>
      )}
      <div style={S.potLabel}>POT THIS ROUND</div>
      <div style={{ ...S.pot, fontSize: virtual ? 44 : 54 }}>{game.pot}</div>

      <PlayerRows game={game} />

      {virtual ? (
        <button className="rol-roll-btn" style={{ ...S.rollBtn, opacity: game.canRoll ? 1 : 0.4 }}
          disabled={!game.canRoll} onClick={() => { navigator.vibrate?.(40); game.roll() }}>🎲 ROLL THE DICE</button>
      ) : (
        <Keypad safe={game.inSafePhase} enabled={game.canRoll}
          fallback={game.config.scoreEntry === ScoreEntry.eachRoller}
          onEnter={(t) => { navigator.vibrate?.(40); game.enterRoll(t) }}
          onDoubles={() => { navigator.vibrate?.(40); game.enterDoubles() }} />
      )}

      <div style={S.footer}>
        <button style={{ ...S.footBtn, opacity: game.canUndo ? 1 : 0.35 }} disabled={!game.canUndo} onClick={() => game.undo()}>↶ Undo</button>
        <button style={S.footBtn} onClick={() => setSheet('roster')}>👥 Players</button>
        <button style={S.footBtn} onClick={() => setSheet('invite')}>🔗 Invite</button>
        <button style={{ ...S.footBtn, color: C.orange }} onClick={() => setSheet('quit')}>End</button>
      </div>
    </div>
  )
}

/** Everyone at the table; the banker checks players in at the current pot. */
function PlayerRows({ game }) {
  const ranked = [...game.players].sort((a, b) => b.score - a.score)
  return (
    <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', display: 'grid', gap: 6, alignContent: 'start' }}>
      {ranked.map((p, idx) => {
        const banked = game.hasBanked(p.id)
        const active = game.isActive(p.id)
        const isRoller = p.id === game.currentRollerID && active
        const color = colorFor(game.players, p.id)
        const canBank = game.bankingOpen && active
        return (
          <div key={p.id} style={{ ...S.lbRow, opacity: active ? 1 : 0.5,
            background: isRoller ? `${color}1f` : C.panelMuted, border: `1.5px solid ${isRoller ? color : 'transparent'}` }}>
            <span style={{ ...S.rank, background: idx === 0 ? C.orange : C.inkDim }}>{idx + 1}</span>
            <Avatar id={p.id} name={p.name} color={color} size={26} ring={isRoller ? color : null} />
            <span style={{ fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isRoller ? '🎲 ' : ''}{p.name}
            </span>
            <span style={{ marginLeft: 'auto', fontWeight: 800, minWidth: 40, textAlign: 'right', flex: 'none' }}>{p.score}</span>
            {canBank
              ? <button style={S.bankBtn} onClick={() => game.bank([p.id])}>BANK {game.pot}</button>
              : <span style={{ ...S.status, color: active ? C.mint : C.inkDim }}>
                  {banked ? `BANKED +${game.bankedAmount(p.id)}` : active ? 'IN' : 'OUT'}</span>}
          </div>
        )
      })}
    </div>
  )
}

// Banker's keypad for real dice. Same keys as iOS: safe rolls 2–12 (7 = bonus,
// mint); danger 3–11 (7 = bust, orange) plus DOUBLES, since 2 and 12 can only be doubles.
function Keypad({ safe, enabled, fallback, onEnter, onDoubles }) {
  const totals = safe ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [3, 4, 5, 6, 7, 8, 9, 10, 11]
  return (
    <div style={{ display: 'grid', gap: 6, opacity: enabled ? 1 : 0.4, pointerEvents: enabled ? 'auto' : 'none' }}>
      <div style={{ ...S.tracker, textAlign: 'center' }}>
        {fallback ? 'FALLBACK PAD · THE ROLLER ENTERS ON THEIR PHONE' : 'TAP THE TOTAL ROLLED'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 6 }}>
        {totals.map((n) => (
          <button key={n} onClick={() => onEnter(n)} style={{ height: 42, borderRadius: 11, border: 'none',
            background: C.panel, fontWeight: 900, fontSize: 19, fontFamily: 'inherit', cursor: 'pointer',
            color: n === 7 ? (safe ? C.mint : C.orange) : C.ink }}>{n}</button>
        ))}
        {!safe && (
          <button onClick={onDoubles} style={{ gridColumn: 'span 3', height: 42, borderRadius: 11, border: 'none',
            background: C.mint, color: C.charcoal, fontWeight: 800, letterSpacing: 1, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
            DOUBLES ×2</button>
        )}
      </div>
    </div>
  )
}

function Splash({ kind }) {
  const mint = { ...S.dangerCard, borderColor: C.mint, boxShadow: '0 0 40px rgba(78,205,196,0.45)' }
  return (
    <div style={S.dangerWrap}>
      {kind === 'danger' ? (
        <div className="rol-danger-pop" style={S.dangerCard}>
          <div style={{ fontSize: 36 }}>🎲🎲</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.mint, letterSpacing: 1 }}>DOUBLES ARE LIVE</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>doubles ×2 the pot · a 7 busts it</div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: C.orange }}>BANK IS OPEN</div>
        </div>
      ) : (
        <div className="rol-danger-pop" style={mint}>
          <div style={{ fontSize: 38 }}>😇🎲</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.mint, letterSpacing: 1 }}>GOOD SEVEN!</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>the one 7 that loves you back</div>
          {kind === 'goodDoubles' && (
            <>
              <div style={{ height: 1, background: C.rule, margin: '10px 0 4px' }} />
              <div style={{ fontSize: 20, fontWeight: 800, color: C.mint, letterSpacing: 1 }}>…AND DOUBLES ARE LIVE</div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, color: C.orange }}>BANK IS OPEN</div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Recap({ game }) {
  const s = game.roundSummary
  const top = s.bankers[0]
  return (
    <div style={S.recapWrap}>
      <div className="recap-card" style={{ ...S.recapCard, borderColor: s.busted ? C.orange : C.mint }}>
        <div style={S.tracker}>ROUND {s.roundNumber} DONE{s.isLastRound ? ' · THAT WAS THE LAST ONE' : ''}</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: s.busted ? C.orange : C.mint }}>
          {s.busted ? '💥 BUSTED — pot wiped' : '🏦 Everyone banked!'}
        </div>
        {top && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginTop: 14 }}>
            <Avatar id={top.id} name={top.name} color={colorFor(game.players, top.id)} size={64} ring={C.gold} ringWidth={3} />
            <div style={{ fontSize: 17, fontWeight: 800 }}>👑 {top.name} +{top.amount}</div>
          </div>
        )}
        <div style={{ display: 'grid', gap: 6, marginTop: 10, maxHeight: '38dvh', overflowY: 'auto' }}>
          {s.standings.map((p, idx) => (
            <div key={p.id} className="recap-row" style={{ ...S.recapRow, animationDelay: `${0.15 + idx * 0.06}s` }}>
              <span style={{ ...S.rank, background: idx === 0 ? C.orange : C.inkDim }}>{idx + 1}</span>
              <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 800, color: p.roundDelta > 0 ? C.mint : C.inkDim }}>
                {p.roundDelta > 0 ? `+${p.roundDelta}` : '—'}</span>
              <span style={{ fontWeight: 800, minWidth: 44, textAlign: 'right' }}>{p.score}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gap: 8, marginTop: 14 }}>
          <button style={S.primary} onClick={() => game.advanceRound()}>{s.isLastRound ? 'SHOW RESULTS →' : 'NEXT ROUND →'}</button>
          {game.canRedoBustingSeven && (
            <button style={{ ...S.secondary, borderColor: C.orange, color: C.orange }} onClick={() => game.redoBustingSeven()}>
              ↶ REDO THE 7 (mis-entered)</button>
          )}
          <div style={S.hint}>Next round starts on its own in a few seconds.</div>
        </div>
      </div>
    </div>
  )
}

function Sheet({ title, children, onClose }) {
  return (
    <div style={S.sheetWrap} onClick={onClose}>
      <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...S.tracker, textAlign: 'center' }}>{title}</div>
        {children}
      </div>
    </div>
  )
}

function InviteSheet({ host, onClose }) {
  const [copied, setCopied] = useState(false)
  const url = host.joinURL ?? ''
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* no clipboard */ }
  }
  async function share() {
    const text = `Join my Rolligan game — room code ${host.code}. iPhone opens the app, Android plays in the browser.`
    if (navigator.share) { try { await navigator.share({ title: 'Join my Rolligan game', text, url }) } catch { /* cancelled */ } }
    else copy()
  }
  return (
    <Sheet title="INVITE PLAYERS" onClose={onClose}>
      <div style={{ textAlign: 'center' }}>
        <div style={S.tracker}>ROOM CODE</div>
        <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: 8, color: C.orange, lineHeight: 1.1 }}>{host.code}</div>
        <div style={{ fontSize: 12, color: host.status === 'connected' ? C.mint : C.orange, fontWeight: 700 }}>
          {host.status === 'connected' ? '● LIVE' : host.status === 'connecting' ? '○ CONNECTING…' : '○ RECONNECTING…'}
        </div>
      </div>
      <div style={{ ...S.hint, textAlign: 'center' }}>
        <b style={{ color: C.ink }}>iPhone:</b> open Rolligan → Join a game.<br />
        <b style={{ color: C.ink }}>Android / no app:</b> rolligan.com/join in any browser.<br />Then enter this code.
      </div>
      <button style={S.primary} onClick={share}>SHARE INVITE</button>
      <button style={S.secondary} onClick={copy}>{copied ? 'LINK COPIED ✓' : 'COPY LINK'}</button>
      <button style={S.linkBtn} onClick={onClose}>Done</button>
    </Sheet>
  )
}

function RosterSheet({ game, host, onClose }) {
  const [name, setName] = useState('')
  return (
    <Sheet title="PLAYERS" onClose={onClose}>
      <div style={{ display: 'grid', gap: 6, maxHeight: '45dvh', overflowY: 'auto' }}>
        {game.players.map((p) => (
          <div key={p.id} style={{ ...S.lbRow, background: C.panelMuted }}>
            <Avatar id={p.id} name={p.name} color={colorFor(game.players, p.id)} size={26} />
            <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 800 }}>{p.score}</span>
            {host.avatarDataUrl(p.id) && (
              <button style={S.iconBtn} title="Hide photo for everyone" onClick={() => host.setAvatar(p.id, '')}>📷✕</button>
            )}
            <button style={{ ...S.iconBtn, opacity: game.players.length > 1 ? 1 : 0.3 }} disabled={game.players.length <= 1}
              onClick={() => game.removePlayer(p.id)} aria-label={`Remove ${p.name}`}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...S.input, flex: 1 }} value={name} placeholder="Add a player on this phone" maxLength={20}
          onChange={(e) => setName(e.target.value)} />
        <button style={{ ...S.secondary, padding: '0 16px' }} disabled={game.players.length >= MAX_PLAYERS}
          onClick={() => { if (game.addPlayer(name)) setName('') }}>Add</button>
      </div>
      <div style={S.hint}>Others join themselves with the room code.</div>
      <button style={S.linkBtn} onClick={onClose}>Done</button>
    </Sheet>
  )
}

// ── Results ───────────────────────────────────────────────────────────────
function Results({ game, host, onNewGame, onPlayAgain }) {
  const sorted = [...game.players].sort((a, b) => b.score - a.score)
  const top = sorted[0]?.score ?? 0
  const winners = sorted.filter((p) => p.score === top)
  return (
    <div style={{ ...S.card, minHeight: '100dvh', justifyContent: 'center', padding: 24, overflow: 'hidden' }}>
      <Confetti extra={['🏆', '👑']} />
      <div className="win-trophy" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
        <span aria-hidden="true" style={{ fontSize: 40, marginBottom: -8, zIndex: 1 }}>👑</span>
        <span style={{ display: 'flex' }}>
          {winners.map((p, i) => (
            <span key={p.id} style={{ marginLeft: i ? -24 : 0 }}>
              <Avatar id={p.id} name={p.name} color={colorFor(game.players, p.id)} size={winners.length > 1 ? 96 : 120} ring={C.gold} ringWidth={5} />
            </span>
          ))}
        </span>
      </div>
      <div style={{ ...S.eyebrow, fontSize: 12 }}>{winners.length > 1 ? 'WINNERS' : 'WINNER'}</div>
      <h1 className="win-name" style={{ ...S.wordmark, fontSize: 42, margin: '2px 0 0' }}>{winners.map((p) => p.name).join(' & ')}</h1>
      <div style={{ color: C.mint, textAlign: 'center', fontWeight: 700 }}>with {top} points · biggest pot {game.biggestPot}</div>
      <div style={{ display: 'grid', gap: 6, marginTop: 8, maxHeight: '36dvh', overflowY: 'auto' }}>
        {sorted.map((p, idx) => (
          <div key={p.id} className="recap-row" style={{ ...S.recapRow, animationDelay: `${0.5 + idx * 0.09}s`,
            background: C.panelMuted, color: p.score === top ? C.ink : C.inkDim }}>
            <span style={{ ...S.rank, background: idx === 0 ? C.orange : C.inkDim }}>{idx + 1}</span>
            <Avatar id={p.id} name={p.name} color={colorFor(game.players, p.id)} size={26} ring={p.score === top ? C.gold : null} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.score === top ? '👑 ' : ''}{p.name}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 800, color: p.score === top ? C.orange : C.inkDim }}>{p.score}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
        <button style={S.primary} onClick={onPlayAgain}>PLAY AGAIN · SAME TABLE</button>
        <button style={S.secondary} onClick={onNewGame}>NEW GAME</button>
        <div style={S.hint}>Room {host.code} stays open until you leave this screen.</div>
      </div>
    </div>
  )
}

const Centered = ({ children }) => <div style={S.centered}>{children}</div>

const S = {
  root: { minHeight: '100vh', background: C.bg, color: C.ink, display: 'flex', justifyContent: 'center',
    fontFamily: 'Inter, -apple-system, system-ui, sans-serif' },
  card: { width: '100%', maxWidth: 440, padding: '40px 22px 48px', display: 'flex', flexDirection: 'column', gap: 12 },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', gap: 12, color: C.inkDim, padding: 24, textAlign: 'center', maxWidth: 420 },
  eyebrow: { color: C.orange, letterSpacing: 2.2, fontSize: 11, fontWeight: 700, textAlign: 'center' },
  wordmark: { color: C.orange, fontSize: 56, fontWeight: 800, textAlign: 'center', margin: '0 0 6px', letterSpacing: -1.5 },
  tracker: { color: C.inkDim, fontSize: 11, fontWeight: 700, letterSpacing: 1.6, marginTop: 10 },
  hint: { color: C.inkDim, fontSize: 13, textAlign: 'center' },
  row: { display: 'flex', alignItems: 'center', gap: 8 },
  circle: { width: 36, height: 36, borderRadius: 999, display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', color: C.charcoal, fontWeight: 900, fontSize: 15, flex: 'none' },
  input: { background: C.panel, border: `1px solid ${C.rule}`, borderRadius: 12, padding: '12px 14px',
    color: C.ink, fontSize: 16, fontWeight: 600, outline: 'none', minWidth: 0, flex: 1, fontFamily: 'inherit' },
  iconBtn: { background: 'transparent', border: 'none', color: C.inkDim, fontSize: 16, cursor: 'pointer', padding: 6, fontFamily: 'inherit' },
  stepBtn: { width: 44, height: 44, borderRadius: 999, border: `1.5px solid ${C.rule}`, background: C.panel,
    color: C.ink, fontSize: 22, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' },
  primary: { background: C.orange, color: C.charcoal, border: 'none', borderRadius: 999, padding: '16px',
    fontSize: 15, fontWeight: 800, letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit' },
  secondary: { background: 'transparent', color: C.ink, border: `1.5px solid ${C.rule}`, borderRadius: 999,
    padding: '12px 18px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 },
  linkBtn: { background: 'none', border: 'none', color: C.inkDim, fontWeight: 600, cursor: 'pointer', padding: 8, fontFamily: 'inherit', fontSize: 14 },
  live: { width: '100%', maxWidth: 480, padding: '12px 16px 12px', display: 'flex', flexDirection: 'column', gap: 8,
    height: '100dvh', boxSizing: 'border-box', overflow: 'hidden' },
  roundRow: { display: 'flex', alignItems: 'center', gap: 8 },
  roundBig: { fontSize: 20, fontWeight: 800, letterSpacing: -0.5 },
  codeChip: { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, background: C.panel,
    border: `1.5px solid ${C.rule}`, borderRadius: 999, padding: '6px 12px', color: C.orange, fontWeight: 900,
    letterSpacing: 3, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' },
  banner: { borderRadius: 999, padding: '6px 12px', fontWeight: 800, fontSize: 13, textAlign: 'center' },
  rollerBanner: { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 13, border: '2px solid', padding: '6px 12px' },
  diceRow: { display: 'flex', gap: 14, justifyContent: 'center', padding: '2px 0' },
  potLabel: { textAlign: 'center', color: C.inkDim, fontSize: 10, letterSpacing: 1.6, fontWeight: 600 },
  pot: { textAlign: 'center', color: C.orange, fontWeight: 800, lineHeight: 1 },
  lbRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 11, fontSize: 14, minHeight: 40 },
  rank: { width: 22, height: 22, borderRadius: 999, flex: 'none', display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', color: C.charcoal, fontWeight: 800, fontSize: 12 },
  bankBtn: { background: C.mint, color: C.charcoal, border: 'none', borderRadius: 999, padding: '7px 12px',
    fontWeight: 800, fontSize: 12, letterSpacing: 0.5, cursor: 'pointer', fontFamily: 'inherit', flex: 'none' },
  status: { fontSize: 11, fontWeight: 800, flex: 'none', minWidth: 64, textAlign: 'right' },
  rollBtn: { background: C.orange, color: C.charcoal, border: 'none', flex: 'none', borderRadius: 999, padding: '14px',
    fontSize: 16, fontWeight: 800, letterSpacing: 0.8, cursor: 'pointer', boxShadow: '0 0 24px rgba(255,107,53,0.45)', fontFamily: 'inherit' },
  footer: { display: 'flex', gap: 6, justifyContent: 'space-between', flex: 'none' },
  footBtn: { background: C.panel, color: C.ink, border: 'none', borderRadius: 999, padding: '9px 10px', fontWeight: 700,
    fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', flex: 1 },
  dangerWrap: { position: 'fixed', inset: 0, zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  dangerCard: { background: 'rgba(26,26,32,0.97)', border: `2px solid ${C.orange}`, borderRadius: 18, padding: '20px 30px',
    textAlign: 'center', display: 'grid', gap: 4, boxShadow: '0 0 40px rgba(255,107,53,0.45)' },
  recapWrap: { position: 'fixed', inset: 0, zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 20, background: 'rgba(10,10,14,0.72)' },
  recapCard: { width: '100%', maxWidth: 400, background: C.bg, borderRadius: 18, border: '2px solid', padding: '22px 18px',
    textAlign: 'center', boxShadow: '0 24px 70px rgba(0,0,0,0.55)' },
  recapRow: { display: 'flex', alignItems: 'center', gap: 10, borderRadius: 12, padding: '8px 12px', textAlign: 'left', fontSize: 15, background: C.panelMuted },
  sheetWrap: { position: 'fixed', inset: 0, zIndex: 90, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(10,10,14,0.6)' },
  sheet: { width: '100%', maxWidth: 480, background: C.bg, borderRadius: '22px 22px 0 0', padding: '18px 18px 28px',
    display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 -20px 60px rgba(0,0,0,0.5)', maxHeight: '88dvh', overflowY: 'auto' },
}
