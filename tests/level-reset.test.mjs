import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVEL_RESET_DAY, cleanLevelReset, levelXpOf, makeLevelReset, levelSeason } from '../lib/xp/levelReset.mjs';
import { computeSeasonXp, stageReachDay } from '../lib/season/xp.mjs';
import { getStage } from '../lib/vuma/stages.mjs';
import { stageUpRewards } from '../lib/xp/stageReward.mjs';

const row = (day, casino_stake) => ({ day, casino_stake, casino_rounds: 0, sports_stake: 0, sports_slips: 0, deposits_amount: 0, deposits_count: 0, withdrawals_amount: 0 });

test('everyone lands on level 1 and keeps the total XP', () => {
  for (const xp of [0, 30, 50, 640, 1399, 3000, 52000]) {
    const r = makeLevelReset({ xp, today: LEVEL_RESET_DAY, fromStage: getStage(xp).stage });
    assert.equal(r.base, xp);
    assert.equal(r.shown, 1);
    assert.equal(levelXpOf(xp, r), 0);
    assert.equal(getStage(levelXpOf(xp, r)).stage, 1);
  }
});

test('the called-back story is due only for players who had left the village (stage 6, the academy)', () => {
  assert.equal(makeLevelReset({ xp: 30, today: LEVEL_RESET_DAY, fromStage: 1 }).story, 'none');
  assert.equal(makeLevelReset({ xp: 300, today: LEVEL_RESET_DAY, fromStage: 3 }).story, 'none'); // still in the village
  assert.equal(makeLevelReset({ xp: 50, today: LEVEL_RESET_DAY, fromStage: 6 }).story, 'due');   // old stage 2 paid = new 6
  assert.equal(makeLevelReset({ xp: 5000, today: LEVEL_RESET_DAY, fromStage: 12 }).story, 'due');
});

test('XP earned after the restart counts as level XP', () => {
  const r = makeLevelReset({ xp: 640, today: LEVEL_RESET_DAY, fromStage: 8 });
  assert.equal(levelXpOf(640 + 99, r), 99);
  assert.equal(getStage(levelXpOf(640 + 200, r)).stage, 2);
  assert.equal(levelXpOf(600, r), 0); // a CRM correction below the base reads 0, never negative
});

test('a player who first opens after the restart day keeps the XP earned since then as level XP', () => {
  const rows = [row('2026-10-20', 5000), row('2026-10-24', 1000), row('2026-10-26', 1500)];
  const season = computeSeasonXp({ rows, today: '2026-10-27' });
  const r = makeLevelReset({ xp: season.xp, season, today: '2026-10-27', fromStage: getStage(season.xp).stage });
  assert.equal(r.base, 400 + 100); // through the end of 24 Oct
  assert.equal(levelXpOf(season.xp, r), 150);
});

test('the levels season counts stage reach days from level XP', () => {
  const rows = [row('2026-10-20', 4000), row('2026-10-25', 500), row('2026-10-26', 2000)];
  const season = computeSeasonXp({ rows, today: '2026-10-26' });
  assert.equal(stageReachDay(season, 2), '2026-10-20');
  const r = makeLevelReset({ xp: 400, today: LEVEL_RESET_DAY, fromStage: 8 });
  const lv = levelSeason(season, r);
  assert.equal(lv.xp, season.xp - 400);
  assert.equal(stageReachDay(lv, 2), '2026-10-26'); // 50 level XP on 25 Oct, 100 by 26 Oct
  assert.equal(levelSeason(season, null), season);
});

test('re-reached levels never pay coins twice (stageRewarded stays the high mark)', () => {
  const up = stageUpRewards(3, 2, { 2: { kwacha: 50 }, 3: { kwacha: 100 } });
  assert.deepEqual(up.levels, []);
  assert.equal(up.rewarded, 3);
  assert.deepEqual(stageUpRewards(3, 4, { 4: { kwacha: 200 } }).levels, [4]);
});

test('saved markers are cleaned; junk is ignored', () => {
  assert.equal(cleanLevelReset(null), null);
  assert.equal(cleanLevelReset({ base: 'x' }), null);
  assert.deepEqual(cleanLevelReset({ base: 640.7, day: '2026-10-24', from: 3, story: 'seen', shown: 7 }),
    { base: 640, day: '2026-10-24', from: 3, story: 'seen', shown: 7 });
  assert.equal(cleanLevelReset({ base: 640, celebrated: 2 }).shown, null); // the 24 Oct marker: shown is set later
  assert.equal(cleanLevelReset({ base: 5, story: 'weird' }).story, 'none');
  assert.equal(levelXpOf(500, null), 500);
});
