import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  lusakaDay, isIsoDay, dayDiff, normalizeUserId, validateCasinoBatch,
  mergeDailyTotal, collapseBatch, mergeWithStored, FEED_LIMITS,
} from '../lib/casino/feed.mjs';

const NOW = new Date('2026-10-07T10:00:00Z'); // 12:00 in Lusaka

// ---- Lusaka day ----------------------------------------------------------
test('lusakaDay: UTC+2 all year, rolls over at 22:00 UTC', () => {
  assert.equal(lusakaDay(new Date('2026-10-07T10:00:00Z')), '2026-10-07');
  assert.equal(lusakaDay(new Date('2026-10-07T21:59:59Z')), '2026-10-07'); // 23:59:59 CAT
  assert.equal(lusakaDay(new Date('2026-10-07T22:00:00Z')), '2026-10-08'); // 00:00 CAT
  assert.equal(lusakaDay(new Date('2026-10-07T23:30:00Z')), '2026-10-08'); // still the 7th in UTC
  assert.equal(lusakaDay(new Date('2026-10-08T00:00:00Z')), '2026-10-08'); // UTC midnight = 02:00 CAT
  assert.equal(lusakaDay(new Date('2026-10-07T01:59:59Z')), '2026-10-07');
});

test('lusakaDay: month/year boundaries, no DST shift in March/October', () => {
  assert.equal(lusakaDay(new Date('2026-12-31T22:00:00Z')), '2027-01-01');
  assert.equal(lusakaDay(new Date('2026-03-29T21:59:00Z')), '2026-03-29');
  assert.equal(lusakaDay(new Date('2026-10-25T22:00:00Z')), '2026-10-26');
  assert.equal(lusakaDay(Date.parse('2026-02-28T22:30:00Z')), '2026-03-01');
});

test('isIsoDay / dayDiff', () => {
  assert.equal(isIsoDay('2026-10-07'), true);
  assert.equal(isIsoDay('2026-02-30'), false);
  assert.equal(isIsoDay('2026-10-7'), false);
  assert.equal(isIsoDay('07/10/2026'), false);
  assert.equal(isIsoDay(20261007), false);
  assert.equal(dayDiff('2026-10-07', '2026-10-09'), 2);
  assert.equal(dayDiff('2026-10-07', '2026-10-05'), -2);
  assert.equal(dayDiff('2026-12-31', '2027-01-01'), 1);
});

test('normalizeUserId matches the SSO routes (String(Number(id)))', () => {
  assert.equal(normalizeUserId(12345), '12345');
  assert.equal(normalizeUserId('12345'), '12345');
  assert.equal(normalizeUserId(' 0012345 '), '12345');
  assert.equal(normalizeUserId(0), null);
  assert.equal(normalizeUserId(-4), null);
  assert.equal(normalizeUserId(1.5), null);
  assert.equal(normalizeUserId('abc'), null);
  assert.equal(normalizeUserId('12a'), null);
  assert.equal(normalizeUserId(''), null);
  assert.equal(normalizeUserId(null), null);
  assert.equal(normalizeUserId('99999999999999999'), null); // > 16 digits
});

// ---- payload validator ----------------------------------------------------
test('validator: accepts a bare array and { rows }', () => {
  const row = { userId: '42', date: '2026-10-07', rounds: 37 };
  for (const body of [[row], { rows: [row] }]) {
    const out = validateCasinoBatch(body, { now: NOW });
    assert.deepEqual(out, { rows: [{ user_id: '42', day: '2026-10-07', rounds: 37 }], rejected: [] });
  }
});

test('validator: whole-request errors', () => {
  assert.deepEqual(validateCasinoBatch(null, { now: NOW }), { error: 'not_an_array' });
  assert.deepEqual(validateCasinoBatch({ userId: 1 }, { now: NOW }), { error: 'not_an_array' });
  assert.deepEqual(validateCasinoBatch('[]', { now: NOW }), { error: 'not_an_array' });
  assert.deepEqual(validateCasinoBatch([], { now: NOW }), { error: 'empty_batch' });
  const big = Array.from({ length: FEED_LIMITS.maxBatch + 1 }, () => ({ userId: 1, date: '2026-10-07', rounds: 1 }));
  assert.deepEqual(validateCasinoBatch(big, { now: NOW }), { error: 'batch_too_large' });
  const max = big.slice(1);
  assert.equal(validateCasinoBatch(max, { now: NOW }).rows.length, FEED_LIMITS.maxBatch);
});

