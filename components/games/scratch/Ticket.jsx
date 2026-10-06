'use client';

import React from 'react';
import SymbolArt from './Symbols';
import { CANDY, textStroke } from '../candy/tokens';
import { SYMBOLS } from '@/lib/scratch/odds.mjs';

// The LUCKY SCRATCH ticket: a glossy hot-pink candy ticket (gold rim, dark
// outline, solid base) with a holographic shimmer, a recessed tray of 3 foil
// panels, a perforation and the paytable strip. Pure presentation — the game
// owns the card and each panel's state ('covered' | 'bursting' | 'open').
// Reveal = the foil cracks into 4 shards that fly apart with sparkle bits while
// the symbol pops up underneath. Reduced motion: the foil just fades, no
// shimmer / shards / sparkles / slide, and the win glow is static.

export const BURST_MS = 560;
export const SLIDE_MS = 460;

const O = CANDY.outline;
const NOTCH_BG = '#2C0E5C';

// Foil shards: 4 jagged pieces meeting near the centre; each flies its own way.
const SHARDS = [
  { clip: 'polygon(0 0, 100% 0, 100% 22%, 74% 34%, 54% 47%, 30% 30%, 0 28%)', dx: -6, dy: -78, r: -24 },
  { clip: 'polygon(100% 22%, 100% 100%, 72% 100%, 64% 70%, 54% 47%, 74% 34%)', dx: 64, dy: 18, r: 34 },
  { clip: 'polygon(72% 100%, 0 100%, 0 74%, 26% 64%, 54% 47%, 64% 70%)', dx: -12, dy: 80, r: -30 },
  { clip: 'polygon(0 28%, 30% 30%, 54% 47%, 26% 64%, 0 74%)', dx: -66, dy: -4, r: 28 },
];
const SPARK_COLORS = ['#FFF6C2', CANDY.gold, '#FF7AC0', '#7FE7FF', '#fff', '#B9FF8A'];
const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + (i % 2 ? .22 : -.12);
  const d = 40 + (i % 3) * 16;
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d, c: SPARK_COLORS[i % SPARK_COLORS.length], star: i % 3 === 0, s: i % 3 === 0 ? 13 : 6 + (i % 2) * 2, delay: (i % 4) * 18 };
});

