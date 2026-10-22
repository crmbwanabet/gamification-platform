import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BWANABET_MISSIONS, CASINO_MISSIONS, MISSION_TRACKS, missionTerms, missionCounts, missionStates,
  countClaimable, recordMissionClaim, missionBoard, recordMissionBase, migrateMissionBases, baseOf, loginStreak,
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
  assert.equal(missionTerms(byId.loyal_fan), 'LOG IN 3 DAYS IN A ROW');
  assert.equal(missionTerms(byId.loyal_regular), 'LOG IN 7 DAYS IN A ROW');
  assert.equal(missionTerms(byId.loyal_pro), 'LOG IN ON 14 DAYS');
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
  assert.deepEqual(c, { casino: 512, sports: 7, deposits: 2, logins: 2, loginDays: ['2026-10-20', '2026-10-22'], today: c.today });
  const empty = missionCounts({ today: '2026-10-22' });
  assert.deepEqual(empty, { casino: 0, sports: 0, deposits: 0, logins: 0, loginDays: [], today: '2026-10-22' });
});

test('each mission is collected once, ever (no daily reset)', () => {
  const counts = { casino: 120, sports: 0, deposits: 1, logins: 0 };
  let claims = [];
  let st = missionStates(BWANABET_MISSIONS, counts, claims);
  assert.equal(countClaimable(st), 2, 'only the current rungs: casino starter + first deposit');
  claims = recordMissionClaim(claims, 'casino_starter', st);
  assert.deepEqual(claims, ['casino_starter']);
  st = missionStates(BWANABET_MISSIONS, counts, claims, { casino: { count: 120 } });
  assert.equal(recordMissionClaim(claims, 'casino_starter', st), null, 'never twice');
  assert.equal(recordMissionClaim(claims, 'casino_regular', st), null, 'counts from zero after the claim');
  assert.equal(recordMissionClaim(claims, 'casino_legend', st), null, 'not reached');
  assert.equal(recordMissionClaim(claims, 'nope', st), null);
});

const get = (st, id) => st.find(s => s.mission.id === id);

test('no spill-over: 200 rounds at once complete only the first rung', () => {
  const st = missionStates(BWANABET_MISSIONS, { casino: 200 }, []);
  assert.deepEqual(st.filter(s => s.claimable).map(s => s.mission.id), ['casino_starter']);
  assert.equal(get(st, 'casino_starter').progress, 20);
  for (const id of ['casino_regular', 'casino_pro', 'casino_legend']) {
    const s = get(st, id);
    assert.equal(s.reached, false, id);
    assert.equal(s.progress, 0, id);
    assert.equal(s.current, false, id);
  }
  assert.equal(get(st, 'casino_starter').total, 200);
});

test('after a claim the next rung counts from zero; the excess is discarded at the next claim', () => {
  let claims = recordMissionClaim([], 'casino_starter', missionStates(BWANABET_MISSIONS, { casino: 200 }, []));
  let bases = recordMissionBase(null, 'casino', 200, '2026-10-21T10:00:00Z');
  assert.deepEqual(bases, { casino: { count: 200, at: '2026-10-21T10:00:00Z' } });
  let st = missionStates(BWANABET_MISSIONS, { casino: 200 }, claims, bases);
  assert.equal(get(st, 'casino_regular').progress, 0);
  assert.equal(get(st, 'casino_regular').current, true);
  assert.equal(countClaimable(st), 0);
  // 60 new rounds: 50 / 50, claimable; the other rungs stay locked
  st = missionStates(BWANABET_MISSIONS, { casino: 260 }, claims, bases);
  assert.equal(get(st, 'casino_regular').count, 60);
  assert.equal(get(st, 'casino_regular').progress, 50);
  assert.equal(get(st, 'casino_regular').claimable, true);
  assert.equal(get(st, 'casino_pro').progress, 0);
  claims = recordMissionClaim(claims, 'casino_regular', st);
  bases = recordMissionBase(bases, 'casino', 260);
  st = missionStates(BWANABET_MISSIONS, { casino: 260 }, claims, bases);
  assert.equal(get(st, 'casino_pro').progress, 0, 'the 10 extra rounds do not carry over');
  // plain-number bases are read too
  assert.equal(get(missionStates(BWANABET_MISSIONS, { casino: 300 }, claims, { casino: 260 }), 'casino_pro').progress, 40);
});

test('a CRM correction below the base reads 0, never negative', () => {
  const st = missionStates(BWANABET_MISSIONS, { casino: 150 }, ['casino_starter'], { casino: { count: 200 } });
  assert.equal(get(st, 'casino_regular').count, 0);
  assert.equal(get(st, 'casino_regular').progress, 0);
  assert.equal(get(st, 'casino_regular').claimable, false);
});

