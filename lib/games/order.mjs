// Monthly game order (owner 2026-10-29): the Bonus Center lists its games in
// order of MOST PLAYED (rounds = game_played events) over the previous Lusaka
// calendar month, and the order only changes on the 1st of each month.
// The daily cron app/api/cron/game-order computes it once per month into the
// platform_config row `game_order` = { month, order, rounds, computedAt };
// merge.mjs cleans it into cfg.gameOrder and GamificationPlatform applies it.
// Pure, relative imports only (node --test loads it directly).

const LUSAKA_OFFSET_MS = 2 * 3600e3; // Africa/Lusaka = UTC+2, no DST

const pad2 = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM' of the Lusaka calendar month that `date` falls in. */
export function lusakaMonth(date = new Date()) {
  const d = new Date(new Date(date).getTime() + LUSAKA_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

/**
 * The whole Lusaka month BEFORE `month` ('YYYY-MM') as ISO timestamps:
 * from = its 1st 00:00 Lusaka, to = the 1st of `month` 00:00 Lusaka (exclusive).
 */
export function previousMonthRange(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ''));
  if (!m) throw new Error(`bad month: ${month}`);
  const y = Number(m[1]), mo = Number(m[2]); // 1-based
  const from = Date.UTC(y, mo - 2, 1) - LUSAKA_OFFSET_MS;
  const to = Date.UTC(y, mo - 1, 1) - LUSAKA_OFFSET_MS;
  return { from: new Date(from).toISOString(), to: new Date(to).toISOString() };
}

/** Rounds per known game id from ops_games rows ({ game, rounds }). */
export function roundsByGame(rows, ids) {
  const known = new Set(ids || []);
  const out = {};
  for (const r of rows || []) {
    if (!r || !known.has(r.game)) continue;
    const n = Number(r.rounds);
    if (Number.isFinite(n) && n > 0) out[r.game] = (out[r.game] || 0) + n;
  }
  return out;
}

/**
 * `ids` (the default MINIGAMES order) sorted by rounds played, most first.
 * Ties and games with no plays keep their default order; unknown ids in the
 * rows are dropped.
 */
export function rankGames(rows, ids) {
  const list = [...new Set(ids || [])];
  const rounds = roundsByGame(rows, list);
  return list
    .map((id, i) => ({ id, i, n: rounds[id] || 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.id);
}

/** A stored order (row value { order } or a bare array) -> unique known ids; junk -> []. */
export function cleanGameOrder(value, knownIds) {
  const arr = Array.isArray(value) ? value : (value && typeof value === 'object' && Array.isArray(value.order) ? value.order : null);
  if (!arr) return [];
  const known = new Set(knownIds || []);
  const seen = new Set();
  const out = [];
  for (const id of arr) {
    if (typeof id === 'string' && known.has(id) && !seen.has(id)) { seen.add(id); out.push(id); }
  }
  return out;
}

/**
 * Games sorted by the saved order. Games missing from it follow the ranked
 * ones in their default relative order; comingSoon games ALWAYS go last.
 * No (or an empty) order = the default order, unchanged.
 */
export function applyOrder(games, order) {
  const list = Array.isArray(games) ? games : [];
  const rank = new Map((Array.isArray(order) ? order : []).map((id, i) => [id, i]));
  return list
    .map((g, i) => ({ g, i, soon: g?.comingSoon ? 1 : 0, r: rank.has(g?.id) ? rank.get(g.id) : Infinity }))
    .sort((a, b) => a.soon - b.soon || (a.r === b.r ? 0 : a.r < b.r ? -1 : 1) || a.i - b.i)
    .map((x) => x.g);
}
