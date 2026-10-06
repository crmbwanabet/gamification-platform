'use client';

import React from 'react';
import { CANDY } from '../candy/tokens';

// Lottery-ball colours, one per grid row (1–5 red, 6–10 orange, 11–15 green,
// 16–20 blue) — the same colour on the grid tile and on the drawn ball, so a
// match reads at a glance.
export const BALL_COLORS = [
  { fill: '#FF3D6E', light: '#FF9AB5', dark: '#B3123F' },
  { fill: '#FF9A1A', light: '#FFD47A', dark: '#B35E00' },
  { fill: '#3FCB2A', light: '#94F070', dark: '#21800F' },
  { fill: '#2E8BFF', light: '#90C6FF', dark: '#1550B3' },
];
export const ballColor = (n) => BALL_COLORS[Math.min(3, Math.floor((n - 1) / 5))];

// Glossy candy lottery ball: coloured shell, chunky dark outline, white face
// with the number, a soft top-left shine. Pure CSS.
export default function LottoBall({ n, size = 28, lit = false, style, ...rest }) {
  const c = ballColor(n);
  const face = Math.round(size * 0.64);
  return (
    <span aria-hidden {...rest} style={{
      position: 'relative', display: 'grid', placeItems: 'center', boxSizing: 'border-box',
      width: size, height: size, borderRadius: '50%', flex: 'none',
      background: `radial-gradient(circle at 34% 28%, ${c.light} 0%, ${c.fill} 48%, ${c.dark} 100%)`,
      border: `2px solid ${CANDY.outline}`,
      boxShadow: lit
        ? `0 0 0 2.5px ${CANDY.gold}, 0 0 12px 3px rgba(255,210,31,.8), 0 2px 0 rgba(10,0,30,.5)`
        : '0 2px 0 rgba(10,0,30,.55)',
      ...style,
    }}>
      <span style={{
        width: face, height: face, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: 'radial-gradient(circle at 40% 32%, #fff 0%, #fff 55%, #E6DDF7 100%)',
        boxShadow: 'inset 0 -1.5px 0 rgba(42,10,79,.18)',
        fontFamily: CANDY.display, fontSize: Math.round(size * 0.46), lineHeight: 1, color: CANDY.outline,
        fontVariantNumeric: 'tabular-nums', letterSpacing: -.3,
      }}>{n}</span>
      <span style={{ position: 'absolute', left: '17%', top: '11%', width: '30%', height: '20%', borderRadius: '50%', background: 'rgba(255,255,255,.75)', transform: 'rotate(-30deg)', filter: 'blur(.4px)', pointerEvents: 'none' }} />
    </span>
  );
}
