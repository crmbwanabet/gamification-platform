import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAKES, payoutFor, winChance } from '../lib/pick6/engine.mjs';
import { PASSENGERS, PASSENGER_IDS } from '../lib/minibus/passengers.mjs';

test('minibus passengers: 6 passengers, unique ids, the approved multiplier ladder', () => {
  assert.equal(PASSENGERS.length, 6);
  assert.equal(new Set(PASSENGER_IDS).size, 6);
  const mults = PASSENGERS.map(p => p.mult);
  assert.equal(new Set(mults).size, 6);
  assert.deepEqual(mults, [1.2, 1.5, 2, 2.5, 3, 4]);
  const byId = Object.fromEntries(PASSENGERS.map(p => [p.id, p.mult]));
  assert.deepEqual(byId, { granny: 1.2, lady: 1.5, schoolboy: 2, office: 2.5, headphones: 3, tourist: 4 });
  for (const p of PASSENGERS) {
    assert.ok(typeof p.name === 'string' && p.name.length > 0);
    assert.ok(p.tag && p.tag.c && p.tag.l && p.tag.d, `${p.id} tag colours`);
    assert.ok(p.x > 0 && p.x < 300 && p.y > 180 && p.y < 306, `${p.id} stands on the pavement`);
  }
});

test('minibus passengers: every payout is a whole number and none exceeds 200', () => {
  for (const p of PASSENGERS) {
    assert.ok(winChance(p.mult) > 0 && winChance(p.mult) < 1);
    for (const s of STAKES) {
      const pay = payoutFor(s, p.mult);
      assert.ok(Number.isInteger(pay), `${s} × ${p.mult}`);
      assert.ok(pay <= 200, `${s} × ${p.mult} = ${pay}`);
    }
  }
  assert.equal(payoutFor(50, 4), 200);
});
