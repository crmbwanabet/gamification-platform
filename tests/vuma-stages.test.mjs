import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VUMA_STAGES, getStage, getNextStage, stageProgress } from '../lib/vuma/stages.mjs';
import { STORIES, storyFor } from '../lib/vuma/stories.mjs';
import { SEASON_DEFAULTS, MAX_STAGE } from '../lib/season/config.mjs';
import { readFileSync } from 'node:fs';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

test('23 stages numbered 1..23, thresholds strictly increasing from 0', () => {
  assert.equal(VUMA_STAGES.length, 23);
  assert.equal(VUMA_STAGES[0].xp, 0);
  VUMA_STAGES.forEach((s, i) => {
    assert.equal(s.stage, i + 1);
    if (i > 0) assert.ok(s.xp > VUMA_STAGES[i - 1].xp, `stage ${s.stage} threshold must rise`);
  });
  assert.equal(VUMA_STAGES[22].xp, 78000);
});

test('thresholds (23 stages, doubled 2026-10-27): the village 1-5, the academy at 2,000, league 12, World Cup 22', () => {
  assert.deepEqual(VUMA_STAGES.map(s => s.xp), [0, 200, 500, 900, 1400, 2000, 2800, 3800, 5000, 6400, 8000, 10000, 12400, 15200, 18400, 22000, 26000, 31000, 37000, 44000, 53000, 64000, 78000]);
  assert.equal(VUMA_STAGES[5].name, 'Copperbelt Football Academy');
  assert.equal(VUMA_STAGES[11].name, 'Kafue Gaels FC', 'stage 12 = first pro club, league matches');
  assert.equal(VUMA_STAGES[21].name, 'Manchester Metropolis', 'stage 22 unlocks the World Cup');
  assert.equal(VUMA_STAGES[15].name, 'Shaka Chiefs');
  assert.equal(SEASON_DEFAULTS.league.unlockStage, 12);
  assert.equal(SEASON_DEFAULTS.worldCup.unlockStage, 22);
  assert.equal(MAX_STAGE, VUMA_STAGES.length);
});

test('stages 1-5 are the village, then 11 Zambian locations with a club; no Kapiri Mposhi', () => {
  for (const s of VUMA_STAGES.slice(0, 5)) { assert.equal(s.place, 'The village'); assert.equal(s.club, ''); }
  assert.deepEqual(VUMA_STAGES.slice(0, 5).map(s => s.name), ['The village', 'Street Hero', 'The Village Team', 'The Village Derby', 'Village League']);
  assert.deepEqual(VUMA_STAGES.slice(5, 15).map(s => s.place), ['Small town', 'Town', 'Big town compound', 'Big town suburb',
    'City compound', 'City suburb', 'Lusaka compound', 'Lusaka compound', 'Lusaka suburb', 'Lusaka suburb']);
  for (const s of VUMA_STAGES.slice(5)) assert.ok(s.club, `stage ${s.stage} needs a club`);
  assert.ok(!VUMA_STAGES.some(s => /kapiri/i.test(s.place + s.club)));
});

test('name = club, else the village label, else the place; deliberate club spellings kept', () => {
  assert.equal(VUMA_STAGES[0].name, 'The village');
  assert.equal(VUMA_STAGES[20].name, 'Manchester Union');
  assert.equal(VUMA_STAGES[22].name, 'Doha Dam SC');
  for (const s of VUMA_STAGES.slice(5)) assert.equal(s.name, s.club);
});

test('level-up coins: one row per stage 2..23; stages 6..23 keep the old 17,400', () => {
  // platform.js imports extensionless modules (Next-only), so read its LEVEL_REWARDS table as text
  const src = readFileSync(path.join(PUBLIC, '..', 'lib', 'data', 'platform.js'), 'utf8');
  const block = src.slice(src.indexOf('export const LEVEL_REWARDS = {'), src.indexOf('};', src.indexOf('export const LEVEL_REWARDS = {')));
  const LEVEL_REWARDS = Object.fromEntries([...block.matchAll(/^\s+(\d+): \{ kwacha: (\d+) \}/gm)].map(m => [m[1], { kwacha: Number(m[2]) }]));
  assert.deepEqual(Object.keys(LEVEL_REWARDS).map(Number), VUMA_STAGES.slice(1).map(s => s.stage));
  assert.deepEqual([2, 3, 4, 5].map(k => LEVEL_REWARDS[k].kwacha), [20, 30, 40, 50]);
  assert.equal(Object.entries(LEVEL_REWARDS).filter(([k]) => Number(k) >= 6).reduce((t, [, r]) => t + r.kwacha, 0), 17400);
});

test('getStage at boundaries', () => {
  assert.equal(getStage(0).stage, 1);
  assert.equal(getStage(199).stage, 1);
  assert.equal(getStage(200).stage, 2);
  assert.equal(getStage(1999).stage, 5);
  assert.equal(getStage(2000).stage, 6);
  assert.equal(getStage(9999).stage, 11);
  assert.equal(getStage(10000).stage, 12);
  assert.equal(getStage(63999).stage, 21);
  assert.equal(getStage(64000).stage, 22);
  assert.equal(getStage(78000).stage, 23);
  assert.equal(getStage(999999).stage, 23);
});

