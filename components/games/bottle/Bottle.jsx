'use client';

import React from 'react';
import { O, cid } from './geom';

// A plain green soda bottle lying on its side (no label, no brand), drawn
// along +x with its pivot at 0: base at -40, gold crown cap at the neck end
// (+51) — the neck is the pointer. motion.js sets the transforms every frame:
// #bt-bottle (the bottle), #bt-shadow, and #bt-ghost0..2 (motion-blur
// silhouettes trailing it while it spins fast) plus #bt-swoosh (speed arc).

export const GLASS = 'M-33 -12 H5 C14 -12 16 -4.8 23 -4.8 H44 V4.8 H23 C16 4.8 14 12 5 12 H-33 Q-40 12 -40 6 V-6 Q-40 -12 -33 -12Z';
const SIL = 'M-33 -12 H5 C14 -12 16 -4.8 23 -4.8 H51 V4.8 H23 C16 4.8 14 12 5 12 H-33 Q-40 12 -40 6 V-6 Q-40 -12 -33 -12Z';

export function BottleDefs() {
  return (
    <>
      <linearGradient id={cid('glass')} gradientUnits="userSpaceOnUse" x1="0" y1="-12" x2="0" y2="12">
        <stop offset="0" stopColor="#0E4A20" /><stop offset=".16" stopColor="#2E9A46" /><stop offset=".3" stopColor="#7BDB78" />
        <stop offset=".44" stopColor="#3FB257" /><stop offset=".78" stopColor="#1E7A36" /><stop offset="1" stopColor="#0B3A18" />
      </linearGradient>
      <linearGradient id={cid('cap')} gradientUnits="userSpaceOnUse" x1="0" y1="-6.6" x2="0" y2="6.6">
        <stop offset="0" stopColor="#FFF3B0" /><stop offset=".4" stopColor="#FFD21F" /><stop offset="1" stopColor="#B88400" />
      </linearGradient>
      <radialGradient id={cid('fanG')} gradientUnits="userSpaceOnUse" cx="150" cy="186" r="56">
        <stop offset=".25" stopColor="#9BE88E" stopOpacity="0" /><stop offset=".8" stopColor="#9BE88E" stopOpacity=".85" /><stop offset="1" stopColor="#C8F5B8" />
      </radialGradient>
      <radialGradient id={cid('glint')}><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
    </>
  );
}

export function BottleShadow() {
  return (
    <g id={cid('shadow')} aria-hidden>
      <path d={SIL} fill="#2A0A4F" opacity=".38" transform="scale(1.02 1.15)" />
    </g>
  );
}

export function Ghosts() {
  return (
    <g aria-hidden>
      <path id={cid('fan')} d="" fill={`url(#${cid('fanG')})`} opacity="0" />
      <path id={cid('swoosh')} d="" fill="none" stroke="#FFF6D0" strokeWidth="5" strokeLinecap="round" opacity="0" />
      {[0, 1, 2].map(k => (
        <g key={k} id={cid(`ghost${k}`)} opacity="0">
          <path d={SIL} fill={k ? '#5CC26A' : '#7BDB78'} />
        </g>
      ))}
    </g>
  );
}

export default function Bottle() {
  return (
    <g id={cid('bottle')} aria-hidden>
      <g id={cid('bottleInner')}>
        {/* glass */}
        <path d={GLASS} fill={`url(#${cid('glass')})`} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
        {/* thick glass base */}
        <path d="M-35 -10.6 Q-38.6 -10 -38.6 -5 V5 Q-38.6 10 -35 10.6" stroke="#0B3A18" strokeWidth="2.6" fill="none" opacity=".55" />
        {/* embossed rings near the base */}
        <path d="M-29 -11.5 V11.5 M-25.5 -11.5 V11.5" stroke="#9BE88E" strokeWidth=".9" opacity=".45" />
        {/* warm sun bounce on the lower edge */}
        <path d="M-32 9.6 H6 C12 9.6 15 4.5 21 3.4" stroke="#FFC46A" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".55" />
        {/* specular streaks */}
        <path d="M-31 -7 H3" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" opacity=".78" />
        <path d="M8 -7.4 Q13 -7.6 16 -4.6" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".6" />
        <path d="M25 -2.4 H40" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
        <circle cx="-34.5" cy="-6.5" r="2.6" fill={`url(#${cid('glint')})`} />
        {/* lip ring */}
        <rect x="41.5" y="-6" width="4.4" height="12" rx="1.8" fill="#4FBF62" stroke={O} strokeWidth="1.8" />
        {/* gold crown cap */}
        <path d="M45 -6.6 H50 Q52 -6.6 52 -4.6 V4.6 Q52 6.6 50 6.6 H45Z" fill={`url(#${cid('cap')})`} stroke={O} strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M47 -5.6 V5.6 M49.3 -5.6 V5.6" stroke="#B88400" strokeWidth=".9" opacity=".8" />
        <path d="M46 -4.6 H50.6" stroke="#FFF6D0" strokeWidth="1.1" strokeLinecap="round" />
      </g>
    </g>
  );
}
