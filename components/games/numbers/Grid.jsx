'use client';

import React from 'react';
import { CANDY, textStroke } from '../candy/tokens';
import { ballColor } from './Ball';
import { POOL } from '@/lib/numbers/paytable.mjs';

// The 1–20 pick grid: 5×4 chunky candy tiles (52×48 px at 360 wide).
// Tile states (data attributes, all CSS):
//   picked  → the tile turns into its row's ball colour with a white ball face
//   drawn   → a drawn number you did NOT pick: coloured ring + number
//   match   → picked AND drawn: gold glow ring, pulse, "MATCH!" sticker pop
//   dim     → after the draw, numbers that played no part fade back
// `ping` (round id) re-mounts the landing ring so each draw flashes once.

export const GRID_CSS = `
  .ln-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px 7px; }
  .ln-tile {
    position: relative; height: 48px; min-width: 0; padding: 0; margin: 0;
    border-radius: 14px; border: 2px solid #7E4FD8;
    background: linear-gradient(180deg, #5C28B4 0%, #45178F 58%, #3B1282 100%);
    box-shadow: inset 0 2px 0 rgba(255,255,255,.2), inset 0 -4px 0 #26084F, 0 2px 0 rgba(10,0,30,.45);
    color: #fff; font-family: ${CANDY.display}; font-size: 23px; line-height: 1; letter-spacing: .3px;
    display: grid; place-items: center; cursor: pointer; overflow: visible;
    user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    transition: transform .08s ease-out, opacity .25s, filter .25s;
  }
  .ln-tile:active:not([aria-disabled="true"]) { transform: translateY(2px) scale(.97); }
  .ln-tile:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 2px; }
  .ln-tile[aria-disabled="true"] { cursor: default; }
  .ln-num { text-shadow: ${textStroke(2, CANDY.outline)}, 0 2.5px 0 ${CANDY.outline}; }
  .ln-tile[data-picked="1"] {
    border-color: var(--bl);
    background: radial-gradient(circle at 50% 30%, var(--bl) 0%, var(--bf) 52%, var(--bd) 100%);
    box-shadow: inset 0 2px 0 rgba(255,255,255,.4), inset 0 -4px 0 var(--bd), 0 2px 0 rgba(10,0,30,.45);
    animation: lnPick 300ms cubic-bezier(.2,.9,.3,1.35) both;
  }
  .ln-face {
    width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center;
    background: radial-gradient(circle at 40% 30%, #fff 0%, #fff 58%, #E4DAF6 100%);
    box-shadow: 0 0 0 2px ${CANDY.outline}, inset 0 -2px 0 rgba(42,10,79,.16);
    color: ${CANDY.outline}; font-size: 20px; font-variant-numeric: tabular-nums;
  }
  .ln-tile[data-drawn="1"] {
    border-color: var(--bl);
    box-shadow: inset 0 2px 0 rgba(255,255,255,.2), inset 0 -4px 0 #26084F, inset 0 0 0 3px var(--bf), 0 2px 0 rgba(10,0,30,.45);
  }
  .ln-tile[data-drawn="1"] .ln-num { color: var(--bl); }
  .ln-tile[data-match="1"] {
    z-index: 2; border-color: #FFF09A;
    box-shadow: inset 0 2px 0 rgba(255,255,255,.45), inset 0 -4px 0 var(--bd), 0 0 0 3px ${CANDY.gold}, 0 0 16px 4px rgba(255,210,31,.7);
    animation: lnMatch 520ms cubic-bezier(.2,.9,.3,1.4) both, lnGlow 1.3s ease-in-out 520ms infinite;
  }
  .ln-tile[data-dim="1"] { opacity: .45; filter: saturate(.6); }
  .ln-ring { position: absolute; inset: -3px; border-radius: 16px; pointer-events: none; border: 3px solid #fff; animation: lnRing 520ms ease-out both; }
  .ln-sticker {
    position: absolute; left: 50%; top: -13px; z-index: 3; pointer-events: none; white-space: nowrap;
    padding: 3px 7px 2px; border-radius: 9px; font-size: 13px; letter-spacing: .5px; color: #fff;
    background: linear-gradient(180deg, #FF7AA8, #FF2E6C); border: 2px solid ${CANDY.outline};
    box-shadow: 0 2px 0 ${CANDY.outline}; text-shadow: 0 1.5px 0 rgba(42,10,79,.6);
    animation: lnSticker 1250ms cubic-bezier(.2,.9,.3,1.2) both;
  }
  .ln-star { position: absolute; right: -5px; top: -6px; width: 17px; height: 17px; pointer-events: none; z-index: 3; animation: lnStar 600ms cubic-bezier(.2,.9,.3,1.5) both; }
  @keyframes lnPick { 0% { transform: scale(.72) } 100% { transform: scale(1) } }
  @keyframes lnMatch { 0% { transform: scale(1) } 45% { transform: scale(1.2) rotate(-4deg) } 100% { transform: scale(1) } }
  @keyframes lnGlow { 0%, 100% { filter: brightness(1) } 50% { filter: brightness(1.18) } }
  @keyframes lnRing { 0% { opacity: .95; transform: scale(.9) } 100% { opacity: 0; transform: scale(1.25) } }
  @keyframes lnSticker {
    0% { opacity: 0; transform: translate(-50%, 8px) scale(.4) }
    18% { opacity: 1; transform: translate(-50%, -4px) scale(1.15) }
    30% { transform: translate(-50%, -2px) scale(1) }
    78% { opacity: 1; transform: translate(-50%, -8px) scale(1) }
    100% { opacity: 0; transform: translate(-50%, -18px) scale(.9) }
  }
  @keyframes lnStar { 0% { opacity: 0; transform: scale(0) rotate(-90deg) } 100% { opacity: 1; transform: scale(1) rotate(0) } }
  @media (prefers-reduced-motion: reduce) {
    .ln-tile[data-picked="1"], .ln-tile[data-match="1"], .ln-ring, .ln-star { animation: none; }
    .ln-sticker { display: none; }
  }
`;

