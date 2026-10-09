// Season XP engine (2026-10-09). Pure + deterministic: the same daily rows
// always give the same XP, so the client, GET /api/season consumers and the
// server prize check (lib/season/verify.mjs) all agree.
//
// Per Lusaka day:
//   CRM XP      = floor(casino_stake / 10) + floor(sports_stake / 4)
//                 + 30 on a deposit day (skipped when withdrawals >= deposits
//                   and nothing was staked that day: a pure cash cycle)
//   platform XP = daily claim + game rounds + casino missions + casino rounds
//                 (casino rounds are DROPPED on days with a player_activity
//                 row: that row already counts the casino stake), capped 60
//   day XP      = min(CRM + platform, 400), then the 2,000-per-week cap
// Everything above a cap is OVERFLOW (it stocks the side hustle), never XP.
// All numbers come from lib/season/config.mjs.
import { SEASON_DEFAULTS } from './config.mjs';
import { isIsoDay, dayDiff } from '../casino/feed.mjs';
import { VUMA_STAGES } from '../vuma/stages.mjs';

export { dayDiff, isIsoDay };

const DAY_MS = 86400000;

/** 'YYYY-MM-DD' + n days. */
export function addDays(day, n) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Monday of the Lusaka week (Mon–Sun) that `day` falls in. */
export function weekStart(day) {
  const dow = new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(day, -((dow + 6) % 7));
}

const pos = (v) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
};
const cents = (v) => Math.round(pos(v) * 100);

export const ACTIVITY_COLUMNS = ['deposits_amount', 'deposits_count', 'withdrawals_amount', 'casino_stake', 'casino_rounds', 'sports_stake', 'sports_slips'];

/** A player_activity row with every column a non-negative number, or null without a valid day. */
export function cleanActivityRow(r) {
  if (!r || typeof r !== 'object' || !isIsoDay(r.day)) return null;
  const out = { day: r.day };
  for (const c of ACTIVITY_COLUMNS) out[c] = pos(r[c]);
  return out;
}

/** CRM XP for one day's player_activity row. */
export function crmDayXp(row, cfg = SEASON_DEFAULTS) {
  if (!row) return 0;
  const c = cfg.crm;
  // integer cents so 0.1 + 0.2 style float noise never loses an XP point
  const casino = Math.floor(cents(row.casino_stake) / (c.casinoStakePerXp * 100));
  const sports = Math.floor(cents(row.sports_stake) / (c.sportsStakePerXp * 100));
  const staked = cents(row.casino_stake) + cents(row.sports_stake) > 0;
  const cashCycle = cents(row.withdrawals_amount) >= cents(row.deposits_amount) && !staked;
  const deposit = pos(row.deposits_count) > 0 && !cashCycle ? c.depositDayXp : 0;
  return casino + sports + deposit;
}

/**
 * Platform XP for one day. `entry` is the client's per-source tally
 * { daily, games, missions, casino } (user.xpDays[day]) or a plain number
 * (the server's assumed value). Casino-rounds XP is dropped when the feed has
 * a row for that day. Capped at cfg.platformDailyCap.
 */
export function platformDayXp(entry, hasFeedRow = false, cfg = SEASON_DEFAULTS) {
  let total = 0;
  if (typeof entry === 'number') total = Math.floor(pos(entry));
  else if (entry && typeof entry === 'object') {
    total = Math.floor(pos(entry.daily)) + Math.floor(pos(entry.games)) + Math.floor(pos(entry.missions))
      + (hasFeedRow ? 0 : Math.floor(pos(entry.casino)));
  }
  return Math.min(total, cfg.platformDailyCap);
}

const own = (o, k) => o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);

/**
 * The whole season, day by day.
 *  rows     — player_activity rows ({ day, ...columns }), any order
 *  platform — { 'YYYY-MM-DD': entry } platform XP per day (see platformDayXp)
 *  today    — days after it are ignored (null = no limit)
 * Returns { days: [{ day, week, crmXp, platformXp, raw, xp, overflow, cumXp, cumOverflow, hasFeed }],
 *           xp, overflow, feedDays }.
 */
