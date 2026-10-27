'use client';

import React from 'react';

// Road Crossing art, translated 1:1 from the owner-approved design
// (tower/project/Cross.dc.html). World units: 390 wide, 740 tall, y from the
// bottom: pavement 0–80, lanes 1–4 (64 each), the median 336–370, lanes 5–8,
// the market from 626. Everything is static SVG; motion is CSS (CROSS_CSS).

const O = '#2A0A4F'; // outline

export const WORLD_W = 390;
export const WORLD_H = 740;
export const LANE_H = 64;
// bottom edge of lane k (1..8): the median sits between lanes 4 and 5
export const laneBottom = (k) => 80 + (k - 1) * LANE_H + (k > 4 ? 34 : 0);

// [kind, colour, seconds per pass, delay] × 2 per lane (lanes 1–4 drive right, 5–8 left)
export const TRAFFIC = [
  [['car', '#F2F2F2', 3.6, 0], ['bus', '', 3.6, -1.9]],
  [['truck', '#E3261E', 5.2, -0.6], ['car', '#E8C547', 5.2, -3.1]],
  [['car', '#1E63E6', 3.0, -0.4], ['car', '#43C21A', 3.0, -1.8]],
  [['bus', '', 4.4, -1.2], ['car', '#A43BE8', 4.4, -3.4]],
  [['car', '#FF8A1F', 3.4, -0.8], ['truck', '#1E63E6', 3.4, -2.4]],
  [['bus', '', 4.0, 0], ['car', '#F2F2F2', 4.0, -2.2]],
  [['car', '#E3261E', 2.8, -1.1], ['car', '#2F9C95', 2.8, -2.5]],
  [['truck', '#43C21A', 5.0, -0.3], ['bus', '', 5.0, -2.8]],
];

export const CROSS_CSS = `
  .cr-r, .cr-l { animation-timing-function: linear; animation-iteration-count: infinite; }
  .cr-r { animation-name: crR; }
  .cr-l { animation-name: crL; }
  @keyframes crR { from { transform: translateX(-150px) } to { transform: translateX(430px) } }
  @keyframes crL { from { transform: translateX(430px) } to { transform: translateX(-150px) } }
  .cr-brake { animation: crBrake .45s cubic-bezier(.2,.9,.3,1) both; }
  @keyframes crBrake { from { transform: translateX(-90px) } to { transform: translateX(0) } }
  .cr-brakeL { animation: crBrakeL .45s cubic-bezier(.2,.9,.3,1) both; }
  @keyframes crBrakeL { from { transform: translateX(90px) } to { transform: translateX(0) } }
  .cr-hop { animation: crHop .32s ease-out; }
  @keyframes crHop { 0% { transform: translateY(0) } 45% { transform: translateY(-16px) } 100% { transform: translateY(0) } }
  .cr-fright { animation: crFright .5s ease-out both; }
  @keyframes crFright { 0% { transform: translateY(0) rotate(0) } 40% { transform: translateY(-22px) rotate(-8deg) } 100% { transform: translateY(0) rotate(-4deg) } }
  .cr-pop { animation: crPop .35s cubic-bezier(.2,1.6,.4,1) both; }
  @keyframes crPop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  @media (prefers-reduced-motion: reduce) { .cr-r, .cr-l, .cr-brake, .cr-brakeL, .cr-hop, .cr-fright, .cr-pop { animation: none; } }
`;

function Wheel({ cx, cy }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="7.5" fill="#1A1A1A" stroke={O} strokeWidth="2" />
      <circle cx={cx} cy={cy} r="3.5" fill="#C8C8D0" />
    </>
  );
}

export function Car({ color }) {
  return (
    <svg width="78" height="44" viewBox="0 0 78 44" style={{ display: 'block', overflow: 'visible' }}>
      <ellipse cx="39" cy="40" rx="36" ry="4" fill="rgba(0,0,0,.35)" />
      <path d="M4 30V22Q4 18 9 17L20 15L30 6Q33 4 37 4H52Q57 4 60 8L66 16Q74 17 75 22V30Q75 33 72 33H7Q4 33 4 30Z" fill={color} stroke={O} strokeWidth="2.5" />
      <path d="M31 9L24 16H44V8H35Q33 8 31 9ZM48 8V16H63L58 10Q57 8 54 8Z" fill="#9FD3F2" stroke={O} strokeWidth="1.5" />
      <path d="M4 24H75" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
      <rect x="70" y="19" width="6" height="5" rx="1.5" fill="#FFE9A8" stroke={O} strokeWidth="1.2" />
      <rect x="2" y="20" width="4" height="5" rx="1" fill="#E3261E" />
      <Wheel cx="19" cy="33" />
      <Wheel cx="60" cy="33" />
    </svg>
  );
}

