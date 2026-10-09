import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAILY_LOGIN_XP, GAME_XP_DAILY_CAP, CASINO_XP_DAILY_CAP, PLATFORM_XP_DAILY_CAP, MISSION_XP,
  gameXp, addGameXp, refundGameXp, casinoXp, xpTodayFor, xpSourceLines,
  addDailyXp, addMissionXp, recordXpDay, platformXpOf,
} from '../lib/xp/sources.mjs';
import { CASINO_MISSIONS } from '../lib/missions/casino.mjs';
import { applyMissionOverrides } from '../lib/config/missions.mjs';

const D1 = '2026-10-08';
const D2 = '2026-10-09';
const T = (o) => ({ daily: 0, games: 0, missions: 0, casino: 0, ...o });

test('constants (season retune 2026-10-09: platform XP capped 60 a day)', () => {
  assert.equal(DAILY_LOGIN_XP, 20);
  assert.equal(PLATFORM_XP_DAILY_CAP, 60);
  assert.equal(GAME_XP_DAILY_CAP, 60);
  assert.equal(CASINO_XP_DAILY_CAP, 60);
});

test('gameXp: 1 XP per coin staked, capped at 60 a day', () => {
  assert.equal(gameXp(10, 0), 10);
  assert.equal(gameXp(5, 50), 5);
  assert.equal(gameXp(50, 40), 20, 'partial award at the cap boundary');
  assert.equal(gameXp(50, 60), 0);
  assert.equal(gameXp(50, 9999), 0);
  assert.equal(gameXp(0, 0), 0);
  assert.equal(gameXp(undefined, 0), 0);
  assert.equal(gameXp(-5, 0), 0);
  assert.equal(gameXp(NaN, 0), 0);
  assert.equal(gameXp(2.9, 0), 2, 'whole XP only');
});

test('addGameXp: tallies per day and rolls over', () => {
  let r = addGameXp(null, 25, D1);
  assert.deepEqual(r, { xp: 25, xpToday: { day: D1, ...T({ games: 25 }) } });
  r = addGameXp({ day: D1, games: 50, casino: 40 }, 50, D1);
  assert.deepEqual(r, { xp: 10, xpToday: { day: D1, ...T({ games: 60, casino: 40 }) } });
  r = addGameXp(r.xpToday, 50, D1);
  assert.equal(r.xp, 0);
  r = addGameXp(r.xpToday, 50, D2);
  assert.deepEqual(r, { xp: 50, xpToday: { day: D2, ...T({ games: 50 }) } });
  assert.deepEqual(xpTodayFor('junk', D1), { day: D1, ...T() });
  assert.deepEqual(xpTodayFor({ day: D1, games: -3, casino: 'x', daily: 20, missions: 2.5 }, D1), { day: D1, ...T({ daily: 20, missions: 2 }) });
});

test('refundGameXp: takes back the void stake, never below 0, not across days', () => {
  assert.deepEqual(refundGameXp({ day: D1, games: 60, casino: 5 }, 25, D1), { xp: 25, xpToday: { day: D1, ...T({ games: 35, casino: 5 }) } });
  assert.deepEqual(refundGameXp({ day: D1, games: 10 }, 25, D1), { xp: 10, xpToday: { day: D1, ...T() } });
  assert.equal(refundGameXp({ day: D1, games: 60 }, 25, D2).xp, 0);
});

test('addDailyXp: 20 XP once a day', () => {
  const r = addDailyXp(null, D1);
  assert.deepEqual(r, { xp: 20, xpToday: { day: D1, ...T({ daily: 20 }) } });
  assert.equal(addDailyXp(r.xpToday, D1).xp, 0, 'second claim the same day adds nothing');
  assert.equal(addDailyXp(r.xpToday, D2).xp, 20);
});

test('addMissionXp: adds to the missions tally', () => {
  let r = addMissionXp(null, 10, D1);
  r = addMissionXp(r.xpToday, 15, D1);
  assert.deepEqual(r, { xp: 15, xpToday: { day: D1, ...T({ missions: 25 }) } });
  assert.equal(addMissionXp(r.xpToday, -5, D1).xp, 0);
  assert.equal(platformXpOf({ daily: 20, games: 30, missions: 25, casino: 10 }), 85);
});

