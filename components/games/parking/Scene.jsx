'use client';

import React from 'react';
import { CANDY, COIN_ICON } from '../candy/tokens';
import { BAYS, multLabel } from '@/lib/parking/bays.mjs';

// Street Parking scene (from the approved Park design), top-down, in one SVG.
// The design is 390 × 560; here it is packed into 390 × 432 so it fits the
// candy pop-up: shops + pavement on top, 3 bays, the driving lane with arrows,
// 3 bays, a strip of pavement at the bottom. The tarmac, pavements and shop
// fronts run on past every edge, so useFitViewBox can widen / heighten the
// view to fill the box without ever cropping the play area.

export const VB_W = 390;
export const VB_H = 432;

export const BAY_W = 112;
export const BAY_H = 94;
const POS = [[11, 90], [139, 90], [267, 90], [11, 308], [139, 308], [267, 308]];
export const LANE_Y = 232;                 // centre line the waiting cars sit on
export const YOU_START = { x: 49, y: LANE_Y };
export const TAXI_START = { x: 341, y: LANE_Y };

export const bayBox = (i) => ({ x: POS[i][0], y: POS[i][1], top: i < 3 });
export const bayCentre = (i) => ({ x: POS[i][0] + BAY_W / 2, y: POS[i][1] + BAY_H / 2 });

const O = CANDY.outline;
const LINE = '#F2F2F2';

export const SCENE_CSS = `
  .pkp-bay { cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
  .pkp-bay.off { cursor: default; }
  .pkp-bay .pkp-focus { opacity: 0; }
  .pkp-bay:focus-visible .pkp-focus { opacity: 1; }
  .pkp-sel { animation: pkpSel 1.1s ease-in-out infinite; }
  @keyframes pkpSel { 0%, 100% { stroke: #FFD21F; filter: drop-shadow(0 0 0 rgba(255,210,31,0)); } 50% { stroke: #FFF0A0; filter: drop-shadow(0 0 7px rgba(255,210,31,.85)); } }
  @media (prefers-reduced-motion: reduce) { .pkp-sel { animation: none; } }
`;

export function SceneDefs() {
  return (
    <defs>
      <pattern id="pkp-tin" width="6" height="40" patternUnits="userSpaceOnUse">
        <rect width="6" height="40" fill="#9A9AA6" />
        <rect width="2" height="40" fill="#B8B8C4" />
      </pattern>
      <pattern id="pkp-tiles" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#C9C2B2" />
        <path d="M0 0H20M0 0V20" stroke="#B0A898" strokeWidth="1.5" />
      </pattern>
      <pattern id="pkp-tar" width="14" height="14" patternUnits="userSpaceOnUse">
        <rect width="14" height="14" fill="#4A4A54" />
        <circle cx="3" cy="4" r=".9" fill="#5A5A66" />
        <circle cx="10" cy="10" r=".8" fill="#3E3E48" />
      </pattern>
    </defs>
  );
}

// Striped shop awning: a colour line with a dashed second colour on top.
const Awning = ({ d, a, b }) => (
  <>
    <path d={d} stroke={a} strokeWidth="6" />
    <path d={d} stroke={b} strokeWidth="6" strokeDasharray="8 8" />
  </>
);

