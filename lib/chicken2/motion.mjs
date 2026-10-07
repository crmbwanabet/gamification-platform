// Chicken Catch 2 — the chase choreography. Pure, no React, no DOM, no
// imports (node --test: tests/chicken2-motion.test.mjs).
//
// FAIRNESS (crash-game rule): everything the player sees before the crash is a
// function of (t, seed) only — chase(t, seed) and lastMiss(t, seed) do not take
// the crash point, and frameAt(t, round) only uses round.tc / round.cashT to
// decide WHEN the run stops. The seed is cosmetic (drawn with Math.random at
// RUN, independent of C). So the farmer never slows, hesitates or changes
// rhythm before a crash: a round that crashes at 1.5x and one that runs to 10x
// look identical up to 1.5x.
//
// NEAR-CATCH WAVES. The chase runs on a clock Φ(t) (cycles, closed form) whose
// rate rises with time — and so with the multiplier, which is e^(K·t) — from a
// cycle every 2.3 s to one every 1.4 s. Each cycle (u = frac Φ):
//   0   – .50  close in: he gains on her, the gap shrinks from far to near;
//   .50 – .645 lunge: he leaps and pitches forward, arms out, hands arriving a
//              few units (inches) behind her tail feathers;
//   .645       the near-miss: she flaps / darts away, feathers fly;
//   .645 – 1   the gap reopens and he recovers into his stride.
// Intensity I(t) = clamp((m(t) − 1) / 4) (0 at 1x, 1 at 5x+) makes the waves
// more frantic: higher leaps, deeper pitch, bigger darts, closer misses, more
// feathers. Per-cycle seeded jitter varies each near-miss a little.
//
// Coordinates: the shared chicken scene (viewBox 300×306, y down); positions
// are WORLD x (screen x + the camera). Screen-space layout: the hen runs at
// ~H_X, the farmer's feet sit `gap` behind her.

// ---- the growth curve (mirrors lib/chicken2/crash.mjs: 2x at 5.8 s) ------------
const KM = Math.LN2 / 5.8;
export const intensity = (t) => clamp((Math.exp(KM * Math.max(0, t)) - 1) / 4);

