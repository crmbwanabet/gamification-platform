'use client';

import React from 'react';
import { CANDY } from '../candy/tokens';
import { seededRng } from './motion';

// Penalty Crash backdrop — night stadium in the candy palette (ported from the
// approved mock): roof + floodlights, crowd bokeh with camera flashes, ad
// boards, striped pitch, goal net (wobbles on a goal) and the goal frame.
// All static except the net (`pk-net`) and the idle CSS loops (flash/flare).
// SVG ids are prefixed `pk-`; only one game is mounted at a time.

const O = CANDY.outline;
const f1 = n => +n.toFixed(2);
const star4 = (s) => `M0 ${-s} Q${s * .18} ${-s * .18} ${s} 0 Q${s * .18} ${s * .18} 0 ${s} Q${-s * .18} ${s * .18} ${-s} 0 Q${-s * .18} ${-s * .18} 0 ${-s}Z`;
export { star4 };

// ---- generated decoration (seeded: identical on every render) ----------------
const r = seededRng(7);
const CC = ['#FF5FA2', '#FFD21F', '#7BE3FF', '#FFFFFF', '#B98CFF', '#FF8A3D', '#8CF06A'];
const CROWD = [], CROWD_FAR = [], BOKEH = [], FLASHES = [];
for (let i = 0; i < 320; i++) {
  const y = 38 + Math.pow(r(), .8) * 112, x = -40 + r() * 380;
  const rad = .8 + (y - 38) / 112 * 1.6 + r() * .9;
  const dot = { x: f1(x), y: f1(y), r: f1(rad), c: CC[Math.floor(r() * CC.length)], o: f1(.22 + r() * .5) };
  (i % 3 ? CROWD : CROWD_FAR).push(dot);
}
for (let i = 0; i < 22; i++) {
  const x = -30 + r() * 360, y = 40 + r() * 100, rad = 4 + r() * 7;
  BOKEH.push({ x: f1(x), y: f1(y), r: f1(rad), c: CC[i % CC.length], o: f1(.1 + r() * .14) });
}
for (let i = 0; i < 9; i++) FLASHES.push({ x: f1(8 + r() * 284), y: f1(44 + r() * 96), d: f1(r() * 3.2) });

const BANDS = [150, 166, 172, 179, 187, 196, 206, 218, 232, 249, 269, 293, 320, 352, 390];
const MOW = [];
for (let k = -9; k <= 9; k += 2) {
  const w = 40, bx0 = 150 + k * w, bx1 = bx0 + w, tx0 = 150 + (bx0 - 150) * .3, tx1 = 150 + (bx1 - 150) * .3;
  MOW.push(`M${f1(tx0)} 166 L${f1(tx1)} 166 L${f1(bx1)} 390 L${f1(bx0)} 390Z`);
}
const BOARD_X = [];
for (let x = -60; x < 360; x += 50) BOARD_X.push(x);
const ROOF_LIGHTS = Array.from({ length: 29 }, (_, i) => { const x = -30 + i * 12.8; return [f1(x), f1(36 - 28 * (1 - Math.pow((x - 150) / 190, 2)) + 1.6)]; });

const Dots = ({ list }) => list.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity={d.o} />);

export const SCENE_CSS = `
  .pk-flash { animation: pkFlash 3.2s ease-in-out infinite; opacity: 0; }
  @keyframes pkFlash { 0%, 86%, 100% { opacity: 0; } 90% { opacity: 1; } 94% { opacity: .15; } }
  .pk-flare { transform-box: fill-box; transform-origin: center; animation: pkFlare 4s ease-in-out infinite; }
  @keyframes pkFlare { 0%,100% { transform: scale(1) rotate(0deg); opacity: .9; } 50% { transform: scale(1.12) rotate(8deg); opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .pk-flash, .pk-flare { animation: none !important; } }
`;

