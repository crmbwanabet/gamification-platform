'use client';

import React from 'react';

/**
 * Glossy chamfered action button with a gold bezel.
 *
 * Buttons are the one piece CSS handles well (convex gloss + chamfer + glow),
 * so this stays code-based. If you later have a button art asset, swap the
 * inner face for a <NineSliceFrame src=... fill /> instead.
 *
 * Props:
 *  - variant "magenta" | "cyan"
 *  - children  label
 *  - ...rest   passed to <button> (onClick, etc.)
 */
const FACES = {
  magenta: {
    face: 'linear-gradient(180deg,#ffb4ff,#d030d0 46%,#7d1a7d)',
    color: '#ffffff',
    txtShadow: '0 2px 3px rgba(60,0,60,.55)',
    glow: 'rgba(208,48,208,.5)',
  },
  cyan: {
    face: 'linear-gradient(180deg,#d6fbff,#22d3ee 46%,#0a6675)',
    color: '#053038',
    txtShadow: '0 1px 1px rgba(255,255,255,.45)',
    glow: 'rgba(34,211,238,.5)',
  },
};

const CHAMFER_OUT =
  'polygon(15px 0,calc(100% - 15px) 0,100% 15px,100% calc(100% - 15px),calc(100% - 15px) 100%,15px 100%,0 calc(100% - 15px),0 15px)';
const CHAMFER_IN =
  'polygon(11px 0,calc(100% - 11px) 0,100% 11px,100% calc(100% - 11px),calc(100% - 11px) 100%,11px 100%,0 calc(100% - 11px),0 11px)';

export default function CraftedButton({ variant = 'magenta', children, style = {}, ...rest }) {
  const f = FACES[variant] || FACES.magenta;
  return (
    <button
      {...rest}
      style={{
        border: 0,
        padding: 6,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'stretch',
        background: 'linear-gradient(158deg,#fff0c2,#a9760f 55%,#ffdf6b)',
        clipPath: CHAMFER_OUT,
        boxShadow: `0 7px 16px rgba(0,0,0,.55), 0 0 28px ${f.glow}, inset 0 2px 1px rgba(255,255,255,.6)`,
        ...style,
      }}
    >
      <span
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 60,
          padding: '0 22px',
          clipPath: CHAMFER_IN,
          background: `linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,0) 50%), ${f.face}`,
          boxShadow: 'inset 0 3px 3px rgba(255,255,255,.55), inset 0 -10px 22px rgba(0,0,0,.32)',
          fontFamily: 'var(--font-display, system-ui, sans-serif)',
          fontSize: 24,
          letterSpacing: 1.5,
          color: f.color,
          textShadow: f.txtShadow,
        }}
      >
        {children}
      </span>
    </button>
  );
}
