import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VUMA_STAGES, getStage, getNextStage, stageProgress } from '../lib/vuma/stages.mjs';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

test('17 stages numbered 1..17, thresholds strictly increasing from 0', () => {
  assert.equal(VUMA_STAGES.length, 17);
  assert.equal(VUMA_STAGES[0].xp, 0);
  VUMA_STAGES.forEach((s, i) => {
    assert.equal(s.stage, i + 1);
    if (i > 0) assert.ok(s.xp > VUMA_STAGES[i - 1].xp, `stage ${s.stage} threshold must rise`);
  });
  assert.equal(VUMA_STAGES[16].xp, 50000);
});

test('season thresholds (2026-10-09)', () => {
  assert.deepEqual(VUMA_STAGES.map(s => s.xp), [0, 50, 300, 800, 1600, 3000, 4800, 7000, 9600, 12600, 16000, 19800, 24000, 28600, 33600, 39000, 50000]);
  assert.equal(VUMA_STAGES[15].name, 'Manchester Metropolis', 'stage 16 unlocks the World Cup');
  assert.equal(VUMA_STAGES[9].name, 'Shaka Chiefs', 'renamed from Emperor Chiefs 2026-10-09');
});

test('name = club || place; deliberate club spellings kept', () => {
  assert.equal(VUMA_STAGES[0].name, 'The village');
  assert.equal(VUMA_STAGES[4].name, 'Chelstone academy');
  assert.equal(VUMA_STAGES[5].name, 'Kafue Gaels FC');
  assert.equal(VUMA_STAGES[14].name, 'Manchester Union');
  assert.equal(VUMA_STAGES[16].name, 'Doha Dam SC');
  for (const s of VUMA_STAGES) assert.equal(s.name, s.club || s.place);
});

test('getStage at boundaries', () => {
  assert.equal(getStage(0).stage, 1);
  assert.equal(getStage(49).stage, 1);
  assert.equal(getStage(50).stage, 2);
  assert.equal(getStage(2999).stage, 5);
  assert.equal(getStage(3000).stage, 6);
  assert.equal(getStage(38999).stage, 15);
  assert.equal(getStage(39000).stage, 16);
  assert.equal(getStage(49999).stage, 16);
  assert.equal(getStage(50000).stage, 17);
  assert.equal(getStage(999999).stage, 17);
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
  assert.equal(getNextStage(49999).stage, 17);
  assert.equal(getNextStage(50000), null);
  assert.equal(getNextStage(1e9), null);
});

test('stageProgress stays within 0..100', () => {
  assert.equal(stageProgress(0), 0);
  assert.equal(stageProgress(25), 50);
  assert.equal(stageProgress(50), 0);
  assert.equal(stageProgress(175), 50);
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
