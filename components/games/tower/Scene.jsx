'use client';

import React from 'react';
import Floor from './Floor';

// Tower Build scene art, translated from the design (Main.dc.html). Everything
// is drawn in the design's 390-wide frame; the world can be WIDER (W) than 390
// so the scene fills its box without letterboxing: `ox` = (W − 390) / 2 shifts
// the frame to the middle and the skyline / ground / crane jib extend to the
// sides. Heights are bottom-anchored (skyline, ground, tower) or top-anchored
// (crane jib, hook) so any world height H works.

export const FRAME_W = 390;
const INK = '#2A0A4F';

export const SCENE_CSS = `
  .tw-swing { transform-origin: 50% 0; animation: twSwing 1.15s ease-in-out infinite alternate; }
  @keyframes twSwing { from { transform: rotate(-20deg) } to { transform: rotate(20deg) } }
  .tw-fl { position: absolute; width: 150px; height: 44px; box-sizing: border-box; }
  .tw-land { animation: twLand .42s cubic-bezier(.5,0,.9,.6) both; }
  @keyframes twLand { from { transform: translateY(-230px) } to { transform: translateY(0) } }
  .tw-fall { animation: twFall 1s .38s cubic-bezier(.4,0,1,1) both; }
  @keyframes twFall { 0% { transform: translateY(0) rotate(0) } 25% { transform: translateY(4px) rotate(calc(14deg * var(--dir, 1))) }
    100% { transform: translate(calc(150px * var(--dir, 1)), 520px) rotate(calc(95deg * var(--dir, 1))); opacity: .2 } }
  .tw-wobble { animation: twWob .5s .42s ease-in-out 2; }
  @keyframes twWob { 0%, 100% { transform: rotate(0) } 30% { transform: rotate(-2.5deg) } 70% { transform: rotate(2.5deg) } }
  .tw-pop { animation: twPop .35s cubic-bezier(.2,1.6,.4,1) both; }
  @keyframes twPop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  .tw-move { transition: transform .55s cubic-bezier(.3,.8,.3,1); }
  @media (prefers-reduced-motion: reduce) {
    .tw-swing, .tw-land, .tw-wobble, .tw-pop { animation: none; }
    .tw-fall { animation: none; opacity: .25; }
    .tw-move { transition: none; }
  }
`;

