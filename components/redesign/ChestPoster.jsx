// Still image of the 3D treasure chest (captured from TreasureChest3D's own first frame, 2x, transparent).
// Shown while three.js loads and as the fallback if WebGL fails, so the hand-off to the live 3D chest is invisible.
// Regenerate both files if the chest model, camera or lighting in TreasureChest3D.jsx changes.
import React from 'react';

export const CHEST_POSTER_CLOSED = '/ui/reward/chest-closed.png';
export const CHEST_POSTER_OPEN = '/ui/reward/chest-open.png';

export default function ChestPoster({ mode = 'idle', style }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={mode === 'open' ? CHEST_POSTER_OPEN : CHEST_POSTER_CLOSED}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      fetchPriority="high"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none', userSelect: 'none', ...style }}
    />
  );
}
