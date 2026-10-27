import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundUp, roundHalfUp } from '../lib/rtp.mjs';
import {
  STAKES, DEFAULT_STAKE, LANES, DIFFICULTY, DIFFS, DEFAULT_DIFF,
  multiplier, multTable, payoutFor, survival, laneSafeChance, carChance, expectedReturn, stepLane,
} from '../lib/crossing/engine.mjs';

const RTPS = [0.97, 0.98, 0.99];
const LANE_KS = Array.from({ length: LANES }, (_, i) => i + 1);
const close = (a, b, eps = 1e-12) => Math.abs(a - b) <= eps;

test('stakes 1/10/25/50 (default 10), 8 lanes, EASY/MEDIUM/HARD = 0.9/0.8/0.6 (default MEDIUM)', () => {
  assert.deepEqual(STAKES, [1, 10, 25, 50]);
  assert.equal(DEFAULT_STAKE, 10);
  assert.equal(LANES, 8);
  assert.deepEqual(DIFFS, ['easy', 'medium', 'hard']);
  assert.deepEqual({ ...DIFFICULTY }, { easy: 0.9, medium: 0.8, hard: 0.6 });
  assert.equal(DEFAULT_DIFF, 'medium');
});

test('invalid stake / difficulty / lane throw', () => {
  for (const bad of [0, 2, 5, 20, 100, -1, 10.5, '10', null, undefined, NaN]) {
    assert.throws(() => payoutFor(bad, 'easy', 1), /invalid stake/, `stake ${String(bad)}`);
    assert.throws(() => survival(bad, 'easy', 1), /invalid stake/);
    assert.throws(() => stepLane(bad, 'easy', 1, () => 0), /invalid stake/);
  }
  for (const bad of ['EASY', 'extreme', '', null, undefined, 'toString']) {
    assert.throws(() => multiplier(bad, 1), /invalid difficulty/, `diff ${String(bad)}`);
  }
  for (const bad of [0, 9, -1, 1.5, '1', NaN]) {
    assert.throws(() => multiplier('easy', bad), /invalid lane/, `lane ${String(bad)}`);
    assert.throws(() => laneSafeChance(10, 'easy', bad), /invalid lane/);
  }
  assert.equal(survival(10, 'hard', 0), 1);
  assert.throws(() => survival(10, 'hard', 9), /invalid lane/);
});

test('multiplier tables at RTP 98% (the design numbers)', () => {
  assert.deepEqual(multTable('easy'), [1.09, 1.21, 1.34, 1.49, 1.66, 1.84, 2.05, 2.28]);
  assert.deepEqual(multTable('medium'), [1.23, 1.53, 1.91, 2.39, 2.99, 3.74, 4.67, 5.84]);
  assert.deepEqual(multTable('hard'), [1.63, 2.72, 4.54, 7.56, 12.6, 21, 35.01, 58.35]);
});

test('multiplier tables follow the clamped RTP (97% / 99%, out of range clamps, junk = 98%)', () => {
  assert.deepEqual(multTable('easy', 0.97), [1.08, 1.2, 1.33, 1.48, 1.64, 1.83, 2.03, 2.25]);
  assert.deepEqual(multTable('medium', 0.99), [1.24, 1.55, 1.93, 2.42, 3.02, 3.78, 4.72, 5.9]);
  assert.deepEqual(multTable('hard', 0.99), [1.65, 2.75, 4.58, 7.64, 12.73, 21.22, 35.37, 58.94]);
  assert.deepEqual(multTable('hard', 0.5), multTable('hard', 0.97));
  assert.deepEqual(multTable('hard', 1.5), multTable('hard', 0.99));
  assert.deepEqual(multTable('medium', 'x'), multTable('medium', 0.98));
  for (const r of RTPS) for (const d of DIFFS) {
    const t = multTable(d, r);
    for (let k = 1; k < LANES; k++) assert.ok(t[k] > t[k - 1], `${d} ${r} rises`);
    for (let k = 0; k < LANES; k++) {
      const exact = r / DIFFICULTY[d] ** (k + 1);
      assert.ok(Math.abs(t[k] - exact) <= 0.005 + 1e-9, `${d} ${r} lane ${k + 1} is rtp / p^k to 2 decimals`);
    }
  }
});

test('payouts round UP to whole coins (stake × mult, no float traps)', () => {
  // EASY lane 1 = 1.09: 1 → 2, 10 → 11, 25 → 28 (27.25), 50 → 55 (54.5)
  assert.deepEqual(STAKES.map(s => payoutFor(s, 'easy', 1)), [2, 11, 28, 55]);
  // MEDIUM lane 1 = 1.23: 25 × 1.23 = 30.75 → 31
  assert.deepEqual(STAKES.map(s => payoutFor(s, 'medium', 1)), [2, 13, 31, 62]);
  // HARD lane 8 = 58.35: the top win
  assert.deepEqual(STAKES.map(s => payoutFor(s, 'hard', 8)), [59, 584, 1459, 2918]);
  assert.deepEqual(STAKES.map(s => payoutFor(s, 'hard', 6)), [21, 210, 525, 1050]); // 21.00 exact
  for (const r of RTPS) for (const d of DIFFS) for (const s of STAKES) for (const k of LANE_KS) {
    assert.equal(payoutFor(s, d, k, r), roundUp(s, multiplier(d, k, r)));
  }
});

