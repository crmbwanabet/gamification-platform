// Chicken Catch 2 motion — the crash-game run, a pure function of time
// (render2(rig, t, round)) like Chicken Catch's motion.js, built from the same
// shared scene (parallax camera, farmer, bird, effects).
//
// RUN: the farmer bursts out of his crouch and chases the golden hen through a
// side-scrolling run (camera + parallax + speed lines + dust). The hen weaves
// ahead and lays a golden egg every ~0.8 s; the farmer follows her trail and
// runs through each egg, which pops with a sparkle (the game pulses the
// multiplier counter on each pickup — eggsCollected()).
// round.cashT (cash-out / auto / the 10x max): the hen brakes, he dives, lands
// on her and jumps up holding her overhead (sparkles, confetti).
// round.tc (the crash): he trips, belly-flops in the dirt (dust, the hat rolls
// off, dizzy stars), the hen squawks and flies off over the fence, dropping her
// eggs. The scene stays where it ended; the game resets to the yard.

import { FARM0, K, POSES, cid, clamp, lerp, lerp2, eOut, eIn, smooth, f1, D2R, rng, birdGeom } from '../chicken/shared/rig';
import {
  farmerHandles, birdHandles, drawFarmer, fmWorld, headWorld, bodyWorld,
  runPose, mixPose, REACH, readyPose, drawChicken, depthSort,
} from '../chicken/shared/actors';
import { cameraHandles, setCamera, rampDist, rampSpeed, stopDist, stopSpeed } from '../chicken/shared/camera';
import { N_PUFF, N_FEATH, CLOUD, SPARK, CONFP } from '../chicken/shared/Effects';
import { N_EGG, N_SEGG } from './Eggs';

// The golden hen (one bird, index 0 in the shared bird art).
export const HEN = birdGeom({
  id: 'gold', mult: 1, name: 'Golden hen', x: 204, y: 266, dir: 1, rx: 20, ry: 16, leg: 7, neck: 3.5, hr: 9,
  c: '#F0A93A', l: '#FFD27A', d: '#A9601A', wing: '#D2852A', belly: '#FFE3A0', comb: 'big', eye: 'cute', tail: 'hen',
  tc: ['#B8681C', '#F0A93A', '#D2852A'], tag: { c: '#FFC21F', l: '#FFE27A', d: '#B88400' },
});

// ---- the run ------------------------------------------------------------------
const V2 = 200;                  // running speed, units per second
const CAM_T0 = .08, CAM_RAMP = .5;
const F_X = 86, H_X = 196;       // farmer / hen screen x while running
const LAG = (H_X - F_X) / V2;    // the farmer is this far behind on her trail
const EGG_DT = .8;               // an egg every ~0.8 s (± jitter)
const DIVE = .28, UP0 = .48, UP1 = .84; // the catch, after the cash-out
const TRIP = .16, FALL = .26;           // the fall, after the crash

const camRun = (t) => rampDist(t, V2, CAM_T0, CAM_RAMP);
const vRun = (t) => rampSpeed(t, V2, CAM_T0, CAM_RAMP);
const rf = rng(91);
const FEATH = Array.from({ length: N_FEATH }, () => ({ a: (-150 + rf() * 120) * D2R, v: 50 + rf() * 70, sw: 2 + rf() * 4, ph: rf() * 6, spin: (rf() - .5) * 500, d: rf() * .25 }));
const SEGG = Array.from({ length: 5 }, (_, k) => ({ vx: -70 + k * 38 + rf() * 16, vy: -120 - rf() * 70, spin: (rf() - .5) * 900, dy: k * 3 - 4 }));

// ---- the rig ---------------------------------------------------------------------
export function makeRig2(svg) {
  const $ = (n) => svg.querySelector(`#${cid(n)}`);
  return {
    svg, $,
    actors: svg.querySelector('.ck-actors'), backLayer: svg.querySelector('.ck-back'), shadows: $('shadows'),
    fm: farmerHandles($), hen: birdHandles($, 0), cam: cameraHandles(svg),
    eggs: Array.from({ length: N_EGG }, (_, k) => ({ g: $(`egg${k}`), e: $(`eggE${k}`), sp: $(`eggS${k}`) })),
    segg: Array.from({ length: N_SEGG }, (_, k) => $(`segg${k}`)),
    sortKey: '',
  };
}

