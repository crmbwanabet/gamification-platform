import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSeasonXp, addDays } from '../lib/season/xp.mjs';
import { worldCupState, claimWorldCupBonus } from '../lib/season/worldcup.mjs';
import { cleanSeasonConfig, SEASON_DEFAULTS } from '../lib/season/config.mjs';

const D0 = '2026-01-05';
// Weekly cap out of the way so the windows are easy to reason about; the
// daily cap (400) still applies. One test below runs on the real defaults.
const CFG = cleanSeasonConfig({ weeklyCap: 700000 });
const U = addDays(D0, 97); // 98 days x 400 = 39,200 >= 39,000 (stage 16)

function grind() {
  return Array.from({ length: 98 }, (_, i) => ({ day: addDays(D0, i), casino_stake: 4000 }));
}
/** windows: per World Cup window, 'W' (2,000 XP: beats any target) or 'L' (400 XP) or '-' (nothing). */
function season(windows, cfg = CFG) {
  const rows = grind();
  windows.split('').forEach((w, i) => {
    const start = addDays(U, 1 + i * 6);
    const n = w === 'W' ? 5 : w === 'L' ? 1 : 0;
    for (let k = 0; k < n; k++) rows.push({ day: addDays(start, k), casino_stake: 4000 });
  });
  return computeSeasonXp({ rows, cfg });
}

test('the bracket: Zambia vs real national teams, targets and bonuses', () => {
  assert.deepEqual(SEASON_DEFAULTS.worldCup.rounds.map(r => [r.id, r.opponent, r.target, r.bonus]), [
    ['g1', 'Morocco', 1400, 500], ['g2', 'Mexico', 1400, 500], ['g3', 'Portugal', 1400, 500],
    ['r32', 'USA', 1600, 1000], ['r16', 'Nigeria', 1700, 1500], ['qf', 'France', 1800, 2500],
    ['sf', 'Argentina', 1900, 5000], ['final', 'Brazil', 2000, 0],
  ]);
  assert.equal(SEASON_DEFAULTS.worldCup.prizeKwacha, 10000);
  assert.equal(SEASON_DEFAULTS.worldCup.unlockStage, 16);
});

test('locked before stage 16', () => {
  const s = computeSeasonXp({ rows: grind().slice(0, 90), cfg: CFG });
  const w = worldCupState({ season: s, today: addDays(D0, 100), cfg: CFG });
  assert.equal(w.unlocked, false);
  assert.ok(w.rounds.every(r => r.status === 'locked'));
  assert.equal(w.champion, false);
});

test('windows: 8 x 6 days starting the day after unlock', () => {
  const s = season('');
  const w = worldCupState({ season: s, today: U, cfg: CFG });
  assert.equal(w.unlockDay, U);
  assert.deepEqual(w.rounds.map(r => [r.start, r.end]), Array.from({ length: 8 }, (_, i) => [addDays(U, 1 + 6 * i), addDays(U, 6 + 6 * i)]));
  assert.ok(w.rounds.every(r => r.status === 'upcoming'));
  assert.equal(w.next.id, 'g1');
  assert.equal(w.current, null);
});

test('window boundaries: unlock-day XP never counts; first and last day do; the next day is the next match', () => {
  const rows = grind();
  rows.push({ day: addDays(U, 1), casino_stake: 4000 }); // g1 first day
  rows.push({ day: addDays(U, 6), casino_stake: 4000 }); // g1 last day
  rows.push({ day: addDays(U, 7), casino_stake: 4000 }); // g2 first day
  const s = computeSeasonXp({ rows, cfg: CFG });
  const w = worldCupState({ season: s, today: addDays(U, 7), cfg: CFG });
  assert.equal(w.rounds[0].xp, 800, 'the 400 earned on the unlock day itself is not in g1');
  assert.equal(w.rounds[0].status, 'lost');
  assert.equal(w.rounds[1].xp, 400);
  assert.equal(w.rounds[1].status, 'live');
  assert.equal(w.rounds[1].gap, 1000);
  assert.equal(w.rounds[1].bonus, 0, 'nothing paid while live');
  assert.equal(w.rounds[1].reward, 500, 'but the bonus on offer is known ("Miss it and you lose: 500 coins")');
  // on g1's last day it is still live
  const w6 = worldCupState({ season: s, today: addDays(U, 6), cfg: CFG });
  assert.equal(w6.rounds[0].status, 'live');
  assert.equal(w6.current.id, 'g1');
});

