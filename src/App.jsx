import { useState, useRef } from "react";

const T = {
  bg: '#060e1c',
  s1: '#0b1a2f',
  s2: '#112240',
  s3: '#162e52',
  border: '#1c3460',
  gold: '#f5a623',
  gFade: 'rgba(245,166,35,0.13)',
  gGlow: 'rgba(245,166,35,0.35)',
  green: '#00d97e',
  nFade: 'rgba(0,217,126,0.12)',
  red: '#ff4d5a',
  rFade: 'rgba(255,77,90,0.13)',
  text: '#cce0f5',
  sub: '#4d7099',
};

const KEYS = ['7','8','9','4','5','6','1','2','3','⌫','0','↵'];

function NumPad({ val, setVal, onEnter }) {
  const tap = k => {
    if (k === '⌫') { setVal(v => v.slice(0, -1)); return; }
    if (k === '↵') { onEnter(); return; }
    setVal(v => v.length < 2 ? v + k : v);
  };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 16px' }}>
      {KEYS.map(k => (
        <button key={k} onClick={() => tap(k)} style={{
          height: 72, borderRadius: 14, border: 'none',
          fontSize: k === '↵' || k === '⌫' ? 22 : 28,
          fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          background: k === '↵' ? T.gold : k === '⌫' ? T.s2 : T.s3,
          color: k === '↵' ? '#000' : T.text,
          boxShadow: k === '↵' ? `0 4px 24px ${T.gGlow}` : 'none',
        }}>{k}</button>
      ))}
    </div>
  );
}

const IBtn = ({ children, onClick, disabled, danger }) => (
  <button onClick={onClick} disabled={disabled} style={{
    border: 'none', borderRadius: 8, padding: '6px 10px',
    cursor: disabled ? 'default' : 'pointer',
    background: danger ? T.rFade : disabled ? 'transparent' : T.s2,
    color: danger ? T.red : disabled ? T.sub : T.text,
    opacity: disabled ? 0.3 : 1, fontSize: 14, fontFamily: 'inherit',
  }}>{children}</button>
);

const DragHandle = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '6px 8px', cursor: 'grab', opacity: 0.45, flexShrink: 0,
  }}>
    <div style={{ width: 20, height: 2.5, background: T.text, borderRadius: 2 }} />
    <div style={{ width: 20, height: 2.5, background: T.text, borderRadius: 2 }} />
    <div style={{ width: 20, height: 2.5, background: T.text, borderRadius: 2 }} />
  </div>
);

function DraggablePlayerList({ names, setNames }) {
  const dragIdx = useRef(null);
  const [dragging, setDragging] = useState(null);
  const itemRefs = useRef([]);
  const touchIdx = useRef(null);

  const onDragStart = (i) => {
    dragIdx.current = i;
    setDragging(i);
  };

  const onDragEnter = (i) => {
    if (dragIdx.current === null || dragIdx.current === i) return;
    setNames(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(i, 0, moved);
      dragIdx.current = i;
      return next;
    });
  };

  const onDragEnd = () => {
    dragIdx.current = null;
    setDragging(null);
  };

  const onTouchStart = (e, i) => {
    touchIdx.current = i;
    setDragging(i);
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    const y = e.touches[0].clientY;
    itemRefs.current.forEach((el, i) => {
      if (!el || i === touchIdx.current) return;
      const rect = el.getBoundingClientRect();
      if (y >= rect.top && y <= rect.bottom) {
        setNames(prev => {
          const next = [...prev];
          const [moved] = next.splice(touchIdx.current, 1);
          next.splice(i, 0, moved);
          touchIdx.current = i;
          return next;
        });
      }
    });
  };

  const onTouchEnd = () => {
    touchIdx.current = null;
    setDragging(null);
  };

  return (
    <div>
      {names.map((n, i) => (
        <div
          key={n + i}
          ref={el => itemRefs.current[i] = el}
          draggable
          onDragStart={() => onDragStart(i)}
          onDragEnter={() => onDragEnter(i)}
          onDragEnd={onDragEnd}
          onDragOver={e => e.preventDefault()}
          onTouchStart={e => onTouchStart(e, i)}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '11px 10px 11px 4px', marginBottom: 7, borderRadius: 12,
            background: dragging === i ? T.s3 : T.s2,
            border: `1px solid ${dragging === i ? T.gold : T.border}`,
            opacity: dragging === i ? 0.8 : 1,
            transition: 'background 0.15s, border 0.15s',
            touchAction: 'none',
          }}
        >
          <DragHandle />
          <span style={{ color: T.sub, fontSize: 12, minWidth: 18, textAlign: 'center' }}>{i + 1}</span>
          <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{n}</span>
          <IBtn danger onClick={() => setNames(a => a.filter((_, j) => j !== i))}>✕</IBtn>
        </div>
      ))}
    </div>
  );
}

