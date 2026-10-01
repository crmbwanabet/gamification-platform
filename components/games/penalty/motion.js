// Penalty Crash motion — a pure function of time, ported from the approved mock's
// frame renderer, turned into CSS. frameAt(t, spot, win) returns, per animated
// element key, a transform (list of [fn, ...args]) and/or an opacity. The scene
// tags each animated SVG element with className `pk-<key>`; frameCss() writes a
// frame as plain rules (idle / reduced-motion end states) and roundCss() samples
// the frame function into @keyframes (one per key), so the kick, save, goal and
// confetti all run as CSS animations — no rAF loop, no canvas.
// SVG transforms in CSS: px = user units, transform-origin 0 0 (view-box).

import { SPOTS } from '@/lib/penalty/spots.mjs';

// ---- timing (seconds) -------------------------------------------------------
export const END = 2.4;        // full round animation (confetti done, spots back)
export const LAND_S = 0.72;    // result line + onRound
export const SETTLE_S = 2.1;   // spots start fading back in
const T_KICK = 0.08;
const tImpact = (win) => (win ? 0.64 : 0.58);

// ---- geometry ---------------------------------------------------------------
const K = 0.9;                 // keeper scale
const HOME = [150, 192];       // keeper's feet, centre of the goal line
const HIP = [0, -32];          // keeper's pivot (local)
const BALL0 = [150, 266];      // penalty spot
const BS = 1.15;               // ball scale on the spot
const SHOULDER = [15, -56];
const HIP_JOINT = [7, -30];    // leg pivot (local, mirrored for the left leg)
const SOLE = [12, 0.5];        // under the boot (local)

const ARMS = {
  ready: { e: [29, -58], g: [41, -77], r: -14 },
  up:    { e: [20, -95], g: [13, -119], r: -4 },   // full stretch (dives, high jump)
  reach: { e: [21, -86], g: [15, -104], r: -8 },   // gloves just over the head (jump save)
  low:   { e: [24, -44], g: [11, -38], r: 68 },    // smother: gloves together, low
};

// Where the ball goes on a save (parry): [x, y, final ball scale]
const DEFLECT = { 0: [20, 70, .62], 1: [184, 22, .58], 2: [280, 70, .62], 3: [20, 216, .7], 4: [104, 240, .9], 5: [280, 216, .7] };
const MIRROR = { 0: 2, 2: 0, 3: 5, 5: 3 };

