'use client';

import React from 'react';
import { CANDY } from '../candy/tokens';

// The lottery ball machine: a glass dome of candy balls on a red pedestal with
// a gold band of bulbs, and a glass chute curving out to the right where the
// drawn balls roll onto the tray (the tray + flying balls are HTML, drawn by
// NumbersGame on top of this SVG). Fixed 96×104 px: coordinates are stage px,
// so the game can aim the balls at CHUTE_PATH without measuring.
// `drawing` swirls and tumbles the balls and blinks the bulbs; idle they bob.
// Reduced motion: everything still.

export const MACH_W = 96;
export const MACH_H = 104;
// Where a drawn ball travels through the chute (stage px) before the tray
export const CHUTE_PATH = [[67, 57], [79, 68], [86, 79], [96, 86]];
export const RAIL_Y = 86;

const O = CANDY.outline;
const CX = 46, CY = 40, R = 31;
const DOME_BALLS = [
  [34, 60, 0], [48, 62, 1], [61, 58, 2], [27, 49, 3], [41, 51, 4], [55, 49, 5], [66, 45, 0], [35, 38, 2], [50, 37, 3], [43, 26, 1],
];
const SHELLS = [
  ['#FF9AB5', '#FF3D6E', '#B3123F'], ['#FFD47A', '#FF9A1A', '#B35E00'], ['#94F070', '#3FCB2A', '#21800F'],
  ['#90C6FF', '#2E8BFF', '#1550B3'], ['#E0B3FF', '#A43BE8', '#6A1CA3'], ['#FFF09A', '#FFD21F', '#C98A00'],
];

export const MACHINE_CSS = `
  .ln-mach { overflow: visible; transform-origin: 46px 102px; }
  .ln-swirl { transform-box: view-box; transform-origin: ${CX}px ${CY}px; }
  .ln-tb { transform-box: fill-box; }
  .ln-idle .ln-tb { animation: lnBob 2.6s ease-in-out infinite; }
  .ln-on .ln-swirl { animation: lnSwirl 1.05s linear infinite; }
  .ln-on .ln-tb0 { animation: lnTb0 .42s ease-in-out infinite alternate; }
  .ln-on .ln-tb1 { animation: lnTb1 .5s ease-in-out infinite alternate; }
  .ln-on .ln-tb2 { animation: lnTb2 .37s ease-in-out infinite alternate; }
  .ln-on .ln-tb3 { animation: lnTb3 .55s ease-in-out infinite alternate; }
  .ln-on .ln-bulb { animation: lnBlink .36s steps(1) infinite; }
  .ln-on .ln-bulb:nth-child(even) { animation-delay: .18s; }
  @keyframes lnBob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-1.4px) } }
  @keyframes lnSwirl { to { transform: rotate(360deg) } }
  @keyframes lnTb0 { 0% { transform: translate(0, 0) } 50% { transform: translate(-7px, -15px) } 100% { transform: translate(6px, -9px) } }
  @keyframes lnTb1 { 0% { transform: translate(0, 0) } 50% { transform: translate(8px, -12px) } 100% { transform: translate(-5px, -18px) } }
  @keyframes lnTb2 { 0% { transform: translate(0, -4px) } 50% { transform: translate(-9px, 6px) } 100% { transform: translate(7px, -12px) } }
  @keyframes lnTb3 { 0% { transform: translate(2px, 0) } 50% { transform: translate(-4px, -17px) } 100% { transform: translate(9px, 4px) } }
  @keyframes lnBlink { 0% { fill: #FFF6C2 } 50% { fill: #FF5C8A } }
  @media (prefers-reduced-motion: reduce) {
    .ln-idle .ln-tb, .ln-on .ln-swirl, .ln-on .ln-tb0, .ln-on .ln-tb1, .ln-on .ln-tb2, .ln-on .ln-tb3, .ln-on .ln-bulb { animation: none; }
  }
`;

const tube = 'M64 55 Q78 64 84 76 Q88 86 98 86';

