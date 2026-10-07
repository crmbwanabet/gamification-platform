// Chicken Catch 2 motion — the crash-game run drawn from the pure choreography
// in lib/chicken2/motion.mjs (render2(rig, t, round)), with the shared scene
// (parallax camera, farmer, bird, effects).
//
// RUN (frameAt → 'run'): the farmer chases the golden hen in near-catch waves —
// he closes in, leaps and lunges with his hands reaching to within inches of
// her tail, she flaps / darts away in a puff of feathers, the gap reopens, and
// again, faster and wilder as the multiplier climbs. She lays a golden egg
// every ~0.8 s; he runs through each one and it pops (the game pulses the
// counter on each pickup — eggsCollected()).
// FAIRNESS: every run frame is chase(t, seed) — the crash point is never read
// before the run ends; it only decides WHEN the end branch below takes over.
// The end branches start from whatever pose and position he is in then:
// 'catch' (cash-out / auto / the 10x max): the hen brakes, he dives, lands on
//   her and jumps up holding her overhead (sparkles, confetti).
// 'fall' (the crash, at ANY phase — mid-stride or mid-lunge): his momentum
//   carries him into a trip and a sliding belly-flop (dust, the hat rolls off,
//   dizzy stars); the hen squawks and flies off over the fence, eggs scatter.
// The scene stays where it ended; the game resets to the yard.

import { K, POSES, cid, clamp, lerp, lerp2, eOut, eIn, smooth, f1, D2R, rng, birdGeom } from '../chicken/shared/rig';
import {
  farmerHandles, birdHandles, drawFarmer, fmWorld, headWorld, bodyWorld,
  runPose, mixPose, REACH, readyPose, drawChicken, depthSort,
} from '../chicken/shared/actors';
import { cameraHandles, setCamera, stopDist, stopSpeed } from '../chicken/shared/camera';
import { N_PUFF, N_FEATH, CLOUD, SPARK, CONFP } from '../chicken/shared/Effects';
import { N_EGG, N_SEGG } from './Eggs';
import {
  chase, lastMiss, plan, frameAt, lungePose, vRun, MISS_U, FARM0, HEN0,
  eggsCollected as eggsCollectedPure,
} from '@/lib/chicken2/motion.mjs';

// The golden hen (one bird, index 0 in the shared bird art).
export const HEN = birdGeom({
  id: 'gold', mult: 1, name: 'Golden hen', x: HEN0[0], y: HEN0[1], dir: 1, rx: 20, ry: 16, leg: 7, neck: 3.5, hr: 9,
  c: '#F0A93A', l: '#FFD27A', d: '#A9601A', wing: '#D2852A', belly: '#FFE3A0', comb: 'big', eye: 'cute', tail: 'hen',
  tc: ['#B8681C', '#F0A93A', '#D2852A'], tag: { c: '#FFC21F', l: '#FFE27A', d: '#B88400' },
});

export const eggsCollected = eggsCollectedPure;

const DIVE = .28, UP0 = .48, UP1 = .84; // the catch, after the cash-out
const TRIP = .16, FALL = .26;           // the fall, after the crash
const MISS_LIFE = .95;                  // a near-miss feather puff
const N_MISS = 6, MISS0 = N_FEATH - N_MISS; // its feather slots (the end bursts use the rest first)

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

// ---- the run poses: pure functions of the chase state s (so of t and the seed) ----
function farmerPose(s, t) {
  const run = runPose(s.fx / 30 * Math.PI * 2);
  let base = s.L > 0 ? mixPose(run, lungePose(s.I), s.L) : run;
  if (s.missed > .25) base = { ...base, mouth: 'oops', brows: 'up', squint: 0 };   // so close!
  const k = smooth(clamp(t / .2));
  if (k < 1) base = mixPose(readyPose(FARM0[0], FARM0[1], [HEN.x, HEN.y - 30], 1), base, k);
  let lift = (base.lift || 0) + s.leap;
  if (t < .14) lift = 6 * Math.sin(t / .14 * Math.PI);
  return { ...base, lift, x: s.fx, y: s.fy, dir: 1, ground: s.fy };
}
function henPose(s, t, P) {
  const laying = P.te.some(te => t >= te && t < te + .16);
  const alarm = s.L > 0 && s.u < MISS_U ? clamp((s.u - .58) / (MISS_U - .58)) : 0;   // she senses the hands
  const panic = Math.max(alarm, clamp(s.dart * 2.5));
  const tt = Math.min(t, .12);
  const flapRun = laying ? -60 : -22 - 26 * Math.sin(t * 32);
  return {
    x: s.hx, y: s.hy, dir: t < .05 ? HEN.dir : -1, phase: t * 30 * (1 + .6 * s.dart),
    lift: 2.6 * Math.abs(Math.sin(t * 15)) + (tt < .12 ? 4 * Math.sin(tt / .12 * Math.PI) : 0) + s.dLift,
    tilt: lerp(laying ? -4 : -14, -26, panic), flap: lerp(flapRun, -38 - 48 * Math.abs(Math.sin(t * 52)), panic),
    head: lerp(14, 4, panic), squawk: laying || panic > .3 || Math.sin(t * 7) > .4, panic: true,
  };
}

