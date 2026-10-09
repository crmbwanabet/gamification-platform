import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSeasonXp, addDays } from '../lib/season/xp.mjs';
import { hustleLevelFor, hustleState, collectHustle, hustleImage } from '../lib/season/hustle.mjs';
import { SEASON_DEFAULTS } from '../lib/season/config.mjs';

const MON = '2026-10-05';
const row = (day, casino_stake) => ({ day, casino_stake });

test('levels: names, stock thresholds, pay', () => {
  assert.deepEqual(SEASON_DEFAULTS.hustle.levels.map(l => [l.level, l.name, l.stock, l.pay]), [
    [1, 'Washing cars in the compound', 0, 20],
    [2, 'Kantemba', 1000, 50],
    [3, "Vuma's Car Wash", 3000, 100],
    [4, 'Minibus', 7000, 200],
    [5, 'Vuma Mart', 15000, 400],
  ]);
  assert.equal(hustleLevelFor(0).level, 1);
  assert.equal(hustleLevelFor(999).level, 1);
  assert.equal(hustleLevelFor(1000).level, 2);
  assert.equal(hustleLevelFor(14999).level, 4);
  assert.equal(hustleLevelFor(15000).level, 5);
  assert.equal(hustleLevelFor(1e9).level, 5);
  assert.equal(hustleImage(3), '/vuma/hustle-3.jpg');
});

test('locked until stage 2 (50 XP)', () => {
  const s = computeSeasonXp({ platform: { [MON]: { daily: 20, games: 29 } } });
  const h = hustleState({ season: s, hustle: null, today: MON });
  assert.equal(h.unlocked, false);
  assert.equal(h.ready, 0);
  assert.equal(collectHustle(h, null, MON), null);
});

test('first visit unlocks: 20 coins today, collect once a day', () => {
  const s = computeSeasonXp({ platform: { [MON]: { daily: 20, games: 30 } } });
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
  const s = computeSeasonXp({ platform: { [MON]: { daily: 20, games: 30 } } });
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
  assert.equal(h.level.level, 2, 'Kantemba at 1,000 stock');
  assert.equal(h.toNext, 3000 - 1920);
  assert.equal(h.ready, 50 + 50, 'Sat (1,360 stock) and Sun both pay Kantemba');
  const h2 = hustleState({ season: s, hustle: { lastCollectDay: addDays(MON, 3) }, today: addDays(MON, 5) });
  // Fri stock 800 -> level 1 (20), Sat stock 1,360 -> level 2 (50)
  assert.equal(h2.ready, 70);
});

test('a lastCollectDay in the future (clock skew) pays nothing', () => {
  const s = computeSeasonXp({ platform: { [MON]: { daily: 20, games: 30 } } });
  const h = hustleState({ season: s, hustle: { lastCollectDay: addDays(MON, 3) }, today: MON });
  assert.equal(h.ready, 0);
});