// ---- one round's plan (seeded weave + egg schedule) -------------------------------
const PLANS = new Map();
export function plan2(seed) {
  if (PLANS.has(seed)) return PLANS.get(seed);
  if (PLANS.size > 12) PLANS.clear();
  const R = rng(seed * 977 + 13);
  const P = { ph: R() * 6.28, ph2: R() * 6.28, ph3: R() * 6.28, te: [], ex: [], ey: [], tp: [] };
  for (let k = 0, t = .5; t < 26; k++, t = .5 + EGG_DT * k + (R() - .5) * .24) {
    const h = henRun(P, t);
    P.te.push(t); P.ex.push(h[0] - 12); P.ey.push(h[1] + 1);
    // when the farmer's feet reach it (his x only ever increases)
    let lo = t, hi = t + 3;
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (farmerRun(P, m)[0] < h[0] - 14) lo = m; else hi = m; }
    P.tp.push(hi);
  }
  PLANS.set(seed, P);
  return P;
}
const laneY = (P, t) => 264 + 14 * Math.sin(Math.PI * 2 * t / 1.45 + P.ph) + 5 * Math.sin(Math.PI * 2 * t / .55 + P.ph2);
function henRun(P, t) {
  const u = smooth(clamp((t - .03) / .45));
  const sx = lerp(HEN.x, H_X + 8 * Math.sin(t * 5.3 + P.ph3), u);
  return [sx + camRun(t), lerp(HEN.y, laneY(P, t), u)];
}
function farmerRun(P, t) {
  const sx = lerp(FARM0[0], F_X, smooth(clamp((t - .04) / .6))) + 3 * Math.sin(t * 6.5) * clamp(t / .6);
  return [sx + camRun(t), lerp(FARM0[1], laneY(P, Math.max(0, t - LAG)) + 2, smooth(clamp(t / .6)))];
}
const tEnd = (round) => (round.cashT != null ? round.cashT : round.tc);
// How many eggs he has run through by t (the game pulses the counter on each).
export function eggsCollected(round, t) {
  const P = plan2(round.seed), end = Math.min(t, tEnd(round));
  let n = 0; while (n < P.tp.length && P.tp[n] <= end) n++;
  return n;
}

function camAt(round, t) {
  const e = tEnd(round);
  if (t <= e) return camRun(t);
  return camRun(e) + stopDist(t, vRun(e), e, round.cashT != null ? .16 : .3);
}
function speedAt(round, t) {
  const e = tEnd(round);
  return t <= e ? vRun(t) : stopSpeed(t, vRun(e), e, round.cashT != null ? .16 : .3);
}

