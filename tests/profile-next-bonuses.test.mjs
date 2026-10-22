import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextLevelBonuses } from '../lib/profile/nextBonuses.mjs';
import { SEASON_DEFAULTS } from '../lib/season/config.mjs';
const LEVEL_REWARDS = { 2: { kwacha: 50 }, 3: { kwacha: 100 }, 5: { kwacha: 200 }, 8: { kwacha: 500 }, 18: { kwacha: 2000 } };
import { STORE_UNLOCK_STAGE } from '../lib/store/catalog.mjs';

const at = (next, named = false) => nextLevelBonuses({ next, levelRewards: LEVEL_REWARDS, season: SEASON_DEFAULTS, storeStage: STORE_UNLOCK_STAGE, named });

test('next level bonuses = the real level-up prize + what opens there', () => {
  assert.deepEqual(at(2), ['50 coins', 'side quests']);
  assert.deepEqual(at(5), ['200 coins']);
  assert.ok(at(10).includes('Coin Shop opens'));
  assert.deepEqual(at(8, true).slice(1), ['league matches', 'name change']);
  assert.ok(!at(18).includes('World Cup'), 'the World Cup is locked for now, never promised');
  assert.deepEqual(at(3, true), ['100 coins', 'name change']);
});

test('nothing past the top level, junk input = []', () => {
  assert.deepEqual(nextLevelBonuses({ next: null }), []);
  assert.deepEqual(nextLevelBonuses(), []);
});
