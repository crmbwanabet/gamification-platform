import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BWANABET_MISSIONS, missionStates } from '../lib/missions/ladder.mjs';
import { welcomeSummary, welcomeSubtitle, actionWord, goalLabel, awayMissionIds, AWAY_TRACKS } from '../lib/welcome/summary.mjs';

const states = (counts, claims = [], bases = null) => missionStates(BWANABET_MISSIONS, { casino: 0, sports: 0, deposits: 0, logins: 0, ...counts }, claims, bases);
const allAway = (st, seen = []) => awayMissionIds(st, seen);
const summary = (st, extra = {}) => welcomeSummary({ states: st, collect: allAway(st), bets: null, ...extra });

test('away missions = claimable on the activity ladders, minus those already claimable last visit; never the login ladder', () => {
  const st = states({ casino: 60, deposits: 1, logins: 3 });
  // no spill-over: at most ONE mission per ladder (the current rung)
  assert.deepEqual(allAway(st), ['casino_starter', 'deposit_first']);
  assert.deepEqual(allAway(st, ['casino_starter']), ['deposit_first']);
  assert.deepEqual(allAway(states({ casino: 60 }, ['casino_starter', 'casino_regular'])), []);
  assert.deepEqual(allAway(states({ casino: 60 }, ['casino_starter'], { casino: { count: 5 } })), ['casino_regular']);
  assert.ok(!AWAY_TRACKS.has('logins'));
  assert.deepEqual(awayMissionIds(null, null), []);
});

test('YOU GOT: the away missions (one per ladder) then the XP from bets; never the daily reward', () => {
  const st = states({ casino: 260, deposits: 1, logins: 3, loginDays: ['2026-10-20', '2026-10-21', '2026-10-22'], today: '2026-10-22' }, ['casino_starter'], { casino: { count: 180 } });
  const s = summary(st, { bets: { parts: { casino: 80, sports: 40, deposit: 0 }, bar: 100, hustle: 20 } });
  assert.deepEqual(s.got.map(g => g.key), ['mission:casino_regular', 'mission:deposit_first', 'bets']);
  assert.ok(!s.got.some(g => g.kind === 'daily'));
  const m = s.got[0];
  assert.equal(m.kind, 'mission');
  assert.equal(m.terms, 'PLAY 50 ROUNDS OF AVIATOR OR SLOT GAMES');
  assert.equal(m.sub, '50 / 50 casino rounds');
  assert.deepEqual(m.reward, { kwacha: 100 });
  assert.equal(m.xp, BWANABET_MISSIONS.find(x => x.id === 'casino_regular').xp);
  const b = s.got.at(-1);
  assert.equal(b.terms, 'XP FROM YOUR BETS');
  assert.equal(b.sub, 'Casino 80 · sports 40');
  assert.equal(b.xp, 120);
  assert.equal(b.bar, 100);
  assert.equal(b.hustle, 20);
  // the claimable login mission (earned in the Bonus Center itself) is not collected here: it waits as ready
  assert.equal(s.near[0].missionId, 'loyal_fan');
  assert.equal(s.near[0].ready, true);
});

test('totals add coins, gems and XP over everything collected', () => {
  const st = states({ casino: 25 });
  const starter = st.find(x => x.mission.id === 'casino_starter');
  starter.mission = { ...starter.mission, reward: { kwacha: 50, emeralds: 1 } };
  const s = summary(st, { bets: { parts: { casino: 10, sports: 0, deposit: 30 }, bar: 40, hustle: 0 } });
  assert.deepEqual(s.total, { kwacha: 50, emeralds: 1, rubies: 0, diamonds: 0, xp: starter.mission.xp + 40 });
  assert.equal(s.got.at(-1).sub, 'Casino 10 · deposit day 30');
});

test('ALMOST THERE = current missions at 50%+ (most done first), STILL TO DO = the rest, NEXT = the rung after each current one', () => {
  // casino: the 20 and 50 ones collected earlier (base 100), 86 new rounds toward the 100 one
  const s = summary(states({ casino: 186, sports: 2, deposits: 1 }, ['casino_starter', 'casino_regular'], { casino: { count: 100 } }));
  assert.deepEqual(s.got.map(g => g.missionId), ['deposit_first']);
  assert.deepEqual(s.near.map(n => n.missionId), ['casino_pro', 'sports_starter']);
  assert.equal(s.near[0].sub, '86 / 100 casino rounds');
  assert.equal(s.near[0].go, '14 to go');
  assert.equal(s.near[0].pct, 86);
  assert.equal(s.near[1].pct, 67);
  assert.deepEqual(s.todo.map(n => n.missionId), ['deposit_regular', 'loyal_fan']);
  assert.equal(s.todo[0].pct, 0, 'collected just now: the next deposit rung starts from zero');
  assert.deepEqual(s.next.map(n => n.missionId).sort(), ['casino_legend', 'deposit_pro', 'loyal_regular', 'sports_regular'].sort());
  const nx = s.next.find(n => n.missionId === 'casino_legend');
  assert.equal(nx.sub, 'Opens after 100 casino rounds');
  assert.equal(nx.locked, true);
  assert.equal(s.next.find(n => n.missionId === 'deposit_pro').sub, 'Opens after 3 deposit days');
  assert.equal(s.got.find(g => g.missionId === 'deposit_first').sub, '1 / 1 deposit day');
  const first = summary(states({})).next.find(n => n.missionId === 'deposit_regular');
  assert.equal(first.sub, 'Opens after your first deposit');
});

