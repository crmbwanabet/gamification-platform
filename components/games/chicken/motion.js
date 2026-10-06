// Chicken Catch motion — the approved mock's frame renderer, ported as-is: a
// pure function of time (render(rig, t, …)) that poses the farmer (two-bone IK
// limbs), the birds and the effects by writing SVG attributes. Static states
// (idle, the reduced-motion end frame) are single frames; a round is a rAF loop
// over t. Why not CSS keyframes like Penalty Crash: the farmer's limbs are IK
// paths (`d`), the chase is a fresh simulation every round and the actors are
// depth-sorted / moved behind the fence — none of which CSS can animate.
// The DOM nodes are React-rendered (Yard / Farmer / Chickens / Effects); React
// never changes their order, classes or transforms after mount, so the
// renderer owns them.

import {
  CK, FARM0, K, HIP, SHOULDER, BROWS, POSES, cid,
  clamp, lerp, lerp2, eOut, eIn, eInOut, smooth, f1, D2R, rotAbout, P2, rng, ik,
} from './rig';
import { N_PUFF, N_CPUFF, N_FEATH, CLOUD, SPARK, CONFP } from './Effects';

// ---- timing (seconds) -------------------------------------------------------
export const T_D = 1.72;      // the dive starts
export const T_LAND = 2.0;    // belly hits the dirt
const T_UP0 = 2.2, T_UP1 = 2.56;
export const LAND_S = { win: 2.3, lose: 2.15 }; // result line + onRound
export const END_S = { win: 3.6, lose: 4.1 };   // animation done
export const PANEL_S = 3.2;                     // WinCelebration pops in
export const STILL_T = 2.9;                     // reduced motion: the one frame shown

const GAP_END = 86;
const POSTS = [95, 159, 225];
const rf = rng(77);
const FEATH = Array.from({ length: N_FEATH }, () => ({ a: (-150 + rf() * 120) * D2R, v: 50 + rf() * 70, sw: 2 + rf() * 4, ph: rf() * 6, spin: (rf() - .5) * 500, d: rf() * .12 }));
const SCAT = CK.map((b, i) => ({ to: [b.x < 170 ? -70 : 370, b.y + (i % 2 ? 14 : -10)], t0: .06 + (i * .37 % 1) * .14, dur: .95 + (i % 3) * .12 }));

// ---- the rig: element handles inside one scene <svg> --------------------------
export function makeRig(svg) {
  const $ = (n) => svg.querySelector(`#${cid(n)}`);
  const legs = ['legF', 'legN'].map(n => { const g = $(n); return { o: g.querySelector('.lo'), t: g.querySelector('.lt'), c: g.querySelector('.lc'), b: g.querySelector('.lb'), h: g.querySelector('.lh') }; });
  const arms = ['armF', 'armN'].map(n => { const g = $(n); return { o: g.querySelector('.ao'), s: g.querySelector('.as'), v: g.querySelector('.av'), h: g.querySelector('.ah') }; });
  return {
    svg, $,
    actors: svg.querySelector('.ck-actors'), backLayer: svg.querySelector('.ck-back'), shadows: $('shadows'),
    fm: {
      root: $('fm'), T: $('fmT'), H: $('fmH'), hat: $('fmHat'), sh: $('fmSh'), armN: $('armN'), legs, arms,
      eyes: { open: $('eyesOpen'), happy: $('eyesHappy'), dizzy: $('eyesDizzy') },
      mouth: { smile: $('mSmile'), grit: $('mGrit'), joy: $('mJoy'), oops: $('mOops') },
      brows: $('brows'), pL: $('fpL'), pR: $('fpR'),
    },
    ck: CK.map((b, i) => ({
      g: $(`ck${i}`), p: $(`ckp${i}`), h: $(`ckh${i}`), f: $(`ckf${i}`), lA: $(`lgA${i}`), lB: $(`lgB${i}`),
      w: $(`wg${i}`), hA: $(`hdA${i}`), hB: $(`hdB${i}`), tag: $(`tg${i}`), sh: $(`cks${i}`), pp: $(`pp${i}`),
    })),
    sortKey: '',
    sims: {},
  };
}

