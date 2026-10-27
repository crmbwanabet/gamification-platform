import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAKES, DEFAULT_STAKE, RIDERS, STOPS, STOP_NAMES, brokeCount, survival, reachChance, rtpUnits,
  multiplier, shownMult, multText, payoutFor, expectedReturn, resolveStop, maxWin,
} from '../lib/conductor/engine.mjs';

const RTPS = [0.97, 0.975, 0.98, 0.985, 0.99];

test('stakes 1/10/25/50, default chip 10; 5 stops of 6 passengers', () => {
  assert.deepEqual(STAKES, [1, 10, 25, 50]);
  assert.equal(DEFAULT_STAKE, 10);
  assert.equal(RIDERS, 6);
  assert.equal(STOPS, 5);
  assert.deepEqual(STOP_NAMES, ['CHILENJE', 'KABWATA', 'KAMWALA', 'MATERO', 'TOWN']);
});

test('stake and stop validation', () => {
  for (const bad of [0, 2, 5, 20, 100, -10, 10.5, '10', null, undefined, NaN]) {
    assert.throws(() => payoutFor(bad, 1), /invalid stake/, String(bad));
  }
  for (const bad of [0, 6, -1, 1.5, '1', null]) {
    assert.throws(() => payoutFor(10, bad), /invalid stop/, String(bad));
    assert.throws(() => resolveStop(bad, 0, () => 0), /invalid stop/, String(bad));
  }
  for (const bad of [-1, 6, 2.5, '0', null]) {
    assert.throws(() => resolveStop(1, bad, () => 0), /invalid passenger/, String(bad));
  }
  assert.deepEqual(reachChance(0), { num: 1, den: 1 });
});

test('survival at stop k = (6 − k) / 6 and k passengers have no money', () => {
  for (let k = 1; k <= 5; k++) {
    assert.deepEqual(survival(k), { num: 6 - k, den: 6 });
    assert.equal(brokeCount(k), k);
  }
  assert.deepEqual(reachChance(5), { num: 120, den: 7776 });
});

test('multiplier table at 98% matches the design: ×1.18 ×1.76 ×3.53 ×10.58 ×63.50', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(k => shownMult(k, 0.98)), [1.18, 1.76, 3.53, 10.58, 63.5]);
  assert.deepEqual([1, 2, 3, 4, 5].map(k => multText(k, 0.98)), ['×1.18', '×1.76', '×3.53', '×10.58', '×63.50']);
  const exact = [1.176, 1.764, 3.528, 10.584, 63.504];
  exact.forEach((m, i) => assert.ok(Math.abs(multiplier(i + 1, 0.98) - m) < 1e-9, `stop ${i + 1}`));
});

test('multipliers follow the RTP (computed, clamped to 97–99%)', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map(k => shownMult(k, 0.97)), [1.16, 1.75, 3.49, 10.48, 62.86]);
  assert.deepEqual([1, 2, 3, 4, 5].map(k => shownMult(k, 0.99)), [1.19, 1.78, 3.56, 10.69, 64.15]);
  assert.equal(rtpUnits(0.5), 9700);
  assert.equal(rtpUnits(2), 9900);
  assert.equal(rtpUnits('x'), 9800);
  assert.equal(shownMult(5, 5), shownMult(5, 0.99));
});

test('payouts at 98%: stake × exact multiplier, rounded UP', () => {
  const expected = {
    1: [2, 12, 30, 59],
    2: [2, 18, 45, 89],
    3: [4, 36, 89, 177],
    4: [11, 106, 265, 530],
    5: [64, 636, 1588, 3176],
  };
  for (let k = 1; k <= 5; k++) {
    assert.deepEqual(STAKES.map(s => payoutFor(s, k, 0.98)), expected[k], `stop ${k}`);
  }
  assert.equal(maxWin(50, 0.98), 3176);
  assert.equal(payoutFor(10, 1), 12); // default RTP 98%
});

test('rounding: the payout is never below stake × multiplier, and never a whole coin more', () => {
  for (const rtp of RTPS) for (const s of STAKES) for (let k = 1; k <= 5; k++) {
    const p = payoutFor(s, k, rtp);
    const raw = s * multiplier(k, rtp);
    assert.ok(Number.isInteger(p));
    assert.ok(p >= raw - 1e-9 && p < raw + 1, `rtp ${rtp} stake ${s} stop ${k}: ${p} vs ${raw}`);
  }
});