test('the goal button names the top ALMOST THERE mission; LET\'S GO when there is none', () => {
  assert.equal(summary(states({ casino: 186 }, ['casino_starter', 'casino_regular'], { casino: { count: 100 } })).goal, "LET'S GO: 14 ROUNDS TO 500 COINS");
  // a big pile of rounds collects the current rung only; the next starts at 0 (STILL TO DO)
  const big = summary(states({ casino: 200 }));
  assert.deepEqual(big.got.map(g => g.missionId), ['casino_starter']);
  assert.equal(big.todo.find(n => n.missionId === 'casino_regular').sub, '0 / 50 casino rounds');
  assert.equal(summary(states({ sports: 2 })).goal, "LET'S GO: 1 BET TO 100 COINS");
  const none = summary(states({}));
  assert.equal(none.near.length, 0);
  assert.equal(none.goal, "LET'S GO");
  assert.equal(goalLabel(null), "LET'S GO");
});

test('missions progress unavailable: nothing is collected, claimable missions wait as "ready" in ALMOST THERE', () => {
  const s = summary(states({ casino: 60 }), { missionsOk: false });
  assert.equal(s.got.length, 0);
  assert.equal(s.near[0].missionId, 'casino_starter');
  assert.equal(s.near[0].ready, true);
  assert.equal(s.near[0].go, 'Ready: collect on Missions');
  assert.equal(s.goal, "LET'S GO"); // a ready mission is never the next goal
});

test('nothing earned while away = empty YOU GOT (the pop-up does not open)', () => {
  const s = summary(states({ casino: 45 }, ['casino_starter'], { casino: { count: 20 } }));
  assert.equal(s.got.length, 0);
  assert.deepEqual(s.total, { kwacha: 0, emeralds: 0, rubies: 0, diamonds: 0, xp: 0 });
  assert.equal(s.near[0].missionId, 'casino_regular'); // 25 of 50 = 50%
  // a mission already claimable last visit is not "earned while away"
  const st = states({ casino: 25 });
  assert.equal(welcomeSummary({ states: st, collect: allAway(st, ['casino_starter']) }).got.length, 0);
  assert.equal(welcomeSummary({ states: [], bets: { parts: { casino: 0, sports: 0, deposit: 0 }, bar: 0, hustle: 0 } }).got.length, 0);
});

test('actionWord: the first word, LOG IN as one', () => {
  assert.equal(actionWord('PLAY 20 ROUNDS OF AVIATOR OR SLOT GAMES'), 'PLAY');
  assert.equal(actionWord('LOG IN ON 3 DAYS'), 'LOG IN');
  assert.equal(actionWord(''), '');
});

test('welcomeSubtitle: "since <weekday>" only from a real previous-visit day', () => {
  const today = '2026-10-21'; // a Wednesday
  assert.equal(welcomeSubtitle(null, today), 'Here is what you earned');
  assert.equal(welcomeSubtitle('garbage', today), 'Here is what you earned');
  assert.equal(welcomeSubtitle('2026-10-21', today), 'Here is what you earned');
  assert.equal(welcomeSubtitle('2026-10-20', today), 'Here is what you earned since yesterday');
  assert.equal(welcomeSubtitle('2026-10-19', today), 'Here is what you earned since Monday');
  assert.equal(welcomeSubtitle('2026-10-15', today), 'Here is what you earned since Thursday');
  assert.equal(welcomeSubtitle('2026-10-10', today), 'Here is what you earned');
});

test('welcome_back_seen is an allowed activity event (not a reward claim)', async () => {
  const { TRACK_TYPES, REWARD_TYPES } = await import('../lib/trackTypes.mjs');
  assert.ok(TRACK_TYPES.has('welcome_back_seen'));
  assert.ok(!REWARD_TYPES.has('welcome_back_seen'));
});
