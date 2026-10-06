// Lucky Minibus motion — the approved mock's frame renderer, ported: a pure
// function of time (render(rig, t, …)) that poses every call boy and passenger
// (two-bone IK limbs), the buses, the luggage and the effects by writing SVG
// attributes. Static states (idle, the reduced-motion end frame) are single
// frames; a round is a rAF loop over t. Like Chicken Catch (and unlike Penalty
// Crash's CSS keyframes): IK paths, actors depth-sorted every frame and the
// passenger / call boy moved inside the bus doorway — none of which CSS can do.
// The markup comes from scene.js (rendered once by Street.jsx); React never
// touches it after mount, so the renderer owns those nodes.
// Fixes over the mock: plan() gives every runner its own lane (the loser comes
// round the passenger's far side when there is room; the two onlookers pull up
// on free spots on a ring round the pick, clear of everyone) and bends each path
// away from the pick, so the race reads whichever passenger is picked. The
// selection wave is a raised hand (near arm tucked behind the head, hand up
// beside it) swinging side to side with a little bounce.

import {
  clamp, lerp, lerp2, eOut, eIn, eBack, smooth, eRun, f1, D2R, rotAbout, ik, P2, bez, bezLen,
  GROUND, BS, DL, BUS, doorC, STEP_Y, depth, BAGMODE, CARRY_HANDS,
} from './kit';
import { CB, RIV, BOYS, PASDEF, ALL } from './cast';
import { BUBS, BUBW, SPARK, CONFP, N_DUST } from './scene';

// ---- timing (seconds) -------------------------------------------------------
const T_A = 1.0, T_L = 1.2, T_TURN = 1.06, T_GRAB = 1.24, T_LEAD = 1.96, T_P0 = 1.3, T_P1 = 2.02, T_IN = 2.26, T_TOSS = 2.1;
export const LAND_S = { win: 2.7, lose: 2.5 };   // result line + onRound
export const END_S = { win: 3.6, lose: 4.3 };    // animation done
export const PANEL_S = 3.25;                     // WinCelebration pops in
export const STILL_T = { win: 3.0, lose: 4.2 };  // reduced motion: the one frame shown
const WAVE_MS = 1100;

const c = (n) => `.mb-${n}`;

// ---- the rig: element handles inside one scene <svg> --------------------------
export function makeRig(svg) {
  const byId = {};
  svg.querySelectorAll('[id^="mb-"]').forEach(el => { byId[el.id.slice(3)] = el; });
  const $ = (n) => byId[n];
  const act = {};
  ALL.forEach(d => {
    const g = $(d.id);
    const leg = k => { const L = $(d.id + 'l' + k); return { o: L.querySelector(c('lo')), c: L.querySelector(c('lc')), so: L.querySelector(c('lso')), s: L.querySelector(c('ls')), k: L.querySelector(c('lk')), p: L.querySelector(c('lp')), shoe: L.querySelector(c('shoe')) }; };
    const arm = k => { const A = $(d.id + 'a' + k); return { o: A.querySelector(c('ao')), f: A.querySelector(c('af')), uo: A.querySelector(c('auo')), u: A.querySelector(c('au')), h: A.querySelector(c('ah')), hold: A.querySelector(c('hold')), wrap: A.parentNode.parentNode }; };
    act[d.id] = {
      d, g, b: $(d.id + 'b'), h: $(d.id + 'h'), h2: $(d.id + 'h2'), T0: $(d.id + 'T0'), T1: $(d.id + 'T1'), H: $(d.id + 'H'),
      legs: [leg(0), leg(1)], arms: [arm(0), arm(1)], exG: [...g.querySelectorAll('[data-x]')], ex: 'idle',
      sh: $(d.id + 'sh'), tag: $(d.id + 'tag'), own: g.querySelector(c('ownBag')), capOn: g.querySelector(c('capOn')), capHair: g.querySelector(c('capHair')),
    };
  });
  const bags = PASDEF.map(d => { const el = $('bag' + d.i); return { el, b: el.querySelector(c('pb')), h: [el.querySelector(c('hdl')), el.querySelector(c('hdl2'))] }; });
  return {
    svg, $, act, bags,
    actors: $('actors'), shadows: $('shadows'), fx: $('fx'),
    bub: Object.fromEntries(Object.keys(BUBS).map(k => [k, $('bub_' + k)])),
    bubOn: {}, sortKey: '', waveRaf: 0, waveT: 0,
  };
}

