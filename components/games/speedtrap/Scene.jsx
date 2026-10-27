'use client';

import React, { useState, useLayoutEffect } from 'react';
import { CANDY } from '../candy/tokens';

// Speed Trap — the road scene (owner-approved design Speed.dc.html, 2026-10-27):
// a sunset sky, hills with a BwanaBet billboard + a village shop (far layer),
// street lights, a GREAT EAST RD sign and an 80 speed sign (near layer), a
// three-lane road and the blue minibus. When the bus is stopped a plain police
// officer (navy uniform + cap, hi-vis vest, STOP paddle, speed gun; NO agency
// name or badge) steps in from the right.
// Scene units: the road starts at y = RT; the viewBox always keeps the full
// 390-wide road and grows upward (more sky) to fit the box.

export const VB_W = 390;
export const RT = 200;            // road top
export const VB_B = RT + 112;     // bottom of the scene
const MIN_H = 240;
const FD = "Nunito, 'Arial Black', sans-serif";

export const SCENE_CSS = `
  .st-spin { transform-box: fill-box; transform-origin: 50% 50%; animation: stSpin .28s linear infinite }
  @keyframes stSpin { to { transform: rotate(360deg) } }
  .st-bob { animation: stBob .32s ease-in-out infinite alternate }
  @keyframes stBob { from { transform: translateY(0) } to { transform: translateY(-2px) } }
  .st-brake { animation: stBrake .6s cubic-bezier(.2,.8,.3,1) both }
  @keyframes stBrake { 0% { transform: translateX(-30px) rotate(0) } 45% { transform: translateX(6px) rotate(2deg) } 100% { transform: translateX(0) rotate(0) } }
  .st-off { animation: stOff 1.4s .2s cubic-bezier(.5,0,.9,.5) both }
  @keyframes stOff { to { transform: translateX(560px) } }
  .st-in { animation: stIn .55s cubic-bezier(.2,.9,.3,1) both }
  @keyframes stIn { from { transform: translateX(-420px) } to { transform: translateX(0) } }
  .st-cop { animation: stCop .5s cubic-bezier(.2,1.4,.4,1) both }
  @keyframes stCop { from { transform: translateX(160px) } to { transform: translateX(0) } }
  .st-puff { transform-box: fill-box; transform-origin: 50% 50%; animation: stPuff .6s ease-out infinite }
  @keyframes stPuff { from { transform: translateX(0) scale(.6); opacity: .8 } to { transform: translateX(-26px) scale(1.4); opacity: 0 } }
  .st-pop { animation: stPop .35s cubic-bezier(.2,1.6,.4,1) both }
  @keyframes stPop { from { transform: scale(.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  @media (prefers-reduced-motion: reduce) { .st-spin, .st-bob, .st-brake, .st-off, .st-in, .st-cop, .st-puff, .st-pop { animation: none } }
`;

// Keep the whole road in view: width 390, taller boxes show more sky.
export function useRoadViewBox(ref) {
  const [vb, setVb] = useState(`0 ${VB_B - 330} ${VB_W} 330`);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      let vh = (VB_W * h) / w;
      if (vh >= MIN_H) { setVb(`0 ${(VB_B - vh).toFixed(2)} ${VB_W} ${vh.toFixed(2)}`); return; }
      vh = MIN_H;
      const vw = (MIN_H * w) / h;
      setVb(`${((VB_W - vw) / 2).toFixed(2)} ${VB_B - MIN_H} ${vw.toFixed(2)} ${MIN_H}`);
    };
    fit();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return vb;
}

