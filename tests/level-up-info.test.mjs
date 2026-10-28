import { test } from 'node:test';
import assert from 'node:assert/strict';
import { xpSnapshot, levelUpReasons, missionsSince, pickNextMission, platformXpToday, cleanSnap, howToNext } from '../lib/xp/levelUpInfo.mjs';
import { STORIES } from '../lib/vuma/stories.mjs';

const row = (day, o) => ({ day, deposits_amount: 0, deposits_count: 0, withdrawals_amount: 0, casino_stake: 0, casino_rounds: 0, sports_stake: 0, sports_slips: 0, ...o });

test('a snapshot totals CRM XP and stakes per source', () => {
  const s = xpSnapshot({ rows: [row('2026-10-26', { sports_stake: 400, sports_slips: 4, casino_stake: 600, deposits_count: 1, deposits_amount: 100 })] });
  assert.equal(s.sportsXp, 100); // K4 = 1 XP
  assert.equal(s.casinoXp, 60); // K10 = 1 XP
  assert.equal(s.depositXp, 30);
  assert.equal(s.sportsSlips, 4);
  assert.equal(s.depositDays, 1);
});

test('platform XP: today\'s tally wins over an older copy of the same day', () => {
  const s = xpSnapshot({ xpDays: { '2026-10-27': { daily: 20, games: 10 } }, xpToday: { day: '2026-10-27', daily: 20, games: 30, missions: 10 } });
  assert.equal(s.games, 30);
  assert.equal(s.daily, 20);
  assert.equal(s.missions, 10);
});

test('casino-rounds XP counts only on days without a feed row', () => {
  const s = xpSnapshot({ rows: [row('2026-10-26', { casino_stake: 100 })], xpDays: { '2026-10-26': { casino: 50 }, '2026-10-25': { casino: 7 } } });
  assert.equal(s.casinoXp, 10 + 7);
});

test('reasons = what each source gave since the last pop-up, biggest first', () => {
  const prev = xpSnapshot({ xpDays: { a: { games: 40 } } });
  const cur = xpSnapshot({
    rows: [row('2026-10-26', { sports_stake: 400, sports_slips: 4, casino_stake: 600, deposits_count: 1 })],
    xpDays: { a: { games: 70, daily: 20 } }, claims: ['x'],
  });
  const r = levelUpReasons(prev, cur);
  assert.deepEqual(r.map((x) => x.kind), ['sports', 'casino', 'games', 'deposit', 'daily']);
  assert.deepEqual(r.find((x) => x.kind === 'sports'), { kind: 'sports', label: 'Sports bets', detail: '4 bets · K400 in all', xp: 100 });
  assert.equal(r.find((x) => x.kind === 'games').detail, '30 coins played');
  assert.equal(missionsSince(prev, cur), 1);
});

test('a CRM correction (totals going down) never shows a negative row', () => {
  const prev = { ...cleanSnap({}), casinoXp: 90, casinoStake: 900 };
  const cur = { ...cleanSnap({}), casinoXp: 50, casinoStake: 500, games: 10 };
  assert.deepEqual(levelUpReasons(prev, cur).map((x) => x.kind), ['games']);
  assert.deepEqual(levelUpReasons(null, null), []);
});

const st = (track, target, progress, extra = {}) => ({ mission: { id: `${track}${target}`, track, target }, progress, current: true, claimed: false, claimable: false, ...extra });

test('next mission: ready to collect first, else the one furthest along', () => {
  const states = [st('casino', 20, 12), st('sports', 3, 0), st('deposits', 1, 0), st('logins', 3, 2)];
  assert.deepEqual(pickNextMission(states), { state: states[3], dest: 'daily', here: true }); // 2 of 3 = furthest
  const ready = [...states, st('sports', 10, 10, { claimable: true })];
  assert.equal(pickNextMission(ready).dest, 'missions');
});

test('next mission when Bonus Center XP is full: only bwanabet missions', () => {
  const states = [st('casino', 20, 2), st('logins', 3, 2), st('sports', 3, 1, { claimable: false })];
  const n = pickNextMission(states, { bwanabetOnly: true });
  assert.equal(n.state.mission.track, 'sports');
  assert.equal(n.dest, 'sports');
  assert.equal(n.here, false);
  assert.equal(pickNextMission([], {}), null);
  assert.equal(pickNextMission([st('casino', 20, 2, { claimed: true })]), null);
});

test('platform XP today', () => {
  assert.equal(platformXpToday({ day: 'd', daily: 20, games: 30, missions: 10, casino: 5 }, 'd'), 65);
  assert.equal(platformXpToday({ day: 'old', games: 30 }, 'd'), 0);
});

test('every story has a "How" line with one {xp}; howToNext fills the XP to the next level', () => {
  for (const st of STORIES) assert.equal((st.how || '').split('{xp}').length, 2, st.id);
  const h = howToNext('1.1');
  assert.deepEqual([h.xp, h.slotK, h.sportsK], [40, 400, 160]); // 1.2 opens at 40 XP; K10 / K4 per XP
  assert.match(h.how, /gaining 40 XP/);
  assert.equal(h.earn, 'Complete missions, collect your daily reward, play 400 slot rounds (K400 in all), or bet K160 on sports.');
  assert.equal(howToNext('2.1').xp, 60);
  assert.match(howToNext('23.4').how, /5,400 XP/);
  assert.equal(howToNext('23.5'), null); // the last level
  assert.equal(howToNext('nope'), null);
});
