// What the level-up pop-up says (owner 2026-10-27, design artifact
// Q6mu2Y4F1YZXdgCRmPsdhg v5): "Why you levelled up" lists the XP each source
// gave since the previous pop-up; "Next mission" is ONE mission with the place
// to do it. Pure ESM (node --test).
//
// A snapshot holds running totals per source (uncapped: the XP each action
// earned). The pop-up shows snapshot(now) minus the snapshot taken at the
// previous pop-up (user.levelSnap). Days over the daily/weekly cap still list
// what was played, which is the point of the box.
import { crmXpParts, cleanActivityRow } from '../season/xp.mjs';
import { SEASON_DEFAULTS } from '../season/config.mjs';
import { SUB_LEVELS } from '../vuma/stages.mjs';
import { STORIES } from '../vuma/stories.mjs';

const pos = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const whole = (v) => Math.floor(pos(v));

export const SNAP_KEYS = ['daily', 'games', 'missions', 'casinoXp', 'sportsXp', 'depositXp', 'casinoStake', 'sportsStake', 'sportsSlips', 'depositDays', 'claims'];

/**
 * Running totals for the pop-up.
 *  rows    — player_activity rows (the season feed)
 *  xpDays  — user.xpDays { day: { daily, games, missions, casino } }
 *  xpToday — user.xpToday { day, ... } (may be newer than xpDays[day])
 *  claims  — user.missionClaims (ids)
 */
export function xpSnapshot({ rows = [], xpDays = {}, xpToday = null, claims = [], cfg = SEASON_DEFAULTS } = {}) {
  const s = Object.fromEntries(SNAP_KEYS.map((k) => [k, 0]));
  const feedDays = new Set();
  for (const raw of Array.isArray(rows) ? rows : []) {
    const r = cleanActivityRow(raw);
    if (!r) continue;
    feedDays.add(r.day);
    const p = crmXpParts(r, cfg);
    s.casinoXp += p.casino; s.sportsXp += p.sports; s.depositXp += p.deposit;
    s.casinoStake += r.casino_stake; s.sportsStake += r.sports_stake; s.sportsSlips += whole(r.sports_slips);
    if (p.deposit > 0) s.depositDays += 1;
  }
  const days = { ...(xpDays && typeof xpDays === 'object' ? xpDays : {}) };
  if (xpToday && typeof xpToday === 'object' && xpToday.day) {
    const d = days[xpToday.day] || {};
    days[xpToday.day] = Object.fromEntries(['daily', 'games', 'missions', 'casino'].map((k) => [k, Math.max(whole(d[k]), whole(xpToday[k]))]));
  }
  for (const [day, e] of Object.entries(days)) {
    if (!e || typeof e !== 'object') continue;
    s.daily += whole(e.daily); s.games += whole(e.games); s.missions += whole(e.missions);
    if (!feedDays.has(day)) s.casinoXp += whole(e.casino); // casino-rounds XP only counts on days without a feed row
  }
  s.claims = Array.isArray(claims) ? claims.length : 0;
  s.casinoStake = Math.round(s.casinoStake); s.sportsStake = Math.round(s.sportsStake);
  return s;
}

/** A saved snapshot with every key a non-negative number, or null. */
export function cleanSnap(v) {
  if (!v || typeof v !== 'object') return null;
  return Object.fromEntries(SNAP_KEYS.map((k) => [k, pos(v[k])]));
}

const kw = (n) => `K${Math.round(n).toLocaleString('en-US')}`;
const plural = (n, one, many) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

/**
 * The "Why you levelled up" rows: [{ kind, label, detail, xp }], biggest first,
 * only sources that gave XP. kind = games | daily | missions | sports | casino | deposit.
 */
