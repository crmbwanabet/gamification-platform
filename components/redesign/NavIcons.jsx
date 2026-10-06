'use client';

import React from 'react';

/*
 * Chunky candy-style nav icons (inline SVG, 24x24 grid, readable at 24px),
 * drawn with the dark-plum outline the candy games use.
 * Active = full colour + drop shadow; inactive = the same drawing, mostly
 * desaturated and dimmed, so each tab stays recognisable while the selected
 * one clearly pops.
 */

const INK = '#2a1440';

function HomeIcon() {
  return (
    <>
      {/* chimney */}
      <rect x="15.2" y="3.6" width="3.2" height="5.2" rx="0.8" fill="#d93a63" stroke={INK} strokeWidth="1.4" />
      {/* walls */}
      <path d="M5 11.2 V19.6 a1.6 1.6 0 0 0 1.6 1.6 H17.4 a1.6 1.6 0 0 0 1.6-1.6 V11.2 Z" fill="#ffd45c" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.9 18.4 H18.1 V19.6 a0.8 0.8 0 0 1-0.8 0.8 H6.7 a0.8 0.8 0 0 1-0.8-0.8 Z" fill="#f0a92e" />
      {/* door */}
      <path d="M10 21.2 V16.4 a2 2 0 0 1 4 0 V21.2 Z" fill="#8b5cf6" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {/* window */}
      <rect x="14.9" y="12.6" width="2.6" height="2.6" rx="0.6" fill="#7fe3ff" stroke={INK} strokeWidth="1.1" />
      {/* roof */}
      <path d="M2.4 12.2 L12 3.6 L21.6 12.2 a1.1 1.1 0 0 1-1.5 1.6 L12 6.8 L3.9 13.8 a1.1 1.1 0 0 1-1.5-1.6 Z" fill="#ff5b7f" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5.2 10.6 L11.6 5" stroke="rgba(255,255,255,.55)" strokeWidth="1.2" strokeLinecap="round" />
    </>
  );
}

function MissionsIcon() {
  return (
    <>
      {/* bullseye */}
      <circle cx="11" cy="13" r="8.8" fill="#ff4d6d" stroke={INK} strokeWidth="1.6" />
      <circle cx="11" cy="13" r="6" fill="#fff4f6" />
      <circle cx="11" cy="13" r="3.6" fill="#ff4d6d" />
      <circle cx="11" cy="13" r="1.7" fill="#ffd45c" stroke={INK} strokeWidth="0.9" />
      <path d="M4.8 9.4 a7 7 0 0 1 4-3.2" stroke="rgba(255,255,255,.7)" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      {/* arrow stuck in the centre */}
      <path d="M11 13 L19.2 4.8" stroke={INK} strokeWidth="3.8" strokeLinecap="round" />
      <path d="M11 13 L19.2 4.8" stroke="#8b5cf6" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M17.6 3.3 L18.3 6.2 L21.2 6.9 L22.4 3.9 a1 1 0 0 0-1.3-1.3 Z" fill="#35d6b5" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
    </>
  );
}

function StoreIcon() {
  return (
    <>
      {/* handle */}
      <path d="M8 10.4 V7.6 a4 4 0 0 1 8 0 V10.4" fill="none" stroke={INK} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M8 10.4 V7.6 a4 4 0 0 1 8 0 V10.4" fill="none" stroke="#ffd45c" strokeWidth="1.6" strokeLinecap="round" />
      {/* bag body */}
      <path d="M3.9 8.6 H20.1 L21.2 19.5 a1.9 1.9 0 0 1-1.9 2.1 H4.7 a1.9 1.9 0 0 1-1.9-2.1 Z" fill="#a46bff" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M3.5 18.4 H20.5 L20.6 19.5 a1 1 0 0 1-1 1.1 H4.4 a1 1 0 0 1-1-1.1 Z" fill="#7c45e0" />
      {/* handle rivets */}
      <circle cx="8" cy="10.6" r="1.05" fill="#ffd45c" stroke={INK} strokeWidth="0.8" />
      <circle cx="16" cy="10.6" r="1.05" fill="#ffd45c" stroke={INK} strokeWidth="0.8" />
      {/* star emblem */}
      <path d="M12.00 11.9 L13.03 14.48 L15.80 14.66 L13.66 16.44 L14.35 19.14 L12.00 17.65 L9.65 19.14 L10.34 16.44 L8.20 14.66 L10.97 14.48 Z" fill="#ffd45c" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M5.5 11 V15.4" stroke="rgba(255,255,255,.45)" strokeWidth="1.3" strokeLinecap="round" />
    </>
  );
}

const ICONS = { home: HomeIcon, missions: MissionsIcon, store: StoreIcon };

/** <NavIcon name="home|missions|store" active size={24} /> */
export default function NavIcon({ name, active = false, size = 24, style }) {
  const Icon = ICONS[name];
  if (!Icon) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      style={{
        display: 'block', overflow: 'visible',
        filter: active ? 'drop-shadow(0 2px 3px rgba(0,0,0,.35))' : 'grayscale(.7) brightness(.95)',
        opacity: active ? 1 : 0.72, transition: 'filter .2s ease, opacity .2s ease',
        ...style,
      }}>
      <Icon />
    </svg>
  );
}