// Gradients / patterns shared by the whole scene.
export function SceneDefs() {
  return (
    <defs>
      <linearGradient id="pk-skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0C0224" /><stop offset=".5" stopColor="#1E0848" /><stop offset="1" stopColor="#3A1784" /></linearGradient>
      <linearGradient id="pk-standG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#170640" /><stop offset=".6" stopColor="#26095C" /><stop offset="1" stopColor="#3B137D" /></linearGradient>
      <radialGradient id="pk-floodG"><stop offset="0" stopColor="#FFFDF0" stopOpacity="1" /><stop offset=".12" stopColor="#FFF1BF" stopOpacity=".85" /><stop offset=".35" stopColor="#C79BFF" stopOpacity=".32" /><stop offset="1" stopColor="#7A3BFF" stopOpacity="0" /></radialGradient>
      <radialGradient id="pk-flashG"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <linearGradient id="pk-beamL" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stopColor="#FFF4D0" stopOpacity=".26" /><stop offset="1" stopColor="#FFF4D0" stopOpacity="0" /></linearGradient>
      <linearGradient id="pk-beamR" x1="1" y1="0" x2=".6" y2="1"><stop offset="0" stopColor="#FFF4D0" stopOpacity=".26" /><stop offset="1" stopColor="#FFF4D0" stopOpacity="0" /></linearGradient>
      <linearGradient id="pk-boardG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8E1BC7" /><stop offset=".5" stopColor="#E0287A" /><stop offset="1" stopColor="#8E1BC7" /></linearGradient>
      <radialGradient id="pk-pitchLight" cx=".5" cy=".3" r=".7"><stop offset="0" stopColor="#E8FFB0" stopOpacity=".28" /><stop offset=".6" stopColor="#E8FFB0" stopOpacity=".06" /><stop offset="1" stopColor="#E8FFB0" stopOpacity="0" /></radialGradient>
      <radialGradient id="pk-vig" cx=".5" cy=".5" r=".5" gradientTransform="translate(0 .06) scale(1 .9)"><stop offset=".6" stopColor="#12032E" stopOpacity="0" /><stop offset="1" stopColor="#12032E" stopOpacity=".55" /></radialGradient>
      <radialGradient id="pk-spotPool"><stop offset="0" stopColor="#F4FFD0" stopOpacity=".22" /><stop offset="1" stopColor="#F4FFD0" stopOpacity="0" /></radialGradient>
      <linearGradient id="pk-pitchFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1A0640" stopOpacity=".55" /><stop offset="1" stopColor="#1A0640" stopOpacity="0" /></linearGradient>
      <pattern id="pk-mesh" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 4.5 L4.5 0 L9 4.5 L4.5 9 Z" fill="none" stroke="#fff" strokeOpacity=".62" strokeWidth=".85" /></pattern>
      <pattern id="pk-meshS" width="9" height="9" patternUnits="userSpaceOnUse"><path d="M0 4.5 L4.5 0 L9 4.5 L4.5 9 Z" fill="none" stroke="#fff" strokeOpacity=".4" strokeWidth=".75" /></pattern>
      <pattern id="pk-meshP" width="5.5" height="5.5" patternUnits="userSpaceOnUse"><path d="M0 2.75 L2.75 0 L5.5 2.75 L2.75 5.5 Z" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth=".6" /></pattern>
      <radialGradient id="pk-pocketG"><stop offset="0" stopColor="#0A0020" stopOpacity=".85" /><stop offset=".55" stopColor="#0A0020" stopOpacity=".45" /><stop offset="1" stopColor="#0A0020" stopOpacity="0" /></radialGradient>
      <linearGradient id="pk-interiorG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0E0230" stopOpacity=".55" /><stop offset="1" stopColor="#0E0230" stopOpacity=".2" /></linearGradient>
      <radialGradient id="pk-ballG" cx=".36" cy=".3" r=".8"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".55" stopColor="#F1EDFA" /><stop offset="1" stopColor="#B2A7CF" /></radialGradient>
      <radialGradient id="pk-ballShade" cx=".35" cy=".3" r=".85"><stop offset=".5" stopColor={O} stopOpacity="0" /><stop offset="1" stopColor={O} stopOpacity=".45" /></radialGradient>
      <clipPath id="pk-ballClip"><circle r="19" /></clipPath>
      <linearGradient id="pk-gloveG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D4FF6A" /><stop offset=".45" stopColor="#A6F03A" /><stop offset="1" stopColor="#78C21A" /></linearGradient>
      <linearGradient id="pk-jerseyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFA24A" /><stop offset=".6" stopColor="#FF7A1A" /><stop offset="1" stopColor="#EE5E0C" /></linearGradient>
      <radialGradient id="pk-skinG" cx=".38" cy=".32" r=".8"><stop offset="0" stopColor="#B57A52" /><stop offset=".7" stopColor="#8E5634" /><stop offset="1" stopColor="#6E3F24" /></radialGradient>
      <linearGradient id="pk-skinL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9C6340" /><stop offset="1" stopColor="#7C4A2C" /></linearGradient>
      <radialGradient id="pk-discShine" cx=".5" cy=".2" r=".75"><stop offset="0" stopColor="#fff" stopOpacity=".45" /><stop offset=".5" stopColor="#fff" stopOpacity=".06" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
      <radialGradient id="pk-goldHalo"><stop offset=".7" stopColor={CANDY.gold} stopOpacity=".75" /><stop offset="1" stopColor={CANDY.gold} stopOpacity="0" /></radialGradient>
      <linearGradient id="pk-goldRing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF3B0" /><stop offset=".5" stopColor={CANDY.gold} /><stop offset="1" stopColor={CANDY.goldDeep} /></linearGradient>
      <filter id="pk-blur1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.1" /></filter>
      <filter id="pk-blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
    </defs>
  );
}

