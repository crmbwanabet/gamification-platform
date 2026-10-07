import { test } from 'node:test';
import assert from 'node:assert/strict';
import { amountText, rewardParts } from '../lib/rewardText.mjs';

test('amountText names the unit, singular for 1', () => {
  assert.equal(amountText(50, 'coins'), '50 coins');
  assert.equal(amountText(1, 'coins'), '1 coin');
  assert.equal(amountText(1, 'emeralds'), '1 emerald');
  assert.equal(amountText(3, 'emeralds'), '3 emeralds');
  assert.equal(amountText(1, 'rubies'), '1 ruby');
  assert.equal(amountText(2, 'rubies'), '2 rubies');
  assert.equal(amountText(1, 'diamonds'), '1 diamond');
  assert.equal(amountText(4, 'diamonds'), '4 diamonds');
  assert.equal(amountText(30, 'xp'), '30 XP');
  assert.equal(amountText(1, 'xp'), '1 XP');
});

test('rewardParts lists only the non-zero amounts', () => {
  assert.deepEqual(rewardParts({ kwacha: 50, emeralds: 1, rubies: 2, diamonds: 1 }), ['50 coins', '1 emerald', '2 rubies', '1 diamond']);
  assert.deepEqual(rewardParts({ kwacha: 20 }), ['20 coins']);
  assert.deepEqual(rewardParts(null), []);
});

test('amountText groups thousands: "5,000 coins", "10,000 coins"', () => {
  assert.equal(amountText(5000, 'coins'), '5,000 coins');
  assert.equal(amountText(10000, 'coins'), '10,000 coins');
  assert.equal(amountText(999, 'coins'), '999 coins');
});

test('rewardParts ignores the retired gems currency', () => {
  assert.deepEqual(rewardParts({ kwacha: 20, gems: 5 }), ['20 coins']);
});
