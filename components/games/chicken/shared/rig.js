// Chicken Catch / Chicken Catch 2 — shared geometry for the scene art and the
// motion renderers, ported from the approved mock. Pure (no React, no DOM).
// Scene coordinates: viewBox 300×306, y down. Every element the renderer moves
// carries an id `ck-<name>` (one game is open at a time).

import { BIRDS } from '@/lib/chicken/birds.mjs';
import { CANDY } from '../../candy/tokens';

export const O = CANDY.outline;
export const GOLD = CANDY.gold;
export const FONT = CANDY.display;
export const VB_W = 300, VB_H = 306;
export const cid = (n) => `ck-${n}`;

// ---- helpers ----------------------------------------------------------------
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const eOut = t => 1 - Math.pow(1 - t, 3);
export const eIn = t => t * t;
export const eInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const smooth = t => t * t * (3 - 2 * t);
export const f1 = n => +(+n).toFixed(2);
export const D2R = Math.PI / 180;
export const rotAbout = (p, c, deg) => {
  const a = deg * D2R, cs = Math.cos(a), sn = Math.sin(a), x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs];
};
export const P2 = p => `${f1(p[0])} ${f1(p[1])}`;
// Seeded PRNG (same as the mock) — scene layout is identical on every device.
export function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const star4 = (s) => `M0 ${-s} Q${f1(s * .18)} ${f1(-s * .18)} ${s} 0 Q${f1(s * .18)} ${f1(s * .18)} 0 ${s} Q${f1(-s * .18)} ${f1(s * .18)} ${-s} 0 Q${f1(-s * .18)} ${f1(-s * .18)} 0 ${-s}Z`;
// Two-bone IK: joint between a and b with segment lengths l1, l2; sign picks the bend side.
export function ik(a, b, l1, l2, sign) {
  let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || .001;
  const max = l1 + l2 - .01;
  if (d > max) { b = [a[0] + dx / d * max, a[1] + dy / d * max]; dx = b[0] - a[0]; dy = b[1] - a[1]; d = max; }
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  return { j: [a[0] + dx / d * x + sign * h * (-dy / d), a[1] + dy / d * x + sign * h * (dx / d)], end: b };
}

// ---- the birds: art geometry (drawn facing left, origin = between the feet) ----
export function birdGeom(src) {
  const b = { ...src, m: src.mult };
  for (const k of ['rx', 'ry', 'leg', 'neck', 'hr']) b[k] = +(b[k] * 1.12).toFixed(2);
  b.bcy = -(b.leg + b.ry * .82);
  b.hipY = b.bcy + b.ry * .72;
  b.NP = [-b.rx * .52, b.bcy - b.ry * .42];
  b.HC = [-b.rx * .8, b.bcy - b.ry * .78 - b.neck - b.hr * .4];
  b.WP = [-b.rx * .1, b.bcy - b.ry * .2];
  b.TA = [b.rx * .72, b.bcy - b.ry * .25];
  b.top = -(b.HC[1] - b.hr - (b.comb === 'rooster' ? 8 : b.comb === 'big' ? 6 : 4.5));
  b.tagY = -b.top - 9;
  b.t = b.tag;
  return b;
}
export const CK = BIRDS.map(birdGeom);

// ---- the farmer (drawn facing right, origin = between the feet) ----------------
// He stands back at the left edge of the yard (well clear of the flock) in a
// crouched ready stance, both arms forward with open hands. HEAD_S enlarges the
// head about the neck so his face (squint, big nose, beard, grass stalk) reads
// at 360 px.
export const FARM0 = [36, 266];
export const K = 1.12;
export const HEAD_S = 1.18;
export const HIP = -36;
export const SKIN = '#8A5232', SKIN_D = '#6A3A20', DENIM = '#2F5BC4', BOOT = '#2B2440';
export const BEARD = '#4A3C3A', GREY = '#BDB3AE';
export const SHOULDER = [[-5.5, -63], [8.5, -63]];
// Eyes sit at (1.2, -86.4) and (12, -86.4) in head space.
export const BROWS = {
  calm: 'M-4 -92 Q1 -95 5.6 -92.8 M7.6 -92.8 Q12.4 -95.2 17 -92',
  focus: 'M-4 -94.2 L5.6 -91 M7.6 -91 L17 -94',
  up: 'M-4 -94.4 Q1 -98.2 5.6 -95.4 M7.6 -95.4 Q12.4 -98.4 17 -94.6',
};

// pose: rot (whole body about the hip), lean (upper body), head, drop (crouch),
// aF/aN ankle targets (body space), hF/hN hand targets (torso space), eF/eN
// optional elbows, open (open hands vs fists), handRot (extra hand tilt), face:
// eyes / mouth / brows / squint (0..1 lowers the lids). `plant` is the loss: a
// plain belly-flop — body flat, legs out behind, arms forward on the ground,
// head up with dizzy eyes.
export const POSES = {
  ready: { rot: 0, lean: 10, head: -4, drop: 9, aF: [-13, -4.5], aN: [15, -4.5], hF: [22, -60], hN: [35, -56], open: true, handRot: -42, eyes: 'open', mouth: 'smile', brows: 'calm' },
  dive:  { rot: 76, lean: 0, head: -48, drop: 0, aF: [-11, -5], aN: [-3, -12], hF: [12, -90], hN: [18, -87], footRot: 40, open: true, eyes: 'open', mouth: 'grit', brows: 'focus', squint: .6 },
  lie:   { rot: 84, lean: 0, head: -40, drop: 0, aF: [-9, -4], aN: [-3, -7], hF: [13, -89], hN: [19, -86], footRot: 50, eyes: 'open', mouth: 'grit', brows: 'focus', hat: 0 },
  plant: { rot: 90, lean: 0, head: -84, drop: 0, aF: [-21, -9], aN: [-9, -3], hF: [6, -104], hN: [12, -100], footRot: 110, armBack: true, open: true, eyes: 'dizzy', mouth: 'oops', brows: 'up', hat: 0 },
  hold:  { rot: 0, lean: -4, head: -6, drop: 0, aF: [-10, -4.5], aN: [12, -4.5], hF: [-21, -107], hN: [25, -107], arm: [24.5, 24.5], eb: -1, armBack: true, eyes: 'happy', mouth: 'joy', brows: 'up', hat: 0 },
  // a stumble: pitched forward, arms thrown up, mouth an "o"
  trip:  { rot: 34, lean: 12, head: -30, drop: 2, aF: [-16, -10], aN: [10, -3], hF: [-2, -98], hN: [26, -94], eF: [-12, -80], eN: [20, -80], footRot: 30, open: true, eyes: 'open', mouth: 'oops', brows: 'up' },
};