export function computeSeasonXp({ rows = [], platform = {}, cfg = SEASON_DEFAULTS, today = null } = {}) {
  const inSeason = (d) => isIsoDay(d) && (!cfg.startDay || d >= cfg.startDay) && (!today || d <= today);
  const feed = new Map();
  for (const raw of Array.isArray(rows) ? rows : []) {
    const r = cleanActivityRow(raw);
    if (!r || !inSeason(r.day)) continue;
    const prev = feed.get(r.day);
    if (prev) for (const c of ACTIVITY_COLUMNS) r[c] = Math.max(r[c], prev[c]); // duplicate day: max wins
    feed.set(r.day, r);
  }
  const daySet = new Set(feed.keys());
  if (platform && typeof platform === 'object') for (const d of Object.keys(platform)) if (inSeason(d)) daySet.add(d);
  const sorted = [...daySet].sort();

  const days = [];
  let cumXp = 0, cumOverflow = 0, week = null, weekXp = 0;
  for (const day of sorted) {
    const wk = weekStart(day);
    if (wk !== week) { week = wk; weekXp = 0; }
    const row = feed.get(day) || null;
    const crmXp = crmDayXp(row, cfg);
    const platformXp = platformDayXp(own(platform, day) ? platform[day] : 0, !!row, cfg);
    const raw = crmXp + platformXp;
    const daily = Math.min(raw, cfg.dailyCap);
    const xp = Math.min(daily, Math.max(0, cfg.weeklyCap - weekXp));
    const overflow = raw - xp;
    weekXp += xp; cumXp += xp; cumOverflow += overflow;
    days.push({ day, week: wk, crmXp, platformXp, raw, xp, overflow, cumXp, cumOverflow, hasFeed: !!row });
  }
  return { days, xp: cumXp, overflow: cumOverflow, feedDays: feed.size };
}

/** Cumulative `field` (cumXp | cumOverflow) through the end of `day` (0 before any data). */
export function cumAt(season, day, field = 'cumXp') {
  let v = 0;
  for (const d of season.days) { if (d.day > day) break; v = d[field]; }
  return v;
}

/** Capped XP earned on the days from..to (inclusive). */
export function xpBetween(season, from, to) {
  let s = 0;
  for (const d of season.days) if (d.day >= from && d.day <= to) s += d.xp;
  return s;
}

/** First day the season's cumulative XP reached `xp`, or null. */
export function reachDay(season, xp) {
  if (!(xp > 0)) return season.days[0]?.day || null;
  for (const d of season.days) if (d.cumXp >= xp) return d.day;
  return null;
}

/** First day the player reached story stage `stage` (1..17), or null. */
export function stageReachDay(season, stage) {
  const s = VUMA_STAGES[Math.max(1, Math.min(VUMA_STAGES.length, stage)) - 1];
  return reachDay(season, s.xp);
}

/** { day: cap } for every day from..to — the server's "platform XP at its maximum" assumption. */
export function maxPlatformDays(from, to, cfg = SEASON_DEFAULTS, maxDays = 1000) {
  const out = {};
  if (!isIsoDay(from) || !isIsoDay(to) || from > to) return out;
  const n = Math.min(dayDiff(from, to), maxDays);
  for (let i = 0; i <= n; i++) out[addDays(from, i)] = cfg.platformDailyCap;
  return out;
}

/** Whole hours (and minutes) until the end of Lusaka day `lastDay` from `now` (ms timestamp). */
export function msUntilDayEnd(lastDay, now = Date.now()) {
  const endUtc = Date.parse(`${addDays(lastDay, 1)}T00:00:00Z`) - 2 * 3600000; // Lusaka midnight = 22:00 UTC
  return Math.max(0, endUtc - now);
}
