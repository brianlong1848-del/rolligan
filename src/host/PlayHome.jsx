// /play — the Android app's start screen (manifest start_url). Host a game
// (only inside the app) or join one. In an ordinary browser this page is
// join-only, exactly like the rest of rolligan.com.
import { useEffect, useState } from 'react'
import { C } from '../ui/shared.js'
import { hostingAvailable, refreshEntitlement, freeGamesLeft, isPro } from '../billing/entitlement.js'
import { loadHostGame } from './hostSave.js'

export default function PlayHome() {
  const canHost = hostingAvailable()
  const [pro, setPro] = useState(isPro())
  useEffect(() => { refreshEntitlement().then(setPro) }, [])
  const left = pro ? null : freeGamesLeft()
  const resume = canHost ? loadHostGame() : null

  return (
    <div style={H.root}>
      <div style={H.card}>
        <div style={H.eyebrow}>PUSH YOUR LUCK · DICE PARTY GAME</div>
        <h1 style={H.wordmark}>Rolligan</h1>
        <p style={H.lede}>Roll the dice, build the pot, bank your points before someone rolls a 7.</p>
        {canHost ? (
          <>
            {resume && <a href="/host?resume=1" style={{ ...H.primary, background: C.mint }}>
              RESUME GAME · ROOM {resume.code}</a>}
            <a href="/host" style={H.primary}>HOST A GAME 🎲</a>
            <div style={H.hint}>
              {pro ? 'Rolligan Pro ✓ · unlimited games'
                : left > 0 ? `${left} of 3 free games left, then $2.99 once` : 'Free games used · unlock Rolligan Pro to keep hosting'}
            </div>
          </>
        ) : (
          <div style={H.hint}>Hosting a game happens in the Rolligan app (App Store · Google Play). Joining is free right here.</div>
        )}
        <a href="/join" style={H.secondary}>JOIN A GAME →</a>
        <div style={H.hint}>Everyone plays on their own phone. Friends always join free.</div>
        <div style={{ ...H.hint, fontSize: 12, marginTop: 24 }}>
          <a href="/privacy.html" style={{ color: C.inkDim }}>Privacy</a> · © 2026 Clarendon Labs LLC
        </div>
      </div>
    </div>
  )
}

const H = {
  root: { minHeight: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center',
    background: C.bg, color: C.ink, fontFamily: 'Inter, -apple-system, system-ui, sans-serif' },
  card: { width: '100%', maxWidth: 420, padding: '48px 24px', display: 'flex', flexDirection: 'column',
    gap: 14, textAlign: 'center' },
  eyebrow: { color: C.orange, letterSpacing: 2.2, fontSize: 11, fontWeight: 700 },
  wordmark: { color: C.orange, fontSize: 64, fontWeight: 800, margin: '0 0 4px', letterSpacing: -1.5 },
  lede: { color: C.inkDim, margin: '0 0 10px', fontSize: 15 },
  primary: { display: 'block', background: C.orange, color: C.charcoal, borderRadius: 999,
    padding: '18px', fontSize: 16, fontWeight: 800, letterSpacing: 1, textDecoration: 'none' },
  secondary: { display: 'block', background: 'transparent', color: C.mint, border: `1.5px solid ${C.mint}`,
    borderRadius: 999, padding: '16px', fontSize: 15, fontWeight: 800, letterSpacing: 1, textDecoration: 'none' },
  hint: { color: C.inkDim, fontSize: 13 },
}
