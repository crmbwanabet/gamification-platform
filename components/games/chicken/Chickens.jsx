'use client';

import React from 'react';
import { O, GOLD, FONT, CK, FARM0, f1, rng, cid } from './rig';

// The 6 birds — SVG ported from the approved mock (drawn facing left, origin =
// between the feet), each with its multiplier tag. Idle life is CSS (body bob,
// head peck); a pick plays a hop + flutter + open beak ("cluck"). The motion
// renderer moves them by id: position ckp<i>, lift ckh<i>, facing/tilt ckf<i>,
// legs lgA/lgB, wing wg<i>, head hdA/hdB, tag tg<i>, pupil pp<i>, and toggles
// the `squawk` / `cluck` / `hold` / `on` classes on the root ck<i>.
// The black hen carries a light halo (fix: it no longer melts into the shade).

export const CHICKEN_CSS = `
  .ck-svg .ck { cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
  .ck-svg .ck .ring { opacity: 0; transition: opacity .15s; }
  .ck-svg .ck.on .ring { opacity: 1; }
  .ck-svg .ck .tagSel { opacity: 0; }
  .ck-svg .ck.on .tagSel { opacity: 1; }
  .ck-svg .ck.on .tagB { transform: scale(1.12); }
  .ck-svg .tagB { transform-box: fill-box; transform-origin: 50% 100%; transition: transform .15s ease-out; }
  .ck-svg .ck:focus-visible .focus { opacity: 1; }
  .ck-svg .ck .bk-o, .ck-svg .ck .ema { display: none; }
  .ck-svg .ck.cluck .bk-o, .ck-svg .ck.cluck .ema { display: inline; }
  .ck-svg .ck.cluck .bk-c { display: none; }
  .ck-svg .ck.cluck .hopper { animation: ckHop .55s cubic-bezier(.3,.7,.4,1) both; }
  .ck-svg .ck.cluck .wingC { animation: ckFlut .55s ease-out both; }
  .ck-svg .ck.cluck.hold .hopper { animation: none; transform: translateY(-6px) rotate(-4deg); }
  .ck-svg .ck.cluck.hold .wingC { animation: none; transform: rotate(-38deg); }
  .ck-svg .ck.squawk .bk-o { display: inline; }
  .ck-svg .ck.squawk .bk-c { display: none; }
  @keyframes ckHop { 0% { transform: translateY(0) } 30% { transform: translateY(-11px) rotate(-5deg) } 55% { transform: translateY(0) } 72% { transform: translateY(-4px) } 100% { transform: translateY(0) } }
  @keyframes ckFlut { 0%, 100% { transform: rotate(0) } 20% { transform: rotate(-45deg) } 35% { transform: rotate(-10deg) } 50% { transform: rotate(-40deg) } 70% { transform: rotate(-5deg) } }
  .ck-svg .ema { animation: ckEmaPop .5s ease-out both; }
  .ck-svg .ck.hold .ema { animation: none; }
  @keyframes ckEmaPop { from { opacity: 0; transform: scale(.4) } to { opacity: 1; transform: scale(1) } }
  .ck-svg .ring .pulse { transform-box: fill-box; transform-origin: center; animation: ckPulse 1.3s ease-out infinite; }
  @keyframes ckPulse { 0% { transform: scale(1); opacity: .95; } 100% { transform: scale(1.45); opacity: 0; } }
  .ck-svg .idle-bob { animation: ckBob 1.5s ease-in-out infinite; }
  @keyframes ckBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(1.1px) } }
  .ck-svg .idle-peck { animation: ckPeck 3.4s ease-in-out infinite; }
  @keyframes ckPeck { 0%, 62%, 100% { transform: rotate(0) } 68% { transform: rotate(-38deg) } 72% { transform: rotate(-30deg) } 76% { transform: rotate(-40deg) } 84% { transform: rotate(4deg) } 90% { transform: rotate(0) } }
  .ck-svg.run .ring { opacity: 0 !important; }
  .ck-svg.run .idle-bob, .ck-svg.run .idle-peck, .ck-svg.run .ring .pulse { animation: none; }
  .ck-svg .ck-actors { transition: opacity .2s ease; }
  .ck-svg .ck-actors.gone { opacity: 0; }
  .ck-svg .ck-shadows { transition: opacity .2s ease; }
  @media (prefers-reduced-motion: reduce) {
    .ck-svg .idle-bob, .ck-svg .idle-peck, .ck-svg .ring .pulse, .ck-svg .ema { animation: none !important; }
    .ck-svg .ring .pulse { opacity: 0; }
    .ck-svg .ck.cluck .hopper, .ck-svg .ck.cluck .wingC { animation: none; }
    .ck-svg .ck-actors, .ck-svg .ck-shadows { transition: none; }
  }
`;

