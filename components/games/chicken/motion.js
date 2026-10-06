// Chicken Catch motion — a pure function of time (render(rig, t, …)) that poses
// the farmer (two-bone IK limbs), the birds, the camera and the effects by
// writing SVG attributes. Static states (idle, the reduced-motion end frame)
// are single frames; a round is a rAF loop over t. Why not CSS keyframes like
// Penalty Crash: the farmer's limbs are IK paths (`d`), the chase is a fresh
// seeded run every round and the actors are depth-sorted / moved behind the
// fence — none of which CSS can animate.
//
// The chase is a side-scroller: on CATCH the farmer bursts out of his crouch
// and sprints right after the chosen bird; the camera pans with him (parallax:
// sky still, hills / trees slow, fence medium, ground and tufts fast, speed
// lines, dust left behind), the bird zig-zags ahead flapping, the rest of the
// flock scatters and is left behind. At T_D he dives — the camera eases to a
// stop — and the catch / the escape over the fence plays out right there. The
// next round starts back in the yard (cam = 0). Timings are the original
// chase's (T_D / T_LAND / LAND_S / END_S / PANEL_S unchanged).
// The DOM nodes are React-rendered (shared/Yard, Farmer, Chickens, Effects);
// React never changes their order, classes or transforms after mount, so the
// renderer owns them.

import {
  CK, FARM0, K, POSES, cid,
  clamp, lerp, lerp2, eOut, eIn, eInOut, smooth, f1, D2R, rng,
} from './shared/rig';
import {
  farmerHandles, birdHandles, drawFarmer, fmWorld, headWorld, bodyWorld,
  runPose, mixPose, REACH, readyPose, drawChicken, depthSort,
} from './shared/actors';
import { cameraHandles, setCamera, rampDist, rampSpeed, stopDist, stopSpeed } from './shared/camera';
import { postsBetween } from './shared/Yard';
import { N_PUFF, N_CPUFF, N_FEATH, CLOUD, SPARK, CONFP } from './shared/Effects';

// ---- timing (seconds) — unchanged from the yard chase ----------------------------
export const T_D = 1.72;      // the dive starts
export const T_LAND = 2.0;    // belly hits the dirt
const T_UP0 = 2.2, T_UP1 = 2.56;
export const LAND_S = { win: 2.3, lose: 2.15 }; // result line + onRound
export const END_S = { win: 3.6, lose: 4.1 };   // animation done
export const PANEL_S = 3.2;                     // WinCelebration pops in
export const STILL_T = 2.9;                     // reduced motion: the one frame shown

// ---- the run ------------------------------------------------------------------
const V = 260;                // camera / running speed, units per second
const CAM_T0 = .1, CAM_RAMP = .45, CAM_TAU = .16;
const F_RUN_X = 92;           // farmer's screen x while sprinting
const LANE_X = 214;           // the bird's screen x early in the run
const GAP_END = 86;           // bird ahead of the farmer when he dives
const FENCE_F = .6;           // fence parallax (camera.js PX.Fence)
const PY = 141;               // a fence post's top

export const camAt = (t) => (t <= T_D ? rampDist(t, V, CAM_T0, CAM_RAMP) : rampDist(T_D, V, CAM_T0, CAM_RAMP) + stopDist(t, V, T_D, CAM_TAU));
const speedAt = (t) => (t <= T_D ? rampSpeed(t, V, CAM_T0, CAM_RAMP) : stopSpeed(t, V, T_D, CAM_TAU));
const CAM_END = camAt(99);

const rf = rng(77);
const FEATH = Array.from({ length: N_FEATH }, () => ({ a: (-150 + rf() * 120) * D2R, v: 50 + rf() * 70, sw: 2 + rf() * 4, ph: rf() * 6, spin: (rf() - .5) * 500, d: rf() * .12 }));
// the rest of the flock flutters aside and is left behind by the camera
const SCAT = CK.map((b, i) => ({ to: [b.x + (i % 2 ? -34 : 30), b.y + (i % 2 ? 12 : -12)], t0: .06 + (i * .37 % 1) * .14, dur: .8 + (i % 3) * .12 }));