test('won as soon as the target is reached inside the window', () => {
  const s = season('W');
  const w = worldCupState({ season: s, today: addDays(U, 4), cfg: CFG }); // 4 days x 400 = 1,600 >= 1,400
  assert.equal(w.rounds[0].status, 'won');
  assert.equal(w.rounds[0].bonus, 500);
  assert.equal(w.rounds[0].claimable, true);
});

test('group losses only forfeit the bonus; Zambia advances', () => {
  const s = season('LLLWWWWW');
  const w = worldCupState({ season: s, today: addDays(U, 60), cfg: CFG });
  assert.deepEqual(w.rounds.map(r => r.status), ['lost', 'lost', 'lost', 'won', 'won', 'won', 'won', 'won']);
  assert.equal(w.eliminated, false);
  assert.equal(w.champion, true);
  assert.deepEqual(w.rounds.map(r => r.bonus), [0, 0, 0, 1000, 1500, 2500, 5000, 0]);
});

test('a knockout loss eliminates: later rounds are out', () => {
  const s = season('WWWWLWWW');
  const w = worldCupState({ season: s, today: addDays(U, 60), cfg: CFG });
  assert.deepEqual(w.rounds.map(r => r.status), ['won', 'won', 'won', 'won', 'lost', 'out', 'out', 'out']);
  assert.equal(w.eliminated, true);
  assert.equal(w.knockedOutBy, 'Nigeria');
  assert.equal(w.champion, false);
  assert.equal(w.rounds[5].claimable, false);
});

test('losing the Final: no prize', () => {
  const s = season('WWWWWWWL');
  const w = worldCupState({ season: s, today: addDays(U, 60), cfg: CFG });
  assert.equal(w.finalRound.status, 'lost');
  assert.equal(w.champion, false);
  assert.equal(w.eliminated, true);
});

test('champion: every round won; the Final has no coin bonus (the prize is real money)', () => {
  const s = season('WWWWWWWW');
  const w = worldCupState({ season: s, today: addDays(U, 48), cfg: CFG });
  assert.equal(w.champion, true);
  assert.equal(w.finalRound.bonus, 0);
  assert.equal(w.finalRound.claimable, false);
});

test('bonus claims: once per round', () => {
  const s = season('WWWW');
  const today = addDays(U, 30);
  let w = worldCupState({ season: s, today, cfg: CFG });
  const c = claimWorldCupBonus([], 'r32', w);
  assert.deepEqual(c, ['r32']);
  w = worldCupState({ season: s, today, cfg: CFG, claims: c });
  assert.equal(claimWorldCupBonus(c, 'r32', w), null);
  assert.equal(claimWorldCupBonus(c, 'r16', w), null, 'live round');
  assert.equal(claimWorldCupBonus(c, 'final', w), null);
});

test('real defaults: the weekly cap applies inside a window that straddles two weeks', () => {
  // 2,000 a week (Mon-Fri 400) until stage 16; then the World Cup.
  const rows = [];
  let d = 0;
  for (; d < 7 * 20; d++) if (d % 7 < 5) rows.push({ day: addDays(D0, d), casino_stake: 4000 });
  const s = computeSeasonXp({ rows });
  const w = worldCupState({ season: s, today: addDays(D0, 7 * 20), cfg: SEASON_DEFAULTS });
  assert.equal(w.unlocked, true);
  // stage 16 (39,000) on the Wednesday of week 20 (38,000 + 400 + 400 + 400)
  assert.equal(w.unlockDay, addDays(D0, 7 * 19 + 2));
  const g1 = w.rounds[0]; // Thu..Tue; only Thu + Fri have rows so far
  assert.equal(g1.start, addDays(D0, 7 * 19 + 3));
  assert.equal(g1.xp, 800);
  assert.equal(g1.status, 'live', 'Monday of the next week, the window ends Tuesday');
});