export function Bus() {
  return (
    <svg width="100" height="46" viewBox="0 0 100 46" style={{ display: 'block', overflow: 'visible' }}>
      <ellipse cx="50" cy="42" rx="47" ry="4" fill="rgba(0,0,0,.35)" />
      <path d="M4 34V8Q4 4 8 4H78Q84 4 88 9L96 22Q98 26 98 30V34Q98 37 95 37H7Q4 37 4 34Z" fill="#1E63E6" stroke={O} strokeWidth="2.5" />
      <path d="M5 6Q6 5 8 5H78Q83 5 86 9L90 15H5Z" fill="#F4F4F2" />
      <path d="M5 26H97" stroke="#FFD21F" strokeWidth="2.5" />
      {[9, 26, 43, 60].map(x => <rect key={x} x={x} y="8" width="14" height="10" rx="2" fill="#2A3A5A" stroke={O} strokeWidth="1.5" />)}
      <path d="M78 8H84L91 20H78Z" fill="#9FD3F2" stroke={O} strokeWidth="1.5" />
      <circle cx="16" cy="13" r="3" fill="#5A3420" />
      <circle cx="50" cy="13" r="3" fill="#3B2216" />
      <circle cx="67" cy="13" r="3" fill="#6A4028" />
      <rect x="92" y="27" width="6" height="5" rx="1.5" fill="#FFE9A8" stroke={O} strokeWidth="1.2" />
      <Wheel cx="22" cy="37" />
      <Wheel cx="80" cy="37" />
    </svg>
  );
}

export function Truck({ color }) {
  return (
    <svg width="112" height="46" viewBox="0 0 112 46" style={{ display: 'block', overflow: 'visible' }}>
      <ellipse cx="56" cy="42" rx="53" ry="4" fill="rgba(0,0,0,.35)" />
      <rect x="4" y="8" width="72" height="26" rx="2" fill="#8A5A32" stroke={O} strokeWidth="2.5" />
      <path d="M4 16H76M4 24H76" stroke="#6A4022" strokeWidth="2" />
      <rect x="8" y="-2" width="16" height="11" rx="4" fill="#F2EEE2" stroke={O} strokeWidth="2" />
      <rect x="26" y="-3" width="16" height="12" rx="4" fill="#F2EEE2" stroke={O} strokeWidth="2" />
      <rect x="44" y="-2" width="16" height="11" rx="4" fill="#F2EEE2" stroke={O} strokeWidth="2" />
      <path d="M12 3H20M30 3H38M48 3H56" stroke="#43C21A" strokeWidth="2" />
      <path d="M78 34V12Q78 8 82 8H94Q98 8 100 12L107 24Q108 26 108 29V34Z" fill={color} stroke={O} strokeWidth="2.5" />
      <path d="M84 12H94L99 22H84Z" fill="#9FD3F2" stroke={O} strokeWidth="1.5" />
      <rect x="103" y="26" width="6" height="5" rx="1.5" fill="#FFE9A8" stroke={O} strokeWidth="1.2" />
      <Wheel cx="20" cy="37" />
      <Wheel cx="40" cy="37" />
      <Wheel cx="94" cy="37" />
    </svg>
  );
}

export function Vehicle({ kind, color }) {
  if (kind === 'bus') return <Bus />;
  if (kind === 'truck') return <Truck color={color || '#1E63E6'} />;
  return <Car color={color || '#1E63E6'} />;
}

