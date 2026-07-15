import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playsFromConfig } from '../lib/config/plays.mjs';

test('maps enabled games to allowances', () => {
  assert.deepEqual(playsFromConfig({ wheel: { enabled: true, dailyPlays: 3 }, dice: { dailyPlays: 5 } }), { wheel: 3, dice: 5 });
});
test('disabled games are excluded', () => {
  assert.deepEqual(playsFromConfig({ wheel: { enabled: false, dailyPlays: 3 }, dice: { enabled: true, dailyPlays: 5 } }), { dice: 5 });
});
test('null/undefined -> empty', () => {
  assert.deepEqual(playsFromConfig(null), {});
  assert.deepEqual(playsFromConfig(undefined), {});
});
