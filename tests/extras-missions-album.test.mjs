import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPORTS_MISSIONS, sportsMissionStates, recordSportsClaim, weekendOf, isWeekend, sportsTerms } from '../lib/missions/sports.mjs';
import { albumCards, albumSets, earnedCount, ALBUM_SETS } from '../lib/album/cards.mjs';

const WED = '2026-10-21', SAT = '2026-10-24', SUN = '2026-10-25';

test('weekendOf: Mon–Fri point at the coming Saturday; Sat/Sun at their own', () => {
  assert.equal(weekendOf(WED), SAT);
  assert.equal(weekendOf(SAT), SAT);
  assert.equal(weekendOf(SUN), SAT);
  assert.equal(weekendOf('2026-10-26'), '2026-10-31');
  assert.ok(isWeekend(SAT) && isWeekend(SUN) && !isWeekend(WED));
});

test('daily sports missions count today\'s slips only', () => {
  const rows = [{ day: '2026-10-20', sports_slips: 9 }, { day: WED, sports_slips: 4 }];
  const st = sportsMissionStates(SPORTS_MISSIONS, { rows, today: WED });
  const by = Object.fromEntries(st.map(s => [s.mission.id, s]));
  assert.equal(by.sports_starter.claimable, true);
  assert.equal(by.sports_pro.progress, 4);
  assert.equal(by.sports_pro.claimable, false);
  assert.equal(by.sports_weekend.open, false, 'weekend mission closed mid-week');
  assert.equal(sportsTerms(by.sports_starter.mission), 'PLACE 3 BETS AT ODDS 1.5+ TODAY');
});

test('weekend mission sums Sat + Sun and is claimed once per weekend', () => {
  const rows = [{ day: SAT, sports_slips: 5 }, { day: SUN, sports_slips: 3 }];
  let st = sportsMissionStates(SPORTS_MISSIONS, { rows, today: SUN });
  const w = st.find(s => s.mission.id === 'sports_weekend');
  assert.equal(w.slips, 8);
  assert.equal(w.claimable, true);
  const claims = recordSportsClaim(null, 'sports_weekend', SUN, st);
  assert.deepEqual(claims.weekendIds, ['sports_weekend']);
  st = sportsMissionStates(SPORTS_MISSIONS, { rows, today: SUN, claims });
  assert.equal(st.find(s => s.mission.id === 'sports_weekend').claimed, true);
  assert.equal(recordSportsClaim(claims, 'sports_weekend', SUN, st), null, 'no second claim');
  // next weekend starts fresh
  const next = sportsMissionStates(SPORTS_MISSIONS, { rows: [{ day: '2026-10-31', sports_slips: 8 }], today: '2026-10-31', claims });
  assert.equal(next.find(s => s.mission.id === 'sports_weekend').claimable, true);
});

test('daily claim resets the next day; bad rows count 0', () => {
  const rows = [{ day: WED, sports_slips: 3 }];
  const st = sportsMissionStates(SPORTS_MISSIONS, { rows, today: WED });
  const claims = recordSportsClaim({}, 'sports_starter', WED, st);
  assert.deepEqual(claims.ids, ['sports_starter']);
  const tomorrow = sportsMissionStates(SPORTS_MISSIONS, { rows: [{ day: '2026-10-22', sports_slips: 'x' }], today: '2026-10-22', claims });
  assert.equal(tomorrow[0].claimed, false);
  assert.equal(tomorrow[0].slips, 0);
});

test('album: locked cards never name the place; stage cards follow the stage', () => {
  const cards = albumCards({ stage: 3 });
  const stages = cards.filter(c => c.id.startsWith('stage-'));
  assert.equal(stages.length, 19);
  assert.equal(stages.filter(c => c.earned).length, 3);
  assert.equal(stages[3].title, '?');
  assert.equal(stages[3].image, null);
  assert.equal(stages[1].title, 'Copperbelt Football Academy');
  assert.equal(earnedCount(cards), 3);
});

test('album: rivals, World Cup wins and side quests; set bonuses once', () => {
  const league = { matches: [{ status: 'won', opponent: 'Lusaka Dynamics' }, { status: 'lost', opponent: 'Fish Eagles FC' }] };
  const worldCup = { rounds: [{ id: 'g1', label: 'Group match 1', opponent: 'Morocco', status: 'won' }] };
  const hustle = { unlocked: true, level: { level: 2 } };
  const cards = albumCards({ stage: 11, league, worldCup, hustle });
  assert.ok(cards.find(c => c.id === 'rival-Lusaka Dynamics').earned);
  assert.ok(!cards.find(c => c.id === 'rival-Fish Eagles FC').earned);
  assert.ok(cards.find(c => c.id === 'wc-g1').earned);
  assert.equal(cards.filter(c => c.set === 'quests' && c.earned).length, 2);
  const sets = albumSets(cards, []);
  const zambia = sets.find(s => s.id === 'zambia');
  assert.equal(zambia.complete, true);
  assert.equal(zambia.claimable, true);
  assert.equal(albumSets(cards, ['zambia']).find(s => s.id === 'zambia').claimable, false);
  assert.equal(sets.find(s => s.id === 'abroad').claimable, false);
  assert.equal(sets.length, ALBUM_SETS.length);
});