// ---- helpers ----------------------------------------------------------------
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const eOut = t => 1 - Math.pow(1 - t, 3);
const eInOut = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const rot = (x, y, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
const bez = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
const deg = (dx, dy) => Math.atan2(dy, dx) * 180 / Math.PI;

// Seeded PRNG (same as the mock) — confetti layout is fixed, so it is
// identical on every device and every render.
function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export { rng as seededRng };

const rc = rng(42);
export const CONFETTI = Array.from({ length: 34 }, (_, i) => {
  const a = (-160 + rc() * 140) * Math.PI / 180, sp = 110 + rc() * 170;
  return {
    vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 2.6 + rc() * 2.4, h: 5 + rc() * 4, spin: (rc() - .5) * 1400,
    c: ['#FFD21F', '#FF4FA0', '#A6F03A', '#7BE3FF', '#FFFFFF', '#FF8A1A'][i % 6], round: i % 5 === 0,
  };
});
export const SPARKS = [[-30, -22, 9], [30, -16, 7], [-22, 26, 6], [34, 22, 8], [0, -38, 6]];
export const GHOSTS = [{ lag: .045, op: .55 }, { lag: .09, op: .34 }, { lag: .135, op: .18 }];

// ---- keeper target poses ------------------------------------------------------
// T = translation of the hip from home, th = body rotation, legs = leg splay
// (deg, + = outward), arc = height of the mid-move hop.
function divePose(i) {
  const s = SPOTS[i];
  const th = (s.col === 0 ? -1 : 1) * (s.row === 0 ? 54 : 80);
  const lead = [0, -119]; // the gloves' tip must land on the spot
  const [rx, ry] = rot(K * (lead[0] - HIP[0]), K * (lead[1] - HIP[1]), th);
  return { th, arms: 'up', legs: 0, arc: 14, T: [s.x - HOME[0] - K * HIP[0] - rx, s.y - HOME[1] - K * HIP[1] - ry] };
}
// Straight-up jump; the gloves (reach pose) meet height y.
const jumpPose = (y) => ({ th: 0, arms: 'reach', legs: -12, arc: 10, T: [0, y - HOME[1] - K * ARMS.reach.g[1]] });
// Big jump with nothing to catch (the ball goes under him).
const jumpHighPose = () => ({ th: 0, arms: 'reach', legs: -12, arc: 8, T: [0, -36] });
// Crouch-smother: legs splay outward, body drops so the boots stay on the line.
const SMOTHER_LEGS = 36;
function smotherPose() {
  const [, y] = rot(-(SOLE[0] - HIP_JOINT[0]), SOLE[1] - HIP_JOINT[1], SMOTHER_LEGS);
  return { th: 0, arms: 'low', legs: SMOTHER_LEGS, arc: 0, T: [0, K * ((SOLE[1] - HIP_JOINT[1]) - y)] };
}

// Save → go to the ball. Goal → the wrong guess: a corner shot sends him the
// mirror way; a centre shot gets the other central move (top-centre goal: he
// smothers low and it flies over; bottom-centre goal: he jumps and it goes under).
export function keeperTarget(spot, win) {
  const s = SPOTS[spot];
  if (s.col !== 1) return divePose(win ? MIRROR[spot] : spot);
  if (s.row === 0) return win ? smotherPose() : jumpPose(s.y);
  return win ? jumpHighPose() : smotherPose();
}

// ---- ball ---------------------------------------------------------------------
function ballAt(t, spot, win) {
  const S = SPOTS[spot], SP = [S.x, S.y], tImp = tImpact(win), tau = t - tImp;
  const bu = clamp((t - T_KICK) / (tImp - T_KICK));
  const be = 1 - Math.pow(1 - bu, 1.45);
  const C = [150 + (S.x - 150) * .55, S.y + (BALL0[1] - S.y) * .45 - 10];
  let [x, y] = bez(BALL0, C, SP, be);
  let s = BS / (1 + be), r = -640 * be;
  let moving = bu > 0 && tau <= 0;
  if (tau > 0 && win) {
    const k = eBack(clamp(tau / .28));
    y = S.y + 3 * k; s = BS * (.5 - .05 * clamp(tau / .28)); r = -640 - 60 * clamp(tau / .4);
  }
  if (tau > 0 && !win) {
    const D = DEFLECT[spot], v = eOut(clamp(tau / .5));
    const C2 = [S.x + (D[0] - S.x) * .4, Math.min(S.y, D[1]) - 18];
    [x, y] = bez(SP, C2, [D[0], D[1]], v);
    s = BS * lerp(.5, D[2], v); r = -640 + 520 * v;
    moving = tau < .5;
  }
  return { x, y, s, r, be, moving };
}

// ---- the frame ----------------------------------------------------------------
// opts.noConfetti: reduced-motion end state (no confetti, +payout stays up).
export function frameAt(t, spot, win, opts = {}) {
  const S = SPOTS[spot], tImp = tImpact(win), tau = t - tImp;
  const f = {};

  // keeper
  const tgt = keeperTarget(spot, win);
  const ku = eInOut(clamp((t - 0.1) / (tImp - 0.14)));
  const arc = -tgt.arc * Math.sin(Math.PI * clamp(ku * 1.1));
  const crouch = t > 0 && t < 0.14 ? Math.sin(t / 0.14 * Math.PI) * 3 : 0;
  const T = [tgt.T[0] * ku, tgt.T[1] * ku + arc + crouch];
  const th = tgt.th * ku;
  const am = clamp(ku * 1.35), A = ARMS.ready, B = ARMS[tgt.arms];
  const a = { e: [lerp(A.e[0], B.e[0], am), lerp(A.e[1], B.e[1], am)], g: [lerp(A.g[0], B.g[0], am), lerp(A.g[1], B.g[1], am)], r: lerp(A.r, B.r, am) };
  const legs = tgt.legs * ku;
  const lift = Math.max(0, -(tgt.T[1] * ku + arc));
  const px = HOME[0] + T[0] + K * HIP[0], py = HOME[1] + T[1] + K * HIP[1];
  f.kw = { tf: [['translate', px, py], ['rotate', th], ['scale', K, K], ['translate', -HIP[0], -HIP[1]]] };
  for (const [side, sx] of [['L', -1], ['R', 1]]) {
    const Sh = [sx * SHOULDER[0], SHOULDER[1]], E = [sx * a.e[0], a.e[1]], G = [sx * a.g[0], a.g[1]];
    f['armUp' + side] = { tf: [['translate', Sh[0], Sh[1]], ['rotate', deg(E[0] - Sh[0], E[1] - Sh[1])], ['scale', Math.hypot(E[0] - Sh[0], E[1] - Sh[1]), 1]] };
    f['armLo' + side] = { tf: [['translate', E[0], E[1]], ['rotate', deg(G[0] - E[0], G[1] - E[1])], ['scale', Math.hypot(G[0] - E[0], G[1] - E[1]), 1]] };
    f['elb' + side] = { tf: [['translate', E[0], E[1]]] };
    f['glv' + side] = { tf: [['translate', G[0], G[1]], ['rotate', -sx * a.r], ['scale', 1.28, 1.28]] };
    const hx = sx * HIP_JOINT[0];
    f['leg' + side] = { tf: [['translate', hx, HIP_JOINT[1]], ['rotate', -sx * legs], ['translate', -hx, -HIP_JOINT[1]]] };
  }
  f.kshadow = { tf: [['translate', px, 194], ['scale', (22 + 20 * Math.abs(Math.sin(th * Math.PI / 180))) / 24, 1]], o: .45 - .25 * clamp(lift / 20) };
  const gasp = win && t > tImp ? 1 : 0;
  f.grin = { o: 1 - gasp }; f.gasp = { o: gasp }; f.browN = { o: 1 - gasp }; f.browS = { o: gasp };

  // ball
  const b = ballAt(t, spot, win);
  f.ball = { tf: [['translate', b.x, b.y], ['scale', b.s, b.s]] };
  f.panels = { tf: [['rotate', b.r]] };
  const shadowOp = tau > 0 ? 0 : .5 * (1 - b.be * .85);
  const shs = lerp(1, .5, b.be);
  f.bshadow = { tf: [['translate', lerp(150, S.x, b.be), lerp(290, 193, b.be)], ['scale', shs, shs]], o: shadowOp };
  // pupils follow the ball a little
  const kx = HOME[0] + T[0], ky = HOME[1] + T[1] - 70;
  const dx = b.x - kx, dy = b.y - ky, dl = Math.hypot(dx, dy) || 1;
  f.pup = { tf: [['translate', th ? 0 : 1.6 * dx / dl, th ? 1 : 1.8 * dy / dl]] };

  // ghosted ball copies (the motion trail): the ball's own path `lag` s ago.
  // Outer gh<i> = opacity; inner ghb<i> replays the ball keyframes delayed.
  GHOSTS.forEach((g, i) => {
    const p = ballAt(t - g.lag, spot, win);
    const fade = !win && tau > 0 ? 1 - clamp(tau / .5) : 1;
    const vis = b.moving && p.moving && t - g.lag > T_KICK + .02 ? 1 : 0;
    f['gh' + i] = { o: g.op * vis * fade };
    f['ghb' + i] = { tf: [['translate', p.x, p.y], ['scale', p.s, p.s]] };
  });

  // after impact
  let pocketOp = 0, powOp = 0, confOp = 0, plusOp = 0, sparkOp = 0;
  f.net = { tf: [['translate', S.x, S.y], ['scale', 1, 1], ['translate', -S.x, -S.y]] };
  f.pocket = { tf: [['translate', S.x, S.y + 2], ['scale', .7, .7]] };
  f.pow = { tf: [['translate', S.x, S.y], ['scale', 0, 0], ['rotate', 0]] };
  f.plus = { tf: [['translate', S.x, S.y - 30]] };
  [0, 1, 2].forEach(i => { f['rip' + i] = { tf: [['scale', 1, 1]], o: 0 }; });
  const tc = Math.max(0, tau);
  SPARKS.forEach((s, i) => {
    const p = clamp((tc - i * .06) / .7), sc = Math.sin(Math.PI * p);
    f['sp' + i] = { tf: [['translate', S.x + s[0], S.y + s[1]], ['scale', sc, sc], ['rotate', p * 90]] };
  });
  if (tau > 0 && win) {
    const k = eBack(clamp(tau / .28));
    pocketOp = clamp(tau / .08);
    f.pocket = { tf: [['translate', S.x, S.y + 2], ['scale', .7 + .3 * k, .7 + .3 * k]] };
    [0, 1, 2].forEach(i => {
      const p = clamp((tau - i * .1) / .6), r = (12 + 34 * p) / 12;
      f['rip' + i] = { tf: [['scale', r, r]], o: (1 - p) * .7 * (p > 0 ? 1 : 0) };
    });
    const w = tau < .5 ? Math.sin(tau * 38) * (1 - tau / .5) : 0;
    f.net = { tf: [['translate', S.x, S.y], ['scale', 1 + .018 * w, 1 - .012 * w], ['translate', -S.x, -S.y]] };
    confOp = opts.noConfetti ? 0 : (tau < 1.2 ? 1 : clamp(1 - (tau - 1.2) / .4));
    sparkOp = confOp || 1;
    plusOp = opts.noConfetti ? 1 : clamp(tau / .15) * (tau < 1.4 ? 1 : clamp(1 - (tau - 1.4) / .4));
    f.plus = { tf: [['translate', S.x, S.y - 30 - 14 * eOut(clamp(tau / .6))]] };
  }
  if (tau > 0 && !win) {
    const D = DEFLECT[spot], pp = clamp(tau / .14);
    const powS = eBack(pp) * (1 + .15 * clamp((tau - .14) / .4)) * .72;
    powOp = tau < .55 ? 1 : clamp(1 - (tau - .55) / .45);
    f.pow = { tf: [['translate', S.x + (D[0] - S.x) * .2, S.y + (D[1] - S.y) * .2], ['scale', powS, powS], ['rotate', tau * 40]] };
  }
  f.pocket.o = pocketOp; f.pow.o = powOp; f.conf = { tf: [['translate', S.x, S.y]], o: confOp }; f.sparks = { o: sparkOp }; f.plus.o = plusOp;

  // spots: all fade out as the kick starts, the chosen one keeps a gold aim
  // ring until impact; they come back (.9) after the celebration.
  const back = opts.spotsBack ?? (t > SETTLE_S ? clamp((t - SETTLE_S) / .3) * .9 : 0);
  f.spots = { o: t <= 0 ? 1 : (back || 1 - clamp(t / .15)) };
  f.aim = { o: t <= 0 || back ? 0 : (tau > 0 ? clamp(.9 - tau / .15 * .9) : .9) };
  return f;
}

// ---- CSS output -----------------------------------------------------------------
const UNIT = { translate: 'px', rotate: 'deg', scale: '' };
const num = (v, d) => { const r = +v.toFixed(d); return Object.is(r, -0) ? 0 : r; };
const fnCss = ([fn, ...args]) => `${fn}(${args.map(v => num(v, fn === 'scale' ? 3 : 1) + UNIT[fn]).join(',')})`;
const declCss = (v) => (v.tf ? `transform:${v.tf.map(fnCss).join(' ')};` : '') + (v.o !== undefined ? `opacity:${num(v.o, 2)};` : '');

// One frame as plain rules (static states).
export function frameCss(frame) {
  return Object.entries(frame).map(([k, v]) => `.pk-svg .pk-${k}{${declCss(v)}}`).join('');
}

export function idleCss() { return frameCss(frameAt(0, 0, false)); }

// Sparks change slowly — sample them coarser to keep the CSS small.
const stepFor = (key) => (/^sp\d/.test(key) ? 1 / 10 : 1 / 30);

// Confetti: one shared keyframe set; each piece (.pk-cfp) carries its own
// launch velocity and spin as CSS variables (--vx/--vy px/s, --sp deg/s).
// x linear, y ballistic (gravity 330), sampled so linear segments look smooth.
const CONF_S = 1.6;
function confettiKeyframes(name) {
  const stops = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16, s = u * CONF_S;
    stops.push(`${num(u * 100, 2)}%{transform:translate(calc(var(--vx) * ${num(s, 3)}px),calc(var(--vy) * ${num(s, 3)}px + ${num(165 * s * s, 2)}px)) rotate(calc(var(--sp) * ${num(s, 3)}deg))}`);
  }
  return `@keyframes ${name}-cf{${stops.join('')}}`;
}