export const TICKET_CSS = `
  @keyframes scIn { 0% { transform: translateX(118%) rotate(9deg) } 70% { transform: translateX(-3%) rotate(-1.5deg) } 100% { transform: none } }
  @keyframes scOut { to { transform: translateX(-122%) rotate(-9deg); opacity: .6 } }
  @keyframes scHolo { 0% { transform: translateX(-140%) skewX(-18deg) } 55%, 100% { transform: translateX(330%) skewX(-18deg) } }
  @keyframes scShard {
    0% { transform: none; opacity: 1 }
    18% { transform: translate(calc(var(--dx) * .07), calc(var(--dy) * .07)) rotate(calc(var(--r) * .12)); opacity: 1 }
    100% { transform: translate(var(--dx), var(--dy)) rotate(var(--r)) scale(.62); opacity: 0 }
  }
  @keyframes scSpark {
    0% { transform: translate(-50%, -50%) scale(.3); opacity: 0 }
    15% { opacity: 1 }
    100% { transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1) rotate(160deg); opacity: 0 }
  }
  @keyframes scFlash { 0% { opacity: 0 } 20% { opacity: .9 } 100% { opacity: 0 } }
  @keyframes scPop { 0% { transform: scale(.45) rotate(-10deg) } 60% { transform: scale(1.14) rotate(4deg) } 100% { transform: none } }
  @keyframes scFade { to { opacity: 0 } }
  @keyframes scSpin { to { transform: rotate(360deg) } }
  @keyframes scGlow { 0%, 100% { box-shadow: 0 0 0 3px ${CANDY.gold}, 0 0 14px 3px rgba(255,210,31,.65) } 50% { box-shadow: 0 0 0 3px #FFF3B0, 0 0 26px 8px rgba(255,210,31,.95) } }
  @keyframes scBounce { 0%, 100% { transform: none } 40% { transform: translateY(-7%) scale(1.08) } 70% { transform: translateY(1%) scale(.98) } }
  @keyframes scTease { 0%, 100% { transform: rotate(0) } 20% { transform: rotate(-3.5deg) scale(1.03) } 40% { transform: rotate(3deg) scale(1.03) } 60% { transform: rotate(-2deg) } 80% { transform: rotate(1deg) } }
  @keyframes scTapHint { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.08) } }

  .sc-stage { position: relative; flex: 1; min-height: 0; margin: 9px 5px 4px; }
  .sc-ticket {
    position: absolute; inset: 0; box-sizing: border-box; border-radius: 20px; padding: 7px 9px 8px;
    display: flex; flex-direction: column;
    background:
      radial-gradient(ellipse 85% 42% at 50% 0%, rgba(255,255,255,.32), rgba(255,255,255,0) 70%),
      repeating-linear-gradient(135deg, rgba(255,255,255,.07) 0 9px, rgba(255,255,255,0) 9px 18px),
      linear-gradient(180deg, #FF63B4 0%, #EE2F8F 46%, #B8146D 100%);
    border: 3px solid ${CANDY.gold};
    box-shadow: 0 0 0 2.5px ${O}, 0 6px 0 2.5px #5C0636, 0 14px 22px rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.55), inset 0 -3px 0 rgba(90,0,50,.35);
  }
  .sc-in { animation: scIn ${SLIDE_MS}ms cubic-bezier(.2,.85,.3,1) both; }
  .sc-out { animation: scOut 380ms cubic-bezier(.5,0,.9,.5) both; pointer-events: none; }
  .sc-holo { position: absolute; inset: 0; pointer-events: none; clip-path: inset(0 round 17px); -webkit-clip-path: inset(0 round 17px); }
  .sc-holo > i {
    position: absolute; top: -10%; bottom: -10%; left: 0; width: 34%;
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,150,230,.35) 25%, rgba(150,240,255,.5) 50%, rgba(255,250,170,.4) 75%, rgba(255,255,255,0) 100%);
    mix-blend-mode: screen; animation: scHolo 4.2s ease-in-out infinite;
  }

  .sc-head { flex: none; display: flex; flex-direction: column; align-items: center; position: relative; }
  .sc-title { font-family: ${CANDY.display}; font-size: 30px; line-height: 1; letter-spacing: 1px; color: ${CANDY.gold}; white-space: nowrap;
    text-shadow: ${textStroke(2.6, O)}, 0 4px 0 ${O}, 0 6px 8px rgba(60,0,40,.5); }
  .sc-rib { margin: 4px 0 6px; padding: 2px 12px 3px; border-radius: 999px; background: ${O}; border: 2px solid rgba(255,210,31,.85);
    font-family: ${CANDY.display}; font-size: 12px; letter-spacing: 1.5px; color: #fff; line-height: 1.15; white-space: nowrap; }

  .sc-tray { flex: 1; min-height: 0; display: flex; gap: 7px; padding: 7px; border-radius: 15px;
    background: linear-gradient(180deg, #5A0838 0%, #7E1052 100%);
    box-shadow: inset 0 3px 7px rgba(20,0,20,.6), 0 0 0 2px rgba(255,210,31,.85), 0 0 0 4px ${O}; }
  .sc-panel { position: relative; flex: 1; min-width: 0; min-height: 48px; padding: 0; border: none; background: transparent; border-radius: 13px;
    cursor: pointer; -webkit-tap-highlight-color: transparent; touch-action: manipulation; font: inherit; color: inherit; }
  .sc-panel:disabled { cursor: default; }
  .sc-panel:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 2px; }
  .sc-face { position: absolute; inset: 0; border-radius: 13px; overflow: hidden; box-sizing: border-box; border: 2.5px solid ${O};
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    background: radial-gradient(circle at 50% 42%, #FFFFFF 0%, #FFF4CF 45%, #FFD98A 100%); }
  .sc-rays { position: absolute; left: 50%; top: 42%; width: 220%; aspect-ratio: 1; margin: -110% 0 0 -110%; pointer-events: none; opacity: .5;
    background: repeating-conic-gradient(from 0deg, rgba(255,190,60,.55) 0deg 12deg, rgba(255,190,60,0) 12deg 30deg); }
  .sc-sym { position: relative; width: 82%; max-width: 86px; height: auto !important; aspect-ratio: 1; filter: drop-shadow(0 3px 0 rgba(42,10,79,.35)); }
  .sc-tag { position: relative; padding: 1px 8px 2px; border-radius: 999px; background: ${O}; color: ${CANDY.gold};
    font-family: ${CANDY.display}; font-size: 15px; line-height: 1.1; letter-spacing: .5px; }
  .sc-pop .sc-sym { animation: scPop 420ms cubic-bezier(.2,.9,.3,1.3) 60ms both; }
  .sc-pop .sc-tag { animation: scPop 360ms cubic-bezier(.2,.9,.3,1.3) 200ms both; }
  .sc-panel[data-win="1"] .sc-face { animation: scGlow 1.1s ease-in-out infinite; background: radial-gradient(circle at 50% 42%, #FFFFFF 0%, #FFF0A0 40%, #FFC52E 100%); }
  .sc-panel[data-win="1"] .sc-rays { opacity: .9; animation: scSpin 6s linear infinite; }
  .sc-panel[data-win="1"] .sc-sym { animation: scBounce 1.1s ease-in-out infinite; }
  .sc-panel[data-win="1"] .sc-tag { background: ${CANDY.green.dark}; color: #fff; box-shadow: 0 0 0 2px ${CANDY.gold}; }

  .sc-foil { position: absolute; inset: 0; border-radius: 13px; overflow: hidden; clip-path: inset(0 round 13px); box-sizing: border-box; border: 2.5px solid ${O};
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    background:
      repeating-linear-gradient(45deg, rgba(255,255,255,.16) 0 2px, rgba(255,255,255,0) 2px 7px),
      linear-gradient(125deg, rgba(255,120,210,.42) 0%, rgba(120,220,255,.42) 28%, rgba(255,245,140,.42) 52%, rgba(170,130,255,.42) 76%, rgba(120,255,200,.4) 100%),
      linear-gradient(160deg, #F7F8FF 0%, #B9BDD2 26%, #F2F3FA 46%, #A3A8C0 66%, #E6E8F2 100%);
    box-shadow: inset 0 2px 0 rgba(255,255,255,.9), inset 0 -3px 0 rgba(60,50,110,.25); }
  .sc-foil > i { position: absolute; top: -10%; bottom: -10%; left: 0; width: 55%; pointer-events: none;
    background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,.75) 50%, rgba(255,255,255,0));
    animation: scHolo 3.4s ease-in-out infinite; }
  .sc-coin { position: relative; width: 52%; max-width: 46px; aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center;
    background: radial-gradient(circle at 38% 30%, #FFF6C2 0%, #FFD21F 42%, #E09400 100%);
    box-shadow: 0 0 0 2.5px ${O}, inset 0 0 0 3px #FFE680, 0 3px 0 2.5px ${O};
    font-family: ${CANDY.display}; font-size: 26px; line-height: 1; color: #fff; text-shadow: ${textStroke(2, O)}, 0 2px 0 ${O}; }
  .sc-tap { position: relative; font-family: ${CANDY.display}; font-size: 13px; letter-spacing: 1.5px; color: ${O}; text-shadow: 0 1px 0 rgba(255,255,255,.8); }
  .sc-live .sc-coin { animation: scTapHint 1.3s ease-in-out infinite; }
  .sc-live .sc-panel:nth-child(2) .sc-coin { animation-delay: .2s; }
  .sc-live .sc-panel:nth-child(3) .sc-coin { animation-delay: .4s; }
  .sc-panel[data-tease="1"] { animation: scTease .8s ease-in-out infinite; box-shadow: 0 0 0 3px ${CANDY.gold}, 0 0 20px 5px rgba(255,210,31,.8); }
  .sc-shard { position: absolute; inset: 0; pointer-events: none; animation: scShard ${BURST_MS}ms cubic-bezier(.2,.7,.35,1) both; }
  .sc-flash { position: absolute; inset: 0; border-radius: 13px; pointer-events: none; background: radial-gradient(circle at 50% 46%, #fff 0%, rgba(255,240,170,.8) 35%, rgba(255,240,170,0) 72%); animation: scFlash 420ms ease-out both; }
  .sc-spark { position: absolute; left: 50%; top: 46%; pointer-events: none; animation: scSpark 650ms cubic-bezier(.15,.7,.35,1) both; }
  .sc-foil-fade { animation: scFade 160ms linear both; }

  .sc-perf { flex: none; position: relative; height: 14px; }
  .sc-perf::before { content: ''; position: absolute; left: 4px; right: 4px; top: 6px; border-top: 2.5px dashed rgba(255,255,255,.55); }
  .sc-notch { position: absolute; top: -2px; width: 18px; height: 18px; border-radius: 50%; background: ${NOTCH_BG}; border: 3px solid ${CANDY.gold}; box-shadow: 0 0 0 2.5px ${O}; }
  .sc-pay { flex: none; display: flex; gap: 2px; padding: 4px 3px 3px; border-radius: 12px; background: rgba(42,10,79,.62); box-shadow: inset 0 1px 0 rgba(255,255,255,.18); }
  .sc-cell { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 2px 0; border-radius: 9px; }
  .sc-cell[data-hot="1"] { background: rgba(255,210,31,.28); box-shadow: 0 0 0 2px ${CANDY.gold}; }
  .sc-cell span { font-family: ${CANDY.display}; font-size: 13px; line-height: 1; color: ${CANDY.gold}; text-shadow: 0 1.5px 0 ${O}; }

  @media (prefers-reduced-motion: reduce) {
    .sc-in, .sc-out, .sc-holo > i, .sc-foil > i, .sc-live .sc-coin, .sc-pop .sc-sym, .sc-pop .sc-tag,
    .sc-panel[data-win="1"] .sc-sym, .sc-panel[data-win="1"] .sc-rays, .sc-panel[data-tease="1"] { animation: none !important; }
    .sc-panel[data-win="1"] .sc-face { animation: none; box-shadow: 0 0 0 3px ${CANDY.gold}, 0 0 20px 6px rgba(255,210,31,.85); }
  }
`;