test('every ladder, login days included, follows the same rule', () => {
  // loyal_regular (7 IN A ROW) counts the run after loyal_fan's collection day
  const run = ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17'];
  const st = missionStates(BWANABET_MISSIONS, { sports: 50, deposits: 9, logins: 20, loginDays: run, today: '2026-10-17' }, ['loyal_fan'], { logins: { count: 10, at: '2026-10-10T08:00:00Z' } });
  assert.deepEqual(st.filter(s => s.claimable).map(s => s.mission.id), ['sports_starter', 'deposit_first', 'loyal_regular']);
  assert.equal(get(st, 'loyal_regular').progress, 7);
  assert.equal(get(st, 'loyal_pro').progress, 0);
});

test('migration: claims without a base get base = the current count (no retro spill), only on fresh tracks', () => {
  const counts = { casino: 700, sports: 40, deposits: 4, logins: 12 };
  const claims = ['casino_starter', 'casino_regular', 'sports_starter'];
  // before the base is recorded the claimed ladders already read 0 progress
  const pre = missionStates(BWANABET_MISSIONS, counts, claims);
  assert.equal(get(pre, 'casino_pro').progress, 0);
  assert.equal(get(pre, 'sports_regular').progress, 0);
  assert.equal(get(pre, 'deposit_first').claimable, true, 'no claim yet: counts from the anchor');
  // sports feed not fresh yet: only casino (+ logins, which has no claim) are considered
  const next = migrateMissionBases(null, claims, counts, BWANABET_MISSIONS, ['casino', 'logins'], 'T');
  assert.deepEqual(next, { casino: { count: 700, at: 'T' } });
  const all = migrateMissionBases(next, claims, counts, BWANABET_MISSIONS, ['casino', 'sports', 'deposits', 'logins'], 'T2');
  assert.deepEqual(all, { casino: { count: 700, at: 'T' }, sports: { count: 40, at: 'T2' } });
  assert.equal(migrateMissionBases(all, claims, counts, BWANABET_MISSIONS, ['casino', 'sports', 'deposits', 'logins']), null, 'nothing to do');
  assert.equal(migrateMissionBases(null, [], counts, BWANABET_MISSIONS, ['casino']), null, 'no claims = keep counting from the anchor');
  const after = missionStates(BWANABET_MISSIONS, { ...counts, casino: 760 }, claims, all);
  assert.equal(get(after, 'casino_pro').progress, 60);
  assert.equal(baseOf(all, 'deposits'), null);
});

test('the board: one current mission per ladder (claimable first), collected as bars', () => {
  const st = missionStates(BWANABET_MISSIONS, { casino: 60, sports: 1, deposits: 0, logins: 0 }, ['casino_starter'], { casino: { count: 10 } });
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

test('the first two loyalty rungs need the days IN A ROW', () => {
  assert.equal(loginStreak(['2026-10-20', '2026-10-21', '2026-10-22'], '2026-10-22'), 3);
  assert.equal(loginStreak(['2026-10-20', '2026-10-21'], '2026-10-22'), 2, 'today not claimed yet: the run still stands');
  assert.equal(loginStreak(['2026-10-19', '2026-10-20'], '2026-10-22'), 0, 'a missed day resets');
  assert.equal(loginStreak(['2026-10-18', '2026-10-20', '2026-10-21'], '2026-10-21'), 2, 'a gap breaks the run');
  assert.equal(loginStreak(['2026-10-20', '2026-10-21', '2026-10-22'], '2026-10-22', '2026-10-20'), 2, 'only days after the last collection');
  assert.equal(loginStreak(['2026-10-31', '2026-11-01'], '2026-11-01'), 2, 'across a month end');

  const counts = (days, today) => missionCounts({ today, xpDays: Object.fromEntries(days.map(d => [d, { daily: 20 }])) });
  const fan = (c, claims = [], bases = null) => missionStates(BWANABET_MISSIONS, c, claims, bases).find(s => s.mission.id === (claims.length ? 'loyal_regular' : 'loyal_fan'));
  // 3 days but not in a row: not reached
  assert.equal(fan(counts(['2026-10-15', '2026-10-17', '2026-10-19'], '2026-10-19')).progress, 1);
  assert.equal(fan(counts(['2026-10-17', '2026-10-18', '2026-10-19'], '2026-10-19')).claimable, true);
  // loyal_regular counts from the day after loyal_fan was collected (Lusaka day of `at`)
  const days = ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'];
  const reg = fan(counts(days, '2026-10-21'), ['loyal_fan'], { logins: { count: 3, at: '2026-10-19T10:00:00Z' } });
  assert.equal(reg.progress, 2);
  // from 14 days up, any days count (cumulative since the last collection)
  const pro = missionStates(BWANABET_MISSIONS, { logins: 20, loginDays: [], today: '2026-10-22' }, ['loyal_fan', 'loyal_regular'], { logins: { count: 10, at: 'x' } })
    .find(s => s.mission.id === 'loyal_pro');
  assert.equal(pro.progress, 10);
});