// The near pavement: zebra kerb, the bus stop (someone waiting), a tree, a crate.
export function Pavement() {
  return (
    <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, background: 'repeating-linear-gradient(90deg, #B8B0A0 0 38px, #A8A090 38px 40px), #B8B0A0', borderTop: '6px solid #E6E0D2' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 6, background: 'repeating-linear-gradient(90deg, #F2F2F2 0 22px, #1A1A1A 22px 44px)' }} />
      <svg width="390" height="80" viewBox="0 0 390 80" style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d="M18 74V24H92V74" stroke={O} strokeWidth="3" fill="none" />
        <rect x="12" y="16" width="86" height="10" rx="2" fill="#1E63E6" stroke={O} strokeWidth="2.5" />
        <text x="55" y="24" textAnchor="middle" fill="#FFFFFF" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="7">BUS STOP</text>
        <rect x="26" y="52" width="58" height="6" rx="2" fill="#8A5A32" stroke={O} strokeWidth="2" />
        <path d="M32 58V68M78 58V68" stroke={O} strokeWidth="2.5" />
        <circle cx="44" cy="44" r="6" fill="#5A3420" />
        <rect x="38" y="48" width="12" height="6" rx="2" fill="#E86A9A" />
        <path d="M330 74V40" stroke="#5A3A22" strokeWidth="5" />
        <circle cx="330" cy="30" r="20" fill="#2F6A3A" stroke={O} strokeWidth="2.5" />
        <circle cx="318" cy="22" r="11" fill="#3A8044" />
        <circle cx="342" cy="26" r="9" fill="#4E9A52" />
        <rect x="254" y="52" width="22" height="18" rx="2" fill="#E8874A" stroke={O} strokeWidth="2" />
        <path d="M254 58H276" stroke="#B85A28" strokeWidth="2" />
      </svg>
    </div>
  );
}

// The grass median between lanes 4 and 5: street lights and flowers.
export function Median() {
  return (
    <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 336, height: 34, background: '#4E9A3E', borderTop: '5px solid #E6E0D2', borderBottom: '5px solid #E6E0D2', boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0) 0 6px, rgba(255,255,255,.08) 6px 8px)' }} />
      <svg width="390" height="34" viewBox="0 0 390 34" style={{ position: 'absolute', left: 0, top: -40, overflow: 'visible' }}>
        <path d="M60 64V14M60 14H76M60 14H44" stroke={O} strokeWidth="3" fill="none" />
        <rect x="72" y="12" width="9" height="5" rx="2" fill="#FFE9A8" stroke={O} strokeWidth="1.5" />
        <rect x="39" y="12" width="9" height="5" rx="2" fill="#FFE9A8" stroke={O} strokeWidth="1.5" />
        <path d="M330 64V14M330 14H346M330 14H314" stroke={O} strokeWidth="3" fill="none" />
        <rect x="342" y="12" width="9" height="5" rx="2" fill="#FFE9A8" stroke={O} strokeWidth="1.5" />
        <rect x="309" y="12" width="9" height="5" rx="2" fill="#FFE9A8" stroke={O} strokeWidth="1.5" />
        <path d="M120 56Q126 44 134 52M140 56Q146 44 154 52" stroke="#E3261E" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M248 56Q254 44 262 52M268 56Q274 44 282 52" stroke="#FFD21F" strokeWidth="5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

