import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapFeedRow, mapFeedPage, feedQuery, cursorAfterPage, fetchFeedPage, pullFeed, cleanCursor, PULL_LIMITS,
} from '../lib/season/crmPull.mjs';
import { runCrmPull, DEFAULT_CRM_URL } from '../lib/season/crmPullJob.mjs';

const NOW = new Date('2026-10-21T10:35:00Z');
const row = (o = {}) => ({
  user_id: '1234567', day: '2026-10-20', deposits_amount: 50, deposits_count: 2, withdrawals_amount: 0,
  casino_stake: 31.5, casino_rounds: 42, sports_stake: 10, sports_slips: 2, synced_at: '2026-10-21T10:21:14.512Z', ...o,
});

// ---- row mapping ---------------------------------------------------------
test('mapFeedRow: a feed row becomes a player_activity row (UTC day as-is)', () => {
  const r = mapFeedRow(row(), { now: NOW });
  assert.deepEqual(r, {
    row: { user_id: '1234567', day: '2026-10-20', deposits_amount: 50, deposits_count: 2, withdrawals_amount: 0,
      casino_stake: 31.5, casino_rounds: 42, sports_stake: 10, sports_slips: 2, crm_synced_at: '2026-10-21T10:21:14.512Z' },
  });
});

test('mapFeedRow: numeric strings accepted, amounts rounded to the ngwee, ids normalized', () => {
  const r = mapFeedRow(row({ user_id: '007', casino_stake: '12.345', casino_rounds: '9' }), { now: NOW }).row;
  assert.equal(r.user_id, '7');
  assert.equal(r.casino_stake, 12.35);
  assert.equal(r.casino_rounds, 9);
});

test('mapFeedRow: rejects bad ids, days, numbers and synced_at', () => {
  const err = (o) => mapFeedRow(row(o), { now: NOW }).error;
  assert.equal(mapFeedRow(null, { now: NOW }).error, 'not_an_object');
  assert.equal(err({ user_id: 'abc' }), 'bad_user_id');
  assert.equal(err({ user_id: '0' }), 'bad_user_id');
  assert.equal(err({ day: '2026-02-30' }), 'bad_day');
  assert.equal(err({ day: '2026-10-23' }), 'day_out_of_range', 'more than a day in the future (UTC)');
  assert.equal(err({ day: '2026-08-01' }), 'day_out_of_range', 'older than the CRM keeps');
  assert.equal(err({ casino_stake: -1 }), 'bad_casino_stake');
  assert.equal(err({ casino_rounds: 1.5 }), 'bad_casino_rounds');
  assert.equal(err({ sports_slips: 'x' }), 'bad_sports_slips');
  assert.equal(err({ deposits_amount: 2e9 }), 'bad_deposits_amount');
  assert.equal(err({ deposits_count: undefined }), 'bad_deposits_count', 'every field is required (overwrite)');
  assert.equal(err({ synced_at: 'yesterday' }), 'bad_synced_at');
  // tomorrow (UTC) is fine: the CRM day is UTC, ours may lag
  assert.ok(mapFeedRow(row({ day: '2026-10-22' }), { now: NOW }).row);
  assert.ok(mapFeedRow(row({ day: '2026-08-23' }), { now: NOW }).row, '59 days back');
});

test('mapFeedPage: keeps the LAST row per (user, day) (newest synced_at) and lists rejects', () => {
  const p = mapFeedPage([
    row({ casino_stake: 10, synced_at: '2026-10-21T09:21:00.000Z' }),
    row({ user_id: 'bad' }),
    row({ casino_stake: 4, synced_at: '2026-10-21T10:21:00.000Z' }),
    row({ day: '2026-10-19' }),
  ], { now: NOW });
  assert.equal(p.rows.length, 2);
  assert.equal(p.rows.find(r => r.day === '2026-10-20').casino_stake, 4, 'a total can go DOWN');
  assert.deepEqual(p.rejected, [{ index: 1, error: 'bad_user_id' }]);
  assert.deepEqual(mapFeedPage('x', { now: NOW }), { rows: [], rejected: [] });
});