export function Backdrop() {
  return (
    <g aria-hidden>
      <rect x="-500" y="-400" width="1390" height="1300" fill="url(#pkp-tar)" />
      {/* top pavement (behind the shops) */}
      <rect x="-500" y="40" width="1390" height="42" fill="url(#pkp-tiles)" />

      {/* shop fronts: tin, red, yellow (window + fan), tin — plus more tin past the edges */}
      <rect x="-500" y="-400" width="500" height="450" fill="url(#pkp-tin)" stroke={O} strokeWidth="2.5" />
      <rect x="0" y="-400" width="84" height="452" fill="url(#pkp-tin)" stroke={O} strokeWidth="2.5" />
      <rect x="84" y="-400" width="100" height="448" fill="#C8342C" stroke={O} strokeWidth="2.5" />
      <path d="M84 16H184M84 32H184" stroke="#A82820" strokeWidth="2" />
      <rect x="184" y="-400" width="86" height="451" fill="#E8C547" stroke={O} strokeWidth="2.5" />
      <rect x="204" y="13" width="44" height="25" rx="3" fill="#D8D2C4" stroke={O} strokeWidth="2" />
      <circle cx="226" cy="25.5" r="8" fill="#9A9AA6" stroke={O} strokeWidth="1.5" />
      <rect x="270" y="-400" width="120" height="450" fill="url(#pkp-tin)" stroke={O} strokeWidth="2.5" />
      <rect x="390" y="-400" width="500" height="448" fill="#C8342C" stroke={O} strokeWidth="2.5" />
      <Awning d="M-498 50H-2" a="#43C21A" b="#FFD21F" />
      <Awning d="M2 52H82" a="#E3261E" b="#F4F1E8" />
      <Awning d="M86 48H182" a="#1E63E6" b="#F4F1E8" />
      <Awning d="M186 51H268" a="#43C21A" b="#FFD21F" />
      <Awning d="M272 50H388" a="#FF8A1F" b="#F4F1E8" />
      <Awning d="M392 48H888" a="#1E63E6" b="#F4F1E8" />

      {/* pavement life: tree, people, man on his phone, P sign */}
      <circle cx="30" cy="66" r="14" fill="#2F6A3A" stroke={O} strokeWidth="2.5" />
      <circle cx="26" cy="62" r="8" fill="#3A8044" />
      <ellipse cx="120" cy="66" rx="8" ry="5.5" fill="#1E63E6" stroke={O} strokeWidth="1.5" /><circle cx="120" cy="66" r="4" fill="#3B2216" />
      <ellipse cx="196" cy="71" rx="8" ry="5.5" fill="#E86A9A" stroke={O} strokeWidth="1.5" /><circle cx="196" cy="71" r="4" fill="#1A1A1A" />
      <ellipse cx="338" cy="66" rx="10" ry="6.5" fill="#FF8A1F" stroke={O} strokeWidth="1.8" />
      <path d="M330 66H346" stroke="#E8FF3A" strokeWidth="2.5" /><circle cx="338" cy="66" r="4.5" fill="#4A2C1C" />
      <rect x="347" y="59" width="8" height="11" rx="2" fill="#2A2A34" stroke={O} strokeWidth="1.2" /><rect x="349" y="61" width="4" height="4" fill="#7BE34F" />
      <rect x="264" y="57" width="20" height="20" rx="4" fill="#1E63E6" stroke="#F4F1E8" strokeWidth="2" />
      <text x="274" y="72.5" textAnchor="middle" fill="#fff" fontSize="15" style={{ fontFamily: CANDY.display }}>P</text>
      <rect x="-500" y="80" width="1390" height="5" fill="#E6E0D2" />

      {/* the driving lane */}
      <path d="M-500 190H890M-500 302H890" stroke={LINE} strokeWidth="3" />
      <path d="M60 252H100M150 252H190M240 252H280" stroke={LINE} strokeWidth="3" />
      <path d="M96 246L104 252L96 258M186 246L194 252L186 258M276 246L284 252L276 258" stroke={LINE} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* bottom pavement: tree + fruit stall */}
      <rect x="-500" y="406" width="1390" height="500" fill="url(#pkp-tiles)" />
      <rect x="-500" y="406" width="1390" height="5" fill="#E6E0D2" />
      <circle cx="362" cy="428" r="15" fill="#2F6A3A" stroke={O} strokeWidth="2.5" />
      <circle cx="357" cy="424" r="8" fill="#3A8044" />
      <rect x="150" y="414" width="40" height="22" rx="3" fill="#8A5A32" stroke={O} strokeWidth="2" />
      <circle cx="159" cy="421" r="3.5" fill="#E3261E" /><circle cx="168" cy="421" r="3.5" fill="#E3261E" /><circle cx="177" cy="421" r="3.5" fill="#FF8A1F" />
      <circle cx="163" cy="428" r="3.5" fill="#FF8A1F" /><circle cx="172" cy="428" r="3.5" fill="#E3261E" /><circle cx="181" cy="428" r="3.5" fill="#E3261E" />
    </g>
  );
}

// "win 40 [coin]" pill, centred on x = 0
function WinPill({ amount, y }) {
  const text = `win ${amount}`;
  const tw = text.length * 7.6;
  const w = tw + 30;
  const x0 = -w / 2;
  return (
    <g>
      <rect x={x0} y={y} width={w} height="21" rx="10.5" fill="rgba(26,8,56,.8)" />
      <text x={x0 + 8} y={y + 15.5} fill="#fff" fontSize="14.5" fontWeight="900" style={{ fontFamily: CANDY.body }}>{text}</text>
      <image href={COIN_ICON} x={x0 + 11 + tw} y={y + 3} width="15" height="15" />
    </g>
  );
}

// One bay. state: { selected, tint, showLabel, win (coins), disabled }
export function Bay({ index, selected, tint, showLabel, win, disabled, onPick }) {
  const b = BAYS[index];
  const { x, y, top } = bayBox(index);
  const lines = top
    ? `M${x + 1.5} ${y + BAY_H}V${y + 1.5}H${x + BAY_W - 1.5}V${y + BAY_H}`
    : `M${x + 1.5} ${y}V${y + BAY_H - 1.5}H${x + BAY_W - 1.5}V${y}`;
  const cx = x + BAY_W / 2;
  const ly = y + (top ? 10 : 16);
  const pick = () => { if (!disabled) onPick(index); };
  return (
    <g className={`pkp-bay${disabled ? ' off' : ''}`} role="button" tabIndex={disabled ? -1 : 0}
      aria-label={`${b.label}, win ${win} coins`} aria-pressed={selected} aria-disabled={disabled}
      onClick={pick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}>
      <rect x={x} y={y} width={BAY_W} height={BAY_H} fill="transparent" />
      <rect x={x + 1.5} y={y} width={BAY_W - 3} height={BAY_H} rx="3" fill={tint} />
      <path d={lines} stroke={LINE} strokeWidth="3" fill="none" strokeLinejoin="round" />
      {selected && <rect className="pkp-sel" x={x + 4} y={y + 3.5} width={BAY_W - 8} height={BAY_H - 7} rx="4" fill="none" stroke="#FFD21F" strokeWidth="4" />}
      <rect className="pkp-focus" x={x + 4} y={y + 3.5} width={BAY_W - 8} height={BAY_H - 7} rx="4" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="5 4" />
      {showLabel && (
        <g className="pkp-lbl" transform={`translate(${cx} ${ly})`}>
          <rect x="-42" y="4" width="84" height="42" rx="13" fill={b.d} />
          <rect x="-42" y="0" width="84" height="42" rx="13" fill={b.c} stroke={b.l} strokeWidth="3" />
          <text x="0" y="33" textAnchor="middle" fontSize="31" fill="rgba(42,10,79,.6)" style={{ fontFamily: CANDY.display }}>{multLabel(b.mult)}</text>
          <text x="0" y="31" textAnchor="middle" fontSize="31" fill="#fff" style={{ fontFamily: CANDY.display }}>{multLabel(b.mult)}</text>
          <WinPill amount={win} y={50} />
        </g>
      )}
    </g>
  );
}
