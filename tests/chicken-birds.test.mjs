import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAKES, payoutFor, winChance } from '../lib/pick6/engine.mjs';
import { BIRDS, BIRD_IDS } from '../lib/chicken/birds.mjs';

test('chicken birds: 6 birds, unique ids, the approved multiplier ladder', () => {
  assert.equal(BIRDS.length, 6);
  assert.equal(new Set(BIRD_IDS).size, 6);
  const mults = BIRDS.map(b => b.mult);
  assert.equal(new Set(mults).size, 6);
  assert.deepEqual(mults, [1.2, 1.5, 2, 2.5, 3, 4]);
  const byId = Object.fromEntries(BIRDS.map(b => [b.id, b.mult]));
  assert.deepEqual(byId, { brown: 1.2, white: 1.5, speckled: 2, red: 2.5, black: 3, rooster: 4 });
  for (const b of BIRDS) {
    assert.ok(typeof b.name === 'string' && b.name.length > 0);
    assert.ok(b.tag && b.tag.c && b.tag.l && b.tag.d, `${b.id} tag colours`);
  }
});

test('chicken birds: every payout is a whole number and none exceeds 200', () => {
  for (const b of BIRDS) {
    assert.ok(winChance(b.mult) > 0 && winChance(b.mult) < 1);
    for (const s of STAKES) {
      const p = payoutFor(s, b.mult);
      assert.ok(Number.isInteger(p), `${s} × ${b.mult}`);
      assert.ok(p <= 200, `${s} × ${b.mult} = ${p}`);
    }
  }
  assert.equal(payoutFor(50, 4), 200);
});
