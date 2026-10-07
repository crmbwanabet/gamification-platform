import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMissionOverrides } from '../lib/config/missions.mjs';

const MISSIONS = [
  { id: 'a', target: 5, xp: 25, reward: { kwacha: 50 } },
  { id: 'b', target: 3, xp: 40, reward: { kwacha: 100, emeralds: 1 } },
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
  assert.deepEqual(b.reward, { kwacha: 150, emeralds: 1 }); // gems survive
});

test('the dashboard can attach gem prizes; retired gems and junk are dropped', () => {
  const out = applyMissionOverrides(MISSIONS, { a: { reward: { rubies: 2, diamonds: 1, gems: 9, kwacha: -5 } } });
  assert.deepEqual(out.find(m => m.id === 'a').reward, { kwacha: 50, rubies: 2, diamonds: 1 });
});

test('a 0 override removes a currency (gems-only prize)', () => {
  const out = applyMissionOverrides(MISSIONS, { a: { reward: { kwacha: 0, emeralds: 1 } } });
  assert.deepEqual(out.find(m => m.id === 'a').reward, { emeralds: 1 });
});
