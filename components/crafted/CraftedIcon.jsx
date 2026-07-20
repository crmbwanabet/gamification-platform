'use client';

import React from 'react';
import { GLOW } from './tokens';

/**
 * Renders a currency/badge icon from /public/ui/icons with an optional
 * color-matched glow. Works with SVG placeholders today and Spline/3D PNG
 * exports later — just drop e.g. coin.png in and pass ext="png".
 *
 * Props:
 *  - name   filename without extension, e.g. "coin" -> /ui/icons/coin.svg
 *  - ext    "svg" (default) | "png" | "webp"
 *  - size   px (default 44)
 *  - glow   key of GLOW ("gold"|"magenta"|"cyan"|"violet"|"green") or a CSS color
 *  - alt    accessibility label
 */
export default function CraftedIcon({
  name,
  ext = 'svg',
  size = 44,
  glow,
  alt = '',
  className = '',
  style = {},
}) {
  const glowColor = glow ? GLOW[glow] || glow : null;
  const filter = glowColor
    ? `drop-shadow(0 2px 3px rgba(0,0,0,.5)) drop-shadow(0 0 9px ${glowColor})`
    : 'drop-shadow(0 2px 3px rgba(0,0,0,.5))';
  return (
    <img
      src={`/ui/icons/${name}.${ext}`}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ display: 'block', filter, ...style }}
    />
  );
}
