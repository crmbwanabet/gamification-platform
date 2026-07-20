'use client';

import React from 'react';
import { label } from '@/lib/njuka/engine.mjs';
import { C } from '@/components/redesign/tokens';
import { useFlyFrom, useFlipIn } from './anim';

// Njuka playing cards.
// Front: white, rank+suit corner index (top-left, mirrored bottom-right) with a
// large center suit glyph — corner indices stay legible when cards overlap or
// shrink (the poker-app standard). Back: matte black, thin gold frame, bwanabet
// wordmark (the logo PNG has a black background, so it melts into the card).

const RED = '#c0202f';
const INK = '#191922';

function Corner({ rank, suit, red, w, flip }) {
  return (
    <div style={{
      position: 'absolute', top: w * 0.055, left: w * 0.07, lineHeight: 1,
      textAlign: 'center', color: red ? RED : INK,
      transform: flip ? 'rotate(180deg)' : 'none',
      ...(flip ? { top: 'auto', left: 'auto', bottom: w * 0.055, right: w * 0.07 } : {}),
    }}>
      <div style={{ fontSize: Math.max(9, w * 0.22), fontWeight: 800 }}>{rank}</div>
      <div style={{ fontSize: Math.max(8, w * 0.19), marginTop: 1 }}>{suit}</div>
    </div>
  );
}

export function CardBack({ w }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 'inherit', background: '#0b0b0e',
      border: '1px solid #000', overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        position: 'absolute', inset: Math.max(2, w * 0.06),
        border: `1px solid rgba(230,173,74,.75)`, borderRadius: Math.max(3, w * 0.08),
      }} />
      {w >= 30
        ? <img src="/images/bwanabet-logo.png" alt="" draggable={false}
            style={{ width: '78%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }} />
        : <div style={{ width: '55%', height: 2, background: 'rgba(230,173,74,.75)' }} />}
    </div>
  );
}

export function CardFront({ card, w }) {
  const red = card && (card.s === '♥' || card.s === '♦');
  const rank = card ? label(card.r) : '';
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 'inherit', background: '#fdfcf7',
      border: '1px solid rgba(0,0,0,.18)', color: red ? RED : INK,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {card && w >= 34 && <>
        <Corner rank={rank} suit={card.s} red={red} w={w} />
        <Corner rank={rank} suit={card.s} red={red} w={w} flip />
        <div style={{ fontSize: w * 0.5, lineHeight: 1, marginTop: w * 0.04 }}>{card.s}</div>
      </>}
      {card && w < 34 && (
        <div style={{ fontSize: w * 0.52, fontWeight: 800, lineHeight: 1 }}>{rank}<span style={{ fontSize: w * 0.4 }}>{card.s}</span></div>
      )}
    </div>
  );
}

// The one card component. Faces are stacked with backface-visibility so a
// mounted card can 3D-flip from back to front (flipKey) and/or fly in from a
// source element (flyFrom + flyKey). hidden=true shows the bwanabet back.
export function NjukaCard({
  card, w = 56, hidden, tappable, picked, glow, outline, onClick,
  onPointerDown, onPointerMove, onPointerUp,
  flipKey = null, flyFrom = null, flyKey = null, flyDelay = 0, style,
}) {
  const h = Math.round(w * 1.45);
  const flyRef = useFlyFrom(flyFrom, flyFrom ? flyKey : null, { delay: flyDelay, spin: 6 });
  const flipRef = useFlipIn(flipKey);
  return (
    <div ref={flyRef} onClick={onClick}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      style={{
      width: w, height: h, flex: 'none', position: 'relative', perspective: 600,
      cursor: (tappable || onClick) ? 'pointer' : 'default',
      transform: picked ? 'translateY(-8px)' : 'none', transition: 'transform .12s, box-shadow .25s',
      borderRadius: Math.max(5, Math.round(w * 0.12)),
      outline: picked ? '3px solid #4da6ff' : outline ? `3px solid ${outline}` : tappable ? `2px solid ${C.gold}` : 'none',
      // steady glow for actionable states — deliberately NOT animated (no flashing)
      boxShadow: glow ? `0 0 18px 5px ${glow}66, 0 3px 8px rgba(0,0,0,.4)` : '0 3px 8px rgba(0,0,0,.4)',
      userSelect: 'none',
      ...style,
    }}>
      <div ref={flipRef} style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        transformStyle: 'preserve-3d',
      }}>
        <div className="njk-flip-front" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', backfaceVisibility: 'hidden' }}>
          {hidden ? <CardBack w={w} /> : <CardFront card={card} w={w} />}
        </div>
        <div className="njk-flip-back" style={{ position: 'absolute', inset: 0, borderRadius: 'inherit', backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
          <CardBack w={w} />
        </div>
      </div>
    </div>
  );
}