function FarStrip() {
  return (
    <g>
      <path d="M0 96Q40 70 90 86T190 80T290 74T390 92V140H0Z" fill="#5A2F6E" />
      <path d="M0 110Q60 92 120 104T250 98T390 106V140H0Z" fill="#4A2560" />
      <path d="M30 140L44 44L58 140M36 100H52M39 76H49M44 44L20 60M44 44L68 60" stroke="#2A0A4F" strokeWidth="2.4" fill="none" />
      <path d="M20 60Q120 52 200 62" stroke="#2A0A4F" strokeWidth="1" fill="none" />
      <rect x="118" y="70" width="70" height="34" rx="2" fill="#E3261E" stroke="#2A0A4F" strokeWidth="2.5" />
      <text x="153" y="85" textAnchor="middle" fill="#FFD21F" style={{ fontFamily: CANDY.display }} fontSize="11">BWANABET</text>
      <text x="153" y="98" textAnchor="middle" fill="#FFFFFF" fontFamily={FD} fontWeight="900" fontSize="8">BONUS CENTER</text>
      <path d="M132 104V128M174 104V128" stroke="#2A0A4F" strokeWidth="3" />
      <rect x="226" y="98" width="40" height="30" fill="#E8C547" stroke="#2A0A4F" strokeWidth="2.5" />
      <path d="M222 99L246 88L270 99Z" fill="#8A8A92" stroke="#2A0A4F" strokeWidth="2.5" />
      <rect x="232" y="106" width="14" height="12" fill="#3A2A5E" />
      <rect x="250" y="106" width="10" height="22" fill="#6A4A32" />
      <rect x="226" y="98" width="40" height="5" fill="#43C21A" />
      <path d="M318 128V96" stroke="#5A3A22" strokeWidth="4" />
      <circle cx="318" cy="88" r="16" fill="#2F6A3A" stroke="#2A0A4F" strokeWidth="2" />
      <circle cx="308" cy="80" r="10" fill="#3A8044" />
      <path d="M352 128V104" stroke="#5A3A22" strokeWidth="3" />
      <circle cx="352" cy="98" r="11" fill="#3A8044" stroke="#2A0A4F" strokeWidth="2" />
    </g>
  );
}

function NearStrip() {
  return (
    <g>
      <path d="M60 70V8M60 8H78" stroke="#2A0A4F" strokeWidth="3.5" fill="none" />
      <rect x="74" y="6" width="10" height="5" rx="2" fill="#FFE9A8" stroke="#2A0A4F" strokeWidth="1.5" />
      <rect x="128" y="18" width="62" height="26" rx="3" fill="#1F7A3A" stroke="#F2F2F2" strokeWidth="2" />
      <text x="159" y="30" textAnchor="middle" fill="#FFFFFF" fontFamily={FD} fontWeight="900" fontSize="8">GREAT EAST RD</text>
      <text x="159" y="40" textAnchor="middle" fill="#FFFFFF" fontFamily={FD} fontWeight="800" fontSize="7">CHELSTON 4</text>
      <path d="M142 44V70M176 44V70" stroke="#8A8A92" strokeWidth="3" />
      <circle cx="268" cy="36" r="13" fill="#FFFFFF" stroke="#E3261E" strokeWidth="4" />
      <text x="268" y="40" textAnchor="middle" fill="#1A1A1A" style={{ fontFamily: CANDY.display }} fontSize="12">80</text>
      <path d="M268 49V70" stroke="#8A8A92" strokeWidth="3" />
      <path d="M340 70V8M340 8H322" stroke="#2A0A4F" strokeWidth="3.5" fill="none" />
      <rect x="316" y="6" width="10" height="5" rx="2" fill="#FFE9A8" stroke="#2A0A4F" strokeWidth="1.5" />
    </g>
  );
}

// Three copies so a wider-than-390 view never shows a gap.
const COPIES = [-VB_W, 0, VB_W, 2 * VB_W];

export function Wheel({ cx, spin }) {
  return (
    <>
      <circle cx={cx} cy="96" r="17" fill="#1A1A1A" stroke="#2A0A4F" strokeWidth="2" />
      <g className={spin ? 'st-spin' : undefined}>
        <circle cx={cx} cy="96" r="9" fill="#C8C8D0" stroke="#2A0A4F" strokeWidth="2" />
        <path d={`M${cx} 88V104M${cx - 8} 96H${cx + 8}M${cx - 5.5} 90.5L${cx + 5.5} 101.5M${cx + 5.5} 90.5L${cx - 5.5} 101.5`} stroke="#6A6A78" strokeWidth="2" />
      </g>
    </>
  );
}

