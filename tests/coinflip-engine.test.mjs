import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAKES, FACES, payoutFor, resolveFlip } from '../lib/coinflip/engine.mjs';

test('stakes and faces', () => {
  assert.deepEqual(STAKES, [10, 20, 30, 50]);
  assert.deepEqual(FACES, ['HEADS', 'TAILS']);
});

test('payoutFor: 1.9x in integer maths', () => {
  assert.equal(payoutFor(10), 19);
  assert.equal(payoutFor(20), 38);
  assert.equal(payoutFor(30), 57);
  assert.equal(payoutFor(50), 95);
});

test('resolveFlip: low rng lands HEADS', () => {
  const r = resolveFlip(10, 'HEADS', () => 0.1);
  assert.equal(r.face, 'HEADS');
});

test('resolveFlip: high rng lands TAILS', () => {
  const r = resolveFlip(10, 'HEADS', () => 0.9);
  assert.equal(r.face, 'TAILS');
});

test('resolveFlip: win iff face === pick; payout only on a win', () => {
  for (const stake of STAKES) {
    for (const pick of FACES) {
      for (const v of [0, 0.25, 0.4999, 0.5, 0.75, 0.9999]) {
        const r = resolveFlip(stake, pick, () => v);
        assert.equal(r.win, r.face === pick);
        assert.equal(r.payout, r.win ? payoutFor(stake) : 0);
      }
    }
  }
});

test('invalid stake throws', () => {
  for (const bad of [0, 15, '10', NaN]) {
    assert.throws(() => payoutFor(bad));
    assert.throws(() => resolveFlip(bad, 'HEADS', () => 0.1));
  }
});

test('invalid pick throws', () => {
  for (const bad of ['heads', undefined]) {
    assert.throws(() => resolveFlip(10, bad, () => 0.1));
  }
});

test('default rng: 10 000 flips land 47-53% per face', () => {
  const N = 10000;
  let heads = 0;
  for (let i = 0; i < N; i++) if (resolveFlip(10, 'HEADS').face === 'HEADS') heads++;
  const share = heads / N;
  assert.ok(share >= 0.47 && share <= 0.53, `HEADS share ${share}`);
  assert.ok(1 - share >= 0.47 && 1 - share <= 0.53, `TAILS share ${1 - share}`);
});