test('casinoXp: delta since last credited', () => {
  const r = casinoXp({ day: D1, rounds: 40 }, null, null);
  assert.deepEqual(r, { xp: 40, credited: { day: D1, rounds: 40 }, xpToday: { day: D1, ...T({ casino: 40 }) } });
  const r2 = casinoXp({ day: D1, rounds: 55 }, r.credited, r.xpToday);
  assert.deepEqual(r2, { xp: 15, credited: { day: D1, rounds: 55 }, xpToday: { day: D1, ...T({ casino: 55 }) } });
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
  const r = casinoXp({ day: D1, rounds: 10 }, { day: D1, rounds: 40 }, { day: D1, casino: 40 });
  assert.equal(r.xp, 0);
  assert.deepEqual(r.credited, { day: D1, rounds: 40 });
});

test('casinoXp: day rollover treats credited rounds as 0', () => {
  const r = casinoXp({ day: D2, rounds: 15 }, { day: D1, rounds: 250 }, { day: D1, games: 30, casino: 60 });
  assert.deepEqual(r, { xp: 15, credited: { day: D2, rounds: 15 }, xpToday: { day: D2, ...T({ casino: 15 }) } });
});

test('casinoXp: capped at 60 a day; rounds past the cap are marked converted', () => {
  const r = casinoXp({ day: D1, rounds: 1000 }, null, null);
  assert.equal(r.xp, 60);
  assert.deepEqual(r.credited, { day: D1, rounds: 1000 });
  const r2 = casinoXp({ day: D1, rounds: 280 }, { day: D1, rounds: 250 }, { day: D1, casino: 50 });
  assert.equal(r2.xp, 10, 'partial award at the cap boundary');
  assert.equal(casinoXp({ day: D1, rounds: 1200 }, r.credited, r.xpToday).xp, 0);
});

test('casinoXp: failed fetch / stale day changes nothing', () => {
  const credited = { day: D2, rounds: 5 };
  const today = { day: D2, casino: 5 };
  for (const p of [null, undefined, {}, { rounds: 50 }, { day: D1, rounds: 50 }]) {
    const r = casinoXp(p, credited, today);
    assert.equal(r.xp, 0);
    assert.equal(r.credited, credited);
    assert.equal(r.xpToday, today);
  }
});

test('recordXpDay: copies the tally into the history, keeps the latest 400 days', () => {
  const t = { day: D1, daily: 20, games: 12 };
  const h = recordXpDay(null, t);
  assert.deepEqual(h, { [D1]: { daily: 20, games: 12, missions: 0, casino: 0 } });
  assert.equal(recordXpDay(h, t), h, 'unchanged tally returns the same object');
  const h2 = recordXpDay(h, { day: D2, missions: 10 });
  assert.deepEqual(Object.keys(h2), [D1, D2]);
  assert.equal(recordXpDay(h, { day: 'junk' }), h);
  const many = {};
  for (let i = 0; i < 5; i++) many[`2026-01-0${i + 1}`] = { daily: 1, games: 0, missions: 0, casino: 0 };
  const pruned = recordXpDay(many, { day: '2026-01-06', daily: 20 }, 3);
  assert.deepEqual(Object.keys(pruned).sort(), ['2026-01-04', '2026-01-05', '2026-01-06']);
});

test('mission XP: Starter 10, Regular 15, Pro 20, Legend 30', () => {
  assert.deepEqual(CASINO_MISSIONS.map(m => [m.id, m.xp]), [
    ['casino_starter', 10], ['casino_regular', 15], ['casino_pro', 20], ['casino_legend', 30],
  ]);
  for (const m of CASINO_MISSIONS) assert.equal(m.xp, MISSION_XP[m.id]);
});

test('mission overrides keep XP unless they set it', () => {
  const out = applyMissionOverrides(CASINO_MISSIONS, {
    casino_starter: { reward: { emeralds: 1 } },
    casino_regular: { target: 60 },
    casino_pro: { xp: 25 },
    casino_legend: { xp: 0 },
  });
  const by = Object.fromEntries(out.map(m => [m.id, m]));
  assert.equal(by.casino_starter.xp, 10);
  assert.equal(by.casino_regular.xp, 15);
  assert.equal(by.casino_pro.xp, 25);
  assert.equal(by.casino_legend.xp, 0, 'an explicit 0 removes the XP');
  assert.equal(applyMissionOverrides(CASINO_MISSIONS, { casino_pro: { xp: 'lots' } }).find(m => m.id === 'casino_pro').xp, 20);
});

test('xpSourceLines reflect the constants and the season config', () => {
  const lines = xpSourceLines().map(l => l.text);
  assert.deepEqual(lines, [
    '1 XP per K10 staked',
    '1 XP per K4 on settled slips (odds 1.5+)',
    '30 XP',
    'daily reward 20 XP, games 1 XP per coin, missions 10 to 30 XP (up to 60 a day)',
    "400 XP a day, 2,000 a week; extra XP stocks Vuma's side hustle",
  ]);
});
