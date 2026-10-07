import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_REWARDS } from '../lib/data/dailyRewards.mjs';

test('daily login reward: days 1-6 pay 10 coins, day 7 (7 in a row) pays 100', () => {
  assert.equal(DAILY_REWARDS.length, 7);
  assert.deepEqual(DAILY_REWARDS.map(r => r.day), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(DAILY_REWARDS.map(r => r.kwacha), [10, 10, 10, 10, 10, 10, 100]);
});

test('daily login reward is coins only (no gems, no diamonds)', () => {
  for (const r of DAILY_REWARDS) assert.deepEqual(Object.keys(r).sort(), ['day', 'kwacha']);
});

test('a full week pays exactly 160 coins (streak bonuses removed 2026-10-07)', () => {
  assert.equal(DAILY_REWARDS.reduce((sum, r) => sum + r.kwacha, 0), 160);
});