// The blue minibus with luggage on the roof and the conductor in the door
// (230 × 118 local units, wheels touching y ≈ 113).
export function Minibus({ spin = false, puff = false }) {
  return (
    <g>
      <ellipse cx="116" cy="111" rx="104" ry="6" fill="rgba(0,0,0,.35)" />
      <circle className={puff ? 'st-puff' : undefined} cx="6" cy="94" r="7" fill="rgba(230,230,240,.7)" opacity={puff ? 1 : 0} />
      <path d="M26 6H54M70 6H120M136 6H180" stroke="#2A0A4F" strokeWidth="3" />
      <path d="M28 6V14M178 6V14M78 6V14M128 6V14" stroke="#2A0A4F" strokeWidth="2.5" />
      <rect x="34" y="-6" width="30" height="13" rx="3" fill="#C8342C" stroke="#2A0A4F" strokeWidth="2.5" />
      <path d="M40 -6V7M58 -6V7" stroke="#8E2018" strokeWidth="2" />
      <rect x="70" y="-12" width="44" height="19" rx="2" fill="#E8874A" stroke="#2A0A4F" strokeWidth="2.5" />
      <path d="M70 -2H114M81 -12V7M92 -12V7M103 -12V7" stroke="#B85A28" strokeWidth="2" />
      <circle cx="86" cy="-15" r="4" fill="#FFFFFF" stroke="#2A0A4F" strokeWidth="1.5" />
      <path d="M88 -18L91 -19L89 -15Z" fill="#E3261E" />
      <circle cx="99" cy="-14" r="4" fill="#FFFFFF" stroke="#2A0A4F" strokeWidth="1.5" />
      <path d="M101 -17L104 -18L102 -14Z" fill="#E3261E" />
      <rect x="122" y="-4" width="38" height="11" rx="5" fill="#43C21A" stroke="#2A0A4F" strokeWidth="2.5" />
      <path d="M130 -4V7M150 -4V7" stroke="#2A7D0E" strokeWidth="2" />
      <path d="M16 18Q16 12 24 12H176Q188 12 196 22L214 52Q220 60 220 70V92Q220 98 214 98H20Q12 98 12 90V24Q12 18 16 18Z" fill="#1E63E6" stroke="#2A0A4F" strokeWidth="3.5" />
      <path d="M14 20Q16 14 24 14H176Q186 14 193 22L200 34H14Z" fill="#F4F4F2" />
      <path d="M14 58H218" stroke="#FFD21F" strokeWidth="4" />
      <path d="M14 62H218" stroke="#F4F4F2" strokeWidth="3" />
      <rect x="22" y="22" width="26" height="22" rx="3" fill="#2A3A5A" stroke="#2A0A4F" strokeWidth="2.5" />
      <rect x="52" y="22" width="26" height="22" rx="3" fill="#2A3A5A" stroke="#2A0A4F" strokeWidth="2.5" />
      <rect x="128" y="22" width="26" height="22" rx="3" fill="#2A3A5A" stroke="#2A0A4F" strokeWidth="2.5" />
      <rect x="158" y="22" width="22" height="22" rx="3" fill="#2A3A5A" stroke="#2A0A4F" strokeWidth="2.5" />
      <path d="M184 22H194L208 50H184Z" fill="#3E5A80" stroke="#2A0A4F" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M188 25L196 25L190 36Z" fill="#9FD3F2" />
      <rect x="190" y="38" width="14" height="7" rx="1" fill="#FFD21F" stroke="#2A0A4F" strokeWidth="1.2" />
      <text x="197" y="44" textAnchor="middle" fill="#2A0A4F" fontFamily={FD} fontWeight="900" fontSize="5">TOWN</text>
      <circle cx="30" cy="37" r="5" fill="#5A3420" />
      <circle cx="42" cy="38" r="5" fill="#3B2216" />
      <circle cx="64" cy="37" r="5" fill="#6A4028" />
      <circle cx="140" cy="37" r="5" fill="#4A2C1C" />
      <circle cx="168" cy="38" r="5" fill="#5A3420" />
      <path d="M25 25L31 25L26 32Z M55 25L61 25L56 32Z M131 25L137 25L132 32Z M161 25L167 25L162 32Z" fill="rgba(255,255,255,.35)" />
      <rect x="84" y="20" width="38" height="70" rx="2" fill="#16203A" stroke="#2A0A4F" strokeWidth="3" />
      <path d="M84 24H122" stroke="#2A0A4F" strokeWidth="2" />
      <path d="M100 56Q92 50 90 38" stroke="#4A2C1C" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M91 40L84 30" stroke="#4A2C1C" strokeWidth="5" strokeLinecap="round" />
      <rect x="94" y="48" width="18" height="24" rx="4" fill="#FFD21F" stroke="#2A0A4F" strokeWidth="2.5" />
      <path d="M96 72V88M108 72V88" stroke="#2A3A6A" strokeWidth="6" />
      <circle cx="103" cy="40" r="7" fill="#4A2C1C" stroke="#2A0A4F" strokeWidth="2" />
      <path d="M95 37Q103 29 111 37Z" fill="#E3261E" stroke="#2A0A4F" strokeWidth="1.5" />
      <path d="M104 37H114" stroke="#E3261E" strokeWidth="3" />
      <rect x="80" y="50" width="6" height="7" rx="1" fill="#F2F2F2" stroke="#2A0A4F" strokeWidth="1.2" />
      <rect x="208" y="62" width="12" height="9" rx="3" fill="#FFE9A8" stroke="#2A0A4F" strokeWidth="2.5" />
      <rect x="202" y="84" width="22" height="9" rx="3" fill="#B8B4AC" stroke="#2A0A4F" strokeWidth="2.5" />
      <rect x="150" y="70" width="34" height="11" rx="1.5" fill="#FFFFFF" stroke="#2A0A4F" strokeWidth="2" />
      <text x="167" y="79" textAnchor="middle" fill="#1A1A1A" fontFamily={FD} fontWeight="900" fontSize="8">BAX 2025</text>
      <rect x="16" y="84" width="10" height="7" rx="1" fill="#E3261E" stroke="#2A0A4F" strokeWidth="1.5" />
      <Wheel cx={54} spin={spin} />
      <Wheel cx={176} spin={spin} />
    </g>
  );
}