// The far side: Kalingalinga Market (stalls, sellers).
export function Market() {
  return (
    <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 626, height: 114, background: '#A8673A', borderBottom: '6px solid #E6E0D2' }}>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 6, background: 'repeating-linear-gradient(90deg, #F2F2F2 0 22px, #1A1A1A 22px 44px)' }} />
      <svg width="390" height="114" viewBox="0 0 390 114" style={{ position: 'absolute', left: 0, top: 0 }}>
        <rect x="112" y="6" width="166" height="20" rx="3" fill="#43C21A" stroke={O} strokeWidth="2.5" />
        <text x="195" y="20" textAnchor="middle" fill="#FFFFFF" fontFamily="'Lilita One', sans-serif" fontSize="12" letterSpacing=".5">KALINGALINGA MARKET</text>
        <path d="M126 26V44M264 26V44" stroke={O} strokeWidth="3" />
        <g stroke={O} strokeWidth="2">
          <path d="M8 60L36 44L64 60Z" fill="#E3261E" />
          <path d="M70 60L98 44L126 60Z" fill="#1E63E6" />
          <path d="M264 60L292 44L320 60Z" fill="#FFD21F" />
          <path d="M326 60L354 44L382 60Z" fill="#43C21A" />
        </g>
        <path d="M36 60V92M98 60V92M292 60V92M354 60V92" stroke={O} strokeWidth="2.5" />
        <rect x="14" y="76" width="44" height="12" fill="#8A5A32" stroke={O} strokeWidth="2" />
        <circle cx="22" cy="74" r="3.5" fill="#E3261E" /><circle cx="30" cy="74" r="3.5" fill="#E3261E" /><circle cx="26" cy="70" r="3.5" fill="#E3261E" />
        <circle cx="44" cy="74" r="3.5" fill="#E3261E" /><circle cx="52" cy="74" r="3.5" fill="#E3261E" /><circle cx="48" cy="70" r="3.5" fill="#E3261E" />
        <rect x="76" y="76" width="44" height="12" fill="#8A5A32" stroke={O} strokeWidth="2" />
        <path d="M80 74H116" stroke="#C8C8D0" strokeWidth="5" />
        <rect x="270" y="76" width="44" height="12" fill="#8A5A32" stroke={O} strokeWidth="2" />
        <path d="M274 72L282 76M284 72L292 76M294 72L302 76M304 72L310 76" stroke="#43C21A" strokeWidth="4" />
        <rect x="332" y="76" width="44" height="12" fill="#8A5A32" stroke={O} strokeWidth="2" />
        <circle cx="342" cy="73" r="4" fill="#FF8A1F" /><circle cx="352" cy="73" r="4" fill="#FF8A1F" /><circle cx="362" cy="73" r="4" fill="#FF8A1F" />
        <circle cx="160" cy="64" r="6" fill="#4A2C1C" /><rect x="153" y="70" width="14" height="20" rx="4" fill="#A43BE8" />
        <circle cx="232" cy="66" r="6" fill="#5A3420" /><rect x="225" y="72" width="14" height="18" rx="4" fill="#FF8A1F" />
        <rect x="224" y="58" width="16" height="6" rx="3" fill="#43C21A" />
      </svg>
    </div>
  );
}

