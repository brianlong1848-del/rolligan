// Rolligan unlock paywall for the Android app: first 3 hosted games are free,
// then a one-time Play Billing purchase (com.clarendonlabs.rolligan.host).
import { useEffect, useState } from 'react'
import { C } from '../ui/shared.js'
import { FREE_GAME_LIMIT, markPro } from '../billing/entitlement.js'
import { buyProWithPlay, restoreProFromPlay, getPlayProPrice, isPlayBillingAvailable,
  PLAY_PRO_FALLBACK_PRICE } from '../billing/playBilling.js'

export default function Paywall({ onUnlocked, onClose }) {
  const [price, setPrice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const available = isPlayBillingAvailable()

  useEffect(() => {
    let live = true
    getPlayProPrice().then((p) => { if (live) setPrice(p) })
    return () => { live = false }
  }, [])

  async function buy() {
    setBusy(true); setMsg('')
    const r = await buyProWithPlay()
    setBusy(false)
    if (r.ok) { markPro(); onUnlocked(r.restored) }
    else if (r.reason === 'cancelled') setMsg('No charge — maybe next time.')
    else if (r.reason === 'unavailable') setMsg('Google Play purchases are only available inside the Rolligan app on Android.')
    else setMsg(`Purchase didn’t go through${r.message ? `: ${r.message}` : ''}. Try again.`)
  }
  async function restore() {
    setBusy(true); setMsg('')
    const owned = await restoreProFromPlay()
    setBusy(false)
    if (owned) { markPro(); onUnlocked(true) }
    else setMsg('No Rolligan purchase found on this Google account.')
  }

  const perks = [
    ['♾️', 'Unlimited games', 'Host as many games as the table can take.'],
    ['📱', 'Everyone on their own phone', 'Friends join free, in the app or at rolligan.com/join.'],
    ['🎲', 'Every house rule', 'Real or virtual dice, each-roller tracking, safe-roll bonuses.'],
  ]
  return (
    <div style={P.wrap}>
      <div style={P.card}>
        <div style={P.eyebrow}>UNLOCK ROLLIGAN</div>
        <h1 style={P.title}>Your {FREE_GAME_LIMIT} free games are up.</h1>
        <p style={P.lede}>One unlock keeps you playing forever. No subscription, no ads.</p>
        <div style={{ display: 'grid', gap: 10, margin: '14px 0 18px' }}>
          {perks.map(([ic, h, b]) => (
            <div key={h} style={P.perk}>
              <span style={{ fontSize: 24 }}>{ic}</span>
              <span><strong style={{ display: 'block', color: C.ink }}>{h}</strong>
                <span style={{ color: C.inkDim, fontSize: 13 }}>{b}</span></span>
            </div>
          ))}
        </div>
        <button style={{ ...P.primary, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={buy}>
          {busy ? 'ONE MOMENT…' : `UNLOCK ROLLIGAN · ${price ?? PLAY_PRO_FALLBACK_PRICE} ONCE`}
        </button>
        <button style={P.secondary} disabled={busy} onClick={restore}>Restore purchase</button>
        {!available && <div style={P.note}>Purchases happen through Google Play inside the Rolligan Android app.</div>}
        {msg && <div style={{ ...P.note, color: C.orange }}>{msg}</div>}
        <button style={P.link} onClick={onClose}>Not now</button>
        <div style={P.note}>Joining a friend’s game is always free.</div>
      </div>
    </div>
  )
}

const P = {
  wrap: { minHeight: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'center' },
  eyebrow: { color: C.orange, letterSpacing: 2.2, fontSize: 11, fontWeight: 700 },
  title: { fontSize: 30, fontWeight: 800, letterSpacing: -0.5, margin: '2px 0 0', color: C.ink },
  lede: { color: C.inkDim, margin: 0, fontSize: 15 },
  perk: { display: 'flex', gap: 12, alignItems: 'center', textAlign: 'left', background: C.panel,
    borderRadius: 14, padding: '12px 14px' },
  primary: { background: C.orange, color: C.charcoal, border: 'none', borderRadius: 999,
    padding: '17px', fontSize: 15, fontWeight: 800, letterSpacing: 0.8, cursor: 'pointer', fontFamily: 'inherit' },
  secondary: { background: 'transparent', color: C.mint, border: `1.5px solid ${C.mint}`, borderRadius: 999,
    padding: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' },
  link: { background: 'none', border: 'none', color: C.inkDim, fontWeight: 600, cursor: 'pointer',
    padding: 10, fontFamily: 'inherit', fontSize: 14 },
  note: { color: C.inkDim, fontSize: 12 },
}