// ---- farmer -------------------------------------------------------------------
function drawFarmer(R, P) {
  const fm = R.fm, hipY = HIP + P.drop;
  fm.root.setAttribute('transform', `translate(${f1(P.x)} ${f1(P.y - (P.lift || 0))}) scale(${f1(P.dir * K)} ${K}) rotate(${f1(P.rot)} 0 ${HIP})`);
  fm.T.setAttribute('transform', `rotate(${f1(P.lean)} 0 ${f1(hipY)}) translate(0 ${f1(P.drop)})`);
  fm.H.setAttribute('transform', `rotate(${f1(P.head)} 3 -68) translate(3 -68) scale(1.1) translate(-3 68)`);
  const armN = fm.armN;
  if (P.armBack && armN.nextSibling !== fm.H) fm.T.insertBefore(armN, fm.H);
  if (!P.armBack && fm.T.lastElementChild !== armN) fm.T.appendChild(armN);
  [[-3, P.aF], [3, P.aN]].forEach(([hx, a], k) => {
    const hip = [hx, hipY];
    const { j: knee, end: ank } = ik(hip, a, 18, 17.5, P.kb ?? -1);
    const sd = [ank[0] - knee[0], ank[1] - knee[1]], sl = Math.hypot(sd[0], sd[1]) || 1;
    const bt = [ank[0] - sd[0] / sl * 9, ank[1] - sd[1] / sl * 9];
    const cf = [ank[0] - sd[0] / sl * 11.5, ank[1] - sd[1] / sl * 11.5];
    const fa = (P.footRot || 0) * D2R;
    const toe = [ank[0] + Math.cos(fa) * 7.5, ank[1] + Math.sin(fa) * 7.5];
    const L = fm.legs[k];
    L.o.setAttribute('d', `M${P2(hip)} L${P2(knee)} L${P2(ank)} L${P2(toe)}`);
    L.t.setAttribute('d', `M${P2(hip)} L${P2(knee)} L${P2(bt)}`);
    L.c.setAttribute('d', `M${P2(cf)} L${P2(bt)}`);
    L.b.setAttribute('d', `M${P2(bt)} L${P2(ank)} L${P2(toe)}`);
    L.h.setAttribute('d', `M${P2(lerp2(bt, ank, .2))} L${P2(lerp2(bt, ank, .8))}`);
  });
  [[SHOULDER[0], P.hF, P.eF], [SHOULDER[1], P.hN, P.eN]].forEach(([sh, h, e], k) => {
    let el, hand;
    if (e) { el = e; hand = h; } else { const al = P.arm || [14.5, 13.5]; const r = ik(sh, h, al[0], al[1], P.eb ?? 1); el = r.j; hand = r.end; }
    P['_h' + k] = hand;
    const A = fm.arms[k], sv = lerp2(sh, el, .62);
    const d = `M${P2(sh)} L${P2(el)} L${P2(hand)}`;
    A.o.setAttribute('d', d); A.s.setAttribute('d', d);
    A.v.setAttribute('d', `M${P2(sh)} L${P2(sv)}`);
    A.h.setAttribute('cx', f1(hand[0])); A.h.setAttribute('cy', f1(hand[1]));
  });
  for (const k in fm.eyes) fm.eyes[k].style.display = k === (P.eyes || 'open') ? '' : 'none';
  for (const k in fm.mouth) fm.mouth[k].style.display = k === (P.mouth || 'smile') ? '' : 'none';
  fm.brows.setAttribute('d', BROWS[P.brows || 'calm']);
  fm.hat.style.display = P.hat === 0 ? 'none' : '';
  const lk = P.look || [0, 0];
  fm.pL.setAttribute('cx', f1(1.4 + lk[0])); fm.pL.setAttribute('cy', f1(-85.8 + lk[1]));
  fm.pR.setAttribute('cx', f1(11.6 + lk[0])); fm.pR.setAttribute('cy', f1(-85.8 + lk[1]));
  const air = P.lift || 0, flat = Math.abs(Math.sin(P.rot * D2R));
  fm.sh.setAttribute('cx', f1(P.x + P.dir * flat * 24 * K + 2)); fm.sh.setAttribute('cy', f1((P.ground ?? P.y) + 3));
  fm.sh.setAttribute('rx', f1((21 + 26 * flat) * K * (1 - clamp(air / 60) * .4)));
  fm.sh.setAttribute('opacity', f1(.38 * (1 - clamp(air / 50) * .5)));
}
// torso-space point → world
function fmWorld(P, p) {
  const hipY = HIP + P.drop;
  let q = rotAbout([p[0], p[1] + P.drop], [0, hipY], P.lean);
  q = rotAbout(q, [0, HIP], P.rot);
  return [P.x + q[0] * K * P.dir, P.y - (P.lift || 0) + q[1] * K];
}
// head-space point → world (head turn + 1.1 scale about the neck)
function headWorld(P, p = [2.5, -84]) {
  const q = rotAbout([3 + (p[0] - 3) * 1.1, -68 + (p[1] + 68) * 1.1], [3, -68], P.head || 0);
  return fmWorld(P, q);
}
// body-space point → world
function bodyWorld(P, p) {
  const q = rotAbout(p, [0, HIP], P.rot);
  return [P.x + q[0] * K * P.dir, P.y - (P.lift || 0) + q[1] * K];
}

