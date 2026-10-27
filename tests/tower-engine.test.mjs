import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAKES, DEFAULT_STAKE, HOLD, MAX_FLOORS, multTable, multAt, payoutFor, halfUpPayout,
  reachChance, holdChance, expectedReturn, dropFloor,
} from '../lib/tower/engine.mjs';

const RTPS = [0.97, 0.98, 0.99];

test('stakes: 1/10/25/50, default 10, anything else is refused', () => {
  assert.deepEqual(STAKES, [1, 10, 25, 50]);
  assert.equal(DEFAULT_STAKE, 10);
  for (const bad of [0, 2, 5, 20, 100, -1, '10', null, undefined, NaN, 10.5]) {
    assert.throws(() => payoutFor(bad, 1), /invalid stake/);
  }
});

test('floors: 15, the design hold list, out-of-range floors are refused', () => {
  assert.equal(MAX_FLOORS, 15);
  assert.deepEqual([...HOLD], [0.9, 0.9, 0.9, 0.9, 0.9, 0.85, 0.85, 0.85, 0.85, 0.85, 0.8, 0.8, 0.8, 0.8, 0.75]);
  for (const bad of [-1, 16, 1.5, '3']) assert.throws(() => holdChance(bad), /invalid floor/);
  assert.equal(multAt(0), 0);
  assert.equal(payoutFor(10, 0), 0);
});

test('multiplier table at 98% (rtp / product of holds, half-up to 2 decimals)', () => {
  assert.deepEqual([...multTable(0.98)],
    [1.09, 1.21, 1.34, 1.49, 1.66, 1.95, 2.3, 2.7, 3.18, 3.74, 4.68, 5.84, 7.31, 9.13, 12.18]);
  assert.deepEqual([...multTable(0.97)],
    [1.08, 1.2, 1.33, 1.48, 1.64, 1.93, 2.27, 2.67, 3.15, 3.7, 4.63, 5.78, 7.23, 9.04, 12.05]);
  assert.deepEqual([...multTable(0.99)],
    [1.1, 1.22, 1.36, 1.51, 1.68, 1.97, 2.32, 2.73, 3.21, 3.78, 4.72, 5.9, 7.38, 9.23, 12.3]);
  // each entry = rtp / Π HOLD within half a hundredth, strictly increasing
  for (const r of RTPS) {
    let s = 1;
    multTable(r).forEach((m, i) => {
      s *= HOLD[i];
      assert.ok(Math.abs(m - r / s) <= 0.005 + 1e-9, `rtp ${r} floor ${i + 1}`);
      if (i) assert.ok(m > multTable(r)[i - 1]);
    });
  }
  // out-of-band RTP is clamped; junk falls back to 98%
  assert.deepEqual(multTable(0.5), multTable(0.97));
  assert.deepEqual(multTable(2), multTable(0.99));
  assert.deepEqual(multTable('x'), multTable(0.98));
});

test('payouts: stake × multiplier rounded UP to whole coins (integer hundredths)', () => {
  assert.deepEqual(STAKES.map(s => payoutFor(s, 1)), [2, 11, 28, 55]);   // 1.09: 1.09→2, 10.9→11, 27.25→28, 54.5→55
  assert.deepEqual(STAKES.map(s => payoutFor(s, 15)), [13, 122, 305, 609]); // 12.18
  assert.equal(payoutFor(25, 3), 34);   // 25 × 1.34 = 33.5 → 34
  assert.equal(payoutFor(50, 3), 67);   // whole: no rounding
  assert.equal(payoutFor(10, 7), 23);   // 10 × 2.3 = 23 exactly (float 22.999… would be a trap)
  for (const r of RTPS) for (const s of STAKES) for (let k = 1; k <= MAX_FLOORS; k++) {
    const m100 = Math.round(multAt(k, r) * 100);
    assert.equal(payoutFor(s, k, r), Math.ceil((s * m100) / 100));
    assert.ok(payoutFor(s, k, r) >= halfUpPayout(s, k, r));
  }
});

test('real hold chances: reach(k) = rtp / MULT_k, close to the design list', () => {
  for (const r of RTPS) {
    let reach = 1;
    for (let k = 1; k <= MAX_FLOORS; k++) {
      const p = holdChance(k, r);
      assert.ok(p > 0 && p < 1);
      assert.ok(Math.abs(p - HOLD[k - 1]) < 0.006, `rtp ${r} floor ${k}: ${p}`);
      reach *= p;
      assert.ok(Math.abs(reach - r / multAt(k, r)) < 1e-12);
      assert.ok(Math.abs(reachChance(k, r) - r / multAt(k, r)) < 1e-15);
    }
  }
});

test('exact expected return per floor per stake: ≥ RTP, equal when roundUp changes nothing', () => {
  for (const r of RTPS) for (const s of STAKES) for (let k = 1; k <= MAX_FLOORS; k++) {
    const m100 = Math.round(multAt(k, r) * 100);
    const ev = expectedReturn(s, k, r);
    // analytic: reach(k) × payout = rtp × ceil(s·m100/100) × 100 / m100
    const exact = (r * Math.ceil((s * m100) / 100) * 100) / m100;
    assert.ok(Math.abs(ev - exact) < 1e-9, `rtp ${r} stake ${s} floor ${k}`);
    assert.ok(ev >= r * s - 1e-9, `below RTP: rtp ${r} stake ${s} floor ${k} → ${ev / s}`);
    if ((s * m100) % 100 === 0) assert.ok(Math.abs(ev - r * s) < 1e-9, `not equal: rtp ${r} stake ${s} floor ${k}`);
    else assert.ok(ev > r * s);
  }
  // spot checks at 98%
  assert.ok(Math.abs(expectedReturn(50, 3, 0.98) - 49) < 1e-9);          // 50 × 1.34 = 67, whole
  assert.ok(Math.abs(expectedReturn(50, 15, 0.98) - 0.98 * 609 / 12.18) < 1e-9);
  assert.ok(Math.abs(expectedReturn(1, 1, 0.98) - 0.98 * 2 / 1.09) < 1e-9); // stake 1 floor 1 ≈ 180%
});

test('rng injection: a floor holds exactly when u < its hold chance', () => {
  for (let k = 1; k <= MAX_FLOORS; k++) {
    const p = holdChance(k, 0.98);
    assert.equal(dropFloor(k, 0.98, () => 0), true);
    assert.equal(dropFloor(k, 0.98, () => p - 1e-12), true);
    assert.equal(dropFloor(k, 0.98, () => p), false);
    assert.equal(dropFloor(k, 0.98, () => 0.999999), false);
  }
  // a broken rng never hands out a hold
  for (const bad of [NaN, -0.1, 1, 2, undefined]) assert.equal(dropFloor(1, 0.98, () => bad), false);
  // the default rng is the platform CSPRNG and returns a boolean
  assert.equal(typeof dropFloor(1), 'boolean');
});
