import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSeasonXp, addDays } from '../lib/season/xp.mjs';
import { leagueState, claimLeagueBonus, tierForStage, LEAGUE_TIERS, teamSlug, opponentArt, vumaArt } from '../lib/season/league.mjs';

const W1 = '2026-09-07'; // Monday
const row = (day, casino_stake) => ({ day, casino_stake });

function sampleSeason() {
  const rows = [];
  for (let w = 0; w < 2; w++) for (let i = 0; i < 5; i++) rows.push(row(addDays(W1, w * 7 + i), 4000)); // weeks 1-2: 2,000 each
  rows.push(row(addDays(W1, 14), 4000)); // week 3: 400 only
  for (let i = 0; i < 3; i++) rows.push(row(addDays(W1, 21 + i), 4000)); // week 4: exactly 1,200
  rows.push(row(addDays(W1, 28), 3000)); // week 5 (current): 300 so far
  return computeSeasonXp({ rows, today: addDays(W1, 30) });
}

test('no league before stage 6 (3,000 XP)', () => {
  const s = computeSeasonXp({ rows: [row(W1, 4000)] });
  const L = leagueState({ season: s, today: W1 });
  assert.equal(L.unlocked, false);
  assert.deepEqual(L.matches, []);
  assert.deepEqual(L.record, { played: 0, won: 0, lost: 0, points: 0 });
});

test('weekly matches from the unlock week: won / lost / live, record and points', () => {
  const s = sampleSeason();
  const today = addDays(W1, 30); // Wednesday of week 5
  const now = Date.parse(`${today}T12:00:00Z`);
  const L = leagueState({ season: s, today, now });
  assert.equal(L.unlocked, true);
  assert.equal(L.unlockDay, addDays(W1, 9), 'stage 6 reached on Wednesday of week 2 (3,200 XP)');
  assert.deepEqual(L.matches.map(m => [m.weekStart, m.xp, m.status, m.bonus]), [
    [addDays(W1, 7), 2000, 'won', 150],
    [addDays(W1, 14), 400, 'lost', 0],
    [addDays(W1, 21), 1200, 'won', 150],
    [addDays(W1, 28), 300, 'live', 0],
  ]);
  assert.deepEqual(L.matches.map(m => m.opponent), ['Lusaka Dynamics', 'Emerald Buffaloes', 'Fish Eagles FC', 'Lusaka Dynamics'],
    'week 5 would be Crimson Arrows FC, but Vuma plays FOR Crimson Arrows by then (stage 7): next name instead');
  assert.deepEqual(L.matches.map(m => [m.homeStage, m.home]), [[6, 'Kafue Gaels FC'], [6, 'Kafue Gaels FC'], [6, 'Kafue Gaels FC'], [7, 'Crimson Arrows FC']]);
  assert.deepEqual(L.matches.map(m => m.slug), ['lusaka-dynamics', 'emerald-buffaloes', 'fish-eagles-fc', 'lusaka-dynamics']);
  assert.ok(L.matches.every(m => m.tier === 'zambia' && m.target === 1200));
  assert.deepEqual(L.record, { played: 3, won: 2, lost: 1, points: 6 });
  const cur = L.current;
  assert.equal(cur.status, 'live');
  assert.equal(cur.gap, 900);
  assert.equal(cur.weekEnd, addDays(W1, 34));
  assert.equal(cur.msLeft, (4 * 24 + 10) * 3600000, 'until Sunday 22:00 UTC (Lusaka midnight)');
});

test('the week boundary: a short week stays live until Sunday ends, then it is lost', () => {
  const s = computeSeasonXp({ rows: [...Array.from({ length: 8 }, (_, i) => row(addDays(W1, i < 5 ? i : i + 2), 4000))] });
  // weeks: W1 Mon-Fri 2,000; W2 Mon-Wed 1,200 -> unlock Mon W2 (2,400 >= 3,000? no) -> Tue W2 (2,800) -> Wed W2 3,200
  const sunday = addDays(W1, 13);
  const sh = computeSeasonXp({ rows: [...Array.from({ length: 5 }, (_, i) => row(addDays(W1, i), 4000)), row(addDays(W1, 7), 4000), row(addDays(W1, 8), 4000), row(addDays(W1, 9), 2500)] });
  // W2 = 400 + 400 + 250 = 1,050 (< 1,200); stage 6 at 3,050 on Wed
  let L = leagueState({ season: sh, today: sunday });
  assert.equal(L.current.status, 'live', 'still live on Sunday');
  assert.equal(L.current.gap, 150);
  L = leagueState({ season: sh, today: addDays(sunday, 1) });
  assert.equal(L.matches[0].status, 'lost', 'lost once the week has ended');
  assert.equal(L.matches[1].status, 'live', 'the next week is a new match');
  assert.ok(s.xp > 0);
});

