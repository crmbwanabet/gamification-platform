'use client';

import React from 'react';
import { SEGMENTS } from '@/lib/bottle/wheel.mjs';
import {
  O, GOLD, FONT, CX, CY, K, R_CLOTH, R_BOARD, R_PAINT, R_STUD, R_LABEL, SEG_DEG,
  cid, f1, proj, plane, wedgePath,
} from './geom';

// The sunset veranda: purple-to-gold sky, the low sun over the hills, a far
// hut, the yard's red earth, a mango tree whose canopy hangs over the top of
// the scene; in front, a round table dressed in a chitenge cloth, and on it the
// painted spinning board (8 wedges, gold studs, hub) with a mug of tea and a
// plate of mangoes at the far rim.
// Layers (back → front): <SceneBack/> · <Table/> (incl. glow/dim overlays and
// labels) · the bottle · <SceneFront/>.

export const SEG_COLORS = {
  x1_5: { c: '#2FA8FF', l: '#8AD2FF', d: '#1268B8' },
  x2: { c: '#FFC21F', l: '#FFE27A', d: '#C48A00' },
  x1_2: { c: '#3CC21A', l: '#8BEA5C', d: '#1F7A0A' },
  x4: { c: '#FF2E63', l: '#FF8FA8', d: '#B0103A' },
  x3: { c: '#FF6A1F', l: '#FFA874', d: '#B8400A' },
  try: { c: '#4A1C8C', l: '#6E3FB8', d: '#2C0C5C' },
};
export const segColor = (s) => SEG_COLORS[s.mult === 0 ? 'try' : s.id];

export const SCENE_CSS = `
  .bt-svg .bt-rays { transform-box: view-box; animation: btRays 70s linear infinite; }
  @keyframes btRays { to { transform: rotate(360deg) } }
  .bt-svg .bt-sway { transform-box: fill-box; transform-origin: 50% 0%; animation: btSway 5s ease-in-out infinite; }
  @keyframes btSway { 0%,100% { transform: rotate(-2deg) } 50% { transform: rotate(2.4deg) } }
  .bt-svg .bt-mote { animation: btMote 6s ease-in-out infinite; }
  @keyframes btMote { 0%,100% { transform: translate(0,0); opacity: 0 } 30% { opacity: .85 } 50% { transform: translate(5px,-8px) } 70% { opacity: .7 } }
  .bt-svg .bt-steam { animation: btSteam 3.2s ease-in-out infinite; }
  @keyframes btSteam { 0% { transform: translate(0,0); opacity: 0 } 30% { opacity: .55 } 100% { transform: translate(2px,-10px); opacity: 0 } }
  .bt-svg .bt-stud { transition: opacity .2s; }
  .bt-svg .bt-studs[data-mode="idle"] .bt-stud { animation: btChase 1.6s steps(1) infinite; }
  .bt-svg .bt-studs[data-mode="spin"] .bt-stud { animation: btChase .32s steps(1) infinite; }
  .bt-svg .bt-studs[data-mode="win"] .bt-stud { animation: btFlash .5s steps(1) infinite; }
  .bt-svg .bt-studs[data-mode="lose"] .bt-stud-on { opacity: .35; }
  .bt-svg .bt-stud:nth-child(2n) { animation-delay: -.8s !important; }
  .bt-svg .bt-studs[data-mode="spin"] .bt-stud:nth-child(2n) { animation-delay: -.16s !important; }
  .bt-svg .bt-studs[data-mode="win"] .bt-stud:nth-child(2n) { animation-delay: -.25s !important; }
  @keyframes btChase { 0% { opacity: 1 } 50% { opacity: .25 } }
  @keyframes btFlash { 0% { opacity: 1 } 50% { opacity: .4 } }
  .bt-svg .bt-dim { transition: opacity .35s ease-out; }
  .bt-svg .bt-glow { animation: btGlow 1.1s ease-in-out infinite; }
  .bt-svg .bt-raysWin { animation: btRay .55s ease-in-out infinite alternate; filter: drop-shadow(0 0 3px rgba(255,226,122,.9)); }
  @keyframes btRay { from { stroke-width: 4 } to { stroke-width: 7 } }
  .bt-svg .bt-spark { transform-box: fill-box; transform-origin: 50% 50%; animation: btSpark .9s ease-in-out infinite; }
  @keyframes btSpark { 0%,100% { transform: scale(.45) rotate(0deg); opacity: .5 } 50% { transform: scale(1.1) rotate(45deg); opacity: 1 } }
  @keyframes btGlow { 0%,100% { opacity: .28 } 50% { opacity: .62 } }
  .bt-svg .bt-lbl { transform-box: fill-box; transform-origin: 50% 55%; transition: transform .3s cubic-bezier(.3,1.6,.5,1); }
  .bt-svg .bt-lbl[data-hot="1"] { transform: scale(1.32); }
  @media (prefers-reduced-motion: reduce) {
    .bt-svg .bt-rays, .bt-svg .bt-sway, .bt-svg .bt-mote, .bt-svg .bt-steam, .bt-svg .bt-stud, .bt-svg .bt-glow, .bt-svg .bt-raysWin, .bt-svg .bt-spark { animation: none !important; }
    .bt-svg .bt-mote, .bt-svg .bt-steam { opacity: 0; }
    .bt-svg .bt-lbl { transition: none; }
  }
`;

