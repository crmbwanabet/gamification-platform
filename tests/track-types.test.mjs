import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACK_TYPES, REWARD_TYPES, cleanEvents } from '../lib/trackTypes.mjs';

test('every reward type is also a tracked type', () => {
  for (const t of REWARD_TYPES) assert.ok(TRACK_TYPES.has(t), t);
  assert.ok(!REWARD_TYPES.has('game_played'), 'playing is not claiming a reward');
  assert.ok(!REWARD_TYPES.has('level_up'), 'level-up coins are automatic, not a claim');
});

test('cleanEvents drops unknown types and caps fields', () => {
  const now = Date.parse('2026-10-19T12:00:00Z');
  const out = cleanEvents([
    { type: 'hack', amount: 5 },
    { type: 'daily_claimed', amount: 10.7, at: '2026-10-19T11:59:00Z' },
    { type: 'game_played', gameId: 'x'.repeat(50), amount: 1e9, at: '2020-01-01T00:00:00Z' },
    { type: 'tab_view', meta: { tab: 'missions' } },
    { type: 'tab_view', meta: { big: 'y'.repeat(2000) } },
    { type: 'tab_view', meta: ['array'] },
  ], TRACK_TYPES, now);
  assert.equal(out.length, 5);
  assert.deepEqual(out[0], { type: 'daily_claimed', gameId: null, amount: 10, meta: null, at: '2026-10-19T11:59:00.000Z' });
  assert.equal(out[1].gameId.length, 32);
  assert.equal(out[1].amount, 100000);
  assert.equal(out[1].at, null, 'a far-off client time is ignored (server time used)');
  assert.deepEqual(out[2].meta, { tab: 'missions' });
  assert.equal(out[3].meta, null);
  assert.equal(out[4].meta, null);
});