function FoilFace({ live }) {
  return (
    <>
      <i aria-hidden />
      <span className="sc-coin">?</span>
      <span className="sc-tap" style={live ? undefined : { visibility: 'hidden' }}>TAP!</span>
    </>
  );
}

function Panel({ index, symbolId, state, win, tease, live, reduced, onReveal }) {
  const sym = symbolId ? SYMBOLS.find(s => s.id === symbolId) : null;
  const shown = state !== 'covered' && sym;
  const label = shown ? `Panel ${index + 1}: ${sym.name}, ${sym.mult}x` : `Reveal panel ${index + 1}`;
  return (
    <button type="button" className={`sc-panel${shown && !reduced ? ' sc-pop' : ''}`} data-win={win ? '1' : undefined} data-tease={tease ? '1' : undefined}
      disabled={!live || state !== 'covered'} aria-label={label} onClick={() => onReveal(index)}>
      {shown && (
        <span className="sc-face">
          <span className="sc-rays" aria-hidden />
          <SymbolArt id={sym.id} className="sc-sym" />
          <span className="sc-tag">{sym.mult}x</span>
        </span>
      )}
      {state === 'covered' && <span className="sc-foil"><FoilFace live={live} /></span>}
      {state === 'bursting' && (reduced
        ? <span className="sc-foil sc-foil-fade"><FoilFace live /></span>
        : (
          <>
            <span className="sc-flash" aria-hidden />
            {SHARDS.map((s, k) => (
              <span key={k} className="sc-shard" aria-hidden style={{ clipPath: s.clip, WebkitClipPath: s.clip, '--dx': `${s.dx}px`, '--dy': `${s.dy}px`, '--r': `${s.r}deg` }}>
                <span className="sc-foil"><FoilFace live /></span>
              </span>
            ))}
            {SPARKS.map((p, k) => (
              <span key={`s${k}`} className="sc-spark" aria-hidden style={{
                width: p.s, height: p.s, background: p.c, borderRadius: p.star ? 0 : '50%',
                clipPath: p.star ? 'polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%)' : undefined,
                '--dx': `${p.dx.toFixed(1)}px`, '--dy': `${p.dy.toFixed(1)}px`, animationDelay: `${p.delay}ms`,
              }} />
            ))}
          </>
        ))}
    </button>
  );
}

