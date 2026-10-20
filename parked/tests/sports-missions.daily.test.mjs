import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPORTS_MISSIONS, sportsMissionStates, recordSportsClaim, weekendOf, isWeekend, sportsTerms } from '../lib/missions/sports.daily.mjs';
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

