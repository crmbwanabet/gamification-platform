'use client';

import React from 'react';

// The bus stop scene (from the approved design, Conductor.dc.html), in the
// design's 390-wide coordinates. The game crops it to y 84..420 (the riders
// stand closer to the bus than in the 844-tall mock so it fits the candy card).
// Pieces: Backdrop (sky, city, road, pavement, BUS STOP sign), Bus (with a
// passenger in a window for every stop cleared and you, the conductor, waving
// at the door) and Speech (the conductor's bubble, pre-split lines).

const O = '#2A0A4F';
const DISPLAY = { fontFamily: "var(--font-game), 'Lilita One', system-ui, sans-serif" };
const BODY = { fontFamily: "var(--font-game-body), 'Nunito', system-ui, sans-serif", fontWeight: 900 };

export const BUS_CSS = `
  .bc-wave { transform-box: fill-box; transform-origin: 0% 100%; animation: bcWave .5s ease-in-out infinite alternate; }
  @keyframes bcWave { from { transform: rotate(-12deg) } to { transform: rotate(14deg) } }
  .bc-pop { animation: bcPop .35s cubic-bezier(.2,1.6,.4,1) both; transform-box: fill-box; transform-origin: 50% 100%; }
  @keyframes bcPop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  .bc-seat { animation: bcPop .35s cubic-bezier(.2,1.6,.4,1) both; transform-box: fill-box; transform-origin: 50% 100%; }
  @media (prefers-reduced-motion: reduce) { .bc-wave, .bc-pop, .bc-seat { animation: none; } }
`;

export function Backdrop() {
  return (
    <g>
      <defs>
        <linearGradient id="bcSky" x1="0" y1="0" x2="0" y2="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5B2BB0" />
          <stop offset=".5" stopColor="#C86A6A" />
          <stop offset=".72" stopColor="#F2B66A" />
        </linearGradient>
      </defs>
      <rect x="-300" y="-400" width="990" height="960" fill="url(#bcSky)" />
      <g fill="#6A3A7A" stroke={O} strokeWidth="2">
        <rect x="-150" y="190" width="80" height="110" />
        <rect x="-74" y="172" width="72" height="128" />
        <rect x="392" y="182" width="70" height="118" />
        <rect x="462" y="158" width="90" height="142" />
        <rect x="-4" y="160" width="70" height="140" />
        <rect x="66" y="186" width="58" height="114" />
        <rect x="124" y="150" width="84" height="150" />
        <rect x="208" y="176" width="62" height="124" />
        <rect x="270" y="166" width="124" height="134" />
      </g>
      <g fill="#FFCF7A">
        <rect x="8" y="176" width="10" height="12" /><rect x="30" y="176" width="10" height="12" /><rect x="8" y="206" width="10" height="12" />
        <rect x="138" y="166" width="10" height="12" /><rect x="170" y="166" width="10" height="12" /><rect x="154" y="196" width="10" height="12" />
        <rect x="286" y="182" width="10" height="12" /><rect x="318" y="182" width="10" height="12" /><rect x="350" y="212" width="10" height="12" />
      </g>
      <rect x="132" y="138" width="68" height="16" rx="2" fill="#E3261E" stroke={O} strokeWidth="2" />
      <text x="166" y="150" textAnchor="middle" fill="#FFFFFF" style={{ ...DISPLAY, fontSize: 10 }}>CITY MARKET</text>
      <rect x="-300" y="298" width="990" height="14" fill="#2E2E36" />
      <path d="M-300 305H690" stroke="#F2F2F2" strokeWidth="2" strokeDasharray="18 14" />
      <rect x="-300" y="312" width="990" height="10" fill="#E6E0D2" />
      <rect x="-300" y="322" width="990" height="600" fill="#C9C2B2" />
      <path d="M-300 360H690M-300 400H690M-300 440H690M-300 480H690M-300 520H690" stroke="#B0A898" strokeWidth="1.5" />
      <path d="M-170 322V900M-100 322V900M-30 322V900M40 322V900M110 322V900M180 322V900M250 322V900M320 322V900M390 322V900M460 322V900M530 322V900" stroke="#B0A898" strokeWidth="1.5" />
      <path d="M326 236V318M384 236V318" stroke={O} strokeWidth="4" />
      <path d="M316 238L394 230" stroke={O} strokeWidth="3" />
      <path d="M318 230H392V242H318Z" fill="#1E63E6" stroke={O} strokeWidth="2.5" />
      <text x="355" y="240" textAnchor="middle" fill="#FFFFFF" style={{ ...BODY, fontSize: 8 }}>BUS STOP</text>
    </g>
  );
}

