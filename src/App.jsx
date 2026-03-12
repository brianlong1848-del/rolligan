import { useState, useRef, useEffect } from "react";

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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, padding: '0 12px' }}>
      {KEYS.map(k => (
        <button key={k} onClick={() => tap(k)} style={{
          height: 64, borderRadius: 12, border: 'none',
          fontSize: k === '↵' || k === '⌫' ? 20 : 26,
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
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '6px 10px', flexShrink: 0 }}>
    <div style={{ width: 22, height: 3, background: T.sub, borderRadius: 2 }} />
    <div style={{ width: 22, height: 3, background: T.sub, borderRadius: 2 }} />
    <div style={{ width: 22, height: 3, background: T.sub, borderRadius: 2 }} />
  </div>
);

function DraggablePlayerList({ names, setNames }) {
  const [dragState, setDragState] = useState(null);
  const itemRefs = useRef([]);
  const getClientY = (e) => e.touches ? e.touches[0].clientY : e.clientY;
  const startDrag = (e, i) => {
    e.preventDefault();
    const el = itemRefs.current[i];
    const h = el ? el.getBoundingClientRect().height + 8 : 60;
    setDragState({ idx: i, startY: getClientY(e), currentY: getClientY(e), itemH: h });
  };
  useEffect(() => {
    if (!dragState) return;
    const onMove = (e) => {
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dy = clientY - dragState.startY;
      const newIdx = Math.max(0, Math.min(names.length - 1, dragState.idx + Math.round(dy / dragState.itemH)));
      if (newIdx !== dragState.idx) {
        setNames(prev => {
          const next = [...prev];
          const [moved] = next.splice(dragState.idx, 1);
          next.splice(newIdx, 0, moved);
          return next;
        });
        setDragState(s => ({ ...s, idx: newIdx, startY: s.startY + (newIdx - s.idx) * s.itemH, currentY: clientY }));
      } else {
        setDragState(s => ({ ...s, currentY: clientY }));
      }
    };
    const onEnd = () => setDragState(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [dragState, names.length]);

  return (
    <div>
      {names.map((n, i) => {
        const isDragging = dragState?.idx === i;
        const offsetY = isDragging ? (dragState.currentY - dragState.startY) : 0;
        return (
          <div key={n + i} ref={el => itemRefs.current[i] = el} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '13px 10px 13px 4px', marginBottom: 8, borderRadius: 14,
            background: isDragging ? T.s3 : T.s2,
            border: `1.5px solid ${isDragging ? T.gold : T.border}`,
            transform: `translateY(${offsetY}px) scale(${isDragging ? 1.03 : 1})`,
            boxShadow: isDragging ? `0 12px 40px rgba(0,0,0,0.6), 0 0 24px ${T.gGlow}` : 'none',
            transition: isDragging ? 'box-shadow 0.1s, border-color 0.1s' : 'transform 0.2s ease, box-shadow 0.2s',
            position: 'relative', zIndex: isDragging ? 100 : 1, touchAction: 'none', userSelect: 'none',
          }}>
            <div onMouseDown={e => startDrag(e, i)} onTouchStart={e => startDrag(e, i)}
              style={{ cursor: 'grab', touchAction: 'none', flexShrink: 0 }}>
              <DragHandle />
            </div>
            <span style={{ color: T.sub, fontSize: 13, minWidth: 20, textAlign: 'center', fontWeight: 600 }}>{i + 1}</span>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 16, color: T.text }}>{n}</span>
            <IBtn danger onClick={() => setNames(a => a.filter((_, j) => j !== i))}>✕</IBtn>
          </div>
        );
      })}
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
  const [ci, setCi] = useState(0);           // whose turn it is to ROLL — never changes on tap
  const [dice, setDice] = useState('');
  const [scr, setScr] = useState('roll');
  const [rolled, setRolled] = useState(null);
  const [note, setNote] = useState('');
  const [rdNote, setRdNote] = useState('');
  const [snap, setSnap] = useState(null);
  const [preRoll, setPreRoll] = useState(null);
  const [bankTarget, setBankTarget] = useState(null); // which player tapped to bank

  const totalR = usingCustom && customR ? (parseInt(customR) || 10) : roundPref;
  const early = round <= 3;
  const cur = players[ci] ?? {};
  // The player we're banking for — either tapped player or current roller
  const bankIdx = bankTarget !== null ? bankTarget : ci;
  const bankPlayer = players[bankIdx] ?? {};

  const addName = () => {
    const n = nameInp.trim();
    if (!n || names.length >= 10) return;
    setNames(a => [...a, n]);
    setNameInp('');
  };

  const startGame = () => {
    if (names.length < 2) return;
    const ps = names.map((name, id) => ({ id, name, bankPts: 0, roundPts: 0, banked: false }));
    setPlayers(ps);
    setRound(1); setCi(0); setDice(''); setScr('roll');
    setRolled(null); setNote(''); setRdNote('');
    setSnap(null); setPreRoll(null); setBankTarget(null);
    setPhase('game');
  };

  const nextCI = (ps, from) => {
    for (let c = 1; c <= ps.length; c++) {
      const i = (from + c) % ps.length;
      if (!ps[i].banked) return i;
    }
    return -1;
  };

  const endRound = (ps, sevened) => {
    const final = ps.map(p => ({
      ...p,
      bankPts: p.banked ? p.bankPts : (early ? p.bankPts + p.roundPts : p.bankPts),
      roundPts: 0,
      banked: false,
    })).sort((a, b) => b.bankPts - a.bankPts);
    setPlayers(final); setCi(0); setSnap(null); setPreRoll(null); setBankTarget(null);
    setRdNote(sevened
      ? '💥 Seven! Unbanked players lose their round points.'
      : '✅ Round complete! Players re-ranked by bank.');
    setScr('roundEnd'); setRolled(null); setNote(''); setDice('');
  };

  const advance = (ps, from) => {
    setBankTarget(null);
    if (ps.every(p => p.banked)) { endRound(ps, false); return; }
    const n = nextCI(ps, from);
    if (n === -1) { endRound(ps, false); return; }
    setCi(n); setDice(''); setScr('roll'); setRolled(null); setNote(''); setSnap(null);
  };

  // Tap a player row — sets bankTarget so BANK button banks for them
  // Does NOT change whose turn it is to roll (ci stays the same)
  const tapPlayer = (i) => {
    if (scr !== 'roll') return;
    if (players[i]?.banked) return;
    setBankTarget(i === bankTarget ? null : i); // toggle off if tapped again
  };

  // Bank for bankTarget (or current roller if no target selected)
  const doBank = () => {
    const idx = bankTarget !== null ? bankTarget : ci;
    const ps = players.map((p, i) => i === idx
      ? { ...p, bankPts: p.bankPts + p.roundPts, roundPts: 0, banked: true }
      : p);
    setPlayers(ps);
    setBankTarget(null);
    // Only advance the roller turn if the roller just banked
    if (idx === ci) {
      advance(ps, ci);
    } else {
      // Someone else banked — check if everyone is now banked
      if (ps.every(p => p.banked)) { endRound(ps, false); }
      // else stay on current roller's turn
    }
  };

  const doDoubles = () => {
    const ps = players.map((p, i) => i === ci ? { ...p, bankPts: p.bankPts * 2 } : p);
    setPlayers(ps); setSnap(null); setBankTarget(null);
    advance(ps, ci);
  };

  const doRoll = () => {
    const v = parseInt(dice);
    if (!dice || isNaN(v) || v < 2 || v > 12) return;
    setPreRoll({ players: JSON.parse(JSON.stringify(players)), ci });
    setBankTarget(null);
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

  const doNext = () => { setBankTarget(null); advance(snap ?? players, ci); };

  const doRedoRoll = () => {
    if (!preRoll) return;
    setPlayers(preRoll.players); setCi(preRoll.ci);
    setDice(''); setScr('roll');
    setRolled(null); setNote(''); setSnap(null); setPreRoll(null); setBankTarget(null);
  };

  const doNextRound = () => {
    if (round >= totalR) { setPhase('end'); return; }
    setRound(r => r + 1);
    setScr('roll'); setNote(''); setRdNote('');
    setDice(''); setRolled(null); setSnap(null); setPreRoll(null); setBankTarget(null);
  };

  const isSeven = !early && scr === 'rolled' && rolled === 7;
  const manyPlayers = players.length > 6;
  const rowPad = manyPlayers ? '6px 10px' : '9px 13px';
  const rowFont = manyPlayers ? 12 : 14;
  const scoreFont = manyPlayers ? 16 : 20;

  const wrap = {
    background: T.bg, minHeight: '100vh', width: '100%',
    fontFamily: "'Trebuchet MS', 'Segoe UI', sans-serif",
    color: T.text, userSelect: 'none', overflowX: 'hidden',
  };

  // ══ SETUP ══
  if (phase === 'setup') return (
    <div style={wrap}>
      <div style={{ padding: '28px 18px 40px', paddingTop: 'max(env(safe-area-inset-top, 28px), 28px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{
            fontSize: 80, fontWeight: 900, color: T.gold, letterSpacing: -5, lineHeight: 1,
            fontFamily: "'Impact', 'Arial Black', fantasy", textShadow: `0 0 60px ${T.gGlow}`,
          }}>BANK</div>
          <div style={{ color: T.sub, fontSize: 11, letterSpacing: 5, textTransform: 'uppercase', marginTop: 4 }}>
            The Dice Game
          </div>
        </div>

        <div style={{ background: T.s1, borderRadius: 20, padding: 18, marginBottom: 14 }}>
          <div style={{ color: T.sub, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Players{names.length > 0 ? ` · ${names.length}/10` : ' (max 10)'}</span>
            {names.length > 1 && <span style={{ color: T.border, fontWeight: 400, fontSize: 10, textTransform: 'none', letterSpacing: 0 }}>☰ drag to reorder</span>}
          </div>
          <DraggablePlayerList names={names} setNames={setNames} />
          <div style={{ display: 'flex', gap: 8, marginTop: names.length ? 10 : 0 }}>
            <input value={nameInp} onChange={e => setNameInp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addName()}
              placeholder={names.length >= 10 ? 'Max 10 players reached' : 'Enter player name...'}
              disabled={names.length >= 10} autoComplete="off"
              style={{
                flex: 1, padding: '13px 15px', borderRadius: 12,
                border: `1px solid ${T.border}`, background: T.s2,
                color: T.text, fontSize: 16, outline: 'none', fontFamily: 'inherit',
                opacity: names.length >= 10 ? 0.4 : 1,
              }} />
            <button onClick={addName} disabled={names.length >= 10} style={{
              padding: '0 22px', borderRadius: 12, border: 'none',
              background: names.length >= 10 ? T.s2 : T.gold,
              color: names.length >= 10 ? T.sub : '#000',
              fontWeight: 700, fontSize: 15,
              cursor: names.length >= 10 ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
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
                  boxShadow: active ? `0 0 16px ${T.gGlow}` : 'none', transition: 'all 0.15s',
                }}>{r}</button>
              );
            })}
          </div>
          <input type="text" inputMode="numeric" pattern="[0-9]*" value={customR}
            onChange={e => { const v = e.target.value.replace(/\D/g, ''); setCustomR(v); setUsingCustom(!!v); }}
            placeholder="Custom number of rounds..."
            style={{
              width: '100%', padding: '13px 15px', borderRadius: 12, boxSizing: 'border-box',
              border: `2px solid ${usingCustom ? T.gold : T.border}`,
              background: T.s2, color: T.text, fontSize: 16, outline: 'none', fontFamily: 'inherit',
            }} />
        </div>

        <button onClick={startGame} disabled={names.length < 2} style={{
          width: '100%', padding: 20, borderRadius: 16, border: 'none',
          background: names.length >= 2 ? T.gold : T.s2,
          color: names.length >= 2 ? '#000' : T.sub,
          fontWeight: 900, fontSize: 18, letterSpacing: 1,
          cursor: names.length >= 2 ? 'pointer' : 'not-allowed',
          fontFamily: "'Impact', 'Arial Black', fantasy",
          boxShadow: names.length >= 2 ? `0 0 32px ${T.gGlow}` : 'none', transition: 'all 0.2s',
        }}>
          {names.length < 2 ? 'Add at least 2 players to start' : '▶  START GAME'}
        </button>
      </div>
    </div>
  );

  // ══ END ══
  if (phase === 'end') return (
    <div style={wrap}>
      <div style={{ padding: '40px 18px 40px', paddingTop: 'max(env(safe-area-inset-top, 40px), 40px)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 4 }}>🏆</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: T.gold, letterSpacing: -1, fontFamily: "'Impact', fantasy" }}>
            FINAL SCORES
          </div>
        </div>
        {players.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 18px', marginBottom: 8, borderRadius: 14,
            background: i === 0 ? T.gFade : T.s1,
            border: `2px solid ${i === 0 ? T.gold : T.border}`,
            boxShadow: i === 0 ? `0 0 24px ${T.gGlow}` : 'none',
          }}>
            <span style={{ fontSize: 22, minWidth: 30, textAlign: 'center' }}>
              {['🥇','🥈','🥉'][i] ?? `${i + 1}.`}
            </span>
            <span style={{ flex: 1, fontSize: 16, fontWeight: 700, color: i === 0 ? T.gold : T.text }}>{p.name}</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: i === 0 ? T.gold : T.text }}>{p.bankPts}</span>
          </div>
        ))}
        <button onClick={() => { setPhase('setup'); setNames([]); setNameInp(''); setCustomR(''); setUsingCustom(false); }} style={{
          width: '100%', marginTop: 20, padding: 18, borderRadius: 16, border: 'none',
          background: T.gold, color: '#000', fontWeight: 900, fontSize: 18,
          cursor: 'pointer', fontFamily: "'Impact', fantasy", letterSpacing: 1,
          boxShadow: `0 0 32px ${T.gGlow}`,
        }}>↩  PLAY AGAIN</button>
      </div>
    </div>
  );

  // ══ GAME ══
  return (
    <div style={wrap}>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 18px',
        paddingTop: 'max(env(safe-area-inset-top, 10px), 10px)',
        background: T.s1, borderBottom: `1px solid ${T.border}`,
      }}>
        <div>
          <div style={{ color: T.sub, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' }}>Round</div>
          <div style={{ color: T.gold, fontSize: 24, fontWeight: 900, lineHeight: 1 }}>
            {round}<span style={{ color: T.sub, fontSize: 12, fontWeight: 400 }}> / {totalR}</span>
          </div>
        </div>
        <div style={{
          padding: '5px 12px', borderRadius: 20,
          background: early ? T.nFade : T.gFade,
          border: `1px solid ${early ? T.green : T.gold}`,
          color: early ? T.green : T.gold,
          fontSize: 11, fontWeight: 700, letterSpacing: 1,
        }}>
          {early ? '★ SPECIAL' : 'STANDARD'}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: T.sub, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Leader</div>
          <div style={{ color: T.gold, fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{players[0]?.bankPts ?? 0}</div>
        </div>
      </div>

      {/* Scoreboard */}
      <div style={{ padding: '8px 12px 4px' }}>
        {scr === 'roll' && (
          <div style={{ color: T.sub, fontSize: 10, textAlign: 'center', marginBottom: 4, letterSpacing: 1 }}>
            TAP ANY PLAYER TO BANK FOR THEM
          </div>
        )}
        {players.map((p, i) => {
          const isRoller = i === ci && scr !== 'roundEnd';
          const isSelected = i === bankTarget;
          const canTap = scr === 'roll' && !p.banked;

          let borderColor = T.border;
          if (isSelected) borderColor = T.green;
          else if (isRoller) borderColor = T.gold;
          else if (p.banked) borderColor = T.green + '55';

          let bg = T.s1;
          if (isSelected) bg = T.nFade;
          else if (isRoller) bg = T.gFade;

          return (
            <div key={p.id}
              onClick={() => canTap && tapPlayer(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: rowPad, marginBottom: 4, borderRadius: 10,
                background: bg,
                border: `1.5px solid ${borderColor}`,
                cursor: canTap ? 'pointer' : 'default',
                transition: 'all 0.15s',
              }}>
              {/* Roller indicator */}
              {isRoller && !isSelected && <span style={{ color: T.gold, fontSize: 10 }}>🎲</span>}
              {/* Selected to bank indicator */}
              {isSelected && <span style={{ fontSize: 11 }}>👆</span>}
              {/* Banked indicator */}
              {p.banked && <span style={{ fontSize: 11 }}>🏦</span>}

              <span style={{
                flex: 1, fontSize: rowFont, fontWeight: 600,
                color: isSelected ? T.green : isRoller ? T.gold : p.banked ? T.sub : T.text,
              }}>
                {p.name}
              </span>
              {p.roundPts > 0 && !p.banked && (
                <span style={{ color: T.sub, fontSize: 11, marginRight: 2 }}>+{p.roundPts}</span>
              )}
              <span style={{ fontWeight: 900, fontSize: scoreFont, color: i === 0 ? T.gold : T.text, minWidth: 36, textAlign: 'right' }}>
                {p.bankPts}
              </span>
            </div>
          );
        })}
      </div>

      {/* Action area */}
      <div style={{ padding: '6px 0 24px' }}>

        {/* ROUND END */}
        {scr === 'roundEnd' && (
          <div style={{ padding: '14px 16px', textAlign: 'center' }}>
            <div style={{
              background: T.s1, borderRadius: 20, padding: '20px', marginBottom: 14,
              border: `1px solid ${rdNote.includes('Seven') ? T.red + '55' : T.green + '55'}`,
            }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>{rdNote.includes('Seven') ? '💥' : '✅'}</div>
              <div style={{ color: T.text, fontSize: 14 }}>{rdNote}</div>
            </div>
            <button onClick={doNextRound} style={{
              width: '100%', padding: 18, borderRadius: 16, border: 'none',
              background: T.gold, color: '#000', fontWeight: 900, fontSize: 18,
              cursor: 'pointer', fontFamily: "'Impact', fantasy", letterSpacing: 1,
              boxShadow: `0 0 28px ${T.gGlow}`,
            }}>
              {round >= totalR ? '🏆 FINAL RESULTS' : `START ROUND ${round + 1} →`}
            </button>
          </div>
        )}

        {/* ROLLED */}
        {scr === 'rolled' && (
          <div style={{ padding: '10px 14px' }}>
            <div style={{
              background: T.s1, borderRadius: 18, padding: '16px', textAlign: 'center', marginBottom: 12,
              border: `1px solid ${isSeven ? T.red + '60' : T.gold + '45'}`,
              boxShadow: isSeven ? `0 0 30px ${T.rFade}` : `0 0 20px ${T.gFade}`,
            }}>
              <div style={{ color: T.sub, fontSize: 12, marginBottom: 2 }}>{cur.name} rolled</div>
              <div style={{
                fontSize: 72, fontWeight: 900, lineHeight: 1,
                color: isSeven ? T.red : T.gold,
                textShadow: isSeven ? `0 0 40px ${T.red}` : `0 0 40px ${T.gGlow}`,
                fontFamily: "'Impact', fantasy",
              }}>{rolled}</div>
              {note && <div style={{ color: T.text, fontSize: 14, marginTop: 8 }}>{note}</div>}
            </div>
            <button onClick={doRedoRoll} style={{
              width: '100%', padding: 12, borderRadius: 12, border: `2px solid ${T.red}`,
              background: T.rFade, color: T.red, fontWeight: 700, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8,
            }}>
              ↩ Redo Last Roll — entered wrong number?
            </button>
            {isSeven ? (
              <button onClick={() => endRound(snap ?? players, true)} style={{
                width: '100%', padding: 16, borderRadius: 12, border: `2px solid ${T.red}`,
                background: T.rFade, color: T.red, fontWeight: 900, fontSize: 17,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>End Round →</button>
            ) : (
              <button onClick={doNext} style={{
                width: '100%', padding: 16, borderRadius: 12, border: `2px solid ${T.border}`,
                background: T.s2, color: T.text, fontWeight: 700, fontSize: 16,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Next Player →</button>
            )}
          </div>
        )}

        {/* ROLL INPUT */}
        {scr === 'roll' && (
          <>
            <div style={{ padding: '2px 16px 8px', textAlign: 'center' }}>
              {/* Show who we're banking FOR if different from roller */}
              {bankTarget !== null && bankTarget !== ci ? (
                <div style={{ color: T.green, fontSize: 13, fontWeight: 700 }}>
                  Banking for: {players[bankTarget]?.name} · {bankPlayer.bankPts + bankPlayer.roundPts} pts
                </div>
              ) : (
                <div style={{ color: T.gold, fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {cur.name}'s Roll
                </div>
              )}
              {early && (
                <div style={{ color: T.green, fontSize: 12, marginTop: 2 }}>
                  7 = 70 points this round!
                </div>
              )}
            </div>

            <div style={{ margin: '0 12px 8px', background: T.s1, borderRadius: 14, padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ color: T.sub, fontSize: 11, marginBottom: 2 }}>Dice Total</div>
              <div style={{
                fontSize: 58, fontWeight: 900, lineHeight: 1, minHeight: 58,
                color: dice ? T.gold : T.border, fontFamily: "'Impact', fantasy",
                textShadow: dice ? `0 0 30px ${T.gGlow}` : 'none',
              }}>
                {dice || '—'}
              </div>
            </div>

            {/* BANK — banks for selected player (or roller if none selected) */}
            {!bankPlayer.banked && (
              <div style={{ padding: '0 12px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={doBank} style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  border: `2px solid ${T.green}`, background: T.nFade, color: T.green,
                  fontWeight: 900, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  🏦 BANK {bankTarget !== null && bankTarget !== ci ? `${players[bankTarget]?.name}` : ''} — {bankPlayer.bankPts + bankPlayer.roundPts} pts safe
                </button>
                {!early && (
                  <button onClick={doDoubles} style={{
                    width: '100%', padding: '13px 0', borderRadius: 12,
                    border: `2px solid ${T.gold}`, background: T.gFade, color: T.gold,
                    fontWeight: 900, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: `0 0 20px ${T.gGlow}`,
                  }}>
                    🎲🎲 DOUBLES — Double Bank ({cur.bankPts * 2} pts)
                  </button>
                )}
              </div>
            )}

            <NumPad val={dice} setVal={setDice} onEnter={doRoll} />
          </>
        )}

      </div>
    </div>
  );
}