function camAt(f, t) {
  if (f.mode === 'run') return f.s.cam;
  const v = vRun(f.end), tau = f.mode === 'catch' ? .16 : .3;
  return f.s.cam + stopDist(t, v, f.end, tau) + (f.camExtra || 0) * smooth(clamp(f.tt / .9));
}
function speedAt(f, t) {
  if (f.mode === 'run') return vRun(t);
  return stopSpeed(t, vRun(f.end), f.end, f.mode === 'catch' ? .16 : .3);
}

// ---- the frame ------------------------------------------------------------------
// t ≤ 0: idle. round: { seed, tc, cashT|null }. opts.still: reduced motion.
export function render2(R, t, round, opts = {}) {
  const { $ } = R;
  const f = frameAt(t, round);
  const live = f.mode !== 'idle';
  R.svg.classList.toggle('run', live);
  const P = live ? plan(round.seed) : null;
  const end = f.mode === 'run' ? Infinity : f.end ?? 0;
  const cashed = f.mode === 'catch';
  const fell = f.mode === 'fall';
  const L = { actors: R.actors, backLayer: R.backLayer };
  const order = [];

  /* ---------- the run state at the end (the pose every end branch starts from) ---------- */
  let FPc = null, Cc = null, vF = 0, vH = 0;
  if (cashed || fell) {
    FPc = farmerPose(f.s, end);
    Cc = henPose(f.s, end, P);
    const dt = Math.min(.03, end), sp = chase(end - dt, round.seed);
    vF = dt > 0 ? (f.s.fx - sp.fx) / dt : 0;
    vH = dt > 0 ? (f.s.hx - sp.hx) / dt : 0;
  }
  // after a fall: the slide his momentum carries him through
  const slide = (tt) => vF * .28 * (1 - Math.exp(-Math.max(0, tt) / .28));
  const fallX = (tt) => FPc.x + slide(tt) + 30 * eIn(clamp((tt - TRIP) / FALL)) + 4 * eOut(clamp((tt - TRIP - FALL) / .3));
  if (fell) {
    // keep him on screen: the camera drifts on if his slide would carry him too far right
    const hipEnd = f.s.sx + vF * .28 + 34 - vRun(end) * .3;
    f.camExtra = Math.max(0, hipEnd - 150);
  }
  const cam = live ? camAt(f, t) : 0;
  setCamera(R.cam, cam, live && !opts.still ? speedAt(f, t) : 0, t);

  /* ---------- farmer ---------- */
  let FP, E = null, heldAt = null, landT = 0;
  if (!live) {
    FP = readyPose(FARM0[0], FARM0[1], [HEN.x - HEN.rx * .7, HEN.y + HEN.bcy - HEN.ry * .4], 1);
  } else if (f.mode === 'run') {
    FP = farmerPose(f.s, t);
  } else if (cashed) {
    // the hen brakes; he dives on her from wherever he is, lands, jumps up holding her
    const D = end;
    E = [Cc.x + 10, f.s.hy];
    landT = D + DIVE;
    const landHip = [E[0] - REACH, E[1] - 10];
    const startHip = [FPc.x, FPc.y - 36 * K - (FPc.lift || 0)];
    if (t < landT) {
      const u = (t - D) / DIVE, e = eOut(u);
      const pose = mixPose(FPc, POSES.dive, smooth(clamp(u * 1.6)));
      const hip = lerp2(startHip, landHip, e);
      hip[1] -= 16 * Math.sin(Math.PI * u);
      FP = { ...pose, x: hip[0], y: hip[1] + 36 * K, dir: 1, lift: 0, ground: lerp(FPc.y, E[1], e), look: [1.6, .3] };
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
    // the crash, from any pose: momentum pitches him into a trip, then a sliding belly-flop
    const tc = end, gy = FPc.ground, tt = t - tc;
    landT = tc + TRIP + FALL;
    const x = fallX(tt);
    if (tt < TRIP) {
      FP = { ...mixPose(FPc, POSES.trip, smooth(tt / TRIP)), x, y: gy, dir: 1, ground: gy };
    } else if (t < landT) {
      const u = (tt - TRIP) / FALL;
      const hy = lerp(gy - 36 * K, gy - 10, eIn(u));
      FP = { ...mixPose(POSES.trip, POSES.plant, smooth(u)), x, y: hy + 36 * K, dir: 1, ground: gy };
    } else {
      const ts = t - landT, sq = ts < .2 ? Math.sin(ts / .2 * Math.PI) * 2.5 : 0;
      FP = { ...POSES.plant, x, y: gy - 10 + 36 * K + sq, dir: 1, ground: gy };
    }
    const hx = fallX(TRIP + FALL);
    FP.landHip = [hx, gy - 10];
    E = [hx, gy];
  }
  drawFarmer(R.fm, FP);
  order.push([R.fm.root, FP.ground ?? FP.y]);

  /* ---------- the hen ---------- */
  let C, henPos = null;
  if (!live) {
    C = { x: HEN.x, y: HEN.y, dir: HEN.dir, phase: null };
  } else if (f.mode === 'run') {
    C = henPose(f.s, t, P);
  } else if (cashed) {
    const D = end;
    if (t < landT - .02) {
      const tt = t - D;
      C = { x: lerp(Cc.x, E[0], eOut(clamp(tt / .2))), y: E[1], dir: tt > .1 ? 1 : -1, phase: tt * 40,
            lift: Cc.lift * (1 - eOut(clamp(tt / .2))) + 5 * Math.abs(Math.sin(tt * 18)), flap: -40 - 30 * Math.sin(t * 50), head: -10, squawk: true, panic: true };
    } else {
      const hw = lerp2(fmWorld(FP, FP._h0), fmWorld(FP, FP._h1), .5);
      const held = t > D + UP0;
      const cy = hw[1] + (held ? -7 : 3);
      C = { x: hw[0] + (held ? 2 : 6), y: cy - HEN.bcy, dir: -1, phase: t * 30, flap: -45 - 35 * Math.sin(t * 46), head: held ? -18 : -6, tilt: held ? -10 : 0,
            squawk: Math.sin(t * 12) > -.3, panic: true, ground: E[1] + 4, hideShadow: true };
      heldAt = [C.x, cy];
    }
  } else {
    // squawk! she flies up and away over the fence from wherever she was
    const tt = t - end, u = clamp(tt / 1.3);
    C = { x: Cc.x + vH * .22 * (1 - Math.exp(-tt / .22)) + 40 * tt + 120 * u * u, y: Cc.y - 190 * eOut(u) + 8 * Math.sin(tt * 20), dir: -1, phase: null,
          lift: Cc.lift, tilt: lerp(Cc.tilt, -24, smooth(clamp(tt / .12))), flap: -80 * Math.abs(Math.sin(tt * 30)) - 10, head: 10, squawk: true, panic: true,
          ground: Cc.y, hideShadow: tt > .25, op: 1 - clamp((tt - 1.1) / .3) };
    henPos = [Cc.x, Cc.y - Cc.lift];
  }
  drawChicken(R.hen, HEN, C, L);
  order.push([R.hen.g, heldAt ? 1e4 : (C.ground ?? C.y)]);
  depthSort(R, order);

  /* ---------- golden eggs: laid behind her, popped as he runs through ---------- */
  const tRun = Math.min(t, end);
  for (let s = 0; s < N_EGG; s++) {
    const EG = R.eggs[s];
    let k = -1;
    if (live) for (let j = s; j < P.te.length && P.te[j] <= tRun; j += N_EGG) k = j;
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
    if (!fell) { el.setAttribute('opacity', 0); continue; }
    const S = SEGG[k], tt = t - end, gy = Cc.y + S.dy;
    const x0 = Cc.x, y0 = Cc.y - Cc.lift - 18, G = 420;
    const t1 = (-S.vy + Math.sqrt(S.vy * S.vy + 2 * G * Math.max(0, gy - 7.4 - y0))) / G; // first touchdown
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
    if (!live) { el.setAttribute('opacity', 0); continue; }
    // a puff every 0.1 s; slot k shows the newest emission k (mod N_PUFF)
    const n = Math.floor((tRun - .14) / .1);
    let j = n - ((n - k) % N_PUFF + N_PUFF) % N_PUFF;
    const ts = .14 + j * .1, age = t - ts;
    if (j < 0 || age > .55 || ts > end) { el.setAttribute('opacity', 0); continue; }
    const r = chase(ts, round.seed);
    el.setAttribute('transform', `translate(${f1(r.fx - 8 - age * 10)} ${f1(r.fy - 2 - age * 9)}) scale(${f1(.55 + age * 2)})`);
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
  if (fell && t > landT + .12) {
    const hd = headWorld(FP);
    dz.setAttribute('opacity', 1);
    [0, 1, 2].forEach(k => { const a = t * 5 + k * 2.1; $('dz' + k).setAttribute('transform', `translate(${f1(hd[0] + Math.cos(a) * 20)} ${f1(hd[1] - 30 + Math.sin(a) * 5)}) scale(${f1(.8 + .25 * Math.sin(a))})`); });
  } else dz.setAttribute('opacity', 0);

  /* ---------- sweat while running ---------- */
  const sw = $('sweat');
  if (f.mode === 'run' && t > .3) {
    sw.setAttribute('opacity', 1);
    const hd = fmWorld(FP, [-8, -96]);
    [0, 1].forEach(k => { const a = ((t * 2.6 + k * .5) % 1); const el = $('sw' + k); el.setAttribute('transform', `translate(${f1(hd[0] - (4 + a * 12))} ${f1(hd[1] - 4 + a * a * 18 - a * 8)})`); el.setAttribute('opacity', f1(1 - a)); });
  } else sw.setAttribute('opacity', 0);

  /* ---------- feathers: near-miss puffs, then the catch or the hen's take-off ---------- */
  const fc = [HEN.c, HEN.l, HEN.wing, HEN.d];
  const miss = live && !opts.still ? lastMiss(tRun, round.seed) : null;
  for (let k = 0; k < N_FEATH; k++) {
    const el = $('fe' + k), F = FEATH[k];
    let x, y, tt, op;
    const j = k - MISS0;
    const mAge = miss && j >= 0 && j < miss.n ? t - miss.t - F.d * .3 : -1;
    if (mAge >= 0 && mAge < MISS_LIFE) {
      // a few tail feathers knocked loose by his fingertips; they hang in the air as she pulls away
      tt = mAge;
      const drag = 1 - Math.exp(-tt * 4);
      x = miss.x - 20 + Math.cos(F.a) * F.v * drag / 2.6 + Math.sin(tt * 6 + F.ph) * F.sw * 2;
      y = miss.y - 30 + Math.sin(F.a) * F.v * drag / 3.2 + tt * tt * 26 + tt * 8;
      op = clamp(1 - (tt - MISS_LIFE * .55) / (MISS_LIFE * .45));
    } else {
      if (!live || f.mode === 'run') { el.setAttribute('opacity', 0); continue; }
      let t0, org, n;
      if (cashed) { t0 = landT + F.d * .5 + (k > 8 ? .55 : 0); org = k > 8 ? (heldAt || E) : E; n = N_FEATH; }
      else { t0 = end + .05 + F.d; org = [henPos[0], henPos[1] - 20]; n = 8; }
      tt = t - t0;
      if (k >= n || tt < 0 || tt > 1.8) { el.setAttribute('opacity', 0); continue; }
      const drag = 1 - Math.exp(-tt * 3);
      x = org[0] + Math.cos(F.a) * F.v * drag / 3 + Math.sin(tt * 5 + F.ph) * F.sw * 2;
      y = org[1] - 10 + Math.sin(F.a) * F.v * drag / 3 + tt * tt * 14 + tt * 10;
      op = clamp(1 - (tt - 1.2) / .6);
    }
    el.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(F.spin * tt * .3 + Math.sin(tt * 5 + F.ph) * 30)}) scale(.95)`);
    el.firstChild.setAttribute('fill', fc[k % 4]);
    el.setAttribute('opacity', f1(op));
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