// The villager (red check shirt, hat, satchel) carrying his chicken: 40×61 on screen, viewBox 60×92.
export function Villager({ width = 40, height = 61 }) {
  return (
    <svg width={width} height={height} viewBox="0 0 60 92" aria-hidden style={{ overflow: 'visible', display: 'block' }}>
      <ellipse cx="28" cy="88" rx="19" ry="4" fill="rgba(0,0,0,.38)" />
      <path d="M21 60L20 84M34 60L35 84" stroke={O} strokeWidth="10.5" strokeLinecap="round" />
      <path d="M21 60L20 84M34 60L35 84" stroke="#5E5248" strokeWidth="7" strokeLinecap="round" />
      <path d="M22 64L21.5 80M33 64L33.5 80" stroke="#4A4038" strokeWidth="1.2" />
      <path d="M13 86Q14 82 20 82Q25 82 25 86Z" fill="#3A2418" stroke={O} strokeWidth="1.8" />
      <path d="M30 86Q30 82 35 82Q41 82 42 86Z" fill="#3A2418" stroke={O} strokeWidth="1.8" />
      <rect x="15" y="57" width="26" height="5" rx="1.5" fill="#3A2418" stroke={O} strokeWidth="1.6" />
      <rect x="26" y="57.5" width="5" height="4" rx="1" fill="#C8A040" />
      <path d="M14 31Q14 27 19 26H37Q42 27 42 31V59H14Z" fill="#C8342C" stroke={O} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M15 34H41M15 41H41M15 48H41M15 55H41" stroke="#8E1F18" strokeWidth="2" />
      <path d="M20 27V58M28 27V58M36 27V58" stroke="#8E1F18" strokeWidth="2" />
      <path d="M15 37.5H41M15 51.5H41M24 27V58M32 27V58" stroke="#E86A5A" strokeWidth=".9" />
      <path d="M28 27V59" stroke={O} strokeWidth="1.2" />
      <circle cx="28" cy="35" r="1.1" fill="#F4F1E8" />
      <circle cx="28" cy="42" r="1.1" fill="#F4F1E8" />
      <circle cx="28" cy="49" r="1.1" fill="#F4F1E8" />
      <rect x="31" y="31" width="7" height="6" rx="1" fill="none" stroke={O} strokeWidth="1.4" />
      <path d="M21 25L28 31L35 25L31 24L28 27L25 24Z" fill="#E8DCC8" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 28L36 52" stroke={O} strokeWidth="5" strokeLinecap="round" />
      <path d="M15 28L36 52" stroke="#2F9C95" strokeWidth="3" strokeLinecap="round" />
      <path d="M33 50Q35 46 40 48L44 58Q41 62 35 60Z" fill="#E8C547" stroke={O} strokeWidth="2" />
      <path d="M36 52L42 56M35 56L41 59" stroke="#2F9C95" strokeWidth="2" />
      <path d="M15 31Q7 38 9 52" stroke={O} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M15 31Q7 38 9 52" stroke="#C8342C" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M9.5 44Q8.5 48 9 53" stroke="#4A2C1C" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <path d="M8 43H12" stroke="#8E1F18" strokeWidth="2.4" />
      <path d="M46 46Q41 38 46 32Q52 28 57 33Q60 39 55 45Q51 49 46 46Z" fill="#F4F1E8" stroke={O} strokeWidth="2.2" />
      <path d="M48 40Q52 37 56 40M48 43Q52 41 55 43" stroke="#C8C2B4" strokeWidth="1.4" fill="none" />
      <path d="M45 45Q38 44 37 36Q41 40 45 39Z" fill="#E8E2D4" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M54 32Q53 25 56 22Q60 21 60 25Q60 29 57 32" fill="#F4F1E8" stroke={O} strokeWidth="2" />
      <path d="M55 22Q55 18 57 19Q57 16 59 18Q61 17 60 21Z" fill="#E3261E" stroke={O} strokeWidth="1.2" />
      <path d="M60 24L63.5 25.5L60 27Z" fill="#FFB020" stroke={O} strokeWidth="1" />
      <path d="M59.5 28Q61 31 59 31.5" fill="#E3261E" stroke={O} strokeWidth="1" />
      <circle cx="57.5" cy="24" r="1.2" fill={O} />
      <path d="M50 48L49 53M53 47L53 52" stroke="#E0A300" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M41 31Q48 36 49 42" stroke={O} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M41 31Q48 36 49 42" stroke="#C8342C" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M47 38Q50 42 47 46" stroke="#4A2C1C" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      <path d="M24 21V26H32V21" fill="#4A2C1C" stroke={O} strokeWidth="1.6" />
      <circle cx="17.5" cy="14" r="2.6" fill="#3E2416" stroke={O} strokeWidth="1.4" />
      <circle cx="38.5" cy="14" r="2.6" fill="#3E2416" stroke={O} strokeWidth="1.4" />
      <path d="M18 11Q18 3 28 3Q38 3 38 11V17Q38 24 28 24Q18 24 18 17Z" fill="#4A2C1C" stroke={O} strokeWidth="2.2" />
      <path d="M20 17Q21 25 28 25Q35 25 36 17Q34 21 28 21Q22 21 20 17Z" fill="#D8D2C4" stroke={O} strokeWidth="1.2" />
      <path d="M23 17.5Q28 15.5 33 17.5" stroke="#D8D2C4" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M25 19.5Q28 20.8 31 19.5" stroke={O} strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <path d="M27 12.5Q26.5 15 28 15.5Q29.5 15 29 12.5" fill="#3E2416" />
      <circle cx="23.8" cy="11.5" r="1.5" fill="#F4F1E8" />
      <circle cx="32.2" cy="11.5" r="1.5" fill="#F4F1E8" />
      <circle cx="24.1" cy="11.7" r=".9" fill={O} />
      <circle cx="32.5" cy="11.7" r=".9" fill={O} />
      <path d="M21.5 8.6Q24 7.4 26 8.6M30 8.6Q32 7.4 34.5 8.6" stroke="#D8D2C4" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M17 7Q17 -2 28 -2Q38 -2 39 6Z" fill="#7A6A54" stroke={O} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M15 7.5Q28 3 42 9Q42 11 39 10.5Q28 7 16 9.5Z" fill="#6A5A48" stroke={O} strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 3.5Q28 0 38 3.5" stroke="#4A3A2A" strokeWidth="2" fill="none" />
      <path d="M21 -0.5Q27 -2 32 -0.5" stroke="#9A8A72" strokeWidth="1.2" fill="none" />
    </svg>
  );
}
