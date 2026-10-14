'use client';

import React from 'react';

/**
 * PLACEHOLDER for the three.js treasure chest (built on another branch, replaced
 * at merge). Same contract: mode 'idle' | 'today' | 'open', size = CSS px width
 * of the box (height = size × 100/118). Draws a static SVG chest: closed for
 * idle/today (a light seam on today), lid up with coins inside for open.
 */
export default function TreasureChest3D({ mode = 'idle', size = 118 }) {
  const uid = React.useId().replace(/:/g, '');
  const id = (n) => `${n}-${uid}`;
  const open = mode === 'open';
  return (
    <svg viewBox="-1 0 120 100" width={size} height={Math.round(size * 100 / 118)} aria-hidden="true"
      style={{ display: 'block', overflow: 'visible', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,.55))' }}>
      <defs>
        <linearGradient id={id('w')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a3d17" /><stop offset=".55" stopColor="#5a2a0f" /><stop offset="1" stopColor="#3a1806" /></linearGradient>
        <linearGradient id={id('l')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a5524" /><stop offset=".5" stopColor="#6e3412" /><stop offset="1" stopColor="#4a1f08" /></linearGradient>
        <linearGradient id={id('m')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff4c0" /><stop offset=".35" stopColor="#f2c230" /><stop offset=".75" stopColor="#b07a08" /><stop offset="1" stopColor="#6e4500" /></linearGradient>
        <radialGradient id={id('c')} cx=".4" cy=".35" r=".7"><stop offset="0" stopColor="#fff7c8" /><stop offset=".5" stopColor="#ffd21f" /><stop offset="1" stopColor="#b47800" /></radialGradient>
        <radialGradient id={id('g')} cx=".5" cy=".6" r=".5"><stop offset="0" stopColor="#fff6c4" /><stop offset=".45" stopColor="#ffd21f" stopOpacity=".75" /><stop offset="1" stopColor="#ffb000" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="94" rx="50" ry="5" fill="#000" opacity=".45" />
      {open && (
        <g>
          <path d="M17 50 L23 10 Q60 3 97 10 L103 50 Z" fill="#3a1806" stroke="#2a1004" strokeWidth="2" />
          <path d="M23 10 Q60 3 97 10" stroke={`url(#${id('m')})`} strokeWidth="4" fill="none" />
          <ellipse cx="60" cy="40" rx="48" ry="26" fill={`url(#${id('g')})`} />
          <path d="M18 54 Q24 36 40 38 Q50 30 62 34 Q74 29 84 37 Q98 36 102 54 Z" fill={`url(#${id('c')})`} stroke="#9a6400" strokeWidth="1" />
          <g stroke="#9a6400" strokeWidth="1" fill={`url(#${id('c')})`}>
            <ellipse cx="36" cy="44" rx="7" ry="3" /><ellipse cx="52" cy="38" rx="7" ry="3" /><ellipse cx="70" cy="37" rx="7" ry="3" />
            <ellipse cx="85" cy="44" rx="7" ry="3" /><ellipse cx="61" cy="46" rx="7" ry="3" />
          </g>
        </g>
      )}
      <rect x="14" y="52" width="92" height="40" rx="3" fill={`url(#${id('w')})`} stroke="#1e0a02" strokeWidth="2" />
      <path d="M14 65.5 H106 M14 78.5 H106" stroke="#1e0a02" strokeWidth="1.6" />
      <rect x="25" y="52" width="9" height="40" fill={`url(#${id('m')})`} stroke="#5a3800" strokeWidth=".8" />
      <rect x="86" y="52" width="9" height="40" fill={`url(#${id('m')})`} stroke="#5a3800" strokeWidth=".8" />
      <rect x="12" y="86" width="96" height="7" rx="2" fill={`url(#${id('m')})`} stroke="#5a3800" strokeWidth=".8" />
      <rect x="12" y="51" width="96" height="5" rx="1.5" fill={`url(#${id('m')})`} stroke="#5a3800" strokeWidth=".8" />
      <path d="M50 54 H70 V66 Q70 74 60 77 Q50 74 50 66 Z" fill={`url(#${id('m')})`} stroke="#5a3800" strokeWidth="1.2" />
      <circle cx="60" cy="62.5" r="2.6" fill="#2a1500" />
      <path d="M58.8 63.5 h2.4 l.9 5.5 h-4.2 z" fill="#2a1500" />
      {!open && (
        <g>
          <path d="M12 54 L12 38 Q12 14 60 14 Q108 14 108 38 L108 54 Z" fill={`url(#${id('l')})`} stroke="#1e0a02" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 42 Q12 22 60 22 Q108 22 108 42" stroke="#1e0a02" strokeWidth="1.4" fill="none" />
          <path d="M25 50 V22 Q29 18 34 17 V50 Z M86 50 V17 Q91 18 95 22 V50 Z" fill={`url(#${id('m')})`} stroke="#5a3800" strokeWidth=".8" />
          <rect x="10" y="47" width="100" height="6" rx="2" fill={`url(#${id('m')})`} stroke="#5a3800" strokeWidth=".8" />
          <path d="M55 46 H65 V57 Q60 60 55 57 Z" fill={`url(#${id('m')})`} stroke="#5a3800" strokeWidth="1" />
          {mode === 'today' && <path d="M16 53.5 H104" stroke="#ffe680" strokeWidth="1.6" opacity=".8" />}
        </g>
      )}
    </svg>
  );
}