// ---- posing --------------------------------------------------------------------
function applyPose(A, P) {
  const d = A.d, s = P.s ?? depth(P.y), lift = P.lift || 0, bob = P.bob || 0;
  A.P = P; A.s = s;
  A.b.setAttribute('transform', `translate(${f1(P.x)} ${f1(P.y)}) scale(${f1(P.dir * s)} ${f1(s)})`);
  const up = `translate(0 ${f1(bob - lift)})`;
  A.h.setAttribute('transform', up); A.h2.setAttribute('transform', up);
  const rot = `rotate(${f1(P.lean || 0)} 0 ${d.H})`;
  A.T0.setAttribute('transform', rot); A.T1.setAttribute('transform', rot);
  A.H.setAttribute('transform', `translate(${P2(d.head)}) rotate(${f1(P.head || 0)} 0 ${f1(d.r * .8)}) scale(${d.hs})`);
  for (let k = 0; k < 2; k++) {
    const L = A.legs[k], hip = [d.hip[k], d.H + bob - lift], ft = P.feet[k];
    const { j: kn, end } = ik(hip, [ft[0], ft[1] - 2.6 - lift], d.legs[0], d.legs[1], -1);
    const dd = `M${P2(hip)} L${P2(kn)} L${P2(end)}`;
    L.o.setAttribute('d', dd); L.c.setAttribute('d', dd);
    if (L.so) { const sd = `M${P2(hip)} L${P2(lerp2(hip, kn, .92))}`; L.so.setAttribute('d', sd); L.s.setAttribute('d', sd); }
    if (L.k) L.k.setAttribute('d', `M${P2(lerp2(kn, end, .5))} L${P2(end)}`);
    if (L.p) L.p.setAttribute('d', dd);
    L.shoe.setAttribute('transform', `translate(${P2(end)}) rotate(${ft[1] < -.6 ? 20 : 0})`);
  }
  const elb = P.elb || [1, 1], ak = P.armK || [1, 1];
  // a waving near arm goes behind the head, so the raised hand pops up beside it
  const wrap = A.arms[1].wrap, back = !!P.armBack;
  if (back && wrap.nextSibling !== A.H) A.T1.insertBefore(wrap, A.H);
  if (!back && A.T1.lastElementChild !== wrap) A.T1.appendChild(wrap);
  for (let k = 0; k < 2; k++) {
    const R = A.arms[k];
    const { j: el, end } = ik([0, 0], P.hands[k], d.arms[0] * ak[k], d.arms[1] * ak[k], elb[k]);
    const full = `M0 0 L${P2(el)} L${P2(end)}`;
    R.o.setAttribute('d', full); R.f.setAttribute('d', full);
    if (R.u) { const ud = `M0 0 L${P2(lerp2([0, 0], el, d.sleeveLen || .62))}`; R.uo.setAttribute('d', ud); R.u.setAttribute('d', ud); }
    R.h.setAttribute('cx', f1(end[0])); R.h.setAttribute('cy', f1(end[1]));
    R.hold.setAttribute('transform', `translate(${P2(end)})`);
    R.end = end;
  }
  const ex = P.ex || 'idle';
  if (ex !== A.ex) { A.ex = ex; A.exG.forEach(g => g.setAttribute('display', g.dataset.x === ex ? 'inline' : 'none')); }
  if (A.capOn) { const off = !!P.capOff; A.capOn.setAttribute('display', off ? 'none' : 'inline'); A.capHair.setAttribute('display', off ? 'inline' : 'none'); }
  const op = P.op ?? 1;
  A.g.style.opacity = op;
  A.sh.setAttribute('cx', f1(P.x)); A.sh.setAttribute('cy', f1(P.y + .8));
  A.sh.setAttribute('rx', f1(d.shW * s * (1 - clamp(lift / 40) * .45)));
  A.sh.setAttribute('ry', f1(3.6 * s));
  A.sh.setAttribute('opacity', P.inside ? 0 : f1(op * .3));
  if (A.tag) {
    A.tag.setAttribute('transform', `translate(${f1(P.x)} ${f1(P.y - (d.top + 3) * s - lift * s + (bob * s))})`);
    A.tag.style.opacity = P.tagOp ?? 1;
  }
}
// torso-space point → world
function bodyPt(A, tp) {
  const d = A.d, P = A.P, s = A.s;
  const r = rotAbout(tp, [0, d.H], P.lean || 0);
  return [P.x + P.dir * s * r[0], P.y + s * (r[1] + (P.bob || 0) - (P.lift || 0))];
}
const handPt = (A, k) => { const sh = A.d.sh[k], h = A.arms[k].end; return bodyPt(A, [sh[0] + h[0], sh[1] + h[1]]); };
const headTop = A => bodyPt(A, [A.d.head[0], A.d.head[1] - A.d.r * A.d.hs - 1]);

function stand(d, o = {}) { return { feet: [[-4, 0], [4.2, 0]], hands: [[-1, d.arms[0] + d.arms[1] - 1.4], [1.6, d.arms[0] + d.arms[1] - 1.4]], lean: 0, bob: 0, head: 0, elb: [1, 1], ...o }; }
function runCyc(d, phi, k = 1) {
  const L = d.legs[0] + d.legs[1], S = L * .4 * k, Lf = L * .34 * k, A = d.arms[0] + d.arms[1], sw2 = A * .42 * k;
  const ft = p => [-S * Math.cos(p) + 1.4 * k, -Math.max(0, Math.sin(p)) * Lf];
  return { feet: [ft(phi), ft(phi + Math.PI)],
    hands: [[sw2 * Math.cos(phi) + 1, A * .6 - A * .1 * Math.sin(phi)], [-sw2 * Math.cos(phi) + 2, A * .6 + A * .1 * Math.sin(phi)]],
    lean: 13 * k, bob: L * (.05 * k - .11 * k * Math.abs(Math.sin(phi))), head: -6 * k, elb: [1, 1] };
}
function walkCyc(d, phi, k = 1) {
  const L = d.legs[0] + d.legs[1], S = L * .26 * k, Lf = L * .16 * k, A = d.arms[0] + d.arms[1];
  const ft = p => [-S * Math.cos(p), -Math.max(0, Math.sin(p)) * Lf];
  return { feet: [ft(phi), ft(phi + Math.PI)],
    hands: [[A * .26 * k * Math.cos(phi), A * .9], [-A * .26 * k * Math.cos(phi) + 1, A * .9]],
    lean: 5 * k, bob: -L * .05 * Math.abs(Math.sin(phi)), head: -2, elb: [1, 1] };
}
function mixPose(A, B, u) {
  const m2 = (a, b) => lerp2(a, b, u);
  return { ...B, feet: [m2(A.feet[0], B.feet[0]), m2(A.feet[1], B.feet[1])], hands: [m2(A.hands[0], B.hands[0]), m2(A.hands[1], B.hands[1])],
    lean: lerp(A.lean || 0, B.lean || 0, u), bob: lerp(A.bob || 0, B.bob || 0, u), head: lerp(A.head || 0, B.head || 0, u), lift: lerp(A.lift || 0, B.lift || 0, u) };
}
const idleOf = d => ({ ...d.idle, x: d.home ? d.home[0] : d.x, y: d.home ? d.home[1] : d.y, dir: d.dir, ex: 'idle' });

