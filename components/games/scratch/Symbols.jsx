'use client';

import React from 'react';

// The 6 Scratch Card symbols, drawn in code: chunky dark-purple outlines, bright
// glossy candy fills (100×100 viewBox). Gradients live once in <SymbolDefs/>
// (render it once per screen, never display:none — Chrome drops gradients from
// a hidden svg), so every <SymbolArt/> instance can reference them.
// Ladder (lib/scratch/odds.mjs): maize 1.2x · mango 1.5x · bream 2x · drum 2.5x
// · fish-eagle feather 3x · gold crown 4x.

const O = '#2A0A4F';
const SW = 4.5;
const line = { stroke: O, strokeWidth: SW, strokeLinejoin: 'round', strokeLinecap: 'round' };

export function SymbolDefs() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <defs>
        <linearGradient id="scMaize" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FFC21A" /><stop offset=".45" stopColor="#FFE873" /><stop offset="1" stopColor="#F2A300" /></linearGradient>
        <linearGradient id="scLeaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9BF06A" /><stop offset=".5" stopColor="#4CC423" /><stop offset="1" stopColor="#2A8A14" /></linearGradient>
        <radialGradient id="scMango" cx=".3" cy=".72" r=".9"><stop offset="0" stopColor="#FF4A2A" /><stop offset=".38" stopColor="#FF8A1F" /><stop offset=".7" stopColor="#FFD23A" /><stop offset="1" stopColor="#B8E04A" /></radialGradient>
        <radialGradient id="scMangoBlush" cx=".78" cy=".14" r=".42"><stop offset="0" stopColor="#7BD83A" stopOpacity=".95" /><stop offset="1" stopColor="#7BD83A" stopOpacity="0" /></radialGradient>
        <linearGradient id="scFish" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6FE3FF" /><stop offset=".55" stopColor="#2E8EF0" /><stop offset="1" stopColor="#1E4FD0" /></linearGradient>
        <linearGradient id="scFin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE45C" /><stop offset="1" stopColor="#FF8A1F" /></linearGradient>
        <linearGradient id="scWood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#B9561B" /><stop offset=".3" stopColor="#E08A3C" /><stop offset=".75" stopColor="#A3460F" /><stop offset="1" stopColor="#7A300A" /></linearGradient>
        <radialGradient id="scHide" cx=".45" cy=".4" r=".7"><stop offset="0" stopColor="#FFF4DC" /><stop offset="1" stopColor="#EBC888" /></radialGradient>
        <linearGradient id="scFeather" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#FFFFFF" /><stop offset=".3" stopColor="#FFE9C4" /><stop offset=".58" stopColor="#FF9A2E" /><stop offset=".85" stopColor="#D9541A" /><stop offset="1" stopColor="#8A2A0A" /></linearGradient>
        <linearGradient id="scGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF6C2" /><stop offset=".4" stopColor="#FFD21F" /><stop offset="1" stopColor="#E09400" /></linearGradient>
        <linearGradient id="scGoldBand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE16A" /><stop offset="1" stopColor="#C77F00" /></linearGradient>
      </defs>
    </svg>
  );
}

// Maize cob: kernels laid on rows inside the cob outline, husk leaves in front.
const COB = 'M50 8 C66 8 71 30 69 52 C67 70 60 80 50 82 C40 80 33 70 31 52 C29 30 34 8 50 8 Z';
const KERNELS = (() => {
  const out = [];
  for (let y = 15; y <= 74; y += 7.4) {
    const t = (y - 45) / 38;
    const half = 17.5 * Math.sqrt(Math.max(0, 1 - t * t)) - 3.5;
    const odd = Math.round((y - 15) / 7.4) % 2;
    for (let x = -18 + (odd ? 4.3 : 0); x <= 18; x += 8.6) {
      if (Math.abs(x) <= half) out.push([50 + x, y]);
    }
  }
  return out;
})();

