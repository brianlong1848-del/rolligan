// GameState — plain-JS port of rolligan-ios/Rolligan/Models/GameState.swift.
// The single source of truth for an in-progress Rolligan game on the web host
// (the Android app's banker). Transport-agnostic: RoomHost broadcasts it.
//
// Rolligan is a communal "Bank!"-style game (Brian's house rules, 2026-05-23):
//   • One banker holds the phone and rolls. Everyone plays one SHARED pot.
//   • A round is a sequence of rolls building that pot:
//       - Rolls 1–3 are SAFE: a 7 adds +70; otherwise add the dice sum.
//       - Roll 4 onward is DANGER: a 7 wipes the pot and ends the round;
//         doubles DOUBLE the pot; otherwise add the dice sum.
//   • After the safe rolls, banking is open. Players cash in at the CURRENT pot
//     and sit out the rest of the round.
//   • A round ends on a danger-seven bust, or when everyone still in has banked.
//   • The match runs `config.rounds` rounds; highest total score wins.
//
// Observation: every public mutation ends with `_notify()`, so a subscriber
// (RoomHost, the React board) re-renders / re-broadcasts on each change.

import { makeConfig, configFromJSON, isPlayable, MAX_PLAYERS, MIN_PLAYERS } from './GameConfig.js'
import { makePlayer } from './Player.js'
import { makePair, rolledPair, pairSum, isSeven, isDoubles, pairForTotal, doublesPair } from './dice.js'

/** Which screen the app is on. `finished` carries `winnerIDs`. */
export const GamePhase = Object.freeze({ setup: 'setup', playing: 'playing', finished: 'finished' })

/** Where the current round is in its life cycle. */
export const RoundPhase = Object.freeze({
  readyToRoll: 'readyToRoll',
  rolling: 'rolling',
  awaitingAction: 'awaitingAction',
  busted: 'busted',
  roundOver: 'roundOver',
})

/** Beat the round recap gets before the next round starts on its own. */
export const AUTO_ADVANCE_MS = 7000
const UNDO_LIMIT = 25

export class GameState {
  constructor(config = makeConfig()) {
    this.config = config
    this.phase = GamePhase.setup
    this.winnerIDs = []
    this.roundPhase = RoundPhase.readyToRoll
    this.dice = makePair()
    this.pot = 0
    /** 0-based round counter. Display as `roundNumber`. */
    this.roundIndex = 0
    this.rollsThisRound = 0
    this.lastRollSum = 0
    /** Players still riding the pot this round (haven't banked). */
    this.activePlayerIDs = new Set()
    /** Players who banked this round → the amount they locked in. */
    this.bankedThisRound = new Map()
    this.rollHistory = []
    /** Whose turn it is to roll (the dice pass around the table). */
    this.currentRollerID = null
    /** Who threw the LAST roll — the next round starts after them. */
    this.lastRollerID = null
    /** Set while the round-over recap is showing. */
    this.roundSummary = null
    this.biggestPot = 0
    /** One-shot "good seven" splash signal (bumps per safe-phase 7). */
    this.sevenSplashSeq = 0
    this.sevenSplashDoubles = false

    this._undo = []
    this._autoAdvance = null
    this._listeners = new Set()
  }

