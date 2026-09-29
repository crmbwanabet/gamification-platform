'use client';

import React from 'react';
import CandyButton from './CandyButton';

// Compact candy button for stake chips: tighter radius + text, shares a row.
export default function CandyChip({ style, ...props }) {
  return <CandyButton {...props} style={{ flex: 1, minWidth: 0, padding: 0, borderRadius: 14, fontSize: 22, ...style }} />;
}