// ---- cursor --------------------------------------------------------------
test('feedQuery: limit always, cursor fields only when set', () => {
  assert.equal(feedQuery(null, 1000), 'limit=1000');
  assert.equal(feedQuery({ since: '2026-10-21T10:21:14.512Z', after_user: '5', after_day: '2026-10-20' }, 500),
    'limit=500&since=2026-10-21T10%3A21%3A14.512Z&after_user=5&after_day=2026-10-20');
  assert.equal(feedQuery({ since: '2026-10-21T10:21:14.512Z' }, 500), 'limit=500&since=2026-10-21T10%3A21%3A14.512Z',
    'tie-break only as a pair');
});

test('cleanCursor: only a valid since / pair survives', () => {
  assert.equal(cleanCursor(null), null);
  assert.equal(cleanCursor({ since: null }), null);
  assert.deepEqual(cleanCursor({ since: '2026-10-21T10:21:14.512Z', after_user: '5', after_day: '2026-10-20', name: 'x' }),
    { since: '2026-10-21T10:21:14.512Z', after_user: '5', after_day: '2026-10-20' });
  assert.deepEqual(cleanCursor({ since: '2026-10-21T10:21:14.512Z', after_user: '5' }), { since: '2026-10-21T10:21:14.512Z' });
});

test('cursorAfterPage: the server `next`, else built from the last RAW row, else unchanged', () => {
  const prev = { since: '2026-10-20T00:00:00.000Z' };
  const next = { since: 'S', after_user: 'U', after_day: '2026-10-20' };
  assert.deepEqual(cursorAfterPage({ rows: [row()], next }, prev), next);
  assert.deepEqual(cursorAfterPage({ rows: [row(), row({ user_id: 'junk', day: '2026-10-19', synced_at: '2026-10-21T10:22:00.000Z' })], next: null }, prev),
    { since: '2026-10-21T10:22:00.000Z', after_user: 'junk', after_day: '2026-10-19' }, 'a rejected last row still moves the cursor');
  assert.deepEqual(cursorAfterPage({ rows: [], next: null }, prev), prev);
});

// ---- fetch ---------------------------------------------------------------
const okRes = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('fetchFeedPage: GET with x-api-key, trailing slash in the base URL tolerated', async () => {
  const calls = [];
  const fetch = async (url, init) => { calls.push({ url, init }); return okRes({ rows: [row()], next: null }); };
  const page = await fetchFeedPage({ fetch, baseUrl: 'https://crm.example/', apiKey: 'k'.repeat(20), cursor: null, limit: 1000 });
  assert.equal(calls[0].url, 'https://crm.example/api/player-daily?limit=1000');
  assert.equal(calls[0].init.headers['x-api-key'], 'k'.repeat(20));
  assert.equal(calls[0].init.method, 'GET');
  assert.equal(page.rows.length, 1);
  assert.equal(page.next, null);
});

test('fetchFeedPage: CRM errors throw with the status, never the key', async () => {
  const key = 'secret-key-1234567890';
  await assert.rejects(fetchFeedPage({ fetch: async () => okRes({ error: 'Invalid or missing API key' }, 401), baseUrl: 'https://c', apiKey: key, limit: 10 }),
    (e) => e.code === 'crm_http_401' && !String(e.message).includes(key));
  await assert.rejects(fetchFeedPage({ fetch: async () => okRes({ nope: 1 }), baseUrl: 'https://c', apiKey: key, limit: 10 }),
    (e) => e.code === 'crm_bad_body');
  await assert.rejects(fetchFeedPage({ fetch: async () => { throw new Error('ECONNRESET'); }, baseUrl: 'https://c', apiKey: key, limit: 10 }),
    (e) => e.code === 'crm_unreachable');
});

// ---- the pull loop -------------------------------------------------------
function fakeCrm(pages) {
  const seen = [];
  const fetch = async (url) => {
    seen.push(url);
    const p = pages.shift();
    if (p instanceof Error) throw p;
    if (typeof p === 'number') return okRes({ error: 'x' }, p);
    return okRes(p || { rows: [], next: null });
  };
  return { fetch, seen };
}

