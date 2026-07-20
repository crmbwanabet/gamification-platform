'use client';

import React from 'react';

/**
 * A reusable crafted card BORDER — a beveled metal frame in a chosen accent
 * color, optional outer glow, optional title bar + close button, wrapping any
 * children (a game thumbnail image, store art, a stat block, etc.). The border
 * is the point: dimensional bevel + corner accents so framed images read as
 * crafted game cards, not flat boxes. Works as a div or a clickable button.
 *
 * Props:
 *  - color    "gold" | "magenta" | "cyan" | "blue" | "violet" | "green"
 *  - glow     true to add a colored outer glow (default false)
 *  - title    optional heading shown top-left
 *  - onClose  optional handler -> renders a round close (x) button top-right
 *  - panel    inner background CSS (default a dark panel; pass a gradient for
 *             colored panels like the magenta store). Set null for transparent.
 *  - pad      inner padding, px (default 14; use 0 to let an image bleed to the frame)
 *  - accents  show the bright corner-accent marks (default true)
 *  - as       'div' (default) | 'button' — render a clickable frame
 *  - onClick / className / style / ...rest  passed through to the outer element
 *  - children content/image to frame
 */

const THEME = {
  gold:    { hi: '#ffe9ad', mid: '#d8a64e', lo: '#9c6f16', ol: '#5e3f06', glow: '245,197,66' },
  magenta: { hi: '#f6a6f6', mid: '#d23ad2', lo: '#7a1d7a', ol: '#420f42', glow: '208,48,208' },
  cyan:    { hi: '#9aeefa', mid: '#22c3da', lo: '#10707f', ol: '#063b44', glow: '34,211,238' },
  blue:    { hi: '#9ab6ff', mid: '#3a5bd0', lo: '#1a2b78', ol: '#0e1644', glow: '70,110,240' },
  violet:  { hi: '#cfa6f7', mid: '#9a52e6', lo: '#4a1d8a', ol: '#2a1059', glow: '168,85,247' },
  green:   { hi: '#9bf5c2', mid: '#2fc46e', lo: '#147a3a', ol: '#0a4a24', glow: '70,224,138' },
};

const DARK_PANEL = 'radial-gradient(130% 110% at 50% 0%, #241e40, #100c1d 78%)';

export default function CraftedCardFrame({
  color = 'gold',
  glow = false,
  title,
  onClose,
  panel = DARK_PANEL,
  pad = 14,
  accents = true,
  as: Tag = 'div',
  className = '',
  style = {},
  children,
  ...rest
}) {
  const t = THEME[color] || THEME.gold;
  const outer = glow
    ? `0 6px 16px rgba(0,0,0,.55), 0 0 22px rgba(${t.glow},.55), 0 0 0 1px ${t.ol}`
    : `0 6px 14px rgba(0,0,0,.5), 0 0 0 1px ${t.ol}`;
  const isButton = Tag === 'button';
  return (
    <Tag
      className={className}
      style={{
        position: 'relative',
        borderRadius: 16,
        padding: 4,
        background: `linear-gradient(180deg, ${t.hi}, ${t.mid} 50%, ${t.lo})`,
        boxShadow: `${outer}, inset 0 1.5px 0 rgba(255,255,255,.7), inset 0 -2px 4px rgba(0,0,0,.4)`,
        ...(isButton ? { border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left', width: '100%', display: 'block' } : {}),
        ...style,
      }}
      {...rest}
    >
      {accents && [
        { top: 4, left: 4 }, { top: 4, right: 4 }, { bottom: 4, left: 4 }, { bottom: 4, right: 4 },
      ].map((pos, i) => (
        <span
          key={i}
          style={{
            position: 'absolute', width: 9, height: 9, zIndex: 4, ...pos,
            borderTop: i < 2 ? '2px solid rgba(255,255,255,.85)' : 'none',
            borderBottom: i >= 2 ? '2px solid rgba(255,255,255,.85)' : 'none',
            borderLeft: i % 2 === 0 ? '2px solid rgba(255,255,255,.85)' : 'none',
            borderRight: i % 2 === 1 ? '2px solid rgba(255,255,255,.85)' : 'none',
            borderRadius: 3,
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          background: panel || 'transparent',
          boxShadow: 'inset 0 2px 6px rgba(0,0,0,.55), inset 0 0 0 1px rgba(0,0,0,.4)',
          padding: pad,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {(title || onClose) && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, position: 'relative', zIndex: 2 }}>
            {title && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: '#f6f2ff', textShadow: '0 2px 4px rgba(0,0,0,.6)' }}>
                {title}
              </span>
            )}
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close"
                style={{
                  marginLeft: 'auto', width: 24, height: 24, borderRadius: '50%', cursor: 'pointer',
                  border: `1.5px solid ${t.mid}`, color: t.hi, background: 'rgba(0,0,0,.35)',
                  display: 'grid', placeItems: 'center', lineHeight: 0, padding: 0,
                  boxShadow: `0 0 8px rgba(${t.glow},.4), inset 0 1px 0 rgba(255,255,255,.2)`,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', zIndex: 1 }}>{children}</div>
      </div>
    </Tag>
  );
}