// ---- the rig: element handles inside one scene <svg> --------------------------
export function makeRig(svg) {
  const $ = (n) => svg.querySelector(`#${cid(n)}`);
  return {
    svg, $,
    actors: svg.querySelector('.ck-actors'), backLayer: svg.querySelector('.ck-back'), shadows: $('shadows'),
    fm: farmerHandles($),
    ck: CK.map((b, i) => birdHandles($, i)),
    cam: cameraHandles(svg),
    sortKey: '',
  };
}

// ---- the chase plan: one per round (pick × seed) --------------------------------
const fsx = (t) => lerp(FARM0[0], F_RUN_X, smooth(clamp((t - .04) / .6))) + 3 * Math.sin(t * 6.5) * clamp(t / .6);
const PLANS = new Map();
function plan(pick, seed) {
  const key = pick + ':' + seed;
  if (PLANS.has(key)) return PLANS.get(key);
  if (PLANS.size > 24) PLANS.clear();
  const R = rng(seed * 131 + pick * 7 + 3), b = CK[pick];
  // zig-zag: alternate far / near lane targets every ~0.3 s
  const zt = [0], zy = [b.y];
  let up = R() < .5, tt = .12;
  while (tt < T_D + .5) { zt.push(tt); zy.push(up ? 242 + R() * 8 : 276 + R() * 8); up = !up; tt += .26 + R() * .1; }
  const ph = R() * 6;
  const x0 = clamp(b.x + 40, 196, 236);
  const P = { b, zt, zy, ph, x0 };
  P.E = henAt(P, T_D);
  PLANS.set(key, P);
  return P;
}
function laneY(P, t) {
  const { zt, zy } = P;
  let j = 0; while (j < zt.length - 2 && zt[j + 1] <= t) j++;
  const u = clamp((t - zt[j]) / (zt[j + 1] - zt[j]));
  return lerp(zy[j], zy[j + 1], (1 - Math.cos(Math.PI * u)) / 2);
}
// the bird, world coords, while running (t ≤ T_D)
function henAt(P, t) {
  const tc = Math.min(t, T_D);
  const lane = lerp(P.x0, fsx(T_D) + GAP_END, smooth(clamp((tc - .7) / (T_D - .7)))) + 9 * Math.sin(tc * 9 + P.ph) * clamp(tc / .4);
  const u = smooth(clamp((tc - .03) / .42));
  const sx = lerp(P.b.x, lane, u);
  return [sx + camAt(tc), laneY(P, tc)];
}
// the farmer's feet, world coords, while running (follows the bird's trail)
function farmerAt(P, t) {
  const tc = Math.min(t, T_D);
  const y = lerp(FARM0[1], laneY(P, Math.max(0, tc - .3)) + 2, smooth(clamp(tc / .5)));
  return [fsx(tc) + camAt(tc), y];
}

// ---- idle: the ready stance, primed (aim 0 → 1) on the selected bird -------------
function idleFarmer(pick, aim) {
  const b = pick != null ? CK[pick] : null;
  const target = b ? [b.x - b.dir * b.rx * .7, b.y + b.bcy - b.ry * .4] : null;
  return readyPose(FARM0[0], FARM0[1], target, b ? aim : 0);
}

