// FRIENDLY MATCH — the second chance (2026-10-09). Pure + deterministic.
//
// When a league match or a World Cup match (group or knockout, never the
// Final) ends LOST, the player is offered a friendly vs a weaker local side:
//   offer   open for cfg.friendly.offerHours (24) after FULL-TIME (the Lusaka
//           midnight that ends the match), accepted by paying coins
//   cost    league = leagueCostPercent (50%) of that match's win bonus
//           (Zambia 75 / South Africa 125 / England 200 / top 300);
//           World Cup group 250, knockout 1,000
//   target  targetPercent (50%) of the lost match's target, rounded UP to
//           roundTo (10): league 600, WC group 700, R32 800 ...
//   window  windowHours (24) from the ACCEPT time. XP is reported per Lusaka
//           day, so the friendly counts the capped XP of every Lusaka day the
//           window touches: the accept day through the day of the deadline
//           (with 24h, always 2 days). It is won as soon as that XP reaches the
//           target, lost once the deadline passes short. The same XP also
//           counts toward the next match (normal 400/day, 2,000/week caps).
//   limits  league: one per league week (only that week's lost match);
//           World Cup: ONE accepted friendly per cup run in total.
//   win     the loss is reversed (league: a win, bonus + points claimable;
//           WC group: bonus claimable; WC knockout: Zambia reinstated, the
//           next round starts the day after the friendly's last day).
//   lose / expire / decline: the original loss stands; no refund.
// State: user.season.friendlies = { [key]: { acceptedAt, paid } | { declinedAt } },
// key = 'league:<weekStart>' | 'wc:<roundId>'. Coins are client-held: the
// server prize check (verify.mjs) trusts the accept TIME only when it falls in
// the offer window, and recomputes the friendly's result from player_activity.
import { SEASON_DEFAULTS } from './config.mjs';
import { addDays, xpBetween } from './xp.mjs';
import { lusakaDay, isIsoDay } from '../casino/feed.mjs';

const HOUR = 3600000;

/** Weaker local sides: synonym parodies of real Zambian clubs (never the real names, never misspellings). */
export const FRIENDLY_OPPONENTS = Object.freeze(['Kabwe Fighters', 'Nchanga Wanderers', 'Lusaka Dynamics', 'Fish Eagles FC']);

const fcfg = (cfg) => (cfg && cfg.friendly) || SEASON_DEFAULTS.friendly;

/** 'league:<weekStart>' | 'wc:<roundId>'. */
export const friendlyKey = (kind, id) => `${kind === 'wc' ? 'wc' : 'league'}:${id}`;
const KEY_RE = /^(league:\d{4}-\d{2}-\d{2}|wc:[a-z0-9]{1,16})$/;

/** Full-time of a match whose last Lusaka day is `endDay` (ms): the following Lusaka midnight. */
export function fullTimeMs(endDay) {
  return Date.parse(`${addDays(endDay, 1)}T00:00:00Z`) - 2 * HOUR;
}

/** Half the lost match's target, rounded up to the step, never above maxTarget (keeps it winnable). */
export function friendlyTarget(target, cfg = SEASON_DEFAULTS) {
  const F = fcfg(cfg);
  const step = Math.max(1, F.roundTo);
  const t = Math.ceil((Number(target) || 0) * F.targetPercent / 100 / step) * step;
  return F.maxTarget ? Math.min(t, F.maxTarget) : t;
}

/**
 * Entry cost in coins: league = % of the match's win bonus (rounded up);
 * World Cup group / knockout = flat. The Final has no friendly (null).
 */
export function friendlyCost(kind, round, bonus, cfg = SEASON_DEFAULTS) {
  const F = fcfg(cfg);
  if (kind === 'league') return Math.ceil((Number(bonus) || 0) * F.leagueCostPercent / 100);
  if (round === 'group') return F.wcGroupCost;
  if (round === 'knockout') return F.wcKnockoutCost;
  return null;
}

/** Deterministic opponent for a friendly key. */
export function friendlyOpponent(key) {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FRIENDLY_OPPONENTS[h % FRIENDLY_OPPONENTS.length];
}

const toMs = (v) => (typeof v === 'number' ? v : typeof v === 'string' && v ? Date.parse(v) : NaN);

/**
 * The accept time (ms) when the entry was accepted inside the offer window
 * [full-time, full-time + offerHours) and not in the future, else null.
 */
export function acceptedAtMs(entry, endDay, cfg = SEASON_DEFAULTS, now = Date.now()) {
  if (!entry || typeof entry !== 'object' || !isIsoDay(endDay)) return null;
  const t = toMs(entry.acceptedAt);
  if (!Number.isFinite(t)) return null;
  const ft = fullTimeMs(endDay);
  if (t < ft || t >= ft + fcfg(cfg).offerHours * HOUR || t > now) return null;
  return t;
}

