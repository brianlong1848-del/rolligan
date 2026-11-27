import { useContext, useState } from 'react'
import { C, PhotosCtx, PIP_GRID, shade } from './shared.js'

/** A player's circle: photo if we have one, otherwise their initial. */
export function Avatar({ id, name, color, size = 30, ring, ringWidth = 2 }) {
  const photos = useContext(PhotosCtx)
  const src = id ? photos[id] : null
  const initial = (name || '?').trim().slice(0, 1).toUpperCase() || '?'
  return (
    <span aria-hidden="true" style={{
      width: size, height: size, borderRadius: 999, flex: 'none', overflow: 'hidden',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: color, color: C.charcoal, fontWeight: 900, fontSize: Math.round(size * 0.42),
      boxShadow: ring ? `0 0 0 ${ringWidth}px ${ring}` : 'none',
    }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
    </span>
  )
}

/** One die face, pip-perfect, with a quick tumble animation on every new roll. */
export function Die({ face, body, rollKey }) {
  const pips = PIP_GRID[Math.max(1, Math.min(6, face))] ?? []
  return (
    <div key={rollKey} className="rol-die" style={{ background: `linear-gradient(145deg, ${body}, ${shade(body)})` }}>
      <span className="rol-die-gloss" />
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="rol-pip" style={{ opacity: pips.includes(i) ? 1 : 0 }} />
      ))}
    </div>
  )
}

/** Celebratory emoji rain for the finale. */
export function Confetti({ extra = [] }) {
  const [pieces] = useState(() => {
    const glyphs = ['🎉', '🎊', '⭐️', '🥇', '🎲', ...extra]
    return Array.from({ length: 30 }, (_, i) => ({
      i, g: glyphs[Math.floor(Math.random() * glyphs.length)],
      left: Math.random() * 100, delay: Math.random() * 1.6, size: 18 + Math.random() * 26,
    }))
  })
  return (
    <div className="rol-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span key={p.i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, fontSize: `${p.size}px` }}>{p.g}</span>
      ))}
    </div>
  )
}

/** Progress pips: one per round — done, current (orange), still to come. */
export function RoundPips({ round, total, height = 5 }) {
  if (!total || total < 1) return null
  if (total > 20) {
    return (
      <div style={{ height, borderRadius: 999, background: C.rule, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, (round / total) * 100)}%`, height: '100%', background: C.orange,
          borderRadius: 999, transition: 'width 0.4s ease' }} />
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 3 }} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{ flex: 1, height, borderRadius: 999, transition: 'background 0.3s ease',
          background: i + 1 < round ? 'rgba(248,247,244,0.45)' : i + 1 === round ? C.orange : C.rule }} />
      ))}
    </div>
  )
}

/** The round header: big orange number, "of N", and a pip per round so the
 *  whole table can see where the game stands. `children` sits on the right. */
export function RoundMeter({ round, total, children }) {
  const last = total > 0 && round >= total
  return (
    <div role="status" aria-label={`Round ${round} of ${total}`} style={{ background: C.panel, borderRadius: 14,
      padding: '8px 12px 10px', border: `1.5px solid ${last ? C.orange : C.rule}`, display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.8, color: last ? C.orange : C.inkDim }}>
          {last ? 'FINAL ROUND' : 'ROUND'}</span>
        <span key={round} className="rol-round-num" style={{ fontSize: 30, fontWeight: 900, lineHeight: 1,
          color: C.orange, letterSpacing: -0.5 }}>{round}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.inkDim }}>of {total}</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8 }}>{children}</span>
      </div>
      <RoundPips round={round} total={total} />
    </div>
  )
}

/** Pops up as each round begins. The last round gets the FINAL ROUND treatment. */
export function RoundSplash({ round, total }) {
  const last = total > 1 && round >= total
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 68, display: 'flex', alignItems: 'center',
      justifyContent: 'center', pointerEvents: 'none' }}>
      <div className="rol-danger-pop" style={{ background: 'rgba(26,26,32,0.97)', borderRadius: 18,
        padding: '20px 34px', textAlign: 'center', color: C.ink, minWidth: 220,
        border: `2px solid ${last ? C.mint : C.orange}`,
        boxShadow: `0 0 40px ${last ? 'rgba(78,205,196,0.45)' : 'rgba(255,107,53,0.4)'}` }}>
        {last && <div style={{ fontSize: 40 }}>🏁</div>}
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2.4, color: last ? C.orange : C.inkDim }}>
          {last ? 'FINAL ROUND' : 'ROUND'}</div>
        <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: C.orange, margin: '2px 0' }}>{round}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.inkDim, marginBottom: 10 }}>of {total}</div>
        <RoundPips round={round} total={total} height={6} />
        <div style={{ fontSize: 13, fontWeight: 600, marginTop: 10 }}>
          {last ? 'last chance — make it count' : round === 1 ? "let's roll" : `${total - round} more after this`}</div>
      </div>
    </div>
  )
}