function runPose(phi) {
  const s = Math.sin(phi), c = Math.cos(phi);
  const arm = (sh, a) => { const e = [sh[0] + Math.sin(a * D2R) * 14.5, sh[1] + Math.cos(a * D2R) * 14.5], b = (a + 85) * D2R; return [e, [e[0] + Math.sin(b) * 13, e[1] + Math.cos(b) * 13]]; };
  const [eF, hF] = arm(SHOULDER[0], -55 * s), [eN, hN] = arm(SHOULDER[1], 55 * s);
  return {
    rot: 0, lean: 22, head: -16, drop: 2.5 + 1.5 * Math.abs(c), lift: 2.5 * Math.abs(s),
    aF: [15 * s, -4.5 - 10 * Math.max(0, c)], aN: [-15 * s, -4.5 - 10 * Math.max(0, -c)],
    eF, hF, eN, hN, footRot: 0, eyes: 'open', mouth: 'grit', brows: 'focus',
  };
}
function mixPose(A, B, u) {
  const o = {};
  for (const k of ['rot', 'lean', 'head', 'drop', 'lift', 'footRot']) o[k] = lerp(A[k] || 0, B[k] || 0, u);
  for (const k of ['aF', 'aN', 'hF', 'hN']) o[k] = lerp2(A[k], B[k], u);
  if (A.eF && B.eF) { o.eF = lerp2(A.eF, B.eF, u); o.eN = lerp2(A.eN, B.eN, u); }
  const S = u < .5 ? A : B;
  for (const k of ['eyes', 'mouth', 'brows', 'hat', 'kb', 'eb', 'armBack']) if (S[k] !== undefined) o[k] = S[k];
  const aA = A.arm || [14.5, 13.5], aB = B.arm || [14.5, 13.5];
  o.arm = [lerp(aA[0], aB[0], u), lerp(aA[1], aB[1], u)];
  return o;
}
const REACH = (() => { const P = { ...POSES.lie, x: 0, y: 0, dir: 1 }; return lerp2(fmWorld(P, P.hF), fmWorld(P, P.hN), .5)[0]; })();

