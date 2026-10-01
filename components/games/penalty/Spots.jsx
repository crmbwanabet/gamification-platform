'use client';

import React from 'react';
import { CANDY } from '../candy/tokens';
import { SPOTS } from '@/lib/penalty/spots.mjs';

// The 6 target bubbles over the goal mouth. Compared with the mock they are
// smaller (ring r 18.5 vs 25) and see-through (a faint tint instead of a solid
// halo), and the rows sit further apart, so the keeper's face and body read
// clearly between them. Each keeps its coloured ring and an outlined label; an
// invisible r 27 circle keeps the tap target ≥ 48 px at 360 px wide.
// pk-spots fades them all out during a kick; pk-aim is the gold aim ring left
// on the chosen spot until impact.

const O = CANDY.outline;

export const SPOTS_CSS = `
  .pk-spot { cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
  .pk-spot .pk-sb { transform-box: fill-box; transform-origin: center; transition: transform .12s ease-out; }
  .pk-spot:active .pk-sb { transform: scale(.93); }
  .pk-spot.on .pk-sb { transform: scale(1.06); }
  .pk-spot .pk-focus { opacity: 0; }
  .pk-spot:focus-visible .pk-focus { opacity: 1; }
  .pk-pulse { transform-box: fill-box; transform-origin: center; animation: pkPulse 1.3s ease-out infinite; }
  @keyframes pkPulse { 0% { transform: scale(1); opacity: .95; } 100% { transform: scale(1.42); opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .pk-pulse { animation: none !important; opacity: 0; } }
`;

export function SpotDefs() {
  return (
    <defs>
      {SPOTS.map(s => (
        <React.Fragment key={s.id}>
          <radialGradient id={`pk-halo-${s.id}`}><stop offset=".7" stopColor={s.c} stopOpacity=".28" /><stop offset="1" stopColor={s.c} stopOpacity="0" /></radialGradient>
          <linearGradient id={`pk-ring-${s.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.l} /><stop offset=".5" stopColor={s.c} /><stop offset="1" stopColor={s.d} /></linearGradient>
        </React.Fragment>
      ))}
    </defs>
  );
}

// Gold selection ring (+ pulse); also used alone as the in-flight aim marker.
function GoldRing({ pulse }) {
  return (
    <g>
      {pulse && <circle className="pk-pulse" r="21" fill="none" stroke={CANDY.gold} strokeWidth="2.6" />}
      <circle r="23" fill="url(#pk-goldHalo)" opacity=".3" />
      <circle r="21.5" fill="none" stroke={O} strokeWidth="5.6" />
      <circle r="21.5" fill="none" stroke="url(#pk-goldRing)" strokeWidth="3.4" />
    </g>
  );
}

function Label({ mult }) {
  const whole = Number.isInteger(mult);
  const fs = whole ? 18 : 14.5, xs = whole ? 12 : 10.5;
  const text = (extra) => (
    <text textAnchor="middle" y={whole ? 6.2 : 5.1} style={{ fontFamily: CANDY.display }} fontSize={fs} stroke={O} strokeLinejoin="round" {...extra}>
      {mult}<tspan fontSize={xs}>x</tspan>
    </text>
  );
  return (
    <>
      {text({ fill: O, strokeWidth: 4.6, transform: 'translate(0 2)' })}
      {text({ fill: '#fff', strokeWidth: 4.2, paintOrder: 'stroke' })}
    </>
  );
}

function Spot({ s, selected, onPick, disabled }) {
  const pick = () => { if (!disabled) onPick(s.id); };
  return (
    <g className={`pk-spot${selected ? ' on' : ''}`} transform={`translate(${s.x} ${s.y})`}
      role="button" tabIndex={disabled ? -1 : 0} aria-pressed={selected} aria-label={`${s.label}, ${s.mult}x`}
      onClick={pick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}>
      <g className="pk-sb">
        <circle r="23" fill={`url(#pk-halo-${s.id})`} />
        <circle r="18.5" fill={s.c} fillOpacity=".14" />
        <circle r="18.5" fill="url(#pk-discShine)" opacity=".55" />
        <circle r="20.6" fill="none" stroke={O} strokeWidth="1.8" strokeOpacity=".9" />
        <circle r="18.5" fill="none" stroke={`url(#pk-ring-${s.id})`} strokeWidth="3.8" />
        <circle r="16" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
        <path d="M-12.4 -10.6 A16.3 16.3 0 0 1 5.6 -15.3" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".6" />
        {selected && <GoldRing pulse />}
        <circle className="pk-focus" r="25" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="4 3" />
        <Label mult={s.mult} />
      </g>
      <circle r="27" fill="transparent" />
    </g>
  );
}

export default function Spots({ selected, onPick, disabled }) {
  const aim = SPOTS.find(s => s.id === selected);
  return (
    <>
      <g className="pk-spots" style={{ pointerEvents: disabled ? 'none' : undefined }}>
        {SPOTS.map(s => <Spot key={s.id} s={s} selected={s.id === selected} onPick={onPick} disabled={disabled} />)}
      </g>
      {aim && <g className="pk-aim" transform={`translate(${aim.x} ${aim.y})`} style={{ pointerEvents: 'none' }}><GoldRing /></g>}
    </>
  );
}
