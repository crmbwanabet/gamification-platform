'use client';

import React from 'react';
import { O, GOLD, SKIN, SKIN_D, D2R, f1, rng, star4, cid } from './rig';
import { Hat } from './Farmer';

// Effect pools, all hidden until motion.js shows them: dust puffs behind the
// running farmer (pf*) and the hen (cp*), the landing dust cloud, the loose hat,
// feathers, confetti, sparkles, dizzy stars, sweat drops and the hands that
// grip the caught bird. (No in-scene "+payout": the WinCelebration panel is the
// star, as in Penalty Crash.)

export const N_PUFF = 15, N_CPUFF = 7, N_FEATH = 14;
export const CLOUD = [[-16, -2, 9], [-6, -8, 11], [7, -7, 10], [17, -1, 8.5], [0, 1, 10], [-24, 3, 6.5], [25, 4, 6.5], [10, -15, 7], [-10, -14, 6]];
export const SPARK = [[-24, -18, 7], [24, -24, 6], [-30, 6, 5], [30, 2, 7], [0, -36, 5.5]];
const rcf = rng(42);
export const CONFP = Array.from({ length: 30 }, (_, i) => {
  const a = (-165 + rcf() * 150) * D2R, sp = 90 + rcf() * 150;
  return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 2.6 + rcf() * 2.4, h: 5 + rcf() * 4, spin: (rcf() - .5) * 1400, c: ['#FFD21F', '#FF4FA0', '#A6F03A', '#7BE3FF', '#FFFFFF', '#FF8A1A'][i % 6], round: i % 5 === 0 };
});

function Puff({ id, s = 1 }) {
  return (
    <g id={cid(id)} opacity="0">
      <circle cx="0" cy="0" r={4.2 * s} fill="#FFE2C2" stroke="#B05A30" strokeWidth="1.1" />
      <circle cx={-4.4 * s} cy={1.6 * s} r={3.1 * s} fill="#FAD0A8" stroke="#B05A30" strokeWidth="1.1" />
      <circle cx={4.2 * s} cy={1.4 * s} r={3.3 * s} fill="#FFF0DC" stroke="#B05A30" strokeWidth="1.1" />
    </g>
  );
}

// Under the actors.
export function Puffs() {
  return (
    <g aria-hidden style={{ pointerEvents: 'none' }}>
      {Array.from({ length: N_PUFF }, (_, k) => <Puff key={`p${k}`} id={`pf${k}`} />)}
      {Array.from({ length: N_CPUFF }, (_, k) => <Puff key={`c${k}`} id={`cp${k}`} s={.6} />)}
    </g>
  );
}

// Over the actors.
export function Effects() {
  return (
    <g aria-hidden style={{ pointerEvents: 'none' }}>
      <g id={cid('cloud')} opacity="0">
        {CLOUD.map(([x, y, r], k) => <circle key={k} id={cid(`cl${k}`)} cx={x} cy={y} r={r} fill={k % 2 ? '#F2B98A' : '#F9D2AE'} stroke="#C9774A" strokeWidth="1" />)}
      </g>
      <g id={cid('hatW')} opacity="0"><Hat /></g>
      <g>
        {Array.from({ length: N_FEATH }, (_, k) => (
          <g key={k} id={cid(`fe${k}`)} opacity="0">
            <path d="M0 -6 Q3.2 -1.5 .4 6 Q-3 -1 0 -6Z" fill="#fff" stroke={O} strokeWidth=".9" />
            <path d="M.1 -4 L.3 6.5" stroke={O} strokeWidth=".6" opacity=".6" />
          </g>
        ))}
      </g>
      <g id={cid('conf')} opacity="0">
        {CONFP.map((p, i) => (p.round
          ? <circle key={i} id={cid(`cf${i}`)} r={f1(p.w / 1.4)} fill={p.c} />
          : <rect key={i} id={cid(`cf${i}`)} x={f1(-p.w / 2)} y={f1(-p.h / 2)} width={f1(p.w)} height={f1(p.h)} rx=".8" fill={p.c} />))}
      </g>
      <g>
        {SPARK.map((s, k) => <path key={k} id={cid(`sp${k}`)} d={star4(s[2])} fill="#FFF3B0" stroke={GOLD} strokeWidth=".8" opacity="0" />)}
      </g>
      <g id={cid('dizzy')} opacity="0">
        {[0, 1, 2].map(k => <path key={k} id={cid(`dz${k}`)} d={star4(5.6)} fill={GOLD} stroke={O} strokeWidth="1" />)}
      </g>
      <g id={cid('sweat')} opacity="0">
        {[0, 1].map(k => <path key={k} id={cid(`sw${k}`)} d="M0 -3 Q2.4 0 0 2.4 Q-2.4 0 0 -3Z" fill="#BFF0FF" stroke={O} strokeWidth=".9" />)}
      </g>
      <g id={cid('gripHands')} opacity="0">
        <circle id={cid('gh0')} r="5" fill={SKIN_D} stroke={O} strokeWidth="2.2" />
        <circle id={cid('gh1')} r="5" fill={SKIN} stroke={O} strokeWidth="2.2" />
      </g>
    </g>
  );
}