// ---- birds --------------------------------------------------------------------
// C: x,y,dir,lift,tilt,phase(run, null=idle),flap,head,op,tagOp,squawk,behind,ground,hideShadow,panic
function drawChicken(R, i, C) {
  const b = CK[i], E = R.ck[i];
  E.p.setAttribute('transform', `translate(${f1(C.x)} ${f1(C.y)})`);
  E.h.setAttribute('transform', `translate(0 ${f1(-(C.lift || 0))})`);
  E.f.setAttribute('transform', `scale(${C.dir} 1) rotate(${f1(C.tilt || 0)} 0 ${f1(b.bcy)})`);
  const ph = C.phase;
  if (ph == null) { E.lA.removeAttribute('transform'); E.lB.removeAttribute('transform'); }
  else { E.lA.setAttribute('transform', `rotate(${f1(42 * Math.sin(ph))})`); E.lB.setAttribute('transform', `rotate(${f1(-42 * Math.sin(ph))})`); }
  if (C.flap) E.w.setAttribute('transform', `rotate(${f1(C.flap)})`); else E.w.removeAttribute('transform');
  if (C.head) { E.hA.setAttribute('transform', `rotate(${f1(C.head)})`); E.hB.setAttribute('transform', `rotate(${f1(C.head)})`); }
  else { E.hA.removeAttribute('transform'); E.hB.removeAttribute('transform'); }
  E.g.style.opacity = C.op ?? 1;
  E.tag.style.opacity = C.tagOp ?? 1;
  E.g.classList.toggle('squawk', !!C.squawk);
  E.pp.setAttribute('r', C.panic ? 1.3 : 2);
  const gy = C.ground ?? C.y, air = (C.lift || 0) + Math.max(0, gy - C.y);
  E.sh.setAttribute('cx', f1(C.x + 2)); E.sh.setAttribute('cy', f1(gy + 2));
  E.sh.setAttribute('rx', f1(b.rx * .95 * (1 - clamp(air / 70) * .5)));
  E.sh.setAttribute('opacity', f1((C.op ?? 1) * (C.hideShadow ? 0 : .36 * (1 - clamp(air / 60) * .6))));
  const want = C.behind ? R.backLayer : R.actors;
  if (E.g.parentNode !== want) want.appendChild(E.g);
}

