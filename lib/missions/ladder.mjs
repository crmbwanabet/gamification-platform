// BwanaBet missions (2026-10-20): ONE-TIME missions in four ladders, sized so
// a regular player needs about six months to finish them all. Pure, node
// --test loads it directly. Replaces the daily casino missions (2026-10-07)
// and the daily/weekend bet-slip missions (2026-10-19), both now in parked/.
//
// NO SPILL-OVER (2026-10-21): only a ladder's CURRENT rung can be completed,
// counting from zero since the previous rung was collected (see missionStates).
// The first rung of every ladder counts from the player's FIRST LOGIN to the Bonus Center (the
// Lusaka day their profile was created, `since` from GET /api/missions/progress):
//   casino   — casino rounds (casino_activity feed, summed on the server)
//   sports   — settled real-money bet slips at odds 1.5+ (player_activity.sports_slips)
//   deposits — days with a deposit (player_activity.deposits_count > 0)
//   logins   — days the daily reward was claimed (user.xpDays[day].daily > 0)
// Each mission is claimable ONCE, ever; claims live in user.missionClaims
// (array of ids). Targets/rewards/xp can be tuned per id through the
// remote-config mission_overrides row (lib/config/missions.mjs).
//
// Pace used for the sizing (a regular player): ~40 casino rounds a day,
// ~2 slips a day, deposits 2 days a week, the daily reward 5 days a week.
// Six months then reach ~7,300 rounds / ~360 slips / ~52 deposit days /
// ~130 login days — the last rung of each ladder.
import { MISSION_XP } from '../xp/sources.mjs';

export const MISSION_TRACKS = {
  casino: { label: 'Casino', unit: 'rounds', image: 'slotMachine' },
  sports: { label: 'Sports', unit: 'bets', image: 'trophy' },
  deposits: { label: 'Deposits', unit: 'days', image: 'crown' },
  logins: { label: 'Loyalty', unit: 'days', image: 'playingCards' },
};

const n = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
const plural = (k, one, many) => (k === 1 ? one : many);

const DIFF = ['easy', 'easy', 'medium', 'medium', 'hard', 'hard', 'legend', 'legend', 'legend', 'legend'];
// [id, name, target, coins]
const LADDERS = {
  casino: [
    ['casino_starter', 'Casino Starter', 20, 50],
    ['casino_regular', 'Casino Regular', 50, 100],
    ['casino_pro', 'Casino Pro', 100, 500],
    ['casino_legend', 'Casino Legend', 200, 1000],
    ['casino_hero', 'Casino Hero', 500, 1500],
    ['casino_master', 'Casino Master', 1000, 2000],
    ['casino_champion', 'Casino Champion', 2000, 3000],
    ['casino_icon', 'Casino Icon', 3500, 4000],
    ['casino_titan', 'Casino Titan', 5000, 5000],
    ['casino_king', 'Casino King', 7500, 7500],
  ],
  sports: [
    ['sports_starter', 'Sports Starter', 3, 100],
    ['sports_regular', 'Sports Regular', 10, 300],
    ['sports_pro', 'Sports Pro', 25, 750],
    ['sports_legend', 'Sports Legend', 50, 1500],
    ['sports_hero', 'Sports Hero', 100, 2500],
    ['sports_master', 'Sports Master', 200, 4000],
    ['sports_king', 'Sports King', 350, 6000],
  ],
  deposits: [
    ['deposit_first', 'First Deposit', 1, 200],
    ['deposit_regular', 'Deposit Regular', 3, 500],
    ['deposit_pro', 'Deposit Pro', 7, 1000],
    ['deposit_legend', 'Deposit Legend', 15, 2000],
    ['deposit_hero', 'Deposit Hero', 30, 4000],
    ['deposit_king', 'Deposit King', 50, 6000],
  ],
  logins: [
    ['loyal_fan', 'Loyal Fan', 3, 100],
    ['loyal_regular', 'Loyal Regular', 7, 250],
    ['loyal_pro', 'Loyal Pro', 14, 500],
    ['loyal_legend', 'Loyal Legend', 30, 1000],
    ['loyal_hero', 'Loyal Hero', 60, 2000],
    ['loyal_master', 'Loyal Master', 100, 3500],
    ['loyal_king', 'Loyal King', 150, 5000],
  ],
};

