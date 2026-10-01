'use client';

import React from 'react';
import { CANDY } from '../candy/tokens';

// The goalkeeper — chibi SVG ported from the approved mock. Origin = between the
// feet, y up is negative. Every moving part is a `pk-<key>` element positioned
// by motion.js (CSS rules / keyframes):
//   pk-kw            whole body (hip translate + dive rotation + scale)
//   pk-legL/R        rigid leg + boot, rotating at the hip (jump tuck, smother splay)
//   pk-armUp*/Lo*    arm segments: a unit line M0 0 H1 under translate/rotate/scaleX,
//                    so stroke width never changes; pk-elb* round the elbow joint
//   pk-glvL/R        gloves; pk-pup pupils (eye tracking); grin/gasp + brows swap on a goal
// The idle bob is a CSS loop on the wrapper (off while kicking, off for reduced motion).

const O = CANDY.outline;
const SLEEVE = 'pk-sleeveG';

export const KEEPER_CSS = `
  .pk-bob { animation: pkBob 1.6s ease-in-out infinite; }
  @keyframes pkBob { 0%,100% { transform: translate(0, 0); } 25% { transform: translate(-1.6px, .6px); } 50% { transform: translate(0, 1.4px); } 75% { transform: translate(1.6px, .6px); } }
  @media (prefers-reduced-motion: reduce) { .pk-bob { animation: none !important; } }
`;

const GLOVE_SHAPES = [
  ['rect', { x: -10.5, y: -9, width: 21, height: 21, rx: 8 }],
  ['rect', { x: -10.6, y: -16.5, width: 5.6, height: 13, rx: 2.8 }],
  ['rect', { x: -5.4, y: -19, width: 5.6, height: 14, rx: 2.8 }],
  ['rect', { x: -0.2, y: -18.2, width: 5.6, height: 14, rx: 2.8 }],
  ['rect', { x: 5, y: -15.5, width: 5.4, height: 12, rx: 2.7 }],
  ['ellipse', { cx: 11, cy: 2.5, rx: 4.6, ry: 6.8, transform: 'rotate(-28 11 2.5)' }],
];
const gloveShapes = () => GLOVE_SHAPES.map(([T, a], i) => React.createElement(T, { key: i, ...a }));

// Left glove; thumb on the inner (+x) side. The right glove is mirrored.
function Glove() {
  return (
    <g>
      <g fill={O} stroke={O} strokeWidth="4.6" strokeLinejoin="round">{gloveShapes()}<rect x="-10" y="9" width="20" height="8.5" rx="3" /></g>
      <g fill="url(#pk-gloveG)">{gloveShapes()}</g>
      <rect x="-10" y="9" width="20" height="8.5" rx="3" fill="#F4F1FF" />
      <rect x="-10" y="13.5" width="20" height="2.4" fill="#FF7A1A" />
      <rect x="-6.5" y="-4" width="13" height="11" rx="4.5" fill="#6FB514" opacity=".55" />
      <path d="M-5 -6.5v-6M0.2 -7v-7.6M5.4 -6v-6" stroke="#4E8A0A" strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
      <path d="M-8.2 -12.5v3M-3 -15v3.5M2.2 -14.2v3.4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity=".75" />
    </g>
  );
}

