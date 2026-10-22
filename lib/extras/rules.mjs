// Pure rules for the 2026-10-19 extras: weekly leaderboard, comeback reward
// and match-day predictions. node --test loads it directly; the API routes
// (app/api/leaderboard, app/api/comeback, app/api/predictions, app/api/crm)
// do the database work around it.
import { crmDayXp, addDays, weekStart } from '../season/xp.mjs';
import { SEASON_DEFAULTS } from '../season/config.mjs';
import { getStage } from '../vuma/stages.mjs';
import { dayDiff } from '../casino/feed.mjs';

// ---------------------------------------------------------------------------
// Leaderboard: players compete only with players at similar stages, on the
// XP they earned THIS Lusaka week (Mon–Sun) from real play (the CRM feed:
// casino stake, sports stake, deposit day). Platform XP (games, daily claim,
// missions) is left out on purpose: it is counted in the browser and could
// be faked, the CRM rows cannot. Daily and weekly caps apply as in the season.
// ---------------------------------------------------------------------------
export const LEAGUE_BANDS = [
  { id: 'street', name: 'Street league', from: 1, to: 4 },
  { id: 'amateur', name: 'Amateur league', from: 5, to: 7 },
  { id: 'pro', name: 'Pro league', from: 8, to: 11 },
  { id: 'intl', name: 'International league', from: 12, to: 19 },
];
/** Coins for a final weekly rank (1-based); 0 outside the prizes. */
export const LEADERBOARD_PRIZES = [5000, 2500, 1000, 500, 500, 500, 500, 500, 500, 500];
export const prizeForRank = (rank) => (Number.isInteger(rank) && rank >= 1 ? LEADERBOARD_PRIZES[rank - 1] || 0 : 0);
export const BOARD_SIZE = 10;

export const bandForStage = (stage) => LEAGUE_BANDS.find(b => stage >= b.from && stage <= b.to) || LEAGUE_BANDS[0];
export const bandForXp = (xp) => bandForStage(getStage(xp).stage);

/** "12••56": a partly hidden player ID for public boards. */
export function maskId(id) {
  const s = String(id ?? '');
  if (s.length <= 4) return `${s.slice(0, 1)}••`;
  return `${s.slice(0, 2)}••${s.slice(-2)}`;
}

/** { userId: weekXp } from player_activity rows of one week (daily + weekly caps). */
export function weeklyXpByUser(rows, cfg = SEASON_DEFAULTS) {
  const out = {};
  for (const r of rows || []) {
    if (!r || r.user_id == null) continue;
    const id = String(r.user_id);
    out[id] = (out[id] || 0) + Math.min(crmDayXp(r, cfg), cfg.dailyCap);
  }
  for (const id of Object.keys(out)) out[id] = Math.min(out[id], cfg.weeklyCap);
  return out;
}

/**
 * Rank players per band. entries = [{ userId, xp (week), totalXp (for the
 * band), name }]. Ties: the earlier-listed player first (callers pass a
 * stable order). Players with 0 XP are not ranked.
 * Returns { [bandId]: [{ rank, userId, xp, name }] }.
 */
export function rankBoard(entries) {
  const bands = Object.fromEntries(LEAGUE_BANDS.map(b => [b.id, []]));
  for (const e of entries || []) {
    if (!(e.xp > 0)) continue;
    bands[bandForXp(e.totalXp).id].push(e);
  }
  for (const id of Object.keys(bands)) {
    bands[id] = bands[id]
      .map((e, i) => ({ e, i }))
      .sort((a, b) => b.e.xp - a.e.xp || a.i - b.i)
      .map(({ e }, i) => ({ rank: i + 1, userId: String(e.userId), xp: e.xp, name: e.name || null }));
  }
  return bands;
}

/** Monday of the week before `today`'s week, and its Sunday. */
export function lastWeek(today) {
  const from = addDays(weekStart(today), -7);
  return { from, to: addDays(from, 6) };
}
export const thisWeek = (today) => ({ from: weekStart(today), to: today });

// ---------------------------------------------------------------------------
// Comeback: a player whose last real-money activity was 7+ days ago gets a
// one-time bonus on their next visit (the CRM sends the SMS that brings them
// back; GET /api/crm/inactive-players gives it the list). One bonus per lapse:
// the claim is keyed by the last active day before the gap.
// ---------------------------------------------------------------------------
export const COMEBACK = { minDays: 7, maxDays: 60, coins: 1000 };

export function isActiveRow(r) {
  if (!r) return false;
  return ['casino_stake', 'sports_stake', 'deposits_amount', 'casino_rounds', 'sports_slips', 'deposits_count'].some(k => Number(r[k]) > 0);
}

