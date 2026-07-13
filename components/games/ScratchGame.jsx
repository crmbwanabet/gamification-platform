'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, X } from 'lucide-react';
import TutorialModal from '../modals/TutorialModal';

// ============================================================================
// SCRATCH & WIN — silver-ticket edition.
// Three tickets: two hide coin prizes (distinct values from PRIZE_VALUES),
// one is a blank. The player may scratch ANY ticket and switch between them
// freely — the prize art sits under the foil and shows through every stroke,
// like a real scratcher. The first ticket scratched past the threshold is
// the result; the others then flip over to show what they held.
// Layout re-shuffles on every play. Visual direction from Grok concept art
// (silver perforated tickets + torn reveal on the app's dark navy).
// ============================================================================
const PRIZE_VALUES = [10, 20, 50, 100, 200];
const REVEAL_PCT = 55;
const BRUSH_RADIUS = 24;
const STAMP_SPACING = 7;
const TICKET_W = 116;
const TICKET_H = 178;

const GOLD_TEXT = {
  background: 'linear-gradient(180deg, #ffeaa0 0%, #ffd700 35%, #ff9500 75%, #cc7000 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};
const SILVER_TEXT = {
  background: 'linear-gradient(180deg, #ffffff 0%, #d7dae0 38%, #8b919c 55%, #eceef2 78%, #b9bec8 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

export default function ScratchGame({ onClose, onWin, closing }) {
  const canvas0 = useRef(null);
  const canvas1 = useRef(null);
  const canvas2 = useRef(null);
  const canvasRefs = [canvas0, canvas1, canvas2];
  const [winnerIdx, setWinnerIdx] = useState(-1);   // ticket that crossed the threshold
  const [revealed, setRevealed] = useState([false, false, false]);
  const [finished, setFinished] = useState(false);
  const [othersShown, setOthersShown] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confettiParts, setConfettiParts] = useState([]);
  const [bigWinFlash, setBigWinFlash] = useState(false);
  const [bigWinShake, setBigWinShake] = useState(false);
  const [flakes, setFlakes] = useState([]);
  const [scratchPct, setScratchPct] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);   // ticket currently under the finger (visual scale)
  const activeIdxRef = useRef(-1);                  // same, but sync — gates scratch handling
  const scratchingRef = useRef(false);
  const lastPos = useRef(null);
  const stampCount = useRef(0);
  const percents = useRef([0, 0, 0]);
  const lastFlakeAt = useRef(0);
  const flakeId = useRef(0);

  const [cards] = useState(() => {
    const pool = [...PRIZE_VALUES].sort(() => Math.random() - 0.5);
    return [{ value: pool[0] }, { value: pool[1] }, { value: 0 }].sort(() => Math.random() - 0.5);
  });

  const chosen = winnerIdx >= 0 ? cards[winnerIdx] : null;
  const won = finished && chosen && chosen.value > 0;
  const bigWin = won && chosen.value >= 100;

  // Silver foil + printed ticket details on each canvas
  useEffect(() => {
    canvasRefs.forEach((ref) => {
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      const w = c.width, h = c.height;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#b9bec8');
      g.addColorStop(0.18, '#eef0f4');
      g.addColorStop(0.38, '#9aa0aa');
      g.addColorStop(0.55, '#e4e6ea');
      g.addColorStop(0.75, '#a7adb7');
      g.addColorStop(1, '#d5d8de');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // brushed-metal noise
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.16})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1);
      }
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = `rgba(40,46,58,${Math.random() * 0.12})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1);
      }
      // ticket stub: dotted tear line near the top
      ctx.strokeStyle = 'rgba(60,66,78,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(8, 26);
      ctx.lineTo(w - 8, 26);
      ctx.stroke();
      ctx.setLineDash([]);
      // printed inner frame
      ctx.strokeStyle = 'rgba(60,66,78,0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(10, 38, w - 20, h - 52);
      ctx.fillStyle = 'rgba(70,76,88,0.55)';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SCRATCH', w / 2, h / 2);
      ctx.font = 'bold 7px Arial';
      ctx.fillStyle = 'rgba(70,76,88,0.4)';
      ctx.fillText('SCRATCH & WIN · 100X', w / 2, 16);
    });
  }, []);

  const stamp = (ctx, x, y) => {
    const g = ctx.createRadialGradient(x, y, BRUSH_RADIUS * 0.45, x, y, BRUSH_RADIUS);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, BRUSH_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  };

  const spawnFlakes = (cardX, cardY) => {
    const now = performance.now();
    if (now - lastFlakeAt.current < 50) return;
    lastFlakeAt.current = now;
    const batch = Array.from({ length: 2 }, () => ({
      id: flakeId.current++,
      x: cardX + (Math.random() - 0.5) * 18,
      y: cardY + (Math.random() - 0.5) * 10,
      size: 2.5 + Math.random() * 2.5,
      drift: (Math.random() - 0.5) * 26,
      dur: 0.5 + Math.random() * 0.3,
      color: Math.random() > 0.5 ? '#eceef2' : '#a7adb7',
    }));
    setFlakes(prev => [...prev.slice(-24), ...batch]);
    batch.forEach(f => setTimeout(() => {
      setFlakes(prev => prev.filter(p => p.id !== f.id));
    }, f.dur * 1000 + 100));
  };

  const measurePct = (c) => {
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, c.width, c.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    return (transparent / (c.width * c.height)) * 100;
  };

  const settleResult = useCallback((idx) => {
    setWinnerIdx(idx);
    setRevealed(r => r.map((v, i) => (i === idx ? true : v)));
    setFinished(true);
    setScratchPct(100);
    scratchingRef.current = false;
    try { navigator.vibrate?.(30); } catch (e) {}

    const card = cards[idx];
    const isWin = card.value > 0;
    if (isWin && card.value >= 100) {
      setBigWinFlash(true);
      setBigWinShake(true);
      setTimeout(() => setBigWinFlash(false), 600);
      setTimeout(() => setBigWinShake(false), 800);
    }
    if (isWin) {
      const parts = [];
      const count = card.value >= 200 ? 80 : card.value >= 100 ? 60 : 40;
      for (let i = 0; i < count; i++) {
        parts.push({
          id: i, x: 30 + Math.random() * 40, y: 30 + Math.random() * 20,
          color: ['#ffd700', '#eceef2', '#f5d060', '#c9ccd2', '#e6ad4a', '#fff'][i % 6],
          size: 4 + Math.random() * 7, rotation: Math.random() * 360,
          delay: Math.random() * 0.5, duration: 1.5 + Math.random() * 1.5,
        });
      }
      setConfettiParts(parts);
      onWin(card.value);
    }
    setTimeout(() => {
      setRevealed([true, true, true]);
      setOthersShown(true);
    }, 800);
  }, [cards, onWin]);

  const doScratch = (e, idx) => {
    if (!scratchingRef.current || activeIdxRef.current !== idx || finished || revealed[idx]) return;
    const c = canvasRefs[idx].current;
    if (!c) return;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const rect = c.getBoundingClientRect();
    const cx = e.clientX, cy = e.clientY;
    if (cx == null || cy == null) return;
    const x = (cx - rect.left) * (c.width / rect.width);
    const y = (cy - rect.top) * (c.height / rect.height);

    if (lastPos.current) {
      const dx = x - lastPos.current.x, dy = y - lastPos.current.y;
      const dist = Math.hypot(dx, dy);
      const steps = Math.max(1, Math.floor(dist / STAMP_SPACING));
      for (let s = 1; s <= steps; s++) {
        stamp(ctx, lastPos.current.x + (dx * s) / steps, lastPos.current.y + (dy * s) / steps);
        stampCount.current++;
      }
    } else {
      stamp(ctx, x, y);
      stampCount.current++;
    }
    lastPos.current = { x, y };
    spawnFlakes(cx - rect.left, cy - rect.top);
    try { if (stampCount.current % 14 === 0) navigator.vibrate?.(4); } catch (err) {}

    if (stampCount.current % 8 === 0) {
      const pct = measurePct(c);
      percents.current[idx] = pct;
      setScratchPct(Math.max(...percents.current));
      if (pct > REVEAL_PCT && !finished) settleResult(idx);
    }
  };

  const startScratch = (e, idx) => {
    if (finished || revealed[idx]) return;
    scratchingRef.current = true;
    lastPos.current = null;
    activeIdxRef.current = idx;
    setActiveIdx(idx);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    // stamp immediately so a tap leaves a mark (activeIdx state hasn't flushed yet)
    doScratchImmediate(e, idx);
  };
  const doScratchImmediate = (e, idx) => {
    const c = canvasRefs[idx].current;
    if (!c) return;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const rect = c.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (c.width / rect.width);
    const y = (e.clientY - rect.top) * (c.height / rect.height);
    stamp(ctx, x, y);
    stampCount.current++;
    lastPos.current = { x, y };
  };
  const stopScratch = (idx) => {
    scratchingRef.current = false;
    lastPos.current = null;
    if (!finished && !revealed[idx] && canvasRefs[idx]?.current) {
      const pct = measurePct(canvasRefs[idx].current);
      percents.current[idx] = pct;
      setScratchPct(Math.max(...percents.current));
      if (pct > REVEAL_PCT) settleResult(idx);
    }
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 ${closing ? 'anim-backdrop-close' : 'anim-fade-in'}`} style={{ background: 'rgba(8,10,16,.74)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="scratch" onClose={() => setShowTutorial(false)} />}

      <style>{`
        @keyframes flakeFall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(var(--fdrift), 46px) rotate(140deg); opacity: 0; }
        }
        @keyframes stampIn {
          0% { transform: rotate(-14deg) scale(2.2); opacity: 0; }
          55% { transform: rotate(-14deg) scale(0.92); opacity: 1; }
          75% { transform: rotate(-14deg) scale(1.06); }
          100% { transform: rotate(-14deg) scale(1); opacity: 1; }
        }
        @keyframes glintSweep {
          0%, 100% { opacity: .5; }
          50% { opacity: 1; }
        }
        @keyframes collectSheen {
          0%, 55%, 100% { transform: translateX(-130%) skewX(-18deg); }
          25%, 40% { transform: translateX(230%) skewX(-18deg); }
        }
      `}</style>

      {bigWinFlash && (
        <div className="fixed inset-0 z-[80] pointer-events-none bg-yellow-400" style={{ animation: 'jackpotFlash 0.6s ease-out forwards' }} />
      )}

      <div
        className={`max-w-md w-full ${closing ? 'anim-modal-close' : 'anim-scale-in'}`}
        style={bigWinShake ? { animation: 'jackpotShake 0.8s ease-out' } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-3xl overflow-hidden relative" style={{
          background: 'linear-gradient(180deg, #2a2438 0%, #1a1626 55%, #141220 100%)',
          border: '1px solid rgba(255,255,255,.09)',
          boxShadow: '0 24px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06)',
        }}>

          {/* Gold glint line across the top */}
          <div className="absolute top-0 left-0 right-0 pointer-events-none" style={{ height: 2 }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(230,173,74,.75) 50%, transparent 95%)' }} />
            <div className="absolute" style={{
              left: '50%', top: -7, width: 90, height: 16, transform: 'translateX(-50%)',
              background: 'radial-gradient(ellipse, rgba(255,200,110,.55) 0%, transparent 70%)',
              animation: 'glintSweep 3s ease-in-out infinite',
            }} />
          </div>

          {/* Header */}
          <div className="relative px-6 pt-5 pb-2">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <HelpCircle className="w-5 h-5" style={{ color: '#8b919c' }} />
              </button>
              <h2 className="text-[26px] font-black tracking-wide" style={{
                ...SILVER_TEXT,
                fontFamily: 'Georgia, "Times New Roman", serif',
                filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.8))',
                letterSpacing: '0.04em',
              }}>SCRATCH &amp; WIN</h2>
              <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Prize row — heavier metal at higher values, like the concept */}
          <div className="flex items-end justify-center gap-4 px-6 pb-1">
            {PRIZE_VALUES.map(v => (
              <div key={v} className="flex items-center gap-0.5">
                {v >= 100 && <img src="/ui/reward/coins.png" alt="" width={v >= 200 ? 24 : 20} height={v >= 200 ? 24 : 20} style={{ objectFit: 'contain', marginBottom: 2 }} />}
                <span className="font-black tabular-nums" style={{
                  ...GOLD_TEXT,
                  fontSize: v >= 100 ? 24 : 20,
                  filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.7))',
                }}>{v}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs pb-3" style={{ color: '#8b919c' }}>
            {finished ? ' ' : 'Scratch any ticket — two hide coin prizes'}
          </p>

          {/* === TICKETS === */}
          <div className="flex justify-center gap-4 px-4">
            {[0, 1, 2].map(idx => {
              const card = cards[idx];
              const isBlank = card.value === 0;
              const isWinner = idx === winnerIdx;
              const dimmed = revealed[idx] && !isWinner;
              const accent = isBlank ? '#8b919c' : '#e6ad4a';
              return (
                <div
                  key={idx}
                  className="relative"
                  style={{
                    width: TICKET_W, height: TICKET_H, flex: 'none',
                    transform: activeIdx === idx && !finished ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform .25s ease',
                  }}
                >
                  {/* Ticket body */}
                  <div className="absolute inset-0 overflow-hidden" style={{
                    borderRadius: 7,
                    background: '#10131c',
                    border: revealed[idx] && isWinner ? `2px solid ${accent}` : '1px solid rgba(255,255,255,.14)',
                    boxShadow: revealed[idx] && isWinner
                      ? `0 14px 34px rgba(0,0,0,.6), 0 0 26px ${isBlank ? 'rgba(140,146,156,.18)' : 'rgba(230,173,74,.3)'}`
                      : activeIdx === idx && !finished
                        ? '0 10px 26px rgba(0,0,0,.55), 0 0 18px rgba(230,220,200,.1)'
                        : '0 8px 22px rgba(0,0,0,.5)',
                    transition: 'box-shadow .3s ease, border-color .4s ease',
                  }}>
                    {/* Contents — ALWAYS under the foil, so they show through
                        every scratched stroke like a real ticket */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{
                      background: revealed[idx] && isWinner && !isBlank
                        ? 'radial-gradient(circle at 50% 42%, rgba(230,173,74,.16) 0%, #10131c 72%)'
                        : '#10131c',
                      opacity: dimmed ? 0.55 : 1,
                      transition: 'opacity .4s ease',
                    }}>
                      {isBlank ? (
                        <div style={{
                          border: '2.5px solid #8b919c',
                          borderRadius: 4, padding: '5px 8px',
                          transform: 'rotate(-12deg)',
                        }}>
                          <div className="font-black text-center leading-tight" style={{ color: '#8b919c', fontSize: 11, letterSpacing: '.12em' }}>
                            NO<br />PRIZE
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* coin pile — stacked copies of the 3D coin icon */}
                          <div className="relative" style={{
                            width: 54, height: 44,
                            filter: revealed[idx] && isWinner ? 'drop-shadow(0 0 12px rgba(230,173,74,.55))' : 'none',
                            transition: 'filter .4s ease',
                          }}>
                            <img src="/ui/reward/coins.png" alt="" width={34} height={34} className="absolute" style={{ left: 0, bottom: 0, objectFit: 'contain' }} />
                            <img src="/ui/reward/coins.png" alt="" width={30} height={30} className="absolute" style={{ right: 0, bottom: 2, objectFit: 'contain', transform: 'scaleX(-1)' }} />
                            <img src="/ui/reward/coins.png" alt="" width={30} height={30} className="absolute" style={{ left: 12, top: 0, objectFit: 'contain' }} />
                          </div>
                          <div className="font-black tabular-nums" style={{
                            ...GOLD_TEXT,
                            fontSize: 26,
                            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,.7))',
                          }}>
                            {card.value}
                          </div>
                          <div className="font-bold" style={{ color: '#8b919c', fontSize: 8, letterSpacing: '.2em' }}>
                            COINS
                          </div>
                        </>
                      )}
                    </div>

                    {/* Torn-edge frame once the winner's foil is gone */}
                    {revealed[idx] && isWinner && (
                      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{
                        height: 10,
                        background: 'linear-gradient(180deg, rgba(210,214,222,.9), rgba(150,156,168,.45) 55%, transparent)',
                        clipPath: 'polygon(0 0, 100% 0, 100% 42%, 93% 78%, 85% 40%, 76% 88%, 68% 48%, 59% 95%, 50% 52%, 41% 90%, 33% 45%, 24% 84%, 16% 42%, 8% 76%, 0 38%)',
                      }} />
                    )}

                    {/* Silver foil scratch canvas */}
                    <canvas
                      ref={canvasRefs[idx]}
                      width={TICKET_W}
                      height={TICKET_H}
                      className="absolute inset-0 touch-none"
                      style={{
                        width: '100%', height: '100%',
                        cursor: finished || revealed[idx] ? 'default' : 'crosshair',
                        opacity: revealed[idx] ? 0 : 1,
                        transition: 'opacity 0.45s ease',
                        pointerEvents: finished || revealed[idx] ? 'none' : 'auto',
                      }}
                      onPointerDown={(e) => startScratch(e, idx)}
                      onPointerUp={() => stopScratch(idx)}
                      onPointerCancel={() => stopScratch(idx)}
                      onPointerMove={(e) => doScratch(e, idx)}
                    />

                    {/* Silver flakes while scratching this ticket */}
                    {activeIdx === idx && flakes.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {flakes.map(f => (
                          <div key={f.id} className="absolute rounded-[1px]" style={{
                            left: f.x, top: f.y, width: f.size, height: f.size,
                            background: f.color, boxShadow: `0 0 3px ${f.color}`,
                            '--fdrift': `${f.drift}px`,
                            animation: `flakeFall ${f.dur}s ease-in forwards`,
                          }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Perforated edges — punched holes against the modal bg */}
                  {[0, 1].map(edge => (
                    <div key={edge} className="absolute left-0 right-0 flex justify-around pointer-events-none" style={{ [edge ? 'bottom' : 'top']: -3 }}>
                      {Array.from({ length: 8 }, (_, i) => (
                        <span key={i} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: '#1a1626',
                          boxShadow: 'inset 0 1px 1px rgba(0,0,0,.6)',
                        }} />
                      ))}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Progress + result + CTA */}
          <div className="px-6 pt-3 pb-5">
            {!finished ? (
              <>
                <div className="mx-auto mb-2 h-1.5 rounded-full overflow-hidden" style={{ width: 180, background: 'rgba(255,255,255,.07)', opacity: scratchPct > 0 ? 1 : 0.35, transition: 'opacity .3s' }}>
                  <div className="h-full rounded-full transition-all duration-200" style={{
                    width: `${Math.min(100, (scratchPct / REVEAL_PCT) * 100)}%`,
                    background: 'linear-gradient(90deg, #cc9a2e, #ffd700)',
                    boxShadow: '0 0 8px rgba(255,215,0,.45)',
                  }} />
                </div>
                <p className="text-center text-xs" style={{ color: '#6b7280' }}>
                  {scratchPct > 0 ? 'Switch tickets anytime — first fully scratched is your prize' : 'Tickets shuffle with every play'}
                </p>
              </>
            ) : (
              <div className="text-center mb-4" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.25, 1, 0.5, 1) both' }}>
                {won ? (
                  <>
                    <div className="text-xs font-bold uppercase mb-1" style={{ color: bigWin ? '#e6ad4a' : '#8fd3bd', letterSpacing: '3px' }}>
                      {bigWin ? '🔥 BIG WIN 🔥' : 'YOU WON'}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-4xl font-black tabular-nums" style={{ ...GOLD_TEXT, filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.7))' }}>
                        {chosen.value}
                      </span>
                      <img src="/ui/reward/coins.png" alt="" width={32} height={32} style={{ objectFit: 'contain' }} />
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#8b919c' }}>Coins added to your balance</div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-bold" style={{ color: '#c3c9cf', letterSpacing: '1px' }}>
                      BETTER LUCK NEXT TIME
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#6b7280' }}>
                      {othersShown ? 'The prizes were hiding in the other tickets…' : ' '}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* COLLECT — chamfered metal plate from the concept art */}
            {finished && (
              won ? (
                <div className="relative mx-auto" style={{ width: 230, filter: 'drop-shadow(0 8px 18px rgba(0,0,0,.55)) drop-shadow(0 0 18px rgba(230,173,74,.22))' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="relative block w-full py-3.5 font-black text-lg transition-transform hover:scale-[1.03] active:scale-95 overflow-hidden"
                    style={{
                      clipPath: 'polygon(11px 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 11px 100%, 0 50%)',
                      background: 'linear-gradient(180deg, #ffffff 0%, #d7dae0 30%, #9ea3ad 50%, #c7cbd3 52%, #eceef2 82%, #a7adb7 100%)',
                      color: '#151922',
                      letterSpacing: '.14em',
                      textShadow: '0 1px 0 rgba(255,255,255,.65)',
                    }}
                  >
                    {/* moving sheen */}
                    <span className="absolute top-0 bottom-0 pointer-events-none" style={{
                      width: '34%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent)',
                      animation: 'collectSheen 2.6s ease-in-out infinite',
                    }} />
                    {/* engraved edge lines */}
                    <span className="absolute inset-x-6 top-[5px] pointer-events-none" style={{ height: 1, background: 'rgba(255,255,255,.8)' }} />
                    <span className="absolute inset-x-6 bottom-[5px] pointer-events-none" style={{ height: 1, background: 'rgba(20,24,32,.35)' }} />
                    <span className="relative inline-flex items-center gap-2">
                      COLLECT
                      <img src="/ui/reward/coins.png" alt="" width={20} height={20} style={{ objectFit: 'contain' }} />
                      <span className="tabular-nums">{chosen.value}</span>
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="block mx-auto px-12 py-3 font-black text-base transition-all hover:scale-[1.03] active:scale-95"
                  style={{
                    clipPath: 'polygon(11px 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 11px 100%, 0 50%)',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    color: '#c3c9cf',
                    letterSpacing: '.1em',
                  }}
                >
                  GOT IT
                </button>
              )
            )}
          </div>

          {/* Confetti overlay */}
          {confettiParts.length > 0 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              {confettiParts.map(p => (
                <div
                  key={p.id}
                  className="absolute"
                  style={{
                    left: `${p.x}%`, top: `${p.y}%`,
                    width: p.size, height: p.size * 0.6,
                    background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    transform: `rotate(${p.rotation}deg)`,
                    animation: `confettiFall ${p.duration}s ease-out ${p.delay}s forwards`,
                    '--drift': `${(Math.random() - 0.5) * 60}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
