import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../lib/season/xp.mjs';
import { verifyWorldCupPrize, clampClientPlatform, worldCupPrizeMessage } from '../lib/season/verify.mjs';
import { cleanSeasonConfig } from '../lib/season/config.mjs';
import { purchaseMessage } from '../lib/telegram/format.mjs';

const D0 = '2026-01-05';
const CFG = cleanSeasonConfig({ weeklyCap: 700000 });
const U = addDays(D0, 97);

function rowsFor(windows) {
  const rows = Array.from({ length: 98 }, (_, i) => ({ day: addDays(D0, i), casino_stake: 4000 }));
  windows.split('').forEach((w, i) => {
    const n = w === 'W' ? 5 : w === 'L' ? 1 : 0;
    for (let k = 0; k < n; k++) rows.push({ day: addDays(U, 1 + i * 6 + k), casino_stake: 4000 });
  });
  return rows;
}

test('a Final won on the feed rows verifies (platform XP at max 60/day)', () => {
  const v = verifyWorldCupPrize({ rows: rowsFor('WWWWWWWW'), cfg: CFG, today: addDays(U, 50) });
  assert.equal(v.won, true);
  assert.equal(v.method, 'max');
  assert.equal(v.summary.rounds.length, 8);
  assert.ok(v.summary.rounds.every(r => r.status === 'won'));
  assert.equal(v.summary.unlockDay, U);
});

test('refused: eliminated, Final lost, not unlocked, no activity', () => {
  assert.deepEqual(
    [verifyWorldCupPrize({ rows: rowsFor('WWWWLWWW'), cfg: CFG, today: addDays(U, 50) }).reason,
      verifyWorldCupPrize({ rows: rowsFor('WWWWWWW-'), cfg: CFG, today: addDays(U, 50) }).reason,
      verifyWorldCupPrize({ rows: rowsFor('').slice(0, 50), cfg: CFG, today: addDays(U, 50) }).reason,
      verifyWorldCupPrize({ rows: [], cfg: CFG, today: addDays(U, 50) }).reason],
    ['eliminated', 'eliminated', 'not_unlocked', 'no_activity'],
  );
  // the Final window not over yet and short: not won
  const live = verifyWorldCupPrize({ rows: rowsFor('WWWWWWW-'), cfg: CFG, today: addDays(U, 45) });
  assert.equal(live.won, false);
  assert.equal(live.reason, 'final_not_won');
});

test('a modified client cannot fake it: its platform XP is clamped to 60 a day', () => {
  // Final short by far more than 6 x 60
  const rows = rowsFor('WWWWWWWL');
  const fake = {};
  for (let i = 0; i < 160; i++) fake[addDays(D0, i)] = 99999;
  const v = verifyWorldCupPrize({ rows, clientPlatform: fake, cfg: CFG, today: addDays(U, 50) });
  assert.equal(v.won, false);
  const c = clampClientPlatform({ [D0]: 99999, [addDays(D0, 1)]: { daily: 20, games: 500 }, junk: 5, [addDays(D0, 2)]: -3 }, CFG);
  assert.deepEqual(c, { [D0]: 60, [addDays(D0, 1)]: 60, [addDays(D0, 2)]: 0 });
  assert.deepEqual(clampClientPlatform(null), {});
  assert.deepEqual(clampClientPlatform([1, 2]), {});
});

test('the client path: a real winner whose windows shift under the max assumption still verifies', () => {
  // platform cap 10 to make the shift visible. Max assumption: 10 XP every
  // day from D0 reaches stage 2 (50 XP) on D4. The client earned no platform
  // XP: its stage 2 comes from a 50 XP feed row on D10, so its windows start
  // D11 and each ends with a row worth exactly that match's target.
  const cfg = cleanSeasonConfig({ platformDailyCap: 10, dailyCap: 100000, weeklyCap: 700000, worldCup: { unlockStage: 2 } });
  const D = '2026-03-02';
  const rows = [{ day: D, casino_rounds: 5 }, { day: addDays(D, 10), casino_stake: 500 }];
  cfg.worldCup.rounds.forEach((r, i) => rows.push({ day: addDays(D, 16 + 6 * i), casino_stake: r.target * 10 }));
  const today = addDays(D, 60);
  const noClient = verifyWorldCupPrize({ rows, cfg, today });
  assert.equal(noClient.won, false, 'under 10/day everywhere the windows shift one match and the R32 is lost');
  assert.equal(noClient.reason, 'eliminated');
  const v = verifyWorldCupPrize({ rows, clientPlatform: { [D]: 0 }, cfg, today });
  assert.equal(v.won, true);
  assert.equal(v.method, 'client');
  assert.equal(v.summary.unlockDay, addDays(D, 10));
});

test('Telegram: the prize message (also rebuilt from the purchases row)', () => {
  const v = verifyWorldCupPrize({ rows: rowsFor('WWWWWWWW'), cfg: CFG, today: addDays(U, 50) });
  const text = worldCupPrizeMessage({ uid: '123456', prizeKwacha: 10000, seasonId: 'S1', summary: v.summary });
  assert.match(text, /^🏆 World Cup prize — credit K10,000 to player 123456\n/);
  assert.match(text, /✅ Brazil/);
  const row = { id: 'a1b2c3d4-0000-0000-0000-000000000000', uid: '123456', prize_key: 'worldcup:S1', prize_meta: v.summary, payout_kwacha: 10000, item_name: 'World Cup prize' };
  const fromRow = purchaseMessage(row);
  assert.match(fromRow, /^🏆 World Cup prize #a1b2c3d4 — credit K10,000 to player 123456/);
  assert.match(fromRow, /Season S1/);
});
