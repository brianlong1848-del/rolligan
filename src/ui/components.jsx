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
