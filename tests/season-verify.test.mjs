import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../lib/season/xp.mjs';
import { verifyWorldCupPrize, clampClientPlatform, worldCupPrizeMessage } from '../lib/season/verify.mjs';
import { cleanSeasonConfig, WORLD_CUP_OPEN } from '../lib/season/config.mjs';
import { computeSeasonXp } from '../lib/season/xp.mjs';
import { worldCupState } from '../lib/season/worldcup.mjs';
import { levelSeason } from '../lib/xp/levelReset.mjs';
import { purchaseMessage } from '../lib/telegram/format.mjs';

const D0 = '2026-01-05';
const CFG = cleanSeasonConfig({ weeklyCap: 700000 });
const U = addDays(D0, 159); // 160 days x 400 = 64,000 (stage 22)

function rowsFor(windows) {
  const rows = Array.from({ length: 160 }, (_, i) => ({ day: addDays(D0, i), casino_stake: 4000 }));
  windows.split('').forEach((w, i) => {
    const n = w === 'W' ? 5 : w === 'L' ? 1 : 0;
    for (let k = 0; k < n; k++) rows.push({ day: addDays(U, 1 + i * 6 + k), casino_stake: 4000 });
  });
  return rows;
}

test('a Final won on the feed rows verifies (no platform map = platform XP 0, never more than the truth)', () => {
  const v = verifyWorldCupPrize({ rows: rowsFor('WWWWWWWW'), cfg: CFG, today: addDays(U, 50) });
  assert.equal(v.won, true);
  assert.equal(v.method, 'strict');
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
  for (let i = 0; i < 240; i++) fake[addDays(D0, i)] = 99999;
  const v = verifyWorldCupPrize({ rows, clientPlatform: fake, cfg: CFG, today: addDays(U, 50) });
  assert.equal(v.won, false);
  const c = clampClientPlatform({ [D0]: 99999, [addDays(D0, 1)]: { daily: 20, games: 500 }, junk: 5, [addDays(D0, 2)]: -3 }, CFG);
  assert.deepEqual(c, { [D0]: 60, [addDays(D0, 1)]: 60, [addDays(D0, 2)]: 0 });
  assert.deepEqual(clampClientPlatform(null), {});
  assert.deepEqual(clampClientPlatform([1, 2]), {});
});

