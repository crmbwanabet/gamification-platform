'use client';

import React from 'react';
import { CANDY } from '../candy/tokens';
import { GHOSTS } from './motion';

// The football (r = 20, classic pentagon panels) from the approved mock: the
// panel group (pk-panels) spins in flight while the highlight stays put.
// Also: its pitch shadow (pk-bshadow) and the motion trail — a few faded
// copies of the ball (pk-gh<i> opacity, pk-ghb<i> = the ball's own path, delayed).

const O = CANDY.outline;
const f1 = n => +n.toFixed(2);
const P = (a, d) => [Math.cos(a * Math.PI / 180) * d, Math.sin(a * Math.PI / 180) * d];
const pv = (cx, cy, rad, a0) => Array.from({ length: 5 }, (_, k) => { const a = (a0 + k * 72) * Math.PI / 180; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; });
const pts = v => v.map(p => p.map(f1).join(',')).join(' ');

const CENTER = pts(pv(0, 0, 6.6, -90));
const OUTER = [];
let SEAMS = '';
for (let k = 0; k < 5; k++) {
  const a = -90 + k * 72, [cx, cy] = P(a, 21.5);
  const v = pv(cx, cy, 7.2, a + 180); OUTER.push(v);
  const [x0, y0] = P(a, 6.6);
  SEAMS += `M${f1(x0)} ${f1(y0)} L${f1(v[0][0])} ${f1(v[0][1])} `;
}
for (let k = 0; k < 5; k++) { // hexagon rims between neighbouring outer pentagons
  const A = OUTER[k][1], B = OUTER[(k + 1) % 5][4];
  const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], ml = Math.hypot(m[0], m[1]);
  const m1 = [f1(m[0] / ml * 17.5), f1(m[1] / ml * 17.5)], m2 = [f1(m[0] / ml * 22), f1(m[1] / ml * 22)];
  SEAMS += `M${f1(A[0])} ${f1(A[1])} L${m1[0]} ${m1[1]} L${f1(B[0])} ${f1(B[1])} M${m1[0]} ${m1[1]} L${m2[0]} ${m2[1]} `;
}
const OUTER_PTS = OUTER.map(pts);

export function BallShadow() {
  return <ellipse className="pk-bshadow" rx="21" ry="4.5" fill="#0E0230" />;
}

// Faded white copies of the ball trailing behind it in flight (replaces the
// mock's light-beam streak).
export function BallGhosts() {
  return GHOSTS.map((g, i) => (
    <g key={i} className={`pk-gh${i}`}>
      <g className={`pk-ghb${i}`}>
        <g transform={`scale(${(1 - .1 * (i + 1)).toFixed(2)})`}>
          <circle r="19" fill="#fff" stroke={O} strokeOpacity=".35" strokeWidth="2" />
          <polygon points={CENTER} fill="#241A40" opacity=".35" />
        </g>
      </g>
    </g>
  ));
}

export default function Ball() {
  return (
    <g className="pk-ball">
      <circle r="20" fill="url(#pk-ballG)" />
      <g clipPath="url(#pk-ballClip)">
        <g className="pk-panels">
          <path d={SEAMS} stroke="#7D7598" strokeWidth="1.15" fill="none" strokeLinejoin="round" />
          <polygon points={CENTER} fill="#241A40" />
          {OUTER_PTS.map((p, i) => <polygon key={i} points={p} fill="#241A40" />)}
        </g>
        <circle r="20" fill="url(#pk-ballShade)" />
      </g>
      <circle r="20" fill="none" stroke={O} strokeWidth="2.4" />
      <ellipse cx="-7.5" cy="-9" rx="6.5" ry="3.8" fill="#fff" opacity=".85" transform="rotate(-32 -7.5 -9)" />
      <circle cx="-12.5" cy="-2" r="1.4" fill="#fff" opacity=".7" />
    </g>
  );
}
