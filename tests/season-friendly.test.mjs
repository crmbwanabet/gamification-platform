import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSeasonXp, addDays } from '../lib/season/xp.mjs';
import { leagueState } from '../lib/season/league.mjs';
import { worldCupState } from '../lib/season/worldcup.mjs';
import { verifyWorldCupPrize, worldCupPrizeMessage } from '../lib/season/verify.mjs';
import { cleanSeasonConfig, SEASON_DEFAULTS, seasonDefaults } from '../lib/season/config.mjs';
import {
  friendlyTarget, friendlyCost, friendlyOpponent, fullTimeMs, friendlyDays, acceptFriendly, declineFriendly,
  cleanFriendlies, FRIENDLY_OPPONENTS,
} from '../lib/season/friendly.mjs';
import { mergeConfig } from '../lib/config/merge.mjs';

const H = 3600000;
const at = (day, lusakaHour = 12) => Date.parse(`${day}T00:00:00Z`) - 2 * H + lusakaHour * H; // Lusaka wall clock

// ---- league fixture -------------------------------------------------------
const W1 = '2026-09-07'; // Monday
const row = (day, casino_stake = 4000) => ({ day, casino_stake }); // 4000 -> 400 XP (the daily cap)
/** weeks 1-2: 2,000 each (stage 6 on Wed of week 2); week 3 lost with 400; `friendlyDays` rows from Mon of week 4. */
function leagueSeason(week4 = []) {
  const rows = [];
  for (let w = 0; w < 2; w++) for (let i = 0; i < 5; i++) rows.push(row(addDays(W1, w * 7 + i)));
  rows.push(row(addDays(W1, 14)));
  week4.forEach((stake, i) => { if (stake) rows.push(row(addDays(W1, 21 + i), stake)); });
  return computeSeasonXp({ rows });
}
const WK3 = addDays(W1, 14);
const MON4 = addDays(W1, 21);
const lost = (L) => L.matches.find(m => m.id === WK3);

test('numbers: half the target rounded up to 10, costs, the Final excluded', () => {
  assert.deepEqual([1200, 1400, 1600, 1700, 1800, 1900, 1205].map(t => friendlyTarget(t)), [600, 700, 700, 700, 700, 700, 610]);
  assert.deepEqual(Object.values(SEASON_DEFAULTS.league.bonus).map(b => friendlyCost('league', null, b)), [75, 125, 200, 300]);
  assert.equal(friendlyCost('wc', 'group', 500), 250);
  assert.equal(friendlyCost('wc', 'knockout', 1000), 1000);
  assert.equal(friendlyCost('wc', 'final', 0), null);
  assert.deepEqual(SEASON_DEFAULTS.friendly, { offerHours: 24, windowHours: 24, targetPercent: 50, roundTo: 10, maxTarget: 700, leagueCostPercent: 50, wcGroupCost: 250, wcKnockoutCost: 1000 });
});

test('remote config: friendly numbers overridable and clamped; old bases get the defaults', () => {
  const c = cleanSeasonConfig({ friendly: { wcGroupCost: 300, targetPercent: 400, offerHours: -5, roundTo: 'x' } });
  assert.equal(c.friendly.wcGroupCost, 300);
  assert.equal(c.friendly.targetPercent, 100);
  assert.equal(c.friendly.offerHours, 1);
  assert.equal(c.friendly.roundTo, 10);
  const base = seasonDefaults(); delete base.friendly;
  assert.deepEqual(cleanSeasonConfig({}, base).friendly, seasonDefaults().friendly);
  const merged = mergeConfig({ season: seasonDefaults() }, [{ key: 'season', value: { friendly: { wcKnockoutCost: 1500 } } }]);
  assert.equal(merged.season.friendly.wcKnockoutCost, 1500);
});

test('opponents: weaker local sides, synonym parodies, deterministic', () => {
  const real = ['Kabwe Warriors', 'Nchanga Rangers', 'Lusaka Dynamos', 'Nkwazi', 'Power Dynamos', 'Green Buffaloes'];
  for (const o of FRIENDLY_OPPONENTS) assert.ok(!real.includes(o), o);
  assert.equal(friendlyOpponent('league:2026-09-21'), friendlyOpponent('league:2026-09-21'));
  assert.ok(FRIENDLY_OPPONENTS.includes(friendlyOpponent('wc:r32')));
});

