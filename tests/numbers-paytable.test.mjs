import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POOL, PICKS, STAKES, MAX_WIN, TIERS, multFor, probabilities, expectedValue,
  payoutFor, validatePicks, drawNumbers, resolveDraw, countMatches,
} from '../lib/numbers/paytable.mjs';

// Seeded LCG in [0, 1) — deterministic stand-in for the CSPRNG
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

test('game shape: pick 6 of 1–20, stakes 5/10/20', () => {
  assert.equal(POOL, 20);
  assert.equal(PICKS, 6);
  assert.deepEqual(STAKES, [5, 10, 20]);
  assert.equal(MAX_WIN, 200);
});

test('paytable: 2→1.2x, 3→1.6x, 4→4.6x, 5+→10x, fewer pay 0', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(multFor), [0, 0, 1.2, 1.6, 4.6, 10, 10]);
  assert.deepEqual(TIERS.map(t => [t.label, t.mult]), [['2', 1.2], ['3', 1.6], ['4', 4.6], ['5+', 10]]);
  const paying = [0, 1, 2, 3, 4, 5, 6].map(multFor).filter(m => m > 0);
  assert.ok(Math.min(...paying) >= 1.2, 'minimum paying tier pays at least 1.2x');
  assert.equal(Math.max(...paying), 10, 'top prize is 10x');
  for (let k = 1; k <= 6; k++) assert.ok(multFor(k) >= multFor(k - 1), 'never pays less for more matches');
});

test('hypergeometric probabilities are exact and sum to 1', () => {
  const p = probabilities();
  assert.equal(p.length, 7);
  const T = 38760; // C(20, 6)
  const counts = [3003, 12012, 15015, 7280, 1365, 84, 1];
  counts.forEach((c, k) => assert.ok(Math.abs(p[k] - c / T) < 1e-15, `P(${k})`));
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
});

test('EV is 0.95 ± 0.002', () => {
  const ev = expectedValue();
  assert.ok(Math.abs(ev - 0.95) <= 0.002, `ev ${ev}`);
  assert.ok(Math.abs(ev - 36795 / 38760) < 1e-12);
});

test('payouts are whole numbers and never exceed 200', () => {
  for (const s of STAKES) {
    for (let k = 0; k <= 6; k++) {
      const p = payoutFor(s, k);
      assert.ok(Number.isInteger(p), `${s} × ${k} matches`);
      assert.ok(p <= MAX_WIN, `${s} × ${k} = ${p}`);
      assert.equal(p, Math.round(s * multFor(k)));
      // exact: rounding never moves the EV (every stake × mult is already whole)
      assert.ok(Math.abs(p - s * multFor(k)) < 1e-9, 'no rounding needed, so the EV is exact at every stake');
    }
  }
  assert.equal(payoutFor(20, 6), 200);
  assert.equal(payoutFor(5, 2), 6);
  assert.throws(() => payoutFor(30, 3));
  assert.throws(() => payoutFor(10, 7));
});

test('draw returns 6 unique integers in 1..20', () => {
  for (let i = 0; i < 500; i++) {
    const d = drawNumbers();
    assert.equal(d.length, 6);
    assert.equal(new Set(d).size, 6);
    for (const n of d) assert.ok(Number.isInteger(n) && n >= 1 && n <= 20, `n ${n}`);
  }
});

test('injected rng is deterministic', () => {
  assert.deepEqual(drawNumbers(seeded(7)), drawNumbers(seeded(7)));
  assert.notDeepEqual(drawNumbers(seeded(7)), drawNumbers(seeded(8)));
  // rng() → 0 always takes the first remaining number
  assert.deepEqual(drawNumbers(() => 0), [1, 2, 3, 4, 5, 6]);
  const seq = [0.5, 0.1, 0.9, 0.3, 0.7, 0.2];
  const fixed = () => { let i = 0; return () => seq[i++ % seq.length]; };
  assert.deepEqual(drawNumbers(fixed()), drawNumbers(fixed()));
  const r = resolveDraw(10, [1, 2, 3, 4, 5, 6], () => 0);
  assert.deepEqual(r, { drawn: [1, 2, 3, 4, 5, 6], matches: 6, mult: 10, win: true, payout: 100 });
});

test('resolveDraw counts matches and pays the table', () => {
  const picks = [1, 2, 3, 15, 16, 17];
  const r = resolveDraw(20, picks, () => 0); // drawn 1..6 → 3 matches
  assert.equal(r.matches, 3);
  assert.equal(r.mult, 1.6);
  assert.equal(r.payout, 32);
  assert.equal(r.win, true);
  const lose = resolveDraw(5, [20, 19, 18, 17, 16, 7], () => 0);
  assert.deepEqual(lose, { drawn: [1, 2, 3, 4, 5, 6], matches: 0, mult: 0, win: false, payout: 0 });
  assert.equal(countMatches([1, 2, 3], [3, 4, 1]), 2);
});

test('invalid picks and stakes throw', () => {
  assert.throws(() => validatePicks([1, 2, 3, 4, 5]), /6/);
  assert.throws(() => validatePicks([1, 2, 3, 4, 5, 6, 7]));
  assert.throws(() => validatePicks([1, 1, 2, 3, 4, 5]), /duplicate/);
  assert.throws(() => validatePicks([0, 1, 2, 3, 4, 5]), /range/);
  assert.throws(() => validatePicks([1, 2, 3, 4, 5, 21]), /range/);
  assert.throws(() => validatePicks([1, 2, 3, 4, 5, 2.5]));
  assert.throws(() => validatePicks('123456'));
  assert.doesNotThrow(() => validatePicks([20, 1, 7, 13, 2, 9]));
  assert.throws(() => resolveDraw(10, [1, 2, 3, 4, 5]));
  assert.throws(() => resolveDraw(15, [1, 2, 3, 4, 5, 6]));
});

test('20 000 simulated draws: mean multiplier within ±0.03 of 0.95', () => {
  const rng = seeded(20261007);
  const picks = [3, 7, 11, 14, 18, 20];
  let sum = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) sum += resolveDraw(10, picks, rng).mult;
  const mean = sum / N;
  assert.ok(Math.abs(mean - 0.95) <= 0.03, `mean ${mean}`);
});
