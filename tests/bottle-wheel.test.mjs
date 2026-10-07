import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAKES, DEFAULT_STAKE, SEGMENTS, MAX_MULT, payoutFor, weightsFor, chancesFor, rtpFor, segmentFor, resolveSpin,
} from '../lib/bottle/wheel.mjs';

test('stakes and 8 segments', () => {
  assert.deepEqual(STAKES, [1, 10, 25, 50]);
  assert.equal(DEFAULT_STAKE, 10);
  assert.equal(SEGMENTS.length, 8);
  for (const s of SEGMENTS) {
    if (s.mult > 0) assert.ok(Number.isInteger(s.weight) && s.weight > 0, `weight ${s.weight}`);
    assert.ok(s.mult === 0 || s.mult >= 1.2, `mult ${s.mult}`);
  }
  assert.equal(MAX_MULT, 4);
  assert.equal(SEGMENTS.filter(s => s.mult === 0).length, 3, 'three TRY AGAIN segments');
});

test('bigger prizes come up less often (at every stake)', () => {
  for (const st of STAKES) {
    const p = chancesFor(st);
    const byMult = new Map();
    SEGMENTS.forEach((s, i) => { if (s.mult > 0) byMult.set(s.mult, (byMult.get(s.mult) || 0) + p[i]); });
    const mults = [...byMult.keys()].sort((a, b) => a - b);
    for (let i = 1; i < mults.length; i++) assert.ok(byMult.get(mults[i]) < byMult.get(mults[i - 1]), `${st}: ${mults[i]}x not rarer than ${mults[i - 1]}x`);
    assert.ok(Math.abs(p.reduce((a, x) => a + x, 0) - 1) < 1e-12);
  }
});

test('TRY AGAIN weight is solved per stake so the EV is exactly the RTP', () => {
  for (const rtp of [0.97, 0.98, 0.99]) {
    for (const st of STAKES) {
      assert.ok(Math.abs(rtpFor(st, rtp) - rtp) < 1e-12, `stake ${st} @ ${rtp}`);
      const w = weightsFor(st, rtp);
      assert.ok(w[1] > 0 && w[1] === w[5] && w[5] === w[7], 'TRY AGAIN segments share the losing weight');
    }
  }
  // at stake 10 every payout is whole: L = 95 / 0.98 − 58
  assert.ok(Math.abs(weightsFor(10)[1] * 3 - (95 / 0.98 - 58)) < 1e-9);
  // the RTP config is clamped
  assert.deepEqual(weightsFor(10, 0.5), weightsFor(10, 0.97));
});

test('payouts: half up, whole numbers, never above the 200 cap', () => {
  assert.deepEqual(STAKES.map(s => payoutFor(s, 1.5)), [2, 15, 38, 75]);
  assert.deepEqual(STAKES.map(s => payoutFor(s, 1.2)), [1, 12, 30, 60]);
  for (const stake of STAKES) {
    for (const s of SEGMENTS) {
      const p = payoutFor(stake, s.mult);
      assert.ok(Number.isInteger(p), `${stake} × ${s.mult} = ${p}`);
      assert.ok(p <= 200, `${stake} × ${s.mult} = ${p}`);
    }
  }
  assert.equal(payoutFor(50, 4), 200);
  assert.equal(payoutFor(50, 0), 0);
});

test('injected rng maps to the right segments', () => {
  for (const st of STAKES) {
    const w = weightsFor(st);
    const total = w.reduce((a, x) => a + x, 0);
    let lo = 0;
    SEGMENTS.forEach((s, i) => {
      const hi = lo + w[i];
      for (const x of [lo + 1e-9, (lo + hi) / 2, hi - 1e-6]) {
        assert.equal(segmentFor(x / total, w), i, `r=${x / total}`);
        const r = resolveSpin(st, () => x / total);
        assert.equal(r.index, i);
        assert.equal(r.mult, s.mult);
        assert.equal(r.win, s.mult > 0);
        assert.equal(r.payout, s.mult > 0 ? payoutFor(st, s.mult) : 0);
      }
      lo = hi;
    });
  }
  assert.equal(segmentFor(0), 0);
  assert.equal(segmentFor(1 - 2 ** -32), SEGMENTS.length - 1);
});

test('invalid input throws', () => {
  for (const bad of [0, 15, 20, 30, '10', NaN, undefined]) {
    assert.throws(() => resolveSpin(bad, () => 0.1));
    assert.throws(() => payoutFor(bad, 2));
    assert.throws(() => weightsFor(bad));
  }
  for (const bad of [1, -0.01, NaN, 1.5, '0.2']) {
    assert.throws(() => resolveSpin(10, () => bad));
    assert.throws(() => segmentFor(bad));
  }
  assert.throws(() => payoutFor(10, 7));
});

test('default rng: 20 000 spins at stake 10 return 0.98 ± 0.03', () => {
  const N = 20000;
  let sum = 0;
  const seen = new Set();
  for (let i = 0; i < N; i++) { const r = resolveSpin(10); sum += r.payout / 10; seen.add(r.index); }
  const mean = sum / N;
  assert.ok(Math.abs(mean - 0.98) <= 0.03, `mean ${mean}`);
  assert.equal(seen.size, SEGMENTS.length);
});
