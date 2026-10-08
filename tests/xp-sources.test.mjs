import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_LOGIN_XP, GAME_XP_DAILY_CAP, CASINO_XP_DAILY_CAP, MISSION_XP,
  gameXp, addGameXp, refundGameXp, casinoXp, xpTodayFor, xpSourceLines,
} from '../lib/xp/sources.mjs';
import { CASINO_MISSIONS } from '../lib/missions/casino.mjs';
import { applyMissionOverrides } from '../lib/config/missions.mjs';

const D1 = '2026-10-08';
const D2 = '2026-10-09';

test('constants', () => {
  assert.equal(DAILY_LOGIN_XP, 20);
  assert.equal(GAME_XP_DAILY_CAP, 500);
  assert.equal(CASINO_XP_DAILY_CAP, 300);
});

test('gameXp: 1 XP per coin staked, capped at 500 a day', () => {
  assert.equal(gameXp(10, 0), 10);
  assert.equal(gameXp(50, 400), 50);
  assert.equal(gameXp(50, 480), 20, 'partial award at the cap boundary');
  assert.equal(gameXp(50, 500), 0);
  assert.equal(gameXp(50, 9999), 0);
  assert.equal(gameXp(0, 0), 0);
  assert.equal(gameXp(undefined, 0), 0);
  assert.equal(gameXp(-5, 0), 0);
  assert.equal(gameXp(NaN, 0), 0);
  assert.equal(gameXp(2.9, 0), 2, 'whole XP only');
});

test('addGameXp: tallies per day and rolls over', () => {
  let t = null;
  let r = addGameXp(t, 25, D1);
  assert.deepEqual(r, { xp: 25, xpToday: { day: D1, games: 25, casino: 0 } });
  t = { day: D1, games: 490, casino: 40 };
  r = addGameXp(t, 50, D1);
  assert.deepEqual(r, { xp: 10, xpToday: { day: D1, games: 500, casino: 40 } });
  r = addGameXp(r.xpToday, 50, D1);
  assert.equal(r.xp, 0);
  // next day: fresh allowance, casino tally reset too
  r = addGameXp(r.xpToday, 50, D2);
  assert.deepEqual(r, { xp: 50, xpToday: { day: D2, games: 50, casino: 0 } });
  // junk state counts as a fresh day
  assert.deepEqual(xpTodayFor('junk', D1), { day: D1, games: 0, casino: 0 });
  assert.deepEqual(xpTodayFor({ day: D1, games: -3, casino: 'x' }, D1), { day: D1, games: 0, casino: 0 });
});

test('refundGameXp: takes back the void stake, never below 0, not across days', () => {
  assert.deepEqual(refundGameXp({ day: D1, games: 60, casino: 5 }, 25, D1), { xp: 25, xpToday: { day: D1, games: 35, casino: 5 } });
  assert.deepEqual(refundGameXp({ day: D1, games: 10, casino: 0 }, 25, D1), { xp: 10, xpToday: { day: D1, games: 0, casino: 0 } });
  assert.equal(refundGameXp({ day: D1, games: 60, casino: 0 }, 25, D2).xp, 0);
});

test('casinoXp: delta since last credited', () => {
  const r = casinoXp({ day: D1, rounds: 40 }, null, null);
  assert.deepEqual(r, { xp: 40, credited: { day: D1, rounds: 40 }, xpToday: { day: D1, games: 0, casino: 40 } });
  const r2 = casinoXp({ day: D1, rounds: 65 }, r.credited, r.xpToday);
  assert.deepEqual(r2, { xp: 25, credited: { day: D1, rounds: 65 }, xpToday: { day: D1, games: 0, casino: 65 } });
});

test('casinoXp: re-fetching the same count is idempotent', () => {
  const credited = { day: D1, rounds: 40 };
  const today = { day: D1, games: 7, casino: 40 };
  const r = casinoXp({ day: D1, rounds: 40 }, credited, today);
  assert.equal(r.xp, 0);
  assert.equal(r.credited, credited, 'same object: no state change');
  assert.equal(r.xpToday, today);
});

test('casinoXp: a lower count never goes negative or lowers credited', () => {
  const r = casinoXp({ day: D1, rounds: 10 }, { day: D1, rounds: 40 }, { day: D1, games: 0, casino: 40 });
  assert.equal(r.xp, 0);
  assert.deepEqual(r.credited, { day: D1, rounds: 40 });
  assert.deepEqual(r.xpToday, { day: D1, games: 0, casino: 40 });
});

test('casinoXp: day rollover treats credited rounds as 0', () => {
  const r = casinoXp({ day: D2, rounds: 15 }, { day: D1, rounds: 250 }, { day: D1, games: 300, casino: 250 });
  assert.deepEqual(r, { xp: 15, credited: { day: D2, rounds: 15 }, xpToday: { day: D2, games: 0, casino: 15 } });
});

test('casinoXp: capped at 300 a day; rounds past the cap are marked converted', () => {
  const r = casinoXp({ day: D1, rounds: 1000 }, null, null);
  assert.equal(r.xp, 300);
  assert.deepEqual(r.credited, { day: D1, rounds: 1000 });
  const r2 = casinoXp({ day: D1, rounds: 280 }, { day: D1, rounds: 250 }, { day: D1, games: 0, casino: 290 });
  assert.equal(r2.xp, 10, 'partial award at the cap boundary');
  const r3 = casinoXp({ day: D1, rounds: 1200 }, r.credited, r.xpToday);
  assert.equal(r3.xp, 0);
});

test('casinoXp: failed fetch / stale day changes nothing', () => {
  const credited = { day: D2, rounds: 5 };
  const today = { day: D2, games: 0, casino: 5 };
  for (const p of [null, undefined, {}, { rounds: 50 }, { day: D1, rounds: 50 }]) {
    const r = casinoXp(p, credited, today);
    assert.equal(r.xp, 0);
    assert.equal(r.credited, credited);
    assert.equal(r.xpToday, today);
  }
});

test('mission XP: Starter 20, Regular 50, Pro 100, Legend 200', () => {
  assert.deepEqual(CASINO_MISSIONS.map(m => [m.id, m.xp]), [
    ['casino_starter', 20], ['casino_regular', 50], ['casino_pro', 100], ['casino_legend', 200],
  ]);
  for (const m of CASINO_MISSIONS) assert.equal(m.xp, MISSION_XP[m.id]);
});

test('mission overrides keep XP unless they set it', () => {
  const out = applyMissionOverrides(CASINO_MISSIONS, {
    casino_starter: { reward: { emeralds: 1 } },
    casino_regular: { target: 60 },
    casino_pro: { xp: 150 },
    casino_legend: { xp: 0 },
  });
  const by = Object.fromEntries(out.map(m => [m.id, m]));
  assert.equal(by.casino_starter.xp, 20);
  assert.equal(by.casino_regular.xp, 50);
  assert.equal(by.casino_pro.xp, 150);
  assert.equal(by.casino_legend.xp, 0, 'an explicit 0 removes the XP');
  assert.equal(applyMissionOverrides(CASINO_MISSIONS, { casino_pro: { xp: 'lots' } }).find(m => m.id === 'casino_pro').xp, 100);
});

test('xpSourceLines reflect the constants', () => {
  const lines = xpSourceLines().map(l => l.text);
  assert.deepEqual(lines, [
    '1 XP per coin staked (up to 500 a day)',
    '1 XP per round (up to 300 a day)',
    '20 to 200 XP',
    '20 XP',
  ]);
});