test('pullFeed: pages until `next` is null, writes then saves the cursor after each page', async () => {
  const log = [];
  const { fetch, seen } = fakeCrm([
    { rows: [row(), row({ day: '2026-10-19' })], next: { since: 'S1', after_user: '1234567', after_day: '2026-10-19' } },
    { rows: [row({ user_id: '9', synced_at: '2026-10-21T10:23:00.000Z' })], next: null },
  ]);
  const out = await pullFeed({
    fetch, baseUrl: 'https://c', apiKey: 'k', cursor: { since: 'S0' }, limit: 2, now: NOW,
    writeRows: async (rows) => { log.push(['write', rows.length]); },
    saveCursor: async (c, stats) => { log.push(['cursor', c.since, stats.rows]); },
  });
  assert.deepEqual(log, [['write', 2], ['cursor', 'S1', 2], ['write', 1], ['cursor', '2026-10-21T10:23:00.000Z', 1]]);
  assert.equal(seen.length, 2);
  assert.match(seen[1], /since=S1&after_user=1234567&after_day=2026-10-19/);
  assert.equal(out.status, 'done');
  assert.equal(out.pages, 2);
  assert.equal(out.fetched, 3);
  assert.equal(out.written, 3);
  assert.equal(out.rejected, 0);
});

test('pullFeed: empty first page = done, nothing written, cursor untouched', async () => {
  let wrote = 0; let saved = 0;
  const out = await pullFeed({ ...fakeCrm([{ rows: [], next: null }]), baseUrl: 'https://c', apiKey: 'k', cursor: { since: 'S0' }, limit: 10, now: NOW,
    writeRows: async () => { wrote++; }, saveCursor: async () => { saved++; } });
  assert.equal(out.status, 'done');
  assert.equal(wrote + saved, 0);
  assert.deepEqual(out.cursor, { since: 'S0' });
});

test('pullFeed: a page with only rejected rows writes nothing but still moves the cursor', async () => {
  const saved = [];
  const out = await pullFeed({ ...fakeCrm([{ rows: [row({ user_id: 'x', synced_at: '2026-10-21T10:30:00.000Z' })], next: null }]), baseUrl: 'https://c', apiKey: 'k', cursor: null, limit: 10, now: NOW,
    writeRows: async () => { throw new Error('should not write'); }, saveCursor: async (c) => saved.push(c) });
  assert.equal(out.rejected, 1);
  assert.equal(saved[0].since, '2026-10-21T10:30:00.000Z');
});

test('pullFeed: a CRM error stops the run, keeps what was committed, never advances past it', async () => {
  const saved = [];
  const out = await pullFeed({
    ...fakeCrm([{ rows: [row()], next: { since: 'S1', after_user: '1', after_day: '2026-10-20' } }, 500]),
    baseUrl: 'https://c', apiKey: 'k', cursor: null, limit: 1, now: NOW,
    writeRows: async () => {}, saveCursor: async (c) => saved.push(c.since),
  });
  assert.equal(out.status, 'crm_error');
  assert.equal(out.error, 'crm_http_500');
  assert.deepEqual(saved, ['S1']);
  assert.equal(out.cursor.since, 'S1');
});

test('pullFeed: a DB write error stops before saving that page cursor', async () => {
  const saved = [];
  const out = await pullFeed({
    ...fakeCrm([{ rows: [row()], next: { since: 'S1', after_user: '1', after_day: '2026-10-20' } }]),
    baseUrl: 'https://c', apiKey: 'k', cursor: { since: 'S0' }, limit: 1, now: NOW,
    writeRows: async () => { throw Object.assign(new Error('boom'), { code: 'db_error' }); }, saveCursor: async (c) => saved.push(c),
  });
  assert.equal(out.status, 'db_error');
  assert.deepEqual(saved, []);
  assert.deepEqual(out.cursor, { since: 'S0' });
});

test('pullFeed: stops at the deadline and reports more to come', async () => {
  let t = 0;
  const pages = Array.from({ length: 5 }, (_, i) => ({ rows: [row({ user_id: String(i + 1) })], next: { since: `S${i + 1}`, after_user: String(i + 1), after_day: '2026-10-20' } }));
  const out = await pullFeed({
    ...fakeCrm(pages), baseUrl: 'https://c', apiKey: 'k', cursor: null, limit: 1, now: NOW,
    clock: () => (t += 10), deadline: 35,
    writeRows: async () => {}, saveCursor: async () => {},
  });
  assert.equal(out.status, 'time_up');
  assert.ok(out.pages >= 1 && out.pages < 5);
});

