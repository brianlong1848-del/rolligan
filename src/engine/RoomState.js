// RoomState — port of rolligan-ios/Rolligan/Models/RoomState.swift.
// Builds the `state` broadcast snapshot from the engine, in exactly the wire
// shape iOS joiners (RoomState.init(from:)) and the web join page decode.

import { GamePhase, RoundPhase } from './GameState.js'

export function roomStateFrom(game, code, rev) {
  const finished = game.phase === GamePhase.finished
  const players = game.players.map((p) => {
    const banked = game.bankedAmount(p.id)
    const status = banked != null ? 'banked' : (game.isActive(p.id) ? 'in' : 'out')
    const row = { id: p.id, name: p.name, score: p.score, status }
    if (banked != null) row.bankedThisRound = banked   // absent when not banked, like Swift's encodeIfPresent
    return row
  })
  const state = {
    rev,
    code,
    phase: finished ? 'finished' : 'playing',
    round: game.roundNumber,
    totalRounds: game.totalRounds,
    pot: game.pot,
    rollsThisRound: game.rollsThisRound,
    inSafePhase: game.inSafePhase,
    safeRollsRemaining: game.safeRollsRemaining,
    roundPhase: game.roundPhase === RoundPhase.rolling ? 'rolling' : game.roundPhase,
    bankingOpen: game.bankingOpen,
    lastRollSum: game.lastRollSum,
    winnerIds: finished ? game.winnerIDs : [],
    players,
    diceMode: game.config.diceMode,
    diceA: game.dice.a,
    diceB: game.dice.b,
    roundBusted: !!game.roundSummary?.busted,
    sevenSplashSeq: game.sevenSplashSeq,
    sevenSplashDoubles: game.sevenSplashDoubles,
    scoreEntry: game.config.scoreEntry,
  }
  if (game.currentRollerID) state.currentRollerId = game.currentRollerID
  return state
}
