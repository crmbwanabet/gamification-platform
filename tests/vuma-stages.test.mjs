import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VUMA_STAGES, getStage, getNextStage, stageProgress } from '../lib/vuma/stages.mjs';
import { SEASON_DEFAULTS, MAX_STAGE } from '../lib/season/config.mjs';
import { readFileSync } from 'node:fs';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

test('19 stages numbered 1..19, thresholds strictly increasing from 0', () => {
  assert.equal(VUMA_STAGES.length, 19);
  assert.equal(VUMA_STAGES[0].xp, 0);
  VUMA_STAGES.forEach((s, i) => {
    assert.equal(s.stage, i + 1);
    if (i > 0) assert.ok(s.xp > VUMA_STAGES[i - 1].xp, `stage ${s.stage} threshold must rise`);
  });
  assert.equal(VUMA_STAGES[18].xp, 50000);
});

test('season thresholds (19 stages, 2026-10-19): first club and the abroad stages keep their XP', () => {
  assert.deepEqual(VUMA_STAGES.map(s => s.xp), [0, 50, 200, 500, 900, 1400, 2100, 3000, 4800, 7000, 9600, 12600, 16000, 19800, 24000, 28600, 33600, 39000, 50000]);
  assert.equal(VUMA_STAGES[7].name, 'Kafue Gaels FC', 'stage 8 = first pro club, league matches');
  assert.equal(VUMA_STAGES[17].name, 'Manchester Metropolis', 'stage 18 unlocks the World Cup');
  assert.equal(VUMA_STAGES[11].name, 'Shaka Chiefs');
  assert.equal(SEASON_DEFAULTS.league.unlockStage, 8);
  assert.equal(SEASON_DEFAULTS.worldCup.unlockStage, 18);
  assert.equal(MAX_STAGE, VUMA_STAGES.length);
});

test('11 Zambian locations, each with a club from stage 2; no Kapiri Mposhi', () => {
  assert.deepEqual(VUMA_STAGES.slice(0, 11).map(s => s.place), ['The village', 'Small town', 'Town', 'Big town compound', 'Big town suburb',
    'City compound', 'City suburb', 'Lusaka compound', 'Lusaka compound', 'Lusaka suburb', 'Lusaka suburb']);
  assert.equal(VUMA_STAGES[1].club, 'Copperbelt Football Academy');
  for (const s of VUMA_STAGES.slice(1)) assert.ok(s.club, `stage ${s.stage} needs a club`);
  assert.ok(!VUMA_STAGES.some(s => /kapiri/i.test(s.place + s.club)));
});

test('name = club || place; deliberate club spellings kept', () => {
  assert.equal(VUMA_STAGES[0].name, 'The village');
  assert.equal(VUMA_STAGES[16].name, 'Manchester Union');
  assert.equal(VUMA_STAGES[18].name, 'Doha Dam SC');
  for (const s of VUMA_STAGES) assert.equal(s.name, s.club || s.place);
});

test('level-up coins: one row per stage 2..19, same 17,400 total', () => {
  // platform.js imports extensionless modules (Next-only), so read its LEVEL_REWARDS table as text
  const src = readFileSync(path.join(PUBLIC, '..', 'lib', 'data', 'platform.js'), 'utf8');
  const block = src.slice(src.indexOf('export const LEVEL_REWARDS = {'), src.indexOf('};', src.indexOf('export const LEVEL_REWARDS = {')));
  const LEVEL_REWARDS = Object.fromEntries([...block.matchAll(/^\s+(\d+): \{ kwacha: (\d+) \}/gm)].map(m => [m[1], { kwacha: Number(m[2]) }]));
  assert.deepEqual(Object.keys(LEVEL_REWARDS).map(Number), VUMA_STAGES.slice(1).map(s => s.stage));
  assert.equal(Object.values(LEVEL_REWARDS).reduce((t, r) => t + r.kwacha, 0), 17400);
});

test('getStage at boundaries', () => {
  assert.equal(getStage(0).stage, 1);
  assert.equal(getStage(49).stage, 1);
  assert.equal(getStage(50).stage, 2);
  assert.equal(getStage(2999).stage, 7);
  assert.equal(getStage(3000).stage, 8);
  assert.equal(getStage(38999).stage, 17);
  assert.equal(getStage(39000).stage, 18);
  assert.equal(getStage(49999).stage, 18);
  assert.equal(getStage(50000).stage, 19);
  assert.equal(getStage(999999).stage, 19);
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
  assert.equal(getNextStage(50).stage, 3);
  assert.equal(getNextStage(49999).stage, 19);
  assert.equal(getNextStage(50000), null);
  assert.equal(getNextStage(1e9), null);
});

test('stageProgress stays within 0..100', () => {
  assert.equal(stageProgress(0), 0);
  assert.equal(stageProgress(25), 50);
  assert.equal(stageProgress(50), 0);
  assert.equal(stageProgress(125), 50);
  assert.equal(stageProgress(50000), 100);
  assert.equal(stageProgress(999999), 100);
  for (let xp = 0; xp <= 60000; xp += 37) {
    const p = stageProgress(xp);
    assert.ok(p >= 0 && p <= 100, `xp ${xp} -> ${p}`);
  }
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

test('every stage has a level name; stage 1 = Village Football, stage 2 = Street Hero, 19 = International League Legend', async () => {
  const { stageDescription, nextStageLabel } = await import('../lib/vuma/stages.mjs');
  for (const s of VUMA_STAGES) assert.ok(s.title, `stage ${s.stage} needs a level name`);
  assert.equal(stageDescription(VUMA_STAGES[0]), 'Village Football');
  assert.equal(VUMA_STAGES[1].title, 'Street Hero');
  assert.equal(VUMA_STAGES[18].title, 'International League Legend');
  assert.equal(VUMA_STAGES[7].title, 'Professional League');
  assert.equal(nextStageLabel(VUMA_STAGES[0], VUMA_STAGES[1]), 'Street Hero');
  assert.equal(nextStageLabel(VUMA_STAGES[11], VUMA_STAGES[12]), 'stage 13'); // name repeats
  assert.equal(nextStageLabel(VUMA_STAGES[18], null), '');
});
