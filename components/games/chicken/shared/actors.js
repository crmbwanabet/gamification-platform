// Chicken Catch / Chicken Catch 2 — the actor renderers shared by both games:
// the farmer (two-bone IK limbs, face swaps, open hands / fists) and a bird,
// posed by writing SVG attributes on the React-rendered nodes. Pure functions
// of a pose object; the games' motion modules decide the poses over time.

import {
  K, HIP, HEAD_S, SHOULDER, BROWS, POSES,
  clamp, lerp, lerp2, f1, D2R, rotAbout, P2, ik,
} from './rig';

const MOUTHS = ['smile', 'set', 'grit', 'joy', 'oops'];
const GRASS_MOUTHS = { smile: 1, set: 1, grit: 1 };

// ---- handles -----------------------------------------------------------------
export function farmerHandles($) {
  const legs = ['legF', 'legN'].map(n => { const g = $(n); return { o: g.querySelector('.lo'), t: g.querySelector('.lt'), c: g.querySelector('.lc'), b: g.querySelector('.lb'), h: g.querySelector('.lh') }; });
  const arms = ['armF', 'armN'].map(n => { const g = $(n); return { o: g.querySelector('.ao'), s: g.querySelector('.as'), v: g.querySelector('.av'), h: g.querySelector('.ah'), open: g.querySelector('.hOpen'), fist: g.querySelector('.hFist') }; });
  return {
    root: $('fm'), T: $('fmT'), H: $('fmH'), hat: $('fmHat'), sh: $('fmSh'), armN: $('armN'), legs, arms,
    eyes: { open: $('eyesOpen'), happy: $('eyesHappy'), dizzy: $('eyesDizzy') },
    mouth: Object.fromEntries(MOUTHS.map(m => [m, $('m' + m[0].toUpperCase() + m.slice(1))])),
    brows: $('brows'), pL: $('fpL'), pR: $('fpR'), lids: $('lids'), grass: $('grass'),
  };
}
export function birdHandles($, i) {
  return {
    g: $(`ck${i}`), p: $(`ckp${i}`), h: $(`ckh${i}`), f: $(`ckf${i}`), lA: $(`lgA${i}`), lB: $(`lgB${i}`),
    w: $(`wg${i}`), hA: $(`hdA${i}`), hB: $(`hdB${i}`), tag: $(`tg${i}`), sh: $(`cks${i}`), pp: $(`pp${i}`),
  };
}