test('sub-levels: 5 per stage, 115 in all, "Level 1.3", rising thresholds', async () => {
  const { SUB_LEVELS, getSubLevel, getNextSubLevel, subLevelProgress, migrateStageNumber } = await import('../lib/vuma/stages.mjs');
  assert.equal(SUB_LEVELS.length, 115);
  SUB_LEVELS.forEach((l, i) => {
    assert.equal(l.index, i + 1);
    assert.equal(l.id, `${l.stage}.${l.sub}`);
    if (i > 0) assert.ok(l.xp > SUB_LEVELS[i - 1].xp, `${l.id} must rise`);
    if (l.sub === 1) assert.equal(l.xp, VUMA_STAGES[l.stage - 1].xp, `${l.id} opens the stage`);
  });
  assert.deepEqual(SUB_LEVELS.slice(0, 6).map(l => l.xp), [0, 40, 80, 120, 160, 200]);
  assert.equal(SUB_LEVELS[114].id, '23.5');
  assert.equal(SUB_LEVELS[114].xp, 99600);
  assert.equal(getSubLevel(79).id, '1.2');
  assert.equal(getSubLevel(80).id, '1.3');
  assert.equal(getSubLevel(1e9).id, '23.5');
  assert.equal(getNextSubLevel(0).id, '1.2');
  assert.equal(getNextSubLevel(99600), null);
  assert.equal(subLevelProgress(20), 50);
  assert.equal(subLevelProgress(1e9), 100);
  for (let xp = 0; xp <= 120000; xp += 37) { const p = subLevelProgress(xp); assert.ok(p >= 0 && p <= 100); }
  assert.equal(migrateStageNumber(1), 1);
  assert.equal(migrateStageNumber(2), 6);
  assert.equal(migrateStageNumber(8), 12);
});

test('bad xp counts as 0', () => {
  for (const bad of [-5, undefined, null, NaN, 'abc', -Infinity]) {
    assert.equal(getStage(bad).stage, 1, String(bad));
    assert.equal(getNextStage(bad).stage, 2, String(bad));
    assert.equal(stageProgress(bad), 0, String(bad));
  }
});

test('getNextStage: following stage, null at the top', () => {
  assert.equal(getNextStage(0).stage, 2);
  assert.equal(getNextStage(200).stage, 3);
  assert.equal(getNextStage(77999).stage, 23);
  assert.equal(getNextStage(78000), null);
  assert.equal(getNextStage(1e9), null);
});

test('stageProgress stays within 0..100', () => {
  assert.equal(stageProgress(0), 0);
  assert.equal(stageProgress(100), 50);
  assert.equal(stageProgress(200), 0);
  assert.equal(stageProgress(350), 50);
  assert.equal(stageProgress(78000), 100);
  assert.equal(stageProgress(999999), 100);
  for (let xp = 0; xp <= 60000; xp += 37) {
    const p = stageProgress(xp);
    assert.ok(p >= 0 && p <= 100, `xp ${xp} -> ${p}`);
  }
});

test('every sub-level has a simple story (title, teaser, won, next, when); Ambuya, never Mbuya or Vuma', () => {
  assert.equal(STORIES.length, 115);
  for (const s of VUMA_STAGES) for (let k = 1; k <= 5; k++) {
    const st = storyFor(s.stage, k);
    assert.ok(st && st.title && st.teaser && st.won && st.next && st.when, `${s.stage}.${k}`);
    assert.ok(!/\bMbuya|\bVuma\b/.test(st.title + st.teaser + st.won + st.next), `${s.stage}.${k}`);
    assert.ok(st.teaser.length <= 40 && st.when.length <= 24, `${s.stage}.${k} fits its bar`);
  }
  assert.equal(storyFor(1, 1).title, 'The Bottle Ball');
  assert.equal(storyFor(23, 5).title, 'A Legacy Begins');
  assert.equal(storyFor(24, 1), null);
  assert.ok(STORIES.some(s => /Ambuya/.test(s.won + s.next)));
});

test('every banner and avatar file exists under public/', () => {
  for (const s of VUMA_STAGES) {
    const nn = String(s.stage).padStart(2, '0');
    assert.equal(s.banner, `/vuma/banner-${nn}.jpg`);
    assert.equal(s.avatar, `/vuma/avatar-${nn}.jpg`);
    assert.equal(s.hero, `/vuma/hero-${nn}.jpg`);
    assert.ok(existsSync(path.join(PUBLIC, s.hero)), s.hero);
    assert.ok(existsSync(path.join(PUBLIC, s.banner)), s.banner);
    assert.ok(existsSync(path.join(PUBLIC, s.avatar)), s.avatar);
  }
});

test('every stage has a level name; 1 = Village Football, 5 = Village League, 23 = International League Legend', async () => {
  const { stageDescription, nextStageLabel } = await import('../lib/vuma/stages.mjs');
  for (const s of VUMA_STAGES) assert.ok(s.title, `stage ${s.stage} needs a level name`);
  assert.equal(stageDescription(VUMA_STAGES[0]), 'Village Football');
  assert.equal(VUMA_STAGES[1].title, 'Street Hero');
  assert.equal(VUMA_STAGES[4].title, 'Village League');
  assert.equal(VUMA_STAGES[22].title, 'International League Legend');
  assert.equal(VUMA_STAGES[11].title, 'Professional League');
  assert.equal(nextStageLabel(VUMA_STAGES[0], VUMA_STAGES[1]), 'Street Hero');
  assert.equal(nextStageLabel(VUMA_STAGES[15], VUMA_STAGES[16]), 'level 17'); // name repeats
  assert.equal(nextStageLabel(VUMA_STAGES[22], null), '');
});