  // ── Observation ──────────────────────────────────────────────────────────
  subscribe(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn) }
  _notify() { for (const fn of this._listeners) fn(this) }

  // ── Derived ──────────────────────────────────────────────────────────────
  get players() { return this.config.players }
  get totalRounds() { return this.config.rounds }
  get roundNumber() { return this.roundIndex + 1 }
  get activeCount() { return this.activePlayerIDs.size }
  get inSafePhase() { return this.rollsThisRound < this.config.safeRolls }
  get safeRollsRemaining() { return Math.max(0, this.config.safeRolls - this.rollsThisRound) }
  get currentRoller() { return this.players.find((p) => p.id === this.currentRollerID) ?? null }
  get canUndo() { return this._undo.length > 0 }

  get bankingOpen() {
    return this.phase === GamePhase.playing
      && this.roundPhase === RoundPhase.awaitingAction
      && this.rollsThisRound >= this.config.safeRolls
      && this.activePlayerIDs.size > 0
  }

  get canRoll() {
    return this.phase === GamePhase.playing
      && (this.roundPhase === RoundPhase.readyToRoll || this.roundPhase === RoundPhase.awaitingAction)
      && this.activePlayerIDs.size > 0
  }

  isActive(id) { return this.activePlayerIDs.has(id) }
  hasBanked(id) { return this.bankedThisRound.has(id) }
  bankedAmount(id) { return this.bankedThisRound.has(id) ? this.bankedThisRound.get(id) : null }

  // ── Undo ─────────────────────────────────────────────────────────────────
  _snapshot() {
    return {
      config: { ...this.config, players: this.config.players.map((p) => ({ ...p })) },
      phase: this.phase, winnerIDs: [...this.winnerIDs], roundPhase: this.roundPhase,
      dice: { ...this.dice }, pot: this.pot, roundIndex: this.roundIndex,
      rollsThisRound: this.rollsThisRound, lastRollSum: this.lastRollSum,
      activePlayerIDs: new Set(this.activePlayerIDs), bankedThisRound: new Map(this.bankedThisRound),
      rollHistory: [...this.rollHistory], currentRollerID: this.currentRollerID,
      lastRollerID: this.lastRollerID, roundSummary: this.roundSummary, biggestPot: this.biggestPot,
    }
  }
  _pushUndo() {
    this._undo.push(this._snapshot())
    if (this._undo.length > UNDO_LIMIT) this._undo.shift()
  }
  _restoreSnapshot(s) {
    this.config = s.config; this.phase = s.phase; this.winnerIDs = s.winnerIDs
    this.roundPhase = s.roundPhase; this.dice = s.dice; this.pot = s.pot
    this.roundIndex = s.roundIndex; this.rollsThisRound = s.rollsThisRound
    this.lastRollSum = s.lastRollSum; this.activePlayerIDs = s.activePlayerIDs
    this.bankedThisRound = s.bankedThisRound; this.rollHistory = s.rollHistory
    this.currentRollerID = s.currentRollerID; this.lastRollerID = s.lastRollerID
    this.roundSummary = s.roundSummary; this.biggestPot = s.biggestPot
  }

  /** Take back the last roll / bank / round transition. */
  undo() {
    const s = this._undo.pop()
    if (!s) return
    this._cancelAutoAdvance()
    this._restoreSnapshot(s)
    this._notify()
  }

  // ── Roller rotation ──────────────────────────────────────────────────────
  _advanceRoller() {
    if (this.activePlayerIDs.size === 0) { this.currentRollerID = null; return }
    const ids = this.players.map((p) => p.id)
    const start = this.currentRollerID ? ids.indexOf(this.currentRollerID) : -1
    for (let offset = 1; offset <= ids.length; offset++) {
      const candidate = ids[(((start + offset) % ids.length) + ids.length) % ids.length]
      if (this.activePlayerIDs.has(candidate)) { this.currentRollerID = candidate; return }
    }
    this.currentRollerID = null
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  /** Start a fresh game from the given config. Resets all live state. */
  startGame(config) {
    if (!isPlayable(config)) throw new Error('GameConfig is not playable; check player count and rounds')
    this.config = config
    this.phase = GamePhase.playing
    this.winnerIDs = []
    this.roundIndex = 0
    this.biggestPot = 0
    this.lastRollerID = null
    this._undo = []
    this._startRound()
    this._notify()
  }

  /** Return to setup, discarding the current game. */
  returnToSetup() {
    this._cancelAutoAdvance()
    this.phase = GamePhase.setup
    this.roundPhase = RoundPhase.readyToRoll
    this.pot = 0
    this._notify()
  }

  /** End the match now; banked points count, any unbanked pot is forfeit. */
  endGameEarly() {
    if (this.phase !== GamePhase.playing) return
    this._cancelAutoAdvance()
    this._pushUndo()
    this.phase = GamePhase.finished
    this.winnerIDs = this._topScorers()
    this._notify()
  }

  _startRound() {
    this.pot = 0
    this.rollsThisRound = 0
    this.lastRollSum = 0
    this.dice = makePair()
    this.activePlayerIDs = new Set(this.players.map((p) => p.id))
    this.bankedThisRound = new Map()
    this.rollHistory = []
    this.roundSummary = null
    const idx = this.lastRollerID ? this.players.findIndex((p) => p.id === this.lastRollerID) : -1
    this.currentRollerID = idx >= 0
      ? this.players[(idx + 1) % this.players.length].id
      : (this.players[0]?.id ?? null)
    this.roundPhase = RoundPhase.readyToRoll
  }

  // ── Player intents ───────────────────────────────────────────────────────
  /** Roll the dice and apply the result. Pass a pair for keypad entry / tests. */
  roll(injected = null) {
    if (!this.canRoll) return
    this._pushUndo()
    this.lastRollerID = this.currentRollerID
    const rolled = injected ?? rolledPair()
    this.dice = rolled
    this.rollsThisRound += 1
    this.lastRollSum = pairSum(rolled)
    this.rollHistory.push(this.lastRollSum)

    if (this.rollsThisRound <= this.config.safeRolls) {
      this.pot += isSeven(rolled) ? this.config.safeSevenBonus : pairSum(rolled)
      this.roundPhase = RoundPhase.awaitingAction
      if (isSeven(rolled)) {
        this.sevenSplashSeq += 1
        this.sevenSplashDoubles = this.rollsThisRound === this.config.safeRolls
      }
    } else if (isSeven(rolled)) {
      this.pot = 0
      this._finishRound(true, pairSum(rolled))
    } else if (isDoubles(rolled)) {
      this.pot *= 2
      this.roundPhase = RoundPhase.awaitingAction
    } else {
      this.pot += pairSum(rolled)
      this.roundPhase = RoundPhase.awaitingAction
    }

    this.biggestPot = Math.max(this.biggestPot, this.pot)
    if (this.roundPhase === RoundPhase.awaitingAction) this._advanceRoller()
    this._notify()
  }

  /** Banker enters a non-doubles total (2–12) from the physical dice. */
  enterRoll(total) { this.roll(pairForTotal(total)) }

  /** Banker enters DOUBLES from the physical dice. */
  enterDoubles() { this.roll(doublesPair()) }

  /** Cash the given players in at the CURRENT pot. */
  bank(ids) {
    if (!this.bankingOpen) return
    const valid = [...ids].filter((id) => this.activePlayerIDs.has(id))
    if (valid.length === 0) return
    this._pushUndo()
    this.config = { ...this.config, players: this.config.players.map((p) => ({ ...p })) }
    for (const p of this.config.players) {
      if (valid.includes(p.id)) { p.score += this.pot; this.bankedThisRound.set(p.id, this.pot) }
    }
    for (const id of valid) this.activePlayerIDs.delete(id)

    if (this.activePlayerIDs.size === 0) {
      this._finishRound(false, 0)
    } else if (this.currentRollerID && !this.activePlayerIDs.has(this.currentRollerID)) {
      this._advanceRoller()
    }
    this._notify()
  }

  _finishRound(busted, bustSum) {
    const bankers = [...this.bankedThisRound.entries()]
      .map(([id, amount]) => {
        const p = this.players.find((x) => x.id === id)
        return p ? { id, name: p.name, amount } : null
      })
      .filter(Boolean)
      .sort((a, b) => b.amount - a.amount)
    const standings = [...this.players]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ id: p.id, name: p.name, score: p.score, roundDelta: this.bankedThisRound.get(p.id) ?? 0 }))
    this.roundSummary = {
      roundNumber: this.roundNumber, busted, bustSum, bankers, standings,
      isLastRound: this.roundIndex + 1 >= this.config.rounds,
    }
    this.roundPhase = RoundPhase.roundOver

    // AUTO-ADVANCE after a beat; guarded by round index so a stale timer from
    // a previous round can never double-advance.
    const scheduledRound = this.roundIndex
    this._cancelAutoAdvance()
    this._autoAdvance = setTimeout(() => {
      this._autoAdvance = null
      if (this.roundPhase === RoundPhase.roundOver && this.roundIndex === scheduledRound) this.advanceRound()
    }, AUTO_ADVANCE_MS)
  }

  _cancelAutoAdvance() {
    if (this._autoAdvance) { clearTimeout(this._autoAdvance); this._autoAdvance = null }
  }

  /** Dismiss the recap → next round (or finish). */
  advanceRound() {
    if (this.roundPhase !== RoundPhase.roundOver) return
    this._cancelAutoAdvance()
    this._pushUndo()
    this.roundSummary = null
    this._endRound()
    this._notify()
  }

  // ── Banker "Redo the 7" ──────────────────────────────────────────────────
  get canRedoBustingSeven() {
    return this.roundPhase === RoundPhase.roundOver && !!this.roundSummary?.busted && this.canUndo
  }

  /** Undo a busting 7: restores pot, round points, roller, roll count, phase. */
  redoBustingSeven() {
    if (!this.canRedoBustingSeven) return
    this.undo()
  }

  // ── Mid-game roster changes ──────────────────────────────────────────────
  /** Move a player from one index to another (turn order going forward). */
  movePlayer(from, to) {
    const n = this.config.players.length
    if (from < 0 || from >= n || to < 0 || to >= n || from === to) return
    this._pushUndo()
    const players = this.config.players.map((p) => ({ ...p }))
    const [moved] = players.splice(from, 1)
    players.splice(to, 0, moved)
    this.config = { ...this.config, players }
    if (this.phase === GamePhase.playing) {
      if (this.rollsThisRound === 0 && this.roundPhase === RoundPhase.readyToRoll) {
        const idx = this.lastRollerID ? players.findIndex((p) => p.id === this.lastRollerID) : -1
        this.currentRollerID = idx >= 0 ? players[(idx + 1) % n].id : (players[0]?.id ?? null)
      } else if (this.lastRollerID) {
        const idx = players.findIndex((p) => p.id === this.lastRollerID)
        if (idx >= 0) {
          for (let offset = 1; offset <= n; offset++) {
            const c = players[(idx + offset) % n]
            if (this.activePlayerIDs.has(c.id)) { this.currentRollerID = c.id; break }
          }
        }
      }
    }
    this._notify()
  }

  _resolveName(name) {
    const trimmed = (name ?? '').trim()
    return trimmed || `Player ${this.config.players.length + 1}`
  }

  /** Add a player during a game (starts at 0; joins the current round live). */
  addPlayer(name) {
    if (this.config.players.length >= MAX_PLAYERS) return false
    this._pushUndo()
    const p = makePlayer(this._resolveName(name))
    this.config = { ...this.config, players: [...this.config.players, p] }
    if (this.phase === GamePhase.playing && this.roundPhase !== RoundPhase.busted) this.activePlayerIDs.add(p.id)
    this._notify()
    return true
  }

  /** Add a remotely-joined player with the joiner's own id. Idempotent: a
   *  reconnecting client re-activates its existing seat. */
  addRemotePlayer(id, name) {
    if (this.config.players.some((p) => p.id === id)) {
      if (this.phase === GamePhase.playing && this.roundPhase !== RoundPhase.busted) this.activePlayerIDs.add(id)
      this._notify()
      return true
    }
    if (this.config.players.length >= MAX_PLAYERS) return false
    this._pushUndo()
    const p = makePlayer(this._resolveName(name), { id })
    this.config = { ...this.config, players: [...this.config.players, p] }
    if (this.phase === GamePhase.playing && this.roundPhase !== RoundPhase.busted) this.activePlayerIDs.add(id)
    this._notify()
    return true
  }

  /** Re-key a seat to a NEW id, keeping name, score and round state. */
  rebindPlayer(oldID, newID) {
    const idx = this.config.players.findIndex((p) => p.id === oldID)
    if (idx < 0 || this.config.players.some((p) => p.id === newID)) return
    this._pushUndo()
    const players = this.config.players.map((p) => ({ ...p }))
    players[idx] = { id: newID, name: players[idx].name, score: players[idx].score }
    this.config = { ...this.config, players }
    if (this.activePlayerIDs.delete(oldID)) this.activePlayerIDs.add(newID)
    if (this.bankedThisRound.has(oldID)) {
      this.bankedThisRound.set(newID, this.bankedThisRound.get(oldID))
      this.bankedThisRound.delete(oldID)
    }
    if (this.currentRollerID === oldID) this.currentRollerID = newID
    if (this.lastRollerID === oldID) this.lastRollerID = newID
    this._notify()
  }

  /** Drop a player during a game. Their points leave with them. */
  removePlayer(id) {
    if (this.config.players.length <= MIN_PLAYERS) return false
    if (!this.config.players.some((p) => p.id === id)) return false
    this._pushUndo()
    const wasRoller = this.currentRollerID === id
    this.config = { ...this.config, players: this.config.players.filter((p) => p.id !== id) }
    this.activePlayerIDs.delete(id)
    this.bankedThisRound.delete(id)
    if (this.phase === GamePhase.playing && this.roundPhase === RoundPhase.awaitingAction && this.activePlayerIDs.size === 0) {
      this._endRound()
    } else if (wasRoller) {
      this._advanceRoller()
    }
    this._notify()
    return true
  }

  // ── Round / game flow ────────────────────────────────────────────────────
  _endRound() {
    this.roundIndex += 1
    if (this.roundIndex >= this.config.rounds) {
      this.phase = GamePhase.finished
      this.winnerIDs = this._topScorers()
    } else {
      this._startRound()
    }
  }

  _topScorers() {
    const top = Math.max(0, ...this.players.map((p) => p.score))
    return this.players.filter((p) => p.score === top).map((p) => p.id)
  }

  // ── Persistence (resume) ─────────────────────────────────────────────────
  /** JSON-safe snapshot for saving the in-progress game. */
  snapshotForSave() {
    return {
      config: this.config, phase: this.phase, winnerIDs: this.winnerIDs, roundPhase: this.roundPhase,
      dice: this.dice, pot: this.pot, roundIndex: this.roundIndex, rollsThisRound: this.rollsThisRound,
      lastRollSum: this.lastRollSum, activePlayerIDs: [...this.activePlayerIDs],
      bankedThisRound: [...this.bankedThisRound.entries()], rollHistory: this.rollHistory,
      currentRollerID: this.currentRollerID, lastRollerID: this.lastRollerID,
      roundSummary: this.roundSummary, biggestPot: this.biggestPot,
      sevenSplashSeq: this.sevenSplashSeq, savedAt: Date.now(),
    }
  }

  /** Restore a saved game and resume play. */
  restore(s) {
    this._cancelAutoAdvance()
    this.config = configFromJSON(s.config)
    this.phase = s.phase ?? GamePhase.playing
    this.winnerIDs = s.winnerIDs ?? []
    this.roundPhase = s.roundPhase ?? RoundPhase.readyToRoll
    this.dice = makePair(s.dice?.a, s.dice?.b)
    this.pot = s.pot ?? 0
    this.roundIndex = s.roundIndex ?? 0
    this.rollsThisRound = s.rollsThisRound ?? 0
    this.lastRollSum = s.lastRollSum ?? 0
    this.activePlayerIDs = new Set(s.activePlayerIDs ?? [])
    this.bankedThisRound = new Map(s.bankedThisRound ?? [])
    this.rollHistory = s.rollHistory ?? []
    this.currentRollerID = s.currentRollerID ?? null
    this.lastRollerID = s.lastRollerID ?? null
    this.roundSummary = s.roundSummary ?? null
    this.biggestPot = s.biggestPot ?? 0
    this.sevenSplashSeq = s.sevenSplashSeq ?? 0
    this._undo = []
    // A game saved mid-recap resumes by finishing the recap.
    if (this.roundPhase === RoundPhase.roundOver) {
      const scheduledRound = this.roundIndex
      this._autoAdvance = setTimeout(() => {
        this._autoAdvance = null
        if (this.roundPhase === RoundPhase.roundOver && this.roundIndex === scheduledRound) this.advanceRound()
      }, AUTO_ADVANCE_MS)
    }
    this._notify()
  }
}
