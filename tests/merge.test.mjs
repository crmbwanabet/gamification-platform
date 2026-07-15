import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../lib/config/merge.mjs';

const DEFAULTS = {
  economy: { maxWin: 200, extraPlayCost: 50 },
  games: { wheel: { enabled: true, dailyPlays: 3 }, dice: { enabled: true, dailyPlays: 5 } },
  dailyRewards: [{ kwacha: 10 }],
  streakRewards: [{ days: 3, kwacha: 100 }],
  levelRewards: { 2: { kwacha: 50 } },
  missionOverrides: {},
};

test('no rows -> defaults unchanged', () => {
  assert.deepEqual(mergeConfig(DEFAULTS, []), DEFAULTS);
});

test('economy row overrides only provided fields', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'economy', value: { maxWin: 300 } }]);
  assert.equal(out.economy.maxWin, 300);
  assert.equal(out.economy.extraPlayCost, 50);
});

test('games rows merge per game, unknown game ids ignored', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'games', value: { wheel: { enabled: false }, bogus: { enabled: true } } }]);
  assert.equal(out.games.wheel.enabled, false);
  assert.equal(out.games.wheel.dailyPlays, 3); // untouched field survives
  assert.equal(out.games.bogus, undefined);
});

test('array keys replace wholesale', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'daily_rewards', value: [{ kwacha: 99 }] }]);
  assert.deepEqual(out.dailyRewards, [{ kwacha: 99 }]);
});

test('empty arrays are rejected, defaults kept', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'daily_rewards', value: [] }, { key: 'streak_rewards', value: [] }]);
  assert.deepEqual(out.dailyRewards, DEFAULTS.dailyRewards);
  assert.deepEqual(out.streakRewards, DEFAULTS.streakRewards);
});

test('mission_overrides passes through', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'mission_overrides', value: { d_spin: { enabled: false } } }]);
  assert.deepEqual(out.missionOverrides, { d_spin: { enabled: false } });
});

test('malformed row values are ignored, not fatal', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'economy', value: 'not-an-object' }, { key: 'daily_rewards', value: 7 }]);
  assert.deepEqual(out, DEFAULTS);
});

test('unknown keys are ignored', () => {
  assert.deepEqual(mergeConfig(DEFAULTS, [{ key: 'bogus', value: {} }, { key: 'toString', value: {} }]), DEFAULTS);
});

test('null/undefined rows -> defaults unchanged', () => {
  assert.deepEqual(mergeConfig(DEFAULTS, null), DEFAULTS);
  assert.deepEqual(mergeConfig(DEFAULTS, undefined), DEFAULTS);
});

test('prototype-chain game ids are not injected', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'games', value: { constructor: { enabled: true } } }]);
  assert.equal(Object.hasOwn(out.games, 'constructor'), false);
});
