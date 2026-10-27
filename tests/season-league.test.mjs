import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSeasonXp, addDays } from '../lib/season/xp.mjs';
import { leagueState, claimLeagueBonus, tierForStage, LEAGUE_TIERS, teamSlug, opponentArt, vumaArt } from '../lib/season/league.mjs';

const W1 = '2026-09-07'; // Monday
const row = (day, casino_stake) => ({ day, casino_stake });
// Lead-in grind BEFORE W1 so a season reaches the (doubled) stage thresholds at the same weeks as before:
// `xp` capped XP at 400 a day on weekdays, filled backwards from the Friday before W1.
function lead(xp) {
  const rows = [];
  let left = xp;
  for (let d = -1; left > 0; d--) {
    if (((d % 7) + 7) % 7 >= 5) continue;
    const x = Math.min(left, 400);
    rows.push(row(addDays(W1, d), x * 10));
    left -= x;
  }
  return rows;
}

function sampleSeason() {
  const rows = lead(5600);
  for (let w = 0; w < 2; w++) for (let i = 0; i < 5; i++) rows.push(row(addDays(W1, w * 7 + i), 4000)); // weeks 1-2: 2,000 each
  for (let i = 0; i < 3; i++) rows.push(row(addDays(W1, 14 + i), 4000)); // week 3: exactly 1,200 (unlock week)
  rows.push(row(addDays(W1, 21), 4000)); // week 4: 400 only
  for (let i = 0; i < 3; i++) rows.push(row(addDays(W1, 28 + i), 4000)); // week 5: exactly 1,200
  rows.push(row(addDays(W1, 35), 3000)); // week 6 (current): 300 so far
  return computeSeasonXp({ rows, today: addDays(W1, 37) });
}

test('no league before stage 12 (10,000 XP)', () => {
  const s = computeSeasonXp({ rows: [row(W1, 4000)] });
  const L = leagueState({ season: s, today: W1 });
  assert.equal(L.unlocked, false);
  assert.deepEqual(L.matches, []);
  assert.deepEqual(L.record, { played: 0, won: 0, lost: 0, points: 0 });
});

test('weekly matches from the unlock week: won / lost / live, record and points', () => {
  const s = sampleSeason();
  const today = addDays(W1, 37); // Wednesday of week 6
  const now = Date.parse(`${today}T12:00:00Z`);
  const L = leagueState({ season: s, today, now });
  assert.equal(L.unlocked, true);
  assert.equal(L.unlockDay, addDays(W1, 14), 'stage 12 (first pro club, 10,000 XP) reached on Monday of week 3 (5,600 lead-in + 4,000 + 400)');
  assert.deepEqual(L.matches.map(m => [m.weekStart, m.xp, m.status, m.bonus]), [
    [addDays(W1, 14), 1200, 'won', 150],
    [addDays(W1, 21), 400, 'lost', 0],
    [addDays(W1, 28), 1200, 'won', 150],
    [addDays(W1, 35), 300, 'live', 0],
  ]);
  assert.deepEqual(L.matches.map(m => m.opponent), ['Lusaka Dynamics', 'Emerald Buffaloes', 'Fish Eagles FC', 'Lusaka Dynamics'],
    'week 6 would be Crimson Arrows FC, but Vuma plays FOR Crimson Arrows by then (stage 13, 12,400 XP): next name instead');
  assert.deepEqual(L.matches.map(m => [m.homeStage, m.home]), [[12, 'Kafue Gaels FC'], [12, 'Kafue Gaels FC'], [12, 'Kafue Gaels FC'], [13, 'Crimson Arrows FC']]);
  assert.deepEqual(L.matches.map(m => m.slug), ['lusaka-dynamics', 'emerald-buffaloes', 'fish-eagles-fc', 'lusaka-dynamics']);
  assert.ok(L.matches.every(m => m.tier === 'zambia' && m.target === 1200));
  assert.deepEqual(L.record, { played: 3, won: 2, lost: 1, points: 6 });
  const cur = L.current;
  assert.equal(cur.status, 'live');
  assert.equal(cur.gap, 900);
  assert.equal(cur.weekEnd, addDays(W1, 41));
  assert.equal(cur.msLeft, (4 * 24 + 10) * 3600000, 'until Sunday 22:00 UTC (Lusaka midnight)');
});

test('the week boundary: a short week stays live until Sunday ends, then it is lost', () => {
  const s = computeSeasonXp({ rows: [...Array.from({ length: 8 }, (_, i) => row(addDays(W1, i < 5 ? i : i + 2), 4000))] });
  const sunday = addDays(W1, 20);
  const sh = computeSeasonXp({ rows: [
    ...lead(5600),
    ...Array.from({ length: 10 }, (_, i) => row(addDays(W1, i < 5 ? i : i + 2), 4000)), // W1 + W2 Mon-Fri: 4,000
    row(addDays(W1, 14), 4000), row(addDays(W1, 15), 4000), row(addDays(W1, 16), 2500),
  ] });
  // W3 = 400 + 400 + 250 = 1,050 (< 1,200); stage 12 at 10,050 on Wed of W3 (10,000 on Mon)
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
  const L = leagueState({ season: s, today: addDays(W1, 30) }); // Wednesday of week 5, after its 3rd row
  assert.equal(L.current.weekStart, addDays(W1, 28));
  assert.equal(L.current.status, 'won');
  assert.equal(L.current.msLeft, 0);
});

test('bonus claimable once', () => {
  const s = sampleSeason();
  const today = addDays(W1, 37);
  let L = leagueState({ season: s, today });
  const id = addDays(W1, 14);
  const c1 = claimLeagueBonus([], id, L);
  assert.deepEqual(c1, [id]);
  L = leagueState({ season: s, today, claims: c1 });
  assert.equal(L.matches[0].claimed, true);
  assert.equal(L.matches[0].claimable, false);
  assert.equal(claimLeagueBonus(c1, id, L), null, 'second claim refused');
  assert.equal(claimLeagueBonus(c1, addDays(W1, 21), L), null, 'a lost match has no bonus');
  assert.equal(claimLeagueBonus(c1, addDays(W1, 35), L), null, 'a live match has no bonus');
  assert.equal(claimLeagueBonus(c1, 'nope', L), null);
});

test('tiers follow the story chapters; bonus per tier', () => {
  assert.deepEqual([12, 13, 14, 15, 16, 17, 21, 22, 23].map(tierForStage), ['zambia', 'zambia', 'zambia', 'zambia', 'southAfrica', 'england', 'england', 'top', 'top']);
  assert.equal(tierForStage(1), 'zambia');
  assert.equal(tierForStage(5), 'zambia', 'the village chapter falls back to the Zambian tier');
  // a long season: the week starting at stage 16+ plays a South African side for 250
  const rows = lead(10800);
  for (let d = 0; d < 7 * 9; d++) if (d % 7 < 5) rows.push(row(addDays(W1, d), 4000)); // 2,000 a week for 9 weeks
  const s = computeSeasonXp({ rows });
  const L = leagueState({ season: s, today: addDays(W1, 7 * 9 - 1) });
  const sa = L.matches.find(m => m.tier === 'southAfrica');
  assert.ok(sa, 'reached stage 16 (22,000 XP) on Wednesday of week 6 (10,800 lead-in + 11,200)');
  assert.equal(sa.weekStart, addDays(W1, 42), 'week 7 starts at 22,800 XP');
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