// ---------------------------------------------------------------- skyline
// Lusaka CBD at dusk: low blocks, the Bank of Zambia fins, the copper-topped
// teal tower, the clock tower, shopfronts with coloured awnings and trees.
// 560 tall, bottom-anchored; `shift` = parallax (0.35 × the tower shift).
export function Skyline({ W, ox, shift }) {
  return (
    <svg className="tw-move" width={W} height={560} viewBox={`${-ox} 0 ${W} 560`} aria-hidden
      style={{ position: 'absolute', left: 0, bottom: 0, transform: `translateY(${shift}px)` }}>
      <defs>
        <linearGradient id="twDusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF9A5A" stopOpacity="0" />
          <stop offset="1" stopColor="#FF9A5A" stopOpacity=".32" />
        </linearGradient>
        <pattern id="twLitA" width="18" height="22" patternUnits="userSpaceOnUse">
          <rect x="3" y="3" width="5" height="7" fill="#FFCF7A" />
          <rect x="11" y="3" width="5" height="7" fill="#3A2A5E" />
          <rect x="3" y="14" width="5" height="7" fill="#3A2A5E" />
          <rect x="11" y="14" width="5" height="7" fill="#FFE3A0" />
        </pattern>
        <pattern id="twLitB" width="18" height="22" patternUnits="userSpaceOnUse">
          <rect x="3" y="3" width="5" height="7" fill="#3A2A5E" />
          <rect x="11" y="3" width="5" height="7" fill="#FFCF7A" />
          <rect x="3" y="14" width="5" height="7" fill="#FFCF7A" />
          <rect x="11" y="14" width="5" height="7" fill="#FFCF7A" />
        </pattern>
        <pattern id="twFins" width="7" height="12" patternUnits="userSpaceOnUse">
          <rect width="7" height="12" fill="#B9B0D6" />
          <rect width="3" height="12" fill="#F0ECF8" />
          <rect x="3" y="0" width="4" height="2" fill="#8A80AE" />
        </pattern>
        <linearGradient id="twBoz" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#6FC2C8" />
          <stop offset=".55" stopColor="#3E8E9C" />
          <stop offset="1" stopColor="#2A6474" />
        </linearGradient>
      </defs>
      <rect x={-ox} y="260" width={W} height="300" fill="url(#twDusk)" />
      {/* far silhouettes (+ extra ones for a wide world) */}
      <g fill="#4E3E86" opacity=".75">
        <rect x="-150" y="380" width="34" height="150" />
        <rect x="-112" y="352" width="26" height="180" />
        <rect x="-80" y="396" width="40" height="136" />
        <rect x="0" y="364" width="30" height="170" />
        <rect x="30" y="392" width="24" height="140" />
        <rect x="146" y="372" width="28" height="160" />
        <rect x="178" y="344" width="30" height="190" />
        <rect x="212" y="396" width="18" height="140" />
        <rect x="350" y="384" width="40" height="150" />
        <rect x="430" y="360" width="30" height="172" />
        <rect x="466" y="392" width="44" height="140" />
        <rect x="516" y="372" width="28" height="160" />
      </g>
      {/* side blocks for a wide world */}
      <rect x="-44" y="340" width="40" height="190" fill="#8A7FB8" stroke={INK} strokeWidth="2.5" />
      <rect x="-41" y="346" width="34" height="180" fill="url(#twLitB)" />
      <rect x="392" y="326" width="36" height="204" fill="#7A6AAE" stroke={INK} strokeWidth="2.5" />
      <rect x="394" y="332" width="32" height="194" fill="url(#twLitA)" />
      {/* the design's skyline */}
      <rect x="0" y="330" width="38" height="200" fill="#7A6AAE" stroke={INK} strokeWidth="2.5" />
      <rect x="2" y="336" width="34" height="190" fill="url(#twLitA)" />
      <rect x="92" y="318" width="52" height="210" fill="#CDBF9E" stroke={INK} strokeWidth="2.5" />
      <rect x="95" y="326" width="46" height="200" fill="url(#twLitB)" opacity=".9" />
      <rect x="88" y="312" width="60" height="8" fill="#B5A684" stroke={INK} strokeWidth="2.5" />
      <rect x="150" y="352" width="40" height="176" fill="#8A7FB8" stroke={INK} strokeWidth="2.5" />
      <rect x="153" y="358" width="34" height="168" fill="url(#twLitA)" />
      <rect x="226" y="300" width="54" height="228" fill="url(#twBoz)" stroke={INK} strokeWidth="2.5" />
      <path d="M228 316H278M228 332H278M228 348H278M228 364H278M228 380H278M228 396H278M228 412H278M228 428H278M228 444H278M228 460H278M228 476H278" stroke="#215462" strokeWidth="2" />
      <path d="M232 304L232 524" stroke="#B8E8EC" strokeWidth="3" opacity=".7" />
      <rect x="232" y="290" width="42" height="12" fill="#C8873E" stroke={INK} strokeWidth="2.5" />
      <rect x="240" y="282" width="26" height="9" fill="#C8873E" stroke={INK} strokeWidth="2.5" />
      <rect x="292" y="232" width="48" height="296" fill="url(#twFins)" stroke={INK} strokeWidth="2.5" />
      <rect x="292" y="232" width="48" height="10" fill="#E6E0F2" stroke={INK} strokeWidth="2.5" />
      <rect x="299" y="220" width="34" height="13" fill="#D8D2E8" stroke={INK} strokeWidth="2.5" />
      <path d="M316 220V194" stroke={INK} strokeWidth="2.5" />
      <circle cx="316" cy="193" r="3" fill="#FF4040" stroke={INK} strokeWidth="1.5" />
      <rect x="342" y="340" width="48" height="190" fill="#6E5FA6" stroke={INK} strokeWidth="2.5" />
      <rect x="345" y="346" width="42" height="180" fill="url(#twLitB)" opacity=".85" />
      <path d="M340 342Q366 326 392 342" fill="#8A7FB8" stroke={INK} strokeWidth="2.5" />
      {/* clock tower */}
      <rect x="190" y="440" width="40" height="88" fill="#E8D9B8" stroke={INK} strokeWidth="2.5" />
      <rect x="202" y="404" width="16" height="40" fill="#E8D9B8" stroke={INK} strokeWidth="2.5" />
      <path d="M200 405L210 392L220 405Z" fill="#C8342C" stroke={INK} strokeWidth="2" />
      <circle cx="210" cy="418" r="5" fill="#FFFFFF" stroke={INK} strokeWidth="1.8" />
      <path d="M210 418V415M210 418H213" stroke={INK} strokeWidth="1.2" />
      <path d="M196 452H224M196 466H224M196 480H224" stroke="#C8B48E" strokeWidth="3" />
      {/* shopfronts */}
      <g stroke={INK} strokeWidth="2">
        <rect x="-150" y="490" width="50" height="38" fill="#9AC87A" />
        <rect x="-100" y="486" width="54" height="42" fill="#E8C547" />
        <rect x="-46" y="492" width="46" height="36" fill="#D96A8A" />
        <rect x="0" y="488" width="44" height="40" fill="#E8874A" />
        <rect x="44" y="492" width="50" height="36" fill="#F0EFE6" />
        <rect x="94" y="486" width="46" height="42" fill="#2F9C95" />
        <rect x="140" y="492" width="52" height="36" fill="#E8C547" />
        <rect x="236" y="490" width="50" height="38" fill="#D96A8A" />
        <rect x="286" y="486" width="50" height="42" fill="#9AC87A" />
        <rect x="336" y="492" width="54" height="36" fill="#F0EFE6" />
        <rect x="390" y="488" width="48" height="40" fill="#2F9C95" />
        <rect x="438" y="492" width="52" height="36" fill="#E8874A" />
        <rect x="490" y="486" width="56" height="42" fill="#F0EFE6" />
      </g>
      <g>
        <rect x="-150" y="490" width="50" height="7" fill="#C8342C" />
        <rect x="-100" y="486" width="54" height="7" fill="#1E63E6" />
        <rect x="-46" y="492" width="46" height="7" fill="#FFD21F" />
        <rect x="0" y="488" width="44" height="7" fill="#C8342C" />
        <rect x="44" y="492" width="50" height="7" fill="#1E63E6" />
        <rect x="94" y="486" width="46" height="7" fill="#F2F2F2" />
        <rect x="140" y="492" width="52" height="7" fill="#43C21A" />
        <rect x="236" y="490" width="50" height="7" fill="#FFD21F" />
        <rect x="286" y="486" width="50" height="7" fill="#C8342C" />
        <rect x="336" y="492" width="54" height="7" fill="#1E63E6" />
        <rect x="390" y="488" width="48" height="7" fill="#F2F2F2" />
        <rect x="438" y="492" width="52" height="7" fill="#43C21A" />
        <rect x="490" y="486" width="56" height="7" fill="#C8342C" />
      </g>
      <g fill={INK} opacity=".75">
        <rect x="-138" y="504" width="24" height="12" />
        <rect x="-88" y="500" width="12" height="18" />
        <rect x="-36" y="506" width="22" height="12" />
        <rect x="10" y="502" width="12" height="16" />
        <rect x="56" y="506" width="24" height="12" />
        <rect x="104" y="500" width="10" height="20" />
        <rect x="152" y="506" width="26" height="12" />
        <rect x="246" y="504" width="12" height="16" />
        <rect x="298" y="500" width="24" height="12" />
        <rect x="348" y="506" width="12" height="16" />
        <rect x="402" y="502" width="24" height="12" />
        <rect x="450" y="506" width="12" height="16" />
        <rect x="502" y="500" width="24" height="14" />
      </g>
      <g stroke={INK} strokeWidth="2">
        <rect x="74" y="474" width="4" height="40" fill="#5A3A22" />
        <circle cx="76" cy="470" r="13" fill="#3A8044" />
        <circle cx="68" cy="464" r="8" fill="#4E9A52" />
        <rect x="282" y="476" width="4" height="40" fill="#5A3A22" />
        <circle cx="284" cy="472" r="12" fill="#3A8044" />
        <circle cx="292" cy="466" r="8" fill="#4E9A52" />
        <rect x="372" y="478" width="4" height="40" fill="#5A3A22" />
        <circle cx="374" cy="474" r="11" fill="#3A8044" />
        <rect x="-62" y="476" width="4" height="40" fill="#5A3A22" />
        <circle cx="-60" cy="472" r="12" fill="#3A8044" />
        <circle cx="-52" cy="466" r="8" fill="#4E9A52" />
        <rect x="462" y="478" width="4" height="40" fill="#5A3A22" />
        <circle cx="464" cy="474" r="11" fill="#3A8044" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------- building site
// Ground strip + the props by the tower: foundation slab, cement bags, bricks,
// sand pile, a hard hat, and the site worker in a hi-vis vest. Bottom-anchored.
const P = (s) => ({ position: 'absolute', boxSizing: 'border-box', ...s });
export function SiteProps() {
  return (
    <>
      <div style={P({ left: 106, bottom: 34, width: 178, height: 12, background: 'linear-gradient(180deg, #B8B4AC, #8A8A92)', border: `3px solid ${INK}`, borderRadius: 2 })} />
      <div style={P({ left: 28, bottom: 36, width: 50, height: 16, background: '#A8A49C', border: `3px solid ${INK}`, borderRadius: 2, boxShadow: 'inset 0 3px 0 rgba(255,255,255,.3)' })} />
      <div style={P({ left: 80, bottom: 38, width: 22, height: 20 })}>
        <div style={P({ left: 0, bottom: 0, width: 22, height: 6, background: '#B5532E', border: `2px solid ${INK}` })} />
        <div style={P({ left: 0, bottom: 6, width: 22, height: 6, background: '#A84A28', border: `2px solid ${INK}` })} />
        <div style={P({ left: 3, bottom: 12, width: 16, height: 6, background: '#BE5C34', border: `2px solid ${INK}` })} />
      </div>
      <div style={P({ left: 290, bottom: 38, width: 58, height: 24, background: INK, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' })} />
      <div style={P({ left: 294, bottom: 40, width: 50, height: 19, background: 'linear-gradient(180deg, #F0D29A, #D9B176)', clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' })} />
      <div style={P({ left: 330, bottom: 38, width: 20, height: 12, background: '#EDE8DC', border: `2px solid ${INK}`, borderRadius: 4 })}>
        <div style={P({ left: 2, right: 2, top: 3, height: 3, background: '#E3261E' })} />
      </div>
      <div style={P({ left: 356, bottom: 38, width: 18, height: 40 })}>
        <div style={P({ left: 4, bottom: 0, width: 4, height: 12, background: '#2A3A6A' })} />
        <div style={P({ left: 10, bottom: 0, width: 4, height: 12, background: '#2A3A6A' })} />
        <div style={P({ left: 2, bottom: 11, width: 14, height: 15, background: '#FF8A1F', border: `2px solid ${INK}`, borderRadius: 3 })} />
        <div style={P({ left: 3, bottom: 17, width: 12, height: 2, background: '#FFF6C0' })} />
        <div style={P({ left: 4, bottom: 25, width: 10, height: 10, borderRadius: '50%', background: '#5A3420' })} />
        <div style={P({ left: 2, bottom: 31, width: 14, height: 7, borderRadius: '7px 7px 1px 1px', background: '#FFD21F', border: `2px solid ${INK}` })} />
      </div>
    </>
  );
}

// ---------------------------------------------------------------- crane
// Yellow lattice tower crane: mast down the left (to the bottom of the world),
// jib across the top with the counterweights, cab with the driver, and the
// red BWANABET BUILD sign. Top-anchored; H = world height.
export function Crane({ W, H, ox }) {
  return (
    <svg width={W} height={H} viewBox={`${-ox} 0 ${W} ${H}`} aria-hidden style={{ position: 'absolute', left: 0, top: 0 }}>
      <defs>
        <pattern id="twMast" x="40" y="62" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M0 0L26 26M0 26L26 0M0 0H26" stroke={INK} strokeWidth="5" fill="none" />
          <path d="M0 0L26 26M0 26L26 0" stroke="#FFD21F" strokeWidth="2.2" fill="none" />
          <path d="M0 0H26" stroke="#E0A300" strokeWidth="2.4" fill="none" />
        </pattern>
        <pattern id="twJib" x="0" y="27" width="22" height="15" patternUnits="userSpaceOnUse">
          <path d="M0 15L11 0L22 15" stroke={INK} strokeWidth="4.6" fill="none" />
          <path d="M0 15L11 0L22 15" stroke="#FFD21F" strokeWidth="2.2" fill="none" />
        </pattern>
      </defs>
      <path d="M53 4L384 27M53 4L4 27" stroke={INK} strokeWidth="2" fill="none" />
      <path d="M40 27L53 3L66 27" stroke={INK} strokeWidth="7" fill="none" strokeLinejoin="round" />
      <path d="M40 27L53 3L66 27" stroke="#FFD21F" strokeWidth="3.4" fill="none" strokeLinejoin="round" />
      <path d="M46 27L53 14L60 27" stroke="#E0A300" strokeWidth="2" fill="none" />
      <circle cx="53" cy="4" r="3.6" fill="#FF4040" stroke={INK} strokeWidth="1.5" />
      <rect x="0" y="27" width="386" height="15" fill="url(#twJib)" />
      <path d="M0 27H386M0 42H386" stroke={INK} strokeWidth="7" fill="none" />
      <path d="M0 27H386M0 42H386" stroke="#FFD21F" strokeWidth="3.4" fill="none" />
      <rect x="380" y="24" width="8" height="21" rx="2" fill="#E0A300" stroke={INK} strokeWidth="2.5" />
      <rect x="3" y="43" width="22" height="13" rx="2" fill="#B8B4AC" stroke={INK} strokeWidth="2.5" />
      <rect x="3" y="56" width="22" height="13" rx="2" fill="#A8A49C" stroke={INK} strokeWidth="2.5" />
      <path d="M7 49H21M7 62H21" stroke="#7A766E" strokeWidth="2" />
      <rect x="40" y="62" width="26" height={Math.max(0, H - 62)} fill="url(#twMast)" />
      <path d={`M40 60V${H}M66 60V${H}`} stroke={INK} strokeWidth="7" fill="none" />
      <path d={`M40 60V${H}M66 60V${H}`} stroke="#FFD21F" strokeWidth="3.4" fill="none" />
      <rect x="34" y="42" width="38" height="9" rx="2" fill="#3A3A44" stroke={INK} strokeWidth="2.5" />
      <rect x="36" y="51" width="34" height="9" fill="#E0A300" stroke={INK} strokeWidth="2.5" />
      {/* cab + driver */}
      <rect x="68" y="43" width="32" height="24" rx="4" fill="#F4F1E8" stroke={INK} strokeWidth="3" />
      <rect x="74" y="47" width="22" height="12" rx="2" fill="#7FC3EA" stroke={INK} strokeWidth="2" />
      <path d="M76 49L82 49L77 56Z" fill="#CFEAF8" />
      <circle cx="87" cy="55" r="3.4" fill="#4A2C1C" />
      <path d="M83 53.5Q87 48.5 91 53.5Z" fill="#FFD21F" stroke={INK} strokeWidth="1" />
      <rect x="72" y="61" width="24" height="3" fill="#E3261E" />
      {/* sign */}
      <rect x="230" y="44" width="104" height="17" rx="3" fill="#E3261E" stroke={INK} strokeWidth="2.5" />
      <path d="M244 42V44M320 42V44" stroke={INK} strokeWidth="2" />
      <text x="282" y="56.5" textAnchor="middle" fill="#FFFFFF" fontFamily="var(--font-game), 'Lilita One', system-ui, sans-serif" fontSize="11" letterSpacing=".5">BWANABET BUILD</text>
      {/* trolley */}
      <rect x="181" y="40" width="28" height="9" rx="2" fill="#3A3A44" stroke={INK} strokeWidth="2.5" />
      <circle cx="186" cy="40" r="3" fill="#8A8A92" stroke={INK} strokeWidth="1.5" />
      <circle cx="204" cy="40" r="3" fill="#8A8A92" stroke={INK} strokeWidth="1.5" />
    </svg>
  );
}

// ---------------------------------------------------------------- hook
// The swinging hook block with the next floor on four BLACK slings (white
// underlay so they read on the dark sky). 150 wide, hangs from the trolley.
export function Hook({ left, piece }) {
  return (
    <div className="tw-swing" aria-hidden style={{ position: 'absolute', left, top: 49, width: 150, height: 150 }}>
      <svg width="150" height="106" viewBox="0 0 150 106" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        <path d="M71 0V62M79 0V62" stroke="rgba(255,255,255,.6)" strokeWidth="5" />
        <path d="M71 0V62M79 0V62" stroke="#000000" strokeWidth="2.8" />
        <rect x="61" y="60" width="28" height="20" rx="5" fill="#FFD21F" stroke={INK} strokeWidth="3" />
        <path d="M64 66H86M64 72H86" stroke="#E0A300" strokeWidth="2.4" />
        <circle cx="75" cy="69" r="3" fill={INK} />
        <path d="M75 80V86M75 86Q66 86 67 93Q69 99 75 98" stroke={INK} strokeWidth="3.6" fill="none" strokeLinecap="round" />
        <path d="M75 92L6 106M75 92L144 106" stroke="rgba(255,255,255,.6)" strokeWidth="5" />
        <path d="M75 92L6 106M75 92L144 106" stroke="#000000" strokeWidth="2.8" />
      </svg>
      <div style={{ position: 'absolute', left: 0, top: 104, width: 150, height: 44 }}>
        <Floor f={piece} />
      </div>
    </div>
  );
}
