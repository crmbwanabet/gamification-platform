// "WELCOME BACK!" pop-up (2026-10-21): what goes in each section, the totals
// and the next-goal label. Pure, so node --test pins it
// (tests/welcome-summary.test.mjs); the UI is components/redesign/WelcomeBackPopup.jsx.
// It shows ONLY rewards earned while AWAY from the Bonus Center, from bwanabet
// activity since the previous visit (owner 2026-10-21): the daily reward is
// NOT part of it, and a first-ever visit never shows it.
//
//   YOU GOT        — collected now: missions on the activity ladders (casino,
//                    sports, deposits) that became claimable while away (at
//                    most ONE per ladder: no spill-over, the rung after it
//                    then counts from zero), the new XP from bets
//   ALMOST THERE   — current missions (after this collection) at 50%+, most done first
//   STILL TO DO    — the other current missions
//   NEXT MISSIONS  — the rung after each ladder's current mission (locked)
//
// Rows carry only what to do (missionTerms), progress and the prize: the
// owner removed mission names.
import { missionBoard, missionTerms, progressUnit } from '../missions/ladder.mjs';
import { cleanReward } from '../economy/currency.mjs';
import { rewardParts } from '../rewardText.mjs';

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const whole = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
// "deposit days" → "deposit day" for a count of 1
const unitFor = (m, k) => { const u = progressUnit(m); return k === 1 ? u.replace(/s$/, '') : u; };
const pctOf = (s) => (s.mission.target > 0 ? Math.round((Math.min(s.count, s.mission.target) / s.mission.target) * 100) : 0);

/** The action word shown in gold: the first word, "LOG IN" as one. */
export function actionWord(terms) {
  const t = String(terms || '');
  if (t.startsWith('LOG IN ')) return 'LOG IN';
  return t.split(' ')[0] || '';
}

function missionRow(s, extra = {}) {
  const m = s.mission;
  return {
    key: `mission:${m.id}`, kind: 'mission', missionId: m.id, mission: m, track: m.track,
    terms: missionTerms(m),
    sub: `${fmt(Math.min(s.count, m.target))} / ${fmt(m.target)} ${unitFor(m, m.target)}`,
    reward: cleanReward(m.reward), xp: whole(m.xp),
    ...extra,
  };
}

/** Ladders driven by bwanabet activity (the login ladder is earned in the Bonus Center itself). */
export const AWAY_TRACKS = new Set(['casino', 'sports', 'deposits']);

/**
 * Missions that became claimable while the player was away: claimable now, on
 * an activity ladder, and not already claimable when last seen
 * (seen = user.missionsReadySeen, the ids that were claimable during the last visit).
 */
export function awayMissionIds(states, seen) {
  const was = new Set(Array.isArray(seen) ? seen : []);
  return (Array.isArray(states) ? states : [])
    .filter((s) => s.claimable && AWAY_TRACKS.has(s.mission.track) && !was.has(s.mission.id))
    .map((s) => s.mission.id);
}

const GOAL_UNIT = { casino: ['ROUND', 'ROUNDS'], sports: ['BET', 'BETS'], deposits: ['DEPOSIT DAY', 'DEPOSIT DAYS'], logins: ['DAY', 'DAYS'] };

/** "LET'S GO: 14 ROUNDS TO 500 COINS" for a mission row (null = plain LET'S GO). */
export function goalLabel(row) {
  if (!row || row.ready || !row.mission) return "LET'S GO";
  const left = Math.max(0, row.mission.target - row.count);
  if (!left) return "LET'S GO";
  const [one, many] = GOAL_UNIT[row.track] || GOAL_UNIT.casino;
  const prize = rewardParts(row.reward)[0];
  return `LET'S GO: ${fmt(left)} ${left === 1 ? one : many}${prize ? ` TO ${prize.toUpperCase()}` : ''}`;
}