// ---- helpers --------------------------------------------------------------------
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const D2R = Math.PI / 180;
// a seeded uniform [0,1) per (seed, k) — cosmetic variety only
export function hash01(seed, k) {
  let s = (Math.imul(seed | 0, 0x9E3779B1) ^ Math.imul((k | 0) + 0x632BE5AB, 0x85EBCA77)) | 0;
  s = s + 0x6D2B79F5 | 0;
  let t = Math.imul(s ^ s >>> 15, 1 | s);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

// ---- the camera: eases up to V2 units/s ----------------------------------------
export const V2 = 200, CAM_T0 = .08, CAM_RAMP = .5;
export function camRun(t) {
  const u = t - CAM_T0;
  if (u <= 0) return 0;
  if (u < CAM_RAMP) { const x = u / CAM_RAMP; return V2 * CAM_RAMP * (x * x * x - x * x * x * x / 2); }
  return V2 * (CAM_RAMP / 2 + (u - CAM_RAMP));
}
export function vRun(t) {
  const u = t - CAM_T0;
  if (u <= 0) return 0;
  if (u < CAM_RAMP) { const x = u / CAM_RAMP; return V2 * (3 * x * x - 2 * x * x * x); }
  return V2;
}

// ---- the wave clock ------------------------------------------------------------
const F0 = 1 / 2.3, F1 = 1 / 1.4, TAU = 8, PHI0 = -.22;
export const waveRate = (t) => F0 + (F1 - F0) * (1 - Math.exp(-Math.max(0, t) / TAU));
export function waveClock(t) {
  const x = Math.max(0, t);
  return PHI0 + F0 * x + (F1 - F0) * (x - TAU * (1 - Math.exp(-x / TAU)));
}
// The time the clock reads phi (it is strictly increasing).
export function clockTime(phi) {
  let lo = 0, hi = 40;
  if (phi <= PHI0) return 0;
  for (let i = 0; i < 48; i++) { const m = (lo + hi) / 2; if (waveClock(m) < phi) lo = m; else hi = m; }
  return hi;
}
export const MISS_U = .645;            // the near-miss instant within a cycle
const LUNGE_U = .5, RECOVER_U = .7;

// ---- the lunge pose (the farmer rig's pose format: see chicken/shared/rig.js) ---
// Explicit elbows on straight arms so it blends with the sprint (which also has
// explicit elbows) without the arms snapping. I = intensity: a deeper pitch.
const SHOULDER = [[-5.5, -63], [8.5, -63]], ARM = 28;
const reachArm = (sh, dir) => {
  const a = dir * D2R, h = [sh[0] + Math.sin(a) * ARM, sh[1] - Math.cos(a) * ARM];
  return [[sh[0] + (h[0] - sh[0]) * .52, sh[1] + (h[1] - sh[1]) * .52], h];
};
export function lungePose(I = 0) {
  const [eF, hF] = reachArm(SHOULDER[0], 44), [eN, hN] = reachArm(SHOULDER[1], 52);
  return {
    rot: 34 + 8 * I, lean: 20, head: -42 - 6 * I, drop: 3, lift: 0,
    aF: [-24, -9], aN: [15, -15], eF, hF, eN, hN, footRot: -20,
    open: true, handRot: -10, eyes: 'open', mouth: 'grit', brows: 'focus', squint: .15, look: [1.9, .5],
  };
}
// Where the lead (near) hand is, relative to his feet, in the full lunge
// (mirrors shared/actors.js fmWorld: lean about the hip, then rot, scale K).
const FK = 1.12, FHIP = -36;
const rotAbout = (p, c, deg) => {
  const a = deg * D2R, cs = Math.cos(a), sn = Math.sin(a), x = p[0] - c[0], y = p[1] - c[1];
  return [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs];
};
export function lungeHand(I = 0) {
  const P = lungePose(I), hipY = FHIP + P.drop;
  const hands = [P.hF, P.hN].map(h => {
    let q = rotAbout([h[0], h[1] + P.drop], [0, hipY], P.lean);
    q = rotAbout(q, [0, FHIP], P.rot);
    return [q[0] * FK, q[1] * FK];
  });
  return hands[0][0] > hands[1][0] ? hands[0] : hands[1];
}

// ---- layout ---------------------------------------------------------------------
export const H_X = 204;                // the hen's screen x while running
export const HEN0 = [204, 266];        // her spot in the yard
export const FARM0 = [36, 266];        // his spot in the yard
export const TAIL = 23;                // her tail-feather tip, behind her feet x
const GAP_FAR = 138;                   // feet → hen when the gap is open
const LAG = .55;                       // he follows her weaving lane this far behind

const laneY = (P, t) => 264 + 14 * Math.sin(Math.PI * 2 * t / 1.45 + P.ph) + 5 * Math.sin(Math.PI * 2 * t / .55 + P.ph2);
function phases(seed) {
  const r = (k) => hash01(seed, -1 - k);
  return { ph: r(0) * 6.28, ph2: r(1) * 6.28, ph3: r(2) * 6.28 };
}

// ---- one moment of the chase: a pure function of (t, seed) ----------------------
// Returns world positions and the choreography scalars the renderer poses with.
//   fx, fy  farmer feet          hx, hy  hen feet (lane)      cam  camera
//   L       lunge blend 0..1     leap    farmer lift          missed  0..1 "missed!" face
//   dart    0..1 her escape      dLift   her escape lift     I  intensity
export function chase(t, seed) {
  const P = phases(seed);
  const phi = waveClock(t), k = Math.floor(phi), u = phi - k;
  const I = intensity(t), r = hash01(seed, k);
  const hand = lungeHand(I)[0];
  // feet → hen at the lunge's end: hands land `near` units short of her tail
  const near = 6.5 - 3.5 * I + 2 * r;
  const gapN = TAIL + hand + near;
  const gapPre = gapN + 20 + 6 * I;
  let gap, L = 0, leap = 0, missed = 0;
  if (u < LUNGE_U) gap = lerp(GAP_FAR, gapPre, smooth(u / LUNGE_U));
  else if (u < MISS_U) { const w = (u - LUNGE_U) / (MISS_U - LUNGE_U); gap = lerp(gapPre, gapN, eOut(w)); L = eOut(w); }
  else { const w = clamp((u - MISS_U) / (1 - MISS_U)); gap = lerp(gapN, GAP_FAR, smooth(w)); L = u < RECOVER_U ? 1 : 1 - smooth(clamp((u - RECOVER_U) / .2)); }
  if (u > LUNGE_U && u < .74) leap = (5 + 7 * I) * Math.sin(Math.PI * (u - LUNGE_U) / .24);
  if (u > MISS_U + .02 && u < .9) missed = Math.sin(Math.PI * (u - MISS_U - .02) / (.9 - MISS_U - .02));
  // her escape: a burst forward and up right at the miss, settling back
  let dart = 0;
  if (u >= MISS_U) { const w = (u - MISS_U) / (1 - MISS_U); dart = w < .25 ? eOut(w / .25) : 1 - smooth((w - .25) / .75); }
  const up = .35 + .65 * hash01(seed, k + 7919);     // this miss: more flutter-up or more dash
  const dX = (16 + 18 * I) * (1.3 - up * .6), dLift = (10 + 12 * I) * up;

  const st = smooth(clamp((t - .03) / .45));         // she bolts from the yard
  const hsx = lerp(HEN0[0], H_X + 6 * Math.sin(t * 5.3 + P.ph3), st) + dX * dart;
  const cam = camRun(t);
  const hy = lerp(HEN0[1], laneY(P, t), st);
  const sf = smooth(clamp((t - .04) / .6));          // he bursts out of his crouch
  const fsx = lerp(FARM0[0], H_X + 6 * Math.sin(t * 5.3 + P.ph3) - gap, sf);
  const fy = lerp(FARM0[1], laneY(P, Math.max(0, t - LAG)) + 2, smooth(clamp(t / .6)));
  return {
    t, k, u, I, cam,
    fx: fsx + cam, fy, sx: fsx,
    hx: hsx + cam, hy, hsx,
    L: L * sf, leap: leap * sf, missed: missed * sf, dart: dart * st, dLift: dLift * dart * st,
  };
}

// The latest near-miss at or before t (for the feather puff): its time, the
// hen's position then, and how many feathers fly (more as the multiplier rises).
export function lastMiss(t, seed) {
  let k = Math.floor(waveClock(t) - MISS_U);
  if (k < 0) return null;
  const tm = clockTime(k + MISS_U);
  if (tm > t) { k -= 1; if (k < 0) return null; }
  const t1 = clockTime(k + MISS_U), s = chase(t1, seed);
  return { k, t: t1, x: s.hx, y: s.hy, n: Math.round(3 + 3 * s.I) };
}

// ---- the round's egg plan (seeded) ---------------------------------------------
export const EGG_DT = .8;
const PLANS = new Map();
export function plan(seed) {
  if (PLANS.has(seed)) return PLANS.get(seed);
  if (PLANS.size > 12) PLANS.clear();
  const P = { te: [], ex: [], ey: [], tp: [] };
  let tf = 0;
  for (let k = 0, t = .5; t < 26; k++, t = .5 + EGG_DT * k + (hash01(seed, 100000 + k) - .5) * .24) {
    const h = chase(t, seed);
    const x = h.hx - 12;
    P.te.push(t); P.ex.push(x); P.ey.push(h.hy + 1);
    // when his feet reach it (first time; he only ever runs forward)
    tf = Math.max(tf, t);
    while (chase(tf, seed).fx < x - 2 && tf < t + 4) tf += .01;
    P.tp.push(tf);
  }
  PLANS.set(seed, P);
  return P;
}

// ---- what to draw at t ---------------------------------------------------------
// round: { seed, tc (fall time, Infinity at the 10x max), cashT (null|time) }.
// The crash point enters ONLY through `end` — when the run stops.
export const runEnd = (round) => (round.cashT != null ? Math.min(round.cashT, round.tc) : round.tc);
export function frameAt(t, round) {
  if (t <= 0 || !round) return { mode: 'idle' };
  const end = runEnd(round);
  if (t < end) return { mode: 'run', s: chase(t, round.seed) };
  return { mode: round.cashT != null && round.cashT <= round.tc ? 'catch' : 'fall', s: chase(end, round.seed), tt: t - end, end };
}
// Eggs he has run through by t (the game pulses the counter on each).
export function eggsCollected(round, t) {
  const P = plan(round.seed), end = Math.min(t, runEnd(round));
  let n = 0; while (n < P.tp.length && P.tp[n] <= end) n++;
  return n;
}
