// One run of the hourly CRM player-daily pull (2026-10-21), with the CRM
// fetch and the database injected so tests/crm-pull.test.mjs drives it
// without a network or Supabase. The route (app/api/cron/crm-pull/route.js)
// passes process.env, global fetch and a supabaseAdmin adapter.
import { pullFeed, cleanCursor, PULL_LIMITS } from './crmPull.mjs';

export const CRM_PULL_CURSOR = 'crm_player_daily';
export const DEFAULT_CRM_URL = 'https://bwanabet-crm-next.vercel.app';

/**
 * env: { GAMIFICATION_API_KEY, CRM_URL }.
 * db: { readCursor() -> cursor|null, writeRows(rows), saveCursor(cursor, lastRun) , saveRun?(lastRun) }.
 * Returns { status, ... } with no secrets in it. status 'disabled' = no API key (a clean no-op).
 */
export async function runCrmPull({ env = {}, fetch, db, now = new Date(), clock = Date.now, budgetMs = 240000, limit = PULL_LIMITS.pageSize }) {
  const apiKey = typeof env.GAMIFICATION_API_KEY === 'string' ? env.GAMIFICATION_API_KEY.trim() : '';
  if (!apiKey) return { status: 'disabled', reason: 'GAMIFICATION_API_KEY is not set' };
  const baseUrl = (typeof env.CRM_URL === 'string' && /^https?:\/\//.test(env.CRM_URL.trim())) ? env.CRM_URL.trim() : DEFAULT_CRM_URL;
  const started = clock();

  let cursor;
  try {
    cursor = cleanCursor(await db.readCursor());
  } catch (e) {
    return { status: 'db_error', error: e && e.code ? e.code : 'cursor_read_failed' };
  }
  const startCursor = cursor;
  const runAt = new Date(now).toISOString();
  const result = await pullFeed({
    fetch, baseUrl, apiKey, cursor, limit, now, clock, deadline: started + budgetMs,
    writeRows: (rows) => db.writeRows(rows),
    saveCursor: (c, stats) => db.saveCursor(c, { at: runAt, ...stats }),
  });
  const summary = {
    status: result.status,
    ...(result.error ? { error: result.error } : {}),
    pages: result.pages, fetched: result.fetched, written: result.written, rejected: result.rejected,
    more: result.status === 'time_up' || result.status === 'max_pages',
    from: startCursor ? startCursor.since : null,
    to: result.cursor ? result.cursor.since : null,
    ms: clock() - started,
  };
  if (db.saveRun) {
    try { await db.saveRun({ at: runAt, ...summary }); } catch { /* status only, never fatal */ }
  }
  return summary;
}