/** Latest active day strictly before `today`, or null. */
export function lastActiveBefore(rows, today) {
  let best = null;
  for (const r of rows || []) if (r && r.day < today && isActiveRow(r) && (!best || r.day > best)) best = r.day;
  return best;
}

/**
 * { eligible, lastActiveDay, daysAway, coins }. Eligible when the player was
 * active before, the gap is at least minDays, and that lapse is not claimed.
 */
export function comebackOffer(rows, today, claimedDays = [], cfg = COMEBACK) {
  const lastActiveDay = lastActiveBefore(rows, today);
  if (!lastActiveDay) return { eligible: false, lastActiveDay: null, daysAway: 0, coins: cfg.coins };
  const daysAway = dayDiff(lastActiveDay, today);
  const claimed = (claimedDays || []).includes(lastActiveDay);
  return { eligible: daysAway >= cfg.minDays && !claimed, lastActiveDay, daysAway, coins: cfg.coins };
}

/** Players for the CRM's SMS: last active minDays..maxDays ago (rows = recent window). */
export function inactivePlayers(rows, today, claimed = new Set(), cfg = COMEBACK) {
  const last = {};
  for (const r of rows || []) {
    if (!r || !isActiveRow(r) || r.day > today) continue;
    const id = String(r.user_id);
    if (!last[id] || r.day > last[id]) last[id] = r.day;
  }
  const out = [];
  for (const [userId, day] of Object.entries(last)) {
    const daysInactive = dayDiff(day, today);
    if (daysInactive < cfg.minDays || daysInactive > cfg.maxDays) continue;
    if (claimed.has(`${userId}:${day}`)) continue;
    out.push({ userId, lastActiveDay: day, daysInactive });
  }
  return out.sort((a, b) => a.daysInactive - b.daysInactive || (a.userId < b.userId ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Predictions = a WEEKLY slip (owner 2026-10-20): free 1X2 picks on real
// top-league fixtures (bwanabet's own sportsbook API). Each Lusaka week
// (Mon–Sun, by the day the pick was made) a player picks SLIP_SIZE matches;
// ALL of them right pays PREDICTION_COINS once for that week. One wrong pick
// loses the week. Picks close 5 minutes before kick-off.
// ---------------------------------------------------------------------------
export const PICKS = ['home', 'draw', 'away'];
export const PREDICTION_COINS = 200;
export const SLIP_SIZE = 5;
export const PICK_CLOSE_MS = 5 * 60 * 1000;

export const pickOpen = (kickoffIso, now = Date.now()) => {
  const t = Date.parse(kickoffIso);
  return Number.isFinite(t) && t - now > PICK_CLOSE_MS;
};

/** 'won' | 'lost' for a pick against a result { outcome }. */
export const settlePick = (pick, result) => (result && PICKS.includes(result.outcome) ? (pick === result.outcome ? 'won' : 'lost') : null);

/**
 * A week's slip from the player's prediction rows ({ pick, outcome, settled_at,
 * claimed_at, pick_day, kickoff }): { week, picks, size, right, status, claimed,
 * claimable }. status: 'open' (fewer than SLIP_SIZE picks, none wrong yet) |
 * 'pending' (full, results to come) | 'won' (all right) | 'lost' (one wrong).
 */
export function weekSlip(rows, week, size = SLIP_SIZE) {
  const picks = (Array.isArray(rows) ? rows : [])
    .filter(r => r && typeof r.pick_day === 'string' && weekStart(r.pick_day) === week)
    .sort((a, b) => (a.kickoff < b.kickoff ? -1 : a.kickoff > b.kickoff ? 1 : 0))
    .slice(0, size);
  const res = picks.map(r => (r.settled_at ? settlePick(r.pick, { outcome: r.outcome }) : null));
  const right = res.filter(x => x === 'won').length;
  const status = res.includes('lost') ? 'lost' : picks.length < size ? 'open' : right === size ? 'won' : 'pending';
  const claimed = picks.some(r => !!r.claimed_at);
  return { week, picks, size, right, status, claimed, claimable: status === 'won' && !claimed };
}

// The story bubble's "LET'S GO!" button pays this once, ever (owner 2026-10-20;
// user.storyPrizeClaimed). Platform XP, so it counts toward the 60/day cap.
export const STORY_PRIZE = { coins: 100, xp: 10 };

// Saving a name for the first time pays this XP once, ever (owner 2026-10-22;
// user.namePrizeClaimed). Platform XP, so it counts toward the 60/day cap.
export const NAME_PRIZE = { coins: 0, xp: 20 };