test('validator: per-row rejections are reported by index, valid rows kept', () => {
  const out = validateCasinoBatch([
    { userId: '1', date: '2026-10-07', rounds: 5 },       // ok
    'nope',                                                // not_an_object
    { userId: 'x', date: '2026-10-07', rounds: 5 },       // bad_user_id
    { userId: '2', date: '2026-13-01', rounds: 5 },       // bad_date
    { userId: '3', date: '2026-10-10', rounds: 5 },       // +3 days
    { userId: '4', date: '2026-10-04', rounds: 5 },       // -3 days
    { userId: '5', date: '2026-10-07', rounds: -1 },      // bad_rounds
    { userId: '6', date: '2026-10-07', rounds: 2.5 },     // bad_rounds
    { userId: '7', date: '2026-10-07', rounds: '10' },    // bad_rounds (string)
    { userId: '8', date: '2026-10-07', rounds: FEED_LIMITS.maxRounds + 1 }, // bad_rounds
    { userId: 9, date: '2026-10-09', rounds: 0 },         // ok (+2 days, zero)
    { userId: 10, date: '2026-10-05', rounds: FEED_LIMITS.maxRounds },     // ok (-2 days, cap)
    [],                                                    // not_an_object
  ], { now: NOW });
  assert.deepEqual(out.rows.map(r => r.user_id), ['1', '9', '10']);
  assert.deepEqual(out.rejected, [
    { index: 1, error: 'not_an_object' },
    { index: 2, error: 'bad_user_id' },
    { index: 3, error: 'bad_date' },
    { index: 4, error: 'date_out_of_range' },
    { index: 5, error: 'date_out_of_range' },
    { index: 6, error: 'bad_rounds' },
    { index: 7, error: 'bad_rounds' },
    { index: 8, error: 'bad_rounds' },
    { index: 9, error: 'bad_rounds' },
    { index: 12, error: 'not_an_object' },
  ]);
});

test('validator: the ±2-day window follows the Lusaka date, not UTC', () => {
  // 23:30 UTC on the 7th = 01:30 on the 8th in Lusaka -> today is the 8th
  const late = new Date('2026-10-07T23:30:00Z');
  const ok = validateCasinoBatch([{ userId: 1, date: '2026-10-10', rounds: 1 }], { now: late });
  assert.equal(ok.rows.length, 1);
  const stale = validateCasinoBatch([{ userId: 1, date: '2026-10-05', rounds: 1 }], { now: late });
  assert.deepEqual(stale.rejected, [{ index: 0, error: 'date_out_of_range' }]);
});

// ---- absolute-total merge -------------------------------------------------
test('mergeDailyTotal: absolute totals, never decreases, idempotent', () => {
  assert.equal(mergeDailyTotal(undefined, 12), 12);
  assert.equal(mergeDailyTotal(null, 0), 0);
  assert.equal(mergeDailyTotal(10, 37), 37);  // grew
  assert.equal(mergeDailyTotal(37, 37), 37);  // re-sent: same
  assert.equal(mergeDailyTotal(37, 20), 37);  // lower total ignored
});

test('collapseBatch: one row per user/day, highest total wins', () => {
  const out = collapseBatch([
    { user_id: '1', day: '2026-10-07', rounds: 10 },
    { user_id: '1', day: '2026-10-07', rounds: 30 },
    { user_id: '1', day: '2026-10-07', rounds: 20 },
    { user_id: '1', day: '2026-10-06', rounds: 5 },
    { user_id: '2', day: '2026-10-07', rounds: 1 },
  ]);
  assert.deepEqual(out, [
    { user_id: '1', day: '2026-10-07', rounds: 30 },
    { user_id: '1', day: '2026-10-06', rounds: 5 },
    { user_id: '2', day: '2026-10-07', rounds: 1 },
  ]);
});

test('mergeWithStored: applying the same batch twice changes nothing', () => {
  const stored = [{ user_id: '1', day: '2026-10-07', rounds: 50 }];
  const batch = [
    { user_id: '1', day: '2026-10-07', rounds: 40 }, // late/lower resend
    { user_id: '2', day: '2026-10-07', rounds: 12 }, // new
  ];
  const once = mergeWithStored(batch, stored);
  assert.deepEqual(once, [
    { user_id: '1', day: '2026-10-07', rounds: 50 },
    { user_id: '2', day: '2026-10-07', rounds: 12 },
  ]);
  assert.deepEqual(mergeWithStored(batch, once), once);
});