// ---- the frame ------------------------------------------------------------------
// t ≤ 0: idle. round: { seed, tc, cashT|null }. opts.still: reduced motion.
export function render2(R, t, round, opts = {}) {
  const { $ } = R;
  R.svg.classList.toggle('run', t > 0);
  const P = t > 0 ? plan2(round.seed) : null;
  const end = t > 0 ? tEnd(round) : 0;
  const cashed = t > 0 && round.cashT != null;
  const cam = t > 0 ? camAt(round, t) : 0;
  setCamera(R.cam, cam, t > 0 && !opts.still ? speedAt(round, t) : 0, t);
  const L = { actors: R.actors, backLayer: R.backLayer };
  const order = [];

  /* ---------- farmer ---------- */
  let FP, E = null, heldAt = null, landT = 0;
  const f0 = t > 0 ? farmerRun(P, Math.min(t, end)) : null;
  if (t <= 0) {
    FP = readyPose(FARM0[0], FARM0[1], [HEN.x - HEN.rx * .7, HEN.y + HEN.bcy - HEN.ry * .4], 1);
  } else if (t < end) {
    const run = runPose(f0[0] / 30 * Math.PI * 2);
    const k = smooth(clamp(t / .2));
    const base = k >= 1 ? run : mixPose(readyPose(FARM0[0], FARM0[1], [HEN.x, HEN.y - 30], 1), run, k);
    if (t < .14) base.lift = 6 * Math.sin(t / .14 * Math.PI);
    FP = { ...base, x: f0[0], y: f0[1], dir: 1 };
  } else if (cashed) {
    // the hen brakes; he dives on her, lands, jumps up holding her overhead
    const D = end, h0 = henRun(P, D);
    E = [h0[0] + 10, h0[1]];
    landT = D + DIVE;
    const landHip = [E[0] - REACH, E[1] - 10];
    const startHip = [f0[0], f0[1] - 36 * K];
    if (t < landT) {
      const u = (t - D) / DIVE, e = eOut(u);
      const pose = mixPose(runPose(f0[0] / 30 * Math.PI * 2), POSES.dive, smooth(clamp(u * 1.6)));
      const hip = lerp2(startHip, landHip, e);
      hip[1] -= 16 * Math.sin(Math.PI * u);
      FP = { ...pose, x: hip[0], y: hip[1] + 36 * K, dir: 1, lift: 0, ground: lerp(f0[1], E[1], e), look: [1.6, .3] };
    } else if (t < D + UP0) {
      const bump = Math.max(0, Math.sin((t - landT) / .12 * Math.PI)) * 2 * (t - landT < .12 ? 1 : 0);
      FP = { ...mixPose(POSES.dive, POSES.lie, smooth(clamp((t - landT) / .1))), x: landHip[0], y: landHip[1] + 36 * K - bump, dir: 1, ground: E[1], look: [1.6, .3] };
    } else {
      const u = smooth(clamp((t - D - UP0) / (UP1 - UP0)));
      const hip = lerp2(landHip, [E[0] - 6, E[1] + 3 - 36 * K], u);
      hip[1] -= 10 * Math.sin(Math.PI * u);
      const tt = t - D - UP1, jump = tt > 0 ? 8 * Math.abs(Math.sin(tt * Math.PI * 2.4)) * clamp(1 - tt / 1.25) : 0;
      FP = { ...mixPose(POSES.lie, POSES.hold, u), x: hip[0], y: hip[1] + 36 * K, dir: 1, lift: jump, ground: E[1] + 3 };
    }
    FP.landHip = landHip;
  } else {
    // the crash: he trips, pitches forward and belly-flops
    const tc = end, gy = f0[1], v = vRun(tc);
    const slide = (tt) => v * .28 * (1 - Math.exp(-Math.max(0, tt) / .28));
    landT = tc + TRIP + FALL;
    const runP = runPose(f0[0] / 30 * Math.PI * 2);
    const H0 = [f0[0] + slide(TRIP), gy - 36 * K];
    const H1 = [H0[0] + 34, gy - 10];
    if (t < tc + TRIP) {
      const u = (t - tc) / TRIP;
      FP = { ...mixPose(runP, POSES.trip, smooth(u)), x: f0[0] + slide(t - tc), y: gy, dir: 1, ground: gy };
    } else if (t < landT) {
      const u = (t - tc - TRIP) / FALL;
      const hip = lerp2(H0, H1, eIn(u));
      FP = { ...mixPose(POSES.trip, POSES.plant, smooth(u)), x: hip[0], y: hip[1] + 36 * K, dir: 1, ground: gy };
    } else {
      const tt = t - landT, sq = tt < .2 ? Math.sin(tt / .2 * Math.PI) * 2.5 : 0;
      FP = { ...POSES.plant, x: H1[0] + 4 * eOut(clamp(tt / .3)), y: H1[1] + 36 * K + 2 + sq, dir: 1, ground: gy };
    }
    FP.landHip = H1;
    E = [H1[0], gy];
  }
  drawFarmer(R.fm, FP);
  order.push([R.fm.root, FP.ground ?? FP.y]);

  /* ---------- the hen ---------- */
  let C, henPos = null;
  if (t <= 0) {
    C = { x: HEN.x, y: HEN.y, dir: HEN.dir, phase: null };
  } else if (t < end) {
    const h = henRun(P, t), tt = Math.min(t, .12);
    const laying = P.te.some(te => t >= te && t < te + .16);
    C = { x: h[0], y: h[1], dir: t < .05 ? HEN.dir : -1, phase: t * 30, lift: 2.6 * Math.abs(Math.sin(t * 15)) + (tt < .12 ? 4 * Math.sin(tt / .12 * Math.PI) : 0),
          tilt: laying ? -4 : -14, flap: laying ? -60 : -22 - 26 * Math.sin(t * 32), head: 14, squawk: laying || Math.sin(t * 7) > .4, panic: true };
    henPos = h;
  } else if (cashed) {
    const D = end;
    if (t < landT - .02) {
      const tt = t - D, h0 = henRun(P, D);
      C = { x: lerp(h0[0], E[0], eOut(clamp(tt / .2))), y: E[1], dir: tt > .1 ? 1 : -1, phase: tt * 40, lift: 5 * Math.abs(Math.sin(tt * 18)), flap: -40 - 30 * Math.sin(t * 50), head: -10, squawk: true, panic: true };
    } else {
      const hw = lerp2(fmWorld(FP, FP._h0), fmWorld(FP, FP._h1), .5);
      const held = t > D + UP0;
      const cy = hw[1] + (held ? -7 : 3);
      C = { x: hw[0] + (held ? 2 : 6), y: cy - HEN.bcy, dir: -1, phase: t * 30, flap: -45 - 35 * Math.sin(t * 46), head: held ? -18 : -6, tilt: held ? -10 : 0,
            squawk: Math.sin(t * 12) > -.3, panic: true, ground: E[1] + 4, hideShadow: true };
      heldAt = [C.x, cy];
    }
  } else {
    // flies off up and over the fence, flapping hard
    const tc = end, h0 = henRun(P, tc), tt = t - tc, u = clamp(tt / 1.3);
    C = { x: h0[0] + 40 * tt + 120 * u * u, y: h0[1] - 190 * eOut(u) + 8 * Math.sin(tt * 20), dir: -1, phase: null, lift: 0, tilt: -24,
          flap: -80 * Math.abs(Math.sin(tt * 30)) - 10, head: 10, squawk: true, panic: true, ground: h0[1], hideShadow: tt > .25, op: 1 - clamp((tt - 1.1) / .3) };
    henPos = h0;
  }
  drawChicken(R.hen, HEN, C, L);
  order.push([R.hen.g, heldAt ? 1e4 : (C.ground ?? C.y)]);
  depthSort(R, order);

  /* ---------- golden eggs: laid behind her, popped as he runs through ---------- */
  for (let s = 0; s < N_EGG; s++) {
    const EG = R.eggs[s];
    let k = -1;
    if (t > 0) for (let j = s; j < P.te.length && P.te[j] <= Math.min(t, end); j += N_EGG) k = j;
    if (k < 0) { EG.g.setAttribute('opacity', 0); continue; }
    const te = P.te[k], tp = P.tp[k], x = P.ex[k], gy = P.ey[k];
    const picked = tp <= end && t >= tp;
    const fall = clamp((t - te) / .22);
    let y = gy - 7.4, sc = 1, op = 1, rot = 0;
    if (fall < 1) { y = lerp(gy - 22, gy - 7.4, fall * fall) - 5 * Math.sin(Math.PI * clamp((fall - .7) / .3)); rot = 40 * (1 - fall); }
    if (picked) {
      const a = (t - tp) / .24;
      sc = 1 + .8 * eOut(clamp(a)); op = 1 - clamp(a);
      EG.sp.setAttribute('opacity', f1(clamp(1 - (t - tp) / .5)));
      const r = 6 + 16 * eOut(clamp((t - tp) / .4));
      EG.sp.setAttribute('transform', `scale(${f1(r / 10)}) rotate(${f1((t - tp) * 160)})`);
    } else EG.sp.setAttribute('opacity', 0);
    if (picked && t - tp > .5) { EG.g.setAttribute('opacity', 0); continue; }
    EG.g.setAttribute('opacity', 1);
    EG.g.setAttribute('transform', `translate(${f1(x)} ${f1(y)})`);
    EG.e.setAttribute('transform', `rotate(${f1(rot)}) scale(${f1(sc)})`);
    EG.e.setAttribute('opacity', f1(op));
  }

  /* ---------- the crash: eggs scatter from the fleeing hen ---------- */
  for (let k = 0; k < N_SEGG; k++) {
    const el = R.segg[k];
    if (t <= 0 || cashed || t < end) { el.setAttribute('opacity', 0); continue; }
    const h0 = henRun(P, end), S = SEGG[k], tt = t - end, gy = h0[1] + S.dy;
    const x0 = h0[0], y0 = h0[1] - 18, G = 420;
    const t1 = (-S.vy + Math.sqrt(S.vy * S.vy + 2 * G * (gy - 7.4 - y0))) / G; // first touchdown
    let x, y;
    if (tt < t1) { x = x0 + S.vx * tt; y = y0 + S.vy * tt + .5 * G * tt * tt; }
    else {
      const b = tt - t1, vb = -(S.vy + G * t1) * .35, t2 = -2 * vb / G;
      x = x0 + S.vx * t1 + S.vx * .45 * Math.min(b, t2 + .3);
      y = b < t2 ? gy - 7.4 + vb * b + .5 * G * b * b : gy - 7.4;
    }
    el.setAttribute('opacity', 1);
    el.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(S.spin * Math.min(tt, t1 + .3))})`);
  }

  /* ---------- dust kicked up behind the farmer ---------- */
  for (let k = 0; k < N_PUFF; k++) {
    const el = $('pf' + k);
    if (t <= 0) { el.setAttribute('opacity', 0); continue; }
    // a puff every 0.1 s; slot k shows the newest emission k (mod N_PUFF)
    const n = Math.floor((Math.min(t, end) - .14) / .1);
    let j = n - ((n - k) % N_PUFF + N_PUFF) % N_PUFF;
    const ts = .14 + j * .1, age = t - ts;
    if (j < 0 || age > .55 || ts > end) { el.setAttribute('opacity', 0); continue; }
    const r = farmerRun(P, ts);
    el.setAttribute('transform', `translate(${f1(r[0] - 8 - age * 10)} ${f1(r[1] - 2 - age * 9)}) scale(${f1(.55 + age * 2)})`);
    el.setAttribute('opacity', f1(.85 * (1 - age / .55)));
  }
  for (let k = 0; k < 7; k++) $('cp' + k).setAttribute('opacity', 0);

  /* ---------- landing dust cloud ---------- */
  const cl = $('cloud');
  if (E && t > landT - .02) {
    const tt = t - landT + .02, big = cashed ? .75 : 1.15, life = cashed ? .6 : 1.1;
    const land = bodyWorld(FP, cashed ? [0, -70] : [3, -24]);
    cl.setAttribute('transform', `translate(${f1(land[0])} ${f1(E[1] + (cashed ? -4 : 2))}) scale(${f1(big * (.5 + .6 * eOut(clamp(tt / .35))))} ${f1(big * (.45 + .5 * eOut(clamp(tt / .35))))})`);
    cl.setAttribute('opacity', f1(opts.still ? 0 : clamp(1 - (tt - life * .35) / (life * .65))));
    CLOUD.forEach(([x, y], k) => $('cl' + k).setAttribute('transform', `translate(${f1(x * .5 * eOut(clamp(tt / .5)))} ${f1(y * .3 * eOut(clamp(tt / .5)) - tt * 4)})`));
  } else cl.setAttribute('opacity', 0);

  /* ---------- the hat pops off on the landing; after a fall it rolls away ---------- */
  const hatW = $('hatW');
  if (E && t > landT) {
    const tt = t - landT;
    const LP = { ...POSES.dive, x: FP.landHip[0], y: FP.landHip[1] + 36 * K, dir: 1 };
    const h0 = bodyWorld(LP, [3, -100]);
    const u = clamp(tt / .45), gy = E[1] + 4, lo = cam + 22, hi = cam + 278;
    let x = h0[0] + 24 * u;
    let y = lerp(h0[1] - 6, gy - 14 * K, u) - 30 * Math.sin(Math.PI * u) * (1 - u * .3);
    let rot = u * 250;
    if (!cashed && tt > .45) {
      const r = clamp((tt - .45) / 1.0), s2 = 22 * eOut(r);
      x = clamp(x + s2, lo, hi); y = gy - 14 * K;
      rot = 250 + s2 / (14 * K) * 57.3 + (r >= 1 ? Math.sin((tt - 1.45) * 10) * 5 * clamp(1 - (tt - 1.45) / .5) : 0);
    } else if (cashed && tt > .45) rot = 250 + Math.sin((tt - .45) * 9) * 6 * clamp(1 - (tt - .45) / .6);
    if (opts.still && !cashed) { x = clamp(h0[0] + 46, lo, hi); y = gy - 14 * K; rot = 250 + 22 / (14 * K) * 57.3; }
    hatW.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${K} ${K}) translate(-3 96)`);
    hatW.setAttribute('opacity', 1);
  } else hatW.setAttribute('opacity', 0);

  /* ---------- dizzy stars after the fall ---------- */
  const dz = $('dizzy');
  if (!cashed && E && t > landT + .12) {
    const hd = headWorld(FP);
    dz.setAttribute('opacity', 1);
    [0, 1, 2].forEach(k => { const a = t * 5 + k * 2.1; $('dz' + k).setAttribute('transform', `translate(${f1(hd[0] + Math.cos(a) * 20)} ${f1(hd[1] - 30 + Math.sin(a) * 5)}) scale(${f1(.8 + .25 * Math.sin(a))})`); });
  } else dz.setAttribute('opacity', 0);

  /* ---------- sweat while running ---------- */
  const sw = $('sweat');
  if (t > .3 && t < end) {
    sw.setAttribute('opacity', 1);
    const hd = fmWorld(FP, [-8, -96]);
    [0, 1].forEach(k => { const a = ((t * 2.6 + k * .5) % 1); const el = $('sw' + k); el.setAttribute('transform', `translate(${f1(hd[0] - (4 + a * 12))} ${f1(hd[1] - 4 + a * a * 18 - a * 8)})`); el.setAttribute('opacity', f1(1 - a)); });
  } else sw.setAttribute('opacity', 0);

  /* ---------- feathers: the catch, or the hen's panicked take-off ---------- */
  const fc = [HEN.c, HEN.l, HEN.wing, HEN.d];
  for (let k = 0; k < N_FEATH; k++) {
    const el = $('fe' + k), F = FEATH[k];
    if (t <= 0 || t < end) { el.setAttribute('opacity', 0); continue; }
    let t0, org, n;
    if (cashed) { t0 = landT + F.d * .5 + (k > 8 ? .55 : 0); org = k > 8 ? (heldAt || E) : E; n = N_FEATH; }
    else { t0 = end + .05 + F.d; org = [henPos[0], henPos[1] - 20]; n = 8; }
    const tt = t - t0;
    if (k >= n || tt < 0 || tt > 1.8) { el.setAttribute('opacity', 0); continue; }
    const drag = 1 - Math.exp(-tt * 3);
    const x = org[0] + Math.cos(F.a) * F.v * drag / 3 + Math.sin(tt * 5 + F.ph) * F.sw * 2;
    const y = org[1] - 10 + Math.sin(F.a) * F.v * drag / 3 + tt * tt * 14 + tt * 10;
    el.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(F.spin * tt * .3 + Math.sin(tt * 5 + F.ph) * 30)}) scale(.95)`);
    el.firstChild.setAttribute('fill', fc[k % 4]);
    el.setAttribute('opacity', f1(clamp(1 - (tt - 1.2) / .6)));
  }

  /* ---------- the catch: grip, sparkles, confetti ---------- */
  const gh = $('gripHands');
  if (heldAt && t > end + UP0 + .1) {
    gh.setAttribute('opacity', 1);
    [0, 1].forEach(k => { const w = fmWorld(FP, FP['_h' + k]); const el = $('gh' + k); el.setAttribute('cx', f1(w[0])); el.setAttribute('cy', f1(w[1])); });
  } else gh.setAttribute('opacity', 0);
  const sparksOn = heldAt && t > end + UP1 - .1;
  SPARK.forEach((s, k) => {
    const el = $('sp' + k);
    if (!sparksOn) { el.setAttribute('opacity', 0); return; }
    const p = ((t - end - UP1 + k * .17) % .9) / .9, sc = Math.sin(Math.PI * Math.max(0, p));
    el.setAttribute('opacity', 1);
    el.setAttribute('transform', `translate(${f1(heldAt[0] + s[0])} ${f1(heldAt[1] + s[1])}) scale(${f1(sc)}) rotate(${f1(p * 90)})`);
  });
  const cfG = $('conf');
  if (heldAt && t > end + UP1 - .05) {
    const tt = t - end - UP1 + .05;
    cfG.setAttribute('opacity', f1(opts.still ? 0 : clamp(1 - (tt - 1.1) / .4)));
    CONFP.forEach((p, i) => $('cf' + i).setAttribute('transform', `translate(${f1(heldAt[0] + p.vx * tt)} ${f1(heldAt[1] + p.vy * tt + .5 * 300 * tt * tt)}) rotate(${f1(p.spin * tt)})`));
  } else cfG.setAttribute('opacity', 0);
}

// The catch is over (the hold) / the fall has settled, seconds after the end.
export const AFTER_CASH_S = UP1 + 1.3;
export const AFTER_FALL_S = TRIP + FALL + 1.9;

export function setGone2(R, gone) {
  R.actors.classList.toggle('gone', gone);
  R.shadows.style.opacity = gone ? 0 : 1;
}
