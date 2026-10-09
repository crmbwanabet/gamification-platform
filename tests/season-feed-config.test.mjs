import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validatePlayerBatch, collapsePlayerBatch, mergePlayerWithStored } from '../lib/season/feed.mjs';
import { cleanSeasonConfig, seasonDefaults, SEASON_DEFAULTS } from '../lib/season/config.mjs';
import { mergeConfig } from '../lib/config/merge.mjs';

const NOW = new Date('2026-10-09T10:00:00Z');
const ok = { userId: '123456', date: '2026-10-09', depositsAmount: 100, depositsCount: 1, withdrawalsAmount: 0, casinoStake: 250.5, casinoRounds: 80, sportsStake: 40, sportsSlips: 2 };

test('player feed: valid rows become table rows', () => {
  const v = validatePlayerBatch([ok, { ...ok, userId: 789, date: '2026-10-08', casinoStake: '12.345' }], { now: NOW });
  assert.deepEqual(v.rejected, []);
  assert.deepEqual(v.rows[0], { user_id: '123456', day: '2026-10-09', deposits_amount: 100, deposits_count: 1, withdrawals_amount: 0, casino_stake: 250.5, casino_rounds: 80, sports_stake: 40, sports_slips: 2 });
  assert.equal(v.rows[1].user_id, '789');
  assert.equal(v.rows[1].casino_stake, 12.35, 'rounded to the ngwee');
  assert.deepEqual(validatePlayerBatch({ rows: [ok] }, { now: NOW }).rows.length, 1);
});

test('player feed: whole-batch errors', () => {
  assert.equal(validatePlayerBatch('x', { now: NOW }).error, 'not_an_array');
  assert.equal(validatePlayerBatch([], { now: NOW }).error, 'empty_batch');
  assert.equal(validatePlayerBatch(Array(1001).fill(ok), { now: NOW }).error, 'batch_too_large');
});

test('player feed: per-row rejections (±2 days, ids, bad numbers), missing fields = 0', () => {
  const v = validatePlayerBatch([
    { ...ok, date: '2026-10-12' },
    { ...ok, userId: 'abc' },
    { ...ok, date: '2026-02-30' },
    { ...ok, casinoStake: -1 },
    { ...ok, casinoRounds: 1.5 },
    { ...ok, sportsStake: 'lots' },
    { userId: 1, date: '2026-10-09' },
    { userId: 1, date: '2026-10-07', casinoStake: 10 },
    [],
  ], { now: NOW });
  assert.deepEqual(v.rejected.map(r => r.error), ['date_out_of_range', 'bad_user_id', 'bad_date', 'bad_casinoStake', 'bad_casinoRounds', 'bad_sportsStake', 'no_fields', 'not_an_object']);
  assert.equal(v.rows.length, 1);
  assert.equal(v.rows[0].deposits_amount, 0);
  assert.equal(v.rows[0].casino_stake, 10);
});

test('player feed: max-wins per column inside a batch and against stored rows', () => {
  const a = { user_id: '1', day: '2026-10-09', deposits_amount: 100, deposits_count: 1, withdrawals_amount: 0, casino_stake: 50, casino_rounds: 10, sports_stake: 0, sports_slips: 0 };
  const b = { ...a, deposits_amount: 50, casino_stake: 80, sports_slips: 3 };
  assert.deepEqual(collapsePlayerBatch([a, b]), [{ ...a, casino_stake: 80, sports_slips: 3 }]);
  const stored = [{ ...a, deposits_amount: '300.00', casino_rounds: 5, updated_at: 'x' }];
  const m = mergePlayerWithStored([a], stored);
  assert.equal(m[0].deposits_amount, 300, 'a lower resend never lowers a stored value');
  assert.equal(m[0].casino_rounds, 10);
});

test('season config: clean + clamp; bad values keep the default', () => {
  const c = cleanSeasonConfig({
    id: 'S2', startDay: '2026-11-01', dailyCap: 500, weeklyCap: -5, platformDailyCap: 'x',
    crm: { casinoStakePerXp: 20, depositDayXp: 0 },
    hustle: { levels: [{ pay: 30 }, { stock: 2000, pay: 60 }] },
    league: { winXp: 1500, bonus: { zambia: 200, nope: 5 } },
    worldCup: { rounds: [{ target: 1000, bonus: 700, opponent: 'Hacked' }], prizeKwacha: 5000 },
    junk: true,
  });
  assert.equal(c.id, 'S2');
  assert.equal(c.startDay, '2026-11-01');
  assert.equal(c.dailyCap, 500);
  assert.equal(c.weeklyCap, 1, 'clamped into its band');
  assert.equal(c.platformDailyCap, 60);
  assert.deepEqual(c.crm, { casinoStakePerXp: 20, sportsStakePerXp: 4, depositDayXp: 0 });
  assert.deepEqual(c.hustle.levels.slice(0, 2).map(l => [l.stock, l.pay]), [[0, 30], [2000, 60]]);
  assert.equal(c.league.winXp, 1500);
  assert.equal(c.league.bonus.zambia, 200);
  assert.equal(c.league.bonus.nope, undefined);
  assert.deepEqual([c.worldCup.rounds[0].target, c.worldCup.rounds[0].bonus, c.worldCup.rounds[0].opponent], [1000, 700, 'Morocco']);
  assert.equal(c.worldCup.prizeKwacha, 5000);
  assert.equal(c.junk, undefined);
  // non-rising hustle thresholds drop the levels override
  assert.deepEqual(cleanSeasonConfig({ hustle: { levels: [{}, { stock: 9000 }, { stock: 100 }] } }).hustle.levels, seasonDefaults().hustle.levels);
  assert.equal(cleanSeasonConfig({ id: 'bad id!' }).id, 'S1');
  assert.deepEqual(cleanSeasonConfig(null), seasonDefaults());
  assert.equal(SEASON_DEFAULTS.id, 'S1');
});

test('remote config: the season row merges over the defaults', () => {
  const defaults = { season: seasonDefaults(), games: {}, economy: {} };
  const out = mergeConfig(defaults, [{ key: 'season', value: { dailyCap: 300, league: { winXp: 1000 } } }]);
  assert.equal(out.season.dailyCap, 300);
  assert.equal(out.season.league.winXp, 1000);
  assert.equal(out.season.weeklyCap, 2000);
  assert.deepEqual(mergeConfig(defaults, [{ key: 'season', value: 'junk' }]).season, seasonDefaults());
  assert.equal(defaults.season.dailyCap, 400, 'defaults untouched');
});