// Hen tail feathers; `edge` overrides the outline (the halo copy).
function HenTail({ b, edge, edgeW = 2 }) {
  const fe = (ang, len, w, col) => (
    <path d={`M0 0 Q${f1(w)} ${f1(-len * .55)} 0 ${f1(-len)} Q${f1(-w)} ${f1(-len * .55)} 0 0Z`} transform={`rotate(${ang})`}
      fill={col} stroke={edge || O} strokeWidth={edgeW} strokeLinejoin="round" />
  );
  return (
    <g transform={`translate(${f1(b.TA[0])} ${f1(b.TA[1])})`}>
      {fe(78, b.ry * 1.0, 6, b.tc[2])}{fe(52, b.ry * 1.25, 7, b.tc[0])}{fe(26, b.ry * 1.15, 6.5, b.tc[1])}
    </g>
  );
}

function SickleTail({ b }) {
  const sick = (d, w, col) => (
    <>
      <path d={d} stroke={O} strokeWidth={w + 3.4} strokeLinecap="round" fill="none" />
      <path d={d} stroke={col} strokeWidth={w} strokeLinecap="round" fill="none" />
    </>
  );
  return (
    <g transform={`translate(${f1(b.TA[0] - 2)} ${f1(b.TA[1] + 2)})`}>
      {sick('M0 0 C4 -10 14 -14 22 -6', 4, '#FFB22E')}
      {sick('M0 0 C2 -26 26 -36 33 -10', 5.2, '#163F44')}
      {sick('M0 0 C4 -20 24 -26 29 -2', 5, '#1F6E62')}
      {sick('M0 0 C8 -14 22 -16 25 4', 4.6, '#2FA38A')}
      <path d="M3 -12 C8 -24 22 -29 28 -14" stroke="#7FE3C8" strokeWidth="1.3" fill="none" strokeLinecap="round" opacity=".75" />
    </g>
  );
}

function Leg({ b, x, id }) {
  const g = -b.hipY;
  const d = `M0 0 L0 ${f1(g)} M0 ${f1(g)} l-5.6 .6 M0 ${f1(g)} l-3.4 2.4 M0 ${f1(g)} l3 .4`;
  return (
    <g transform={`translate(${f1(x)} ${f1(b.hipY)})`}><g id={id}>
      <path d={d} stroke={O} strokeWidth="4.2" strokeLinecap="round" fill="none" />
      <path d={d} stroke="#FFB21F" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      {b.hackle && (
        <>
          <path d={`M1 ${f1(g * .55)} l3.4 -1`} stroke={O} strokeWidth="3" strokeLinecap="round" />
          <path d={`M1 ${f1(g * .55)} l3.4 -1`} stroke="#FFB21F" strokeWidth="1.4" strokeLinecap="round" />
        </>
      )}
    </g></g>
  );
}