export const BWANABET_MISSIONS = Object.entries(LADDERS).flatMap(([track, rows]) =>
  rows.map(([id, name, target, coins], i) => ({
    id, name, track, target, step: i + 1,
    type: track === 'casino' ? 'casinoRounds' : track,
    unit: MISSION_TRACKS[track].unit,
    difficulty: DIFF[Math.min(i, DIFF.length - 1)],
    reward: { kwacha: coins },
    xp: MISSION_XP[id] || 0,
    image: MISSION_TRACKS[track].image,
  }))).map((m) => ({ ...m, desc: missionTerms(m).charAt(0) + missionTerms(m).slice(1).toLowerCase().replace('bwanabet', 'BwanaBet').replace('aviator', 'Aviator') }));

export const CASINO_MISSIONS = BWANABET_MISSIONS.filter((m) => m.track === 'casino');


/** The mission's terms in bold capitals: "PLAY 500 ROUNDS OF AVIATOR OR SLOT GAMES". */
export function missionTerms(m) {
  const t = n(m?.target);
  switch (m?.track || (m?.type === 'casinoRounds' ? 'casino' : m?.type)) {
    case 'sports': return `PLACE ${t} SPORTS ${plural(t, 'BET', 'BETS')} AT ODDS 1.5+`;
    case 'deposits': return t === 1 ? 'MAKE A DEPOSIT ON BWANABET' : `DEPOSIT ON ${t} DIFFERENT DAYS`;
    case 'logins': return `LOG IN ON ${t} ${plural(t, 'DAY', 'DAYS')}`;
    default: return `PLAY ${t} ROUNDS OF AVIATOR OR SLOT ${plural(t, 'GAME', 'GAMES')}`;
  }
}

/** "120 / 500 casino rounds" style unit for the progress line. */
export const progressUnit = (m) => ({ casino: 'casino rounds', sports: 'sports bets', deposits: 'deposit days', logins: 'days' }[m?.track] || 'rounds');

/**
 * Counts per track since the first-login day `since` (YYYY-MM-DD).
 *  casinoTotal — server sum of casino rounds since `since`
 *  rows        — player_activity day rows (GET /api/season)
 *  xpDays      — user.xpDays ({ day: { daily, … } }); xpToday adds today's tally
 */
export function missionCounts({ casinoTotal = 0, rows = [], since = null, xpDays = null, xpToday = null } = {}) {
  const after = (day) => typeof day === 'string' && (!since || day >= since);
  let sports = 0;
  let deposits = 0;
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || !after(r.day)) continue;
    sports += n(r.sports_slips);
    if (n(r.deposits_count) > 0) deposits += 1;
  }
  const loginDays = new Set();
  for (const [day, t] of Object.entries(xpDays && typeof xpDays === 'object' ? xpDays : {})) {
    if (after(day) && n(t?.daily) > 0) loginDays.add(day);
  }
  if (xpToday && after(xpToday.day) && n(xpToday.daily) > 0) loginDays.add(xpToday.day);
  return { casino: n(casinoTotal), sports, deposits, logins: loginDays.size };
}

const claimList = (claims) => (Array.isArray(claims) ? claims.filter((x) => typeof x === 'string') : []);

/*
 * NO SPILL-OVER (owner rule 2026-10-21): in each ladder only the CURRENT
 * mission (the lowest rung not yet collected) can be completed, and it counts
 * from ZERO from the moment the previous rung was collected. The baseline is
 * the ladder's cumulative COUNT at that claim (user.missionBase =
 * { casino: { count, at }, sports, deposits, logins }), not a day, so rounds
 * played later on the claim day still count. progress = clamp(count - base,
 * 0, target); whatever goes past the target is discarded at the claim (the
 * next base is the count at that moment). The first rung counts from the
 * anchor (`since`, base 0). A CRM correction below the base reads 0, never
 * negative. A ladder with a claim but no recorded base (players from before
 * this rule) reads as base = the current count, i.e. 0 progress, until
 * migrateMissionBases() records it.
 */