// ---- luggage placement (once a call boy has it; before that it is drawn as part of its owner) ----
const HEADOFF = { sack: 9.6, basin: 0 };
function placeBag(Bg, d, A, mode, over) {
  const P = A.P, s = A.s, dir = P.dir;
  Bg.el.style.display = '';
  if (mode === 'roll') {
    const hp = handPt(A, CARRY_HANDS.roll[0]);
    const base = over ? [over[0], over[1] + 12] : [hp[0] - dir * s * 7, P.y - .5];
    const tilt = -dir * 12;
    Bg.b.setAttribute('transform', `translate(${P2(base)}) scale(${f1(dir * s)} ${f1(s)}) rotate(${f1(tilt * dir)})`);
    const top = rotAbout([base[0], base[1] - 25 * s], base, tilt);
    const hd = `M${P2(top)} L${P2(hp)}`;
    Bg.h[0].setAttribute('d', hd); Bg.h[1].setAttribute('d', hd);
    Bg.h.forEach(h => { h.style.display = over ? 'none' : ''; });
    return P.y - .05;
  }
  if (Bg.h[0]) Bg.h.forEach(h => { h.style.display = 'none'; });
  let pt, rot = 0, z = P.y + .05, sc = s;
  if (mode === 'head') { pt = headTop(A); pt[1] -= (HEADOFF[d.bag] || 0) * s; rot = (P.lean || 0) * .4; sc = s * 1.1; }
  else if (mode === 'handN') pt = handPt(A, 1);
  else { pt = handPt(A, 0); z = P.y - .05; }
  if (over) pt = over;
  Bg.b.setAttribute('transform', `translate(${P2(pt)}) scale(${f1(dir * sc)} ${f1(sc)}) rotate(${f1(rot)})`);
  return z;
}
// world-space centre of a bag that is still drawn as part of its owner
function ownCenter(R, A) {
  const el = A.own, bb = el.getBBox(), m = R.fx.getScreenCTM().inverse().multiply(el.getScreenCTM());
  const q2 = new DOMPoint(bb.x + bb.width / 2, bb.y + bb.height / 2).matrixTransform(m);
  return [q2.x, q2.y];
}
const bagAt = (Bg) => { const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(Bg.b.getAttribute('transform')); return [+m[1], +m[2]]; };

// ---- round plan — who runs where, and when -------------------------------------
const PLANS = {};
const startOf = d => (d.step ? [d.home[0] + (d.bus === 'y' ? -10 : 10), 182] : d.home.slice());
function mkPath(d, stop, t0, t1, bend) {
  const st = startOf(d), mid = lerp2(st, stop, .5), dx = stop[0] - st[0], dy = stop[1] - st[1], L = Math.hypot(dx, dy) || 1;
  const cp = [mid[0] - dy / L * bend, mid[1] + dx / L * bend];
  return { d, st, stop, c: cp, t0, t1, hop: d.step ? .2 : 0, len: bezLen(st, cp, stop) };
}
function plan(pick, win) {
  const key = pick + ':' + win; if (PLANS[key]) return PLANS[key];
  const p = PASDEF[pick], pos = [p.x, p.y], W = win;
  let cont = RIV[0], best = 1e9;
  RIV.forEach(r => { const dd = Math.hypot(r.home[0] - pos[0], r.home[1] - pos[1]); if (dd < best) { best = dd; cont = r; } });
  const winner = W ? CB : cont, loser = W ? cont : CB, others = RIV.filter(r => r !== cont);
  const side = d => Math.sign(startOf(d)[0] - pos[0]) || (d === CB ? 1 : -1);
  const sw_ = side(winner), sl = side(loser);
  const wStop = [pos[0] + sw_ * 17, pos[1] - 1.5];
  // the loser arrives on the passenger's far side when there is room (both race in clear lanes),
  // else just behind the winner's shoulder
  const far = pos[0] - sw_ * 21, around = sl === sw_ && far > 16 && far < 284;
  const lStop = sl !== sw_ ? [pos[0] + sl * 21, pos[1] - 4] : around ? [far, pos[1] - 4] : [pos[0] + sl * 28, pos[1] - 30];
  // bend a path away from the pick, so runners swing round it instead of through it
  const away = (d, stop, mag) => {
    const st = startOf(d), mid = lerp2(st, stop, .5), dx = stop[0] - st[0], dy = stop[1] - st[1], L = Math.hypot(dx, dy) || 1;
    const cp = [mid[0] - dy / L * mag, mid[1] + dx / L * mag];
    return Math.hypot(cp[0] - pos[0], cp[1] - pos[1]) >= Math.hypot(mid[0] - pos[0], mid[1] - pos[1]) ? mag : -mag;
  };
  const R = {};
  R[winner.id] = mkPath(winner, wStop, .04, T_A, away(winner, wStop, 12));
  const lenW = R[winner.id].len, lenL = Math.hypot(lStop[0] - startOf(loser)[0], lStop[1] - startOf(loser)[1]);
  R[loser.id] = mkPath(loser, lStop, .04 + clamp(1 - lenL / lenW) * .45, T_L, away(loser, lStop, around ? 34 : 14));
  // onlookers pull up short in their own lane: a free spot on a ring round the pick, clear of everyone
  const taken = [pos, wStop, lStop, ...PASDEF.filter((q, i) => i !== pick).map(q => [q.x, q.y])];
  others.forEach((o, k) => {
    const st = startOf(o);
    let spot = null, bs = 1e9;
    for (let a = -175; a <= -5; a += 5) for (const rr of [50, 62, 74]) {
      const cnd = [pos[0] + Math.cos(a * D2R) * rr, pos[1] + Math.sin(a * D2R) * rr * .62];
      if (cnd[0] < 16 || cnd[0] > 284 || cnd[1] < 190) continue;
      if (Math.min(...taken.map(q => Math.hypot(q[0] - cnd[0], (q[1] - cnd[1]) * 1.8))) < 38) continue;
      const sc = Math.hypot(cnd[0] - st[0], cnd[1] - st[1]);
      if (sc < bs) { bs = sc; spot = cnd; }
    }
    if (!spot) spot = lerp2(st, pos, .3);
    taken.push(spot);
    R[o.id] = mkPath(o, spot, .12 + k * .12, .95 + k * .1, away(o, spot, 20));
  });
  const dk = W ? 'y' : 'r', dc = doorC(dk);
  const capDoor = W ? [dc - 27, 187] : [dc - 22, 186];
  const pasDoor = [dc + (W ? -3 : 3), 183];
  const lead = { st: wStop, stop: capDoor, c: lerp2(wStop, capDoor, .5).map((v, i) => v + (i ? 10 : 0)) };
  lead.len = bezLen(lead.st, lead.c, lead.stop);
  const follow = { st: pos, stop: pasDoor, c: lerp2(pos, pasDoor, .5).map((v, i) => v + (i ? 14 : 0)) };
  follow.len = bezLen(follow.st, follow.c, follow.stop);
  return (PLANS[key] = { p, pos, W, winner, loser, others, R, lead, follow, dk, dc, capDoor, pasDoor, inPt: [dc + 3, STEP_Y] });
}
// runner sample: position, distance travelled, speed fraction
function runAt(Rn, t) {
  const d = Rn.d;
  if (t < Rn.t0) return { pos: d.home.slice(), state: 'wait' };
  if (t < Rn.t0 + Rn.hop) { const u = (t - Rn.t0) / Rn.hop; return { pos: lerp2(d.home, Rn.st, u), lift: 10 * Math.sin(Math.PI * u), state: 'hop', u }; }
  const T0 = Rn.t0 + Rn.hop, u = clamp((t - T0) / (Rn.t1 - T0)), e = eRun(u);
  const pos = bez(Rn.st, Rn.c, Rn.stop, e), nx = bez(Rn.st, Rn.c, Rn.stop, Math.min(1, e + .02));
  return { pos, dist: e * Rn.len, u, tan: [nx[0] - pos[0], nx[1] - pos[1]], state: u < 1 ? 'run' : 'done' };
}