test('league: the offer opens at full-time for 24 hours, then expires', () => {
  const s = leagueSeason();
  // still Sunday: the week is live, no offer
  let L = leagueState({ season: s, today: addDays(W1, 20), now: at(addDays(W1, 20), 23) });
  assert.equal(lost(L).status, 'live');
  assert.equal(lost(L).friendly, null);
  // Monday 10:00 Lusaka
  const now = at(MON4, 10);
  L = leagueState({ season: s, today: MON4, now });
  const m = lost(L);
  assert.equal(m.status, 'lost');
  const f = m.friendly;
  assert.equal(f.status, 'offer');
  assert.equal(f.key, `league:${WK3}`);
  assert.equal(f.cost, 75);
  assert.equal(f.target, 600);
  assert.equal(f.winBonus, 150);
  assert.equal(f.winPoints, 3);
  assert.equal(f.fullTimeAt, fullTimeMs(addDays(W1, 20)));
  assert.equal(f.msLeft, 14 * H, 'OFFER ENDS IN: until Monday 24:00 Lusaka');
  assert.deepEqual(L.friendlies.map(x => x.key), [f.key]);
  // Tuesday 00:00 Lusaka: gone
  L = leagueState({ season: s, today: addDays(MON4, 1), now: at(addDays(MON4, 1), 0) });
  assert.equal(lost(L).friendly.status, 'expired');
  assert.deepEqual(L.friendlies, []);
  assert.equal(acceptFriendly({}, lost(L).friendly, at(addDays(MON4, 1), 0)), null, 'an expired offer cannot be accepted');
});

test('league: accept -> live 24h from the accept time, counted over the Lusaka days it touches', () => {
  const now = at(MON4, 10);
  let L = leagueState({ season: leagueSeason(), today: MON4, now });
  const fr = acceptFriendly({}, lost(L).friendly, now);
  assert.deepEqual(fr, { [`league:${WK3}`]: { acceptedAt: new Date(now).toISOString(), paid: 75 } });
  assert.deepEqual(friendlyDays(now), { from: MON4, to: addDays(MON4, 1), deadline: now + 24 * H });
  // one day of play: 400 / 600, live
  L = leagueState({ season: leagueSeason([4000]), today: MON4, now: now + 2 * H, friendlies: fr });
  let f = lost(L).friendly;
  assert.equal(f.status, 'live');
  assert.equal(f.xp, 400);
  assert.equal(f.gap, 200);
  assert.equal(f.msLeft, 22 * H);
  assert.equal(lost(L).status, 'lost', 'the loss stands while the friendly is live');
  assert.equal(acceptFriendly(fr, f, now + 3 * H), null, 'no second accept');
  // the same XP counts toward the week-4 match too
  assert.equal(L.current.xp, 400);
  // won on Tuesday: the loss is reversed (bonus + 3 points)
  L = leagueState({ season: leagueSeason([4000, 4000]), today: addDays(MON4, 1), now: now + 20 * H, friendlies: fr });
  f = lost(L).friendly;
  assert.equal(f.status, 'won');
  assert.equal(lost(L).status, 'won');
  assert.equal(lost(L).viaFriendly, true);
  assert.equal(lost(L).bonus, 150);
  assert.equal(lost(L).claimable, true);
  assert.deepEqual(L.record, { played: 2, won: 2, lost: 0, points: 6 });
});

test('league: lose the friendly = the loss stands, no refund; days after the window do not count', () => {
  const now = at(MON4, 10);
  const fr = { [`league:${WK3}`]: { acceptedAt: new Date(now).toISOString(), paid: 75 } };
  const L = leagueState({ season: leagueSeason([4000, 1000, 4000]), today: addDays(MON4, 2), now: now + 25 * H, friendlies: fr });
  const f = lost(L).friendly;
  assert.equal(f.xp, 500, 'Mon 400 + Tue 100; Wednesday is outside');
  assert.equal(f.status, 'lost');
  assert.equal(f.paid, 75);
  assert.equal(lost(L).status, 'lost');
  assert.equal(lost(L).bonus, 0);
  assert.deepEqual(L.friendlies, []);
});

test('league: an accept time outside the offer window is ignored; decline', () => {
  const now = at(addDays(MON4, 1), 10);
  const early = { [`league:${WK3}`]: { acceptedAt: new Date(at(addDays(W1, 20), 20)).toISOString(), paid: 75 } }; // before full-time
  const late = { [`league:${WK3}`]: { acceptedAt: new Date(at(addDays(MON4, 1), 1)).toISOString(), paid: 75 } }; // offer over
  for (const fr of [early, late]) {
    const f = lost(leagueState({ season: leagueSeason([4000, 4000]), today: addDays(MON4, 1), now, friendlies: fr })).friendly;
    assert.equal(f.status, 'expired');
  }
  const t = at(MON4, 9);
  const open = lost(leagueState({ season: leagueSeason(), today: MON4, now: t })).friendly;
  const d = declineFriendly({}, open, t);
  assert.ok(d[open.key].declinedAt);
  const f = lost(leagueState({ season: leagueSeason(), today: MON4, now: t + H, friendlies: d })).friendly;
  assert.equal(f.status, 'declined');
  assert.equal(acceptFriendly(d, f, t + H), null);
});

