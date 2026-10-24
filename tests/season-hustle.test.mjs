import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSeasonXp, addDays } from '../lib/season/xp.mjs';
import { hustleLevelFor, hustleState, collectHustle, hustleImage } from '../lib/season/hustle.mjs';
import { SEASON_DEFAULTS } from '../lib/season/config.mjs';

const MON = '2026-10-05';
const row = (day, casino_stake) => ({ day, casino_stake });

test('levels: names, stock thresholds, pay', () => {
  assert.deepEqual(SEASON_DEFAULTS.hustle.levels.map(l => [l.level, l.name, l.stock, l.pay]), [
    [1, 'Fried rat selling', 0, 20],
    [2, 'Car washing', 500, 40],
    [3, 'Chili bite trading', 1500, 60],
    [4, 'Wheelbarrow pushing', 3000, 90],
    [5, 'Tomato trading', 5000, 120],
    [6, 'Bus conducting', 7500, 160],
    [7, 'Bus driving', 10000, 200],
    [8, 'Salaula trading', 13000, 260],
    [9, 'Mobile money agent', 16500, 330],
    [10, 'Kapenta trading', 20000, 400],
  ]);
  assert.equal(hustleLevelFor(0).level, 1);
  assert.equal(hustleLevelFor(499).level, 1);
  assert.equal(hustleLevelFor(500).level, 2);
  assert.equal(hustleLevelFor(19999).level, 9);
  assert.equal(hustleLevelFor(20000).level, 10);
  assert.equal(hustleLevelFor(1e9).level, 10);
  assert.equal(hustleImage(2), '/vuma/hustle-1.jpg'); // car washing (temporary art map)
  for (let l = 1; l <= 10; l++) assert.match(hustleImage(l), /^\/vuma\/hustle-[1-5]\.jpg$/);
});

test('locked until stage 2 (100 XP)', () => {
  // 49 platform XP + 50 casino XP (K500 stake) = 99: one short
  const s = computeSeasonXp({ rows: [row(MON, 500)], platform: { [MON]: { daily: 20, games: 29 } } });
  const h = hustleState({ season: s, hustle: null, today: MON });
  assert.equal(h.unlocked, false);
  assert.equal(h.ready, 0);
  assert.equal(collectHustle(h, null, MON), null);
});

test('first visit unlocks: 20 coins today, collect once a day', () => {
  const s = computeSeasonXp({ rows: [row(MON, 500)], platform: { [MON]: { daily: 20, games: 30 } } }); // 50 casino + 50 platform = 100 XP
  const h = hustleState({ season: s, hustle: null, today: MON });
  assert.equal(h.unlocked, true);
  assert.equal(h.unlockDay, MON);
  assert.equal(h.ready, 20);
  assert.equal(h.pendingDays, 1);
  const c = collectHustle(h, null, MON);
  assert.deepEqual(c, { coins: 20, hustle: { lastCollectDay: MON, collected: 20 } });
  const again = hustleState({ season: s, hustle: c.hustle, today: MON });
  assert.equal(again.ready, 0);
  assert.equal(again.collectedToday, true);
  assert.equal(collectHustle(again, c.hustle, MON), null);
  // next day: one more day of pay
  const next = hustleState({ season: s, hustle: c.hustle, today: addDays(MON, 1) });
  assert.equal(next.ready, 20);
  assert.equal(next.closedDays, 0);
});

test('uncollected pay accrues for at most 2 days ("the shop was closed")', () => {
  const s = computeSeasonXp({ rows: [row(MON, 500)], platform: { [MON]: { daily: 20, games: 30 } } }); // 50 casino + 50 platform = 100 XP
  const h = hustleState({ season: s, hustle: { lastCollectDay: MON, collected: 20 }, today: addDays(MON, 6) });
  assert.equal(h.pendingDays, 6);
  assert.equal(h.paidDays, 2);
  assert.equal(h.closedDays, 4);
  assert.equal(h.ready, 40);
  // never collected since unlock 3 days ago
  const h2 = hustleState({ season: s, hustle: null, today: addDays(MON, 2) });
  assert.equal(h2.pendingDays, 3);
  assert.equal(h2.ready, 40);
});

test('stock = cumulative overflow; each paid day uses the level reached by that day', () => {
  // Week of 400/day capped at 2,000: Sat + Sun overflow 400 each, plus 160 daily overflow each day
  const rows = [];
  for (let i = 0; i < 7; i++) rows.push(row(addDays(MON, i), 5600)); // 560 raw a day
  const s = computeSeasonXp({ rows });
  // overflow: Mon..Fri 160 each = 800; Sat 560 -> 1360; Sun 560 -> 1920
  assert.equal(s.overflow, 1920);
  const h = hustleState({ season: s, hustle: { lastCollectDay: addDays(MON, 4) }, today: addDays(MON, 6) });
  assert.equal(h.level.level, 3, 'Chili bite trading at 1,500 stock');
  assert.equal(h.toNext, 3000 - 1920);
  assert.equal(h.ready, 40 + 60, 'Sat (1,360 stock) pays Car washing, Sun (1,920) Chili bite trading');
  const h2 = hustleState({ season: s, hustle: { lastCollectDay: addDays(MON, 3) }, today: addDays(MON, 5) });
  // Fri stock 800 -> level 2 (40), Sat stock 1,360 -> level 2 (40)
  assert.equal(h2.ready, 80);
});

test('a lastCollectDay in the future (clock skew) pays nothing', () => {
  const s = computeSeasonXp({ rows: [row(MON, 500)], platform: { [MON]: { daily: 20, games: 30 } } }); // 50 casino + 50 platform = 100 XP
  const h = hustleState({ season: s, hustle: { lastCollectDay: addDays(MON, 3) }, today: MON });
  assert.equal(h.ready, 0);
});