// ---- farmer -------------------------------------------------------------------
// P: pose (see rig POSES) + x, y (feet), dir (1 = facing right), lift, ground,
// look [dx, dy] (pupil offset), squint 0..1.
export function drawFarmer(fm, P) {
  const hipY = HIP + P.drop;
  fm.root.setAttribute('transform', `translate(${f1(P.x)} ${f1(P.y - (P.lift || 0))}) scale(${f1(P.dir * K)} ${K}) rotate(${f1(P.rot)} 0 ${HIP})`);
  fm.T.setAttribute('transform', `rotate(${f1(P.lean)} 0 ${f1(hipY)}) translate(0 ${f1(P.drop)})`);
  fm.H.setAttribute('transform', `rotate(${f1(P.head)} 3 -68) translate(3 -68) scale(${HEAD_S}) translate(-3 68)`);
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
  const open = !!P.open;
  [[SHOULDER[0], P.hF, P.eF], [SHOULDER[1], P.hN, P.eN]].forEach(([sh, h, e], k) => {
    let el, hand;
    if (e) { el = e; hand = h; } else { const al = P.arm || [14.5, 13.5]; const r = ik(sh, h, al[0], al[1], P.eb ?? 1); el = r.j; hand = r.end; }
    P['_h' + k] = hand;
    const A = fm.arms[k], sv = lerp2(sh, el, .62);
    const d = `M${P2(sh)} L${P2(el)} L${P2(hand)}`;
    A.o.setAttribute('d', d); A.s.setAttribute('d', d);
    A.v.setAttribute('d', `M${P2(sh)} L${P2(sv)}`);
    const ang = Math.atan2(hand[1] - el[1], hand[0] - el[0]) / D2R + (open ? (P.handRot || 0) : 0);
    A.h.setAttribute('transform', `translate(${f1(hand[0])} ${f1(hand[1])}) rotate(${f1(ang)})`);
    A.open.style.display = open ? '' : 'none';
    A.fist.style.display = open ? 'none' : '';
  });
  for (const k in fm.eyes) fm.eyes[k].style.display = k === (P.eyes || 'open') ? '' : 'none';
  const mouth = P.mouth || 'smile';
  for (const k in fm.mouth) fm.mouth[k].style.display = k === mouth ? '' : 'none';
  fm.grass.style.display = GRASS_MOUTHS[mouth] ? '' : 'none';
  fm.brows.setAttribute('d', BROWS[P.brows || 'calm']);
  fm.hat.style.display = P.hat === 0 ? 'none' : '';
  fm.lids.setAttribute('transform', `translate(0 ${f1(1.3 * clamp(P.squint || 0))})`);
  const lk = P.look || [0, 0];
  fm.pL.setAttribute('cx', f1(1.6 + lk[0])); fm.pL.setAttribute('cy', f1(-86.4 + lk[1]));
  fm.pR.setAttribute('cx', f1(12.4 + lk[0])); fm.pR.setAttribute('cy', f1(-86.4 + lk[1]));
  const air = P.lift || 0, flat = Math.abs(Math.sin(P.rot * D2R));
  fm.sh.setAttribute('cx', f1(P.x + P.dir * flat * 24 * K + 2)); fm.sh.setAttribute('cy', f1((P.ground ?? P.y) + 3));
  fm.sh.setAttribute('rx', f1((21 + 26 * flat) * K * (1 - clamp(air / 60) * .4)));
  fm.sh.setAttribute('opacity', f1(.38 * (1 - clamp(air / 50) * .5)));
}
// torso-space point → world
export function fmWorld(P, p) {
  const hipY = HIP + P.drop;
  let q = rotAbout([p[0], p[1] + P.drop], [0, hipY], P.lean);
  q = rotAbout(q, [0, HIP], P.rot);
  return [P.x + q[0] * K * P.dir, P.y - (P.lift || 0) + q[1] * K];
}
// head-space point → world (head turn + scale about the neck)
export function headWorld(P, p = [2.5, -84]) {
  const q = rotAbout([3 + (p[0] - 3) * HEAD_S, -68 + (p[1] + 68) * HEAD_S], [3, -68], P.head || 0);
  return fmWorld(P, q);
}
// body-space point → world
export function bodyWorld(P, p) {
  const q = rotAbout(p, [0, HIP], P.rot);
  return [P.x + q[0] * K * P.dir, P.y - (P.lift || 0) + q[1] * K];
}