// A plain police officer: navy uniform + cap, plain hi-vis vest, STOP paddle
// raised, speed gun in the other hand (90 × 120 local units). No agency name.
export function Officer() {
  return (
    <g>
      <ellipse cx="44" cy="116" rx="22" ry="4" fill="rgba(0,0,0,.35)" />
      <path d="M36 84V114M50 84V114" stroke="#1E2A4A" strokeWidth="9" strokeLinecap="round" />
      <path d="M30 116H40M46 116H58" stroke="#111" strokeWidth="5" strokeLinecap="round" />
      <rect x="28" y="44" width="32" height="44" rx="8" fill="#2A3A6A" stroke="#2A0A4F" strokeWidth="3" />
      <path d="M30 50H58V86H30Z" fill="#E8FF3A" opacity=".92" />
      <path d="M30 62H58M30 74H58" stroke="#C8C8D0" strokeWidth="3" />
      <path d="M36 66H52" stroke="#1E2A4A" strokeWidth="1.5" />
      <path d="M30 52Q14 40 8 22" stroke="#4A2C1C" strokeWidth="7" strokeLinecap="round" fill="none" />
      <path d="M30 52Q14 40 8 22" stroke="#2A3A6A" strokeWidth="7" strokeLinecap="round" fill="none" strokeDasharray="16 40" />
      <rect x="-6" y="-2" width="26" height="26" rx="13" fill="#E3261E" stroke="#2A0A4F" strokeWidth="3" />
      <rect x="-3" y="1" width="20" height="20" rx="10" fill="none" stroke="#FFFFFF" strokeWidth="1.5" />
      <text x="7" y="15" textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: CANDY.display }} fontSize="8">STOP</text>
      <path d="M58 56Q66 62 64 72" stroke="#2A3A6A" strokeWidth="7" strokeLinecap="round" fill="none" />
      <rect x="54" y="66" width="22" height="10" rx="2" fill="#2A2A34" stroke="#2A0A4F" strokeWidth="2" transform="rotate(-12 64 70)" />
      <rect x="60" y="78" width="5" height="9" fill="#2A2A34" transform="rotate(-12 64 70)" />
      <circle cx="44" cy="34" r="12" fill="#4A2C1C" stroke="#2A0A4F" strokeWidth="2.5" />
      <path d="M30 26Q44 12 58 26Z" fill="#2A3A6A" stroke="#2A0A4F" strokeWidth="2.5" />
      <rect x="30" y="24" width="28" height="6" rx="2" fill="#1E2A4A" stroke="#2A0A4F" strokeWidth="2" />
      <circle cx="44" cy="20" r="2.5" fill="#FFD21F" />
    </g>
  );
}

