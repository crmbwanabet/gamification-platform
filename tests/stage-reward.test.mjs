import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialStageRewarded, stageUpRewards } from '../lib/xp/stageReward.mjs';

const REWARDS = { 2: { kwacha: 50 }, 3: { kwacha: 100 }, 4: { kwacha: 150, emeralds: 1 } };

test('first load: the saved marker, else the stage of the saved XP (silent)', () => {
  assert.equal(initialStageRewarded(undefined, 3), 3);
  assert.equal(initialStageRewarded(null, null), 1);
  assert.equal(initialStageRewarded(5, 3), 5, 'XP dropped since: keep the higher marker');
  assert.equal(initialStageRewarded(2, 4), 4);
  assert.equal(initialStageRewarded('junk', 2), 2);
});

test('pays every stage above the highest one already rewarded', () => {
  const r = stageUpRewards(1, 3, REWARDS);
  assert.deepEqual(r.levels, [2, 3]);
  assert.deepEqual(r.total, { kwacha: 150, emeralds: 0, rubies: 0, diamonds: 0 });
  assert.equal(r.rewarded, 3);
});

test('XP drops a stage then climbs back: nothing is paid or celebrated again', () => {
  // rewarded up to 4; a CRM correction drops the player to 3, then back to 4
  const down = stageUpRewards(4, 3, REWARDS);
  assert.deepEqual(down.levels, []);
  assert.equal(down.rewarded, 4, 'the marker never goes down');
  const back = stageUpRewards(down.rewarded, 4, REWARDS);
  assert.deepEqual(back.levels, []);
  assert.deepEqual(back.total, { kwacha: 0, emeralds: 0, rubies: 0, diamonds: 0 });
  // a NEW stage beyond the marker still pays, only itself
  const up = stageUpRewards(3, 4, REWARDS);
  assert.deepEqual(up.levels, [4]);
  assert.deepEqual(up.total, { kwacha: 150, emeralds: 1, rubies: 0, diamonds: 0 });
});

test('a cleaner can be passed (cleanReward in the app)', () => {
  const r = stageUpRewards(1, 2, { 2: { kwacha: 50, gems: 9 } }, (x) => ({ kwacha: x.kwacha }));
  assert.deepEqual(r.total, { kwacha: 50, emeralds: 0, rubies: 0, diamonds: 0 });
});