// ---- the frame ------------------------------------------------------------------
// t ≤ 0: idle (pick = the selected bird or null; opts.aim = how primed he is,
// default 1 when a bird is selected). Otherwise a round: pick (index), win
// (bool), seed (chase layout). opts.still: the reduced-motion end frame.
export function render(R, t, pick, win, seed = 1, opts = {}) {
  const { $ } = R;
  R.svg.classList.toggle('run', t > 0);
  const order = [];
  const P = t > 0 ? plan(pick, seed) : null;
  const E = P ? P.E : null;
  const cam = t > 0 ? camAt(t) : 0;
  setCamera(R.cam, cam, t > 0 && !opts.still ? speedAt(t) : 0, t);
  const L = { actors: R.actors, backLayer: R.backLayer };

  /* ---------- farmer ---------- */
  let FP;
  if (t <= 0) {
    FP = idleFarmer(pick, opts.aim ?? 1);
  } else if (t < T_D) {
    const f = farmerAt(P, t);
    const run = runPose(f[0] / 30 * Math.PI * 2);
    const k = smooth(clamp(t / .2));
    const base = k >= 1 ? run : mixPose(idleFarmer(pick, 1), run, k);
    if (t < .14) base.lift = 6 * Math.sin(t / .14 * Math.PI); // bursts out of the crouch
    FP = { ...base, x: f[0], y: f[1], dir: 1 };
  } else {
    const f0 = farmerAt(P, T_D);
    const dir = 1;
    const landHip = win ? [E[0] - REACH, E[1] - 10] : [E[0] - (REACH + 16), E[1] - 10];
    const startHip = [f0[0], f0[1] - 36 * K];
    if (t < T_LAND) {
      const u = (t - T_D) / (T_LAND - T_D), e = eOut(u);
      const pose = mixPose(runPose(f0[0] / 30 * Math.PI * 2), POSES.dive, smooth(clamp(u * 1.6)));
      const hip = lerp2(startHip, landHip, e);
      hip[1] -= 16 * Math.sin(Math.PI * u);
      FP = { ...pose, x: hip[0], y: hip[1] + 36 * K, dir, lift: 0, ground: lerp(f0[1], E[1], e), look: [1.6, .3] };
    } else if (win) {
      const standFeet = [E[0] - 6, E[1] + 3];
      if (t < T_UP0) {
        const bump = Math.max(0, Math.sin((t - T_LAND) / .12 * Math.PI)) * 2 * (t - T_LAND < .12 ? 1 : 0);
        FP = { ...mixPose(POSES.dive, POSES.lie, smooth(clamp((t - T_LAND) / .1))), x: landHip[0], y: landHip[1] + 36 * K - bump, dir, ground: E[1], look: [1.6, .3] };
      } else {
        const u = smooth(clamp((t - T_UP0) / (T_UP1 - T_UP0)));
        const hip = lerp2(landHip, [standFeet[0], standFeet[1] - 36 * K], u);
        hip[1] -= 10 * Math.sin(Math.PI * u);
        const pose = mixPose(POSES.lie, POSES.hold, u);
        const tt = t - T_UP1, jump = tt > 0 ? 8 * Math.abs(Math.sin(tt * Math.PI * 2.4)) * clamp(1 - tt / 1.25) : 0;
        FP = { ...pose, x: hip[0], y: hip[1] + 36 * K, dir, lift: jump, ground: E[1] + 3 };
      }
    } else {
      const tt = t - T_LAND;
      const sq = tt < .2 ? Math.sin(tt / .2 * Math.PI) * 2.5 : 0;
      const pose = mixPose(POSES.dive, POSES.plant, smooth(clamp(tt / .16)));
      FP = { ...pose, x: landHip[0] + 4 * eOut(clamp(tt / .3)), y: landHip[1] + 36 * K + 2 + sq, dir, ground: E[1] };
    }
    FP.landHip = landHip;
  }
  drawFarmer(R.fm, FP);
  order.push([R.fm.root, FP.ground ?? FP.y]);

  /* ---------- birds ---------- */
  let heldAt = null;
  CK.forEach((b, i) => {
    let C;
    const g = R.ck[i].g;
    if (t <= 0) {
      C = { x: b.x, y: b.y, dir: b.dir, phase: null, op: 1, tagOp: 1 };
    } else if (i !== pick) {
      const s = SCAT[i], u = clamp((t - s.t0) / s.dur), e = eIn(u) * .6 + u * .4;
      const pos = lerp2([b.x, b.y], s.to, e);
      const dir = s.to[0] < b.x ? 1 : -1;
      const on = u > 0 && u < 1;
      C = { x: pos[0], y: pos[1], dir, phase: on ? (t - s.t0) * 34 : null, lift: on ? 6 * Math.abs(Math.sin(u * Math.PI * 4)) : 0,
            tilt: on ? -14 : 0, flap: on ? -30 - 25 * Math.sin(t * 40 + i) : 0, head: u > 0 ? 12 : 0, squawk: on && u < .6, panic: u > 0,
            op: 1, tagOp: 1 - clamp(t / .15) };
      g.classList.toggle('cluck', u > 0 && u < .4);
      g.classList.toggle('hold', u > 0 && u < .4);
    } else {
      g.classList.remove('cluck', 'hold');
      if (t < T_D) {
        const c = henAt(P, t);
        const tt = Math.min(t, .12);
        C = { x: c[0], y: c[1], dir: t < .05 ? b.dir : -1, phase: t * 30, lift: 2.6 * Math.abs(Math.sin(t * 15)) + (tt < .12 ? 4 * Math.sin(tt / .12 * Math.PI) : 0),
              tilt: -16, flap: -24 - 30 * Math.sin(t * 34), head: 14, squawk: Math.sin(t * 9) > 0, panic: true, tagOp: 1 - clamp(t / .2) };
      } else if (win) {
        if (t < T_LAND - .02) {
          const tt = t - T_D;
          C = { x: E[0], y: E[1], dir: 1, phase: tt * 40, lift: 5 * Math.abs(Math.sin(tt * 18)), flap: -40 - 30 * Math.sin(t * 50), head: -10, squawk: true, panic: true, tagOp: 0 };
        } else {
          const hw = lerp2(fmWorld(FP, FP._h0), fmWorld(FP, FP._h1), .5);
          const held = t > T_UP0;
          const cy = hw[1] + (held ? -7 : 3);
          C = { x: hw[0] + FP.dir * (held ? 2 : 6), y: cy - b.bcy, dir: -FP.dir, phase: t * 30, flap: -45 - 35 * Math.sin(t * 46), head: held ? -18 : -6, tilt: held ? -10 : 0,
                squawk: Math.sin(t * 12) > -.3, panic: true, tagOp: 0, ground: E[1] + 4, hideShadow: true };
          heldAt = [C.x, cy];
        }
      } else {
        // flap up onto a fence post ahead, taunt the farmer, hop down behind the fence
        const tt = t - T_D;
        const sF = CAM_END * FENCE_F, want = E[0] - CAM_END + 44 + sF;
        const posts = postsBetween(sF + 140, sF + 282);
        const pl = posts.length ? posts.reduce((a, p) => (Math.abs(p - want) < Math.abs(a - want) ? p : a)) : want;
        const post = pl + 3 + cam * (1 - FENCE_F); // fence-layer x → world x (the camera is still easing)
        if (tt < .62) {
          const u = tt / .62, e = eInOut(u);
          C = { x: lerp(E[0], post, e), y: lerp(E[1], PY, e) - 30 * Math.sin(Math.PI * u), dir: post < E[0] ? 1 : -1, phase: tt * 36, flap: -70 * Math.abs(Math.sin(tt * 32)) - 10,
                head: 6, tilt: -12, squawk: true, panic: true, ground: E[1], tagOp: 0, hideShadow: u > .3 };
        } else if (tt < 1.65) {
          const k = tt - .62, flapOn = k < .25 || (k > .7 && k < .9);
          C = { x: post, y: PY, dir: FP.x < post ? 1 : -1, phase: null, lift: flapOn ? 2.5 * Math.abs(Math.sin(k * 30)) : 0, flap: flapOn ? -55 * Math.abs(Math.sin(k * 26)) : 0,
                head: Math.sin(k * 7) > .2 ? -8 : 4, tilt: 6, squawk: Math.sin(k * 7) > .2, tagOp: 0, ground: 150, hideShadow: true };
        } else {
          const u = clamp((tt - 1.65) / .35);
          C = { x: post + 12 * u, y: PY - 14 * Math.sin(Math.PI * Math.min(u, .5)) + 46 * u * u, dir: -1, phase: null, flap: -40,
                tagOp: 0, ground: 150, hideShadow: true, behind: u > .25, op: 1 - clamp((u - .7) / .3) };
        }
      }
    }
    drawChicken(R.ck[i], b, C, L);
    order.push([g, heldAt && i === pick ? 1e4 : (C.ground ?? C.y)]);
  });
  depthSort(R, order);

  /* ---------- dust kicked up behind the farmer / the bird (left behind by the camera) ---------- */
  for (let k = 0; k < N_PUFF; k++) {
    const el = $('pf' + k), ts = .14 + k * .1, age = t - ts;
    if (t <= 0 || ts > T_D || age < 0 || age > .55) { el.setAttribute('opacity', 0); continue; }
    const r = farmerAt(P, ts);
    const s = .55 + age * 2;
    el.setAttribute('transform', `translate(${f1(r[0] - 8 - age * 10)} ${f1(r[1] - 2 - age * 9)}) scale(${f1(s)})`);
    el.setAttribute('opacity', f1(.85 * (1 - age / .55)));
  }
  for (let k = 0; k < N_CPUFF; k++) {
    const el = $('cp' + k), ts = .12 + k * .22, age = t - ts;
    if (t <= 0 || ts > T_D || age < 0 || age > .4) { el.setAttribute('opacity', 0); continue; }
    const c = henAt(P, ts);
    el.setAttribute('transform', `translate(${f1(c[0] - 5)} ${f1(c[1] - 1 - age * 6)}) scale(${f1(.6 + age * 1.6)})`);
    el.setAttribute('opacity', f1(.8 * (1 - age / .4)));
  }

  /* ---------- landing dust cloud (a loss: low at the belly, clear of the face) ---------- */
  const cl = $('cloud');
  if (t > T_LAND - .02) {
    const tt = t - T_LAND + .02, big = win ? .75 : 1.15, life = win ? .6 : 1.1;
    const land = bodyWorld(FP, win ? [0, -70] : [3, -24]);
    cl.setAttribute('transform', `translate(${f1(land[0])} ${f1(E[1] + (win ? -4 : 2))}) scale(${f1(big * (.5 + .6 * eOut(clamp(tt / .35))))} ${f1(big * (.45 + .5 * eOut(clamp(tt / .35))))})`);
    cl.setAttribute('opacity', f1(opts.still ? 0 : clamp(1 - (tt - life * .35) / (life * .65))));
    CLOUD.forEach(([x, y], k) => $('cl' + k).setAttribute('transform', `translate(${f1(x * .5 * eOut(clamp(tt / .5)))} ${f1(y * .3 * eOut(clamp(tt / .5)) - tt * 4)})`));
  } else cl.setAttribute('opacity', 0);

  /* ---------- the hat pops off on the landing; on a loss it rolls away ---------- */
  const hatW = $('hatW');
  if (t > T_LAND) {
    const tt = t - T_LAND;
    const LP = { ...POSES.dive, x: FP.landHip[0], y: FP.landHip[1] + 36 * K, dir: FP.dir };
    const h0 = bodyWorld(LP, [3, -100]);
    const u = clamp(tt / .45);
    const gy = E[1] + 4, lo = cam + 22, hi = cam + 278;
    let x = h0[0] + FP.dir * 24 * u;
    let y = lerp(h0[1] - 6, gy - 14 * K, u) - 30 * Math.sin(Math.PI * u) * (1 - u * .3);
    let rot = FP.dir * u * 250;
    if (!win && tt > .45) {               // rolls on its brim, slows, wobbles flat
      const r = clamp((tt - .45) / 1.0), s2 = 22 * eOut(r);
      x = clamp(x + FP.dir * s2, lo, hi); y = gy - 14 * K;
      rot = FP.dir * (250 + s2 / (14 * K) * 57.3 + (r >= 1 ? Math.sin((tt - 1.45) * 10) * 5 * clamp(1 - (tt - 1.45) / .5) : 0));
    } else if (win && tt > .45) {
      rot = FP.dir * (250 + Math.sin((tt - .45) * 9) * 6 * clamp(1 - (tt - .45) / .6));
    }
    if (opts.still && !win) { x = clamp(h0[0] + FP.dir * 46, lo, hi); y = gy - 14 * K; rot = FP.dir * (250 + 22 / (14 * K) * 57.3); }
    hatW.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(FP.dir * K)} ${K}) translate(-3 96)`);
    hatW.setAttribute('opacity', 1);
  } else hatW.setAttribute('opacity', 0);

  /* ---------- dizzy stars over the head ---------- */
  const dz = $('dizzy');
  if (!win && t > T_LAND + .12) {
    const hd = headWorld(FP);
    dz.setAttribute('opacity', 1);
    [0, 1, 2].forEach(k => { const a = t * 5 + k * 2.1; $('dz' + k).setAttribute('transform', `translate(${f1(hd[0] + Math.cos(a) * 20)} ${f1(hd[1] - 30 + Math.sin(a) * 5)}) scale(${f1(.8 + .25 * Math.sin(a))})`); });
  } else dz.setAttribute('opacity', 0);

  /* ---------- sweat while chasing ---------- */
  const sw = $('sweat');
  if (t > .3 && t < T_D) {
    sw.setAttribute('opacity', 1);
    const hd = fmWorld(FP, [-8, -96]);
    [0, 1].forEach(k => { const a = ((t * 2.6 + k * .5) % 1); const el = $('sw' + k); el.setAttribute('transform', `translate(${f1(hd[0] - FP.dir * (4 + a * 12))} ${f1(hd[1] - 4 + a * a * 18 - a * 8)})`); el.setAttribute('opacity', f1(1 - a)); });
  } else sw.setAttribute('opacity', 0);

  /* ---------- feathers ---------- */
  const fc = pick != null ? [CK[pick].c, CK[pick].l, CK[pick].wing, CK[pick].d] : null;
  for (let k = 0; k < N_FEATH; k++) {
    const el = $('fe' + k), F = FEATH[k];
    if (t <= 0) { el.setAttribute('opacity', 0); continue; }
    let t0, org, n;
    if (win) { t0 = T_LAND + F.d + (k > 8 ? .55 : 0); org = k > 8 ? (heldAt || E) : E; n = N_FEATH; }
    else { t0 = T_D + .08 + F.d; org = [E[0], E[1] - 14]; n = 6; }
    const tt = t - t0;
    if (k >= n || tt < 0 || tt > 1.8) { el.setAttribute('opacity', 0); continue; }
    const vx = Math.cos(F.a) * F.v, vy = Math.sin(F.a) * F.v;
    const drag = 1 - Math.exp(-tt * 3);
    const x = org[0] + vx * drag / 3 + Math.sin(tt * 5 + F.ph) * F.sw * 2;
    const y = org[1] - 10 + vy * drag / 3 + tt * tt * 14 + tt * 10;
    el.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) rotate(${f1(F.spin * tt * .3 + Math.sin(tt * 5 + F.ph) * 30)}) scale(${CK[pick].c === '#FFF8EF' ? 1 : .95})`);
    el.firstChild.setAttribute('fill', fc[k % 4]);
    el.setAttribute('opacity', f1(clamp(1 - (tt - 1.2) / .6)));
  }

  /* ---------- hands gripping the held bird ---------- */
  const gh = $('gripHands');
  if (heldAt && t > T_UP0 + .1) {
    gh.setAttribute('opacity', 1);
    [0, 1].forEach(k => { const w = fmWorld(FP, FP['_h' + k]); const el = $('gh' + k); el.setAttribute('cx', f1(w[0])); el.setAttribute('cy', f1(w[1])); });
  } else gh.setAttribute('opacity', 0);

  /* ---------- sparkles + confetti over the caught bird ---------- */
  const sparksOn = win && heldAt && t > T_UP1 - .1;
  SPARK.forEach((s, k) => {
    const el = $('sp' + k);
    if (!sparksOn) { el.setAttribute('opacity', 0); return; }
    const p = ((t - T_UP1 + k * .17) % .9) / .9, sc = Math.sin(Math.PI * Math.max(0, p));
    el.setAttribute('opacity', 1);
    el.setAttribute('transform', `translate(${f1(heldAt[0] + s[0])} ${f1(heldAt[1] + s[1])}) scale(${f1(sc)}) rotate(${f1(p * 90)})`);
  });
  const cfG = $('conf');
  if (win && heldAt && t > T_UP1 - .05) {
    const tt = t - T_UP1 + .05;
    cfG.setAttribute('opacity', f1(opts.still ? 0 : clamp(1 - (tt - 1.1) / .4)));
    CONFP.forEach((p, i) => $('cf' + i).setAttribute('transform', `translate(${f1(heldAt[0] + p.vx * tt)} ${f1(heldAt[1] + p.vy * tt + .5 * 300 * tt * tt)}) rotate(${f1(p.spin * tt)})`));
  } else cfG.setAttribute('opacity', 0);
}

// ---- small helpers for the game ------------------------------------------------
export function setSelected(R, pick) {
  R.ck.forEach((E, i) => E.g.classList.toggle('on', i === pick));
}
// The picked bird hops, flutters and clucks.
export function cluck(R, i) {
  const g = R.ck[i]?.g;
  if (!g) return;
  R.ck.forEach(E => E.g.classList.remove('cluck', 'hold'));
  void g.getBoundingClientRect();
  g.classList.add('cluck');
  clearTimeout(R.cluckT);
  R.cluckT = setTimeout(() => g.classList.remove('cluck'), 650);
}
// Actors fade out / back in around a reset.
export function setGone(R, gone) {
  R.actors.classList.toggle('gone', gone);
  R.shadows.style.opacity = gone ? 0 : 1;
}
