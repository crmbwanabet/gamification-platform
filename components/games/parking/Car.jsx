'use client';

import React from 'react';

// A top-down car for Street Parking (from the approved Car design), nose UP,
// drawn CENTRED on (0, 0) in a 40 × 74 box so a parent can rotate it about its
// middle. kind: 'sedan' | 'hatch' | 'taxi' | 'bakkie' (pickup with mealie-meal
// sacks) | 'you' (the player's red car with yellow stripes and a spoiler).

const O = '#2A0A4F';
const GLASS = '#2E4A6E';

export default function Car({ kind = 'sedan', color = '#1E63E6' }) {
  const you = kind === 'you', taxi = kind === 'taxi', hatch = kind === 'hatch', bakkie = kind === 'bakkie';
  const body = you ? '#E3261E' : taxi ? '#F4F4F2' : color;
  const roofH = hatch ? 28 : bakkie ? 8 : 22;
  const rearTop = 27 + roofH + 1;
  const rearBot = rearTop + (hatch ? 9 : 8);
  const rearCurve = rearTop + (hatch ? 12 : 11);
  const sideEnd = bakkie ? 36 : hatch ? 56 : 50;
  return (
    <g transform="translate(-20 -37)">
      <rect x="5" y="6" width="36" height="70" rx="11" fill="rgba(0,0,0,.32)" />
      {[[-1.5, 11], [36.5, 11], [-1.5, 50], [36.5, 50]].map(([x, y]) => (
        <rect key={`${x}${y}`} x={x} y={y} width="5" height="13" rx="2" fill="#1A1A1A" stroke={O} strokeWidth="1.2" />
      ))}

      <path d="M9 1.5Q20 -0.5 31 1.5Q38 3.5 38 13V62Q38 71.5 30 72.5H10Q2 71.5 2 62V13Q2 3.5 9 1.5Z" fill={body} stroke={O} strokeWidth="2.4" />
      <path d="M5 12V62Q5 68 9 70" stroke="rgba(255,255,255,.35)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M35 12V62Q35 68 31 70" stroke="rgba(0,0,0,.18)" strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {you && <path d="M16.5 1V72.5M23.5 1V72.5" stroke="#FFD21F" strokeWidth="3.2" />}
      {taxi && (
        <g>
          <path d="M2.5 34H37.5" stroke="#3A8EDB" strokeWidth="5" />
          <path d="M2.5 37H37.5" stroke="#1A1A1A" strokeWidth="1.5" strokeDasharray="2 2" />
        </g>
      )}

      <rect x="9" y="0.6" width="22" height="2.6" rx="1.3" fill="#B8B8C4" stroke={O} strokeWidth="1" />
      <path d="M14 2V3.5M17 2V3.5M20 2V3.5M23 2V3.5M26 2V3.5" stroke="#4A4A54" strokeWidth="1" />
      <path d="M4.5 4.5Q6 2.5 9.5 2.5V6.5Q6 6.8 4.2 8Z" fill="#FFF4C8" stroke={O} strokeWidth="1.1" />
      <path d="M35.5 4.5Q34 2.5 30.5 2.5V6.5Q34 6.8 35.8 8Z" fill="#FFF4C8" stroke={O} strokeWidth="1.1" />
      <path d="M12 6Q12 12 10 15M28 6Q28 12 30 15" stroke="rgba(0,0,0,.22)" strokeWidth="1.2" fill="none" />

      <path d="M7 17Q20 12.5 33 17L31 26Q20 24 9 26Z" fill={GLASS} stroke={O} strokeWidth="1.6" />
      <path d="M10.5 18.5L17 16.4L12.5 24Z" fill="#9FD3F2" opacity=".85" />
      <path d="M19 15.8L21.5 15.6L17 24.6H15Z" fill="#CFEAF8" opacity=".5" />
      <rect x="-2" y="18" width="5.5" height="3.6" rx="1.4" fill={body} stroke={O} strokeWidth="1.1" />
      <rect x="36.5" y="18" width="5.5" height="3.6" rx="1.4" fill={body} stroke={O} strokeWidth="1.1" />

      <path d={`M4.8 26.5V${sideEnd}`} stroke={GLASS} strokeWidth="2.6" strokeLinecap="round" />
      <path d={`M35.2 26.5V${sideEnd}`} stroke={GLASS} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M3 37.5H5.8M34.2 37.5H37" stroke={O} strokeWidth="1.2" />

      <rect x="9" y="27" width="22" height={roofH} rx="4" fill="rgba(255,255,255,.16)" stroke="rgba(42,10,79,.45)" strokeWidth="1.2" />
      <path d={`M9 ${rearTop}H31L33 ${rearBot}Q20 ${rearCurve} 7 ${rearBot}Z`} fill={GLASS} stroke={O} strokeWidth="1.5" />
      <path d={`M11 ${rearTop + 1.5}L16 ${rearTop + 1.5}L12.5 ${rearTop + 6.5}Z`} fill="#9FD3F2" opacity=".55" />

      {kind === 'sedan' && (
        <g>
          <rect x="13" y="31" width="14" height="10" rx="2" fill="#1E2E48" stroke={O} strokeWidth="1.2" />
          <path d="M15 32.5L19 32.5L16 39Z" fill="#9FD3F2" opacity=".5" />
        </g>
      )}
      {taxi && (
        <g>
          <rect x="12" y="32" width="16" height="9" rx="2" fill="#FFD21F" stroke={O} strokeWidth="1.4" />
          <text x="20" y="39" textAnchor="middle" fill={O} fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="5.5">TAXI</text>
        </g>
      )}
      {you && <rect x="4" y="68.5" width="32" height="3.5" rx="1.5" fill="#1A1A1A" stroke={O} strokeWidth="1" />}
      {bakkie && (
        <g>
          <rect x="6" y="46" width="28" height="25" rx="2" fill="#3A3A44" stroke={O} strokeWidth="1.6" />
          <path d="M10 48V69M15 48V69M20 48V69M25 48V69M30 48V69" stroke="#4A4A54" strokeWidth="1.4" />
          <rect x="9" y="48" width="11" height="9" rx="3.5" fill="#E8DCC0" stroke={O} strokeWidth="1.2" />
          <path d="M11 52H18" stroke="#43C21A" strokeWidth="1.6" />
          <rect x="20" y="54" width="11" height="9" rx="3.5" fill="#E8DCC0" stroke={O} strokeWidth="1.2" />
          <path d="M22 58H29" stroke="#43C21A" strokeWidth="1.6" />
          <rect x="10" y="60" width="10" height="9" rx="3.5" fill="#D8C8A0" stroke={O} strokeWidth="1.2" />
        </g>
      )}

      <path d="M5 70.5Q6.5 72 10 72V68.6Q6.5 68.6 5 67.5Z" fill="#E3261E" stroke={O} strokeWidth="1" />
      <path d="M35 70.5Q33.5 72 30 72V68.6Q33.5 68.6 35 67.5Z" fill="#E3261E" stroke={O} strokeWidth="1" />
      <rect x="15" y="70.2" width="10" height="3" rx=".8" fill="#F4F1E8" stroke={O} strokeWidth=".8" />
    </g>
  );
}
