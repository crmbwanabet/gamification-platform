// ============================================================================
// XP collect moments (2026-10-13): pure helpers behind the "stars fly into the
// stage bar" animation (components/redesign/XpCollect.jsx).
//  - starCount: how many stars a collect of N XP shows
//  - feedNews:  the CRM XP the player has NOT seen yet, per source, from the
//               season feed rows vs the saved user.xpFeedSeen marker
//  - splitBarHustle: which rows' XP fills the bar and which spills into the
//               side hustle (XP over the daily/weekly max)
// Pure ESM so node --test can pin it (tests/xp-collect.test.mjs).
// ============================================================================

import { SEASON_DEFAULTS } from '../season/config.mjs';
import { cleanActivityRow, crmXpParts } from '../season/xp.mjs';

/** Days of feed rows the seen marker remembers (the feed only rewrites ±2 days). */
export const FEED_SEEN_DAYS = 14;

/** 1 star per 6 XP, at least 4, at most 12 (a 400 XP day still reads fast). */
export function starCount(amount) {
  const n = Math.round((Number(amount) || 0) / 6);
  return Math.max(4, Math.min(12, n));
}

const whole = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);

/** One day's seen snapshot: XP per source + the raw numbers the card labels use. */
function snapshot(row, cfg) {
  const p = crmXpParts(row, cfg);
  return { casino: p.casino, sports: p.sports, deposit: p.deposit,
    casinoStake: whole(row.casino_stake), sportsStake: whole(row.sports_stake), slips: whole(row.sports_slips) };
}

/**
 * What the season feed brought that the player hasn't seen.
 *   rows — GET /api/season days (player_activity rows)
 *   seen — user.xpFeedSeen ({ 'YYYY-MM-DD': snapshot }) or undefined
 * Returns { first, parts: {casino, sports, deposit}, total, stakes: {casino, sports, slips}, seen }.
 * `first` = no marker saved yet: the marker is set silently (no card), so a
 * player's whole history never arrives as one giant "new XP" card.
 * Feed totals are absolute and max-wins, so a day only ever grows; a shrink
 * (CRM correction) counts as 0 new.
 */
export function feedNews(rows, seen, cfg = SEASON_DEFAULTS) {
  // one row per day (a duplicate day: max wins per column, like the engine)
  const byDay = new Map();
  for (const raw of Array.isArray(rows) ? rows : []) {
    const r = cleanActivityRow(raw);
    if (!r) continue;
    const prev = byDay.get(r.day);
    if (prev) for (const k of Object.keys(r)) if (k !== 'day') r[k] = Math.max(r[k], prev[k]);
    byDay.set(r.day, r);
  }
  const days = [...byDay.keys()].sort().slice(-FEED_SEEN_DAYS);
  const first = !seen || typeof seen !== 'object' || Array.isArray(seen);
  const oldest = first ? null : Object.keys(seen).sort()[0];
  const parts = { casino: 0, sports: 0, deposit: 0 };
  const stakes = { casino: 0, sports: 0, slips: 0 };
  const next = {};
  for (const day of days) {
    const cur = snapshot(byDay.get(day), cfg);
    next[day] = cur;
    if (first) continue;
    const old = seen[day];
    // a day older than the marker's oldest was seen before it was trimmed
    const prev = old && typeof old === 'object' ? old : (oldest && day < oldest ? cur : null);
    for (const k of ['casino', 'sports', 'deposit']) parts[k] += Math.max(0, cur[k] - whole(prev?.[k]));
    stakes.casino += Math.max(0, cur.casinoStake - whole(prev?.casinoStake));
    stakes.sports += Math.max(0, cur.sportsStake - whole(prev?.sportsStake));
    stakes.slips += Math.max(0, cur.slips - whole(prev?.slips));
  }
  return { first, parts, total: parts.casino + parts.sports + parts.deposit, stakes, seen: next };
}

/**
 * Split card rows between the stage bar and the side hustle: rows fill the
 * bar in order until `barXp` (the capped XP that actually counted) is used up;
 * the rest is overflow. rows = [{ xp, ... }] -> [{ ...row, bar, hustle }].
 */
export function splitBarHustle(rows, barXp) {
  let left = Math.max(0, Math.floor(Number(barXp) || 0));
  return rows.map(r => {
    const xp = Math.max(0, Math.floor(Number(r.xp) || 0));
    const bar = Math.min(xp, left);
    left -= bar;
    return { ...r, bar, hustle: xp - bar };
  });
}