function Maize() {
  return (
    <g>
      <path d={COB} fill="url(#scMaize)" {...line} />
      {KERNELS.map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx="3.7" ry="3.2" fill="#FFE873" stroke="#D98E00" strokeWidth="1.2" />
          <ellipse cx={x - 1} cy={y - 1.1} rx="1.3" ry="1" fill="#FFFBE0" />
        </g>
      ))}
      <path d="M48 95 C30 90 18 68 23 38 C33 56 40 68 53 80 Z" fill="url(#scLeaf)" {...line} />
      <path d="M52 95 C73 90 84 62 79 30 C69 52 60 69 47 80 Z" fill="url(#scLeaf)" {...line} />
      <path d="M30 52 C33 64 39 74 47 82" fill="none" stroke="#C8FFA8" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      <path d="M74 48 C71 62 64 74 55 82" fill="none" stroke="#C8FFA8" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      <path d="M50 94 L50 98" {...line} />
    </g>
  );
}

function Mango() {
  return (
    <g>
      <path d="M60 18 C82 18 94 40 88 62 C82 84 60 96 38 91 C18 86 8 70 12 56 C15 45 26 42 34 38 C44 33 46 18 60 18 Z" fill="url(#scMango)" {...line} />
      <path d="M60 18 C82 18 94 40 88 62 C82 84 60 96 38 91 C18 86 8 70 12 56 C15 45 26 42 34 38 C44 33 46 18 60 18 Z" fill="url(#scMangoBlush)" />
      <path d="M22 56 C26 50 32 48 38 46" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".6" />
      <ellipse cx="72" cy="40" rx="7" ry="4" transform="rotate(40 72 40)" fill="#fff" opacity=".55" />
      <path d="M60 19 C60 14 62 10 65 7" fill="none" stroke={O} strokeWidth="7" strokeLinecap="round" />
      <path d="M60 19 C60 14 62 10 65 7" fill="none" stroke="#7A4214" strokeWidth="3" strokeLinecap="round" />
      <path d="M64 11 C70 0 88 0 95 7 C88 17 72 19 64 11 Z" fill="url(#scLeaf)" {...line} />
      <path d="M68 11 C76 8 84 7 90 8" fill="none" stroke="#1F6E0E" strokeWidth="2" strokeLinecap="round" />
    </g>
  );
}

function Bream() {
  return (
    <g>
      <path d="M70 40 L92 22 C88 40 88 60 92 78 L70 62 Z" fill="url(#scFin)" {...line} />
      <path d="M28 36 C34 16 58 14 68 32 Z" fill="url(#scFin)" {...line} />
      <path d="M30 66 C38 82 54 82 60 70 Z" fill="url(#scFin)" {...line} />
      <path d="M10 52 C20 30 50 22 72 38 C78 44 78 58 72 64 C50 80 20 74 10 52 Z" fill="url(#scFish)" {...line} />
      <path d="M16 56 C30 70 54 70 70 60 C56 72 28 74 16 56 Z" fill="#BFF3FF" opacity=".75" />
      <path d="M42 30 C46 42 46 58 42 70 M54 30 C58 42 58 58 54 70" fill="none" stroke="#1A3FA8" strokeWidth="3" strokeLinecap="round" opacity=".38" />
      <path d="M34 36 C38 46 38 58 34 66" fill="none" stroke={O} strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="46" r="6.5" fill="#fff" stroke={O} strokeWidth="3" />
      <circle cx="22.5" cy="46.5" r="3.4" fill={O} />
      <circle cx="21.3" cy="45" r="1.2" fill="#fff" />
      <path d="M12 55 C15 57 18 57 20 55" fill="none" stroke={O} strokeWidth="2.6" strokeLinecap="round" />
      <ellipse cx="46" cy="36" rx="10" ry="3.2" fill="#fff" opacity=".55" transform="rotate(-8 46 36)" />
    </g>
  );
}

