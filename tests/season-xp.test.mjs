import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays, weekStart, crmDayXp, platformDayXp, computeSeasonXp, cumAt, xpBetween, reachDay,
  stageReachDay, maxPlatformDays, msUntilDayEnd, cleanActivityRow,
} from '../lib/season/xp.mjs';
import { SEASON_DEFAULTS, cleanSeasonConfig } from '../lib/season/config.mjs';

const MON = '2026-10-05'; // a Monday
const row = (day, o = {}) => ({ day, deposits_amount: 0, deposits_count: 0, withdrawals_amount: 0, casino_stake: 0, casino_rounds: 0, sports_stake: 0, sports_slips: 0, ...o });

test('date helpers: addDays, weekStart (Mon–Sun)', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(weekStart(MON), MON);
  assert.equal(weekStart('2026-10-09'), MON, 'Friday');
  assert.equal(weekStart('2026-10-11'), MON, 'Sunday belongs to the week that started Monday');
  assert.equal(weekStart('2026-10-12'), '2026-10-12');
});

test('crmDayXp: casino / sports / deposit-day XP', () => {
  assert.equal(crmDayXp(null), 0);
  assert.equal(crmDayXp(row(MON, { casino_stake: 125 })), 12);
  assert.equal(crmDayXp(row(MON, { sports_stake: 10 })), 2);
  assert.equal(crmDayXp(row(MON, { casino_stake: 125, sports_stake: 10, deposits_count: 1, deposits_amount: 50 })), 44);
  assert.equal(crmDayXp(row(MON, { casino_stake: 29.99 })), 2);
  assert.equal(crmDayXp(row(MON, { casino_stake: 30 })), 3);
  assert.equal(crmDayXp(row(MON, { casino_stake: 0.1 + 0.2 + 29.7 })), 3, 'float noise never loses a point');
  assert.equal(crmDayXp(row(MON, { casino_stake: '40' })), 4, 'numeric strings (Postgres numeric) count');
  assert.equal(crmDayXp(row(MON, { casino_stake: -50, sports_stake: 'x' })), 0);
});

test('crmDayXp: the deposit 30 is skipped on a pure deposit-withdraw day', () => {
  assert.equal(crmDayXp(row(MON, { deposits_count: 1, deposits_amount: 100, withdrawals_amount: 100 })), 0);
  assert.equal(crmDayXp(row(MON, { deposits_count: 1, deposits_amount: 100, withdrawals_amount: 150 })), 0);
  assert.equal(crmDayXp(row(MON, { deposits_count: 1, deposits_amount: 100, withdrawals_amount: 99.99 })), 30);
  assert.equal(crmDayXp(row(MON, { deposits_count: 1, deposits_amount: 100, withdrawals_amount: 100, casino_stake: 10 })), 31, 'staked: the deposit counts');
  assert.equal(crmDayXp(row(MON, { deposits_count: 0, deposits_amount: 100 })), 0, 'no deposit count, no bonus');
});

test('platformDayXp: sum of sources, casino dropped on feed days, capped 60', () => {
  assert.equal(platformDayXp({ daily: 20, games: 10, missions: 10, casino: 5 }), 45);
  assert.equal(platformDayXp({ daily: 20, games: 10, missions: 10, casino: 5 }, true), 40);
  assert.equal(platformDayXp({ daily: 20, games: 60, missions: 75, casino: 60 }), 60);
  assert.equal(platformDayXp(500), 60);
  assert.equal(platformDayXp(25), 25);
  assert.equal(platformDayXp(null), 0);
  assert.equal(platformDayXp({ daily: -20, games: 'x' }), 0);
});

test('daily cap 400: excess is overflow', () => {
  const s = computeSeasonXp({ rows: [row(MON, { casino_stake: 5000 })], platform: { [MON]: { daily: 20, games: 40 } } });
  assert.equal(s.days.length, 1);
  const d = s.days[0];
  assert.equal(d.crmXp, 500);
  assert.equal(d.platformXp, 60);
  assert.equal(d.raw, 560);
  assert.equal(d.xp, 400);
  assert.equal(d.overflow, 160);
  assert.equal(s.xp, 400);
  assert.equal(s.overflow, 160);
});

test('weekly cap 2,000 (Mon–Sun): later days overflow, next Monday resets', () => {
  const rows = [];
  for (let i = 0; i < 8; i++) rows.push(row(addDays(MON, i), { casino_stake: 4000 })); // 400 a day
  const s = computeSeasonXp({ rows });
  assert.deepEqual(s.days.map(d => d.xp), [400, 400, 400, 400, 400, 0, 0, 400]);
  assert.deepEqual(s.days.map(d => d.overflow), [0, 0, 0, 0, 0, 400, 400, 0]);
  assert.equal(s.xp, 2400);
  assert.equal(s.overflow, 800);
  // partial room
  const s2 = computeSeasonXp({ rows: [row(MON, { casino_stake: 4000 }), row(addDays(MON, 1), { casino_stake: 4000 }), row(addDays(MON, 2), { casino_stake: 4000 }), row(addDays(MON, 3), { casino_stake: 4000 }), row(addDays(MON, 4), { casino_stake: 3500 }), row(addDays(MON, 5), { casino_stake: 1000 })] });
  assert.deepEqual(s2.days.map(d => d.xp), [400, 400, 400, 400, 350, 50]);
  assert.equal(s2.days[5].overflow, 50);
});

