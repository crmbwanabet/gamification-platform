import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMissionOverrides } from '../lib/config/missions.mjs';

const MISSIONS = [
  { id: 'a', target: 5, xp: 25, reward: { kwacha: 50 } },
  { id: 'b', target: 3, xp: 40, reward: { kwacha: 100, gems: 5 } },
];

test('no overrides -> unchanged', () => {
  assert.deepEqual(applyMissionOverrides(MISSIONS, {}), MISSIONS);
  assert.deepEqual(applyMissionOverrides(MISSIONS, null), MISSIONS);
});

test('enabled:false drops the mission', () => {
  const out = applyMissionOverrides(MISSIONS, { a: { enabled: false } });
  assert.deepEqual(out.map(m => m.id), ['b']);
});

test('reward/target/xp patch, reward merges shallow', () => {
  const out = applyMissionOverrides(MISSIONS, { b: { target: 10, xp: 60, reward: { kwacha: 150 } } });
  const b = out.find(m => m.id === 'b');
  assert.equal(b.target, 10);
  assert.equal(b.xp, 60);
  assert.deepEqual(b.reward, { kwacha: 150, gems: 5 }); // gems survive
});