function Drum() {
  return (
    <g>
      <path d="M19 30 C19 52 27 72 34 87 L66 87 C73 72 81 52 81 30 Z" fill="url(#scWood)" {...line} />
      <path d="M22 48 C40 54 60 54 78 48 L76 60 C60 66 40 66 24 60 Z" fill="#E3261E" stroke={O} strokeWidth="3" strokeLinejoin="round" />
      <path d="M25 55 L31 50 L37 57 L43 51 L50 58 L57 51 L63 57 L69 50 L75 55" fill="none" stroke="#FFD21F" strokeWidth="2.8" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M22 34 L31 48 L40 36 L50 49 L60 36 L69 48 L78 34" fill="none" stroke="#FFF1D0" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M29 66 C31 74 33 80 36 85" fill="none" stroke="#FFC48A" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      <ellipse cx="50" cy="87" rx="16" ry="4.5" fill="#7A300A" {...line} strokeWidth="3.5" />
      <ellipse cx="50" cy="29" rx="31" ry="10" fill="url(#scHide)" {...line} />
      <ellipse cx="50" cy="29" rx="24" ry="6.5" fill="none" stroke="#D4A55C" strokeWidth="2" />
      <ellipse cx="42" cy="26.5" rx="7" ry="2.2" fill="#fff" opacity=".8" />
    </g>
  );
}

function Feather() {
  return (
    <g>
      <path d="M22 88 C14 62 30 26 80 8 C84 22 80 34 74 40 L80 42 C70 62 52 78 34 84 L38 76 C33 80 28 84 22 88 Z" fill="url(#scFeather)" {...line} />
      <path d="M30 70 C42 58 50 50 60 44 M34 58 C44 46 52 38 64 32 M44 72 C54 64 62 56 70 46 M40 46 C48 36 58 26 70 20" fill="none" stroke="#A8400F" strokeWidth="1.8" strokeLinecap="round" opacity=".45" />
      <path d="M16 96 C30 72 52 42 79 11" fill="none" stroke={O} strokeWidth="5" strokeLinecap="round" />
      <path d="M22 86 C34 68 52 44 75 16" fill="none" stroke="#FFF6E6" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M20 82 C16 78 15 72 18 68 M26 86 C24 80 26 76 30 74" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  );
}

function Crown() {
  return (
    <g>
      <path d="M18 70 L13 30 L33 47 L50 19 L67 47 L87 30 L82 70 Z" fill="url(#scGold)" {...line} />
      <path d="M50 26 L38 50 L22 40 L25 64" fill="none" stroke="#FFF8D6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" opacity=".85" />
      <rect x="16" y="64" width="68" height="18" rx="5" fill="url(#scGoldBand)" {...line} />
      <circle cx="13" cy="28" r="6" fill="url(#scGold)" {...line} strokeWidth="3.5" />
      <circle cx="50" cy="17" r="6.5" fill="url(#scGold)" {...line} strokeWidth="3.5" />
      <circle cx="87" cy="28" r="6" fill="url(#scGold)" {...line} strokeWidth="3.5" />
      <circle cx="50" cy="73" r="6" fill="#E3261E" stroke={O} strokeWidth="3" />
      <path d="M28 67 L33 73 L28 79 L23 73 Z M72 67 L77 73 L72 79 L67 73 Z" fill="#2BC24A" stroke={O} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="48" cy="71" r="1.8" fill="#fff" opacity=".9" />
      <path d="M44 52 L50 44 L56 52 L50 60 Z" fill="#2BC24A" stroke={O} strokeWidth="2.6" strokeLinejoin="round" />
    </g>
  );
}

const ART = { maize: Maize, mango: Mango, bream: Bream, drum: Drum, feather: Feather, crown: Crown };

export default function SymbolArt({ id, size = 64, style, className }) {
  const Art = ART[id];
  if (!Art) return null;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className={className} style={{ display: 'block', overflow: 'visible', ...style }}>
      <Art />
    </svg>
  );
}