// The sprint: pumping arms (fists, elbows bent), driving knees, leaning in,
// eyes locked ahead. phi = stride phase.
export function runPose(phi) {
  const s = Math.sin(phi), c = Math.cos(phi);
  const arm = (sh, a) => { const e = [sh[0] + Math.sin(a * D2R) * 14.5, sh[1] + Math.cos(a * D2R) * 14.5], b = (a + 95) * D2R; return [e, [e[0] + Math.sin(b) * 13, e[1] + Math.cos(b) * 13]]; };
  const [eF, hF] = arm(SHOULDER[0], -70 * s), [eN, hN] = arm(SHOULDER[1], 70 * s);
  return {
    rot: 0, lean: 26, head: -20, drop: 2.5 + 2 * Math.abs(c), lift: 3.5 * Math.abs(s),
    aF: [17 * s, -4.5 - 12 * Math.max(0, c)], aN: [-17 * s, -4.5 - 12 * Math.max(0, -c)],
    eF, hF, eN, hN, footRot: 0, open: false, eyes: 'open', mouth: 'grit', brows: 'focus', squint: .7, look: [1.6, 0],
  };
}
export function mixPose(A, B, u) {
  const o = {};
  for (const k of ['rot', 'lean', 'head', 'drop', 'lift', 'footRot', 'squint', 'handRot']) o[k] = lerp(A[k] || 0, B[k] || 0, u);
  for (const k of ['aF', 'aN', 'hF', 'hN']) o[k] = lerp2(A[k], B[k], u);
  if (A.eF && B.eF) { o.eF = lerp2(A.eF, B.eF, u); o.eN = lerp2(A.eN, B.eN, u); }
  if (A.look || B.look) o.look = lerp2(A.look || [0, 0], B.look || [0, 0], u);
  const S = u < .5 ? A : B;
  for (const k of ['eyes', 'mouth', 'brows', 'hat', 'kb', 'eb', 'armBack', 'open']) if (S[k] !== undefined) o[k] = S[k];
  const aA = A.arm || [14.5, 13.5], aB = B.arm || [14.5, 13.5];
  o.arm = [lerp(aA[0], aB[0], u), lerp(aA[1], aB[1], u)];
  return o;
}
// How far in front of the hip his hands land in the dive.
export const REACH = (() => { const P = { ...POSES.lie, x: 0, y: 0, dir: 1 }; return lerp2(fmWorld(P, P.hF), fmWorld(P, P.hN), .5)[0]; })();

// The ready stance, primed (u 0 → 1) on a target point: he leans in, turns his
// head to it, aims his open hands at it, narrows his eyes and sets his mouth.
export function readyPose(x, y, target, u = 0) {
  const R = POSES.ready;
  let look = [1.4, .3], head = R.head, lean = R.lean, hF = R.hF, hN = R.hN;
  if (target) {
    const hx = x + 12, hy = y - 100;               // about his eyes
    const dx = target[0] - hx, dy = target[1] - hy, l = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx) / D2R;           // + = below him
    lean = lerp(R.lean, 17, u);
    head = lerp(R.head, clamp(ang * .4 - lean, -22, 8), u);
    const aim = clamp((ang - 25) * .25, -6, 8) * u; // hands follow the bird's height
    hF = [R.hF[0] + 3 * u, R.hF[1] + aim]; hN = [R.hN[0] + 3 * u, R.hN[1] + aim];
    look = lerp2(look, [1.8 * dx / l, .9 * dy / l], u);
  }
  return {
    ...R, x, y, dir: 1, lean, head, hF, hN, look, squint: .9 * u,
    brows: u > .5 ? 'focus' : 'calm', mouth: u > .5 ? 'set' : 'smile',
  };
}

// ---- a bird ---------------------------------------------------------------------
// C: x, y, dir, lift, tilt, phase (run; null = idle), flap, head, op, tagOp,
// squawk, behind, ground, hideShadow, panic.  L: { actors, backLayer }.
export function drawChicken(E, b, C, L) {
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
  if (E.tag) E.tag.style.opacity = C.tagOp ?? 1;
  E.g.classList.toggle('squawk', !!C.squawk);
  E.pp.setAttribute('r', C.panic ? 1.3 : 2);
  const gy = C.ground ?? C.y, air = (C.lift || 0) + Math.max(0, gy - C.y);
  E.sh.setAttribute('cx', f1(C.x + 2)); E.sh.setAttribute('cy', f1(gy + 2));
  E.sh.setAttribute('rx', f1(b.rx * .95 * (1 - clamp(air / 70) * .5)));
  E.sh.setAttribute('opacity', f1((C.op ?? 1) * (C.hideShadow ? 0 : .36 * (1 - clamp(air / 60) * .6))));
  const want = C.behind ? L.backLayer : L.actors;
  if (E.g.parentNode !== want) want.appendChild(E.g);
}

// Depth-sort the actors by ground y (only touches the DOM when the order changes).
export function depthSort(R, order) {
  order.sort((a, b) => a[1] - b[1]);
  const key = order.map(o => o[0].id).join();
  if (key !== R.sortKey) { R.sortKey = key; order.forEach(([n]) => { if (n.parentNode === R.actors) R.actors.appendChild(n); }); }
}