// ---- the chase: simulated once per round (pick × seed) ------------------------
// The hen flees the farmer, cutting left/right every ~0.3 s, bouncing off the
// yard edges, and is pulled to the foreground at the end; the farmer pursues,
// closing to a dive distance by T_D.
const SIM_DT = 1 / 240;
const YARD = { x0: 74, x1: 272, y0: 224, y1: 280 };
const FINISH = [196, 264];
const norm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
const rotV = (v, deg) => { const a = deg * D2R, c = Math.cos(a), sn = Math.sin(a); return [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c]; };
const SIMS = new Map();
function sim(pick, seed) {
  const key = pick + ':' + seed;
  if (SIMS.has(key)) return SIMS.get(key);
  if (SIMS.size > 24) SIMS.clear();
  const R = rng(seed * 131 + pick * 7 + 3), b = CK[pick];
  const O2 = { c: [], ct: [], cs: [], f: [], ft: [], fs: [] };
  let c = [b.x, b.y], f = FARM0.slice(), cd = norm([c[0] - f[0], c[1] - f[1]]), fd = [1, 0], cs = 0, fs = 0;
  let zig = R() < .5 ? 1 : -1, nextZig = .2 + R() * .1, sgn = 0, finX = 0;
  const T_FIN = T_D - .62;
  const d0 = Math.hypot(c[0] - f[0], c[1] - f[1]);
  for (let k = 0; k * SIM_DT <= T_D + 1e-6; k++) {
    const t = k * SIM_DT;
    O2.c.push(c.slice()); O2.ct.push(cd.slice()); O2.cs.push(cs); O2.f.push(f.slice()); O2.ft.push(fd.slice()); O2.fs.push(fs);
    if (t > .05) {
      if (t > nextZig) { zig = -zig; nextZig += .26 + R() * .12; }
      const dcf = Math.hypot(c[0] - f[0], c[1] - f[1]);
      const away = norm([c[0] - f[0], c[1] - f[1]]), cen = [182, 258];
      let perp = rotV(away, 90); if (perp[0] * (cen[0] - c[0]) + perp[1] * (cen[1] - c[1]) < 0) perp = rotV(away, -90);
      const M = 34, wall = Math.max(clamp((YARD.x0 + M - c[0]) / M), clamp((c[0] - YARD.x1 + M) / M), clamp((YARD.y0 + 12 - c[1]) / 12) * .6, clamp((c[1] - YARD.y1 + 12) / 12) * .6);
      const close = clamp((95 - dcf) / 45);
      let w = norm([away[0] * (1 - .85 * Math.max(wall, close * .6)) + perp[0] * (.25 + 1.4 * Math.max(wall, close * .7)), away[1] * (1 - .85 * Math.max(wall, close * .6)) + perp[1] * (.25 + 1.4 * Math.max(wall, close * .7))]);
      w = rotV(w, zig * 52 * clamp((dcf - 55) / 45));
      const push = [0, 0];
      if (c[0] < YARD.x0 + 10) push[0] += 1; if (c[0] > YARD.x1 - 10) push[0] -= 1;
      if (c[1] < YARD.y0 + 6) push[1] += 1; if (c[1] > YARD.y1 - 6) push[1] -= 1;
      w = [w[0] + push[0] * 1.5, w[1] + push[1] * 1.5];
      if (t > T_FIN) {
        if (!sgn) { sgn = Math.sign(c[0] - f[0]) || 1; finX = sgn > 0 ? clamp(c[0], 104, 146) : clamp(c[0], 232, 268); }
        const tgx = finX + sgn * 92 * clamp((t - T_FIN) / .62);
        const a = norm([(tgx - c[0]) * 1.3, (FINISH[1] - c[1]) * 1.2]), k2 = 3 * clamp((t - T_FIN) / .3);
        w = [w[0] * (1 - clamp((t - T_FIN) / .3)) + a[0] * k2, w[1] * (1 - clamp((t - T_FIN) / .3)) + a[1] * k2];
      }
      w = norm(w);
      cd = norm([lerp(cd[0], w[0], .085), lerp(cd[1], w[1], .085)]);
      const v = 185 * clamp((t - .05) / .12);
      c = [clamp(c[0] + cd[0] * v * SIM_DT, YARD.x0, YARD.x1), clamp(c[1] + cd[1] * v * SIM_DT, YARD.y0, YARD.y1)];
      cs += v * SIM_DT;
    }
    if (t > .12) {
      const tg = sgn ? [c[0] - sgn * GAP_END, c[1] - 3] : c;
      const dx = tg[0] - f[0], dy = tg[1] - f[1], d = Math.hypot(dx, dy) || 1, dc = Math.hypot(c[0] - f[0], c[1] - f[1]);
      const gap = lerp(Math.min(d0, 130), 108, smooth(clamp((t - .12) / .9)));
      const v = sgn ? clamp(d * 7, 0, 330) * (dc < 60 ? .4 : 1) : clamp((dc - gap) * 7, 0, 340);
      fd = norm([lerp(fd[0], dx / d, .07), lerp(fd[1], dy / d, .07)]);
      f = [f[0] + fd[0] * v * SIM_DT, f[1] + fd[1] * v * SIM_DT]; fs += v * SIM_DT;
    }
  }
  O2.E = c.slice();
  SIMS.set(key, O2);
  return O2;
}
function sample(S, arrP, arrT, arrS, t) {
  const x = clamp(t, 0, T_D) / SIM_DT, i = Math.min(Math.floor(x), S[arrP].length - 2), u = x - i;
  return { p: lerp2(S[arrP][i], S[arrP][i + 1], u), t: S[arrT][i + 1], s: lerp(S[arrS][i], S[arrS][i + 1], u) };
}

