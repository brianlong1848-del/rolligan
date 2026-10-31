// Free games + Rolligan unlock entitlement for the web host (Android app).
// Mirrors StoreManager.swift: the first 3 games a banker STARTS are free, then
// the one-time Rolligan unlock unlock. Joining someone else's room is never
// counted or gated. Counts live in this browser's localStorage.

import { isPlayBillingAvailable, restoreProFromPlay } from './playBilling.js'

export const FREE_GAME_LIMIT = 3
const STARTED_KEY = 'rolligan:hostGamesStarted'
const PRO_KEY = 'rolligan:pro'

const read = (k) => { try { return localStorage.getItem(k) } catch { return null } }
const write = (k, v) => { try { localStorage.setItem(k, v) } catch { /* storage blocked */ } }

export const isPro = () => read(PRO_KEY) === '1'
export const markPro = () => write(PRO_KEY, '1')

export const freeGamesStarted = () => Math.max(0, parseInt(read(STARTED_KEY) || '0', 10) || 0)

/** Free games still available (null = unlimited). */
export const freeGamesLeft = () => (isPro() ? null : Math.max(0, FREE_GAME_LIMIT - freeGamesStarted()))

/** May the banker start a new game right now? */
export const canStartGame = () => (freeGamesLeft() ?? 1) > 0

/** Call when a NEW game starts (not on resume). Counts only free games. */
export function recordGameStarted() {
  if (isPro()) return
  write(STARTED_KEY, String(freeGamesStarted() + 1))
}

/**
 * Hosting is offered only inside the Android app (the Digital Goods API is
 * the tell). In a Vite dev build `?devhost=1` (remembered) unlocks the host
 * screens in a plain browser for local testing; production never does.
 */
export function hostingAvailable() {
  if (isPlayBillingAvailable()) return true
  if (import.meta.env.DEV) {
    const p = new URLSearchParams(window.location.search)
    if (p.has('devhost')) write('rolligan:devhost', '1')
    return read('rolligan:devhost') === '1'
  }
  return false
}

/** On launch inside the app: silently restore Pro from the Google account. */
export async function refreshEntitlement() {
  if (isPro() || !isPlayBillingAvailable()) return isPro()
  if (await restoreProFromPlay()) markPro()
  return isPro()
}