/** The Lusaka days a friendly accepted at `acceptedAt` counts: { from, to, deadline }. */
export function friendlyDays(acceptedAt, cfg = SEASON_DEFAULTS) {
  const deadline = acceptedAt + fcfg(cfg).windowHours * HOUR;
  return { from: lusakaDay(acceptedAt), to: lusakaDay(deadline), deadline };
}

/**
 * The friendly attached to a LOST match. Returns null for the Final.
 *   kind      'league' | 'wc'
 *   matchId   league weekStart | World Cup round id
 *   round     'group' | 'knockout' | 'final' (World Cup) — ignored for the league
 *   endDay    the lost match's last day; lostTarget its target; bonus its win bonus
 *   entry     user.season.friendlies[key]
 *   eligible  false once the limit is used (World Cup: another round's friendly)
 *   context   extra fields copied onto the result (titles, home side, ...)
 * status: 'offer' | 'expired' | 'declined' | 'unavailable' | 'live' | 'won' | 'lost'.
 */
export function friendlyState({ kind, matchId, round = null, endDay, lostTarget, bonus = 0, season, entry = null, eligible = true, now = Date.now(), cfg = SEASON_DEFAULTS, context = null }) {
  if (kind === 'wc' && round !== 'group' && round !== 'knockout') return null;
  const F = fcfg(cfg);
  const key = friendlyKey(kind, matchId);
  const opponent = friendlyOpponent(key);
  const fullTimeAt = fullTimeMs(endDay);
  const offerEndsAt = fullTimeAt + F.offerHours * HOUR;
  const base = {
    ...(context || {}), key, kind, matchId, round: kind === 'wc' ? round : 'league', endDay, opponent,
    target: friendlyTarget(lostTarget, cfg), cost: friendlyCost(kind, round, bonus, cfg),
    fullTimeAt, offerEndsAt, acceptedAt: null, deadline: null, from: null, to: null, xp: 0, msLeft: 0,
  };
  base.gap = base.target;
  const acc = eligible ? acceptedAtMs(entry, endDay, cfg, now) : null;
  if (acc == null) {
    if (!eligible) return { ...base, status: 'unavailable' };
    if (entry && typeof entry === 'object' && entry.declinedAt) return { ...base, status: 'declined' };
    const open = now < offerEndsAt;
    return { ...base, status: open ? 'offer' : 'expired', msLeft: open ? Math.max(0, offerEndsAt - Math.max(now, fullTimeAt)) : 0 };
  }
  const { from, to, deadline } = friendlyDays(acc, cfg);
  const xp = season ? xpBetween(season, from, to) : 0;
  const status = xp >= base.target ? 'won' : now >= deadline ? 'lost' : 'live';
  return {
    ...base, status, acceptedAt: acc, deadline, from, to, xp, gap: Math.max(0, base.target - xp),
    paid: Number(entry.paid) > 0 ? Math.floor(Number(entry.paid)) : 0,
    msLeft: status === 'live' ? deadline - now : 0,
  };
}

/** Sanitised user.season.friendlies (hydration, the claim payload): unknown keys / junk dropped. */
export function cleanFriendlies(v) {
  const out = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  let n = 0;
  for (const [k, e] of Object.entries(v)) {
    if (++n > 400) break;
    if (!KEY_RE.test(k) || !e || typeof e !== 'object' || Array.isArray(e)) continue;
    const t = toMs(e.acceptedAt);
    if (Number.isFinite(t)) {
      out[k] = { acceptedAt: new Date(t).toISOString(), paid: Number(e.paid) > 0 ? Math.floor(Number(e.paid)) : 0 };
      continue;
    }
    const d = toMs(e.declinedAt);
    if (Number.isFinite(d)) out[k] = { declinedAt: new Date(d).toISOString() };
  }
  return out;
}

/** Accept an OPEN offer: the new friendlies map, or null when it cannot be accepted. */
export function acceptFriendly(friendlies, f, now = Date.now()) {
  if (!f || f.status !== 'offer' || now >= f.offerEndsAt) return null;
  const map = cleanFriendlies(friendlies);
  if (map[f.key] && map[f.key].acceptedAt) return null;
  // an accept stamped a moment before full-time (clock skew) still lands in the window
  const at = Math.max(now, f.fullTimeAt);
  return { ...map, [f.key]: { acceptedAt: new Date(at).toISOString(), paid: f.cost } };
}

/** "No thanks": the new friendlies map, or null when there is no open offer. */
export function declineFriendly(friendlies, f, now = Date.now()) {
  if (!f || f.status !== 'offer') return null;
  const map = cleanFriendlies(friendlies);
  if (map[f.key]) return null;
  return { ...map, [f.key]: { declinedAt: new Date(now).toISOString() } };
}

/** Friendlies the player should see now (an open offer or a live friendly). */
export const isActiveFriendly = (f) => !!f && (f.status === 'offer' || f.status === 'live');