test('expected return of cashing out after each stop: ≥ rtp × stake, exact when rounding changes nothing', () => {
  let exactCases = 0;
  for (let r = 9700; r <= 9900; r += 5) {
    const rtp = r / 10000;
    for (const s of STAKES) for (let k = 1; k <= 5; k++) {
      const { num, den } = expectedReturn(s, k, rtp);
      // EV = num / den coins; rtp × stake = r × s / 10000 — compare as integers
      const lhs = num * 10000, rhs = r * s * den;
      assert.ok(lhs >= rhs, `rtp ${rtp} stake ${s} stop ${k}: EV below RTP`);
      const { num: n, den: d } = reachChance(k);
      const whole = (s * r * d) % (10000 * n) === 0; // stake × rtp / S_k is a whole coin
      assert.equal(lhs === rhs, whole, `rtp ${rtp} stake ${s} stop ${k}`);
      if (whole) exactCases++;
    }
  }
  assert.ok(exactCases > 0);
  // the one such case on the 97.5% table: 50 × 0.975 × 7776 / 120 = 3,159 exactly
  assert.equal(payoutFor(50, 5, 0.975), 3159);
  assert.deepEqual(expectedReturn(50, 5, 0.975), { num: 120 * 3159, den: 7776 });
  assert.equal((120 * 3159) / 7776, 0.975 * 50);
});

test('expected return at 98% per stop per stake (exact fractions)', () => {
  const S = [5 / 6, 20 / 36, 60 / 216, 120 / 1296, 120 / 7776];
  for (const s of STAKES) for (let k = 1; k <= 5; k++) {
    const ev = S[k - 1] * payoutFor(s, k, 0.98);
    assert.ok(ev >= 0.98 * s - 1e-12, `stake ${s} stop ${k}: ${ev}`);
  }
  // stake 50: 59×5/6, 89×20/36, 177×60/216, 530×120/1296, 3176×120/7776
  assert.ok(Math.abs(S[0] * 59 - 49.1667) < 1e-4);
  assert.ok(Math.abs(S[4] * 3176 - 49.0123) < 1e-4);
});

test('rng injection: resolveStop is deterministic for a given rng', () => {
  // rng 0 every draw: Fisher-Yates always swaps with place 0 → order [1,2,3,4,5,0]
  assert.deepEqual(resolveStop(1, 1, () => 0), { pays: false, broke: [1] });
  assert.deepEqual(resolveStop(1, 0, () => 0), { pays: true, broke: [1] });
  assert.deepEqual(resolveStop(3, 4, () => 0), { pays: true, broke: [1, 2, 3] });
  assert.deepEqual(resolveStop(5, 0, () => 0), { pays: true, broke: [1, 2, 3, 4, 5] });
  // rng just under 1 never swaps → order [0..5]
  assert.deepEqual(resolveStop(2, 0, () => 0.999999), { pays: false, broke: [0, 1] });
  // an rng that returns 1 (out of range) is clamped, not an error
  assert.equal(resolveStop(2, 0, () => 1).broke.length, 2);
});

test('no-money count per stop = k, all distinct places, default CSPRNG', () => {
  for (let k = 1; k <= 5; k++) {
    for (let n = 0; n < 200; n++) {
      const { pays, broke } = resolveStop(k, n % 6);
      assert.equal(broke.length, k);
      assert.equal(new Set(broke).size, k);
      for (const b of broke) assert.ok(Number.isInteger(b) && b >= 0 && b < 6);
      assert.equal(pays, !broke.includes(n % 6));
    }
  }
});

test('fairness: over all 720 equally likely shuffles the called passenger pays exactly (6 − k) / 6', () => {
  // Drive Fisher-Yates through every combination of its choices j (one per step).
  const combos = [];
  const walk = (i, acc) => {
    if (i === 0) { combos.push(acc); return; }
    for (let j = 0; j <= i; j++) walk(i - 1, [...acc, (j + 0.5) / (i + 1)]);
  };
  walk(5, []);
  assert.equal(combos.length, 720);
  for (let k = 1; k <= 5; k++) for (let pick = 0; pick < 6; pick++) {
    let pays = 0;
    for (const seq of combos) {
      let c = 0;
      if (resolveStop(k, pick, () => seq[c++]).pays) pays++;
    }
    assert.equal(pays, 720 * (6 - k) / 6, `stop ${k} passenger ${pick}`);
  }
});
