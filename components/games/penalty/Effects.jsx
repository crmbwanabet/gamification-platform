'use client';

import React from 'react';
import { CANDY } from '../candy/tokens';
import { CONFETTI, SPARKS } from './motion';
import { star4 } from './Scene';

// Goal / save effects from the approved mock, all driven by motion.js keys:
//   Pocket   — the net bulging where the ball lands (pk-pocket) + ripples (pk-rip<i>)
//   Pow      — the comic "save" burst at the gloves (pk-pow)
//   Confetti — 34 pieces (.pk-cfp; launch velocity/spin as CSS variables) in pk-conf
//   Sparks   — 4-point stars around the goal (pk-sp<i>, group pk-sparks)

const O = CANDY.outline;
const f1 = n => +n.toFixed(2);

const POW = Array.from({ length: 20 }, (_, k) => { const a = (k * 18 - 90) * Math.PI / 180, rr = k % 2 ? 11 : 24 + (k % 4 === 0 ? 4 : 0); return `${f1(Math.cos(a) * rr)},${f1(Math.sin(a) * rr)}`; }).join(' ');
const POW2 = Array.from({ length: 20 }, (_, k) => { const a = (k * 18 - 90) * Math.PI / 180, rr = k % 2 ? 6 : 14; return `${f1(Math.cos(a) * rr)},${f1(Math.sin(a) * rr)}`; }).join(' ');
const PUCKER = Array.from({ length: 16 }, (_, k) => {
  const a = k * 22.5 * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
  return { d: `M${f1(c * 27)} ${f1(sn * 27)} Q${f1(c * 15 + sn * 3)} ${f1(sn * 15 - c * 3)} ${f1(c * 4)} ${f1(sn * 4)}`, w: k % 2 ? .7 : 1 };
});

export function Pocket() {
  return (
    <g className="pk-pocket">
      <circle r="30" fill="url(#pk-pocketG)" />
      <circle r="21" fill="#fff" opacity=".06" />
      <circle r="21" fill="url(#pk-meshP)" />
      <g stroke="#fff" strokeLinecap="round" fill="none" opacity=".6">
        {PUCKER.map((p, i) => <path key={i} d={p.d} strokeWidth={p.w} />)}
      </g>
      <path d="M-19 -9 A21 21 0 0 1 9 -19" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />
      <circle r="21" fill="none" stroke="#0A0020" strokeOpacity=".35" strokeWidth="3" />
      {[2, 1.6, 1.2].map((w, i) => (
        <circle key={i} className={`pk-rip${i}`} r="12" fill="none" stroke="#fff" strokeWidth={w} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
}

export function Pow() {
  return (
    <g className="pk-pow">
      <polygon points={POW} fill="#FFE45C" stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
      <polygon points={POW2} fill="#fff" />
    </g>
  );
}

export function Confetti() {
  return (
    <g className="pk-conf">
      {CONFETTI.map((p, i) => {
        const vars = { '--vx': f1(p.vx), '--vy': f1(p.vy), '--sp': f1(p.spin) };
        return p.round
          ? <circle key={i} className="pk-cfp" style={vars} r={f1(p.w / 1.4)} fill={p.c} />
          : <rect key={i} className="pk-cfp" style={vars} x={f1(-p.w / 2)} y={f1(-p.h / 2)} width={f1(p.w)} height={f1(p.h)} rx=".8" fill={p.c} />;
      })}
    </g>
  );
}

export function Sparks() {
  return (
    <g className="pk-sparks">
      {SPARKS.map((s, i) => <path key={i} className={`pk-sp${i}`} d={star4(s[2])} fill="#FFF3B0" stroke={CANDY.gold} strokeWidth=".8" />)}
    </g>
  );
}
