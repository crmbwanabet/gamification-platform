'use client';

import React from 'react';
import { O, GOLD, CK, SKIN, SKIN_D, f1, lerp, rng, cid } from './rig';
import { TILES, SPEED_LINES } from './camera';

// The golden-hour village yard — ported from the approved mock: sunset sky with
// slow rays and candy clouds, hills + acacia, mango tree, far hut, swaying
// maize, reed fence with posts, sunlit dirt with grain, the big hut, hoe and
// pots; in front: light motes, a soft vignette and grass tufts.
// Parallax (camera.js): every layer group `ck-px<Name>` scrolls at its own
// factor of the camera (sky still, clouds/hills/trees slow, fence and huts
// medium, ground and tufts fast, foreground tufts fastest). Beyond the yard each
// layer continues as a repeating tile (`ck-tile<Name>` in <defs>, placed by
// camera.js), so a chase can run on as far as it needs.
// Layers (back → front): <YardBack/> · the world's back layer (escaping birds
// behind the fence) · <YardGround/> · the world (shadows / actors / effects) ·
// <YardOverlay/> (motes, speed lines, vignette, foreground tufts).

export const YARD_CSS = `
  .ck-svg .ck-rays { transform-box: view-box; animation: ckRays 60s linear infinite; }
  @keyframes ckRays { to { transform: rotate(360deg) } }
  .ck-svg .ck-mote { animation: ckMote 6s ease-in-out infinite; }
  @keyframes ckMote { 0%,100% { transform: translate(0,0); opacity: 0 } 30% { opacity: .85 } 50% { transform: translate(6px,-9px) } 70% { opacity: .7 } }
  .ck-svg .ck-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: ckSway 4s ease-in-out infinite; }
  @keyframes ckSway { 0%,100% { transform: rotate(-1.4deg) } 50% { transform: rotate(1.6deg) } }
  .ck-svg.run .ck-mote { animation-play-state: paused; opacity: 0; }
  @media (prefers-reduced-motion: reduce) {
    .ck-svg .ck-rays, .ck-svg .ck-mote, .ck-svg .ck-sway { animation: none !important; }
    .ck-svg .ck-mote { opacity: 0; }
  }
`;

// ---- seeded scene layout (same draw order as the mock, so the same yard) ----
const LAYOUT = (() => {
  const r0 = rng(5);
  const reeds = [];
  for (let x = 84, k = 0; x < 356; x += 4.6, k++) {
    const top = 151 + Math.sin(k * 1.7) * 2.2 + r0() * 2.5;
    reeds.push({ x, top, k, col: ['#F2C66C', '#E3B05A', '#D69C48', '#EDBD62'][k % 4] });
  }
  const maize = [];
  for (let k = 0; k < 18; k++) {
    const x = 200 + k * 8.6 + (r0() - .5) * 4, h = 58 + r0() * 22, top = 186 - h;
    const sw = (r0() - .5) * 6;
    maize.push({ k, x, h, top, sw, delay: f1(-r0() * 4) });
  }
  const speck = [];
  for (let k = 0; k < 90; k++) {
    const x = -40 + r0() * 380, y = 192 + Math.pow(r0(), .8) * 116;
    speck.push(r0() < .55 ? { x, y, rx: .8 + r0() * 1.6, ry: .5 + r0() * .8 } : { x, y, r: .5 + r0() * .8 });
  }
  const grain = [];
  [[110, 292], [190, 293], [150, 224], [236, 288], [214, 226], [70, 262], [140, 262]].forEach(([cx, cy]) => {
    for (let k = 0; k < 7; k++) { const gx = cx + (r0() - .5) * 26, gy = cy + (r0() - .5) * 7; grain.push([gx, gy]); }
  });
  const motes = [];
  for (let k = 0; k < 12; k++) {
    const cx = 60 + r0() * 220, cy = 150 + r0() * 120, r = .8 + r0() * .9, delay = -r0() * 6, dur = 5 + r0() * 3;
    motes.push({ cx, cy, r, delay, dur });
  }
  // the run tiles (beyond the yard)
  const r1 = rng(23);
  const tSpeck = [];
  for (let k = 0; k < 34; k++) {
    const x = r1() * TILES.Ground[1], y = 194 + Math.pow(r1(), .8) * 112;
    tSpeck.push(r1() < .55 ? { x, y, rx: .8 + r1() * 1.6, ry: .5 + r1() * .8 } : { x, y, r: .5 + r1() * .8 });
  }
  const tMaize = [];
  for (let k = 0; k < 7; k++) {
    const x = 236 + k * 8.4 + (r1() - .5) * 4, h = 50 + r1() * 20;
    tMaize.push({ k, x, h, top: 186 - h, sw: (r1() - .5) * 6 });
  }
  return { reeds, maize, speck, grain, motes, tSpeck, tMaize };
})();

