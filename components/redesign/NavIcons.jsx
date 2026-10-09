'use client';

import React from 'react';

/*
 * Nav icons for the candy shell (design "A · Full candy", 2026-10-09):
 * bold rounded line drawings in currentColor, so the active tab (white on the
 * raised violet candy button) and the idle tabs (dimmed white) share one set.
 */

const ICONS = {
  home: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  missions: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  store: (
    <>
      <path d="M5 8h14l-1 12H6z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
};

/** <NavIcon name="home|missions|store" size={24} /> */
export default function NavIcon({ name, size = 24, style }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      style={{ display: 'block', flex: 'none', ...style }}>
      {icon}
    </svg>
  );
}
