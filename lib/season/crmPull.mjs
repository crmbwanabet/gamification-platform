// CRM player-daily PULL (2026-10-21): pure helpers for the hourly import
// (app/api/cron/crm-pull/route.js). The CRM serves `GET {CRM_URL}/api/player-daily`
// (spec: crmbwanabet/bwanabet-crm docs/superpowers/specs/2026-10-21-player-daily-feed.md),
// one row per player per UTC day with the FULL recomputed totals, paged by a
// keyset cursor on (synced_at, user_id, day). A changed row comes back with its
// new totals, which can go DOWN (voided / resettled slips, reversals), so these
// rows OVERWRITE what is stored (replace_player_activity), unlike the max-wins
// push route (POST /api/activity/player-daily). The pull is the source of truth.
//
// `day` is the CRM's UTC day, stored as-is (00:00-24:00 UTC = 02:00-02:00 Lusaka).
// fetch / clock are injected so tests/crm-pull.test.mjs runs without a network.
import { isIsoDay, dayDiff, normalizeUserId } from '../casino/feed.mjs';
import { PLAYER_FIELDS, PLAYER_LIMITS } from './feed.mjs';

export const PULL_LIMITS = Object.freeze({
  pageSize: 1000,   // CRM max per page = our max write batch
  maxDayAge: 62,    // the CRM keeps 60 days (+2 slack)
  maxDayAhead: 1,   // a UTC day can be "tomorrow" next to a lagging clock
  maxPages: 200,    // safety stop per run (200k rows)
  timeoutMs: 20000, // per CRM request
});

const COLUMNS = PLAYER_FIELDS.map(([, col, kind]) => [col, kind]);
const utcDay = (now) => new Date(now instanceof Date ? now.getTime() : Number(now)).toISOString().slice(0, 10);

function amount(v) {
  let n = v;
  if (typeof v === 'string' && /^\d{1,12}(\.\d{1,6})?$/.test(v.trim())) n = Number(v.trim());
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > PLAYER_LIMITS.maxAmount) return undefined;
  return Math.round(n * 100) / 100;
}
function count(v) {
  const n = typeof v === 'string' && /^\d{1,9}$/.test(v.trim()) ? Number(v.trim()) : v;
  return Number.isInteger(n) && n >= 0 && n <= PLAYER_LIMITS.maxCount ? n : undefined;
}
const isTime = (s) => typeof s === 'string' && s.length <= 40 && /^\d{4}-\d{2}-\d{2}T/.test(s) && Number.isFinite(Date.parse(s));

/** One feed row -> { row } (a player_activity row + crm_synced_at) or { error }. Every field is required. */
export function mapFeedRow(r, { now = new Date() } = {}) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return { error: 'not_an_object' };
  const user_id = normalizeUserId(r.user_id);
  if (!user_id) return { error: 'bad_user_id' };
  if (!isIsoDay(r.day)) return { error: 'bad_day' };
  const age = dayDiff(r.day, utcDay(now));
  if (age > PULL_LIMITS.maxDayAge || age < -PULL_LIMITS.maxDayAhead) return { error: 'day_out_of_range' };
  const row = { user_id, day: r.day };
  for (const [col, kind] of COLUMNS) {
    const v = kind === 'amount' ? amount(r[col]) : count(r[col]);
    if (v === undefined) return { error: `bad_${col}` };
    row[col] = v;
  }
  if (!isTime(r.synced_at)) return { error: 'bad_synced_at' };
  row.crm_synced_at = r.synced_at;
  return { row };
}

/** A page of feed rows -> { rows (one per user+day, the LAST one wins), rejected: [{ index, error }] }. */
export function mapFeedPage(list, opts = {}) {
  if (!Array.isArray(list)) return { rows: [], rejected: [] };
  const by = new Map();
  const rejected = [];
  list.forEach((r, index) => {
    const m = mapFeedRow(r, opts);
    if (m.error) { rejected.push({ index, error: m.error }); return; }
    const k = `${m.row.user_id}|${m.row.day}`;
    by.delete(k); // rows come ordered by synced_at: the later one is newer
    by.set(k, m.row);
  });
  return { rows: [...by.values()], rejected };
}

/** A stored cursor -> { since, after_user?, after_day? } or null (= first pull, everything). */
export function cleanCursor(c) {
  if (!c || typeof c !== 'object' || typeof c.since !== 'string' || !c.since) return null;
  const out = { since: c.since };
  if (typeof c.after_user === 'string' && c.after_user && typeof c.after_day === 'string' && c.after_day) {
    out.after_user = c.after_user;
    out.after_day = c.after_day;
  }
  return out;
}

