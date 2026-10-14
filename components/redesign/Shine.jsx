'use client';

import React from 'react';

// Coin shine + sparkles (2026-10-14). CSS lives in app/globals.css
// (.bb-shine / .bb-sparkles); every animation stops under prefers-reduced-motion.

/**
 * An image with a diagonal light band sweeping across it every few seconds,
 * masked to the image's own shape. `className`/`style` go on the wrapper,
 * `imgClassName`/`imgStyle` on the <img>. `delay` (s) staggers the sweep,
 * `strength` (0..1) sets the band's brightness, `children` sit on top
 * (e.g. <Sparkles />).
 */
export function ShineImg({ src, alt = '', width, height, className = '', style, imgClassName, imgStyle, delay = 0, duration = 5, strength = 0.85, children }) {
  return (
    <span className={`bb-shine${className ? ' ' + className : ''}`}
      style={{ '--shine-src': `url(${src})`, '--shine-delay': `${delay}s`, '--shine-dur': `${duration}s`, '--shine-a': strength, ...style }}>
      <img src={src} alt={alt} width={width} height={height} className={imgClassName} style={imgStyle} />
      {children}
    </span>
  );
}

// Fixed star layouts (percent positions, size px, delay s) so renders are stable.
const LAYOUTS = [
  [[18, 22, 12, 0], [80, 16, 10, 0.9], [72, 74, 9, 1.7]],
  [[78, 20, 12, 0.4], [16, 60, 9, 1.3], [58, 86, 10, 2.1]],
  [[24, 14, 10, 0.8], [86, 52, 12, 0], [30, 80, 9, 1.6]],
];

/** A few twinkling 4-point stars over the parent (which must be positioned). */
export function Sparkles({ variant = 0, scale = 1 }) {
  const stars = LAYOUTS[variant % LAYOUTS.length];
  return (
    <span className="bb-sparkles" aria-hidden>
      {stars.map(([x, y, s, d], i) => (
        <i key={i} style={{ left: `${x}%`, top: `${y}%`, '--s': `${Math.round(s * scale)}px`, '--d': `${d + variant * 0.35}s` }} />
      ))}
    </span>
  );
}
