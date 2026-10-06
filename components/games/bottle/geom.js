// Bottle Spin — shared geometry for the scene art and the spin renderer.
// Pure (no React, no DOM).
//
// Scene coordinates: viewBox 300×310, y down. The table top is a circle in its
// own plane, seen tilted: plane point (px, py) → screen (CX + px, CY + K·py).
// Angles (phi) are degrees clockwise from the far side of the table (12
// o'clock on screen); segment i of lib/bottle/wheel.mjs is centred on i·45°.

import { CANDY } from '../candy/tokens';

export const O = CANDY.outline;
export const GOLD = CANDY.gold;
export const FONT = CANDY.display;
export const VB_W = 300, VB_H = 310;
export const CX = 150, CY = 186, K = 0.72;
export const R_CLOTH = 128;   // chitenge cloth on the table top
export const R_BOARD = 110;   // the painted spinning board
export const R_PAINT = 99;    // painted wedges (inside the studded rim)
export const R_STUD = 104.5;
export const R_LABEL = 78;
export const SEG_DEG = 45;
export const cid = (n) => `bt-${n}`;

export const f1 = n => +(+n).toFixed(2);
export const D2R = Math.PI / 180;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// Plane polar (phi, r) → plane xy (before the tilt)
export const plane = (phi, r) => [Math.sin(phi * D2R) * r, -Math.cos(phi * D2R) * r];
// Plane polar → screen
export const proj = (phi, r) => { const [x, y] = plane(phi, r); return [CX + x, CY + K * y]; };

// Wedge path in PLANE coords (draw inside translate(CX CY) scale(1 K))
export function wedgePath(i, r = R_PAINT) {
  const a0 = i * SEG_DEG - SEG_DEG / 2, a1 = a0 + SEG_DEG;
  const [x0, y0] = plane(a0, r), [x1, y1] = plane(a1, r);
  return `M0 0 L${f1(x0)} ${f1(y0)} A${r} ${r} 0 0 1 ${f1(x1)} ${f1(y1)}Z`;
}

// A bottle lying in the tilted plane, pointing at phi: a cylinder keeps its
// width, only its length foreshortens. Returns the screen rotation and the
// length scale for a bottle drawn along +x; flip keeps the glass highlight on
// the side that faces the sky.
export function bottlePose(phi) {
  const dx = Math.sin(phi * D2R), dy = -Math.cos(phi * D2R) * K;
  return { rot: Math.atan2(dy, dx) / D2R, len: Math.hypot(dx, dy), flip: dx < 0 ? -1 : 1 };
}

// ---- the spin --------------------------------------------------------------
export const SPIN_S = 2.55;     // fast spin decelerating to the result (+ overshoot)
export const WOBBLE_S = 0.5;    // little wobble back and settle
export const TOTAL_S = SPIN_S + WOBBLE_S;
const TURNS = 4;
const OVER = 9;                 // overshoot, degrees past the stop angle
const JITTER = 11;              // where inside the segment it stops (± degrees)

// from: the bottle's current angle (any real); index: the result segment.
// rand: visual-only randomness for where inside the segment it stops.
export function planSpin(from, index, rand = Math.random) {
  const target = index * SEG_DEG + (rand() * 2 - 1) * JITTER;
  const delta = (((target - from) % 360) + 360) % 360;
  return { from, end: from + TURNS * 360 + delta };
}

const easeOut = u => 1 - Math.pow(1 - u, 3.4);

export function angleAt(plan, t) {
  if (t <= 0) return plan.from;
  if (t < SPIN_S) return plan.from + (plan.end + OVER - plan.from) * easeOut(t / SPIN_S);
  const v = Math.min(1, (t - SPIN_S) / WOBBLE_S);
  return plan.end + OVER * Math.cos(v * 1.5 * Math.PI) * (1 - v) * (1 - v * .4);
}

// Which segment a resting angle points at
export const segmentAt = (phi) => Math.round(((phi % 360) + 360) % 360 / SEG_DEG) % 8;
