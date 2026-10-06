// The side-scrolling camera shared by Chicken Catch and Chicken Catch 2.
// cam = how far (scene units) the view has panned right from the yard. Each
// scenery layer moves at its own parallax factor of it; the world (actors,
// shadows, dust, effects) moves 1:1, so actors live in world coordinates and
// the yard is simply the world at cam = 0. Beyond the yard each layer repeats
// a tile (Yard.jsx); here the three copies are re-placed so they always cover
// the view. Speed lines (screen space) streak and fade in with the speed.

import { cid, f1, clamp } from './rig';

// layer → parallax factor
export const PX = { Cloud: .05, Hill: .15, Far: .35, Fence: .6, Props: .6, Ground: 1, Fg: 1.35 };
// tile → [first x (layer coords), width]
export const TILES = { Cloud: [380, 340], Hill: [380, 400], Far: [372, 360], Fence: [364, 320], Ground: [340, 300], Fg: [330, 290] };
// speed lines: [y, length] (screen space)
export const SPEED_LINES = [[118, 30], [142, 46], [171, 26], [203, 40], [229, 22], [256, 52], [281, 34], [299, 28]];
const LINE_PHASE = SPEED_LINES.map((_, k) => (k * 157) % 460);

export function cameraHandles(svg) {
  const $ = (n) => svg.querySelector(`#${cid(n)}`);
  return {
    layers: Object.keys(PX).map(n => ({ g: $(`px${n}`), f: PX[n], tl: TILES[n] ? $(`tl${n}`) : null, tile: TILES[n], last: null, lastK: -1 })),
    world: ['world', 'worldB'].map($).filter(Boolean),
    speed: $('speed'),
    lines: SPEED_LINES.map((_, k) => $(`sl${k}`)),
    cam: null,
  };
}

// Point the camera. speed (units/s) drives the speed lines; t animates them.
export function setCamera(C, cam, speed = 0, t = 0) {
  if (C.cam !== cam) {
    C.cam = cam;
    for (const L of C.layers) {
      if (!L.g) continue;
      const s = cam * L.f;
      L.g.setAttribute('transform', s ? `translate(${f1(-s)} 0)` : '');
      if (L.tl) {
        const [x0, W] = L.tile;
        const k = Math.max(0, Math.floor((s - 140 - x0) / W));
        if (k !== L.lastK) { L.lastK = k; L.tl.setAttribute('transform', `translate(${x0 + k * W} 0)`); }
      }
    }
    for (const g of C.world) g.setAttribute('transform', cam ? `translate(${f1(-cam)} 0)` : '');
  }
  const op = clamp((speed - 40) / 200) * .75;
  C.speed.setAttribute('opacity', f1(op));
  if (op > 0) {
    C.lines.forEach((el, k) => {
      const x = 340 - ((t * 760 + LINE_PHASE[k]) % 460);
      el.setAttribute('transform', `translate(${f1(x)} 0)`);
    });
  }
}

// A camera that eases from rest to `v` (units/s) over `ramp` s after `t0`.
// Closed form, so any frame can be drawn at any t.
export function rampDist(t, v, t0, ramp) {
  const u = t - t0;
  if (u <= 0) return 0;
  if (u < ramp) { const x = u / ramp; return v * ramp * (x * x * x - x * x * x * x / 2); }
  return v * (ramp / 2 + (u - ramp));
}
export function rampSpeed(t, v, t0, ramp) {
  const u = t - t0;
  if (u <= 0) return 0;
  if (u < ramp) { const x = u / ramp; return v * (3 * x * x - 2 * x * x * x); }
  return v;
}
// Exponential stop from speed v at t1 (time constant tau).
export const stopDist = (t, v, t1, tau) => (t <= t1 ? 0 : v * tau * (1 - Math.exp(-(t - t1) / tau)));
export const stopSpeed = (t, v, t1, tau) => (t <= t1 ? v : v * Math.exp(-(t - t1) / tau));
