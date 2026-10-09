// CRM player-activity feed (2026-10-09): pure helpers for
// POST /api/activity/player-daily. Same semantics as the casino-rounds feed
// (lib/casino/feed.mjs, whose helpers it reuses): ABSOLUTE daily totals per
// player per Lusaka day, merged MAX-WINS per column, so resends are
// idempotent and late/out-of-order batches never lower a stored value.
// CRM-facing contract: docs/integrations/crm-player-activity-feed.md
import { lusakaDay, isIsoDay, dayDiff, normalizeUserId, FEED_LIMITS } from '../casino/feed.mjs';

export { FEED_LIMITS };

// payload field -> table column, kind
export const PLAYER_FIELDS = Object.freeze([
  ['depositsAmount', 'deposits_amount', 'amount'],
  ['depositsCount', 'deposits_count', 'count'],
  ['withdrawalsAmount', 'withdrawals_amount', 'amount'],
  ['casinoStake', 'casino_stake', 'amount'],
  ['casinoRounds', 'casino_rounds', 'count'],
  ['sportsStake', 'sports_stake', 'amount'],
  ['sportsSlips', 'sports_slips', 'count'],
]);
const COLUMNS = PLAYER_FIELDS.map(f => f[1]);

export const PLAYER_LIMITS = Object.freeze({ maxAmount: 1e9, maxCount: 1e6 });

/** Kwacha amount -> number rounded to the ngwee, or undefined when invalid. */
function amount(v) {
  let n = v;
  if (typeof v === 'string' && /^\d{1,12}(\.\d{1,4})?$/.test(v.trim())) n = Number(v.trim());
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > PLAYER_LIMITS.maxAmount) return undefined;
  return Math.round(n * 100) / 100;
}
function count(v) {
  return Number.isInteger(v) && v >= 0 && v <= PLAYER_LIMITS.maxCount ? v : undefined;
}

/**
 * Validate a batch (bare array or { rows }). Returns { error } or
 * { rows: [{ user_id, day, ...columns }], rejected: [{ index, error }] }.
 * A missing field counts as 0 (max-wins keeps whatever is stored); a present
 * but invalid one rejects the row.
 */
export function validatePlayerBatch(body, { now = new Date(), limits = FEED_LIMITS } = {}) {
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
    const row = { user_id, day: r.date };
    let present = 0;
    for (const [field, col, kind] of PLAYER_FIELDS) {
      if (r[field] === undefined || r[field] === null) { row[col] = 0; continue; }
      const v = kind === 'amount' ? amount(r[field]) : count(r[field]);
      if (v === undefined) { rejected.push({ index, error: `bad_${field}` }); return; }
      row[col] = v;
      present++;
    }
    if (!present) { rejected.push({ index, error: 'no_fields' }); return; }
    rows.push(row);
  });
  return { rows, rejected };
}

const key = (r) => `${r.user_id}|${r.day}`;
const maxRow = (a, b) => {
  const out = { ...a };
  for (const c of COLUMNS) out[c] = Math.max(Number(a[c]) || 0, Number(b[c]) || 0);
  return out;
};

/** One row per (user_id, day), each column the max seen in the batch. */
export function collapsePlayerBatch(rows) {
  const by = new Map();
  for (const r of rows) {
    const k = key(r);
    by.set(k, by.has(k) ? maxRow(by.get(k), r) : { ...r });
  }
  return [...by.values()];
}

/** Rows to upsert given what is stored (fallback when the SQL function is missing): column-wise max. */
export function mergePlayerWithStored(incoming, stored = []) {
  const have = new Map(stored.map(r => [key(r), r]));
  return collapsePlayerBatch(incoming).map(r => (have.has(key(r)) ? maxRow(r, have.get(key(r))) : r));
}
