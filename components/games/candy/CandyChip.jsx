'use client';

import React from 'react';
import CandyButton from './CandyButton';
import { CANDY, outlineShadow } from './tokens';

// Compact candy button for stake chips: tighter radius, outlined number with
// three small gold dots under it (casino-chip look), shares a row.
// Always full colour; only `disabled` (unaffordable) greys it out.
export default function CandyChip({ style, children, disabled, ...props }) {
  return (
    <CandyButton {...props} disabled={disabled}
      style={{ flex: 1, minWidth: 0, padding: 0, borderRadius: 14, fontSize: 25, gap: 5, ...style }}>
      <span style={{ textShadow: disabled ? 'none' : outlineShadow(2, CANDY.outline, 2) }}>{children}</span>
      <span aria-hidden style={{ display: 'flex', gap: 5 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: disabled ? 'rgba(255,255,255,.28)' : CANDY.gold,
            boxShadow: disabled ? 'none' : `0 0 0 1px ${CANDY.outline}`,
          }} />
        ))}
      </span>
    </CandyButton>
  );
}