test('won as soon as the target is reached, even mid-week', () => {
  const s = sampleSeason();
  const L = leagueState({ season: s, today: addDays(W1, 23) }); // Wednesday of week 4, after its 3rd row
  assert.equal(L.current.weekStart, addDays(W1, 21));
  assert.equal(L.current.status, 'won');
  assert.equal(L.current.msLeft, 0);
});

test('bonus claimable once', () => {
  const s = sampleSeason();
  const today = addDays(W1, 30);
  let L = leagueState({ season: s, today });
  const id = addDays(W1, 7);
  const c1 = claimLeagueBonus([], id, L);
  assert.deepEqual(c1, [id]);
  L = leagueState({ season: s, today, claims: c1 });
  assert.equal(L.matches[0].claimed, true);
  assert.equal(L.matches[0].claimable, false);
  assert.equal(claimLeagueBonus(c1, id, L), null, 'second claim refused');
  assert.equal(claimLeagueBonus(c1, addDays(W1, 14), L), null, 'a lost match has no bonus');
  assert.equal(claimLeagueBonus(c1, addDays(W1, 28), L), null, 'a live match has no bonus');
  assert.equal(claimLeagueBonus(c1, 'nope', L), null);
});

test('tiers follow the story chapters; bonus per tier', () => {
  assert.deepEqual([6, 7, 8, 9, 10, 11, 15, 16, 17].map(tierForStage), ['zambia', 'zambia', 'zambia', 'zambia', 'southAfrica', 'england', 'england', 'top', 'top']);
  assert.equal(tierForStage(1), 'zambia');
  // a long season: the week starting at stage 10+ plays a South African side for 250
  const rows = [];
  for (let d = 0; d < 7 * 9; d++) if (d % 7 < 5) rows.push(row(addDays(W1, d), 4000)); // 2,000 a week for 9 weeks
  const s = computeSeasonXp({ rows });
  const L = leagueState({ season: s, today: addDays(W1, 7 * 9 - 1) });
  const sa = L.matches.find(m => m.tier === 'southAfrica');
  assert.ok(sa, 'reached stage 10 (12,600 XP) after week 7');
  assert.equal(sa.weekStart, addDays(W1, 49), 'week 8 starts at 14,000 XP');
  assert.equal(sa.bonus, 250);
  assert.ok(LEAGUE_TIERS.southAfrica.opponents.includes(sa.opponent));
});

test('opponents are synonym parodies with versus art, never real club names', () => {
  const real = ['Lusaka Dynamos', 'Green Buffaloes', 'Nkwazi', 'Red Arrows', 'Orlando Pirates', 'Mamelodi Sundowns', 'Kaizer Chiefs', 'Arsenal', 'Liverpool', 'Tottenham Hotspur', 'Newcastle United'];
  const ART = ['lusaka-dynamics', 'emerald-buffaloes', 'fish-eagles-fc', 'crimson-arrows-fc', 'orlando-buccaneers', 'mamelodi-sunsets', 'arsenal-armoury-fc', 'liverpool-harbour', 'tottenham-cockerels', 'newcastle-union'];
  for (const t of Object.values(LEAGUE_TIERS)) {
    assert.equal(new Set(t.opponents).size, t.opponents.length, `${t.id}: no duplicates`);
    for (const o of t.opponents) {
      assert.ok(!real.includes(o), o);
      assert.ok(ART.includes(teamSlug(o)), `${o} has art`);
    }
  }
  assert.equal(opponentArt('Fish Eagles FC'), '/vuma/vs/opp-fish-eagles-fc.png');
  assert.equal(opponentArt('USA'), '/vuma/vs/opp-usa.png');
  assert.equal(vumaArt(7), '/vuma/vs/vuma-07.png');
  assert.equal(vumaArt('zambia'), '/vuma/vs/vuma-zambia.png');
});