function BodyExtras({ b, i }) {
  const { rx, ry, bcy } = b;
  const out = [
    <ellipse key="belly" cx={f1(-rx * .28)} cy={f1(bcy + ry * .3)} rx={f1(rx * .62)} ry={f1(ry * .58)} fill={b.belly} opacity=".6" />,
    <ellipse key="under" cx={f1(rx * .25)} cy={f1(bcy + ry * .95)} rx={f1(rx * 1.05)} ry={f1(ry * .55)} fill={b.d} opacity=".45" />,
  ];
  if (b.speckle) {
    const rr = rng(11 + i);
    for (let k = 0; k < 22; k++) {
      const cx = (rr() * 2 - 1) * rx * .95, cy = bcy + (rr() * 2 - 1) * ry * .9, r = .8 + rr() * .7;
      out.push(<circle key={`s${k}`} cx={f1(cx)} cy={f1(cy)} r={f1(r)} fill="#fff" opacity=".9" />);
    }
  }
  if (b.sheen) out.push(<path key="sheen" d={`M${f1(-rx * .6)} ${f1(bcy - ry * .55)} Q0 ${f1(bcy - ry * 1.05)} ${f1(rx * .7)} ${f1(bcy - ry * .45)}`} stroke="#56C8B0" strokeWidth="2.2" fill="none" opacity=".7" strokeLinecap="round" />);
  if (b.hackle) out.push(<ellipse key="hk" cx={f1(-rx * .45)} cy={f1(bcy + ry * .25)} rx={f1(rx * .55)} ry={f1(ry * .7)} fill="#5A1A10" opacity=".55" />);
  return out;
}

