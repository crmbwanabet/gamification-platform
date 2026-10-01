import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EDGE, STAKES, winChance, payoutFor, resolvePick } from '../lib/pick6/engine.mjs';
import { SPOTS } from '../lib/penalty/spots.mjs';

const MULTS = SPOTS.map(s => s.mult);

test('edge and default stakes', () => {
  assert.equal(EDGE, 0.05);
  assert.deepEqual(STAKES, [10, 20, 30, 50]);
});

test('penalty spots: 6 spots, 2x3 grid, the approved multipliers', () => {
  assert.equal(SPOTS.length, 6);
  const byPos = Object.fromEntries(SPOTS.map(s => [`${s.row}${s.col}`, s.mult]));
  assert.deepEqual(byPos, { '00': 4, '01': 1.5, '02': 3, '10': 2.5, '11': 1.2, '12': 2 });
  assert.equal(new Set(SPOTS.map(s => s.id)).size, 6);
  for (const s of SPOTS) assert.ok(typeof s.label === 'string' && s.label.length > 0);
});

test('winChance = (1 - EDGE) / mult', () => {
  assert.equal(winChance(2), 0.475);
  assert.equal(winChance(4), 0.2375);
  for (const m of MULTS) assert.ok(Math.abs(winChance(m) - 0.95 / m) < 1e-12);
});

test('payoutFor: Math.round(stake × mult) for every stake × spot', () => {
  const expected = {
    4: [40, 80, 120, 200], 1.5: [15, 30, 45, 75], 3: [30, 60, 90, 150],
    2.5: [25, 50, 75, 125], 1.2: [12, 24, 36, 60], 2: [20, 40, 60, 100],
  };
  for (const m of MULTS) {
    assert.deepEqual(STAKES.map(s => payoutFor(s, m)), expected[m], `mult ${m}`);
    for (const s of STAKES) assert.ok(Number.isInteger(payoutFor(s, m)));
  }
});

test('no payout exceeds the 200 max-win cap', () => {
  for (const m of MULTS) for (const s of STAKES) assert.ok(payoutFor(s, m) <= 200, `${s} × ${m}`);
});

test('injected rng: wins exactly when rng() < winChance(mult)', () => {
  for (const m of MULTS) {
    const p = winChance(m);
    for (const s of STAKES) {
      const below = resolvePick(s, m, () => p - 1e-9);
      assert.deepEqual(below, { win: true, payout: payoutFor(s, m) });
      assert.deepEqual(resolvePick(s, m, () => p), { win: false, payout: 0 });
      assert.deepEqual(resolvePick(s, m, () => 0.999999), { win: false, payout: 0 });
      assert.equal(resolvePick(s, m, () => 0).win, true);
    }
  }
});

test('custom stake list is honoured', () => {
  assert.equal(payoutFor(5, 2, [5, 15]), 10);
  assert.deepEqual(resolvePick(15, 2, () => 0, [5, 15]), { win: true, payout: 30 });
  assert.throws(() => resolvePick(10, 2, () => 0, [5, 15]));
});

test('invalid input throws', () => {
  for (const bad of [0, 15, '10', NaN, undefined, -10]) {
    assert.throws(() => payoutFor(bad, 2), `stake ${String(bad)}`);
    assert.throws(() => resolvePick(bad, 2, () => 0), `stake ${String(bad)}`);
  }
  for (const bad of [1, 0.5, 0, -2, NaN, Infinity, '2', undefined]) {
    assert.throws(() => winChance(bad), `mult ${String(bad)}`);
    assert.throws(() => payoutFor(10, bad), `mult ${String(bad)}`);
    assert.throws(() => resolvePick(10, bad, () => 0), `mult ${String(bad)}`);
  }
});

test('default rng: 20 000 picks at 2x win 47.5% ± 2%', () => {
  const N = 20000;
  let wins = 0;
  for (let i = 0; i < N; i++) if (resolvePick(10, 2).win) wins++;
  const share = wins / N;
  assert.ok(share >= 0.455 && share <= 0.495, `win share ${share}`);
});