export default function Machine({ drawing, svgRef }) {
  return (
    <svg ref={svgRef} className={`ln-mach ${drawing ? 'ln-on' : 'ln-idle'}`} width={MACH_W} height={MACH_H} viewBox={`0 0 ${MACH_W} ${MACH_H}`}
      aria-hidden style={{ position: 'absolute', left: 0, top: 0, display: 'block' }}>
      <defs>
        <linearGradient id="lnBase" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FF6F98" /><stop offset=".5" stopColor="#E8265A" /><stop offset="1" stopColor="#A3123F" /></linearGradient>
        <linearGradient id="lnGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF09A" /><stop offset=".55" stopColor="#FFD21F" /><stop offset="1" stopColor="#E0A300" /></linearGradient>
        <radialGradient id="lnGlass" cx=".36" cy=".28" r=".8">
          <stop offset="0" stopColor="#fff" stopOpacity=".34" /><stop offset=".45" stopColor="#D9C8FF" stopOpacity=".1" /><stop offset="1" stopColor="#8E5CF0" stopOpacity=".32" />
        </radialGradient>
        <radialGradient id="lnInside" cx=".5" cy=".55" r=".6"><stop offset="0" stopColor="#4A1C98" /><stop offset="1" stopColor="#1E0647" /></radialGradient>
        {SHELLS.map(([l, f, d], i) => (
          <radialGradient key={i} id={`lnB${i}`} cx=".34" cy=".3" r=".75"><stop offset="0" stopColor={l} /><stop offset=".5" stopColor={f} /><stop offset="1" stopColor={d} /></radialGradient>
        ))}
        <clipPath id="lnDomeClip"><circle cx={CX} cy={CY} r={R - 1.5} /></clipPath>
      </defs>

      {/* floor shadow */}
      <ellipse cx="46" cy="102.5" rx="34" ry="2.6" fill="rgba(8,0,24,.45)" />

      {/* pedestal */}
      <path d="M24 67 H68 L77 97 Q78.5 102 73.5 102 H18.5 Q13.5 102 15 97 Z" fill="url(#lnBase)" stroke={O} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M26.5 70.5 L19.5 95" stroke="rgba(255,255,255,.45)" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M19.4 79 H72.6 L74.6 87.5 H17.4 Z" fill="url(#lnGold)" stroke={O} strokeWidth="2" strokeLinejoin="round" />
      <g>
        {[25, 35.5, 46, 56.5, 67].map((x) => <circle key={x} className="ln-bulb" cx={x} cy="83.3" r="2.3" fill="#FFF6C2" stroke={O} strokeWidth="1" />)}
      </g>
      <path d="M46 90.6 l1.9 3.8 4.2 .6 -3 3 .7 4.2 -3.8 -2 -3.8 2 .7 -4.2 -3 -3 4.2 -.6 Z" fill={CANDY.gold} stroke={O} strokeWidth="1.2" strokeLinejoin="round" transform="translate(0 -1.6) scale(1)" />

      {/* chute (glass tube) — starts behind the dome */}
      <path d={tube} fill="none" stroke={O} strokeWidth="19" />
      <path d={tube} fill="none" stroke="#3A1380" strokeWidth="14.4" />
      <path d={tube} fill="none" stroke="rgba(214,196,255,.32)" strokeWidth="14.4" />
      <path d="M66 50.5 Q80.5 60 87 73" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2.2" strokeLinecap="round" />

      {/* collar */}
      <ellipse cx="46" cy="67.5" rx="25" ry="5.6" fill="url(#lnGold)" stroke={O} strokeWidth="2.4" />

      {/* dome: dark inside, tumbling balls, glass on top */}
      <circle cx={CX} cy={CY} r={R} fill="url(#lnInside)" />
      <g clipPath="url(#lnDomeClip)">
        <g className="ln-swirl">
          {DOME_BALLS.map(([x, y, c], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <g className={`ln-tb ln-tb${i % 4}`} style={{ animationDelay: `${(i * 0.13).toFixed(2)}s` }}>
                <circle r="7.4" fill={`url(#lnB${c})`} stroke={O} strokeWidth="1.5" />
                <circle r="3.4" fill="#fff" opacity=".92" />
                <ellipse cx="-2.6" cy="-3.6" rx="2.1" ry="1.3" fill="#fff" opacity=".75" transform="rotate(-30 -2.6 -3.6)" />
              </g>
            </g>
          ))}
        </g>
      </g>
      <circle cx={CX} cy={CY} r={R} fill="url(#lnGlass)" stroke={O} strokeWidth="3" />
      <circle cx={CX} cy={CY} r={R - 3.2} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.2" />
      <path d="M24.5 31 A23 23 0 0 1 37 17.5" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="4" strokeLinecap="round" />
      <circle cx="23" cy="38" r="1.9" fill="rgba(255,255,255,.8)" />
      <path d="M66 51 A23 23 0 0 1 58 59" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2.2" strokeLinecap="round" />

      {/* crown knob */}
      <ellipse cx="46" cy="10.2" rx="8.6" ry="3.6" fill="url(#lnGold)" stroke={O} strokeWidth="2.2" />
      <circle cx="46" cy="5.2" r="3.8" fill="url(#lnGold)" stroke={O} strokeWidth="2" />
      <circle cx="44.8" cy="4" r="1.1" fill="#fff" />
    </svg>
  );
}