test('survival: S(k) = rtp × stake / half-up payout, never rising, lane chances in (0, 1]', () => {
  for (const r of RTPS) for (const d of DIFFS) for (const s of STAKES) {
    let prev = 1;
    for (const k of LANE_KS) {
      const S = survival(s, d, k, r);
      assert.ok(close(S, (r * s) / roundHalfUp(s, multiplier(d, k, r))), `${d} ${s} ${k}`);
      assert.ok(S <= prev + 1e-15, 'never rises');
      const q = laneSafeChance(s, d, k, r);
      assert.ok(q > 0 && q <= 1, `q in (0,1]: ${d} ${s} ${k}`);
      assert.ok(close(q, S / prev), 'q = S(k) / S(k-1)');
      assert.ok(close(carChance(s, d, k, r), 1 - q));
      prev = S;
    }
  }
});

test('the per-lane car chance is the nominal one at stake 50 (whole or .5 payouts)', () => {
  // stake 50 × a 2-decimal multiplier is always whole or .5, so half up = the exact product
  // and every lane matches 1 - p to within the 2-decimal rounding of the multipliers
  for (const d of DIFFS) for (const k of LANE_KS) {
    assert.ok(Math.abs(carChance(50, d, k) - (1 - DIFFICULTY[d])) < 0.015, `${d} lane ${k}`);
  }
});

test('expected return of every cash-out = RTP exactly when rounding up changes nothing, above it otherwise', () => {
  for (const r of RTPS) for (const d of DIFFS) for (const s of STAKES) for (const k of LANE_KS) {
    const m = multiplier(d, k, r);
    const up = roundUp(s, m), half = roundHalfUp(s, m);
    const E = expectedReturn(s, d, k, r);
    const analytic = (r * s * up) / half;      // S(k) × payout
    assert.ok(close(E, analytic, 1e-9), `analytic ${d} ${s} ${k} ${r}`);
    if (up === half) assert.ok(close(E, r * s, 1e-9), `exactly RTP: ${d} stake ${s} lane ${k} rtp ${r}`);
    else assert.ok(E > r * s, `above RTP: ${d} stake ${s} lane ${k} rtp ${r}`);
  }
});

test('stake 50 returns exactly the RTP on every lane, every difficulty', () => {
  for (const r of RTPS) for (const d of DIFFS) for (const k of LANE_KS) {
    assert.ok(close(expectedReturn(50, d, k, r), r * 50, 1e-9), `${d} lane ${k} rtp ${r}`);
  }
});

test('pinned returns at RTP 98% (stake 1 sits well above, as in the other games)', () => {
  const pct = (s, d) => LANE_KS.map(k => Math.round((expectedReturn(s, d, k) / s) * 10000) / 100);
  assert.deepEqual(pct(1, 'easy'), [196, 196, 196, 196, 98, 98, 147, 147]);
  assert.deepEqual(pct(10, 'easy'), [98, 106.17, 105.54, 98, 98, 103.44, 98, 98]);
  assert.deepEqual(pct(25, 'medium'), [98, 100.58, 98, 98, 98, 98, 98, 98]);
  assert.deepEqual(pct(10, 'hard'), [104.13, 101.63, 100.18, 98, 98, 98, 98.28, 98]);
});

test('stepLane: the injected rng decides, safe below q(k), hit at or above it', () => {
  for (const d of DIFFS) for (const k of LANE_KS) {
    const q = laneSafeChance(10, d, k);
    const safe = stepLane(10, d, k, () => Math.max(0, q - 1e-9));
    assert.equal(safe.safe, true);
    assert.equal(safe.lane, k);
    assert.equal(safe.mult, multiplier(d, k));
    assert.equal(safe.done, k === LANES);
    assert.equal(safe.payout, k === LANES ? payoutFor(10, d, k) : 0);
    if (q < 1) {
      const hit = stepLane(10, d, k, () => q);
      assert.deepEqual(hit, { lane: k, safe: false, mult: multiplier(d, k), done: true, payout: 0 });
    }
  }
  // stake 1 EASY lane 2: q = 1, no car can come, even at the top of the rng range
  assert.equal(laneSafeChance(1, 'easy', 2), 1);
  assert.equal(stepLane(1, 'easy', 2, () => 0.999999).safe, true);
});

test('stepLane: the rtp argument changes the odds; default rng is crypto', () => {
  const q97 = laneSafeChance(50, 'hard', 1, 0.97), q99 = laneSafeChance(50, 'hard', 1, 0.99);
  assert.notEqual(q97, q99);
  const mid = () => (q97 + q99) / 2;
  assert.notEqual(stepLane(50, 'hard', 1, mid, 0.97).safe, stepLane(50, 'hard', 1, mid, 0.99).safe);
  const draws = new Set();
  for (let i = 0; i < 200; i++) draws.add(stepLane(10, 'medium', 1).safe);
  assert.ok(draws.has(true) && draws.has(false), 'crypto rng gives both outcomes');
});

test('simulated rounds land on the analytic return (seeded rng, cash out after lane 3)', () => {
  let seed = 12345;
  const rng = () => { seed = (seed * 1103515245 + 12345) % 2 ** 31; return seed / 2 ** 31; };
  const N = 200000, s = 10, d = 'medium', K = 3;
  let back = 0;
  for (let i = 0; i < N; i++) {
    let alive = true;
    for (let k = 1; k <= K && alive; k++) alive = stepLane(s, d, k, rng).safe;
    if (alive) back += payoutFor(s, d, K);
  }
  const want = expectedReturn(s, d, K);
  assert.ok(Math.abs(back / N - want) / want < 0.02, `${back / N} vs ${want}`);
});
