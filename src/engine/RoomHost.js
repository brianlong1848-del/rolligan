// RoomHost — port of rolligan-ios/Rolligan/Models/RoomHost.swift (+ the host
// half of RoomSession.swift) on top of supabase-js Realtime broadcast.
//
//   • Generates the room code and opens channel `rolligan:room:{CODE}`.
//   • Broadcasts a fresh `state` snapshot (monotonic `rev`) on every engine
//     change, coalesced per tick, and again on every inbound intent and on
//     every (re)subscribe so late / reconnecting joiners sync at once.
//   • Applies `join` / `bank` / `leave` / `roll` / `enterRoll` / `enterDoubles`
//     intents to the local engine, which stays the single authority.
//   • Relays player photos (`avatar` events) the way iOS does: keeps every
//     photo it has seen and re-sends the whole table to newcomers.

import { supabase, roomChannel } from '../supabaseClient.js'
import { roomStateFrom } from './RoomState.js'
import { DiceMode, ScoreEntry } from './GameConfig.js'

/** Unambiguous 4-letter code (no I/O/0/1) — same alphabet as iOS. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
export function makeCode() {
  const a = CODE_ALPHABET
  return Array.from({ length: 4 }, () => a[Math.floor(Math.random() * a.length)]).join('')
}

/** Seats silent this long may be reclaimed by a same-name joiner with a new id. */
const RECLAIM_AFTER_MS = 45_000

export class RoomHost {
  constructor(game) {
    this.game = game
    this.code = null
    this.channel = null
    this.status = 'idle'           // idle | connecting | connected | disconnected
    this.rev = 0
    this._lastSeen = new Map()     // seat id → last intent time
    this._avatars = new Map()      // seat id → base64 JPEG wire string ('' = cleared)
    this._pending = false
    this._unsubGame = null
    this._listeners = new Set()
    this._timers = new Set()
  }