// ---- role poses after arriving -----------------------------------------------------
function winnerPose(d, t, PL, at, face) {
  const mode = BAGMODE[PL.p.bag][1], ch = CARRY_HANDS[mode];
  const carry = P => { if (ch && t < T_TOSS) { P.hands = P.hands.slice(); P.hands[ch[0]] = ch[1]; if (mode === 'shoulder') P.elb = [1, -1]; } return P; };
  if (t < T_GRAB) { // grab
    const u = clamp((t - T_A) / (T_GRAB - T_A));
    const P = { ...stand(d, { feet: [[-6, 0], [7, 0]] }), x: at[0], y: at[1], dir: face, lean: 14 * Math.sin(Math.PI * u), hands: [[-4, 12], [11, 3]], ex: 'push' };
    return u > .5 ? carry(P) : P;
  }
  if (t < T_LEAD) {
    const L = PL.lead, u = clamp((t - T_GRAB) / (T_LEAD - T_GRAB)), e = eRun(u);
    const pos = bez(L.st, L.c, L.stop, e), nx = bez(L.st, L.c, L.stop, Math.min(1, e + .02));
    const k = Math.min(1, u / .1, (1 - u) / .12 + .25);
    return carry({ ...runCyc(d, e * L.len / 24 * Math.PI * 2, .75 * k), x: pos[0], y: pos[1], dir: Math.sign(nx[0] - pos[0]) || face, ex: 'push' });
  }
  const toDoor = Math.sign(PL.dc - PL.capDoor[0]) || -1;
  const base = { ...stand(d), x: PL.capDoor[0], y: PL.capDoor[1], dir: toDoor, ex: 'push' };
  if (t < T_TOSS + .2) { const u = clamp((t - T_LEAD) / .4); return carry({ ...base, lean: 8 * Math.sin(Math.PI * u), hands: [[-2, 16], [12 * Math.sin(Math.PI * u), -6 * Math.sin(Math.PI * u) + 8]] }); }
  if (PL.W) {
    if (t < 2.68) { const u = clamp((t - 2.4) / .26); return { ...base, feet: [[-7, 0], [6, 0]], lean: 12 * Math.sin(Math.PI * clamp(u * 1.3)), hands: [[-2, 15], [13, -1]] }; }
    const u = t - 2.68, hop = Math.abs(Math.sin(u * Math.PI / .3));
    return { ...base, dir: 1, lift: u < .9 ? 9 * hop : 0, hands: [[-12, -16], [13, 2 - 3 * hop]], elb: [1, 1], ex: 'joy', head: -6 };
  }
  // rival captor hops in behind the passenger
  const u = clamp((t - 2.42) / .22), pos = lerp2(PL.capDoor, [PL.dc - 4, STEP_Y], eOut(u));
  return { ...base, x: pos[0], y: pos[1], dir: 1, s: depth(STEP_Y), lift: 8 * Math.sin(Math.PI * u), lean: 14 * u, inside: u > .5, hands: [[-2, 15], [8, -14]], ex: 'joy', op: t > 2.95 ? 0 : 1 };
}
function loserPose(d, t, PL, at, face) {
  const base = { ...stand(d, { feet: [[-4.6, 0], [4.8, 0]] }), x: at[0], y: at[1], dir: face, ex: 'sad' };
  if (d === CB && !PL.W) {
    if (t < 2.2) { const w = Math.sin((t - T_L) * 9); return { ...base, hands: [[1, -19], [5, -19.4]], elb: [-1, -1], head: 6 * w, ex: 'sad' }; }
    if (t < 2.36) { const u = (t - 2.2) / .16; return { ...base, dir: face, hands: [[-2, 8], [lerp(3, 6, u), lerp(-21, -24, u)]], elb: [1, -1], lean: -6 * u, ex: 'mad' }; }
    if (t < 2.56) { const u = smooth((t - 2.36) / .2); return { ...base, capOff: true, hands: [[-2, 8], [lerp(6, 12, u), lerp(-24, 12, u)]], elb: [1, -1], lean: lerp(-6, 14, u), ex: 'mad' }; }
    const st = Math.max(0, Math.sin((t - 2.56) * 18)) * clamp(1 - (t - 2.56) / .5);
    return { ...base, capOff: true, feet: [[-4.6, 0], [4.8, -3 * st]], hands: [[4.6, 10], [5, 10]], elb: [-1, -1], lean: 4, head: 6, ex: 'mad' };
  }
  // rival who came second
  const w = Math.sin((t - T_L) * 7);
  if (t < 2.2) return { ...base, hands: [[1, -19], [5, -19.4]], elb: [-1, -1], head: 5 * w };
  return { ...base, hands: [[-7, 8], [9, 7]], elb: [-1, 1], head: 4, lean: -3 };
}
function otherPose(d, t, PL, at, face, bi) {
  const base = { ...stand(d), x: at[0], y: at[1], dir: face, ex: 'run' };
  if (PL.W) {
    if (t < 1.3) return { ...base, lean: -4 };
    const u = clamp((t - 1.3) / .2);
    return { ...base, hands: [[lerp(-1, -9, u), lerp(17, 5, u)], [lerp(1.6, 11, u), lerp(17, 4, u)]], elb: [1, -1], head: 6, ex: 'sad' };
  }
  if (t < 1.3) return { ...base, lean: -4 };
  const ph = (t - 1.3) * 11 + bi;
  return { ...base, hands: [[-2, 16], [3, -18 - 2 * Math.sin(ph)]], elb: [1, -1], lift: 4 * Math.max(0, Math.sin(ph)), ex: 'joy' };
}