test('season XP merges CRM rows and platform days; casino-rounds XP only on days without a feed row', () => {
  const s = computeSeasonXp({
    rows: [row(MON, { sports_stake: 40 })],
    platform: { [MON]: { daily: 20, casino: 30 }, [addDays(MON, 1)]: { daily: 20, casino: 30 } },
  });
  assert.deepEqual(s.days.map(d => [d.day, d.crmXp, d.platformXp, d.xp, d.hasFeed]), [
    [MON, 10, 20, 30, true],
    [addDays(MON, 1), 0, 50, 50, false],
  ]);
  assert.equal(s.xp, 80);
  assert.equal(s.feedDays, 1);
  assert.deepEqual(s.days.map(d => d.cumXp), [30, 80]);
});

test('filters: today, startDay, junk days; duplicate feed days keep the max per column', () => {
  const rows = [row(MON, { casino_stake: 100 }), row(MON, { casino_stake: 50, sports_stake: 40 }), row(addDays(MON, 3), { casino_stake: 1000 }), { day: 'nope', casino_stake: 1 }, null];
  const s = computeSeasonXp({ rows, platform: { junk: 50, __proto__day: 5 }, today: addDays(MON, 2) });
  assert.deepEqual(s.days.map(d => [d.day, d.xp]), [[MON, 20]]);
  const cfg = cleanSeasonConfig({ startDay: addDays(MON, 1) });
  assert.deepEqual(computeSeasonXp({ rows, cfg }).days.map(d => d.day), [addDays(MON, 3)]);
  assert.equal(cleanActivityRow({ day: MON, casino_stake: '12.5' }).casino_stake, 12.5);
});

test('deterministic: order of rows does not matter', () => {
  const rows = [];
  for (let i = 0; i < 20; i++) rows.push(row(addDays(MON, i), { casino_stake: (i * 733) % 5000, sports_stake: (i * 97) % 300, deposits_count: i % 3 === 0 ? 1 : 0, deposits_amount: 100 }));
  const a = computeSeasonXp({ rows });
  const b = computeSeasonXp({ rows: [...rows].reverse() });
  assert.deepEqual(a, b);
});

test('cumAt / xpBetween / reachDay / stageReachDay', () => {
  const rows = [];
  for (let i = 0; i < 10; i++) rows.push(row(addDays(MON, i), { casino_stake: 1000 })); // 100 a day
  const s = computeSeasonXp({ rows });
  assert.equal(cumAt(s, addDays(MON, -1)), 0);
  assert.equal(cumAt(s, MON), 100);
  assert.equal(cumAt(s, addDays(MON, 4)), 500);
  assert.equal(cumAt(s, '2030-01-01'), 1000);
  assert.equal(xpBetween(s, addDays(MON, 2), addDays(MON, 4)), 300);
  assert.equal(reachDay(s, 300), addDays(MON, 2));
  assert.equal(reachDay(s, 5000), null);
  assert.equal(stageReachDay(s, 2), MON, 'stage 2 at 50 XP');
  assert.equal(stageReachDay(s, 3), addDays(MON, 2), 'stage 3 at 300 XP');
  assert.equal(stageReachDay(s, 4), addDays(MON, 7), 'stage 4 at 800 XP');
});

test('maxPlatformDays: the cap for every day in range', () => {
  const m = maxPlatformDays(MON, addDays(MON, 2));
  assert.deepEqual(m, { [MON]: 60, [addDays(MON, 1)]: 60, [addDays(MON, 2)]: 60 });
  assert.deepEqual(maxPlatformDays(addDays(MON, 2), MON), {});
});

test('msUntilDayEnd: Lusaka midnight is 22:00 UTC', () => {
  const now = Date.parse(`${MON}T20:00:00Z`); // 22:00 in Lusaka
  assert.equal(msUntilDayEnd(MON, now), 2 * 3600000);
  assert.equal(msUntilDayEnd(addDays(MON, 1), now), 26 * 3600000);
  assert.equal(msUntilDayEnd(addDays(MON, -1), now), 0);
});

test('defaults are the agreed numbers', () => {
  assert.equal(SEASON_DEFAULTS.platformDailyCap, 60);
  assert.equal(SEASON_DEFAULTS.dailyCap, 400);
  assert.equal(SEASON_DEFAULTS.weeklyCap, 2000);
  assert.deepEqual(SEASON_DEFAULTS.crm, { casinoStakePerXp: 10, sportsStakePerXp: 4, depositDayXp: 30 });
});
