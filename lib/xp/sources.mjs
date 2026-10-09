// Platform XP sources (2026-10-08; retuned 2026-10-09 for the Season system).
// Every number that earns XP INSIDE the widget lives here; XP from real play
// on bwanabet (CRM feed) and every cap live in lib/season/config.mjs, and
// lib/season/xp.mjs merges both. Pure ESM, relative imports only, so
// node --test loads it (tests/xp-sources.test.mjs).
//
// Platform sources (together capped at SEASON_DEFAULTS.platformDailyCap = 60 a
// day by the season engine):
//   - daily login claim: DAILY_LOGIN_XP
//   - game rounds: 1 XP per coin staked
//   - casino mission claims: MISSION_XP per mission id
//   - casino rounds on bwanabet.com (casino_activity feed): 1 XP per round —
//     dropped by the engine on days the player_activity feed has a row (that
//     row already pays XP for the casino stake)
//
// Per-day tallies live in user state as
//   xpToday  = { day, daily, games, missions, casino }  (today's XP per source)
//   xpDays   = { 'YYYY-MM-DD': { daily, games, missions, casino } }  (history, latest 400 days)
//   casinoXp = { day, rounds }                          (casino rounds already converted)
// xpToday resets when the Africa/Lusaka day changes; junk/missing values count
// as a fresh day, so old saved blobs without them are safe.
import { lusakaDay } from '../casino/feed.mjs';
import { SEASON_DEFAULTS } from '../season/config.mjs';

export const PLATFORM_XP_DAILY_CAP = SEASON_DEFAULTS.platformDailyCap;

export const DAILY_LOGIN_XP = 20;

export const GAME_XP_PER_COIN = 1;
export const GAME_XP_DAILY_CAP = PLATFORM_XP_DAILY_CAP;

export const CASINO_XP_PER_ROUND = 1;
export const CASINO_XP_DAILY_CAP = PLATFORM_XP_DAILY_CAP;

/** XP paid when each daily casino mission is claimed (lib/missions/casino.mjs reads this). */
export const MISSION_XP = Object.freeze({
  casino_starter: 10,
  casino_regular: 15,
  casino_pro: 20,
  casino_legend: 30,
});

export const XP_DAYS_KEPT = 400;

export { lusakaDay };

const wholeNonNeg = (n) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

/** user.xpToday normalised to `day` (another day, or junk, counts as a fresh day). */
export function xpTodayFor(xpToday, day) {
  if (!xpToday || typeof xpToday !== 'object' || xpToday.day !== day) return { day, daily: 0, games: 0, missions: 0, casino: 0 };
  return { day, daily: wholeNonNeg(xpToday.daily), games: wholeNonNeg(xpToday.games), missions: wholeNonNeg(xpToday.missions), casino: wholeNonNeg(xpToday.casino) };
}

/** Today's platform XP before the season engine's 60 cap. */
export const platformXpOf = (t) => (t ? wholeNonNeg(t.daily) + wholeNonNeg(t.games) + wholeNonNeg(t.missions) + wholeNonNeg(t.casino) : 0);

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

/** The daily-reward claim: { xp, xpToday } (once a day; a second call adds nothing). */
export function addDailyXp(xpToday, day = lusakaDay()) {
  const t = xpTodayFor(xpToday, day);
  if (t.daily >= DAILY_LOGIN_XP) return { xp: 0, xpToday: t };
  const xp = DAILY_LOGIN_XP - t.daily;
  return { xp, xpToday: { ...t, daily: DAILY_LOGIN_XP } };
}

/** A casino-mission claim worth `xp`: { xp, xpToday }. */
export function addMissionXp(xpToday, xp, day = lusakaDay()) {
  const t = xpTodayFor(xpToday, day);
  const n = wholeNonNeg(xp);
  return { xp: n, xpToday: n ? { ...t, missions: t.missions + n } : t };
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

/**
 * Copy today's tally into the per-day history the season engine reads
 * (user.xpDays). Keeps the latest XP_DAYS_KEPT days; returns the same object
 * when nothing changed.
 */
export function recordXpDay(xpDays, xpToday, maxDays = XP_DAYS_KEPT) {
  const prev = xpDays && typeof xpDays === 'object' && !Array.isArray(xpDays) ? xpDays : {};
  if (!xpToday || typeof xpToday.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(xpToday.day)) return prev;
  const t = xpTodayFor(xpToday, xpToday.day);
  const entry = { daily: t.daily, games: t.games, missions: t.missions, casino: t.casino };
  const old = prev[t.day];
  if (old && old.daily === entry.daily && old.games === entry.games && old.missions === entry.missions && old.casino === entry.casino) return prev;
  const next = { ...prev, [t.day]: entry };
  const keys = Object.keys(next).sort();
  if (keys.length > maxDays) for (const k of keys.slice(0, keys.length - maxDays)) delete next[k];
  return next;
}

/** The "How to earn XP" lines shown in the Missions tab (season numbers from `cfg`). */
export function xpSourceLines(cfg = SEASON_DEFAULTS) {
  const ms = Object.values(MISSION_XP);
  const fmt = (n) => Number(n).toLocaleString('en-US');
  return [
    { id: 'casino', title: 'Casino on bwanabet', text: `1 XP per K${cfg.crm.casinoStakePerXp} staked` },
    { id: 'sports', title: 'Sports on bwanabet', text: `1 XP per K${cfg.crm.sportsStakePerXp} on settled slips (odds 1.5+)` },
    { id: 'deposit', title: 'Deposit day', text: `${cfg.crm.depositDayXp} XP` },
    { id: 'app', title: 'Here in the app', text: `daily reward ${DAILY_LOGIN_XP} XP, games ${GAME_XP_PER_COIN} XP per coin, missions ${Math.min(...ms)} to ${Math.max(...ms)} XP (up to ${cfg.platformDailyCap} a day)` },
    { id: 'caps', title: 'Limits', text: `${fmt(cfg.dailyCap)} XP a day, ${fmt(cfg.weeklyCap)} a week; extra XP stocks Vuma's side hustle` },
  ];
}
