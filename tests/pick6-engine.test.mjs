import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAKES, DEFAULT_STAKE, winChance, payoutFor, resolvePick } from '../lib/pick6/engine.mjs';
import { SPOTS } from '../lib/penalty/spots.mjs';

const MULTS = SPOTS.map(s => s.mult);

test('stakes 1/10/25/50, default chip 10', () => {
  assert.deepEqual(STAKES, [1, 10, 25, 50]);
  assert.equal(DEFAULT_STAKE, 10);
});

test('penalty spots: 6 spots, 2x3 grid, the approved multipliers', () => {
  assert.equal(SPOTS.length, 6);
  const byPos = Object.fromEntries(SPOTS.map(s => [`${s.row}${s.col}`, s.mult]));
  assert.deepEqual(byPos, { '00': 4, '01': 1.5, '02': 3, '10': 2.5, '11': 1.2, '12': 2 });
  assert.equal(new Set(SPOTS.map(s => s.id)).size, 6);
  for (const s of SPOTS) assert.ok(typeof s.label === 'string' && s.label.length > 0);
});

test('payoutFor: stake × mult rounded half up for every stake × spot', () => {
  const expected = {
    1.2: [1, 12, 30, 60], 1.5: [2, 15, 38, 75], 2: [2, 20, 50, 100],
    2.5: [3, 25, 63, 125], 3: [3, 30, 75, 150], 4: [4, 40, 100, 200],
  };
  for (const m of MULTS) {
    assert.deepEqual(STAKES.map(s => payoutFor(s, m)), expected[m], `mult ${m}`);
  }
});

test('winChance = rtp × stake / actual payout (RTP 98% default)', () => {
  assert.ok(Math.abs(winChance(10, 2) - 0.49) < 1e-12);
  assert.ok(Math.abs(winChance(1, 1.5) - 0.49) < 1e-12);       // pays 2, not 1.5
  assert.ok(Math.abs(winChance(1, 1.2) - 0.98) < 1e-12);       // pays 1: a refund
  assert.ok(Math.abs(winChance(25, 2.5) - 0.98 * 25 / 63) < 1e-12);
  assert.ok(Math.abs(winChance(50, 4, 0.97) - 0.2425) < 1e-12);
  assert.ok(Math.abs(winChance(50, 4, 0.5) - 0.2425) < 1e-12);  // clamped to 0.97
  for (const m of MULTS) for (const s of STAKES) {
    assert.ok(Math.abs(winChance(s, m) * payoutFor(s, m) / s - 0.98) < 1e-12, `${s} × ${m}`);
  }
});

test('no payout exceeds the 200 max-win cap', () => {
  for (const m of MULTS) for (const s of STAKES) assert.ok(payoutFor(s, m) <= 200, `${s} × ${m}`);
});

test('injected rng: wins exactly when rng() < winChance', () => {
  for (const m of MULTS) {
    for (const s of STAKES) {
      for (const rtp of [0.97, 0.98, 0.99]) {
        const p = winChance(s, m, rtp);
        assert.deepEqual(resolvePick(s, m, () => p - 1e-9, rtp), { win: true, payout: payoutFor(s, m) });
        assert.deepEqual(resolvePick(s, m, () => p, rtp), { win: false, payout: 0 });
        assert.deepEqual(resolvePick(s, m, () => 0.999999, rtp), { win: false, payout: 0 });
        assert.equal(resolvePick(s, m, () => 0, rtp).win, true);
      }
    }
  }
});

test('custom stake list is honoured', () => {
  assert.equal(payoutFor(5, 2, [5, 15]), 10);
  assert.deepEqual(resolvePick(15, 2, () => 0, 0.98, [5, 15]), { win: true, payout: 30 });
  assert.throws(() => resolvePick(10, 2, () => 0, 0.98, [5, 15]));
});

test('invalid input throws', () => {
  for (const bad of [0, 15, 20, 30, '10', NaN, undefined, -10]) {
    assert.throws(() => payoutFor(bad, 2), `stake ${String(bad)}`);
    assert.throws(() => resolvePick(bad, 2, () => 0), `stake ${String(bad)}`);
  }
  for (const bad of [1, 0.5, 0, -2, NaN, Infinity, '2', undefined]) {
    assert.throws(() => winChance(10, bad), `mult ${String(bad)}`);
    assert.throws(() => payoutFor(10, bad), `mult ${String(bad)}`);
    assert.throws(() => resolvePick(10, bad, () => 0), `mult ${String(bad)}`);
  }
});

test('default rng: 20 000 picks at 2x (stake 10) win 49% ± 2%', () => {
  const N = 20000;
  let wins = 0;
  for (let i = 0; i < N; i++) if (resolvePick(10, 2).win) wins++;
  const share = wins / N;
  assert.ok(share >= 0.47 && share <= 0.51, `win share ${share}`);
});
