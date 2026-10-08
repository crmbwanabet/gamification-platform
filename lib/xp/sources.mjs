// XP sources (2026-10-08). Every number that earns XP lives HERE, so the
// economy of Vuma Katongo's 17-stage story (lib/vuma/stages.mjs) is retuned in
// one place. Pure ESM, relative imports only, so node --test loads it
// (tests/xp-sources.test.mjs).
//
// Sources:
//   - daily login claim: DAILY_LOGIN_XP
//   - game rounds: 1 XP per coin staked, capped per Lusaka day
//   - casino rounds on bwanabet.com (CRM feed): 1 XP per round, capped per day
//   - casino mission claims: MISSION_XP per mission id
//
// Per-day tallies live in user state as
//   xpToday  = { day: 'YYYY-MM-DD', games, casino }  (XP earned today per source)
//   casinoXp = { day: 'YYYY-MM-DD', rounds }         (casino rounds already converted)
// Both reset when the Africa/Lusaka day changes; junk/missing values count as
// a fresh day, so old saved blobs without them are safe.
import { lusakaDay } from '../casino/feed.mjs';

export const DAILY_LOGIN_XP = 20;

export const GAME_XP_PER_COIN = 1;
export const GAME_XP_DAILY_CAP = 500;

export const CASINO_XP_PER_ROUND = 1;
export const CASINO_XP_DAILY_CAP = 300;

/** XP paid when each daily casino mission is claimed (lib/missions/casino.mjs reads this). */
export const MISSION_XP = Object.freeze({
  casino_starter: 20,
  casino_regular: 50,
  casino_pro: 100,
  casino_legend: 200,
});

export { lusakaDay };

const wholeNonNeg = (n) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/** user.xpToday normalised to `day` (another day, or junk, counts as a fresh day). */
export function xpTodayFor(xpToday, day) {
  if (!xpToday || typeof xpToday !== 'object' || xpToday.day !== day) return { day, games: 0, casino: 0 };
  return { day, games: wholeNonNeg(xpToday.games), casino: wholeNonNeg(xpToday.casino) };
}

/** XP for staking `stake` coins when `alreadyToday` game XP was earned today (respects the cap). */
export function gameXp(stake, alreadyToday = 0) {
  const room = Math.max(0, GAME_XP_DAILY_CAP - wholeNonNeg(alreadyToday));
  return Math.min(wholeNonNeg(stake) * GAME_XP_PER_COIN, room);
}

/** A staked round: { xp, xpToday } — XP to add and the updated day tally. */
export function addGameXp(xpToday, stake, day = lusakaDay()) {
  const t = xpTodayFor(xpToday, day);
  const xp = gameXp(stake, t.games);
  return { xp, xpToday: xp ? { ...t, games: t.games + xp } : t };
}

/**
 * A refunded (void) round takes back what that stake earned, as far as today's
 * game tally allows: { xp (to remove), xpToday }. A refund on a later day takes nothing.
 */
export function refundGameXp(xpToday, stake, day = lusakaDay()) {
  const t = xpTodayFor(xpToday, day);
  const xp = Math.min(wholeNonNeg(stake) * GAME_XP_PER_COIN, t.games);
  return { xp, xpToday: xp ? { ...t, games: t.games - xp } : t };
}

/**
 * Casino rounds → XP. `progress` = { day, rounds } from GET /api/missions/progress
 * (an ABSOLUTE, monotonic daily total); `credited` = user.casinoXp; `xpToday` =
 * user.xpToday. Only the rounds not yet converted earn XP, so re-fetching the
 * same count never re-awards. Returns { xp, credited, xpToday }; with no/bad
 * progress, or progress from an earlier day than already credited, nothing changes.
 */
export function casinoXp(progress, credited, xpToday) {
  const same = { xp: 0, credited, xpToday };
  const day = progress && typeof progress.day === 'string' ? progress.day : null;
  if (!day) return same;
  const credDay = credited && typeof credited.day === 'string' ? credited.day : null;
  if (credDay && day < credDay) return same; // stale response from an earlier day
  if (xpToday && typeof xpToday.day === 'string' && day < xpToday.day) return same;
  const base = credDay === day ? wholeNonNeg(credited.rounds) : 0;
  const rounds = wholeNonNeg(progress.rounds);
  const delta = Math.max(0, rounds - base);
  const t = xpTodayFor(xpToday, day);
  const room = Math.max(0, CASINO_XP_DAILY_CAP - t.casino);
  const xp = Math.min(delta * CASINO_XP_PER_ROUND, room);
  const nextCredited = { day, rounds: Math.max(base, rounds) };
  if (!delta && credDay === day) return same; // nothing new: keep the exact objects
  return { xp, credited: nextCredited, xpToday: xp ? { ...t, casino: t.casino + xp } : t };
}

/** The "How to earn XP" lines shown in the Missions tab. */
export function xpSourceLines() {
  const ms = Object.values(MISSION_XP);
  return [
    { id: 'games', title: 'Play games', text: `${GAME_XP_PER_COIN} XP per coin staked (up to ${GAME_XP_DAILY_CAP} a day)` },
    { id: 'casino', title: 'Casino on bwanabet', text: `${CASINO_XP_PER_ROUND} XP per round (up to ${CASINO_XP_DAILY_CAP} a day)` },
    { id: 'missions', title: 'Casino missions', text: `${Math.min(...ms)} to ${Math.max(...ms)} XP` },
    { id: 'daily', title: 'Daily reward', text: `${DAILY_LOGIN_XP} XP` },
  ];
}