export default function BankGame() {
  const [phase, setPhase] = useState('setup');
  const [names, setNames] = useState([]);
  const [nameInp, setNameInp] = useState('');
  const [roundPref, setRoundPref] = useState(10);
  const [customR, setCustomR] = useState('');
  const [usingCustom, setUsingCustom] = useState(false);
  const [round, setRound] = useState(1);
  const [players, setPlayers] = useState([]);
  const [ci, setCi] = useState(0);
  const [dice, setDice] = useState('');
  const [scr, setScr] = useState('roll');
  const [rolled, setRolled] = useState(null);
  const [note, setNote] = useState('');
  const [rdNote, setRdNote] = useState('');
  const [snap, setSnap] = useState(null);
  const [prevRound, setPrevRound] = useState(null);

  const saveRoundStart = (r, ps) => {
    setPrevRound({ round: r, players: JSON.parse(JSON.stringify(ps)) });
  };

  const totalR = usingCustom && customR ? (parseInt(customR) || 10) : roundPref;
  const early = round <= 3;
  const cur = players[ci] ?? {};

  const addName = () => {
    const n = nameInp.trim();
    if (!n) return;
    setNames(a => [...a, n]);
    setNameInp('');
  };

  const startGame = () => {
    if (names.length < 2) return;
    const ps = names.map((name, id) => ({ id, name, bankPts: 0, roundPts: 0, banked: false }));
    setPlayers(ps);
    setRound(1); setCi(0); setDice(''); setScr('roll');
    setRolled(null); setNote(''); setRdNote(''); setSnap(null);
    saveRoundStart(1, ps);
    setPhase('game');
  };

  const nextCI = (ps, from) => {
    if (early) return from + 1 < ps.length ? from + 1 : -1;
    for (let c = 1; c <= ps.length; c++) {
      const i = (from + c) % ps.length;
      if (!ps[i].banked) return i;
    }
    return -1;
  };

  const endRound = (ps, sevened) => {
    const final = ps
      .map(p => ({
        ...p,
        bankPts: early ? p.bankPts + p.roundPts : p.bankPts,
        roundPts: 0,
        banked: false,
      }))
      .sort((a, b) => b.bankPts - a.bankPts);
    setPlayers(final); setCi(0); setSnap(null);
    setRdNote(sevened
      ? '💥 Seven! Unbanked players lose their round points.'
      : '✅ Round complete! Players re-ranked by bank.');
    setScr('roundEnd'); setRolled(null); setNote(''); setDice('');
  };

  const advance = (ps, from) => {
    if (!early && ps.every(p => p.banked)) { endRound(ps, false); return; }
    const n = nextCI(ps, from);
    if (n === -1) { endRound(ps, false); return; }
    setCi(n); setDice(''); setScr('roll'); setRolled(null); setNote(''); setSnap(null);
  };

  const doBank = () => {
    const ps = players.map((p, i) => i === ci
      ? { ...p, bankPts: p.bankPts + p.roundPts, roundPts: 0, banked: true }
      : p);
    setPlayers(ps);
    advance(ps, ci);
  };

  const doDoubles = () => {
    const ps = players.map((p, i) => i === ci ? { ...p, bankPts: p.bankPts * 2 } : p);
    setPlayers(ps); setSnap(null);
    advance(ps, ci);
  };

  const doRoll = () => {
    const v = parseInt(dice);
    if (!dice || isNaN(v) || v < 2 || v > 12) return;
    setDice(''); setRolled(v);

    if (early) {
      const pts = v === 7 ? 70 : v;
      const ps = players.map((p, i) => i === ci ? { ...p, roundPts: p.roundPts + pts } : p);
      setPlayers(ps); setSnap(ps);
      setNote(v === 7 ? '🎲 SEVEN = 70 points!' : `+${pts} points`);
      setScr('rolled');
      return;
    }

    if (v === 7) {
      const ps = players.map(p => p.banked ? p : { ...p, roundPts: 0 });
      setPlayers(ps); setSnap(ps);
      setNote('💥 SEVEN! Unbanked players cleared!');
      setScr('rolled');
      return;
    }

    const ps = players.map((p, i) => i === ci ? { ...p, roundPts: p.roundPts + v } : p);
    setPlayers(ps); setSnap(ps);
    setNote(`+${v} points`);
    setScr('rolled');
  };

  const doNext = () => advance(snap ?? players, ci);

  const doNextRound = () => {
    if (round >= totalR) { setPhase('end'); return; }
    const nextR = round + 1;
    saveRoundStart(nextR, players);
    setRound(nextR); setScr('roll'); setNote(''); setRdNote('');
    setDice(''); setRolled(null); setSnap(null);
  };

  const doRedoRound = () => {
    if (!prevRound) return;
    const ps = prevRound.players.map(p => ({ ...p, roundPts: 0, banked: false }));
    setPlayers(ps);
    setRound(prevRound.round);
    setCi(0); setDice(''); setScr('roll');
    setRolled(null); setNote(''); setRdNote(''); setSnap(null);
  };

  const wrap = {
    background: T.bg, minHeight: '100vh',
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    color: T.text, maxWidth: 480, margin: '0 auto', userSelect: 'none',
  };

  const isSeven = !early && scr === 'rolled' && rolled === 7;

  if (phase === 'setup') return (
    <div style={wrap}>
      <div style={{ padding: '28px 18px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            fontSize: 88, fontWeight: 900, color: T.gold,
            letterSpacing: -5, lineHeight: 1,
            fontFamily: "'Impact', 'Arial Black', fantasy",
            textShadow: `0 0 60px ${T.gGlow}`,
          }}>BANK</div>
          <div style={{ color: T.sub, fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', marginTop: 2 }}>
            The Dice Game
          </div>
        </div>

        <div style={{ background: T.s1, borderRadius: 20, padding: 18, marginBottom: 14 }}>
          <div style={{ color: T.sub, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            Players {names.length > 0 ? `· ${names.length}` : ''}
            {names.length > 1 && <span style={{ color: T.border, fontWeight: 400, marginLeft: 8 }}>· drag to reorder</span>}
          </div>

          <DraggablePlayerList names={names} setNames={setNames} />

          <div style={{ display: 'flex', gap: 8, marginTop: names.length ? 10 : 0 }}>
            <input
              value={nameInp}
              onChange={e => setNameInp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addName()}
              placeholder="Enter player name..."
              autoComplete="off"
              style={{
                flex: 1, padding: '13px 15px', borderRadius: 12,
                border: `1px solid ${T.border}`, background: T.s2,
                color: T.text, fontSize: 16, outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button onClick={addName} style={{
              padding: '0 22px', borderRadius: 12, border: 'none',
              background: T.gold, color: '#000', fontWeight: 700,
              fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
            }}>Add</button>
          </div>
        </div>

        <div style={{ background: T.s1, borderRadius: 20, padding: 18, marginBottom: 22 }}>
          <div style={{ color: T.sub, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            Number of Rounds
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
            {[10, 12, 15].map(r => {
              const active = !usingCustom && roundPref === r;
              return (
                <button key={r} onClick={() => { setRoundPref(r); setUsingCustom(false); setCustomR(''); }} style={{
                  padding: '16px 0', borderRadius: 12, border: `2px solid ${active ? T.gold : T.border}`,
                  background: active ? T.gFade : T.s2, color: active ? T.gold : T.text,
                  fontWeight: 900, fontSize: 26, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: active ? `0 0 16px ${T.gGlow}` : 'none',
                  transition: 'all 0.15s',
                }}>{r}</button>
              );
            })}
          </div>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={customR}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '');
              setCustomR(v); setUsingCustom(!!v);
            }}
            placeholder="Custom number of rounds..."
            style={{
              width: '100%', padding: '13px 15px', borderRadius: 12, boxSizing: 'border-box',
              border: `2px solid ${usingCustom ? T.gold : T.border}`,
              background: T.s2, color: T.text, fontSize: 16,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        <button onClick={startGame} disabled={names.length < 2} style={{
          width: '100%', padding: 20, borderRadius: 16, border: 'none',
          background: names.length >= 2 ? T.gold : T.s2,
          color: names.length >= 2 ? '#000' : T.sub,
          fontWeight: 900, fontSize: 18, letterSpacing: 1,
          cursor: names.length >= 2 ? 'pointer' : 'not-allowed',
          fontFamily: "'Impact', 'Arial Black', fantasy",
          boxShadow: names.length >= 2 ? `0 0 32px ${T.gGlow}` : 'none',
          transition: 'all 0.2s',
        }}>
          {names.length < 2 ? 'Add at least 2 players to start' : '▶  START GAME'}
        </button>
      </div>
    </div>
  );

  if (phase === 'end') return (
    <div style={wrap}>
      <div style={{ padding: '40px 18px 32px' }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{ fontSize: 56, marginBottom: 6 }}>🏆</div>
          <div style={{
            fontSize: 42, fontWeight: 900, color: T.gold, letterSpacing: -1,
            fontFamily: "'Impact', fantasy",
          }}>FINAL SCORES</div>
        </div>
        {players.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '18px 20px', marginBottom: 10, borderRadius: 16,
            background: i === 0 ? T.gFade : T.s1,
            border: `2px solid ${i === 0 ? T.gold : T.border}`,
            boxShadow: i === 0 ? `0 0 24px ${T.gGlow}` : 'none',
          }}>
            <span style={{ fontSize: 24, minWidth: 34, textAlign: 'center' }}>
              {['🥇','🥈','🥉'][i] ?? `${i + 1}.`}
            </span>
            <span style={{ flex: 1, fontSize: 18, fontWeight: 700, color: i === 0 ? T.gold : T.text }}>
              {p.name}
            </span>
            <span style={{ fontSize: 32, fontWeight: 900, color: i === 0 ? T.gold : T.text }}>
              {p.bankPts}
            </span>
          </div>
        ))}
        <button onClick={() => { setPhase('setup'); setNames([]); setNameInp(''); setCustomR(''); setUsingCustom(false); }} style={{
          width: '100%', marginTop: 26, padding: 20, borderRadius: 16, border: 'none',
          background: T.gold, color: '#000', fontWeight: 900, fontSize: 18,
          cursor: 'pointer', fontFamily: "'Impact', fantasy", letterSpacing: 1,
          boxShadow: `0 0 32px ${T.gGlow}`,
        }}>↩  PLAY AGAIN</button>
      </div>
    </div>
  );

  return (
    <div style={wrap}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 18px', background: T.s1, borderBottom: `1px solid ${T.border}`,
      }}>
        <div>
          <div style={{ color: T.sub, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>Round</div>
          <div style={{ color: T.gold, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>
            {round}<span style={{ color: T.sub, fontSize: 13, fontWeight: 400 }}> / {totalR}</span>
          </div>
        </div>
        <div style={{
          padding: '5px 13px', borderRadius: 20,
          background: early ? T.nFade : T.gFade,
          border: `1px solid ${early ? T.green : T.gold}`,
          color: early ? T.green : T.gold,
          fontSize: 11, fontWeight: 700, letterSpacing: 1,
        }}>
          {early ? '★ SPECIAL' : 'STANDARD'}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: T.sub, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Leader</div>
          <div style={{ color: T.gold, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>
            {players[0]?.bankPts ?? 0}
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 16px 6px' }}>
        {players.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 13px', marginBottom: 5, borderRadius: 10,
            background: i === ci && scr !== 'roundEnd' ? T.gFade : T.s1,
            border: `1.5px solid ${
              i === ci && scr !== 'roundEnd' ? T.gold
              : p.banked ? T.green + '55'
              : T.border
            }`,
            transition: 'all 0.2s',
          }}>
            {i === ci && scr !== 'roundEnd' && (
              <span style={{ color: T.gold, fontSize: 11 }}>▶</span>
            )}
            {p.banked && <span style={{ fontSize: 13 }}>🏦</span>}
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: i === ci && scr !== 'roundEnd' ? T.gold : T.text }}>
              {p.name}
            </span>
            {p.roundPts > 0 && !p.banked && (
              <span style={{ color: T.sub, fontSize: 12, marginRight: 2 }}>+{p.roundPts}</span>
            )}
            <span style={{ fontWeight: 900, fontSize: 20, color: i === 0 ? T.gold : T.text, minWidth: 42, textAlign: 'right' }}>
              {p.bankPts}
            </span>
          </div>
        ))}
      </div>

      <div style={{ padding: '8px 0 28px' }}>

        {scr === 'roundEnd' && (
          <div style={{ padding: '18px 16px', textAlign: 'center' }}>
            <div style={{
              background: T.s1, borderRadius: 20, padding: '24px 20px', marginBottom: 14,
              border: `1px solid ${rdNote.includes('Seven') ? T.red + '55' : T.green + '55'}`,
            }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>{rdNote.includes('Seven') ? '💥' : '✅'}</div>
              <div style={{ color: T.text, fontSize: 15 }}>{rdNote}</div>
            </div>

            <button onClick={doRedoRound} style={{
              width: '100%', padding: 16, borderRadius: 14, border: `2px solid ${T.red}`,
              background: T.rFade, color: T.red,
              fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit',
              marginBottom: 10,
            }}>
              ↩ Redo Round {round} — Mistake? Start it over
            </button>

            <button onClick={doNextRound} style={{
              width: '100%', padding: 20, borderRadius: 16, border: 'none',
              background: T.gold, color: '#000', fontWeight: 900, fontSize: 18,
              cursor: 'pointer', fontFamily: "'Impact', fantasy", letterSpacing: 1,
              boxShadow: `0 0 28px ${T.gGlow}`,
            }}>
              {round >= totalR ? '🏆 FINAL RESULTS' : `START ROUND ${round + 1} →`}
            </button>
          </div>
        )}

        {scr === 'rolled' && (
          <div style={{ padding: '14px 16px' }}>
            <div style={{
              background: T.s1, borderRadius: 20, padding: '20px', textAlign: 'center', marginBottom: 14,
              border: `1px solid ${isSeven ? T.red + '60' : T.gold + '45'}`,
              boxShadow: isSeven ? `0 0 30px ${T.rFade}` : `0 0 20px ${T.gFade}`,
            }}>
              <div style={{ color: T.sub, fontSize: 12, marginBottom: 4 }}>
                {cur.name} rolled
              </div>
              <div style={{
                fontSize: 80, fontWeight: 900, lineHeight: 1,
                color: isSeven ? T.red : T.gold,
                textShadow: isSeven ? `0 0 40px ${T.red}` : `0 0 40px ${T.gGlow}`,
                fontFamily: "'Impact', fantasy",
              }}>{rolled}</div>
              {note && (
                <div style={{ color: T.text, fontSize: 15, marginTop: 10 }}>{note}</div>
              )}
            </div>

            {isSeven ? (
              <button onClick={() => endRound(snap ?? players, true)} style={{
                width: '100%', padding: 18, borderRadius: 14, border: `2px solid ${T.red}`,
                background: T.rFade, color: T.red,
                fontWeight: 900, fontSize: 18, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                End Round →
              </button>
            ) : (
              <button onClick={doNext} style={{
                width: '100%', padding: 18, borderRadius: 14, border: `2px solid ${T.border}`,
                background: T.s2, color: T.text,
                fontWeight: 700, fontSize: 17, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Next Player →
              </button>
            )}
          </div>
        )}

        {scr === 'roll' && (
          <>
            <div style={{ padding: '2px 16px 10px', textAlign: 'center' }}>
              <div style={{ color: T.sub, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>
                {cur.name}'s Turn
              </div>
              {early && (
                <div style={{ color: T.green, fontSize: 13, marginTop: 3 }}>
                  7 = 70 points this round!
                </div>
              )}
            </div>

            <div style={{ margin: '0 16px 10px', background: T.s1, borderRadius: 16, padding: '12px 16px', textAlign: 'center' }}>
              <div style={{ color: T.sub, fontSize: 11, marginBottom: 2 }}>Dice Total</div>
              <div style={{
                fontSize: 64, fontWeight: 900, lineHeight: 1, minHeight: 64,
                color: dice ? T.gold : T.border,
                fontFamily: "'Impact', fantasy",
                textShadow: dice ? `0 0 30px ${T.gGlow}` : 'none',
              }}>
                {dice || '—'}
              </div>
            </div>

            {!early && !cur.banked && (
              <div style={{ padding: '0 16px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button onClick={doBank} style={{
                  width: '100%', padding: '14px 0', borderRadius: 14,
                  border: `2px solid ${T.green}`, background: T.nFade, color: T.green,
                  fontWeight: 900, fontSize: 17, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  🏦  BANK — {cur.bankPts + cur.roundPts} pts safe
                </button>
                <button onClick={doDoubles} style={{
                  width: '100%', padding: '14px 0', borderRadius: 14,
                  border: `2px solid ${T.gold}`, background: T.gFade, color: T.gold,
                  fontWeight: 900, fontSize: 17, cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: `0 0 20px ${T.gGlow}`,
                }}>
                  🎲🎲  DOUBLES — Double Bank ({cur.bankPts * 2} pts)
                </button>
              </div>
            )}

            <NumPad val={dice} setVal={setDice} onEnter={doRoll} />
          </>
        )}

      </div>
    </div>
  );
}