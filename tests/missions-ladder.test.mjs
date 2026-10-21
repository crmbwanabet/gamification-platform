import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BWANABET_MISSIONS, CASINO_MISSIONS, MISSION_TRACKS, missionTerms, missionCounts, missionStates,
  countClaimable, recordMissionClaim, missionBoard,
} from '../lib/missions/ladder.mjs';
import { MISSION_XP } from '../lib/xp/sources.mjs';
import { applyMissionOverrides } from '../lib/config/missions.mjs';

const byId = Object.fromEntries(BWANABET_MISSIONS.map(m => [m.id, m]));

test('30 one-time missions in four ladders, targets rising, every one with XP', () => {
  assert.equal(BWANABET_MISSIONS.length, 30);
  assert.equal(new Set(BWANABET_MISSIONS.map(m => m.id)).size, 30);
  for (const track of Object.keys(MISSION_TRACKS)) {
    const ladder = BWANABET_MISSIONS.filter(m => m.track === track);
    for (let i = 1; i < ladder.length; i++) {
      assert.ok(ladder[i].target > ladder[i - 1].target, `${track} targets rise`);
      assert.ok(ladder[i].reward.kwacha >= ladder[i - 1].reward.kwacha, `${track} prizes rise`);
    }
  }
  for (const m of BWANABET_MISSIONS) assert.equal(m.xp, MISSION_XP[m.id], m.id);
  // the first four casino missions keep their old ids, targets and prizes
  assert.deepEqual(CASINO_MISSIONS.slice(0, 4).map(m => [m.id, m.target, m.reward.kwacha]), [
    ['casino_starter', 20, 50], ['casino_regular', 50, 100], ['casino_pro', 100, 500], ['casino_legend', 200, 1000],
  ]);
});

test('six-month sizing: the last rung of each ladder needs about six months of regular play', () => {
  const last = (t) => BWANABET_MISSIONS.filter(m => m.track === t).at(-1).target;
  const days = 182;
  assert.ok(last('casino') >= 0.9 * 40 * days && last('casino') <= 1.2 * 40 * days);
  assert.ok(last('sports') >= 0.9 * 2 * days && last('sports') <= 1.2 * 2 * days);
  assert.ok(last('deposits') >= 0.9 * 2 * 26 && last('deposits') <= 1.2 * 2 * 26);
  assert.ok(last('logins') >= 0.9 * 5 * 26 && last('logins') <= 1.2 * 5 * 26);
});

test('terms in plain capitals', () => {
  assert.equal(missionTerms(byId.casino_starter), 'PLAY 20 ROUNDS OF AVIATOR OR SLOT GAMES');
  assert.equal(missionTerms(byId.sports_starter), 'PLACE 3 SPORTS BETS AT ODDS 1.5+');
  assert.equal(missionTerms(byId.deposit_first), 'MAKE A DEPOSIT ON BWANABET');
  assert.equal(missionTerms(byId.deposit_pro), 'DEPOSIT ON 7 DIFFERENT DAYS');
  assert.equal(missionTerms(byId.loyal_fan), 'LOG IN ON 3 DAYS');
});

test('counts start at the first-login day', () => {
  const rows = [
    { day: '2026-10-18', sports_slips: 9, deposits_count: 1 }, // before the first login: ignored
    { day: '2026-10-20', sports_slips: 4, deposits_count: 2 },
    { day: '2026-10-21', sports_slips: 'x', deposits_count: 0 },
    { day: '2026-10-22', sports_slips: 3, deposits_count: 1 },
  ];
  const xpDays = { '2026-10-19': { daily: 20 }, '2026-10-20': { daily: 20 }, '2026-10-21': { daily: 0, games: 5 } };
  const c = missionCounts({ casinoTotal: 512, rows, since: '2026-10-20', xpDays, xpToday: { day: '2026-10-22', daily: 20 } });
  assert.deepEqual(c, { casino: 512, sports: 7, deposits: 2, logins: 2 });
  assert.deepEqual(missionCounts(), { casino: 0, sports: 0, deposits: 0, logins: 0 });
});

test('each mission is collected once, ever (no daily reset)', () => {
  const counts = { casino: 120, sports: 0, deposits: 1, logins: 0 };
  let claims = [];
  let st = missionStates(BWANABET_MISSIONS, counts, claims);
  assert.equal(countClaimable(st), 4, 'starter, regular, pro + first deposit');
  claims = recordMissionClaim(claims, 'casino_starter', st);
  assert.deepEqual(claims, ['casino_starter']);
  st = missionStates(BWANABET_MISSIONS, counts, claims);
  assert.equal(recordMissionClaim(claims, 'casino_starter', st), null, 'never twice');
  assert.equal(recordMissionClaim(claims, 'casino_legend', st), null, 'not reached');
  assert.equal(recordMissionClaim(claims, 'nope', st), null);
});

test('the board: one current mission per ladder (claimable first), collected as bars', () => {
  const st = missionStates(BWANABET_MISSIONS, { casino: 60, sports: 1, deposits: 0, logins: 0 }, ['casino_starter']);
  const b = missionBoard(st);
  assert.deepEqual(b.current.map(s => s.mission.id), ['casino_regular', 'sports_starter', 'deposit_first', 'loyal_fan']);
  assert.equal(b.current[0].claimable, true);
  assert.deepEqual(b.collected.map(s => s.mission.id), ['casino_starter']);
  assert.equal(b.done, 1);
  assert.equal(b.total, 30);
  const all = missionBoard(missionStates(BWANABET_MISSIONS, {}, BWANABET_MISSIONS.map(m => m.id)));
  assert.equal(all.current.length, 0);
  assert.equal(all.done, 30);
});

test('dashboard overrides still apply per id', () => {
  const out = applyMissionOverrides(BWANABET_MISSIONS, { casino_king: { target: 9000, reward: { kwacha: 9000 } }, loyal_king: { enabled: false } });
  assert.equal(out.length, 29);
  const king = out.find(m => m.id === 'casino_king');
  assert.equal(king.target, 9000);
  assert.equal(king.reward.kwacha, 9000);
});
