// CRM casino-rounds feed: pure helpers shared by the ingest endpoint
// (POST /api/activity/casino-rounds), the progress endpoint
// (GET /api/missions/progress) and the client. No imports, so node --test
// loads it directly.
//
// Semantics: the CRM sends ABSOLUTE daily totals ("player X played N casino
// rounds on day D"). Re-sending a day is safe and a lower total never lowers
// the stored count (max wins), so the feed is idempotent and order-proof.

// Zambia (Africa/Lusaka, CAT) is UTC+2 all year, no daylight saving.
export const LUSAKA_OFFSET_MS = 2 * 60 * 60 * 1000;

export const FEED_LIMITS = Object.freeze({
  maxBatch: 1000,      // rows per request
  maxRounds: 100000,   // rounds per player per day (sanity cap)
  maxDayDrift: 2,      // accepted days either side of today's Lusaka date
  maxBodyBytes: 256 * 1024,
});

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today's (or `now`'s) calendar date in Lusaka as 'YYYY-MM-DD'. */
export function lusakaDay(now = new Date()) {
  const t = now instanceof Date ? now.getTime() : Number(now);
  return new Date(t + LUSAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** True for a real calendar date written as 'YYYY-MM-DD'. */
export function isIsoDay(s) {
  if (typeof s !== 'string') return false;
  const m = DAY_RE.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toISOString().slice(0, 10) === s;
}

/** Whole days from `a` to `b` (both 'YYYY-MM-DD'): b - a. */
export function dayDiff(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/**
 * bwanabet user ids are positive integers. Accepts a number or a digit
 * string and normalizes exactly like the SSO routes do (String(Number(id))),
 * so a feed row and a logged-in player land on the same key.
 */
export function normalizeUserId(v) {
  if (typeof v === 'number') {
    return Number.isSafeInteger(v) && v > 0 ? String(v) : null;
  }
  if (typeof v === 'string' && /^\d{1,16}$/.test(v.trim())) {
    const n = Number(v.trim());
    return Number.isSafeInteger(n) && n > 0 ? String(n) : null;
  }
  return null;
}

/**
 * Validate a feed payload. Accepts the batch as a bare array or as
 * { rows: [...] }. Returns either { error } (the whole request is unusable)
 * or { rows, rejected }: rows = valid, normalized { user_id, day, rounds };
 * rejected = [{ index, error }] for rows that failed (they are skipped).
 */
export function validateCasinoBatch(body, { now = new Date(), limits = FEED_LIMITS } = {}) {
  const list = Array.isArray(body) ? body : (body && typeof body === 'object' && Array.isArray(body.rows) ? body.rows : null);
  if (!list) return { error: 'not_an_array' };
  if (list.length === 0) return { error: 'empty_batch' };
  if (list.length > limits.maxBatch) return { error: 'batch_too_large' };

  const today = lusakaDay(now);
  const rows = [];
  const rejected = [];
  list.forEach((r, index) => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) { rejected.push({ index, error: 'not_an_object' }); return; }
    const user_id = normalizeUserId(r.userId);
    if (!user_id) { rejected.push({ index, error: 'bad_user_id' }); return; }
    if (!isIsoDay(r.date)) { rejected.push({ index, error: 'bad_date' }); return; }
    if (Math.abs(dayDiff(today, r.date)) > limits.maxDayDrift) { rejected.push({ index, error: 'date_out_of_range' }); return; }
    if (!Number.isInteger(r.rounds) || r.rounds < 0 || r.rounds > limits.maxRounds) { rejected.push({ index, error: 'bad_rounds' }); return; }
    rows.push({ user_id, day: r.date, rounds: r.rounds });
  });
  return { rows, rejected };
}

/** The stored total after receiving `incoming`: never decreases. */
export function mergeDailyTotal(stored, incoming) {
  const s = Number.isFinite(stored) ? stored : 0;
  return Math.max(s, incoming);
}

const key = (r) => `${r.user_id}|${r.day}`;

/** One row per (user_id, day), keeping the highest total (a batch may repeat a key). */
export function collapseBatch(rows) {
  const by = new Map();
  for (const r of rows) {
    const k = key(r);
    const prev = by.get(k);
    by.set(k, prev ? { ...prev, rounds: mergeDailyTotal(prev.rounds, r.rounds) } : { ...r });
  }
  return [...by.values()];
}

/**
 * Rows to upsert given the batch and what is already stored (fallback path
 * when the atomic SQL function is unavailable). Same max-wins rule.
 */
export function mergeWithStored(incoming, stored = []) {
  const have = new Map(stored.map(r => [key(r), r.rounds]));
  return collapseBatch(incoming).map(r => ({ ...r, rounds: mergeDailyTotal(have.get(key(r)), r.rounds) }));
}
