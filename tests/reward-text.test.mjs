import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountText, rewardParts } from '../lib/rewardText.mjs';

test('amountText names the unit, singular for 1', () => {
  assert.equal(amountText(50, 'coins'), '50 coins');
  assert.equal(amountText(1, 'coins'), '1 coin');
  assert.equal(amountText(5, 'gems'), '5 gems');
  assert.equal(amountText(1, 'diamonds'), '1 diamond');
  assert.equal(amountText(30, 'xp'), '30 XP');
  assert.equal(amountText(1, 'xp'), '1 XP');
});

test('rewardParts lists only the non-zero amounts', () => {
  assert.deepEqual(rewardParts({ kwacha: 50, gems: 5, diamonds: 1 }), ['50 coins', '5 gems', '1 diamond']);
  assert.deepEqual(rewardParts({ kwacha: 20 }), ['20 coins']);
  assert.deepEqual(rewardParts(null), []);
});