// The whole scene. `refs` = { far, near, curb, dash, lines } — the game moves
// the parallax layers / road paint and shows the speed lines per frame.
export default function RoadScene({ viewBox, refs, busCls, bob, moving, cop }) {
  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMax meet" aria-hidden
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
      <defs>
        <linearGradient id="stp-sky" gradientUnits="userSpaceOnUse" x1="0" y1="-204" x2="0" y2="356">
          <stop offset="0" stopColor="#2B0F5E" />
          <stop offset=".48" stopColor="#6A2F7A" />
          <stop offset=".78" stopColor="#E07A4A" />
          <stop offset=".92" stopColor="#F6B860" />
        </linearGradient>
        <radialGradient id="stp-sun">
          <stop offset=".38" stopColor="#FFE9A8" />
          <stop offset=".4" stopColor="rgba(255,210,120,.35)" />
          <stop offset=".7" stopColor="rgba(255,210,120,0)" />
        </radialGradient>
        <linearGradient id="stp-tar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#44444E" />
          <stop offset="1" stopColor="#2E2E36" />
        </linearGradient>
        <pattern id="stp-curb" ref={refs.curb} width="40" height="8" patternUnits="userSpaceOnUse">
          <rect width="20" height="8" fill="#F2F2F2" />
          <rect x="20" width="20" height="8" fill="#1A1A1A" />
        </pattern>
        <pattern id="stp-dash" ref={refs.dash} width="60" height="5" patternUnits="userSpaceOnUse">
          <rect width="30" height="5" fill="#F2F2F2" />
        </pattern>
      </defs>
      <rect x="-800" y="-800" width="2000" height={800 + VB_B} fill="#2B0F5E" />
      <rect x="-800" y="-204" width="2000" height={204 + VB_B} fill="url(#stp-sky)" />
      <circle cx="275" cy="91" r="45" fill="url(#stp-sun)" />

      <g ref={refs.far}>
        {COPIES.map(x => <g key={x} transform={`translate(${x} ${RT - 136})`}><FarStrip /></g>)}
      </g>
      <g ref={refs.near}>
        {COPIES.map(x => <g key={x} transform={`translate(${x} ${RT - 64})`}><NearStrip /></g>)}
      </g>

      {/* the road: curb, tar, centre line, curb, dirt */}
      <g transform={`translate(0 ${RT})`}>
        <rect x="-800" y="0" width="2000" height="104" fill="url(#stp-tar)" />
        <rect x="-800" y="0" width="2000" height="8" fill="url(#stp-curb)" />
        <rect x="-800" y="8" width="2000" height="2" fill="#1A1A22" />
        <rect x="-800" y="46" width="2000" height="5" fill="url(#stp-dash)" />
        <rect x="-800" y="96" width="2000" height="6" fill="url(#stp-curb)" />
        <rect x="-800" y="102" width="2000" height="20" fill="#A8673A" />
        <rect x="-800" y="102" width="2000" height="3" fill="#C98450" />
      </g>

      {/* speed lines behind the bus */}
      <g ref={refs.lines} style={{ display: 'none' }} transform={`translate(0 ${RT + 16})`}>
        <rect x="6" y="10" width="48" height="3" rx="1.5" fill="rgba(255,255,255,.55)" />
        <rect x="18" y="28" width="40" height="3" rx="1.5" fill="rgba(255,255,255,.4)" />
        <rect x="0" y="46" width="54" height="3" rx="1.5" fill="rgba(255,255,255,.5)" />
      </g>

      <g transform={`translate(64 ${RT - 22})`}>
        <g className={busCls || undefined}>
          <g className={bob ? 'st-bob' : undefined}>
            <Minibus spin={moving} puff={moving} />
          </g>
        </g>
      </g>

      {cop && (
        <g transform={`translate(296 ${RT - 108})`}>
          <g className="st-cop"><Officer /></g>
        </g>
      )}
    </svg>
  );
}