// Everything behind the goal: sky, stands, crowd, roof, floodlights, boards, pitch.
export const Stadium = React.memo(function Stadium() {
  return (
    <g>
      <rect x="-40" y="-80" width="380" height="480" fill="url(#pk-skyG)" />
      <path d="M-40 40 Q150 14 340 40 L340 170 L-40 170 Z" fill="url(#pk-standG)" />
      <g filter="url(#pk-blur1)"><Dots list={CROWD_FAR} /></g>
      <g><Dots list={CROWD} /></g>
      <g filter="url(#pk-blur3)"><Dots list={BOKEH} /></g>
      <path d="M-40 68 Q150 48 340 68 M-40 103 Q150 88 340 103 M-40 134 Q150 124 340 134" stroke="#0E0230" strokeOpacity=".55" strokeWidth="3" fill="none" />
      <path d="M-40 66.5 Q150 46.5 340 66.5 M-40 101.5 Q150 86.5 340 101.5" stroke="#B98CFF" strokeOpacity=".18" strokeWidth=".8" fill="none" />
      {FLASHES.map((p, i) => (
        <g key={i} className="pk-flash" style={{ animationDelay: `${p.d}s` }}>
          <circle cx={p.x} cy={p.y} r="4" fill="url(#pk-flashG)" />
          <path d={`M${f1(p.x - 5)} ${p.y}h10M${p.x} ${f1(p.y - 5)}v10`} stroke="#fff" strokeWidth=".7" opacity=".9" />
        </g>
      ))}
      {/* roof */}
      <path d="M-40 -80 L340 -80 L340 36 Q150 8 -40 36 Z" fill="#0A0120" />
      <path d="M-40 36 Q150 8 340 36" stroke={CANDY.gold} strokeOpacity=".35" strokeWidth="1.2" fill="none" />
      <g fill="#FFE9A8">{ROOF_LIGHTS.map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".9" opacity=".85" />)}</g>
      {/* floodlights */}
      <path d="M18 16 L42 16 L150 196 L40 196 Z" fill="url(#pk-beamL)" style={{ mixBlendMode: 'screen' }} />
      <path d="M258 16 L282 16 L260 196 L150 196 Z" fill="url(#pk-beamR)" style={{ mixBlendMode: 'screen' }} />
      <circle cx="30" cy="14" r="70" fill="url(#pk-floodG)" style={{ mixBlendMode: 'screen' }} />
      <circle cx="270" cy="14" r="70" fill="url(#pk-floodG)" style={{ mixBlendMode: 'screen' }} />
      {[30, 270].map(x => (
        <g key={x} transform={`translate(${x} 14)`}>
          <rect x="-13" y="-7" width="26" height="12" rx="2.5" fill="#1B0A3A" stroke="#0A0120" strokeWidth="1.2" />
          {[-8.5, -2.8, 2.8, 8.5].flatMap(cx => [-3, 1.6].map(cy => <circle key={`${cx},${cy}`} cx={cx} cy={cy} r="2" fill="#FFFBE6" />))}
          <g className="pk-flare" opacity=".9"><path d={star4(22)} fill="#fff" opacity=".55" /><path d={star4(10)} fill="#fff" transform="rotate(45)" opacity=".6" /></g>
        </g>
      ))}
      {/* ad boards */}
      <rect x="-40" y="150" width="380" height="16" fill="#12042E" />
      <rect x="-40" y="151.5" width="380" height="13" fill="url(#pk-boardG)" opacity=".9" />
      <g>
        {BOARD_X.map(x => (
          <g key={x}>
            <text x={x} y="161.6" style={{ fontFamily: CANDY.display }} fontSize="9.5" fill={CANDY.gold} opacity=".9" letterSpacing=".6">100X</text>
            <path d={`M${x + 33} 155.6l1.3 2.6 2.8.4-2 2 .5 2.8-2.6-1.3-2.6 1.3.5-2.8-2-2 2.8-.4z`} fill="#fff" opacity=".7" />
          </g>
        ))}
      </g>
      <rect x="-40" y="151.5" width="380" height="1.3" fill="#fff" opacity=".35" />
      <rect x="-40" y="164.5" width="380" height="1.5" fill="#0A0120" />
      {/* pitch */}
      {BANDS.slice(0, -1).map((y, i) => <rect key={y} x="-40" y={y} width="380" height={BANDS[i + 1] - y + .5} fill={i % 2 ? '#2F9A24' : '#3AAE2C'} />)}
      <g fill="#fff" opacity=".055">{MOW.map((d, i) => <path key={i} d={d} />)}</g>
      <rect x="-40" y="150" width="380" height="240" fill="url(#pk-pitchLight)" />
      <ellipse cx="150" cy="284" rx="70" ry="22" fill="url(#pk-spotPool)" />
      <rect x="-40" y="166" width="380" height="24" fill="url(#pk-pitchFade)" />
      <rect x="-40" y="-80" width="380" height="480" fill="url(#pk-vig)" />
      <g stroke="#fff" fill="none" strokeLinejoin="round" strokeLinecap="round">
        <path d="M-40 192.5 H340" strokeWidth="2.2" strokeOpacity=".92" />
        <path d="M60 192.5 L48 218 L252 218 L240 192.5" strokeWidth="2.3" strokeOpacity=".85" />
      </g>
      <ellipse cx="150" cy="289" rx="9" ry="2.6" fill="#fff" opacity=".8" />
      {/* goal: shadow + dark interior */}
      <ellipse cx="150" cy="194" rx="136" ry="5" fill="#0E0230" opacity=".35" />
      <path d="M33.5 53.5 H266.5 V192 H33.5Z" fill="url(#pk-interiorG)" />
    </g>
  );
});

