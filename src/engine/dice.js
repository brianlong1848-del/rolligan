// Dice — port of rolligan-ios/Rolligan/Models/Die.swift.
// Pure value helpers: a pair is `{ a, b }` with faces 1–6.

export const randomFace = () => 1 + Math.floor(Math.random() * 6)

export const makePair = (a = 1, b = 1) => ({ a: clampFace(a), b: clampFace(b) })

export const clampFace = (f) => Math.max(1, Math.min(6, Number(f) || 1))

export const rolledPair = () => makePair(randomFace(), randomFace())

export const pairSum = (p) => p.a + p.b
export const isSeven = (p) => pairSum(p) === 7
export const isDoubles = (p) => p.a === p.b

/** A representative pair that sums to `total` (2–12), for the banker's keypad. */
export function pairForTotal(total) {
  const t = Math.max(2, Math.min(12, total))
  const a = Math.max(1, t - 6)
  return makePair(a, t - a)
}

/** A representative DOUBLES pair — the face doesn't matter, doubles just double. */
export function doublesPair() {
  const f = randomFace()
  return makePair(f, f)
}
