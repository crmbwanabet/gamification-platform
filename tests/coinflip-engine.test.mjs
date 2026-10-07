import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAKES, DEFAULT_STAKE, MULT, FACES, payoutFor, winChance, resolveFlip } from '../lib/coinflip/engine.mjs';

test('stakes and faces', () => {
  assert.deepEqual(STAKES, [1, 10, 25, 50]);
  assert.equal(DEFAULT_STAKE, 10);
  assert.equal(MULT, 1.9);
  assert.deepEqual(FACES, ['HEADS', 'TAILS']);
});

test('payoutFor: 1.9x rounded half up', () => {
  assert.equal(payoutFor(1), 2);   // 1.9
  assert.equal(payoutFor(10), 19);
  assert.equal(payoutFor(25), 48); // 47.5
  assert.equal(payoutFor(50), 95);
});

test('winChance from the actual payout: RTP exact at every stake', () => {
  assert.ok(Math.abs(winChance(1) - 0.49) < 1e-12);
  assert.ok(Math.abs(winChance(10) - 9.8 / 19) < 1e-12);
  for (const rtp of [0.97, 0.98, 0.99]) {
    for (const s of STAKES) assert.ok(Math.abs(winChance(s, rtp) * payoutFor(s) / s - rtp) < 1e-12, `${s} @ ${rtp}`);
  }
});

test('resolveFlip: rng below the win chance wins and lands on the pick', () => {
  for (const stake of STAKES) {
    for (const pick of FACES) {
      const p = winChance(stake);
      const w = resolveFlip(stake, pick, () => p - 1e-9);
      assert.deepEqual(w, { face: pick, win: true, payout: payoutFor(stake) });
      const l = resolveFlip(stake, pick, () => p);
      assert.deepEqual(l, { face: FACES.find(f => f !== pick), win: false, payout: 0 });
    }
  }
});

test('resolveFlip: win iff face === pick; payout only on a win', () => {
  for (const stake of STAKES) {
    for (const pick of FACES) {
      for (const v of [0, 0.25, 0.4899, 0.49, 0.5, 0.75, 0.9999]) {
        const r = resolveFlip(stake, pick, () => v);
        assert.equal(r.win, r.face === pick);
        assert.equal(r.payout, r.win ? payoutFor(stake) : 0);
      }
    }
  }
});

test('invalid stake throws', () => {
  for (const bad of [0, 15, 20, 30, '10', NaN]) {
    assert.throws(() => payoutFor(bad));
    assert.throws(() => resolveFlip(bad, 'HEADS', () => 0.1));
  }
});

test('invalid pick throws', () => {
  for (const bad of ['heads', undefined]) {
    assert.throws(() => resolveFlip(10, bad, () => 0.1));
  }
});

test('default rng: 10 000 flips at stake 10 win 51.6% ± 3%', () => {
  const N = 10000;
  let wins = 0;
  for (let i = 0; i < N; i++) if (resolveFlip(10, 'HEADS').win) wins++;
  const share = wins / N;
  assert.ok(Math.abs(share - 9.8 / 19) <= 0.03, `win share ${share}`);
});
