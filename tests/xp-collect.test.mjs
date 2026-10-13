import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starCount, feedNews, splitBarHustle, FEED_SEEN_DAYS } from '../lib/xp/collect.mjs';
import { crmDayXp, crmXpParts } from '../lib/season/xp.mjs';

const row = (day, o = {}) => ({ day, deposits_amount: 0, deposits_count: 0, withdrawals_amount: 0, casino_stake: 0, casino_rounds: 0, sports_stake: 0, sports_slips: 0, ...o });

test('starCount: 1 per 6 XP, clamped 4..12', () => {
  assert.equal(starCount(0), 4);
  assert.equal(starCount(20), 4);
  assert.equal(starCount(48), 8);
  assert.equal(starCount(400), 12);
  assert.equal(starCount('junk'), 4);
});

test('crmXpParts sums to crmDayXp', () => {
  const r = row('2026-10-13', { casino_stake: 405, sports_stake: 65, sports_slips: 4, deposits_amount: 100, deposits_count: 1 });
  assert.deepEqual(crmXpParts(r), { casino: 40, sports: 16, deposit: 30 });
  assert.equal(crmDayXp(r), 86);
  assert.deepEqual(crmXpParts(null), { casino: 0, sports: 0, deposit: 0 });
});

test('feedNews: no marker yet = silent first run (no card), marker set', () => {
  const n = feedNews([row('2026-10-12', { casino_stake: 1000 })], undefined);
  assert.equal(n.first, true);
  assert.equal(n.total, 0);
  assert.equal(n.seen['2026-10-12'].casino, 100);
});

test('feedNews: only growth since the marker counts, per source', () => {
  const seen = feedNews([row('2026-10-13', { casino_stake: 200 })], undefined).seen;
  const n = feedNews([row('2026-10-13', { casino_stake: 600, sports_stake: 64, sports_slips: 4, deposits_amount: 50, deposits_count: 1 })], seen);
  assert.equal(n.first, false);
  assert.deepEqual(n.parts, { casino: 40, sports: 16, deposit: 30 });
  assert.equal(n.total, 86);
  assert.deepEqual(n.stakes, { casino: 400, sports: 64, slips: 4 });
  // replaying the same rows against the new marker shows nothing
  assert.equal(feedNews([row('2026-10-13', { casino_stake: 600, sports_stake: 64, sports_slips: 4, deposits_amount: 50, deposits_count: 1 })], n.seen).total, 0);
});

test('feedNews: a new day is all new; a shrink counts 0; old trimmed days never resurface', () => {
  const seen = { '2026-10-12': { casino: 50, sports: 0, deposit: 0, casinoStake: 500, sportsStake: 0, slips: 0 } };
  const n = feedNews([
    row('2026-10-01', { casino_stake: 9000 }),              // older than the marker: already seen
    row('2026-10-12', { casino_stake: 300 }),               // shrank: 0 new
    row('2026-10-13', { sports_stake: 40, sports_slips: 2 }), // new day
  ], seen);
  assert.deepEqual(n.parts, { casino: 0, sports: 10, deposit: 0 });
});

test('feedNews: marker keeps only the latest days; duplicate days max-win', () => {
  const rows = Array.from({ length: FEED_SEEN_DAYS + 5 }, (_, i) => row(`2026-09-${String(i + 1).padStart(2, '0')}`, { casino_stake: 10 }));
  rows.push(row('2026-09-19', { casino_stake: 990 }));
  const n = feedNews(rows, undefined);
  assert.equal(Object.keys(n.seen).length, FEED_SEEN_DAYS);
  assert.equal(n.seen['2026-09-19'].casino, 99);
});

test('splitBarHustle fills the bar in row order, the rest is overflow', () => {
  const out = splitBarHustle([{ xp: 120 }, { xp: 60 }], 60);
  assert.deepEqual(out.map(r => [r.bar, r.hustle]), [[60, 60], [0, 60]]);
  assert.deepEqual(splitBarHustle([{ xp: 10 }], 99).map(r => [r.bar, r.hustle]), [[10, 0]]);
});