test("the client path: the client's own platform map gives the server the SAME windows the player saw", () => {
  // platform cap 20 to make the shift visible. The client earned 20 platform
  // XP a day from D0, so its stage 2 (200 XP) came on D9 and its windows
  // start D10; a 200 XP feed row on D15 would otherwise make them start D16.
  const cfg = cleanSeasonConfig({ platformDailyCap: 20, dailyCap: 100000, weeklyCap: 700000, worldCup: { unlockStage: 2 } });
  const D = '2026-03-02';
  const rows = [{ day: D, casino_rounds: 5 }, { day: addDays(D, 15), casino_stake: 2000 }];
  cfg.worldCup.rounds.forEach((r, i) => rows.push({ day: addDays(D, 15 + 6 * i), casino_stake: r.target * 10 }));
  const today = addDays(D, 60);
  const platform = {};
  for (let i = 0; i < 61; i++) platform[addDays(D, i)] = 20;
  const v = verifyWorldCupPrize({ rows, clientPlatform: platform, cfg, today });
  assert.equal(v.won, true);
  assert.equal(v.method, 'client');
  assert.equal(v.summary.unlockDay, addDays(D, 9));
  // no map: platform 0, the windows start D16 and every row lands a window late -> not the same cup
  const strict = verifyWorldCupPrize({ rows, cfg, today });
  assert.equal(strict.method === 'client', false);
  assert.equal(strict.summary.unlockDay, addDays(D, 15));
  // a modified client cannot shift the windows EARLIER than 20/day allows
  const fake = {};
  for (let i = 0; i < 61; i++) fake[addDays(D, i)] = 99999;
  assert.equal(verifyWorldCupPrize({ rows, clientPlatform: fake, cfg, today }).summary.unlockDay, addDays(D, 9));
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

// LEVEL XP (2026-10-27): the client unlocks the World Cup on season XP minus
// the village-restart base (lib/xp/levelReset.mjs); the server must judge the
// SAME unlock day and windows. Scenario: 5,000 XP before the restart (the
// base), then 400 XP a day; the player plays only the 8 windows their screen
// shows (300 XP a day), nothing else after the unlock.
const LV_CFG = cleanSeasonConfig({ dailyCap: 100000, weeklyCap: 700000 });
const LV_BASE = 5000;
function levelScenario(stakePerDay) {
  const rows = Array.from({ length: 200 }, (_, i) => ({ day: addDays(D0, i), casino_stake: 4000 }));
  const today = addDays(D0, 199);
  const client = worldCupState({ season: levelSeason(computeSeasonXp({ rows, cfg: LV_CFG, today }), { base: LV_BASE }), today, cfg: LV_CFG });
  const played = rows.filter(r => r.day <= client.unlockDay);
  for (const r of client.rounds) for (let d = r.start; d <= r.end; d = addDays(d, 1)) played.push({ day: d, casino_stake: stakePerDay });
  const end = addDays(client.finalRound.end, 1);
  const screen = worldCupState({ season: levelSeason(computeSeasonXp({ rows: played, cfg: LV_CFG, today: end }), { base: LV_BASE }), today: end, cfg: LV_CFG });
  return { rows: played, today: end, client, screen };
}

test('level reset: the server uses the client\'s unlock day and windows (level XP, base taken off)', () => {
  const { rows, today, client, screen } = levelScenario(3000); // 300 XP a day x 6 = 1,800: the semi-final (1,900) is lost
  assert.equal(screen.champion, false);
  assert.equal(screen.eliminated, true, 'the screen says knocked out in the semi-final');
  const noPlatform = { [D0]: 0 };
  // without the base the server would judge windows that start 13 days before the ones on the screen
  const total = verifyWorldCupPrize({ rows, clientPlatform: noPlatform, cfg: LV_CFG, today, anchor: D0 });
  assert.equal(total.summary.unlockDay, addDays(client.unlockDay, -13));
  // with the saved base: the same windows as the screen -> refused
  const v = verifyWorldCupPrize({ rows, clientPlatform: noPlatform, cfg: LV_CFG, today, anchor: D0, levelReset: { base: LV_BASE, day: '2026-10-24', from: 7, story: 'seen', shown: 1 } });
  assert.equal(v.won, false);
  assert.equal(v.reason, 'eliminated');
  assert.equal(v.summary.unlockDay, client.unlockDay);
  assert.equal(v.summary.levelBase, LV_BASE);
  assert.deepEqual(v.summary.rounds.map(r => [r.start, r.end]), client.rounds.map(r => [r.start, r.end]));
});

test('level reset: a true champion on the screen verifies, with the client\'s windows', () => {
  const { rows, today, client, screen } = levelScenario(4000); // 400 XP a day x 6 = 2,400 >= every target
  assert.equal(screen.champion, true);
  const v = verifyWorldCupPrize({ rows, clientPlatform: { [D0]: 0 }, cfg: LV_CFG, today, anchor: D0, levelReset: { base: LV_BASE } });
  assert.equal(v.won, true);
  assert.equal(v.summary.unlockDay, client.unlockDay);
  assert.ok(v.summary.rounds.every(r => r.status === 'won'));
  assert.match(worldCupPrizeMessage({ uid: '53', prizeKwacha: 10000, seasonId: 'S1', summary: v.summary }), /restart base 5,000 taken off/);
});

test('level reset: no base / junk base = the old behaviour (total XP)', () => {
  const rows = rowsFor('WWWWWWWW');
  const today = addDays(U, 50);
  for (const reset of [undefined, null, {}, { base: 'x' }, { base: 0 }, 'junk']) {
    const v = verifyWorldCupPrize({ rows, cfg: CFG, today, levelReset: reset });
    assert.equal(v.won, true, `reset ${JSON.stringify(reset)}`);
    assert.equal(v.summary.unlockDay, U);
    assert.equal(v.summary.levelBase, 0);
  }
  // a base pushes the unlock day back (5,000 more XP), exactly as the client's lvSeason does
  const v = verifyWorldCupPrize({ rows, cfg: CFG, today, levelReset: { base: LV_BASE } });
  assert.equal(v.won, false);
  const screen = worldCupState({ season: levelSeason(computeSeasonXp({ rows, cfg: CFG, today }), { base: LV_BASE }), today, cfg: CFG });
  assert.ok(screen.unlockDay > U);
  assert.equal(v.summary.unlockDay, screen.unlockDay);
});

test('WORLD_CUP_OPEN is the one switch and it is on', () => {
  assert.equal(WORLD_CUP_OPEN, true);
});