// ---- the frame ------------------------------------------------------------------
// t ≤ 0: idle (pick = the selected bird or null). Otherwise a round: pick (index),
// win (bool), seed (chase layout). opts.still: the reduced-motion end frame.
export function render(R, t, pick, win, seed = 1, opts = {}) {
  const { $ } = R;
  R.svg.classList.toggle('run', t > 0);
  const order = [];
  const S = t > 0 ? sim(pick, seed) : null;
  const E = S ? S.E : null;
  const chickenPos = (tt) => sample(S, 'c', 'ct', 'cs', tt);
  const farmerRun = (tt) => sample(S, 'f', 'ft', 'fs', tt);

  /* ---------- farmer ---------- */
  let FP;
  if (t <= 0) {
    let look = [1.3, .3];
    if (pick != null) { const b = CK[pick]; const dx = b.x - FARM0[0], dy = (b.y - 20) - (FARM0[1] - 70); const l = Math.hypot(dx, dy) || 1; look = [1.3 * dx / l, 1.2 * dy / l]; }
    FP = { ...POSES.ready, x: FARM0[0], y: FARM0[1], dir: 1, look };
  } else if (t < T_D) {
    const r = farmerRun(t);
    const run = runPose(r.s / 34 * Math.PI * 2);
    const k = smooth(clamp(t / .18));
    const base = mixPose(POSES.ready, run, k);
    if (t < .14) base.lift = 6 * Math.sin(t / .14 * Math.PI); // startled hop
    const dir = Math.abs(r.t[0]) > .2 ? Math.sign(r.t[0]) : (Math.sign(chickenPos(t).p[0] - r.p[0]) || 1);
    FP = { ...base, x: r.p[0], y: r.p[1], dir: k < .5 ? 1 : dir, look: [1.4, .4] };
  } else {
    const r0 = farmerRun(T_D);
    const dir = Math.sign(E[0] - r0.p[0]) || 1;
    const landHip = win ? [E[0] - dir * REACH, E[1] - 10] : [E[0] - dir * (REACH + 16), E[1] - 10];
    const startHip = [r0.p[0], r0.p[1] - 36 * K];
    if (t < T_LAND) {
      const u = (t - T_D) / (T_LAND - T_D), e = eOut(u);
      const pose = mixPose(runPose(r0.s / 34 * Math.PI * 2), POSES.dive, smooth(clamp(u * 1.6)));
      const hip = lerp2(startHip, landHip, e);
      hip[1] -= 16 * Math.sin(Math.PI * u);
      FP = { ...pose, x: hip[0], y: hip[1] + 36 * K, dir, lift: 0, ground: lerp(r0.p[1], E[1], e), look: [1.5, 0] };
    } else if (win) {
      const standFeet = [E[0] - dir * 6, E[1] + 3];
      if (t < T_UP0) {
        const bump = Math.max(0, Math.sin((t - T_LAND) / .12 * Math.PI)) * 2 * (t - T_LAND < .12 ? 1 : 0);
        FP = { ...mixPose(POSES.dive, POSES.lie, smooth(clamp((t - T_LAND) / .1))), x: landHip[0], y: landHip[1] + 36 * K - bump, dir, ground: E[1], look: [1.5, 0] };
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
      FP = { ...pose, x: landHip[0] + dir * 4 * eOut(clamp(tt / .3)), y: landHip[1] + 36 * K + 2 + sq, dir, ground: E[1] };
    }
    FP.landHip = landHip;
  }
  drawFarmer(R, FP);
  order.push([R.fm.root, FP.ground ?? FP.y]);

  /* ---------- birds ---------- */
  let heldAt = null;
  CK.forEach((b, i) => {
    let C;
    const g = R.ck[i].g;
    if (t <= 0) {
      C = { x: b.x, y: b.y, dir: b.dir, phase: null, op: 1, tagOp: 1 };
    } else if (i !== pick) {
      const s = SCAT[i], u = clamp((t - s.t0) / s.dur), e = eIn(u) * .75 + u * .25;
      const pos = lerp2([b.x, b.y], s.to, e);
      const dir = s.to[0] < b.x ? 1 : -1;
      C = { x: pos[0], y: pos[1], dir, phase: u > 0 ? (t - s.t0) * 34 : null, lift: u > 0 ? 6 * Math.abs(Math.sin(u * Math.PI * 4)) : 0,
            tilt: u > 0 ? -14 : 0, flap: u > 0 ? -30 - 25 * Math.sin(t * 40 + i) : 0, head: u > 0 ? 12 : 0, squawk: u > 0 && u < .6, panic: u > 0,
            op: 1, tagOp: 1 - clamp(t / .15) };
      g.classList.toggle('cluck', u > 0 && u < .4);
      g.classList.toggle('hold', u > 0 && u < .4);
    } else {
      g.classList.remove('cluck', 'hold');
      if (t < T_D) {
        const c = chickenPos(t);
        const dir = Math.abs(c.t[0]) > .02 ? (c.t[0] < 0 ? 1 : -1) : b.dir;
        C = { x: c.p[0], y: c.p[1], dir, phase: c.s / 13 * Math.PI * 2, lift: 2.2 * Math.abs(Math.sin(c.s / 13 * Math.PI * 2)), tilt: -16, flap: -20 - 28 * Math.sin(t * 34),
              head: 14, squawk: Math.sin(t * 9) > 0, panic: true, tagOp: 1 };
      } else if (win) {
        if (t < T_LAND - .02) {
          const tt = t - T_D;
          C = { x: E[0], y: E[1], dir: Math.sign(E[0] - FP.x) > 0 ? -1 : 1, phase: tt * 40, lift: 5 * Math.abs(Math.sin(tt * 18)), flap: -40 - 30 * Math.sin(t * 50), head: -10, squawk: true, panic: true, tagOp: 1 - clamp(tt / .2) };
        } else {
          const hw = lerp2(fmWorld(FP, FP._h0), fmWorld(FP, FP._h1), .5);
          const held = t > T_UP0;
          const cy = hw[1] + (held ? -7 : 3);
          C = { x: hw[0] + FP.dir * (held ? 2 : 6), y: cy - b.bcy, dir: -FP.dir, phase: t * 30, flap: -45 - 35 * Math.sin(t * 46), head: held ? -18 : -6, tilt: held ? -10 : 0,
                squawk: Math.sin(t * 12) > -.3, panic: true, tagOp: 0, ground: E[1] + 4, hideShadow: true };
          heldAt = [C.x, cy];
        }
      } else {
        // flap up onto a fence post, taunt the farmer, then hop down behind the fence
        const tt = t - T_D;
        const esc = FP.dir, post = POSTS.reduce((a, p) => (Math.abs(p - (E[0] + esc * 24)) < Math.abs(a - (E[0] + esc * 24)) ? p : a));
        const PY = 141;
        if (tt < .62) {
          const u = tt / .62, e = eInOut(u);
          C = { x: lerp(E[0], post, e), y: lerp(E[1], PY, e) - 30 * Math.sin(Math.PI * u), dir: post < E[0] ? 1 : -1, phase: tt * 36, flap: -70 * Math.abs(Math.sin(tt * 32)) - 10,
                head: 6, tilt: -12, squawk: true, panic: true, ground: E[1], tagOp: clamp(1 - tt / .2), hideShadow: u > .3 };
        } else if (tt < 1.65) {
          const k = tt - .62, flapOn = k < .25 || (k > .7 && k < .9);
          C = { x: post, y: PY, dir: FP.x < post ? 1 : -1, phase: null, lift: flapOn ? 2.5 * Math.abs(Math.sin(k * 30)) : 0, flap: flapOn ? -55 * Math.abs(Math.sin(k * 26)) : 0,
                head: Math.sin(k * 7) > .2 ? -8 : 4, tilt: 6, squawk: Math.sin(k * 7) > .2, tagOp: 0, ground: 150, hideShadow: true };
        } else {
          const u = clamp((tt - 1.65) / .35);
          C = { x: post + 12 * u * (post < 150 ? -1 : 1), y: PY - 14 * Math.sin(Math.PI * Math.min(u, .5)) + 46 * u * u, dir: post < 150 ? 1 : -1, phase: null, flap: -40,
                tagOp: 0, ground: 150, hideShadow: true, behind: u > .25, op: 1 - clamp((u - .7) / .3) };
        }
      }
    }
    drawChicken(R, i, C);
    order.push([g, heldAt && i === pick ? 1e4 : (C.ground ?? C.y)]);
  });

  // depth-sort the actors (only when the order changes)
  order.sort((a, b) => a[1] - b[1]);
  const key = order.map(o => o[0].id).join();
  if (key !== R.sortKey) { R.sortKey = key; order.forEach(([n]) => { if (n.parentNode === R.actors) R.actors.appendChild(n); }); }

  /* ---------- dust puffs behind the running farmer / the hen ---------- */
  for (let k = 0; k < N_PUFF; k++) {
    const el = $('pf' + k), ts = .18 + k * .105, age = t - ts;
    if (t <= 0 || ts > T_D || age < 0 || age > .5) { el.setAttribute('opacity', 0); continue; }
    const r = farmerRun(ts), d = Math.sign(r.t[0]) || 1;
    const s = .5 + age * 1.9;
    el.setAttribute('transform', `translate(${f1(r.p[0] - d * (6 + age * 14))} ${f1(r.p[1] - 2 - age * 8)}) scale(${f1(s)})`);
    el.setAttribute('opacity', f1(.85 * (1 - age / .5)));
  }
  for (let k = 0; k < N_CPUFF; k++) {
    const el = $('cp' + k), ts = .12 + k * .22, age = t - ts;
    if (t <= 0 || ts > T_D || age < 0 || age > .4) { el.setAttribute('opacity', 0); continue; }
    const c = chickenPos(ts), d = c.t[0] < 0 ? -1 : 1;
    el.setAttribute('transform', `translate(${f1(c.p[0] - d * 5)} ${f1(c.p[1] - 1 - age * 6)}) scale(${f1(.6 + age * 1.6)})`);
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
    const gy = E[1] + 4;
    let x = h0[0] + FP.dir * 24 * u;
    let y = lerp(h0[1] - 6, gy - 14 * K, u) - 30 * Math.sin(Math.PI * u) * (1 - u * .3);
    let rot = FP.dir * u * 250;
    if (!win && tt > .45) {               // rolls on its brim, slows, wobbles flat
      const r = clamp((tt - .45) / 1.0), s2 = 22 * eOut(r);
      x = clamp(x + FP.dir * s2, 22, 278); y = gy - 14 * K;
      rot = FP.dir * (250 + s2 / (14 * K) * 57.3 + (r >= 1 ? Math.sin((tt - 1.45) * 10) * 5 * clamp(1 - (tt - 1.45) / .5) : 0));
    } else if (win && tt > .45) {
      rot = FP.dir * (250 + Math.sin((tt - .45) * 9) * 6 * clamp(1 - (tt - .45) / .6));
    }
    if (opts.still && !win) { x = clamp(h0[0] + FP.dir * 46, 22, 278); y = gy - 14 * K; rot = FP.dir * (250 + 22 / (14 * K) * 57.3); }
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