// The net — its own layer so a goal can make it wobble (pk-net).
export const GoalNet = React.memo(function GoalNet() {
  return (
    <g className="pk-net">
      <rect x="50" y="70" width="200" height="116" fill="url(#pk-mesh)" />
      <path d="M33.5 53.5 L266.5 53.5 L250 70 L50 70 Z" fill="url(#pk-meshS)" />
      <path d="M33.5 53.5 L50 70 L50 186 L33.5 192 Z" fill="url(#pk-meshS)" />
      <path d="M266.5 53.5 L250 70 L250 186 L266.5 192 Z" fill="url(#pk-meshS)" />
      <path d="M33.5 53.5 L266.5 53.5 L250 70 L50 70 Z" fill="#fff" opacity=".05" />
      <g stroke="#fff" fill="none" strokeLinecap="round">
        <path d="M50 70 H250" strokeWidth="2.4" strokeOpacity=".8" />
        <path d="M50 70 V186 M250 70 V186" strokeWidth="2" strokeOpacity=".7" />
        <path d="M50 186 H250" strokeWidth="1.4" strokeOpacity=".45" />
        <path d="M33.5 53.5 L50 70 M266.5 53.5 L250 70" strokeWidth="1.8" strokeOpacity=".75" />
        <path d="M33.5 192 L50 186 M266.5 192 L250 186" strokeWidth="1.4" strokeOpacity=".5" />
      </g>
    </g>
  );
});

// Rounded posts + crossbar with cylinder shading.
export const GoalFrame = React.memo(function GoalFrame() {
  return (
    <g>
      <path d="M33.5 55 H266.5 V61 H33.5Z" fill="#0E0230" opacity=".25" />
      <ellipse cx="28" cy="195.5" rx="9" ry="2.6" fill="#0E0230" opacity=".5" />
      <ellipse cx="272" cy="195.5" rx="9" ry="2.6" fill="#0E0230" opacity=".5" />
      <path d="M28 194.5 V48 H272 V194.5" fill="none" stroke={O} strokeWidth="15.5" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M28 194.5 V48 H272 V194.5" fill="none" stroke="#F5F2FC" strokeWidth="11" strokeLinejoin="round" strokeLinecap="round" />
      <g strokeLinecap="round" fill="none">
        <path d="M31.6 54 V193.5 M275.6 51 V193.5" stroke="#B9ADD6" strokeWidth="3.6" />
        <path d="M34 51.6 H267" stroke="#B9ADD6" strokeWidth="3.4" />
        <path d="M24.6 50 V193 M268.6 55 V193" stroke="#fff" strokeWidth="2.2" />
        <path d="M30 44.6 H270" stroke="#fff" strokeWidth="2.2" />
        <path d="M24.6 60 V120" stroke="#fff" strokeWidth="3.2" opacity=".9" />
      </g>
    </g>
  );
});
