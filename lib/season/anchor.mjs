// Reward anchor (2026-10-21, owner rule): a player earns NOTHING for activity
// on bwanabet before the moment they claimed their FIRST DAILY REWARD in the
// Bonus Center (`profiles.first_daily_at`). The CRM feeds have day resolution,
// so the cut is the Lusaka day of that claim, inclusive. No claim yet = no
// anchor = nothing counts. Pure (only imports the no-import feed helpers), so
// tests/reward-anchor.test.mjs pins it.
//
// Used by every place CRM/casino activity turns into rewards: GET
// /api/missions/progress (casino missions + casino-rounds XP), GET /api/season
// (season XP, side quest, league, World Cup, sports/deposit missions), POST
// /api/season/claim-prize (lib/season/verify.mjs) and the weekly league table
// (lib/extras/server.js). The comeback bonus (lapse detection) is not a reward
// for activity and does not use it.
import { lusakaDay } from '../casino/feed.mjs';

/** The anchor day ('YYYY-MM-DD', Lusaka) of a first_daily_at timestamp, or null. */
export function anchorDay(firstDailyAt) {
  if (firstDailyAt == null || firstDailyAt === '') return null;
  const t = firstDailyAt instanceof Date ? firstDailyAt.getTime() : Date.parse(firstDailyAt);
  return Number.isFinite(t) ? lusakaDay(t) : null;
}

/** True when activity on `day` may earn rewards (anchor null = never). */
export function countsFrom(day, anchor) {
  return typeof anchor === 'string' && typeof day === 'string' && day >= anchor;
}

/** Only the day rows ({ day, … }) on or after the anchor day; none without an anchor. */
export function rowsFromAnchor(rows, anchor) {
  if (!Array.isArray(rows) || typeof anchor !== 'string') return [];
  return rows.filter((r) => r && countsFrom(r.day, anchor));
}

/**
 * Many players' rows ({ user_id, day, … }) cut by each player's own anchor.
 * `anchors` = { [userId]: 'YYYY-MM-DD' | null }; players without one drop out.
 */
export function rowsFromAnchors(rows, anchors) {
  if (!Array.isArray(rows) || !anchors || typeof anchors !== 'object') return [];
  return rows.filter((r) => r && r.user_id != null && countsFrom(r.day, anchors[String(r.user_id)]));
}