/** Query string for one page. */
export function feedQuery(cursor, limit = PULL_LIMITS.pageSize) {
  const q = new URLSearchParams({ limit: String(limit) });
  const c = cleanCursor(cursor);
  if (c) {
    q.set('since', c.since);
    if (c.after_user) { q.set('after_user', c.after_user); q.set('after_day', c.after_day); }
  }
  return q.toString();
}

/**
 * Cursor to resume from after a page: the server's `next`, else (short page)
 * built from the last RAW row (a rejected row must not stall the pull), else
 * the previous cursor (nothing new).
 */
export function cursorAfterPage(page, prev) {
  const next = cleanCursor(page && page.next);
  if (next) return next;
  const rows = page && Array.isArray(page.rows) ? page.rows : [];
  const last = rows[rows.length - 1];
  if (last && typeof last.synced_at === 'string') {
    return cleanCursor({ since: last.synced_at, after_user: last.user_id == null ? '' : String(last.user_id), after_day: last.day }) || prev;
  }
  return prev;
}

const fail = (code, message) => Object.assign(new Error(message || code), { code });

/** GET one page. Throws { code: crm_unreachable | crm_http_<status> | crm_bad_body }; never puts the key in an error. */
export async function fetchFeedPage({ fetch, baseUrl, apiKey, cursor, limit = PULL_LIMITS.pageSize, timeoutMs = PULL_LIMITS.timeoutMs }) {
  const url = `${String(baseUrl).replace(/\/+$/, '')}/api/player-daily?${feedQuery(cursor, limit)}`;
  let res;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    res = await fetch(url, { method: 'GET', headers: { 'x-api-key': apiKey, accept: 'application/json' }, cache: 'no-store', signal: ctl ? ctl.signal : undefined });
  } catch (e) {
    throw fail('crm_unreachable', `CRM unreachable (${e && e.name === 'AbortError' ? 'timeout' : 'network'})`);
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res.ok) throw fail(`crm_http_${res.status}`, `CRM answered ${res.status}`);
  let body;
  try { body = await res.json(); } catch { throw fail('crm_bad_body', 'CRM sent invalid JSON'); }
  if (!body || !Array.isArray(body.rows)) throw fail('crm_bad_body', 'CRM response has no rows array');
  return { rows: body.rows, next: body.next && typeof body.next === 'object' ? body.next : null };
}

/**
 * Pull pages until the CRM has nothing newer, the deadline, or maxPages.
 * After each page: writeRows(mapped rows) (skipped when none are valid), then
 * saveCursor(cursor, stats). A CRM or DB error stops the run; everything
 * committed before it stays and the next run resumes from the saved cursor.
 * Returns { status: done | time_up | max_pages | crm_error | db_error, error?, pages, fetched, written, rejected, cursor }.
 */
export async function pullFeed({
  fetch, baseUrl, apiKey, cursor = null, limit = PULL_LIMITS.pageSize, now = new Date(),
  writeRows, saveCursor, clock = Date.now, deadline = Infinity, maxPages = PULL_LIMITS.maxPages,
}) {
  let cur = cleanCursor(cursor);
  const out = { status: 'done', pages: 0, fetched: 0, written: 0, rejected: 0, cursor: cur };
  for (;;) {
    if (out.pages >= maxPages) { out.status = 'max_pages'; break; }
    if (clock() >= deadline) { out.status = 'time_up'; break; }
    let page;
    try {
      page = await fetchFeedPage({ fetch, baseUrl, apiKey, cursor: cur, limit });
    } catch (e) {
      out.status = 'crm_error';
      out.error = e.code || 'crm_error';
      break;
    }
    if (!page.rows.length) break;
    out.pages++;
    out.fetched += page.rows.length;
    const mapped = mapFeedPage(page.rows, { now });
    out.rejected += mapped.rejected.length;
    const nextCur = cursorAfterPage(page, cur);
    try {
      if (mapped.rows.length) await writeRows(mapped.rows);
    } catch (e) {
      out.status = 'db_error';
      out.error = e.code || 'db_error';
      break;
    }
    out.written += mapped.rows.length;
    try {
      await saveCursor(nextCur, { rows: mapped.rows.length, rejected: mapped.rejected.length });
    } catch (e) {
      // rows are committed; the cursor lags, so the next run re-reads (overwrite = harmless)
      out.status = 'db_error';
      out.error = e.code || 'cursor_save_failed';
      break;
    }
    cur = nextCur;
    out.cursor = cur;
    if (!page.next) break;
  }
  return out;
}