export function levelUpReasons(prev, cur) {
  const a = cleanSnap(prev) || cleanSnap({});
  const b = cleanSnap(cur) || cleanSnap({});
  const d = (k) => Math.max(0, b[k] - a[k]);
  const rows = [
    { kind: 'games', label: 'Mini-games', detail: d('games') ? `${plural(d('games'), 'coin', 'coins')} played` : '', xp: d('games') },
    { kind: 'daily', label: 'Daily reward', detail: '', xp: d('daily') },
    { kind: 'missions', label: 'Missions', detail: d('claims') ? `${plural(d('claims'), 'mission', 'missions')} collected` : '', xp: d('missions') },
    { kind: 'sports', label: 'Sports bets', detail: [d('sportsSlips') ? plural(d('sportsSlips'), 'bet', 'bets') : '', d('sportsStake') ? `${kw(d('sportsStake'))} in all` : ''].filter(Boolean).join(' · '), xp: d('sportsXp') },
    { kind: 'casino', label: 'Casino', detail: d('casinoStake') ? `${kw(d('casinoStake'))} in all` : '', xp: d('casinoXp') },
    { kind: 'deposit', label: 'Deposit', detail: d('depositDays') > 1 ? `${d('depositDays')} days` : '', xp: d('depositXp') },
  ];
  return rows.filter((r) => r.xp > 0).sort((x, y) => y.xp - x.xp);
}

/** Missions collected since the previous pop-up (the story's "1 of 3" counter). */
export const missionsSince = (prev, cur) => Math.max(0, (cleanSnap(cur)?.claims || 0) - (cleanSnap(prev)?.claims || 0));

// Where each mission is done. `here` = inside the Bonus Center.
export const MISSION_PLACE = {
  casino: { dest: 'casino', here: false },
  sports: { dest: 'sports', here: false },
  deposits: { dest: 'deposit', here: false },
  logins: { dest: 'daily', here: true },
};

// bwanabet pages (Angular routes under /<lang>/, read from the site bundle 2026-10-27).
export const BWANABET_PAGES = { casino: '/casino', sports: '/prematch', deposit: '/banking/deposit' };

/**
 * The ONE mission the pop-up points at: a mission ready to collect first
 * (dest 'missions'), else the current rung furthest along. `bwanabetOnly`
 * skips the daily-reward ladder (used when today's Bonus Center XP is full).
 * Returns { state, dest, here } or null.
 */
export function pickNextMission(states, { bwanabetOnly = false } = {}) {
  const list = (Array.isArray(states) ? states : []).filter((s) => s && s.current && !s.claimed && s.mission
    && (!bwanabetOnly || !MISSION_PLACE[s.mission.track]?.here));
  if (!list.length) return null;
  const ready = list.find((s) => s.claimable);
  if (ready && !bwanabetOnly) return { state: ready, dest: 'missions', here: true };
  const open = list.filter((s) => !s.claimable);
  if (!open.length) return null;
  const share = (s) => (s.mission.target > 0 ? s.progress / s.mission.target : 0);
  const best = open.reduce((x, y) => (share(y) > share(x) ? y : x));
  const place = MISSION_PLACE[best.mission.track] || { dest: 'missions', here: true };
  return { state: best, dest: place.dest, here: place.here };
}

/** Today's platform XP (daily + games + missions + casino rounds), before the cap. */
export function platformXpToday(xpToday, today) {
  if (!xpToday || xpToday.day !== today) return 0;
  return whole(xpToday.daily) + whole(xpToday.games) + whole(xpToday.missions) + whole(xpToday.casino);
}

/**
 * The story's "How" line for sub-level `id` ("1.1") with the XP to the next
 * sub-level filled in, plus the "Earn XP by" line: slot rounds counted at K1 a
 * spin, and the stakes that earn that XP. Null on the last level.
 */
export function howToNext(id, cfg = SEASON_DEFAULTS) {
  const i = SUB_LEVELS.findIndex((l) => l.id === id);
  const st = STORIES.find((s) => s.id === id);
  if (i < 0 || !SUB_LEVELS[i + 1] || !st?.how) return null;
  const xp = SUB_LEVELS[i + 1].xp - SUB_LEVELS[i].xp;
  const slotK = xp * cfg.crm.casinoStakePerXp;
  const sportsK = xp * cfg.crm.sportsStakePerXp;
  const n = (v) => v.toLocaleString('en-US');
  return {
    xp, slotK, sportsK,
    how: st.how.replace('{xp}', n(xp)),
    earn: `Complete missions, collect your daily reward, play ${n(slotK)} slot rounds (K${n(slotK)} in all), or bet K${n(sportsK)} on sports.`,
  };
}