// Keep each rotation within 180deg of the previous sample so CSS never spins
// the long way round between two keyframes.
function unwrap(frames) {
  for (let i = 1; i < frames.length; i++) {
    const prev = frames[i - 1].v.tf, cur = frames[i].v.tf;
    if (!prev || !cur) continue;
    cur.forEach((fn, j) => {
      if (fn[0] !== 'rotate') return;
      let a = fn[1];
      while (a - prev[j][1] > 180) a -= 360;
      while (a - prev[j][1] < -180) a += 360;
      fn[1] = a;
    });
  }
}

// Flatten a sample to numbers + per-number tolerance (px / deg / scale / opacity).
const TOL = { translate: .25, rotate: .8, scale: .006 };
function flat(v) {
  const vals = [], tol = [];
  (v.tf || []).forEach(([fn, ...args]) => args.forEach(a => { vals.push(a); tol.push(TOL[fn]); }));
  if (v.o !== undefined) { vals.push(v.o); tol.push(.01); }
  return { vals, tol };
}
// Greedy simplification: drop every sample that CSS's own linear interpolation
// between the kept neighbours reproduces within tolerance.
function simplify(frames) {
  const F = frames.map(f => flat(f.v));
  const fits = (a, b) => {
    for (let i = a + 1; i < b; i++) {
      const u = (frames[i].t - frames[a].t) / (frames[b].t - frames[a].t);
      for (let j = 0; j < F[i].vals.length; j++) {
        if (Math.abs(F[i].vals[j] - lerp(F[a].vals[j], F[b].vals[j], u)) > F[i].tol[j]) return false;
      }
    }
    return true;
  };
  const keep = [0];
  let a = 0;
  for (let b = 2; b < frames.length; b++) {
    if (!fits(a, b)) { keep.push(b - 1); a = b - 1; }
  }
  keep.push(frames.length - 1);
  return keep.map(i => frames[i]);
}