test('cleanFriendlies: hydration of old / junk state', () => {
  assert.deepEqual(cleanFriendlies(undefined), {});
  assert.deepEqual(cleanFriendlies([1]), {});
  const ok = cleanFriendlies({ 'league:2026-09-21': { acceptedAt: '2026-09-28T08:00:00.000Z', paid: 75.9 }, 'wc:r32': { declinedAt: 5 }, 'evil:x': { acceptedAt: 1 }, 'wc:g1': { acceptedAt: 'nope' } });
  assert.deepEqual(ok, { 'league:2026-09-21': { acceptedAt: '2026-09-28T08:00:00.000Z', paid: 75 }, 'wc:r32': { declinedAt: '1970-01-01T00:00:00.005Z' } });
});

// ---- World Cup fixture (as tests/season-worldcup.test.mjs) ------------------
const D0 = '2026-01-05';
const CFG = cleanSeasonConfig({ weeklyCap: 700000 });
const U = addDays(D0, 97); // stage 16 day
const grind = () => Array.from({ length: 98 }, (_, i) => row(addDays(D0, i)));
/** windows: 'W' (2,000) / 'L' (400) / '-' per window; extra = additional rows. */
function cupRows(windows, extra = [], shiftAfter = null) {
  const rows = grind();
  let start = addDays(U, 1);
  windows.split('').forEach((w, i) => {
    if (shiftAfter != null && i === shiftAfter + 1) start = addDays(start, 2); // friendly days
    const n = w === 'W' ? 5 : w === 'L' ? 1 : 0;
    for (let k = 0; k < n; k++) rows.push(row(addDays(start, k)));
    start = addDays(start, 6);
  });
  return [...rows, ...extra.map(d => row(d))];
}
const cup = (rows, today, now, friendlies) => worldCupState({ season: computeSeasonXp({ rows, cfg: CFG }), today, cfg: CFG, now, friendlies });

test('World Cup group: loss -> offer (250 coins, 700 XP); won friendly = bonus claimable, schedule unchanged', () => {
  const g1End = addDays(U, 6);
  const offerDay = addDays(g1End, 1);
  let w = cup(cupRows('L'), offerDay, at(offerDay, 8));
  const f = w.rounds[0].friendly;
  assert.equal(f.status, 'offer');
  assert.equal(f.cost, 250);
  assert.equal(f.target, 700);
  assert.equal(f.winBonus, 500);
  assert.equal(w.eliminated, false);
  assert.equal(w.current.id, 'g2', 'group: Zambia plays on meanwhile');
  const fr = acceptFriendly({}, f, at(offerDay, 8));
  w = cup(cupRows('L', [offerDay, addDays(offerDay, 1)]), addDays(offerDay, 1), at(addDays(offerDay, 1), 9), fr);
  assert.equal(w.rounds[0].status, 'won');
  assert.equal(w.rounds[0].viaFriendly, true);
  assert.equal(w.rounds[0].bonus, 500);
  assert.equal(w.rounds[0].claimable, true);
  assert.equal(w.rounds[1].start, addDays(U, 7), 'group friendlies never move the schedule');
});

test('World Cup knockout: offer (1,000 coins) while out; accepted -> reinstated pending, next round shifted; won -> continues', () => {
  const r32End = addDays(U, 24);
  const offerDay = addDays(r32End, 1);
  let w = cup(cupRows('WWWL'), offerDay, at(offerDay, 7));
  const f = w.rounds[3].friendly;
  assert.equal(f.status, 'offer');
  assert.equal(f.cost, 1000);
  assert.equal(f.target, 700);
  assert.equal(f.winBonus, 0);
  assert.equal(w.eliminated, true, 'out unless the friendly is taken');
  assert.equal(w.rounds[4].status, 'out');
  assert.deepEqual(w.friendlies.map(x => x.key), ['wc:r32']);

  const t = at(offerDay, 7);
  const fr = acceptFriendly({}, f, t);
  w = cup(cupRows('WWWL', [offerDay]), offerDay, t + H, fr);
  assert.equal(w.rounds[3].friendly.status, 'live');
  assert.equal(w.eliminated, false);
  assert.equal(w.knockedOutBy, null);
  assert.equal(w.rounds[4].status, 'upcoming');
  assert.equal(w.rounds[4].start, addDays(r32End, 3), 'the next round starts the day after the friendly ends');
  assert.equal(w.current, null);
  assert.equal(w.next.id, 'r16');

  // friendly won; the rest of the cup won on the shifted windows
  const rows = cupRows('WWWLWWWW', [offerDay, addDays(offerDay, 1)], 3);
  w = cup(rows, addDays(U, 60), at(addDays(U, 60)), fr);
  assert.equal(w.rounds[3].status, 'won');
  assert.equal(w.rounds[3].viaFriendly, true);
  assert.equal(w.rounds[3].bonus, 0, 'a knockout friendly only reinstates Zambia');
  assert.deepEqual(w.rounds.slice(4).map(r => [r.start, r.status]), [
    [addDays(U, 27), 'won'], [addDays(U, 33), 'won'], [addDays(U, 39), 'won'], [addDays(U, 45), 'won']]);
  assert.equal(w.champion, true);
  assert.equal(w.friendly.key, 'wc:r32');

  // friendly lost: knocked out after all
  w = cup(cupRows('WWWL', [offerDay]), addDays(U, 30), at(addDays(U, 30)), fr);
  assert.equal(w.rounds[3].friendly.status, 'lost');
  assert.equal(w.eliminated, true);
  assert.equal(w.knockedOutBy, 'USA');
  assert.equal(w.rounds[4].status, 'out');
});

