import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASINO_MISSIONS, casinoMissionStates, countClaimable, claimsForDay, recordClaim } from '../lib/missions/casino.mjs';
import { applyMissionOverrides } from '../lib/config/missions.mjs';

const DAY = '2026-10-07';
const states = (rounds, claims = null, opts = {}) =>
  casinoMissionStates(CASINO_MISSIONS, { rounds, progressDay: DAY, today: DAY, claims, ...opts });
const byId = (ss) => Object.fromEntries(ss.map(s => [s.mission.id, s]));

test('the four daily casino missions: targets and coin rewards', () => {
  assert.deepEqual(CASINO_MISSIONS.map(m => [m.id, m.target, m.reward]), [
    ['casino_starter', 20, { kwacha: 50 }],
    ['casino_regular', 50, { kwacha: 100 }],
    ['casino_pro', 100, { kwacha: 500 }],
    ['casino_legend', 200, { kwacha: 1000 }],
  ]);
  for (const m of CASINO_MISSIONS) assert.equal(m.type, 'casinoRounds');
});

test('progress: one counter drives all four, capped at each target', () => {
  const s = byId(states(37));
  assert.equal(s.casino_starter.progress, 20);
  assert.equal(s.casino_regular.progress, 37);
  assert.equal(s.casino_pro.progress, 37);
  assert.equal(s.casino_legend.progress, 37);
  for (const x of Object.values(s)) assert.equal(x.rounds, 37);
});

test('claimable when rounds >= target (exact boundary)', () => {
  assert.equal(countClaimable(states(0)), 0);
  assert.equal(countClaimable(states(19)), 0);
  assert.equal(countClaimable(states(20)), 1);
  assert.equal(countClaimable(states(49)), 1);
  assert.equal(countClaimable(states(50)), 2);
  assert.equal(countClaimable(states(120)), 3);
  assert.equal(countClaimable(states(250)), 4);
});

test('claimed today: not claimable again, others still are', () => {
  const claims = { day: DAY, ids: ['casino_starter'] };
  const s = byId(states(120, claims));
  assert.equal(s.casino_starter.claimed, true);
  assert.equal(s.casino_starter.claimable, false);
  assert.equal(s.casino_regular.claimable, true);
  assert.equal(countClaimable(states(120, claims)), 2);
});

test('recordClaim: once per mission per day, only when reached', () => {
  const st = states(60);
  const c1 = recordClaim(null, 'casino_starter', DAY, st);
  assert.deepEqual(c1, { day: DAY, ids: ['casino_starter'] });
  // second claim the same day is refused
  assert.equal(recordClaim(c1, 'casino_starter', DAY, states(60, c1)), null);
  // locked mission (100 rounds needed) is refused
  assert.equal(recordClaim(c1, 'casino_pro', DAY, states(60, c1)), null);
  // unknown id is refused
  assert.equal(recordClaim(c1, 'nope', DAY, states(60, c1)), null);
  const c2 = recordClaim(c1, 'casino_regular', DAY, states(60, c1));
  assert.deepEqual(c2, { day: DAY, ids: ['casino_starter', 'casino_regular'] });
});

test('daily reset: yesterday\'s claims do not block today', () => {
  const yesterday = { day: '2026-10-06', ids: ['casino_starter', 'casino_regular'] };
  assert.deepEqual(claimsForDay(yesterday, DAY), []);
  const s = byId(states(60, yesterday));
  assert.equal(s.casino_starter.claimable, true);
  assert.equal(s.casino_regular.claimable, true);
  const c = recordClaim(yesterday, 'casino_starter', DAY, states(60, yesterday));
  assert.deepEqual(c, { day: DAY, ids: ['casino_starter'] }); // old day dropped
});

test('daily reset: rounds reported for a past day count as 0 today', () => {
  const s = casinoMissionStates(CASINO_MISSIONS, { rounds: 250, progressDay: '2026-10-06', today: DAY });
  assert.equal(countClaimable(s), 0);
  assert.ok(s.every(x => x.rounds === 0 && x.progress === 0));
  // no feed data at all
  const none = casinoMissionStates(CASINO_MISSIONS, { rounds: 0, progressDay: null, today: DAY });
  assert.ok(none.every(x => x.rounds === 0 && !x.claimable));
});

test('claimsForDay tolerates junk / legacy state', () => {
  assert.deepEqual(claimsForDay(undefined, DAY), []);
  assert.deepEqual(claimsForDay({ day: DAY }, DAY), []);
  assert.deepEqual(claimsForDay({ day: DAY, ids: 'x' }, DAY), []);
});

test('overrides: dashboard can retune or disable casino missions by id', () => {
  const tuned = applyMissionOverrides(CASINO_MISSIONS, {
    casino_starter: { target: 10, reward: { kwacha: 75 } },
    casino_legend: { enabled: false },
    d_daily: { enabled: false }, // a parked id is simply ignored
  });
  assert.deepEqual(tuned.map(m => m.id), ['casino_starter', 'casino_regular', 'casino_pro']);
  const starter = tuned[0];
  assert.equal(starter.target, 10);
  assert.deepEqual(starter.reward, { kwacha: 75 });
  // the retuned target drives claimability
  const s = byId(casinoMissionStates(tuned, { rounds: 12, progressDay: DAY, today: DAY }));
  assert.equal(s.casino_starter.claimable, true);
  assert.equal(s.casino_regular.claimable, false);
  // the base definitions are untouched
  assert.equal(CASINO_MISSIONS[0].target, 20);
});