// ---- frame renderer --------------------------------------------------------------
function showBub(R, key, at, op = 1, sc = 1) {
  const el = R.bub[key]; R.bubOn[key] = true;
  const ox = BUBS[key][2], w = BUBW[key];
  const x = clamp(at[0], 6 - ox + w / 2, 294 - ox - w / 2);
  el.setAttribute('opacity', f1(op));
  el.setAttribute('transform', `translate(${f1(x)} ${f1(at[1])}) scale(${f1(sc)})`);
}
const popIn = (t, t0, t1) => (t < t0 || t > t1 ? 0 : Math.min(1, (t - t0) / .08, (t1 - t) / .12));

// t in seconds (0 = the idle stop), pick = passenger index or null, win (bool),
// payout (the in-scene "+N"). opts.still: the reduced-motion end frame (no confetti).
export function render(R, t, pick, win = true, payout = 0, opts = {}) {
  const $ = R.$;
  const PL = plan(pick ?? 0, !!win), W = PL.W, p = PL.p;
  const running = t > 0 && pick != null;
  R.svg.classList.toggle('mb-run', running);
  const zl = [];
  for (const k in R.bubOn) R.bubOn[k] = false;

  /* ---------- buses ---------- */
  let ry = 0, rx = 0, yy = 0;
  const doorU = { y: 0, r: 0 };
  if (running) {
    if (W) doorU.y = smooth(clamp((t - 2.4) / .26));
    else doorU.r = smooth(clamp((t - 2.62) / .26));
    if (W && t > 2.68) { const u = clamp((t - 2.68) / .55); yy = -3.4 * Math.sin(u * Math.PI * 3) * (1 - u); }
    if (!W && t > 2.95) { const tt = t - 2.95; rx = -(tt * tt * 330 + tt * 14); ry = -.8 * Math.abs(Math.sin(tt * 20)) * clamp(1 - tt); }
    if (t < .5) yy += -.9 * Math.abs(Math.sin(t * 40)) * (1 - t / .5);
  }
  $('busy').setAttribute('transform', `translate(0 ${f1(yy)})`);
  $('busr').setAttribute('transform', `translate(${f1(rx)} ${f1(ry)})`);
  R.busGone = rx < -1;
  $('doory').setAttribute('transform', `translate(${f1(34 * (1 - doorU.y))} 0)`);
  $('doorr').setAttribute('transform', `translate(${f1(34 * (1 - doorU.r))} 0)`);
  const wf = $('winFace'), wu = running && W ? smooth(clamp((t - 2.72) / .22)) : 0;
  wf.setAttribute('opacity', wu ? 1 : 0);
  if (wu) { $('winUse').setAttribute('href', `#mb-${p.id}HI`); const ph = Math.sin((t - 2.78) * 9) * 4; wf.setAttribute('transform', `translate(${DL + 16} ${f1(-40 - 15 * wu)}) rotate(${f1(ph)}) scale(-.92 .92)`); }
  const wa = rx / (10.5 * BS) / D2R;
  ['whr0', 'whr1'].forEach(id => $(id).setAttribute('transform', `rotate(${f1(wa)})`));

  /* ---------- passengers ---------- */
  PASDEF.forEach((d, i) => {
    const A = R.act[d.id];
    if (i !== pick || !running || t < T_TURN) {
      applyPose(A, { ...idleOf(d), tagOp: running ? (i === pick ? 1 : 0) : 1 });
      if (A.g.parentNode !== R.actors) R.actors.appendChild(A.g);
      zl.push([A.g, d.y]);
      A.own.style.opacity = i === pick && running && t >= T_A ? 0 : 1;
      if (i !== pick) R.bags[i].el.style.display = 'none';
    }
  });
  // the picked passenger
  const PA = R.act[p.id], pdir = Math.sign(PL.pasDoor[0] - p.x) || 1;
  let inside = false;
  if (running && t >= T_TURN) {
    let P;
    if (t < T_P0) {
      const u = (t - T_TURN) / (T_P0 - T_TURN);
      P = { ...stand(p, { feet: p.idle.feet }), x: p.x, y: p.y, dir: u > .35 ? pdir : p.dir, lift: 5 * Math.sin(Math.PI * clamp(u * 1.6)), ex: 'go', hands: [[-6, 6], [7, -4]] };
    } else if (t < T_P1) {
      const u = (t - T_P0) / (T_P1 - T_P0), e = eRun(u), F = PL.follow;
      const pos = bez(F.st, F.c, F.stop, e), nx = bez(F.st, F.c, F.stop, Math.min(1, e + .02));
      const dist = e * F.len;
      const k = Math.min(1, u / .12, (1 - u) / .1 + .3);
      P = { ...walkCyc(p, dist / 15 * Math.PI, .7 + .5 * k), x: pos[0], y: pos[1], dir: Math.sign(nx[0] - pos[0]) || pdir, ex: 'go' };
      if (p.holdArt && p.holdArt[1]) P.hands[1] = [7, 3];
    } else {
      // hop up into the doorway, then stand on the step as the door rolls shut
      const u = clamp((t - T_P1) / (T_IN - T_P1)), e = eOut(u);
      const pos = lerp2(PL.pasDoor, PL.inPt, e);
      inside = u > .45;
      const wv = t > T_IN ? Math.sin((t - T_IN) * 22) : 0;
      P = { ...stand(p, { feet: [[-3.4, 0], [3.6, 0]] }), x: pos[0], y: pos[1], dir: -1, s: depth(STEP_Y) * (1 - .06 * e),
        lift: 9 * Math.sin(Math.PI * u), lean: 24 * e, head: -6 * e, ex: 'go', inside,
        op: t > (W ? 2.7 : 2.92) ? 0 : 1 };
      if (t > T_IN) P.hands = [P.hands[0], [15 + wv * 2, -9 - Math.abs(wv) * 2]];
    }
    P.tagOp = clamp(1 - (t - 2.05) / .2);
    applyPose(PA, P);
    const want = inside ? $('in' + PL.dk) : R.actors;
    if (PA.g.parentNode !== want) want.appendChild(PA.g);
    if (!inside) zl.push([PA.g, P.y]);
  }

  /* ---------- call boys ---------- */
  const dust = [];
  BOYS.forEach((d, bi) => {
    const A = R.act[d.id], Rn = PL.R[d.id];
    let P;
    if (!running) { P = idleOf(d); }
    else {
      const r = runAt(Rn, t);
      const isW = d === PL.winner, isL = d === PL.loser;
      if (r.state === 'wait') P = idleOf(d);
      else if (r.state === 'hop') {
        P = { ...mixPose(d.idle, runCyc(d, 0, .4), r.u), x: r.pos[0], y: r.pos[1], dir: Math.sign(Rn.stop[0] - d.home[0]) || d.dir, lift: r.lift, ex: 'run' };
      } else if (r.state === 'run' || (isW && t < T_A + .02) || (isL && t < T_L + .02)) {
        const ramp = smooth(clamp(r.u / .12));
        const k = isL ? lerp(1, .2, smooth(clamp((r.u - .78) / .22))) : lerp(1, .3, smooth(clamp((r.u - .88) / .12)));
        const cyc = runCyc(d, r.dist / 26 * Math.PI * 2, Math.max(.25, k));
        P = { ...mixPose(stand(d), cyc, ramp), x: r.pos[0], y: r.pos[1], dir: Math.abs(r.tan[0]) > .05 ? Math.sign(r.tan[0]) : (Math.sign(PL.pos[0] - r.pos[0]) || 1), ex: 'run' };
        if (isL && r.u > .78) { const s2 = smooth(clamp((r.u - .78) / .22)); P = mixPose(P, { ...P, feet: [[-5, 0], [11, 0]], hands: [[-9, 7], [11, 3]], lean: -12, bob: 1.5, head: 4 }, s2); P.ex = 'sad'; }
        if (r.state === 'run') dust.push({ bi, Rn });
      } else {
        // arrived — role-specific afterlife
        const at = Rn.stop, face = Math.sign(PL.pos[0] - at[0]) || 1;
        if (isW) P = winnerPose(d, t, PL, at, face);
        else if (isL) P = loserPose(d, t, PL, at, face);
        else P = otherPose(d, t, PL, at, face, bi);
      }
    }
    if (P.inside) { const want = $('in' + PL.dk); if (A.g.parentNode !== want) want.appendChild(A.g); }
    else if (A.g.parentNode !== R.actors) R.actors.appendChild(A.g);
    applyPose(A, P);
    if (!P.inside) zl.push([A.g, P.y]);
  });

  /* ---------- luggage for the picked passenger ---------- */
  {
    const d = p, A = PA, Bg = R.bags[d.i], mode1 = BAGMODE[d.bag][1], CA = R.act[PL.winner.id];
    A.own.style.opacity = running && t >= T_A ? 0 : 1;
    if (!running || t < T_A) Bg.el.style.display = 'none';
    else {
      let z;
      if (t < T_A + .16) { // hand-over: the bag slides from its owner to the grabber
        const u = smooth((t - T_A) / .16), from = ownCenter(R, A);
        z = placeBag(Bg, d, CA, mode1);
        placeBag(Bg, d, CA, mode1, lerp2(from, bagAt(Bg), u));
      } else if (t < T_TOSS) z = placeBag(Bg, d, CA, mode1);
      else { // tossed into the doorway, then gone
        const u = clamp((t - T_TOSS) / .2), door = [PL.dc, STEP_Y - 18];
        placeBag(Bg, d, CA, mode1);
        if (Bg.h[0]) Bg.h.forEach(h => { h.style.display = 'none'; });
        const pos = lerp2(bagAt(Bg), door, eOut(u)); pos[1] -= 16 * Math.sin(Math.PI * u);
        Bg.b.setAttribute('transform', `translate(${P2(pos)}) scale(${f1(CA.P.dir * CA.s * (1 - .35 * u))} ${f1(CA.s * (1 - .35 * u))})`);
        z = 999;
      }
      Bg.el.style.opacity = t > T_TOSS + .18 ? 0 : 1;
      zl.push([Bg.el, z]);
    }
  }

  /* ---------- depth sort ---------- */
  zl.sort((a, b) => a[1] - b[1]);
  const key = zl.map(z => z[0].id).join(',');
  if (key !== R.sortKey) { R.sortKey = key; zl.forEach(z => R.actors.appendChild(z[0])); }

  /* ---------- dust ---------- */
  BOYS.forEach((d, bi) => { for (let k = 0; k < N_DUST; k++) $(`ds${bi}_${k}`).setAttribute('opacity', 0); });
  dust.forEach(({ bi, Rn }) => {
    const T0 = Rn.t0 + Rn.hop;
    for (let n = 0; ; n++) {
      const ts = T0 + .05 + n * .075; if (ts > Math.min(t, Rn.t1 - .05)) break;
      const age = t - ts; if (age > .5) continue;
      const pr = runAt(Rn, ts), el = $(`ds${bi}_${n % N_DUST}`), u = age / .5;
      el.setAttribute('opacity', f1(.85 * (1 - u)));
      el.setAttribute('transform', `translate(${f1(pr.pos[0] - Math.sign(pr.tan[0] || 1) * (4 + 8 * u))} ${f1(pr.pos[1] - 2 - 7 * u)}) scale(${f1((.45 + .8 * u) * depth(pr.pos[1]))})`);
    }
  });
  // arrived runners keep a short trail
  BOYS.forEach((d, bi) => {
    const Rn = running && PL.R[d.id]; if (!Rn) return;
    const T1 = Rn.t1; if (t < T1 || t > T1 + .5) return;
    const at = Rn.stop;
    for (let n = 0; n < 4; n++) {
      const age = t - T1 + n * .06, u = clamp(age / .55), el = $(`ds${bi}_${n}`);
      el.setAttribute('opacity', f1(.8 * (1 - u))); el.setAttribute('transform', `translate(${f1(at[0] - (n - 1.5) * 7 * (1 + u))} ${f1(at[1] - 3 - 6 * u)}) scale(${f1(.5 + .7 * u)})`);
    }
  });
  // skid burst for the loser
  for (let k = 0; k < 6; k++) {
    const el = $('sk' + k), Rn = running && PL.R[PL.loser.id];
    if (!Rn || t < T_L - .16 || t > T_L + .5) { el.setAttribute('opacity', 0); continue; }
    const u = clamp((t - T_L + .16) / .66), a = (-160 + k * 28) * D2R, at = Rn.stop;
    el.setAttribute('opacity', f1(.9 * (1 - u)));
    el.setAttribute('transform', `translate(${f1(at[0] + Math.cos(a) * 16 * eOut(u))} ${f1(at[1] - 2 + Math.sin(a) * 8 * eOut(u))}) scale(${f1(.4 + .7 * u)})`);
  }
  // exhaust as the rival pulls away
  for (let k = 0; k < 8; k++) {
    const el = $('sm' + k), ts = 2.9 + k * .09;
    if (!running || W || t < ts || t > ts + .8) { el.setAttribute('opacity', 0); continue; }
    const u = (t - ts) / .8, tt = ts - 2.95, bx = -(Math.max(0, tt) ** 2 * 330 + Math.max(0, tt) * 14);
    el.setAttribute('opacity', f1(.9 * (1 - u)));
    el.setAttribute('transform', `translate(${f1(BUS.r.x + 150 * BS + bx + 6 + 14 * u)} ${f1(GROUND - 14 - 12 * u)}) scale(${f1(.6 + 1.2 * u)})`);
  }

  /* ---------- bubbles + honks ---------- */
  const headAt = (id, dy = 6) => { const A = R.act[id]; const h = headTop(A); return [h[0], h[1] - dy * A.s]; };
  if (!running) {
    BOYS.forEach(d => { if (d.bub) showBub(R, d.bub, headAt(d.id, d.id === 'cb' ? 2 : 4)); });
  } else {
    const o = popIn(t, 0, .95); if (o) showBub(R, 'town', headAt('cb'), o);
    const c1 = PL.loser === CB ? PL.winner : PL.loser;
    const o2 = popIn(t, .1, 1.0); if (o2) showBub(R, 'kamwala', headAt(c1.id), o2);
    const o3 = popIn(t, .2, .92); if (o3 && PL.others[0]) showBub(R, 'matero', headAt(PL.others[0].id), o3);
    if (W) { const o4 = popIn(t, 2.72, 3.6); if (o4) showBub(R, 'tiyende', headAt('cb', 4), o4); }
    else { const o5 = popIn(t, 2.42, 3.6); if (o5) showBub(R, 'eish', headAt('cb', 4), o5); }
    if (W) { const o6 = popIn(t, 1.3, 2.2); if (o6) showBub(R, 'ah', headAt(PL.loser.id, 4), o6); }
  }
  for (const k in R.bub) if (!R.bubOn[k]) R.bub[k].setAttribute('opacity', 0);
  const honk = $('honk'), honkL = $('honkL');
  const ho = running ? popIn(t, .0, .62) : 0;
  honk.setAttribute('opacity', f1(ho)); honkL.setAttribute('opacity', f1(ho));
  if (ho) { const sc = 1 + .12 * Math.sin(t * 40); honk.setAttribute('transform', `translate(${BUS.y.x - 18} ${GROUND - 62}) scale(${f1(sc)})`); honkL.setAttribute('transform', `translate(${BUS.y.x - 1} ${GROUND - 34}) scale(${f1(sc)})`); }
  const pap = $('pap'), po = running && !W ? popIn(t, 2.9, 3.7) : 0;
  pap.setAttribute('opacity', f1(po));
  if (po) pap.setAttribute('transform', `translate(${f1(Math.max(40, BUS.r.x + rx + 70))} ${GROUND - 92}) scale(${f1(1 + .1 * Math.sin(t * 36))}) rotate(-6)`);

  /* ---------- grab flash, door slam, cap, steam ---------- */
  const fl = $('flash'), fo = running ? popIn(t, T_A - .02, T_A + .22) : 0;
  fl.setAttribute('opacity', f1(fo));
  if (fo) { const bp = PL.R[PL.winner.id].stop; fl.setAttribute('transform', `translate(${f1(lerp(bp[0], p.x, .5))} ${f1(p.y - 30)}) scale(${f1(.6 + 1.2 * (t - T_A + .02))}) rotate(${f1(t * 200)})`); }
  const sl = $('slam'), so = running && W ? popIn(t, 2.66, 2.92) : 0;
  sl.setAttribute('opacity', f1(so));
  if (so) sl.setAttribute('transform', `translate(${f1(doorC('y') - 17 * BS)} ${GROUND - 40}) scale(${f1(.8 + (t - 2.66) * 1.4)})`);
  const capW = $('capW');
  if (running && !W && t > 2.36) {
    const A = R.act.cb, P = A.P, dir = P.dir, u = clamp((t - 2.36) / .2);
    const from = headTop(A), to = [P.x + dir * 17, Math.min(P.y - 2, 292)];
    let pos, rot;
    if (u < 1) { pos = lerp2(from, to, eIn(u)); rot = dir * 120 * u; }
    else { const b = clamp((t - 2.56) / .22); pos = [to[0] + dir * 5 * b, to[1] - 7 * Math.sin(Math.PI * b)]; rot = dir * (120 + 60 * b); }
    capW.setAttribute('opacity', 1);
    capW.setAttribute('transform', `translate(${P2(pos)}) scale(${f1(dir * A.s)} ${f1(A.s)}) rotate(${f1(rot)})`);
  } else capW.setAttribute('opacity', 0);
  const steam = $('steam');
  if (running && !W && t > 2.6) {
    const h = headTop(R.act.cb), u = ((t - 2.6) % .6) / .6;
    steam.setAttribute('opacity', f1(Math.sin(Math.PI * u)));
    steam.setAttribute('transform', `translate(${f1(h[0])} ${f1(h[1] - 2 - 6 * u)})`);
    $('st0').setAttribute('transform', 'translate(-6 0)'); $('st1').setAttribute('transform', 'translate(6 0)');
  } else steam.setAttribute('opacity', 0);

  /* ---------- win sparkles + payout ---------- */
  const winAt = [doorC('y'), GROUND - 74];
  const sparksOn = running && W && t > 2.7;
  SPARK.forEach((s, k) => {
    const el = $('sp' + k);
    if (!sparksOn) { el.setAttribute('opacity', 0); return; }
    const pp = ((t - 2.7 + k * .17) % .9) / .9, sc = Math.sin(Math.PI * pp);
    el.setAttribute('opacity', 1);
    el.setAttribute('transform', `translate(${f1(winAt[0] + s[0])} ${f1(winAt[1] + 16 + s[1])}) scale(${f1(sc)}) rotate(${f1(pp * 90)})`);
  });
  const cfG = $('conf');
  if (running && W && t > 2.66) {
    const tt = t - 2.66;
    cfG.setAttribute('opacity', f1(opts.still ? 0 : clamp(1 - (tt - 1.1) / .4)));
    CONFP.forEach((q, i) => $('cf' + i).setAttribute('transform', `translate(${f1(winAt[0] + q.vx * tt)} ${f1(winAt[1] + 20 + q.vy * tt + .5 * 300 * tt * tt)}) rotate(${f1(q.spin * tt)})`));
  } else cfG.setAttribute('opacity', 0);
  const plus = $('plus');
  if (sparksOn) {
    const tt = t - 2.7;
    $('plusT').textContent = '+' + payout;
    plus.setAttribute('opacity', f1(clamp(tt / .15)));
    plus.setAttribute('transform', `translate(${f1(winAt[0] - 8)} ${f1(winAt[1] - 10 * eOut(clamp(tt / .6)))}) scale(${f1(.6 + .4 * eBack(clamp(tt / .35)))})`);
  } else plus.setAttribute('opacity', 0);
}