// One leg (s = -1 left, +1 right): thigh + shin stroke, orange sock, white band, boot.
function Leg({ s }) {
  const leg = `M${-7 * s} -30 L${-15 * s} -18 L${-11 * s} -6`;
  return (
    <g className={s < 0 ? 'pk-legL' : 'pk-legR'}>
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d={leg} stroke={O} strokeWidth="12.5" />
        <path d={leg} stroke="url(#pk-skinL)" strokeWidth="8" />
        <path d={`M${-14.4 * s} -16 L${-11 * s} -6`} stroke="#FF7A1A" strokeWidth="8.4" />
        <path d={`M${-17.8 * s} -14.4 L${-11.2 * s} -16.2`} stroke="#fff" strokeWidth="2.2" />
      </g>
      <path d={s < 0 ? 'M-19.5 -1.5 Q-20.5 -9.5 -12 -9 Q-5 -8.5 -5.5 -2.5 Q-6 0.5 -12 0.5 Q-19 0.5 -19.5 -1.5Z' : 'M19.5 -1.5 Q20.5 -9.5 12 -9 Q5 -8.5 5.5 -2.5 Q6 0.5 12 0.5 Q19 0.5 19.5 -1.5Z'}
        fill="#2B2150" stroke={O} strokeWidth="2.4" />
      <path d={`M${-18.5 * s} -1 H${-7 * s}`} stroke="#A6F03A" strokeWidth="1.6" strokeLinecap="round" />
      <path d={`M${-16 * s} -6.5 Q${-13 * s} -8 ${-10 * s} -7`} stroke="#fff" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity=".5" />
    </g>
  );
}

// Arm layer: four unit segments + elbow / shoulder joints in one stroke style.
function ArmLayer({ width, stroke }) {
  const seg = (k) => <g key={k} className={`pk-${k}`}><path d="M0 0H1" stroke={stroke} strokeWidth={width} /></g>;
  const r = width / 2;
  return (
    <g fill="none">
      {seg('armUpL')}{seg('armLoL')}{seg('armUpR')}{seg('armLoR')}
      <circle className="pk-elbL" r={r} fill={stroke} />
      <circle className="pk-elbR" r={r} fill={stroke} />
      <circle cx="-15" cy="-56" r={r} fill={stroke} />
      <circle cx="15" cy="-56" r={r} fill={stroke} />
    </g>
  );
}

