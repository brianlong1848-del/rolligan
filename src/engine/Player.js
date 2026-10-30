// Player — port of rolligan-ios/Rolligan/Models/Player.swift.
// Ids are UPPERCASE UUID strings: Swift's UUID always serializes uppercase and
// iOS joiners string-compare their own id against the host's snapshot, so the
// host must mint and echo ids in that exact form.

export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .toUpperCase()

export const makePlayer = (name, { id = newId(), score = 0 } = {}) => ({ id, name, score })

/** Default empty-game roster: two blank seats. */
export const defaultRoster = (count = 2) => Array.from({ length: count }, () => makePlayer(''))

/** Remembers the last roster between games so regulars don't get re-typed. */
export const RosterStore = {
  key: 'rolligan:hostRoster',
  load() {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]') } catch { return [] }
  },
  save(names) {
    try { localStorage.setItem(this.key, JSON.stringify(names)) } catch { /* ignore */ }
  },
  /** Players to seed the setup screen with: the saved roster, else two blanks. */
  seedPlayers(min = 1, max = 21) {
    const saved = this.load().filter((n) => typeof n === 'string')
    if (saved.length < min) return defaultRoster()
    return saved.slice(0, max).map((n) => makePlayer(n))
  },
}
