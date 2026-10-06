// Bottle Spin — the per-frame renderer. Writes transforms straight onto the SVG
// nodes (no React re-render per frame). rig(svg) looks the nodes up once.

import { CX, CY, cid, f1, clamp, bottlePose, proj, SEG_DEG, R_STUD } from './geom';
import { SEGMENTS } from '@/lib/bottle/wheel.mjs';
import { segColor } from './Scene';

export function makeRig(svg) {
  const q = (n) => svg.querySelector(`#${cid(n)}`);
  return {
    bottle: q('bottle'), shadow: q('shadow'), swoosh: q('swoosh'), fan: q('fan'),
    ghosts: [0, 1, 2].map(k => q(`ghost${k}`)),
    glowWrap: q('glowWrap'), glow: q('glow'), glowEdge: q('glowEdge'), glowEdge2: q('glowEdge2'), rays: q('rays'), sparkWrap: q('sparks'), sparks: [0, 1, 2].map(k => q(`spark${k}`)),
    dims: [...svg.querySelectorAll('.bt-dim')], studs: q('studs'),
    labels: Array.from({ length: 8 }, (_, i) => q(`lbl${i}`)),
  };
}

const pose = (phi, dx = 0, dy = 0, lift = 0) => {
  const p = bottlePose(phi);
  return `translate(${f1(CX + dx)} ${f1(CY + dy + lift)}) rotate(${f1(p.rot)}) scale(${f1(p.len * SCALE)} ${f1(p.flip * SCALE)})`;
};

const GHOST_A = [.55, .34, .18];
const SCALE = 1.04; // bottle size on the table

// phi: bottle angle (deg); vel: deg/s (signed); t: seconds (for the rattle)
export function render(R, phi, vel = 0, t = 0) {
  const sp = Math.abs(vel);
  const fast = clamp((sp - 120) / 900);
  const lift = -Math.abs(Math.sin(t * 31)) * 1.6 * clamp(sp / 1600);
  R.bottle.setAttribute('transform', pose(phi, 0, 0, lift));
  R.shadow.setAttribute('transform', pose(phi, -4, 5));
  const dir = Math.sign(vel || 1);
  const lag = 7 + 15 * fast;
  R.ghosts.forEach((g, k) => {
    if (fast <= 0) { g.setAttribute('opacity', '0'); return; }
    g.setAttribute('transform', pose(phi - dir * lag * (k + 1)));
    g.setAttribute('opacity', f1(GHOST_A[k] * fast));
  });
  if (fast <= 0) { R.swoosh.setAttribute('opacity', '0'); R.fan.setAttribute('opacity', '0'); return; }
  // cartoon motion blur: a translucent fan swept behind both ends of the bottle
  const span = 50 + 80 * fast;
  const sector = (a0, r) => {
    let d = `M${CX} ${CY}`;
    for (let k = 0; k <= 10; k++) { const [x, y] = proj(a0 - dir * span * (k / 10), r); d += ` L${f1(x)} ${f1(y)}`; }
    return d + 'Z';
  };
  R.fan.setAttribute('d', sector(phi, 56) + sector(phi + 180, 44));
  R.fan.setAttribute('opacity', f1(.62 * fast));
  // speed arc just outside the cap, trailing behind it
  let d = '';
  for (let k = 0; k <= 12; k++) {
    const [x, y] = proj(phi - dir * span * .9 * (k / 12), 63);
    d += `${k ? ' L' : 'M'}${f1(x)} ${f1(y)}`;
  }
  R.swoosh.setAttribute('d', d);
  R.swoosh.setAttribute('opacity', f1(.6 * fast));
  R.swoosh.setAttribute('stroke-width', f1(2.5 + 2.5 * fast));
}

// Result overlays: index = glowing segment (or null), win: gold glow + label
// pop; loss: a softer violet-white edge. mode drives the studs' marquee.
export function setResult(R, index, win) {
  R.dims.forEach((p, i) => p.setAttribute('opacity', index == null || i === index ? '0' : (win ? '.42' : '.3')));
  R.labels.forEach((l, i) => l && l.setAttribute('data-hot', win && i === index ? '1' : '0'));
  if (index == null) { R.glowWrap.setAttribute('opacity', '0'); R.rays.setAttribute('opacity', '0'); R.sparkWrap.setAttribute('opacity', '0'); return; }
  const d = R.dims[index].getAttribute('d');
  R.glow.setAttribute('d', d);
  R.glowEdge.setAttribute('d', d);
  R.glowEdge2.setAttribute('d', d);
  R.glowEdge2.setAttribute('opacity', win ? '1' : '0');
  R.glow.setAttribute('fill', win ? segColor(SEGMENTS[index]).l : '#E4D8FF');
  R.glow.classList.toggle('bt-glow', !!win);
  R.glow.setAttribute('opacity', win ? '.6' : '.22');
  R.glowEdge.setAttribute('stroke', win ? '#FFE27A' : '#C9B6F5');
  R.glowEdge.setAttribute('stroke-width', win ? '5' : '3');
  R.glowWrap.setAttribute('opacity', '1');
  // a glowing gold arc along the board's rim at the winning segment + sparkles
  if (win) {
    let d = '';
    for (let k = 0; k <= 12; k++) {
      const [x, y] = proj(index * SEG_DEG - 21 + 42 * (k / 12), R_STUD);
      d += `${k ? ' L' : 'M'}${f1(x)} ${f1(y)}`;
    }
    R.rays.setAttribute('d', d);
    R.sparks.forEach((g, k) => {
      const [x, y] = proj(index * SEG_DEG + [-19, 19, 0][k], [118, 118, 124][k]);
      g.setAttribute('transform', `translate(${f1(x)} ${f1(y)})`);
    });
  }
  R.sparkWrap.setAttribute('opacity', win ? '1' : '0');
  R.rays.setAttribute('opacity', win ? '1' : '0');
}

export function setStuds(R, mode) { R.studs.setAttribute('data-mode', mode); }