const SEATS = [
  { x: 77, head: '#5A3420', shirt: '#FF8A1F' },
  { x: 113, head: '#3B2216', shirt: '#1E63E6' },
  { x: 149, head: '#4A2C1C', shirt: '#43C21A' },
  { x: 185, head: '#5A3420', shirt: '#E3261E' },
  { x: 271, head: '#3B2216', shirt: '#A43BE8' },
];

function Wheel({ cx }) {
  return (
    <g>
      <circle cx={cx} cy="110" r="19" fill="#1A1A1A" stroke={O} strokeWidth="2" />
      <circle cx={cx} cy="110" r="9" fill="#C8C8D0" stroke={O} strokeWidth="2" />
      <path d={`M${cx} 102V118M${cx - 8} 110H${cx + 8}`} stroke="#6A6A78" strokeWidth="2" />
    </g>
  );
}

/** The minibus at (4, 172); `seated` = stops cleared (0..5) = passengers in the windows. */
export function Bus({ seated = 0, wave = true }) {
  return (
    <g transform="translate(4 172)">
      <ellipse cx="150" cy="134" rx="140" ry="6" fill="rgba(0,0,0,.35)" />
      <path d="M40 10H120M140 10H250" stroke={O} strokeWidth="3" />
      <path d="M44 10V18M246 10V18M120 10V18M200 10V18" stroke={O} strokeWidth="2.5" />
      <rect x="56" y="-6" width="40" height="17" rx="3" fill="#C8342C" stroke={O} strokeWidth="2.4" />
      <rect x="104" y="-12" width="52" height="23" rx="2" fill="#E8874A" stroke={O} strokeWidth="2.4" />
      <path d="M104 0H156M117 -12V11M130 -12V11M143 -12V11" stroke="#B85A28" strokeWidth="2" />
      <rect x="166" y="-2" width="46" height="13" rx="6" fill="#43C21A" stroke={O} strokeWidth="2.4" />
      <rect x="218" y="-8" width="26" height="19" rx="3" fill="#1E63E6" stroke={O} strokeWidth="2.4" />
      <path d="M284 20Q284 14 276 14H44Q30 14 22 26L6 58Q2 66 2 76V104Q2 110 8 110H284Q292 110 292 102V26Q292 20 284 20Z" fill="#1E63E6" stroke={O} strokeWidth="3.5" />
      <path d="M290 22Q288 16 276 16H44Q32 16 25 26L19 38H290Z" fill="#F4F4F2" />
      <path d="M4 68H290" stroke="#FFD21F" strokeWidth="5" />
      <path d="M4 74H290" stroke="#F4F4F2" strokeWidth="3" />
      <path d="M36 24H56V56H22Z" fill="#3E5A80" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M38 27L46 27L33 46Z" fill="#9FD3F2" />
      <rect x="26" y="44" width="18" height="8" rx="1" fill="#FFD21F" stroke={O} strokeWidth="1.2" />
      <text x="35" y="50.5" textAnchor="middle" fill={O} style={{ ...BODY, fontSize: 6 }}>TOWN</text>
      {[62, 98, 134, 170, 256].map(x => (
        <rect key={x} x={x} y="26" width="30" height="26" rx="3" fill="#2A3A5A" stroke={O} strokeWidth="2.5" />
      ))}
      <circle cx="45" cy="44" r="6" fill="#4A2C1C" />
      {SEATS.map((s, i) => i < seated && (
        <g key={i} className="bc-seat">
          <circle cx={s.x} cy="42" r="7" fill={s.head} />
          <rect x={s.x - 8} y="47" width="16" height="6" rx="3" fill={s.shirt} />
        </g>
      ))}
      <path d="M65 29L73 29L66 40Z M101 29L109 29L102 40Z M137 29L145 29L138 40Z M173 29L181 29L174 40Z M259 29L267 29L260 40Z" fill="rgba(255,255,255,.3)" />
      {/* the open door and you, the conductor */}
      <rect x="206" y="22" width="44" height="88" rx="2" fill="#16203A" stroke={O} strokeWidth="3" />
      <path d="M206 28H250" stroke={O} strokeWidth="2" />
      <path d="M236 84V108M224 84V108" stroke="#1E2A4A" strokeWidth="7" strokeLinecap="round" />
      <rect x="218" y="56" width="22" height="30" rx="5" fill="#2F9C95" stroke={O} strokeWidth="2.4" />
      <path d="M229 58V86" stroke="#F4F1E8" strokeWidth="2" />
      <path d="M222 62Q214 70 218 80" stroke="#2F9C95" strokeWidth="6" strokeLinecap="round" fill="none" />
      <rect x="212" y="74" width="12" height="7" rx="1" fill="#43C21A" stroke={O} strokeWidth="1.2" transform="rotate(-20 218 77)" />
      <rect x="214" y="70" width="12" height="7" rx="1" fill="#E8C547" stroke={O} strokeWidth="1.2" transform="rotate(-8 220 73)" />
      <g className={wave ? 'bc-wave' : undefined}>
        <path d="M238 62Q252 54 262 42" stroke={O} strokeWidth="8" strokeLinecap="round" fill="none" />
        <path d="M238 62Q252 54 262 42" stroke="#2F9C95" strokeWidth="5.5" strokeLinecap="round" fill="none" />
        <circle cx="263" cy="40" r="4.5" fill="#4A2C1C" stroke={O} strokeWidth="1.5" />
      </g>
      <circle cx="230" cy="44" r="10" fill="#4A2C1C" stroke={O} strokeWidth="2" />
      <path d="M219 41Q220 31 230 31Q240 31 241 41Z" fill="#E3261E" stroke={O} strokeWidth="1.8" />
      <path d="M238 39H248Q248 42 240 42Z" fill="#E3261E" stroke={O} strokeWidth="1.5" />
      <circle cx="227" cy="44" r="1.2" fill="#F4F1E8" /><circle cx="234" cy="44" r="1.2" fill="#F4F1E8" />
      <path d="M226 48Q230.5 53 235 48Z" fill="#7A1A16" stroke={O} strokeWidth="1.2" />
      <rect x="2" y="80" width="12" height="10" rx="3" fill="#FFE9A8" stroke={O} strokeWidth="2" />
      <rect x="0" y="98" width="24" height="10" rx="3" fill="#B8B4AC" stroke={O} strokeWidth="2" />
      <rect x="280" y="80" width="10" height="9" rx="1.5" fill="#E3261E" stroke={O} strokeWidth="1.6" />
      <rect x="120" y="84" width="40" height="13" rx="2" fill="#FFFFFF" stroke={O} strokeWidth="2" />
      <text x="140" y="94" textAnchor="middle" fill="#1A1A1A" style={{ ...BODY, fontSize: 9 }}>BAX 2025</text>
      <Wheel cx={62} />
      <Wheel cx={250} />
    </g>
  );
}

/** The conductor's speech bubble, top-left at (196, 92); the tail points down at the door. */
export function Speech({ lines }) {
  const h = 26 + lines.length * 17;
  return (
    <g className="bc-pop" key={lines.join('|')}>
      <rect x="196" y="92" width="186" height={h} rx="16" fill="#FFFFFF" stroke={O} strokeWidth="3" />
      <path d={`M222 ${92 + h - 1.5}L232 ${92 + h + 13}L242 ${92 + h - 1.5}`} fill="#FFFFFF" stroke={O} strokeWidth="3" strokeLinejoin="round" />
      <rect x="223" y={92 + h - 4} width="18" height="5" fill="#FFFFFF" />
      <text x="208" y="111" fill="#2F9C95" style={{ ...BODY, fontSize: 10, letterSpacing: '.1em' }}>YOU, THE CONDUCTOR</text>
      {lines.map((l, i) => (
        <text key={i} x="208" y={128 + i * 17} fill={O} style={{ ...BODY, fontSize: 14 }}>{l}</text>
      ))}
    </g>
  );
}
