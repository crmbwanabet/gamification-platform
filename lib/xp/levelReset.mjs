// "Called back to the village" (owner 2026-10-24): EVERY player goes back to
// level 1 but keeps all XP and coins. Levels now count LEVEL XP = total XP
// minus `user.levelReset.base`, the XP the player had when the restart
// landed; the total (user.xp, the CRM-derived figure) is untouched and still
// saved and shown. Pure, tests/level-reset.test.mjs.
//
// The base is taken once per player, the first time the Bonus Center opens
// with a FRESH season feed (the feed is the truth; a stale saved xp would let
// the feed's catch-up count as level XP). On the restart day itself the base
// is that fresh total; a player who first opens later gets the total through
// the end of the restart day, so XP earned after it still counts as level XP.
// Coins for a level are still paid once ever (user.stageRewarded, never
// lowered); re-reached levels show the level-up moment again without coins
// (`shown` = the highest SUB-LEVEL index, 1..115, whose story was shown since
// the restart; null = not set yet, set silently to the current one).
// The called-back story is for players who had LEFT the village (reached the
// Copperbelt academy = stage 6 on the 23-stage list, 2026-10-24).

import { cumAt } from '../season/xp.mjs';

export const LEVEL_RESET_DAY = '2026-10-24';
export const LEFT_VILLAGE_STAGE = 6;

const whole = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

/** The saved marker, or null when missing / junk. */
export function cleanLevelReset(r) {
  if (!r || typeof r !== 'object' || !Number.isFinite(Number(r.base))) return null;
  return {
    base: whole(r.base),
    day: typeof r.day === 'string' ? r.day : null,
    from: Math.max(1, whole(r.from)),
    story: r.story === 'due' ? 'due' : r.story === 'seen' ? 'seen' : 'none',
    shown: Number.isFinite(Number(r.shown)) && Number(r.shown) >= 1 ? Math.floor(Number(r.shown)) : null,
  };
}

/** XP that counts toward the level: total minus the restart base, never below 0. */
export function levelXpOf(xp, reset) {
  const r = cleanLevelReset(reset);
  return Math.max(0, whole(xp) - (r ? r.base : 0));
}

/**
 * The restart marker for a player opening with a fresh feed: `xp` = their
 * fresh total, `fromStage` = the highest stage they had reached (23-stage
 * list). The story is due for everyone who had left the village (stage 6+);
 * the others restart silently.
 */
export function makeLevelReset({ xp, season = null, today = null, fromStage = 1 }) {
  const total = whole(xp);
  const base = today && today > LEVEL_RESET_DAY && season ? Math.min(total, whole(cumAt(season, LEVEL_RESET_DAY))) : total;
  const from = Math.max(1, whole(fromStage));
  return { base, day: today || null, from, story: from >= LEFT_VILLAGE_STAGE ? 'due' : 'none', shown: 1 };
}

/**
 * The season (lib/season/xp.mjs computeSeasonXp) as seen by LEVELS: the
 * cumulative XP minus the base, so stage reach days (league unlock, World
 * Cup unlock) count level XP. Daily XP, overflow and match XP are unchanged.
 */
export function levelSeason(season, reset) {
  const r = cleanLevelReset(reset);
  if (!season || !r || !r.base) return season;
  return {
    ...season,
    xp: Math.max(0, season.xp - r.base),
    days: season.days.map(d => ({ ...d, cumXp: Math.max(0, d.cumXp - r.base) })),
  };
}
