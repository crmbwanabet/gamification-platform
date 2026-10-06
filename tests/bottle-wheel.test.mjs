import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAKES, SEGMENTS, TOTAL_WEIGHT, MAX_MULT, expectedValue, payoutFor, segmentFor, resolveSpin,
} from '../lib/bottle/wheel.mjs';

test('stakes and 8 segments', () => {
  assert.deepEqual(STAKES, [10, 20, 30, 50]);
  assert.equal(SEGMENTS.length, 8);
  assert.equal(TOTAL_WEIGHT, SEGMENTS.reduce((s, x) => s + x.weight, 0));
  for (const s of SEGMENTS) {
    assert.ok(Number.isInteger(s.weight) && s.weight > 0, `weight ${s.weight}`);
    assert.ok(s.mult === 0 || s.mult >= 1.2, `mult ${s.mult}`);
  }
  assert.equal(MAX_MULT, 4);
  assert.equal(Math.max(...SEGMENTS.map(s => s.mult)), 4);
  assert.ok(SEGMENTS.some(s => s.mult === 0), 'has a TRY AGAIN segment');
});

test('bigger prizes come up less often', () => {
  const byMult = new Map();
  for (const s of SEGMENTS) if (s.mult > 0) byMult.set(s.mult, (byMult.get(s.mult) || 0) + s.weight);
  const mults = [...byMult.keys()].sort((a, b) => a - b);
  for (let i = 1; i < mults.length; i++) assert.ok(byMult.get(mults[i]) < byMult.get(mults[i - 1]), `${mults[i]}x not rarer than ${mults[i - 1]}x`);
});

test('EV computed exactly from the weights is 0.95 ± 0.002', () => {
  const ev = SEGMENTS.reduce((s, x) => s + x.weight * x.mult, 0) / TOTAL_WEIGHT;
  assert.ok(Math.abs(ev - 0.95) <= 0.002, `EV ${ev}`);
  assert.ok(Math.abs(expectedValue() - ev) < 1e-12);
});

test('payouts: whole numbers, never above the 200 cap', () => {
  for (const stake of STAKES) {
    for (const s of SEGMENTS) {
      const p = payoutFor(stake, s.mult);
      assert.ok(Number.isInteger(p), `${stake} × ${s.mult} = ${p}`);
      assert.ok(p <= 200, `${stake} × ${s.mult} = ${p}`);
      assert.equal(p, Math.round(stake * s.mult));
    }
  }
  assert.equal(payoutFor(50, 4), 200);
});

test('injected rng maps to the right segments', () => {
  let lo = 0;
  SEGMENTS.forEach((s, i) => {
    const hi = lo + s.weight;
    for (const w of [lo, (lo + hi) / 2, hi - 1e-6]) {
      assert.equal(segmentFor(w / TOTAL_WEIGHT), i, `r=${w / TOTAL_WEIGHT}`);
      const r = resolveSpin(20, () => w / TOTAL_WEIGHT);
      assert.equal(r.index, i);
      assert.equal(r.mult, s.mult);
      assert.equal(r.win, s.mult > 0);
      assert.equal(r.payout, s.mult > 0 ? payoutFor(20, s.mult) : 0);
    }
    lo = hi;
  });
  assert.equal(segmentFor(0), 0);
  assert.equal(segmentFor(1 - 2 ** -32), SEGMENTS.length - 1);
});

test('invalid input throws', () => {
  for (const bad of [0, 15, '10', NaN, undefined]) {
    assert.throws(() => resolveSpin(bad, () => 0.1));
    assert.throws(() => payoutFor(bad, 2));
  }
  for (const bad of [1, -0.01, NaN, 1.5, '0.2']) {
    assert.throws(() => resolveSpin(10, () => bad));
    assert.throws(() => segmentFor(bad));
  }
  assert.throws(() => payoutFor(10, 7));
});

test('default rng: 20 000 spins average 0.95 ± 0.03', () => {
  const N = 20000;
  let sum = 0;
  const seen = new Set();
  for (let i = 0; i < N; i++) { const r = resolveSpin(10); sum += r.mult; seen.add(r.index); }
  const mean = sum / N;
  assert.ok(Math.abs(mean - 0.95) <= 0.03, `mean ${mean}`);
  assert.equal(seen.size, SEGMENTS.length);
});