// panels: 3 symbol ids (null before a card is bought) · states: 3 panel states
// · live: panels tappable · winSymbol: id when the finished card won
export default function Ticket({ panels, states, live, winSymbol, teaseIndex = -1, reduced, className, onReveal, holo = true }) {
  return (
    <div className={`sc-ticket ${className || ''}`}>
      {holo && !reduced && <span className="sc-holo" aria-hidden><i /></span>}
      <div className="sc-head">
        <div className="sc-title">LUCKY SCRATCH</div>
        <div className="sc-rib">✦ MATCH 3 TO WIN ✦</div>
      </div>
      <div className={`sc-tray${live ? ' sc-live' : ''}`} role="group" aria-label="Scratch panels">
        {[0, 1, 2].map(i => (
          <Panel key={i} index={i} symbolId={panels?.[i] ?? null} state={states[i]} live={live} reduced={reduced}
            win={!!winSymbol && panels?.[i] === winSymbol} tease={live && teaseIndex === i} onReveal={onReveal} />
        ))}
      </div>
      <div className="sc-perf" aria-hidden>
        <span className="sc-notch" style={{ left: -22 }} />
        <span className="sc-notch" style={{ right: -22 }} />
      </div>
      <div className="sc-pay" aria-label="Paytable: three matching symbols pay">
        {SYMBOLS.map(s => (
          <div key={s.id} className="sc-cell" data-hot={winSymbol === s.id ? '1' : undefined} aria-label={`${s.name} ${s.mult}x`}>
            <SymbolArt id={s.id} size={27} />
            <span>{s.mult}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}
