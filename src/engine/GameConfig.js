// GameConfig — port of rolligan-ios/Rolligan/Models/GameConfig.swift.
// User-configurable rules a game is started with, frozen for one game.

import { defaultRoster } from './Player.js'

/** Real dice at the table (banker types totals) or the app's virtual dice. */
export const DiceMode = Object.freeze({ physical: 'physical', virtual: 'virtual' })

/** Real-dice house rule: who types each roll's total. */
export const ScoreEntry = Object.freeze({ soleBanker: 'soleBanker', eachRoller: 'eachRoller' })

export const MIN_PLAYERS = 1
export const MAX_PLAYERS = 21
export const MIN_ROUNDS = 1
export const MAX_ROUNDS = 30
export const DEFAULT_ROUNDS = 12
export const PRESET_ROUNDS = [10, 12, 15]
export const DEFAULT_SAFE_ROLLS = 3
export const SAFE_ROLLS_RANGE = [1, 5]
export const DEFAULT_SAFE_SEVEN_BONUS = 70
export const BONUS_PRESETS = [50, 70, 100]

export function makeConfig({
  players = defaultRoster(),
  rounds = DEFAULT_ROUNDS,
  safeRolls = DEFAULT_SAFE_ROLLS,
  safeSevenBonus = DEFAULT_SAFE_SEVEN_BONUS,
  diceMode = DiceMode.physical,
  scoreEntry = ScoreEntry.soleBanker,
} = {}) {
  return { players, rounds, safeRolls, safeSevenBonus, diceMode, scoreEntry }
}

/** Backwards-compatible decode of a saved config (older saves lack house rules). */
export function configFromJSON(j) {
  return makeConfig({
    players: (j.players ?? []).map((p) => ({ id: String(p.id).toUpperCase(), name: p.name ?? '', score: p.score ?? 0 })),
    rounds: j.rounds ?? DEFAULT_ROUNDS,
    safeRolls: j.safeRolls ?? DEFAULT_SAFE_ROLLS,
    safeSevenBonus: j.safeSevenBonus ?? DEFAULT_SAFE_SEVEN_BONUS,
    diceMode: j.diceMode === DiceMode.virtual ? DiceMode.virtual : DiceMode.physical,
    scoreEntry: j.scoreEntry === ScoreEntry.eachRoller ? ScoreEntry.eachRoller : ScoreEntry.soleBanker,
  })
}

/** True when the config can legally start a game (count + rounds only; blank
 *  names resolve to "Player N" at start). */
export function isPlayable(c) {
  const n = c.players.length
  return n >= MIN_PLAYERS && n <= MAX_PLAYERS && c.rounds >= MIN_ROUNDS && c.rounds <= MAX_ROUNDS
}