/** The recorded base count of a ladder, or null when none is recorded. */
export function baseOf(bases, track) {
  const b = bases && typeof bases === 'object' ? bases[track] : null;
  if (b == null) return null;
  const v = typeof b === 'object' ? b.count : b;
  return v != null && Number.isFinite(Number(v)) ? n(v) : null;
}

/** The new missionBase with `track` set to the cumulative count at a claim. */
export function recordMissionBase(bases, track, count, at = null) {
  const prev = bases && typeof bases === 'object' ? bases : {};
  return { ...prev, [track]: { count: n(count), at } };
}

/**
 * One-time migration for players with claims from before the no-spill-over
 * rule: every ladder in `ready` (tracks whose counts are FRESH) that has at
 * least one claim but no base gets base = its current count (no retro
 * spill). Returns the new missionBase, or null when nothing changes.
 */
export function migrateMissionBases(bases, claims, counts, missions, ready, at = null) {
  const done = new Set(claimList(claims));
  const c = counts || {};
  let next = null;
  for (const track of Array.isArray(ready) ? ready : []) {
    if (!MISSION_TRACKS[track] || baseOf(next || bases, track) != null) continue;
    if (!(missions || []).some((m) => m.track === track && done.has(m.id))) continue;
    next = recordMissionBase(next || bases, track, c[track], at);
  }
  return next;
}

/**
 * Per-mission view state: { mission, count, total, progress, reached, claimed,
 * claimable, current }. `total` = the ladder's cumulative count; `count` = what
 * counts toward this mission (since the last collection), 0 for rungs above
 * the current one (never reached ahead), the target for collected ones.
 */
export function missionStates(missions, counts, claims, bases = null) {
  const done = new Set(claimList(claims));
  const c = counts || {};
  const list = missions || [];
  const currentId = {};
  const base = {};
  for (const track of Object.keys(MISSION_TRACKS)) {
    const ladder = list.filter((m) => m.track === track).sort((a, b) => a.step - b.step);
    currentId[track] = ladder.find((m) => !done.has(m.id))?.id || null;
    const b = baseOf(bases, track);
    base[track] = b != null ? b : ladder.some((m) => done.has(m.id)) ? n(c[track]) : 0;
  }
  return list.map((m) => {
    const total = n(c[m.track]);
    const claimed = done.has(m.id);
    const current = !claimed && currentId[m.track] === m.id;
    const count = claimed ? m.target : current ? Math.max(0, total - (base[m.track] || 0)) : 0;
    const reached = claimed || count >= m.target;
    return { mission: m, count, total, progress: Math.min(count, m.target), reached, claimed, current, claimable: current && reached };
  });
}

/** Missions ready to claim (the Missions nav badge). */
export const countClaimable = (states) => (states || []).filter((s) => s.claimable).length;

/** The new claims array, or null when the mission isn't claimable (never twice). */
export function recordMissionClaim(claims, missionId, states) {
  const s = (states || []).find((x) => x.mission.id === missionId);
  const ids = claimList(claims);
  if (!s || !s.claimable || ids.includes(missionId)) return null;
  return [...ids, missionId];
}

/**
 * What the Missions tab shows: per ladder the CURRENT mission (the first not
 * yet collected; claimable ones first), then every collected mission as a
 * thin bar. Missions further up a ladder stay hidden until reached.
 */
export function missionBoard(states) {
  const list = states || [];
  const current = [];
  for (const track of Object.keys(MISSION_TRACKS)) {
    const ladder = list.filter((s) => s.mission.track === track).sort((a, b) => a.mission.step - b.mission.step);
    const next = ladder.find((s) => !s.claimed);
    if (next) current.push(next);
  }
  const rank = (s) => (s.claimable ? 0 : s.progress > 0 ? 1 : 2);
  current.sort((a, b) => rank(a) - rank(b));
  return {
    current,
    collected: list.filter((s) => s.claimed),
    total: list.length,
    done: list.filter((s) => s.claimed).length,
  };
}