test('pullFeed: a runaway CRM (same next forever) is stopped by maxPages', async () => {
  const same = { rows: [row()], next: { since: 'S', after_user: '1', after_day: '2026-10-20' } };
  const out = await pullFeed({
    fetch: async () => okRes(same), baseUrl: 'https://c', apiKey: 'k', cursor: null, limit: 1, now: NOW, maxPages: 3,
    writeRows: async () => {}, saveCursor: async () => {},
  });
  assert.equal(out.status, 'max_pages');
  assert.equal(out.pages, 3);
});

test('PULL_LIMITS: pages fit one write batch', () => {
  assert.ok(PULL_LIMITS.pageSize <= 1000);
  assert.ok(PULL_LIMITS.maxDayAge >= 60);
});

// ---- one cron run (lib/season/crmPullJob.mjs), db + fetch injected --------
function fakeDb(start = null) {
  const db = {
    cursor: start, rows: new Map(), runs: [],
    async readCursor() { return db.cursor; },
    async writeRows(rows) { for (const r of rows) db.rows.set(`${r.user_id}|${r.day}`, r); },
    async saveCursor(c, lastRun) { db.cursor = c; db.runs.push(lastRun); },
    async saveRun(r) { db.last = r; },
  };
  return db;
}

test('runCrmPull: no API key = clean no-op, nothing fetched', async () => {
  let called = 0;
  const out = await runCrmPull({ env: {}, fetch: async () => { called++; }, db: fakeDb() });
  assert.equal(out.status, 'disabled');
  assert.equal(called, 0);
  assert.equal((await runCrmPull({ env: { GAMIFICATION_API_KEY: '  ' }, fetch: async () => { called++; }, db: fakeDb() })).status, 'disabled');
});

test('runCrmPull: default CRM URL, resumes from the saved cursor, overwrites totals that went down', async () => {
  const db = fakeDb({ since: '2026-10-21T09:21:00.000Z', after_user: '1', after_day: '2026-10-20' });
  db.rows.set('1234567|2026-10-20', { casino_stake: 100 });
  const urls = [];
  const fetch = async (url, init) => { urls.push([url, init.headers['x-api-key']]); return okRes({ rows: [row({ casino_stake: 40 })], next: null }); };
  const out = await runCrmPull({ env: { GAMIFICATION_API_KEY: 'test-key-0000000000' }, fetch, db, now: NOW });
  assert.equal(out.status, 'done');
  assert.ok(urls[0][0].startsWith(`${DEFAULT_CRM_URL}/api/player-daily?limit=1000&since=2026-10-21T09%3A21%3A00.000Z&after_user=1&after_day=2026-10-20`));
  assert.equal(urls[0][1], 'test-key-0000000000');
  assert.equal(db.rows.get('1234567|2026-10-20').casino_stake, 40);
  assert.equal(db.cursor.since, '2026-10-21T10:21:14.512Z');
  assert.equal(out.written, 1);
  assert.equal(db.last.status, 'done');
  assert.ok(!JSON.stringify(out).includes('test-key'), 'the key never appears in the result');
});

test('runCrmPull: CRM_URL env wins; a CRM outage leaves rows and cursor alone', async () => {
  const db = fakeDb({ since: 'S0' });
  db.rows.set('1|2026-10-20', { casino_stake: 7 });
  let seen;
  const out = await runCrmPull({ env: { GAMIFICATION_API_KEY: 'k', CRM_URL: 'https://crm-overview.example' }, fetch: async (u) => { seen = u; return okRes({}, 503); }, db, now: NOW });
  assert.ok(seen.startsWith('https://crm-overview.example/api/player-daily'));
  assert.equal(out.status, 'crm_error');
  assert.equal(out.error, 'crm_http_503');
  assert.deepEqual(db.cursor, { since: 'S0' });
  assert.equal(db.rows.get('1|2026-10-20').casino_stake, 7);
});

test('runCrmPull: a cursor read failure stops before any fetch', async () => {
  let called = 0;
  const out = await runCrmPull({ env: { GAMIFICATION_API_KEY: 'k' }, fetch: async () => { called++; }, db: { readCursor: async () => { throw new Error('x'); } } });
  assert.equal(out.status, 'db_error');
  assert.equal(called, 0);
});