const cache = new Map();
// @keyframes + animation rules for one round. `name` must differ from the
// previous round's (the caller alternates two names) so animations restart.
export function roundCss(spot, win, name) {
  const id = `${name}|${spot}|${win ? 1 : 0}`;
  if (cache.has(id)) return cache.get(id);
  const keys = Object.keys(frameAt(0, spot, win));
  const fine = [], coarse = [];
  for (let i = 0; i <= Math.round(END * 30); i++) fine.push(Math.min(END, i / 30));
  for (let i = 0; i <= Math.round(END * 10); i++) coarse.push(Math.min(END, i / 10));
  const sampled = { fine: fine.map(t => frameAt(t, spot, win)), coarse: coarse.map(t => frameAt(t, spot, win)) };
  let css = confettiKeyframes(name) + `.pk-svg .pk-cfp{animation:${name}-cf ${CONF_S}s linear ${tImpact(win)}s both}`;
  GHOSTS.forEach((g, i) => { css += `.pk-svg .pk-ghb${i}{animation:${name}-ball ${END}s linear ${g.lag}s both}`; });
  for (const k of keys) {
    if (k.startsWith('ghb')) continue;
    const fineKey = stepFor(k) < .05;
    const times = fineKey ? fine : coarse, frames = (fineKey ? sampled.fine : sampled.coarse).map((f, i) => ({ t: times[i], v: JSON.parse(JSON.stringify(f[k])) }));
    unwrap(frames);
    const stops = simplify(frames).map(f => `${num(f.t / END * 100, 2)}%{${declCss(f.v)}}`);
    css += `@keyframes ${name}-${k}{${stops.join('')}}.pk-svg .pk-${k}{animation:${name}-${k} ${END}s linear both}`;
  }
  cache.set(id, css);
  return css;
}