test('World Cup: ONE friendly per cup run; the Final has none', () => {
  // g1 lost + friendly accepted (lost: no play in g2); r32 lost -> no second friendly
  const g1Off = addDays(U, 7);
  const fr = { 'wc:g1': { acceptedAt: new Date(at(g1Off, 9)).toISOString(), paid: 250 } };
  const r32Off = addDays(U, 25);
  const w = cup(cupRows('L-WL'), r32Off, at(r32Off, 9), fr);
  assert.equal(w.rounds[0].friendly.status, 'lost');
  assert.equal(w.rounds[3].friendly.status, 'unavailable');
  assert.equal(w.eliminated, true);
  assert.deepEqual(w.friendlies, []);
  // the Final
  const fin = cup(cupRows('WWWWWWWL'), addDays(U, 49), at(addDays(U, 49), 9));
  assert.equal(fin.finalRound.status, 'lost');
  assert.equal(fin.finalRound.friendly, null);
  assert.deepEqual(fin.friendlies, []);
});

test('server prize check: a path with one knockout friendly verifies only with a valid accept time', () => {
  const r32End = addDays(U, 24);
  const offerDay = addDays(r32End, 1);
  const rows = cupRows('WWWLWWWW', [offerDay, addDays(offerDay, 1)], 3);
  const today = addDays(U, 60);
  const now = at(today);
  const good = { 'wc:r32': { acceptedAt: new Date(at(offerDay, 7)).toISOString(), paid: 1000 }, 'league:2026-01-05': { acceptedAt: 'x' } };
  const v = verifyWorldCupPrize({ rows, friendlies: good, cfg: CFG, today, now });
  assert.equal(v.won, true);
  assert.equal(v.summary.friendly.round, 'r32');
  assert.equal(v.summary.friendly.status, 'won');
  assert.equal(v.summary.friendly.xp, 800);
  assert.equal(v.summary.rounds[3].viaFriendly, true);
  const text = worldCupPrizeMessage({ uid: '123456', prizeKwacha: 10000, seasonId: 'S1', summary: v.summary });
  assert.match(text, /won back in the friendly/);
  assert.match(text, /🤝 Friendly after the Round of 32 loss to USA: vs .+, accepted .+ UTC, .+: 800\/700 XP ✅/);
  // no friendly reported / accepted too late / a second "friendly" claimed on another round
  assert.equal(verifyWorldCupPrize({ rows, cfg: CFG, today, now }).reason, 'eliminated');
  const late = { 'wc:r32': { acceptedAt: new Date(at(addDays(offerDay, 1), 7)).toISOString() } };
  assert.equal(verifyWorldCupPrize({ rows, friendlies: late, cfg: CFG, today, now }).won, false);
  const future = { 'wc:r32': { acceptedAt: new Date(at(offerDay, 7)).toISOString() } };
  assert.equal(verifyWorldCupPrize({ rows, friendlies: future, cfg: CFG, today, now: at(offerDay, 6) }).won, false, 'accept time in the future');
  // the friendly result is recomputed from the rows: short friendly days -> refused
  const short = cupRows('WWWLWWWW', [offerDay], 3);
  assert.equal(verifyWorldCupPrize({ rows: short, friendlies: good, cfg: CFG, today, now }).won, false);
});

test('friendly target is capped so a 24h window (2 days x 400 XP) can always win it', async () => {
  const { friendlyTarget } = await import('../lib/season/friendly.mjs');
  assert.equal(friendlyTarget(1200), 600);
  assert.equal(friendlyTarget(1700), 700);
  assert.equal(friendlyTarget(1900), 700);
});