// ---- UI helpers --------------------------------------------------------------------
export function setSelected(R, pick) {
  PASDEF.forEach((d, i) => { const g = R.act[d.id].g; g.classList.toggle('mb-on', i === pick); g.setAttribute('aria-pressed', String(i === pick)); });
}
// Idle CSS loops off for everyone who moves this round.
export function setMoving(R, on, pick) {
  BOYS.forEach(d => R.act[d.id].g.classList.toggle('mb-mv', on));
  PASDEF.forEach((d, i) => R.act[d.id].g.classList.toggle('mb-mv', on && i === pick));
}
// Fade the cast and effects out / back in around a reset (a rival bus that drove off pops back too).
export function setGone(R, gone) {
  [R.actors, R.shadows, R.fx].forEach(el => el.classList.toggle('mb-gone', gone));
  R.$('busr').style.opacity = gone && R.busGone ? 0 : 1;
}

// Selection wave: the passenger bounces and waves a raised hand beside the head,
// side to side, then settles. hold = the static wave (reduced motion).
function wavePose(d, u, hold) {
  const arm = d.wave[0], AL = d.arms[0] + d.arms[1];
  const w = hold ? .5 : Math.sin(u * Math.PI * 2 * 3.2);          // forearm swing, -1..1
  const P = { ...idleOf(d) };
  P.hands = P.hands.slice(); P.elb = P.elb.slice();
  P.hands[arm] = [AL * (.85 + .18 * w), -AL * (1 - .05 * Math.abs(w))];
  P.elb[arm] = 1;
  P.armK = [1, 1]; P.armK[arm] = 1.45;
  if (arm === 1) P.armBack = true;
  P.lift = hold ? 0 : 3.2 * Math.abs(Math.sin(Math.PI * clamp(u * 1.15) * 3)) * (1 - .4 * u);
  P.head = (P.head || 0) - 6;
  if (d.ex.go) P.ex = 'go';
  return P;
}
export function stopWave(R) { cancelAnimationFrame(R.waveRaf); clearTimeout(R.waveT); R.waveRaf = 0; }
// isIdle(): the wave stops (and leaves the pose to render) as soon as a round starts.
export function wave(R, i, { reduced, isIdle }) {
  stopWave(R);
  const d = PASDEF[i], A = R.act[d.id];
  if (reduced) {
    applyPose(A, wavePose(d, 1, true));
    R.waveT = setTimeout(() => { if (isIdle()) applyPose(A, idleOf(d)); }, 700);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    if (!isIdle()) return;
    const u = (now - t0) / WAVE_MS;
    if (u >= 1) { applyPose(A, idleOf(d)); R.waveRaf = 0; return; }
    applyPose(A, wavePose(d, u));
    R.waveRaf = requestAnimationFrame(step);
  };
  R.waveRaf = requestAnimationFrame(step);
}