function Wing({ b, i }) {
  const wx = b.rx * .95, wy = b.ry * .62;
  const d = `M${f1(-wx * .45)} ${f1(-wy * .2)} Q${f1(-wx * .5)} ${f1(wy * .75)} ${f1(wx * .35)} ${f1(wy * .7)} Q${f1(wx * .78)} ${f1(wy * .55)} ${f1(wx * .82)} ${f1(wy * .05)} Q${f1(wx * .3)} ${f1(-wy * .55)} ${f1(-wx * .45)} ${f1(-wy * .2)}Z`;
  const dots = [];
  if (b.speckle) {
    const r2 = rng(90 + i);
    for (let k = 0; k < 7; k++) { const cx = -wx * .2 + r2() * wx * .8, cy = -wy * .05 + r2() * wy * .55; dots.push(<circle key={k} cx={f1(cx)} cy={f1(cy)} r=".9" fill="#fff" />); }
  }
  return (
    <>
      <path d={d} fill={b.wing} stroke={O} strokeWidth="2" strokeLinejoin="round" />
      <path d={`M${f1(wx * .1)} ${f1(wy * .62)} q4 -3 6 -9 M${f1(wx * .38)} ${f1(wy * .58)} q3 -3 4 -7`} stroke={O} strokeOpacity=".35" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {dots}
      {b.sheen && <path d={`M${f1(-wx * .3)} ${f1(-wy * .05)} Q${f1(wx * .2)} ${f1(-wy * .45)} ${f1(wx * .7)} ${f1(wy * .02)}`} stroke="#7A5AD8" strokeWidth="1.6" fill="none" opacity=".8" strokeLinecap="round" />}
      {b.hackle && <path d={`M${f1(wx * .05)} ${f1(wy * .6)} Q${f1(wx * .5)} ${f1(wy * .6)} ${f1(wx * .8)} ${f1(wy * .1)}`} stroke="#2FA38A" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
    </>
  );
}

// Head parts, relative to the neck pivot.
function Head({ b, i }) {
  const hc = [b.HC[0] - b.NP[0], b.HC[1] - b.NP[1]];
  const r = b.hr, hx = hc[0], hy = hc[1];
  const neckW = r * 1.25;
  const headFill = b.comb === 'rooster' ? '#E8641F' : b.c;
  let comb;
  if (b.comb === 'rooster') {
    const cp = `M${f1(hx - r * .7)} ${f1(hy - r * .55)} L${f1(hx - r * .85)} ${f1(hy - r - 5)} L${f1(hx - r * .35)} ${f1(hy - r - 2)} L${f1(hx - r * .25)} ${f1(hy - r - 8.5)} L${f1(hx + r * .2)} ${f1(hy - r - 3)} L${f1(hx + r * .45)} ${f1(hy - r - 9)} L${f1(hx + r * .7)} ${f1(hy - r - 2.5)} L${f1(hx + r * 1.1)} ${f1(hy - r - 6)} L${f1(hx + r * .95)} ${f1(hy - r * .3)}Z`;
    comb = <path d={cp} fill="#FF2E3E" stroke={O} strokeWidth="2" strokeLinejoin="round" />;
  } else {
    const k = b.comb === 'big' ? 1.25 : 1;
    const bumps = [[-.42, -.9, 2.6], [.02, -1.05, 3.2], [.46, -.88, 2.6]].map(([dx, dy, rad]) => [hx + dx * r * 1.05, hy + dy * r - 1.2 * k, rad * k]);
    comb = (
      <>
        {bumps.map(([x, y, rad], j) => <circle key={`o${j}`} cx={f1(x)} cy={f1(y)} r={f1(rad + 1.1)} fill={O} />)}
        {bumps.map(([x, y, rad], j) => <circle key={`f${j}`} cx={f1(x)} cy={f1(y)} r={f1(rad)} fill="#FF3B45" />)}
      </>
    );
  }
  const hackle = [];
  if (b.hackle) {
    for (let k = 0; k < 6; k++) {
      const ax = hx + r * .2 + k * 1.6, ay = hy + r * .2 + k * 1.5, len = 11 + k * 1.2;
      hackle.push(<path key={k} d={`M${f1(ax - 4)} ${f1(ay - 3)} Q${f1(ax + 3)} ${f1(ay + len * .5)} ${f1(ax + 1 + k * .8)} ${f1(ay + len)} Q${f1(ax + 7)} ${f1(ay + len * .4)} ${f1(ax + 5)} ${f1(ay - 3)}Z`} fill={k % 2 ? '#FF9A1A' : '#FFC23A'} stroke={O} strokeWidth="1.5" strokeLinejoin="round" />);
    }
  }
  const bx = hx - r * .92, by = hy + r * .12;
  const ex = hx - r * .3, ey = hy - r * .18;
  return (
    <>
      <path d={`M0 0 L${f1(hc[0] * .9)} ${f1(hc[1] * .9)}`} stroke={headFill} strokeWidth={f1(neckW)} strokeLinecap="round" />
      {hackle}
      {comb}
      <circle cx={f1(hx)} cy={f1(hy)} r={r} fill={headFill} stroke={O} strokeWidth="2.2" />
      <path d={`M${f1(hx + r * .2)} ${f1(hy - r * .92)} A${r} ${r} 0 0 1 ${f1(hx + r * .95)} ${f1(hy + r * .1)}`} stroke="#FFD98A" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity=".75" />
      {b.comb === 'rooster'
        ? <path d={`M${f1(bx + 3.2)} ${f1(by + 2.4)} Q${f1(bx + 1)} ${f1(by + 11)} ${f1(bx + 5)} ${f1(by + 10.6)} Q${f1(bx + 8)} ${f1(by + 8)} ${f1(bx + 6.4)} ${f1(by + 2.6)}Z`} fill="#FF2E3E" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
        : <ellipse cx={f1(bx + 3.6)} cy={f1(by + 4.6)} rx="2.2" ry="3.2" fill="#FF3B45" stroke={O} strokeWidth="1.4" />}
      <path className="bk-c" d={`M${f1(bx + 2)} ${f1(by - 3)} L${f1(bx - 6)} ${f1(by + .4)} L${f1(bx + 2)} ${f1(by + 3.4)}Z`} fill="#FFB21F" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <g className="bk-o">
        <path d={`M${f1(bx + 2)} ${f1(by - 3.2)} L${f1(bx - 6.4)} ${f1(by - 2.6)} L${f1(bx + 1.6)} ${f1(by + .2)}Z`} fill="#FFB21F" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
        <path d={`M${f1(bx + 1.6)} ${f1(by + 1.2)} L${f1(bx - 4.6)} ${f1(by + 4.2)} L${f1(bx + 2.2)} ${f1(by + 3.8)}Z`} fill="#F28A10" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
        <path d={`M${f1(bx + 1.6)} ${f1(by + .2)} L${f1(bx - 3)} ${f1(by + 1.2)}`} stroke="#7A1020" strokeWidth="1.6" />
      </g>
      <circle cx={f1(ex)} cy={f1(ey)} r="3.3" fill="#fff" stroke={O} strokeWidth="1.4" />
      <circle id={cid(`pp${i}`)} cx={f1(ex - .7)} cy={f1(ey + .3)} r="2" fill={O} />
      <circle cx={f1(ex - 1.3)} cy={f1(ey - .6)} r=".8" fill="#fff" />
      {b.eye === 'sleepy' && <path d={`M${f1(ex - 3.9)} ${f1(ey - .2)} A3.9 3.9 0 0 1 ${f1(ex + 3.9)} ${f1(ey - .2)}Z`} fill={b.c} stroke={O} strokeWidth="1.4" strokeLinejoin="round" />}
      {b.eye === 'sharp' && <path d={`M${f1(ex - 4.6)} ${f1(ey - 4.4)} L${f1(ex + 3.4)} ${f1(ey - 2.2)}`} stroke={O} strokeWidth="2" strokeLinecap="round" />}
      {b.eye === 'proud' && <path d={`M${f1(ex - 4)} ${f1(ey - 3.4)} Q${f1(ex)} ${f1(ey - 6)} ${f1(ex + 4)} ${f1(ey - 4.4)}`} stroke={O} strokeWidth="2" strokeLinecap="round" fill="none" />}
      {b.eye === 'cute' && <path d={`M${f1(ex + 3)} ${f1(ey - 2.8)} l1.6 -1.4 M${f1(ex + 3.6)} ${f1(ey - 1.2)} l1.9 -.6`} stroke={O} strokeWidth="1.1" strokeLinecap="round" />}
      <ellipse cx={f1(hx + r * .2)} cy={f1(hy + r * .42)} rx="2.2" ry="1.4" fill="#FF6F7E" opacity=".55" />
    </>
  );
}

function Tag({ b, i }) {
  const mt = String(b.m), tw = mt.length > 1 ? 40 : 30;
  return (
    <g id={cid(`tg${i}`)} transform={`translate(0 ${f1(b.tagY)})`}>
      <g className="tagB">
        <path d={`M${-tw / 2 + 10} -22 H${tw / 2 - 10} A10 10 0 0 1 ${tw / 2 - 10} -2 H5 L0 4 L-5 -2 H${-tw / 2 + 10} A10 10 0 0 1 ${-tw / 2 + 10} -22Z`} fill={`url(#${cid(`tagG${i}`)})`} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
        <path className="tagSel" d={`M${-tw / 2 + 10} -24.6 H${tw / 2 - 10} A12.6 12.6 0 0 1 ${tw / 2 - 10} .6 H6 L0 7.2 L-6 .6 H${-tw / 2 + 10} A12.6 12.6 0 0 1 ${-tw / 2 + 10} -24.6Z`} fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinejoin="round" />
        <path d={`M${-tw / 2 + 7} -18.5 Q${-tw / 2 + 9} -20.6 ${-tw / 2 + 14} -20.4`} stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".75" />
        <text textAnchor="middle" y="-6.6" fontFamily={FONT} fontSize="15" fill="#fff" stroke={O} strokeWidth="4.2" strokeLinejoin="round" paintOrder="stroke">
          {mt}<tspan fontSize="11">x</tspan>
        </text>
      </g>
    </g>
  );
}

function Chicken({ b, i, selected, onPick }) {
  const { rx, ry, bcy, NP, WP } = b;
  const hc = [b.HC[0] - NP[0], b.HC[1] - NP[1]];
  const neckLine = `M0 0 L${f1(hc[0] * .9)} ${f1(hc[1] * .9)}`;
  const peck = { animationDelay: `${f1(-i * .73)}s`, animationDuration: `${f1(3 + (i % 3) * .55)}s` };
  const hit = Math.max(30, rx + 12);
  const pick = () => onPick(i);
  return (
    <g className="ck" id={cid(`ck${i}`)} role="button" tabIndex={0} aria-label={`${b.name}, ${b.m}x`} aria-pressed={selected}
      onClick={pick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } }}>
      <g id={cid(`ckp${i}`)} transform={`translate(${b.x} ${b.y})`}>
        <g className="ring">
          <ellipse className="pulse" cx="0" cy="1" rx={f1(rx + 9)} ry="7" fill="none" stroke={GOLD} strokeWidth="2.6" />
          <ellipse cx="0" cy="1" rx={f1(rx + 9)} ry="7" fill={GOLD} fillOpacity=".22" stroke={O} strokeWidth="6" />
          <ellipse cx="0" cy="1" rx={f1(rx + 9)} ry="7" fill="none" stroke={`url(#${cid('goldRing')})`} strokeWidth="3.4" />
        </g>
        <g id={cid(`ckh${i}`)}>
          <g className="hopper">
            <g id={cid(`ckf${i}`)} transform={`scale(${b.dir} 1)`}>
              <g className="idle-bob" style={{ animationDelay: `${f1(-i * .4)}s` }}>
                {b.halo && (
                  <g opacity=".95">
                    <ellipse cx="0" cy={f1(bcy)} rx={rx} ry={ry} fill="none" stroke={b.halo} strokeWidth="7" />
                    <HenTail b={b} edge={b.halo} edgeW={6.5} />
                  </g>
                )}
                <Leg b={b} x={3} id={cid(`lgB${i}`)} />
                {b.tail === 'hen' ? <HenTail b={b} /> : <SickleTail b={b} />}
                <g transform={`translate(${f1(NP[0])} ${f1(NP[1])})`}><g id={cid(`hdA${i}`)}><g className="idle-peck" style={peck}>
                  {b.halo && (
                    <>
                      <path d={neckLine} stroke={b.halo} strokeWidth={f1(b.hr * 1.25 + 8.6)} strokeLinecap="round" />
                      <circle cx={f1(hc[0])} cy={f1(hc[1])} r={f1(b.hr + 3.4)} fill={b.halo} />
                    </>
                  )}
                  <path d={neckLine} stroke={O} strokeWidth={f1(b.hr * 1.25 + 4)} strokeLinecap="round" />
                </g></g></g>
                <clipPath id={cid(`bc${i}`)}><ellipse cx="0" cy={f1(bcy)} rx={rx} ry={ry} /></clipPath>
                <ellipse cx="0" cy={f1(bcy)} rx={rx} ry={ry} fill={b.c} stroke={O} strokeWidth="2.3" />
                <g clipPath={`url(#${cid(`bc${i}`)})`}><BodyExtras b={b} i={i} /></g>
                <path d={`M${f1(-rx * .2)} ${f1(bcy - ry * .97)} Q${f1(rx * .7)} ${f1(bcy - ry * .9)} ${f1(rx * .98)} ${f1(bcy - ry * .1)}`} stroke="#FFD98A" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity={b.c === '#FFF8EF' ? .9 : .7} />
                <Leg b={b} x={-3} id={cid(`lgA${i}`)} />
                <g transform={`translate(${f1(NP[0])} ${f1(NP[1])})`}><g id={cid(`hdB${i}`)}><g className="idle-peck" style={peck}>
                  <Head b={b} i={i} />
                </g></g></g>
                <g transform={`translate(${f1(WP[0])} ${f1(WP[1])})`}><g id={cid(`wg${i}`)}><g className="wingC">
                  <Wing b={b} i={i} />
                </g></g></g>
              </g>
            </g>
          </g>
        </g>
        <g className="ema" transform={`translate(${f1(-b.dir * 14)} ${f1(-b.top + 4)})`}>
          <path d="M-6 -4 l-3.5 -5 M0 -6 v-6 M6 -4 l3.5 -5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </g>
        <Tag b={b} i={i} />
        <rect className="focus" x={f1(-rx - 12)} y={f1(-b.top - 4)} width={f1(2 * rx + 24)} height={f1(b.top + 12)} rx="10" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="4 3" opacity="0" />
        <rect x={f1(-hit)} y={f1(b.tagY - 24)} width={f1(2 * hit)} height={f1(-b.tagY + 32)} fill="transparent" />
      </g>
    </g>
  );
}

export default function Chickens({ selected, onPick }) {
  return CK.map((b, i) => <Chicken key={b.id} b={b} i={i} selected={selected === i} onPick={onPick} />);
}

// Ground shadows of the farmer and the birds (positioned by motion.js).
export function Shadows() {
  return (
    <g className="ck-shadows" id={cid('shadows')} aria-hidden>
      <ellipse id={cid('fmSh')} cx={FARM0[0]} cy={FARM0[1] + 2} rx="21" ry="5" fill="#5A1A0A" opacity=".38" />
      {CK.map((b, i) => <ellipse key={i} id={cid(`cks${i}`)} cx={b.x + 2} cy={b.y + 2} rx={f1(b.rx * .95)} ry="4.4" fill="#5A1A0A" opacity=".36" />)}
    </g>
  );
}
