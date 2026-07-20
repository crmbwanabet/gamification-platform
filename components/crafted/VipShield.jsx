'use client';

import React from 'react';

/**
 * Gold VIP shield centerpiece (inline SVG, crisp at any size).
 * Props: tier (e.g. "Tier 7"), label (default "VIP"), width
 */
export default function VipShield({ tier = 'Tier 7', label = 'VIP', width = 132 }) {
  return (
    <svg
      width={width}
      height={width * (104 / 132)}
      viewBox="0 0 150 118"
      style={{
        display: 'block',
        filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.6)) drop-shadow(0 0 16px rgba(245,197,66,.4))',
      }}
    >
      <defs>
        <linearGradient id="vipsh" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9ad" />
          <stop offset=".5" stopColor="#e3bb55" />
          <stop offset="1" stopColor="#a9760f" />
        </linearGradient>
      </defs>
      <path
        d="M14 24 Q14 12 26 12 L124 12 Q136 12 136 24 L136 64 Q136 92 75 112 Q14 92 14 64 Z"
        fill="url(#vipsh)"
        stroke="#7a5408"
        strokeWidth="2.5"
      />
      <path
        d="M22 28 Q22 20 30 20 L120 20 Q128 20 128 28 L128 62 Q128 86 75 103 Q22 86 22 62 Z"
        fill="#1a1024"
        stroke="#caa12e"
        strokeWidth="1.5"
      />
      <text x="75" y="60" style={{ fontFamily: 'var(--font-display)', fontWeight: 800 }} fontSize="34" fill="#ffe9ad" textAnchor="middle">
        {label}
      </text>
      <text x="75" y="82" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }} fontSize="15" fill="#c9b06a" textAnchor="middle">
        {tier}
      </text>
    </svg>
  );
}
