'use client';

import React from 'react';
import { O, GOLD, cid, star4, f1 } from '../chicken/shared/rig';

// Chicken Catch 2's golden eggs: a pool of N_EGG ground eggs (each with its own
// pickup sparkle burst) reused round-robin as the hen lays them, N_SEGG eggs
// that scatter when she flies off, and the straw nest by her in the yard.
// All hidden / placed by motion2.js; none takes taps.

export const N_EGG = 8, N_SEGG = 5;
export const NEST = [254, 274];

export function EggDefs() {
  return (
    <>
      <radialGradient id={cid('eggG')} cx=".38" cy=".3" r=".8">
        <stop offset="0" stopColor="#FFFBE0" /><stop offset=".3" stopColor="#FFE680" /><stop offset=".7" stopColor={GOLD} /><stop offset="1" stopColor="#D08A00" />
      </radialGradient>
      <g id={cid('eggArt')}>
        <ellipse cx="0" cy="0" rx="6" ry="7.6" fill={`url(#${cid('eggG')})`} stroke={O} strokeWidth="1.8" />
        <ellipse cx="-2" cy="-3" rx="1.5" ry="2.4" fill="#fff" opacity=".85" />
        <path d={star4(3)} transform="translate(4.4 -6.6)" fill="#fff" />
      </g>
    </>
  );
}

const BURST = [0, 72, 144, 216, 288];

export function Eggs() {
  return (
    <g aria-hidden style={{ pointerEvents: 'none' }}>
      {Array.from({ length: N_EGG }, (_, k) => (
        <g key={k} id={cid(`egg${k}`)} opacity="0">
          <ellipse cx="0" cy="7.2" rx="6.4" ry="2" fill="#5A1A0A" opacity=".3" />
          <g id={cid(`eggE${k}`)}><use href={`#${cid('eggArt')}`} /></g>
          <g id={cid(`eggS${k}`)} opacity="0">
            {BURST.map((a, j) => (
              <path key={j} d={star4(j % 2 ? 2.6 : 3.6)} fill={j % 2 ? '#fff' : '#FFF3B0'} stroke={GOLD} strokeWidth=".6"
                transform={`rotate(${a}) translate(0 -10)`} />
            ))}
          </g>
        </g>
      ))}
    </g>
  );
}

export function ScatterEggs() {
  return (
    <g aria-hidden style={{ pointerEvents: 'none' }}>
      {Array.from({ length: N_SEGG }, (_, k) => <g key={k} id={cid(`segg${k}`)} opacity="0"><use href={`#${cid('eggArt')}`} /></g>)}
    </g>
  );
}

// A straw nest with one golden egg, beside the hen in the yard.
export function Nest() {
  const [x, y] = NEST;
  const straws = [];
  for (let k = 0; k < 9; k++) {
    const a = -16 + k * 4, b = f1(-2 + (k % 3) * 1.6);
    straws.push(<path key={k} d={`M${a} ${b} q4 ${f1(-3 - (k % 2) * 2)} 8 0`} stroke={k % 2 ? '#B9822A' : '#FFE38A'} strokeWidth="1.2" fill="none" strokeLinecap="round" />);
  }
  return (
    <g id={cid('nest')} transform={`translate(${x} ${y})`} aria-hidden style={{ pointerEvents: 'none' }}>
      <ellipse cx="0" cy="2" rx="20" ry="4.6" fill="#5A1A0A" opacity=".3" />
      <use href={`#${cid('eggArt')}`} transform="translate(-2 -6) rotate(-8)" />
      <path d="M-19 -3 Q-18 4 0 5 Q18 4 19 -3 Q10 1 0 1 Q-10 1 -19 -3Z" fill="#D9A23A" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      {straws}
    </g>
  );
}