// ---- seeded layout ------------------------------------------------------------
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const LAYOUT = (() => {
  const r = rng(11);
  const speck = [];
  for (let k = 0; k < 70; k++) speck.push([-50 + r() * 400, 96 + Math.pow(r(), .7) * 220, .5 + r() * 1.3]);
  const motes = [];
  for (let k = 0; k < 10; k++) motes.push({ cx: 40 + r() * 230, cy: 40 + r() * 90, r: .8 + r() * .9, delay: -r() * 6, dur: 5 + r() * 3 });
  return { speck, motes };
})();

// Canopy clumps hanging over the top of the scene [x, y, r]
const CANOPY = [[-14, 18, 30], [20, 6, 32], [56, -2, 30], [92, -8, 28], [128, -14, 24], [6, 44, 22], [40, 32, 22], [76, 22, 20], [-20, 62, 18], [254, -14, 22], [286, 2, 24], [314, 26, 22]];
const MANGOES = [[34, 48], [66, 40], [98, 24], [16, 66], [280, 30]];

export function SceneDefs() {
  return (
    <>
      <linearGradient id={cid('sky')} gradientUnits="userSpaceOnUse" x1="0" y1="-80" x2="0" y2="100">
        <stop offset="0" stopColor="#2B0F5E" /><stop offset=".3" stopColor="#5E1C88" /><stop offset=".52" stopColor="#B02E86" />
        <stop offset=".7" stopColor="#F2546A" /><stop offset=".84" stopColor="#FF9440" /><stop offset="1" stopColor="#FFD670" />
      </linearGradient>
      <radialGradient id={cid('sun')}><stop offset="0" stopColor="#FFFDE8" /><stop offset=".55" stopColor="#FFF0A0" /><stop offset="1" stopColor="#FFC63A" /></radialGradient>
      <radialGradient id={cid('sunGlow')}><stop offset="0" stopColor="#FFE7A0" stopOpacity=".95" /><stop offset=".28" stopColor="#FFC76A" stopOpacity=".5" /><stop offset="1" stopColor="#FF7A5A" stopOpacity="0" /></radialGradient>
      <linearGradient id={cid('ground')} gradientUnits="userSpaceOnUse" x1="0" y1="92" x2="0" y2="320">
        <stop offset="0" stopColor="#F09A55" /><stop offset=".3" stopColor="#D8692F" /><stop offset="1" stopColor="#9A3A1C" />
      </linearGradient>
      <linearGradient id={cid('mud')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7E3236" /><stop offset=".75" stopColor="#A84A3A" /><stop offset="1" stopColor="#F09A5A" /></linearGradient>
      <linearGradient id={cid('thatch')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D99A38" /><stop offset=".6" stopColor="#F2BE52" /><stop offset="1" stopColor="#FFD978" /></linearGradient>
      {/* chitenge print — orange ground, navy/gold/red rosettes, teal diamonds */}
      <pattern id={cid('chit')} width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
        <rect width="13" height="13" fill="#FF7A1A" />
        <circle cx="6.5" cy="6.5" r="4.2" fill="#1E2A78" /><circle cx="6.5" cy="6.5" r="2.6" fill="#FFD21F" /><circle cx="6.5" cy="6.5" r="1.1" fill="#E3261E" />
        <path d="M0 -2 L2 0 L0 2 L-2 0Z M13 -2 L15 0 L13 2 L11 0Z M0 11 L2 13 L0 15 L-2 13Z M13 11 L15 13 L13 15 L11 13Z" fill="#19B39A" />
      </pattern>
      <pattern id={cid('hem')} width="10" height="8" patternUnits="userSpaceOnUse">
        <rect width="10" height="8" fill="#1E2A78" />
        <path d="M0 8 L5 1.5 L10 8Z" fill="#FFD21F" /><path d="M2.6 8 L5 4.8 L7.4 8Z" fill="#E3261E" />
      </pattern>
      {/* skirt shading: dark at the sides, warm sunlit right */}
      <linearGradient id={cid('skirtShade')} gradientUnits="userSpaceOnUse" x1={CX - R_CLOTH} y1="0" x2={CX + R_CLOTH} y2="0">
        <stop offset="0" stopColor="#2A0A4F" stopOpacity=".62" /><stop offset=".22" stopColor="#2A0A4F" stopOpacity=".22" />
        <stop offset=".62" stopColor="#FFD9A0" stopOpacity=".08" /><stop offset=".86" stopColor="#FFD9A0" stopOpacity=".14" /><stop offset="1" stopColor="#2A0A4F" stopOpacity=".5" />
      </linearGradient>
      <linearGradient id={cid('skirtV')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2A0A4F" stopOpacity=".38" /><stop offset=".3" stopColor="#2A0A4F" stopOpacity="0" /></linearGradient>
      <radialGradient id={cid('clothShade')} cx=".62" cy=".3" r=".75"><stop offset=".55" stopColor="#2A0A4F" stopOpacity="0" /><stop offset="1" stopColor="#2A0A4F" stopOpacity=".45" /></radialGradient>
      <linearGradient id={cid('boardEdge')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5A230E" /><stop offset=".55" stopColor="#9A4A1C" /><stop offset=".85" stopColor="#D9883A" /><stop offset="1" stopColor="#6A2C10" /></linearGradient>
      <linearGradient id={cid('rim')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#B4602A" /><stop offset=".5" stopColor="#8A4018" /><stop offset="1" stopColor="#5E260C" /></linearGradient>
      {/* board lighting: warm light from the sun (far right), shade near-left */}
      <radialGradient id={cid('boardLight')} cx=".7" cy=".2" r=".95">
        <stop offset="0" stopColor="#FFF4C8" stopOpacity=".42" /><stop offset=".45" stopColor="#FFF4C8" stopOpacity="0" />
        <stop offset=".8" stopColor="#2A0A4F" stopOpacity=".1" /><stop offset="1" stopColor="#2A0A4F" stopOpacity=".38" />
      </radialGradient>
      <radialGradient id={cid('hub')} cx=".38" cy=".32" r=".8"><stop offset="0" stopColor="#FFF3B0" /><stop offset=".55" stopColor={GOLD} /><stop offset="1" stopColor="#B88400" /></radialGradient>
      <radialGradient id={cid('studOn')} cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#FFFDE8" /><stop offset=".5" stopColor="#FFE27A" /><stop offset="1" stopColor="#E0A300" /></radialGradient>
      <radialGradient id={cid('glowG')} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFF6C8" stopOpacity=".9" /><stop offset=".6" stopColor="#FFE27A" stopOpacity=".55" /><stop offset="1" stopColor="#FFD21F" stopOpacity="0" /></radialGradient>
      <radialGradient id={cid('vig')} cx=".5" cy=".5" r=".55"><stop offset=".64" stopColor="#2A0A4F" stopOpacity="0" /><stop offset="1" stopColor="#2A0A4F" stopOpacity=".55" /></radialGradient>
      <radialGradient id={cid('mango')} cx=".38" cy=".3" r=".8"><stop offset="0" stopColor="#FFE27A" /><stop offset=".45" stopColor="#FFA62B" /><stop offset="1" stopColor="#E0452A" /></radialGradient>
      <linearGradient id={cid('enamel')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#C9BEDA" /><stop offset=".45" stopColor="#FFFFFF" /><stop offset=".8" stopColor="#F2ECF6" /><stop offset="1" stopColor="#B8AACB" /></linearGradient>
      {SEGMENTS.map((s, i) => {
        const c = segColor(s);
        return (
          <radialGradient key={i} id={cid(`seg${i}`)} gradientUnits="userSpaceOnUse" cx="0" cy="0" r={R_PAINT}>
            <stop offset=".1" stopColor={c.d} /><stop offset=".55" stopColor={c.c} /><stop offset="1" stopColor={c.l} />
          </radialGradient>
        );
      })}
    </>
  );
}

function Hut({ cx, by, s }) {
  const W = 34 * s, H = 34 * s, RW = 48 * s, RH = 46 * s, ey = by - H;
  return (
    <g>
      <path d={`M${f1(cx - W)} ${f1(ey)} V${f1(by - 2)} Q${f1(cx)} ${f1(by + 4 * s)} ${f1(cx + W)} ${f1(by - 2)} V${f1(ey)}Z`} fill={`url(#${cid('mud')})`} stroke={O} strokeWidth="2" />
      <path d={`M${f1(cx + 6 * s)} ${f1(by + 1)} V${f1(by - 18 * s)} Q${f1(cx + 14 * s)} ${f1(by - 26 * s)} ${f1(cx + 22 * s)} ${f1(by - 18 * s)} V${f1(by - 1)}Z`} fill="#3A1024" stroke={O} strokeWidth="1.8" />
      <path d={`M${f1(cx - W)} ${f1(by - H * .45)} H${f1(cx + W)}`} stroke="#7A2C14" strokeWidth={f1(5 * s)} opacity=".55" />
      <path d={`M${f1(cx - RW)} ${f1(ey + 4 * s)} Q${f1(cx - RW * .5)} ${f1(ey - RH * .55)} ${f1(cx)} ${f1(ey - RH)} Q${f1(cx + RW * .5)} ${f1(ey - RH * .55)} ${f1(cx + RW)} ${f1(ey + 2 * s)} Q${f1(cx)} ${f1(ey + 10 * s)} ${f1(cx - RW)} ${f1(ey + 4 * s)}Z`} fill={`url(#${cid('thatch')})`} stroke={O} strokeWidth="2.2" strokeLinejoin="round" />
      {[-4, -2, 0, 2, 4].map(k => <path key={k} d={`M${f1(cx + k * s)} ${f1(ey - RH + 6 * s)} Q${f1(cx + k * 6 * s)} ${f1(ey - RH * .4)} ${f1(cx + k * 9 * s)} ${f1(ey + 4 * s)}`} stroke="#B07A26" strokeWidth="1.1" fill="none" opacity=".7" />)}
      <path d={`M${f1(cx + 4 * s)} ${f1(ey - RH + 8 * s)} Q${f1(cx + RW * .45)} ${f1(ey - RH * .5)} ${f1(cx + RW * .88)} ${f1(ey - 1)}`} stroke="#FFE6A0" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".85" />
    </g>
  );
}

// Sky, sun, hills, far huts, the mango trunk and the yard
export function SceneBack() {
  return (
    <g aria-hidden>
      <rect x="-80" y="-120" width="460" height="240" fill={`url(#${cid('sky')})`} />
      <g transform="translate(232 82)" fill="#FFF1B8" opacity=".1">
        <g className="bt-rays">
          {Array.from({ length: 14 }, (_, k) => <path key={k} d="M0 0 L-9 -240 L9 -240Z" transform={`rotate(${k * (360 / 14)})`} />)}
        </g>
      </g>
      <circle cx="232" cy="82" r="120" fill={`url(#${cid('sunGlow')})`} />
      <circle cx="232" cy="82" r="22" fill={`url(#${cid('sun')})`} />
      <circle cx="232" cy="82" r="22" fill="none" stroke="#FFF6D0" strokeWidth="2" opacity=".7" />
      {/* candy clouds */}
      <path d="M170 52 Q175 43 186 46 Q192 37 204 41 Q213 36 220 45 Q231 44 233 52Z" fill="#FF9AB0" stroke="#C2407A" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M176 51 Q190 49 226 51" stroke="#FFD0A0" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M262 30 Q267 23 276 26 Q281 19 291 23 Q300 20 305 28 Q314 28 315 34Z" fill="#E77AB8" stroke="#A8307A" strokeWidth="1.3" strokeLinejoin="round" opacity=".85" />
      <path d="M150 32 q3 -3 6 0 q3 -3 6 0 M166 22 q2.4 -2.4 4.8 0 q2.4 -2.4 4.8 0" stroke="#5A1A6E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* hills */}
      <path d="M-80 98 Q-10 76 60 86 Q140 66 210 84 Q270 74 380 90 L380 130 L-80 130Z" fill="#B4467E" />
      <path d="M-80 104 Q40 90 130 98 Q220 86 380 100 L380 130 L-80 130Z" fill="#8E2E72" />
      <g fill="#6A1E5E">
        <path d="M284 94 V82 M284 86 l-5 -5 M284 85 l5 -4" stroke="#6A1E5E" strokeWidth="1.6" />
        <ellipse cx="284" cy="79" rx="14" ry="3.4" /><ellipse cx="278" cy="77.4" rx="6.6" ry="2.4" />
      </g>
      <circle cx="232" cy="96" r="54" fill={`url(#${cid('sunGlow')})`} opacity=".45" />
      {/* the yard */}
      <rect x="-80" y="98" width="460" height="240" fill={`url(#${cid('ground')})`} />
      <path d="M-80 98 Q60 94 150 97 Q250 94 380 98 L380 101 Q250 98 150 101 Q60 98 -80 102Z" fill="#FFC27A" opacity=".55" />
      <ellipse cx="236" cy="112" rx="70" ry="9" fill="#FFCB78" opacity=".35" />
      {LAYOUT.speck.map(([x, y, r], k) => <ellipse key={k} cx={f1(x)} cy={f1(y)} rx={f1(r)} ry={f1(r * .55)} fill={k % 3 ? '#8E3418' : '#FFC890'} opacity={k % 3 ? .4 : .5} />)}
      {/* far huts */}
      <g transform="translate(0 0)"><Hut cx={22} by={104} s={.8} /></g>
      <Hut cx={292} by={104} s={.55} />
      {/* mango trunk, behind the table */}
      <path d="M58 112 Q62 70 52 30 M56 70 Q40 52 30 34 M57 58 Q72 40 88 22" stroke={O} strokeWidth="12" fill="none" strokeLinecap="round" />
      <path d="M58 112 Q62 70 52 30 M56 70 Q40 52 30 34 M57 58 Q72 40 88 22" stroke="#5A2A26" strokeWidth="8" fill="none" strokeLinecap="round" />
      <path d="M61 108 Q64 72 56 38" stroke="#8A4A3A" strokeWidth="1.8" fill="none" />
      <ellipse cx="58" cy="112" rx="16" ry="3.6" fill="#7A2A14" opacity=".45" />
    </g>
  );
}

// The skirt: chitenge cloth hanging from the front half of the table edge,
// folds, a patterned hem with scallops.
const DROP = 26;
function skirtPath() {
  const rx = R_CLOTH, ry = R_CLOTH * K, N = 40;
  let d = `M${CX - rx} ${CY}`;
  for (let k = 1; k <= N; k++) {
    const a = Math.PI - (k / N) * Math.PI;
    d += ` L${f1(CX + Math.cos(a) * rx)} ${f1(CY + Math.sin(a) * ry)}`;
  }
  // down the right side, then the scalloped hem back to the left
  d += ` L${f1(CX + rx - 1)} ${f1(CY + DROP - 4)}`;
  const S = 14;
  for (let k = 1; k <= S; k++) {
    const a0 = ((k - 1) / S) * Math.PI, a1 = (k / S) * Math.PI, am = (a0 + a1) / 2;
    const x1 = CX + Math.cos(a1) * (rx - 1), y1 = CY + Math.sin(a1) * ry + DROP - 4 + Math.sin(a1) * 4;
    const xm = CX + Math.cos(am) * (rx - 1), ym = CY + Math.sin(am) * ry + DROP + 2 + Math.sin(am) * 4;
    d += ` Q${f1(xm)} ${f1(ym + 4)} ${f1(x1)} ${f1(y1)}`;
  }
  return d + 'Z';
}
const SKIRT = skirtPath();
const FOLDS = [-.86, -.6, -.32, -.06, .2, .46, .72].map(u => {
  const x = CX + u * R_CLOTH, y0 = CY + Math.sqrt(1 - u * u) * R_CLOTH * K;
  return { x, y0, y1: y0 + DROP + 2 };
});

function Mug({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="1" cy="1" rx="11" ry="3.6" fill="#2A0A4F" opacity=".35" />
      <path d="M8 -15 Q16 -15 16 -9 Q16 -3 8 -3" stroke={O} strokeWidth="5" fill="none" />
      <path d="M8 -15 Q16 -15 16 -9 Q16 -3 8 -3" stroke="#F2ECF6" strokeWidth="2.4" fill="none" />
      <path d="M-9 -19 V-1 Q-9 2 0 2 Q9 2 9 -1 V-19Z" fill={`url(#${cid('enamel')})`} stroke={O} strokeWidth="2" />
      <path d="M-9 -3 Q-9 1.6 0 1.6 Q9 1.6 9 -3" stroke="#1E63E6" strokeWidth="2" fill="none" />
      <ellipse cx="0" cy="-19" rx="9" ry="3" fill="#1E63E6" stroke={O} strokeWidth="2" />
      <ellipse cx="0" cy="-18.6" rx="7" ry="2" fill="#8A4A1E" />
      <path d="M-5 -8 l2 -3 l2 3" stroke="#E3261E" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path className="bt-steam" d="M-2 -24 q-2 -3 0 -6 q2 -3 0 -6" stroke="#FFF6E8" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path className="bt-steam" style={{ animationDelay: '-1.6s' }} d="M3 -23 q-2 -3 0 -6 q2 -3 0 -6" stroke="#FFF6E8" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </g>
  );
}

function MangoPlate({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="0" cy="2" rx="17" ry="5" fill="#2A0A4F" opacity=".3" />
      <ellipse cx="0" cy="0" rx="16" ry="5.6" fill="#F7F1FA" stroke={O} strokeWidth="2" />
      <ellipse cx="0" cy="-.4" rx="11" ry="3.4" fill="#E3D8EC" />
      {[[-6, -4, -20], [5, -4.5, 16], [0, -9, -4]].map(([mx, my, r], k) => (
        <g key={k} transform={`translate(${mx} ${my}) rotate(${r})`}>
          <ellipse cx="0" cy="0" rx="6.4" ry="5" fill={`url(#${cid('mango')})`} stroke={O} strokeWidth="1.6" />
          <ellipse cx="-2" cy="-1.8" rx="2" ry="1.1" fill="#FFF3B0" opacity=".85" />
          {k === 2 && <path d="M3 -4.4 q4 -4 8 -2 q-4 3 -8 2Z" fill="#3CA83A" stroke={O} strokeWidth="1.2" strokeLinejoin="round" />}
        </g>
      ))}
    </g>
  );
}

// Upright painted label for segment i (screen space, not squashed)
function Label({ s, i }) {
  const [x, y] = proj(i * SEG_DEG, R_LABEL);
  const common = { textAnchor: 'middle', fill: '#fff', stroke: O, strokeWidth: 4, strokeLinejoin: 'round', paintOrder: 'stroke', style: { fontFamily: FONT } };
  if (s.mult === 0) {
    return (
      <g id={cid(`lbl${i}`)} className="bt-lbl">
        <text x={f1(x)} y={f1(y - 1.5)} fontSize="12.5" letterSpacing=".4" {...common}>TRY</text>
        <text x={f1(x)} y={f1(y + 10)} fontSize="12.5" letterSpacing=".4" {...common}>AGAIN</text>
      </g>
    );
  }
  const n = String(s.mult);
  return (
    <g id={cid(`lbl${i}`)} className="bt-lbl">
      <text x={f1(x)} y={f1(y + 8)} fontSize="25" {...common} strokeWidth="4.6">
        {n}<tspan fontSize="16">x</tspan>
      </text>
    </g>
  );
}

// The table: skirt, cloth top, props on the far rim, the painted board with
// its glow/dim overlays, studs, hub and labels.
export function Table() {
  const tilt = `translate(${CX} ${CY}) scale(1 ${K})`;
  const boardEdge = `translate(${CX} ${CY + 5}) scale(1 ${K})`;
  return (
    <g>
      {/* ground shadow */}
      <ellipse cx={CX + 6} cy={CY + R_CLOTH * K + DROP} rx={R_CLOTH + 14} ry="14" fill="#5A1A10" opacity=".5" />
      {/* skirt */}
      <path d={SKIRT} fill={`url(#${cid('chit')})`} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
      <path d={SKIRT} fill={`url(#${cid('skirtShade')})`} />
      {FOLDS.map((f, k) => (
        <path key={k} d={`M${f1(f.x)} ${f1(f.y0)} Q${f1(f.x - 3)} ${f1((f.y0 + f.y1) / 2)} ${f1(f.x - 1)} ${f1(f.y1)}`} stroke="#2A0A4F" strokeWidth="5" opacity=".2" fill="none" strokeLinecap="round" />
      ))}
      {/* hem band */}
      <g clipPath={`url(#${cid('skirtClip')})`}>
        <path d={(() => {
          const rx = R_CLOTH - 1, ry = R_CLOTH * K, N = 40;
          let d = '';
          for (let k = 0; k <= N; k++) {
            const a = (k / N) * Math.PI;
            d += `${k ? ' L' : 'M'}${f1(CX + Math.cos(a) * rx)} ${f1(CY + Math.sin(a) * ry + DROP - 5 + Math.sin(a) * 4)}`;
          }
          return d;
        })()} stroke={`url(#${cid('hem')})`} strokeWidth="9" fill="none" />
      </g>
      <clipPath id={cid('skirtClip')}><path d={SKIRT} /></clipPath>
      <path d={SKIRT} fill="none" stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
      {/* cloth on the table top */}
      <g transform={tilt}>
        <circle r={R_CLOTH} fill={`url(#${cid('chit')})`} stroke={O} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        <circle r={R_CLOTH} fill={`url(#${cid('clothShade')})`} />
        <circle r={R_CLOTH - 6} fill="none" stroke="#1E2A78" strokeWidth="4" opacity=".55" />
      </g>
      <path d={`M${CX - R_CLOTH + 4} ${CY + 6} A${R_CLOTH - 4} ${f1((R_CLOTH - 4) * K)} 0 0 0 ${CX + R_CLOTH - 4} ${CY + 6}`} stroke="#FFE2B0" strokeWidth="1.6" fill="none" opacity=".35" />
      {/* props on the far rim */}
      <Mug x={f1(proj(-38, 119)[0])} y={f1(proj(-38, 119)[1])} />
      <MangoPlate x={f1(proj(36, 119)[0])} y={f1(proj(36, 119)[1])} />
      {/* board: thickness, rim, wedges */}
      <g transform={boardEdge}>
        <circle r={R_BOARD} fill={`url(#${cid('boardEdge')})`} stroke={O} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
      </g>
      <g transform={tilt}>
        <circle r={R_BOARD} fill={`url(#${cid('rim')})`} stroke={O} strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
        <circle r={R_BOARD - 2.5} fill="none" stroke="#FFC46A" strokeWidth="1.4" opacity=".5" />
        {SEGMENTS.map((s, i) => <path key={i} d={wedgePath(i)} fill={`url(#${cid(`seg${i}`)})`} />)}
        {/* TRY AGAIN wedges: a painted zigzag */}
        {SEGMENTS.map((s, i) => s.mult === 0 && (
          <path key={`z${i}`} d={wedgePath(i, R_PAINT - 9)} fill="none" stroke="#6E3FB8" strokeWidth="1.4" opacity=".6" strokeDasharray="3 4" />
        ))}
        {SEGMENTS.map((s, i) => {
          const [x, y] = plane(i * SEG_DEG - SEG_DEG / 2, R_PAINT);
          return <path key={`d${i}`} d={`M0 0 L${f1(x)} ${f1(y)}`} stroke={O} strokeWidth="4.2" strokeLinecap="round" />;
        })}
        {SEGMENTS.map((s, i) => {
          const [x, y] = plane(i * SEG_DEG - SEG_DEG / 2, R_PAINT);
          return <path key={`g${i}`} d={`M0 0 L${f1(x)} ${f1(y)}`} stroke="#FFE27A" strokeWidth="1.6" strokeLinecap="round" />;
        })}
        <circle r={R_PAINT} fill="none" stroke={O} strokeWidth="3" />
        <circle r={R_PAINT + 1.6} fill="none" stroke="#FFE27A" strokeWidth="1.3" />
        <circle r={R_PAINT} fill={`url(#${cid('boardLight')})`} />
        {/* result overlays (driven by the game) */}
        <g id={cid('dims')}>
          {SEGMENTS.map((s, i) => <path key={i} className="bt-dim" data-i={i} d={wedgePath(i)} fill="#14042C" opacity="0" />)}
        </g>
        <g id={cid('glowWrap')} opacity="0">
          <path id={cid('glow')} className="bt-glow" d={wedgePath(0)} fill={`url(#${cid('glowG')})`} />
          <path id={cid('glowEdge')} d={wedgePath(0)} fill="none" stroke="#FFE27A" strokeWidth="5" strokeLinejoin="round" />
          <path id={cid('glowEdge2')} d={wedgePath(0)} fill="none" stroke="#FFFDE8" strokeWidth="1.6" strokeLinejoin="round" />
        </g>
        <circle r="12" fill="#2A0A4F" opacity=".35" transform="translate(1.5 3)" />
        <circle r="11" fill={`url(#${cid('hub')})`} stroke={O} strokeWidth="2.2" />
        <circle r="4" fill="#E0A300" stroke={O} strokeWidth="1.2" />
      </g>
      {/* gold studs on the rim (marquee) */}
      <g className="bt-studs" id={cid('studs')} data-mode="idle">
        {Array.from({ length: 16 }, (_, k) => {
          const [x, y] = proj(k * 22.5 + 11.25, R_STUD);
          return (
            <g key={k} className="bt-stud">
              <circle cx={f1(x)} cy={f1(y)} r="3.6" fill={`url(#${cid('studOn')})`} stroke={O} strokeWidth="1.3" />
              <circle cx={f1(x - .9)} cy={f1(y - .9)} r=".9" fill="#fff" />
            </g>
          );
        })}
      </g>
      <path id={cid('rays')} className="bt-raysWin" d="" fill="none" stroke="#FFE27A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
      <g aria-hidden>{SEGMENTS.map((s, i) => <Label key={i} s={s} i={i} />)}</g>
      <g id={cid('sparks')} opacity="0" aria-hidden>
        {[0, 1, 2].map(k => (
          <g key={k} id={cid(`spark${k}`)}>
            <path className="bt-spark" style={{ animationDelay: `${-k * .3}s` }} d="M0 -9 Q1.2 -1.2 9 0 Q1.2 1.2 0 9 Q-1.2 1.2 -9 0 Q-1.2 -1.2 0 -9Z" fill="#FFF6C8" stroke="#E0A300" strokeWidth="1" />
          </g>
        ))}
      </g>
    </g>
  );
}

// Overhanging mango canopy, light motes, vignette
export function SceneFront() {
  return (
    <g aria-hidden pointerEvents="none">
      <g className="bt-sway">
        {CANOPY.map(([x, y, r], k) => <circle key={`o${k}`} cx={x} cy={y} r={r + 2.2} fill={O} />)}
        {CANOPY.map(([x, y, r], k) => <circle key={`f${k}`} cx={x} cy={y} r={r} fill="#2F6E34" />)}
        {CANOPY.map(([x, y, r], k) => <circle key={`l${k}`} cx={f1(x + r * .2)} cy={f1(y - r * .25)} r={f1(r * .7)} fill="#3F8A3A" />)}
        {CANOPY.map(([x, y, r], k) => <path key={`h${k}`} d={`M${f1(x + r * .15)} ${f1(y - r * .9)} A${r} ${r} 0 0 1 ${f1(x + r * .95)} ${f1(y - r * .1)}`} stroke="#A8D84A" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".75" />)}
        {/* leaf tips hanging down */}
        {[[8, 64, -18], [34, 54, 10], [62, 44, -8], [88, 34, 14], [112, 24, -10], [272, 18, 12], [298, 44, -14]].map(([x, y, r], k) => (
          <g key={`t${k}`} transform={`translate(${x} ${y}) rotate(${r})`}>
            <path d="M0 0 Q6 9 0 20 Q-6 9 0 0Z" fill="#3F8A3A" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M0 2 V17" stroke="#7CC04A" strokeWidth="1" />
          </g>
        ))}
        {MANGOES.map(([x, y], k) => (
          <g key={`m${k}`}>
            <path d={`M${x} ${y - 9} V${y - 4}`} stroke="#4A2A1A" strokeWidth="1.4" />
            <ellipse cx={x} cy={y} rx="4.6" ry="5.8" fill={`url(#${cid('mango')})`} stroke={O} strokeWidth="1.5" />
            <ellipse cx={x - 1.4} cy={y - 2} rx="1.3" ry="1.9" fill="#FFF3B0" opacity=".9" />
          </g>
        ))}
      </g>
      {LAYOUT.motes.map((m, k) => (
        <circle key={k} className="bt-mote" cx={f1(m.cx)} cy={f1(m.cy)} r={f1(m.r)} fill="#FFF3C0" style={{ animationDelay: `${f1(m.delay)}s`, animationDuration: `${f1(m.dur)}s` }} />
      ))}
      <rect x="-80" y="-120" width="460" height="460" fill={`url(#${cid('vig')})`} />
    </g>
  );
}