export default function Keeper({ bob }) {
  return (
    <>
      <ellipse className="pk-kshadow" rx="24" ry="4.2" fill="#0E0230" />
      <g className={bob ? 'pk-bob' : undefined}>
        <g className="pk-kw">
          <defs>
            {/* across the arm segment (its local y), so sleeves look round at any angle */}
            <linearGradient id={SLEEVE} gradientUnits="userSpaceOnUse" x1="0" y1="-3.8" x2="0" y2="3.8"><stop offset="0" stopColor="#FF9A3D" /><stop offset="1" stopColor="#F06410" /></linearGradient>
          </defs>
          <Leg s={-1} />
          <Leg s={1} />
          {/* shorts */}
          <path d="M-15.5 -40 L15.5 -40 L18.5 -24.5 Q11 -21.5 3.5 -24.5 L0 -29 L-3.5 -24.5 Q-11 -21.5 -18.5 -24.5 Z" fill="#33207A" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M-14.8 -38.5 L-17.2 -26 M14.8 -38.5 L17.2 -26" stroke="#A6F03A" strokeWidth="2.2" strokeLinecap="round" />
          {/* arms */}
          <ArmLayer width={12} stroke={O} />
          <ArmLayer width={7.6} stroke={`url(#${SLEEVE})`} />
          <g className="pk-armUpL"><path d="M0 1.8H1" stroke="#FFB070" strokeWidth="2" opacity=".75" /></g>
          <g className="pk-armUpR"><path d="M0 -1.8H1" stroke="#FFB070" strokeWidth="2" opacity=".75" /></g>
          {/* torso */}
          <path d="M-17 -60 Q0 -65 17 -60 Q20.5 -48 15.5 -36.5 Q0 -33 -15.5 -36.5 Q-20.5 -48 -17 -60 Z" fill="url(#pk-jerseyG)" stroke={O} strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M-16.5 -50 Q0 -45 16.8 -50 L17.4 -45.5 Q0 -40.5 -17.2 -45.5 Z" fill="#A6F03A" opacity=".95" />
          <path d="M-17.2 -45.5 Q0 -40.5 17.4 -45.5" stroke={O} strokeWidth="1" fill="none" opacity=".35" />
          <path d="M8 -61.5 Q16 -61 17 -60 Q20.5 -48 15.5 -36.5 L10 -35.4 Q15 -48 8 -61.5Z" fill="#C8460A" opacity=".45" />
          <path d="M-12.5 -58 Q-15 -50 -13 -42" stroke="#FFC08A" strokeWidth="2" fill="none" strokeLinecap="round" opacity=".8" />
          <path d="M-6.5 -62.8 L0 -56 L6.5 -62.8" fill="#33207A" stroke={O} strokeWidth="2" strokeLinejoin="round" />
          {/* head */}
          <g>
            <circle cx="-19" cy="-79" r="4.6" fill="url(#pk-skinG)" stroke={O} strokeWidth="2.2" />
            <circle cx="19" cy="-79" r="4.6" fill="url(#pk-skinG)" stroke={O} strokeWidth="2.2" />
            <circle cx="0" cy="-80" r="20" fill="url(#pk-skinG)" stroke={O} strokeWidth="2.6" />
            <path d="M-19.6 -84 Q-21 -102.5 0 -102.5 Q21 -102.5 19.6 -84 Q15 -92.5 0 -93 Q-15 -92.5 -19.6 -84 Z" fill="#1E1234" stroke={O} strokeWidth="2.2" strokeLinejoin="round" />
            <path d="M-9 -99.5 Q-2 -102 5 -100" stroke="#5B4A80" strokeWidth="2" fill="none" strokeLinecap="round" />
            <path d="M-19.8 -86.2 Q0 -97.2 19.8 -86.2" stroke={O} strokeWidth="6.4" fill="none" strokeLinecap="round" />
            <path d="M-19.8 -86.2 Q0 -97.2 19.8 -86.2" stroke="#A6F03A" strokeWidth="3.6" fill="none" strokeLinecap="round" />
            <ellipse cx="-7.2" cy="-80" rx="5.2" ry="6" fill="#fff" stroke={O} strokeWidth="1.7" />
            <ellipse cx="7.2" cy="-80" rx="5.2" ry="6" fill="#fff" stroke={O} strokeWidth="1.7" />
            <g className="pk-pup">
              <circle cx="-6.2" cy="-78.6" r="3" fill={O} />
              <circle cx="6.2" cy="-78.6" r="3" fill={O} />
            </g>
            <circle cx="-5.2" cy="-80" r="1.1" fill="#fff" /><circle cx="7.2" cy="-80" r="1.1" fill="#fff" />
            <path className="pk-browN" d="M-12.6 -88.5 L-3.6 -86.2 M3.6 -86.2 L12.6 -88.5" stroke={O} strokeWidth="2.8" strokeLinecap="round" />
            <path className="pk-browS" d="M-12.6 -90.5 L-3.6 -91.2 M3.6 -91.2 L12.6 -90.5" stroke={O} strokeWidth="2.8" strokeLinecap="round" />
            <path d="M-1.8 -73.8 Q0 -72.2 1.8 -73.8" stroke="#5A3320" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <circle cx="-13" cy="-72.5" r="3" fill="#FF6F5E" opacity=".45" /><circle cx="13" cy="-72.5" r="3" fill="#FF6F5E" opacity=".45" />
            <path className="pk-grin" d="M-7.5 -69.5 Q0 -60.5 7.5 -69.5 Q0 -67.2 -7.5 -69.5Z" fill="#fff" stroke={O} strokeWidth="1.9" strokeLinejoin="round" />
            <ellipse className="pk-gasp" cx="0" cy="-66.5" rx="3.6" ry="4.4" fill="#5A1030" stroke={O} strokeWidth="1.9" />
          </g>
          {/* gloves */}
          <g className="pk-glvL"><Glove /></g>
          <g className="pk-glvR"><g transform="scale(-1 1)"><Glove /></g></g>
        </g>
      </g>
    </>
  );
}
