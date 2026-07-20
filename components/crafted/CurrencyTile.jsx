'use client';

import React from 'react';
import CraftedIcon from './CraftedIcon';

/**
 * A currency tile: the same crafted beveled metal border used on the cards,
 * wrapping a DARK inset panel so the glossy 3D icon reads with full contrast
 * (the icons were designed on dark fields). A subtle value pill sits at the
 * bottom. No plasticky bright-panel fills — the border carries the craft.
 *
 * Props:
 *  - color   "gold" | "magenta" | "cyan" | "violet" | "green"  (border theme)
 *  - icon    CraftedIcon name, e.g. "coin"
 *  - iconExt "png" (default, 3D renders) | "svg"
 *  - label   value text in the bottom pill (e.g. "1,356")
 */

const THEME = {
  gold:    { hi: '#ffe9ad', mid: '#d8a64e', lo: '#9c6f16', ol: '#5e3f06', glow: 'gold' },
  magenta: { hi: '#f6a6f6', mid: '#d23ad2', lo: '#7a1d7a', ol: '#420f42', glow: 'magenta' },
  cyan:    { hi: '#9aeefa', mid: '#22c3da', lo: '#10707f', ol: '#063b44', glow: 'cyan' },
  violet:  { hi: '#cfa6f7', mid: '#9a52e6', lo: '#4a1d8a', ol: '#2a1059', glow: 'violet' },
  green:   { hi: '#9bf5c2', mid: '#2fc46e', lo: '#147a3a', ol: '#0a4a24', glow: 'green' },
};

export default function CurrencyTile({ color = 'gold', icon, iconExt = 'png', label }) {
  const t = THEME[color] || THEME.gold;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 16,
        padding: 4,
        background: `linear-gradient(180deg, ${t.hi}, ${t.mid} 52%, ${t.lo})`,
        boxShadow: `0 5px 11px rgba(0,0,0,.5), inset 0 1.5px 0 rgba(255,255,255,.7), inset 0 -2px 4px rgba(0,0,0,.4), 0 0 0 1px ${t.ol}`,
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          padding: '11px 9px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 9,
          overflow: 'hidden',
          background: 'radial-gradient(125% 100% at 50% 0%, #241e40, #0f0b1c 80%)',
          boxShadow: 'inset 0 2px 7px rgba(0,0,0,.6), inset 0 0 0 1px rgba(0,0,0,.45)',
        }}
      >
        {/* faint accent sheen from the top so the dark panel isn't dead-flat */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, height: '46%',
            background: `linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,0))`,
            pointerEvents: 'none',
          }}
        />
        <CraftedIcon name={icon} ext={iconExt} glow={t.glow} size={52} alt={`${label} ${color}`} style={{ position: 'relative' }} />
        <span
          style={{
            position: 'relative',
            fontFamily: 'var(--font-mono, monospace)',
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '.02em',
            color: '#f6f2ff',
            width: '100%',
            textAlign: 'center',
            padding: '4px 10px',
            borderRadius: 9,
            background: 'linear-gradient(180deg, #181122, #0a0712)',
            boxShadow: `inset 0 1px 0 rgba(255,255,255,.08), inset 0 2px 5px rgba(0,0,0,.7), 0 0 0 1px ${t.ol}`,
            textShadow: '0 1px 2px rgba(0,0,0,.8)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
