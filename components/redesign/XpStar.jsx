'use client';
import React from 'react';

// THE XP icon (owner pick 2026-10-21, "Lettered star"): a light-blue star with
// XP written on it, public/ui/xp-star.svg. Every XP icon in the app is this
// one: inline icons render <XpStar>, DOM/canvas effects use XP_STAR_SRC.
// XP amounts shown as a prize read in XP_BLUE; gold stays for coins.
// Below ~16 px the letters fill in, which is accepted.
export const XP_STAR_SRC = '/ui/xp-star.svg';
export const XP_BLUE = '#7FD8FF';
/** Fill of the stage (XP) bars: the star's own light-blue gradient, so the stars land in a bar of their colour. */
export const XP_BAR = 'linear-gradient(180deg, #C9F2FF, #7FD8FF 45%, #3DB5F0)';

/** The XP star. Decorative (aria-hidden) unless `label` is given. */
export default function XpStar({ size = 20, label = null, className, style }) {
  return (
    <img src={XP_STAR_SRC} width={size} height={size} draggable={false}
      alt={label || ''} aria-hidden={label ? undefined : true} className={className}
      style={{ display: 'inline-block', flex: 'none', verticalAlign: 'middle', objectFit: 'contain', ...style }} />
  );
}

/** "[star] +20 XP" in XP blue: the XP part of a prize line. */
export function XpAmount({ children, size = 18, gap = 5, style, className }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap, color: XP_BLUE, whiteSpace: 'nowrap', ...style }}>
      <XpStar size={size} />{children}
    </span>
  );
}