const CAN = [[60, 54, 28], [92, 38, 30], [124, 52, 26], [40, 82, 24], [76, 80, 30], [112, 82, 28], [140, 78, 20], [98, 104, 22], [58, 108, 18]];
const MANGOES = [[84, 98], [120, 96], [66, 92], [132, 66], [104, 62]];
export const POSTS = [92, 156, 222, 290, 352];
const TILE_POSTS = [52, 116, 180, 244, 308]; // fence tile: one post every 64

// Fence posts (fence-layer x) between lo and hi: the yard's, then the tiles'.
export function postsBetween(lo, hi) {
  const out = POSTS.filter(x => x >= lo && x <= hi);
  const [x0, W] = TILES.Fence;
  for (let k = Math.max(0, Math.floor((lo - x0) / W)); x0 + k * W <= hi; k++) {
    TILE_POSTS.forEach(p => { const x = x0 + k * W + p; if (x >= lo && x <= hi) out.push(x); });
  }
  return out;
}

const REEDS_P = [[0, 22.6, "#F2C66C"], [4.6, 24.4, "#E3B05A"], [9.2, 21.4, "#D69C48"], [13.8, 25, "#EDBD62"]]; // reed tops, pattern-local (pattern y = 129)

function Cloud({ x, y, s = 1, c = '#FF9AB0', e = '#C2407A', op = .95 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={op}>
      <path d="M0 12 Q6 2 18 6 Q24 -4 38 0 Q48 -6 56 4 Q68 2 70 12Z" fill={c} stroke={e} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 11 Q20 9 64 11" stroke="#FFD0A0" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Acacia({ x, base = 150, s = 1, fill = '#6A1E5E' }) {
  return (
    <g transform={`translate(${x} ${base}) scale(${s})`} fill={fill}>
      <path d="M0 0 V-14 M0 -10 l-5 -5 M0 -11 l5 -4" stroke={fill} strokeWidth="1.6" />
      <ellipse cx="0" cy="-17" rx="15" ry="3.6" /><ellipse cx="-6" cy="-19" rx="7" ry="2.6" />
    </g>
  );
}

export function YardDefs() {
  const [, wHill] = TILES.Hill, [, wFence] = TILES.Fence, [, wGround] = TILES.Ground;
  return (
    <>
      <linearGradient id={cid('skyG')} gradientUnits="userSpaceOnUse" x1="0" y1="-60" x2="0" y2="186">
        <stop offset="0" stopColor="#2B0F5E" /><stop offset=".26" stopColor="#561A86" /><stop offset=".48" stopColor="#A42A88" />
        <stop offset=".66" stopColor="#EE4E6C" /><stop offset=".8" stopColor="#FF8A3D" /><stop offset=".92" stopColor="#FFC14A" /><stop offset="1" stopColor="#FFE08A" />
      </linearGradient>
      <radialGradient id={cid('sunG')}><stop offset="0" stopColor="#FFFDE8" /><stop offset=".55" stopColor="#FFF0A0" /><stop offset="1" stopColor="#FFC63A" /></radialGradient>
      <radialGradient id={cid('sunGlow')}><stop offset="0" stopColor="#FFE7A0" stopOpacity=".95" /><stop offset=".25" stopColor="#FFC76A" stopOpacity=".55" /><stop offset="1" stopColor="#FF7A5A" stopOpacity="0" /></radialGradient>
      <linearGradient id={cid('groundG')} gradientUnits="userSpaceOnUse" x1="0" y1="186" x2="0" y2="310">
        <stop offset="0" stopColor="#E9894A" /><stop offset=".35" stopColor="#D2622E" /><stop offset="1" stopColor="#A3401F" />
      </linearGradient>
      <radialGradient id={cid('poolG')} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#FFCB78" stopOpacity=".5" /><stop offset="1" stopColor="#FFCB78" stopOpacity="0" /></radialGradient>
      <linearGradient id={cid('mudG')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5E2232" /><stop offset=".7" stopColor="#7E3236" /><stop offset=".9" stopColor="#A84A3A" /><stop offset="1" stopColor="#F09A5A" /></linearGradient>
      <linearGradient id={cid('thatchG')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#D99A38" /><stop offset=".6" stopColor="#F2BE52" /><stop offset="1" stopColor="#FFD978" /></linearGradient>
      <linearGradient id={cid('strawG')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE38A" /><stop offset="1" stopColor="#E8B040" /></linearGradient>
      <radialGradient id={cid('fSkin')} cx=".62" cy=".32" r=".8"><stop offset="0" stopColor="#A9693F" /><stop offset=".7" stopColor={SKIN} /><stop offset="1" stopColor={SKIN_D} /></radialGradient>
      <radialGradient id={cid('potG')} cx=".62" cy=".35" r=".75"><stop offset="0" stopColor="#E9844E" /><stop offset=".7" stopColor="#C2502A" /><stop offset="1" stopColor="#8E3418" /></radialGradient>
      <linearGradient id={cid('goldRing')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF3B0" /><stop offset=".5" stopColor={GOLD} /><stop offset="1" stopColor="#E0A300" /></linearGradient>
      <radialGradient id={cid('vig')} cx=".5" cy=".5" r=".5" gradientTransform="translate(0 .04) scale(1 .92)"><stop offset=".62" stopColor="#2A0A4F" stopOpacity="0" /><stop offset="1" stopColor="#2A0A4F" stopOpacity=".5" /></radialGradient>
      <pattern id={cid('chit')} width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
        <rect width="11" height="11" fill="#FF7A1A" />
        <circle cx="5.5" cy="5.5" r="3.5" fill="#1E2A78" /><circle cx="5.5" cy="5.5" r="2.1" fill="#FFD21F" /><circle cx="5.5" cy="5.5" r=".9" fill="#E3261E" />
        <path d="M0 -1.6 L1.6 0 L0 1.6 L-1.6 0Z M11 -1.6 L12.6 0 L11 1.6 L9.4 0Z M0 9.4 L1.6 11 L0 12.6 L-1.6 11Z M11 9.4 L12.6 11 L11 12.6 L9.4 11Z" fill="#19B39A" />
      </pattern>
      <pattern id={cid("reedP")} x="0" y="129" width="18.4" height="60" patternUnits="userSpaceOnUse">
        {REEDS_P.map(([x, top, col]) => (
          <React.Fragment key={x}>
            <path d={`M${x} 60 V${f1(top + 2)} Q${f1(x + 2.1)} ${f1(top - 2.5)} ${f1(x + 4.2)} ${f1(top + 2)} V60Z`} fill={col} />
            {x === 0 && <path d={`M${x + 1.2} ${f1(top + 4)} V58`} stroke="#FFE7A6" strokeWidth=".8" opacity=".55" />}
          </React.Fragment>
        ))}
      </pattern>
      <filter id={cid('soft')} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" /></filter>
      {CK.map((b, i) => (
        <linearGradient key={i} id={cid(`tagG${i}`)} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={b.t.l} /><stop offset=".5" stopColor={b.t.c} /><stop offset="1" stopColor={b.t.d} />
        </linearGradient>
      ))}

      {/* ---- the run tiles, repeated beyond the yard ---- */}
      <g id={cid('tileCloud')}>
        <Cloud x={40} y={78} s={.8} />
        <Cloud x={200} y={50} s={.7} c="#E77AB8" e="#A8307A" op={.85} />
      </g>
      <g id={cid('tileHill')}>
        <path d={`M0 150 Q50 134 100 142 Q170 126 240 140 Q320 128 ${wHill} 150 L${wHill} 200 L0 200Z`} fill="#B4467E" />
        <path d={`M0 162 Q90 150 180 158 Q290 147 ${wHill} 162 L${wHill} 200 L0 200Z`} fill="#8E2E72" />
        <Acacia x={150} base={146} />
        <Acacia x={330} base={150} s={.7} />
      </g>
      <g id={cid('tileFar')}>
        <path d="M104 190 Q106 160 101 140 M103 156 Q92 146 84 134 M103 150 Q114 138 126 128" stroke={O} strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d="M104 190 Q106 160 101 140 M103 156 Q92 146 84 134 M103 150 Q114 138 126 128" stroke="#5A2A26" strokeWidth="5.6" fill="none" strokeLinecap="round" />
        {[[78, 124, 20], [102, 112, 24], [128, 122, 20], [92, 136, 18], [118, 138, 16]].map(([x, y, r], k) => <circle key={`o${k}`} cx={x} cy={y} r={r + 2} fill={O} />)}
        {[[78, 124, 20], [102, 112, 24], [128, 122, 20], [92, 136, 18], [118, 138, 16]].map(([x, y, r], k) => <circle key={`f${k}`} cx={x} cy={y} r={r} fill="#2F6E34" />)}
        {[[78, 124, 20], [102, 112, 24], [128, 122, 20]].map(([x, y, r], k) => <circle key={`l${k}`} cx={f1(x + r * .22)} cy={f1(y - r * .25)} r={f1(r * .7)} fill="#3F8A3A" />)}
        <Hut cx={196} by={188} s={.5} far />
        {LAYOUT.tMaize.map(({ k, x, h, top, sw }) => (
          <g key={k}>
            <path d={`M${f1(x)} 188 Q${f1(x + sw * .3)} ${f1(top + h * .5)} ${f1(x + sw)} ${f1(top)}`} stroke="#2C6E36" strokeWidth="2.6" fill="none" />
            {[.36, .6].map((u, j) => { const yy = top + h * u, s = j % 2 ? 1 : -1; return <path key={j} d={`M${f1(x + sw * (1 - u))} ${f1(yy)} q${f1(s * 9)} -6 ${f1(s * 16)} 3 q${f1(-s * 7)} -2 ${f1(-s * 16)} -1Z`} fill={j % 2 ? '#3F9443' : '#357F3C'} />; })}
            <path d={`M${f1(x + sw)} ${f1(top)} l-3 -7 M${f1(x + sw)} ${f1(top)} l.5 -9 M${f1(x + sw)} ${f1(top)} l3.5 -6`} stroke="#FFD15A" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        ))}
      </g>
      <g id={cid('tileFence')}>
        <rect x="0" y="152" width={wFence} height="37" fill="#5A2E1A" />
        <rect x="0" y="129" width={wFence} height="60" fill={`url(#${cid('reedP')})`} />
        <path d={`M0 160 H${wFence} M0 178 H${wFence}`} stroke="#7A4220" strokeWidth="2.4" />
        <path d={`M0 159 H${wFence} M0 177 H${wFence}`} stroke="#B8763A" strokeWidth=".8" opacity=".8" />
        {TILE_POSTS.map(x => (
          <React.Fragment key={x}>
            <path d={`M${x} 190 V143 Q${x + 3} 140.5 ${x + 6} 143 V190Z`} fill="#8A4E26" stroke={O} strokeWidth="1.8" />
            <path d={`M${x + 1.5} 146 V188`} stroke="#B87440" strokeWidth="1.2" />
          </React.Fragment>
        ))}
        <path d={`M0 189 H${wFence} V195 Q${wFence / 2} 199 0 195Z`} fill="#7A2A12" opacity=".35" />
        <Tuft x={120} y={197} s={.7} /><Tuft x={262} y={199} s={.8} flip={-1} />
      </g>
      <g id={cid('tileGround')}>
        {LAYOUT.tSpeck.map((p, k) => (p.rx
          ? <ellipse key={k} cx={f1(p.x)} cy={f1(p.y)} rx={f1(p.rx)} ry={f1(p.ry)} fill="#8E3416" opacity=".45" />
          : <circle key={k} cx={f1(p.x)} cy={f1(p.y)} r={f1(p.r)} fill="#FFB27A" opacity=".55" />))}
        <ellipse cx="70" cy="246" rx="5" ry="2.6" fill="#B85A34" stroke={O} strokeWidth="1.2" />
        <ellipse cx="226" cy="281" rx="6" ry="3" fill="#B85A34" stroke={O} strokeWidth="1.2" />
        <Tuft x={30} y={232} s={.8} /><Tuft x={180} y={300} s={1} flip={-1} /><Tuft x={262} y={222} s={.7} />
      </g>
      <g id={cid('tileFg')}>
        <Tuft x={40} y={314} s={1.4} /><Tuft x={200} y={316} s={1.2} flip={-1} />
      </g>
    </>
  );
}

// Placed by camera.js: three copies of a tile, `W` apart.
function Tiles({ name }) {
  const W = TILES[name][1];
  return (
    <g id={cid(`tl${name}`)} transform={`translate(${TILES[name][0]} 0)`}>
      {[0, 1, 2].map(k => <use key={k} href={`#${cid(`tile${name}`)}`} x={k * W} />)}
    </g>
  );
}

// Hut (cx, base y, scale, far = flat distant tones)
function Hut({ cx, by, s, far }) {
  const W = 40 * s, H = 52 * s, RW = 58 * s, RH = 70 * s, ey = by - H;
  const wall = far ? '#B05A3E' : `url(#${cid('mudG')})`, band = far ? '#8C3E2C' : '#8A3518';
  const roof = far ? '#C9893A' : `url(#${cid('thatchG')})`;
  const thatch = [];
  for (let k = -6; k <= 6; k++) {
    const x = cx + k * RW / 6.6;
    thatch.push(<path key={k} d={`M${f1(cx + k * .6 * s)} ${f1(ey - RH + 6 * s)} Q${f1(lerp(cx, x, .6))} ${f1(ey - RH * .4)} ${f1(x)} ${f1(ey + 4 * s)}`} stroke={far ? '#9E6A28' : '#B07A26'} strokeWidth={f1(1.1 * s)} fill="none" opacity=".7" />);
  }
  let fringe = `M${f1(cx - RW)} ${f1(ey + 2 * s)}`;
  for (let k = 0; k <= 18; k++) { const x = cx - RW + k * (2 * RW / 18); fringe += ` L${f1(x)} ${f1(ey + 2 * s + (k % 2 ? 6 : 1.5) * s)}`; }
  fringe += ` L${f1(cx + RW)} ${f1(ey - 2 * s)} Z`;
  const deco = [];
  if (!far) for (let x = cx - W + 3; x < cx + W - 4; x += 7 * s) deco.push(<path key={x} d={`M${f1(x)} ${f1(by - H * .5)} l${f1(3.5 * s)} ${f1(-5 * s)} l${f1(3.5 * s)} ${f1(5 * s)}Z`} fill="#F4D7A0" opacity=".9" />);
  return (
    <g>
      <path d={`M${f1(cx - W)} ${f1(ey)} V${f1(by - 3 * s)} Q${f1(cx)} ${f1(by + 5 * s)} ${f1(cx + W)} ${f1(by - 3 * s)} V${f1(ey)}Z`} fill={wall} stroke={O} strokeWidth={f1(2.4 * s)} />
      <path d={`M${f1(cx - W)} ${f1(by - 12 * s)} Q${f1(cx)} ${f1(by - 4 * s)} ${f1(cx + W)} ${f1(by - 12 * s)} V${f1(by - 3 * s)} Q${f1(cx)} ${f1(by + 5 * s)} ${f1(cx - W)} ${f1(by - 3 * s)}Z`} fill={band} opacity=".7" />
      {!far && <rect x={f1(cx - W)} y={f1(by - H * .5 - 6.5 * s)} width={f1(2 * W)} height={f1(8 * s)} fill="#7A2C14" opacity=".65" />}
      {deco}
      {!far && (
        <>
          <path d={`M${f1(cx + 2 * s)} ${f1(by + 1 * s)} V${f1(by - 26 * s)} Q${f1(cx + 12 * s)} ${f1(by - 36 * s)} ${f1(cx + 22 * s)} ${f1(by - 26 * s)} V${f1(by - 1 * s)}Z`} fill="#3A1024" stroke={O} strokeWidth={f1(2.2 * s)} />
          <path d={`M${f1(cx + 5 * s)} ${f1(by)} V${f1(by - 24 * s)} Q${f1(cx + 12 * s)} ${f1(by - 31 * s)} ${f1(cx + 19 * s)} ${f1(by - 24 * s)}`} stroke="#6A2A1A" strokeWidth={f1(1.6 * s)} fill="none" />
        </>
      )}
      <path d={`M${f1(cx - W)} ${f1(ey + 1)} Q${f1(cx)} ${f1(ey + 14 * s)} ${f1(cx + W)} ${f1(ey + 1)} V${f1(ey + 9 * s)} Q${f1(cx)} ${f1(ey + 20 * s)} ${f1(cx - W)} ${f1(ey + 9 * s)}Z`} fill="#3A1024" opacity=".35" />
      <path d={fringe} fill={far ? '#A86E2A' : '#C98A2E'} stroke={O} strokeWidth={f1(2 * s)} strokeLinejoin="round" />
      <path d={`M${f1(cx - RW)} ${f1(ey + 1 * s)} Q${f1(cx - RW * .5)} ${f1(ey - RH * .55)} ${f1(cx - 2 * s)} ${f1(ey - RH)} L${f1(cx + 2 * s)} ${f1(ey - RH)} Q${f1(cx + RW * .5)} ${f1(ey - RH * .55)} ${f1(cx + RW)} ${f1(ey - 1 * s)} Q${f1(cx)} ${f1(ey + 8 * s)} ${f1(cx - RW)} ${f1(ey + 1 * s)}Z`} fill={roof} stroke={O} strokeWidth={f1(2.4 * s)} strokeLinejoin="round" />
      {thatch}
      <path d={`M${f1(cx + 4 * s)} ${f1(ey - RH + 8 * s)} Q${f1(cx + RW * .45)} ${f1(ey - RH * .5)} ${f1(cx + RW * .9)} ${f1(ey - 2 * s)}`} stroke="#FFE6A0" strokeWidth={f1(2.4 * s)} fill="none" strokeLinecap="round" opacity={far ? .5 : .85} />
      <path d={`M${f1(cx - 4 * s)} ${f1(ey - RH + 2 * s)} L${f1(cx)} ${f1(ey - RH - 9 * s)} L${f1(cx + 4 * s)} ${f1(ey - RH + 2 * s)}Z`} fill={far ? '#9E6A28' : '#B97A2A'} stroke={O} strokeWidth={f1(1.8 * s)} strokeLinejoin="round" />
    </g>
  );
}

function Tuft({ x, y, s = 1, flip = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}>
      <path d="M-9 0 Q-9 -8 -13 -13 Q-5 -9 -4 -2 Q-3 -13 0 -17 Q2 -9 2 -2 Q5 -12 10 -14 Q6 -7 7 0Z" fill="#5E9E2A" stroke={O} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M-3.5 -3 Q-2.8 -10 0 -14 M3 -3 Q5 -9 8 -11.5" stroke="#9AD84A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </g>
  );
}

function Maize() {
  return LAYOUT.maize.map(({ k, x, h, top, sw, delay }) => (
    <g key={k} className="ck-sway" style={{ animationDelay: `${delay}s` }}>
      <path d={`M${f1(x)} 188 Q${f1(x + sw * .3)} ${f1(top + h * .5)} ${f1(x + sw)} ${f1(top)}`} stroke="#2C6E36" strokeWidth="2.6" fill="none" />
      {[.32, .52, .7].map((u, j) => {
        const yy = top + h * u, s = j % 2 ? 1 : -1;
        return <path key={j} d={`M${f1(x + sw * (1 - u))} ${f1(yy)} q${f1(s * 9)} -6 ${f1(s * 16)} 3 q${f1(-s * 7)} -2 ${f1(-s * 16)} -1Z`} fill={j % 2 ? '#3F9443' : '#357F3C'} />;
      })}
      <path d={`M${f1(x + sw)} ${f1(top)} l-3 -7 M${f1(x + sw)} ${f1(top)} l.5 -9 M${f1(x + sw)} ${f1(top)} l3.5 -6`} stroke="#FFD15A" strokeWidth="1.6" strokeLinecap="round" />
      {k % 3 === 1 && (
        <ellipse cx={f1(x + sw * .5 + 2.6)} cy={f1(top + h * .44)} rx="2.4" ry="5.2" fill="#F5C64A" stroke="#2C6E36" strokeWidth="1.2"
          transform={`rotate(14 ${f1(x + sw * .5 + 2.6)} ${f1(top + h * .44)})`} />
      )}
    </g>
  ));
}

// Sky, clouds, hills, mango tree, far hut, maize — everything behind the fence.
export function YardBack() {
  return (
    <g aria-hidden>
      <g id={cid('pxSky')}>
        <rect x="-80" y="-260" width="460" height="460" fill={`url(#${cid('skyG')})`} />
        <g transform="translate(196 136)" fill="#FFF1B8" opacity=".09">
          <g className="ck-rays">
            {Array.from({ length: 14 }, (_, k) => <path key={k} d="M0 0 L-9 -260 L9 -260Z" transform={`rotate(${k * (360 / 14)})`} />)}
          </g>
        </g>
        <circle cx="196" cy="136" r="130" fill={`url(#${cid('sunGlow')})`} />
        <circle cx="196" cy="136" r="27" fill={`url(#${cid('sunG')})`} />
        <circle cx="196" cy="136" r="27" fill="none" stroke="#FFF6D0" strokeWidth="2" opacity=".7" />
      </g>
      <g id={cid('pxCloud')}>
        <g opacity=".95">
          <path d="M158 92 Q164 82 176 86 Q182 76 196 80 Q206 74 214 84 Q226 82 228 92Z" fill="#FF9AB0" stroke="#C2407A" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M164 91 Q178 89 222 91" stroke="#FFD0A0" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M232 58 Q238 50 248 53 Q254 45 266 49 Q276 45 282 53 Q292 52 294 60Z" fill="#E77AB8" stroke="#A8307A" strokeWidth="1.3" strokeLinejoin="round" opacity=".85" />
          <path d="M-10 70 Q-4 62 6 64 Q12 56 22 60 Q30 58 32 66Z" fill="#C060A8" stroke="#8A2A7A" strokeWidth="1.2" opacity=".7" />
        </g>
        <path d="M150 64 q3 -3 6 0 q3 -3 6 0 M168 54 q2.4 -2.4 4.8 0 q2.4 -2.4 4.8 0" stroke="#5A1A6E" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <Tiles name="Cloud" />
      </g>
      <g id={cid('pxHill')}>
        <path d="M-80 156 Q-20 136 40 146 Q110 124 190 144 Q250 132 380 150 L380 200 L-80 200Z" fill="#B4467E" />
        <path d="M-80 166 Q30 150 120 160 Q210 148 380 162 L380 200 L-80 200Z" fill="#8E2E72" />
        <Acacia x={272} base={150} />
        <Tiles name="Hill" />
      </g>
      <circle cx="196" cy="150" r="60" fill={`url(#${cid('sunGlow')})`} opacity=".5" />
      <g id={cid('pxFar')}>
        {/* mango tree */}
        <path d="M90 190 Q92 150 86 122 M89 140 Q76 128 66 112 M89 134 Q102 118 116 104" stroke={O} strokeWidth="11" fill="none" strokeLinecap="round" />
        <path d="M90 190 Q92 150 86 122 M89 140 Q76 128 66 112 M89 134 Q102 118 116 104" stroke="#5A2A26" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M92 186 Q93 152 89 126" stroke="#8A4A3A" strokeWidth="1.6" fill="none" />
        <g>
          {CAN.map(([x, y, r], k) => <circle key={`o${k}`} cx={x} cy={y} r={r + 2.2} fill={O} />)}
          {CAN.map(([x, y, r], k) => <circle key={`f${k}`} cx={x} cy={y} r={r} fill="#2F6E34" />)}
          {CAN.map(([x, y, r], k) => <circle key={`l${k}`} cx={f1(x + r * .22)} cy={f1(y - r * .25)} r={f1(r * .72)} fill="#3F8A3A" />)}
          {CAN.map(([x, y, r], k) => <path key={`h${k}`} d={`M${f1(x + r * .2)} ${f1(y - r * .92)} A${r} ${r} 0 0 1 ${f1(x + r * .95)} ${f1(y - r * .1)}`} stroke="#A8D84A" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity=".8" />)}
          {MANGOES.map(([x, y], k) => (
            <g key={`m${k}`}>
              <ellipse cx={x} cy={y} rx="3.2" ry="4.2" fill="#FFA62B" stroke={O} strokeWidth="1.3" />
              <ellipse cx={x - 1} cy={y - 1.4} rx="1" ry="1.4" fill="#FFE08A" />
            </g>
          ))}
        </g>
        <Hut cx={168} by={186} s={.62} far />
        <g><Maize /></g>
        <Tiles name="Far" />
      </g>
    </g>
  );
}

// Reed fence, the dirt yard, the big hut, hoe and pots.
export function YardGround() {
  return (
    <g aria-hidden>
      <g id={cid('pxFence')}>
        <rect x="84" y="152" width="280" height="37" fill="#5A2E1A" />
        <g>
          {LAYOUT.reeds.map(({ x, top, k, col }) => (
            <React.Fragment key={k}>
              <path d={`M${f1(x)} 189 V${f1(top + 2)} Q${f1(x + 2.1)} ${f1(top - 2.5)} ${f1(x + 4.2)} ${f1(top + 2)} V189Z`} fill={col} />
              {k % 3 === 0 && <path d={`M${f1(x + 1.2)} ${f1(top + 4)} V186`} stroke="#FFE7A6" strokeWidth=".8" opacity=".55" />}
            </React.Fragment>
          ))}
        </g>
        <path d="M84 160 H364 M84 178 H364" stroke="#7A4220" strokeWidth="2.4" />
        <path d="M84 159 H364 M84 177 H364" stroke="#B8763A" strokeWidth=".8" opacity=".8" />
        {POSTS.map(x => (
          <React.Fragment key={x}>
            <path d={`M${x} 190 V143 Q${x + 3} 140.5 ${x + 6} 143 V190Z`} fill="#8A4E26" stroke={O} strokeWidth="1.8" />
            <path d={`M${x + 1.5} 146 V188`} stroke="#B87440" strokeWidth="1.2" />
          </React.Fragment>
        ))}
        <path d="M84 189 H364 V195 Q220 199 84 195Z" fill="#7A2A12" opacity=".35" />
        <Tiles name="Fence" />
      </g>
      <path d="M-80 188 H380 V340 H-80Z" fill={`url(#${cid('groundG')})`} />
      <ellipse cx="190" cy="214" rx="190" ry="44" fill={`url(#${cid('poolG')})`} />
      <g id={cid('pxGround')}>
        {/* sunlit patch under the black hen (fix: it no longer sinks into the shade) */}
        <ellipse cx="258" cy="286" rx="40" ry="13" fill="#FFB877" opacity=".5" filter={`url(#${cid('soft')})`} />
        <g>
          {LAYOUT.speck.map((p, k) => (p.rx
            ? <ellipse key={k} cx={f1(p.x)} cy={f1(p.y)} rx={f1(p.rx)} ry={f1(p.ry)} fill="#8E3416" opacity=".45" />
            : <circle key={k} cx={f1(p.x)} cy={f1(p.y)} r={f1(p.r)} fill="#FFB27A" opacity=".55" />))}
        </g>
        <g>
          {LAYOUT.grain.map(([x, y], k) => <ellipse key={k} cx={f1(x)} cy={f1(y)} rx="1.3" ry=".9" fill="#FFD55A" stroke="#9A5A10" strokeWidth=".4" />)}
        </g>
        <Tuft x={114} y={196} s={.7} /><Tuft x={318} y={200} s={.8} flip={-1} /><Tuft x={-14} y={236} s={1} />
        <Tiles name="Ground" />
      </g>
      <g id={cid('pxProps')}>
        <Hut cx={22} by={200} s={1.05} far={false} />
        <g transform="translate(66 199) rotate(18)">
          <path d="M0 0 V-40" stroke={O} strokeWidth="4.6" strokeLinecap="round" />
          <path d="M0 0 V-40" stroke="#B8763A" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M-2 -40 L-9 -37 L-8 -31 L-1 -35Z" fill="#9AA0B8" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
        </g>
        <g transform="translate(76 202)">
          <ellipse cx="2" cy="1.5" rx="16" ry="3.6" fill="#5A1A0A" opacity=".35" />
          <path d="M-11 -14 Q-16 -2 -8 0 H8 Q16 -2 11 -14 Q8 -21 5 -22 H-5 Q-8 -21 -11 -14Z" fill={`url(#${cid('potG')})`} stroke={O} strokeWidth="2" />
          <path d="M-6 -22.5 H6 V-25 H-6Z" fill="#C2502A" stroke={O} strokeWidth="1.8" />
          <path d="M-11.6 -12 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3" stroke="#FFD08A" strokeWidth="1.2" fill="none" opacity=".9" />
          <path d="M-8 -17 Q-9 -10 -6.5 -4" stroke="#FFC08A" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity=".75" />
        </g>
        <g transform="translate(95 203)">
          <path d="M-7 -8 Q-10 -1 -5 0 H5 Q10 -1 7 -8 Q5 -12 3 -12.5 H-3 Q-5 -12 -7 -8Z" fill={`url(#${cid('potG')})`} stroke={O} strokeWidth="1.8" />
          <path d="M-3.6 -12.6 H3.6 V-14.4 H-3.6Z" fill="#C2502A" stroke={O} strokeWidth="1.5" />
        </g>
      </g>
    </g>
  );
}

// Light motes, speed lines, vignette, foreground grass.
export function YardOverlay() {
  return (
    <g aria-hidden style={{ pointerEvents: 'none' }}>
      <g>
        {LAYOUT.motes.map((m, k) => (
          <circle key={k} className="ck-mote" cx={f1(m.cx)} cy={f1(m.cy)} r={f1(m.r)} fill="#FFF0B0"
            style={{ animationDelay: `${f1(m.delay)}s`, animationDuration: `${f1(m.dur)}s` }} />
        ))}
      </g>
      <g id={cid('speed')} opacity="0">
        {SPEED_LINES.map(([y, len], k) => (
          <path key={k} id={cid(`sl${k}`)} d={`M0 ${y} H${len}`} stroke="#FFF6DA" strokeWidth={k % 3 ? 1.6 : 2.4} strokeLinecap="round" opacity={k % 2 ? .7 : .95} />
        ))}
      </g>
      <rect x="-80" y="-260" width="460" height="600" fill={`url(#${cid('vig')})`} />
      <g id={cid('pxFg')}>
        <Tuft x={10} y={312} s={1.3} /><Tuft x={300} y={314} s={1.4} flip={-1} />
        <Tiles name="Fg" />
      </g>
    </g>
  );
}