const Star = () => (
  <svg className="ln-star" viewBox="-10 -10 20 20" aria-hidden>
    <path d="M0 -8.5 L2.4 -2.6 L8.6 -2.4 L3.8 1.5 L5.4 7.6 L0 4.1 L-5.4 7.6 L-3.8 1.5 L-8.6 -2.4 L-2.4 -2.6 Z" fill={CANDY.gold} stroke={CANDY.outline} strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export default function Grid({ picks, landed, settled, locked, round, reduced, stagger, onToggle }) {
  const picked = new Set(picks);
  const drawnSet = new Set(landed);
  const order = new Map(picks.map((n, i) => [n, i]));
  return (
    <div className="ln-grid" role="group" aria-label="Pick 6 numbers">
      {Array.from({ length: POOL }, (_, i) => i + 1).map(n => {
        const c = ballColor(n);
        const isPick = picked.has(n);
        const isDrawn = drawnSet.has(n);
        const match = isPick && isDrawn;
        const dim = settled && !isPick && !isDrawn;
        return (
          <button key={n} type="button" className="ln-tile"
            aria-pressed={isPick} aria-disabled={locked || undefined}
            aria-label={`${n}${isPick ? ', picked' : ''}${match ? ', match' : isDrawn ? ', drawn' : ''}`}
            data-picked={isPick ? '1' : undefined} data-drawn={isDrawn && !isPick ? '1' : undefined}
            data-match={match ? '1' : undefined} data-dim={dim ? '1' : undefined}
            onClick={() => onToggle(n)}
            style={{
              '--bf': c.fill, '--bl': c.light, '--bd': c.dark,
              animationDelay: isPick && !match && stagger ? `${order.get(n) * 55}ms` : undefined,
            }}>
            {isPick ? <span className="ln-face">{n}</span> : <span className="ln-num">{n}</span>}
            {isDrawn && !reduced && <span key={`r${round}`} className="ln-ring" />}
            {match && <span key={`s${round}`} className="ln-sticker">MATCH!</span>}
            {match && <Star />}
          </button>
        );
      })}
    </div>
  );
}
