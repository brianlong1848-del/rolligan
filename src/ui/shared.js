// Shared bits between the join page and the host (Android app) screens:
// palette, player colors, photo helpers, Avatar, Die, Confetti.

import { createContext } from 'react'

export const C = {
  bg: '#1A1A20', panel: '#22222A', panelMuted: '#121217',
  ink: '#F8F7F4', inkDim: 'rgba(248,247,244,0.5)', rule: 'rgba(248,247,244,0.12)',
  orange: '#FF6B35', mint: '#4ECDC4', charcoal: '#1A1A20', gold: '#F5C24B',
}
export const PLAYER_COLORS = ['#FF6B35', '#4ECDC4', '#F5C24B', '#B084FF', '#FF8FA3',
  '#76D672', '#5BB8FF', '#FF9E64', '#C9B789', '#E25AB8']

export const colorFor = (players, id) =>
  PLAYER_COLORS[Math.max(0, players.findIndex((p) => p.id === id)) % PLAYER_COLORS.length]

// Swift's UUID always serializes UPPERCASE, and the iOS host re-broadcasts each
// seat id as a Swift UUID. crypto.randomUUID() is lowercase, so we MUST uppercase
// ours — otherwise our own seat never string-matches in the host's state snapshot.
export const newId = () =>
  (crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)
    .toUpperCase()

// ── Player photos ─────────────────────────────────────────────────────────
// Photos stay in this browser (localStorage) and are sent LIVE to the players
// in the room as a small JPEG over the broadcast relay — never stored on a server.
export const PhotosCtx = createContext({})

/** Center-crop + resize an image File to a square JPEG data URL. */
export function squareJpeg(file, side, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(img.width, img.height)
      const c = document.createElement('canvas')
      c.width = side; c.height = side
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, side, side)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', quality))
    }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}

/** Downscale a stored data URL to the 128 px wire size; returns bare base64. */
export function wireFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = 128; c.height = 128
      c.getContext('2d').drawImage(img, 0, 0, 128, 128)
      resolve(c.toDataURL('image/jpeg', 0.6).split(',')[1])
    }
    img.onerror = () => resolve('')
    img.src = dataUrl
  })
}


// ── Dice ──────────────────────────────────────────────────────────────────
export const PIP_GRID = { 1: [4], 2: [2, 6], 3: [2, 4, 6], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }
export const shade = (hex) => hex === C.orange ? '#D14E1F' : '#37A89E'