  subscribe(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn) }
  _notify() { for (const fn of this._listeners) fn(this) }

  get isHosting() { return this.channel != null }
  get joinURL() { return this.code ? `https://rolligan.com/join?code=${this.code}` : null }

  /** Photos known to the room (data URLs for the host UI). */
  avatarDataUrl(id) {
    const w = this._avatars.get(id)
    return w ? `data:image/jpeg;base64,${w}` : null
  }

  // ── Control ──────────────────────────────────────────────────────────────

  /** Open a room (new code, or the given one when resuming) and start
   *  broadcasting. `rev` continues a resumed game's revision counter: joiners
   *  drop snapshots older than the last one they saw, so a restarted host
   *  must keep counting up on the same channel. */
  start(code = makeCode(), rev = 0) {
    if (this.channel || !supabase) return
    this.code = code.toUpperCase()
    this.rev = Math.max(0, rev)
    this.status = 'connecting'

    const ch = supabase.channel(roomChannel(this.code), {
      config: { broadcast: { self: false, ack: false } },
    })
    this.channel = ch
    const pid = (p) => (typeof p?.playerId === 'string' ? p.playerId.toUpperCase() : null)
    ch.on('broadcast', { event: 'join' }, ({ payload }) => {
      const id = pid(payload); if (id) this._apply({ kind: 'join', id, name: String(payload.name ?? '') })
    })
    ch.on('broadcast', { event: 'bank' }, ({ payload }) => {
      const id = pid(payload); if (id) this._apply({ kind: 'bank', id })
    })
    ch.on('broadcast', { event: 'leave' }, ({ payload }) => {
      const id = pid(payload); if (id) this._apply({ kind: 'leave', id })
    })
    ch.on('broadcast', { event: 'roll' }, ({ payload }) => {
      const id = pid(payload); if (id) this._apply({ kind: 'roll', id })
    })
    ch.on('broadcast', { event: 'enterRoll' }, ({ payload }) => {
      const id = pid(payload); const total = Number(payload?.total)
      if (id && Number.isInteger(total)) this._apply({ kind: 'enterRoll', id, total })
    })
    ch.on('broadcast', { event: 'enterDoubles' }, ({ payload }) => {
      const id = pid(payload); if (id) this._apply({ kind: 'enterDoubles', id })
    })
    ch.on('broadcast', { event: 'avatar' }, ({ payload }) => {
      const id = pid(payload); if (!id) return
      this._avatars.set(id, typeof payload.jpeg === 'string' ? payload.jpeg : '')
      this._notify()
    })
    ch.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        this.status = 'connected'
        // First subscribe AND every auto-reconnect: re-send the live snapshot
        // so any waiting / dropped joiner recovers, then the table's photos.
        this._snapshotAndSend()
        this._after(1500, () => this.sendAllAvatars())
      } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
        this.status = 'disconnected'   // supabase-js retries on its own
      } else if (s === 'CLOSED') {
        this.status = this.channel ? 'disconnected' : 'idle'
      }
      this._notify()
    })

    this._unsubGame = this.game.subscribe(() => this._scheduleBroadcast())
    this._notify()
  }

  /** Close the room (tells joiners the host left). */
  stop() {
    const ch = this.channel
    if (!ch) return
    for (const t of this._timers) clearTimeout(t)
    this._timers.clear()
    this._unsubGame?.(); this._unsubGame = null
    try { ch.send({ type: 'broadcast', event: 'host-bye', payload: { code: this.code } }) } catch { /* closing */ }
    this.channel = null
    this.status = 'idle'
    this.code = null
    supabase?.removeChannel(ch)
    this._notify()
  }

  // ── Broadcast ────────────────────────────────────────────────────────────

  _scheduleBroadcast() {
    if (this._pending) return
    this._pending = true
    queueMicrotask(() => { this._pending = false; this._snapshotAndSend() })
  }

  _snapshotAndSend() {
    if (!this.channel || !this.code) return
    this.rev += 1
    this.lastState = roomStateFrom(this.game, this.code, this.rev)
    this.channel.send({ type: 'broadcast', event: 'state', payload: this.lastState })
  }

  _after(ms, fn) {
    const t = setTimeout(() => { this._timers.delete(t); if (this.channel) fn() }, ms)
    this._timers.add(t)
  }

  // ── Photos ───────────────────────────────────────────────────────────────

  /** Record a local player's photo (base64 128 px JPEG, or '' to clear) and share it. */
  setAvatar(id, jpeg) {
    this._avatars.set(id, jpeg || '')
    this.channel?.send({ type: 'broadcast', event: 'avatar', payload: { playerId: id, jpeg: jpeg || '' } })
    this._notify()
  }

  /** Send every photo we know so a newcomer sees the whole table; one small
   *  message per photo, spaced out to stay under the channel's rate limit. */
  sendAllAvatars() {
    if (!this.channel) return
    let i = 0
    for (const p of this.game.players) {
      const jpeg = this._avatars.get(p.id)
      if (!jpeg) continue
      this._after(i++ * 120, () => this.channel?.send({ type: 'broadcast', event: 'avatar', payload: { playerId: p.id, jpeg } }))
    }
  }

  // ── Inbound intents ──────────────────────────────────────────────────────

  _apply(intent) {
    const game = this.game
    const { id } = intent
    switch (intent.kind) {
      case 'join': {
        // SEAT RECLAIM: an unknown id joining with a name that exactly matches a
        // seat gone quiet (no intents for 45 s) is that player back with a fresh
        // device id — rebind their old seat (score and all) instead of seating
        // them twice. Two ACTIVE players sharing a name both stay recent.
        const trimmed = intent.name.trim().toLowerCase()
        const unknown = !game.players.some((p) => p.id === id)
        const now = Date.now()
        const zombie = unknown && trimmed
          ? game.players.find((p) => p.name.trim().toLowerCase() === trimmed
              && (!this._lastSeen.has(p.id) || now - this._lastSeen.get(p.id) > RECLAIM_AFTER_MS))
          : null
        if (zombie) {
          game.rebindPlayer(zombie.id, id)
          this._lastSeen.delete(zombie.id)
          if (this._avatars.has(zombie.id)) { this._avatars.set(id, this._avatars.get(zombie.id)); this._avatars.delete(zombie.id) }
        } else {
          game.addRemotePlayer(id, intent.name)
        }
        this._after(800, () => this.sendAllAvatars())
        break
      }
      case 'bank':
        game.bank([id])
        break
      case 'leave':
        game.removePlayer(id)
        break
      case 'roll':
        if (game.config.diceMode === DiceMode.virtual && game.currentRollerID === id) game.roll()
        break
      case 'enterRoll':
        if (game.config.diceMode === DiceMode.physical && game.config.scoreEntry === ScoreEntry.eachRoller
            && game.currentRollerID === id && intent.total >= 2 && intent.total <= 12) game.enterRoll(intent.total)
        break
      case 'enterDoubles':
        if (game.config.diceMode === DiceMode.physical && game.config.scoreEntry === ScoreEntry.eachRoller
            && game.currentRollerID === id) game.enterDoubles()
        break
    }
    // Stamp activity AFTER applying, so a reclaim join can't be blocked by its own arrival.
    this._lastSeen.set(id, Date.now())
    // A reconnecting joiner whose seat already exists may cause no engine
    // change, so always force a snapshot: any new or returning client
    // immediately receives the live state.
    this._scheduleBroadcast()
    this._notify()
  }
}
