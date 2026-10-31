// Resume support for the web host: the in-progress game + room code live in
// localStorage so a killed / refreshed browser tab can pick the party back up
// on the SAME channel (joiners never notice beyond a short pause).
const KEY = 'rolligan:hostSave'

export function saveHostGame(host, game) {
  try { localStorage.setItem(KEY, JSON.stringify({ code: host.code, rev: host.rev, game: game.snapshotForSave() })) } catch { /* ignore */ }
}
export function loadHostGame() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null')
    return j && j.code && j.game && j.game.phase === 'playing' ? j : null
  } catch { return null }
}
export function clearHostGame() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}
