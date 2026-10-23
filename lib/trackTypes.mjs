// Activity event types the Bonus Center records (2026-10-19). Pure, so the
// allowlist and the cleaning are pinned by tests/track-types.test.mjs.
// Anything not listed here is dropped by POST /api/track.

export const TRACK_TYPES = new Set([
  // visits + navigation
  'session_start', 'widget_open', 'widget_close', 'tab_view', 'profile_open', 'story_open', 'intro_toggle', 'wallet_open',
  // rewards (the first one claimed = the player's first login)
  'daily_claimed', 'mission_completed', 'sports_mission_claimed', 'prediction_claimed', 'leaderboard_claimed',
  'comeback_claimed', 'album_set_claimed', 'hustle_collected', 'league_bonus_claimed', 'wc_bonus_claimed', 'level_up',
  'story_prize_claimed', 'cashback_collected',
  // actions
  'game_open', 'game_played', 'prediction_made', 'friendly_accepted', 'friendly_declined', 'prize_claimed',
  'name_set', 'purchase', 'mission_open', 'comeback_shown', 'cashback_shown', 'bonus_unlock_seen', 'welcome_back_seen',
  // avatar items (Coin Shop)
  'avatar_item_bought', 'avatar_item_worn', 'avatar_item_removed',
  // Wheel of Fortune inside the Bonus Center
  'wheel_available', 'wheel_auto_open', 'wheel_opened', 'wheel_closed', 'wheel_spun',
  // legacy
  'streak_bonus',
]);

/** Types that count as "claimed a reward" (first login is the first of these). */
export const REWARD_TYPES = new Set([
  'daily_claimed', 'mission_completed', 'sports_mission_claimed', 'prediction_claimed', 'leaderboard_claimed',
  'comeback_claimed', 'album_set_claimed', 'hustle_collected', 'league_bonus_claimed', 'wc_bonus_claimed',
  'story_prize_claimed',
]);

const MAX_META = 1024;
const MAX_SKEW_MS = 10 * 60 * 1000; // client clock: an `at` more than 10 min off is ignored

/** Allowed events with clean fields: { type, gameId, amount, meta, at }. */
export function cleanEvents(events, types = TRACK_TYPES, now = Date.now()) {
  return (Array.isArray(events) ? events : [])
    .filter(e => e && types.has(e.type))
    .map(e => {
      const t = typeof e.at === 'string' ? Date.parse(e.at) : NaN;
      return {
        type: e.type,
        gameId: e.gameId ? String(e.gameId).slice(0, 32) : null,
        amount: Number.isFinite(e.amount) ? Math.max(0, Math.min(Math.trunc(e.amount), 1000000)) : null,
        meta: e.meta && typeof e.meta === 'object' && !Array.isArray(e.meta) && JSON.stringify(e.meta).length <= MAX_META ? e.meta : null,
        at: Number.isFinite(t) && Math.abs(t - now) <= MAX_SKEW_MS ? new Date(t).toISOString() : null,
      };
    });
}