/**
 * states     — missionStates() for every mission
 * collect    — ids of the missions to collect now (awayMissionIds); other
 *              claimable missions wait as "ready" rows
 * bets       — { parts: { casino, sports, deposit }, bar, hustle } new XP from bets, else null
 * missionsOk — false when the mission progress could not be re-read: nothing
 *              is collected, claimable missions wait as "ready" rows
 */
export function welcomeSummary({ states = [], collect = [], bets = null, missionsOk = true } = {}) {
  const list = Array.isArray(states) ? states : [];
  const got = [];
  const allowed = new Set(Array.isArray(collect) ? collect : []);

  const collected = new Set();
  if (missionsOk) {
    const order = ['casino', 'sports', 'deposits', 'logins'];
    const claimable = list.filter((s) => s.claimable && allowed.has(s.mission.id))
      .sort((a, b) => order.indexOf(a.mission.track) - order.indexOf(b.mission.track) || a.mission.step - b.mission.step);
    for (const s of claimable) {
      collected.add(s.mission.id);
      got.push(missionRow(s));
    }
  }

  if (bets) {
    const p = bets.parts || {};
    const bar = whole(bets.bar), hustle = whole(bets.hustle);
    if (bar + hustle > 0) {
      const sub = [['Casino', p.casino], ['sports', p.sports], ['deposit day', p.deposit]]
        .filter(([, v]) => whole(v) > 0).map(([k, v]) => `${k} ${fmt(v)}`).join(' · ');
      got.push({ key: 'bets', kind: 'bets', terms: 'XP FROM YOUR BETS', sub: sub ? sub.charAt(0).toUpperCase() + sub.slice(1) : 'On bwanabet', reward: {}, xp: bar + hustle, bar, hustle });
    }
  }

  // what is left once this collection is recorded
  const after = list.map((s) => (collected.has(s.mission.id) ? { ...s, claimed: true, claimable: false } : s));
  const board = missionBoard(after);
  const near = [];
  const todo = [];
  for (const s of board.current) {
    if (s.claimable) {
      near.push(missionRow(s, { count: s.count, pct: 100, ready: true, go: 'Ready: collect on Missions' }));
      continue;
    }
    const pct = pctOf(s);
    const left = s.mission.target - s.count;
    const row = missionRow(s, { count: s.count, pct, go: `${fmt(left)} to go` });
    (pct >= 50 ? near : todo).push(row);
  }
  near.sort((a, b) => Number(!!b.ready) - Number(!!a.ready) || b.pct - a.pct);

  const next = [];
  for (const s of board.current) {
    const up = list.find((x) => x.mission.track === s.mission.track && x.mission.step === s.mission.step + 1);
    if (up) next.push(missionRow(up, { locked: true, sub: s.mission.target === 1 && s.mission.track === 'deposits' ? 'Opens after your first deposit' : `Opens after ${fmt(s.mission.target)} ${unitFor(s.mission, s.mission.target)}` }));
  }

  const total = { kwacha: 0, emeralds: 0, rubies: 0, diamonds: 0, xp: 0 };
  for (const g of got) {
    for (const k of ['kwacha', 'emeralds', 'rubies', 'diamonds']) total[k] += whole(g.reward?.[k]);
    total.xp += whole(g.xp);
  }

  return { got, near, todo, next, total, goal: goalLabel(near.find((n) => !n.ready) || null) };
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayMs = (d) => (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) ? Date.parse(`${d}T00:00:00Z`) : NaN);

/**
 * Pop-up subtitle from the previous visit day (user.lastVisitDay, a Lusaka
 * 'YYYY-MM-DD') and today's: yesterday → "since yesterday", 2–6 days back →
 * "since <weekday>", else (same day, older, unknown) none.
 */
export function welcomeSubtitle(lastVisitDay, today) {
  const base = 'Here is what you earned';
  const a = dayMs(lastVisitDay), b = dayMs(today);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return base;
  const days = Math.round((b - a) / 86400000);
  if (days === 1) return `${base} since yesterday`;
  if (days >= 2 && days <= 6) return `${base} since ${WEEKDAYS[new Date(a).getUTCDay()]}`;
  return base;
}
