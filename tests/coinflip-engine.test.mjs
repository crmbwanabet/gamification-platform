import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAKES, FACES, payoutFor, resolveFlip } from '../lib/coinflip/engine.mjs';

test('stakes and faces', () => {
  assert.deepEqual(STAKES, [10, 20, 30, 50]);
  assert.deepEqual(FACES, ['EAGLE', '100x']);
});

test('payoutFor: 1.9x in integer maths', () => {
  assert.equal(payoutFor(10), 19);
  assert.equal(payoutFor(20), 38);
  assert.equal(payoutFor(30), 57);
  assert.equal(payoutFor(50), 95);
});

test('resolveFlip: low rng lands EAGLE', () => {
  const r = resolveFlip(10, 'EAGLE', () => 0.1);
  assert.equal(r.face, 'EAGLE');
});

test('resolveFlip: high rng lands 100x', () => {
  const r = resolveFlip(10, 'EAGLE', () => 0.9);
  assert.equal(r.face, '100x');
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
    assert.throws(() => resolveFlip(bad, 'EAGLE', () => 0.1));
  }
});

test('invalid pick throws', () => {
  for (const bad of ['heads', undefined]) {
    assert.throws(() => resolveFlip(10, bad, () => 0.1));
  }
});

test('default rng: 10 000 flips land 47-53% per face', () => {
  const N = 10000;
  let eagle = 0;
  for (let i = 0; i < N; i++) if (resolveFlip(10, 'EAGLE').face === 'EAGLE') eagle++;
  const share = eagle / N;
  assert.ok(share >= 0.47 && share <= 0.53, `EAGLE share ${share}`);
  assert.ok(1 - share >= 0.47 && 1 - share <= 0.53, `100x share ${1 - share}`);
});
