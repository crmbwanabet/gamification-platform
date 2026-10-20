// Bet-slip missions (2026-10-19). Pure, node --test loads it directly.
//
// Counted from the CRM feed the season already reads (player_activity, one
// row per player per Lusaka day): `sports_slips` = settled real-money sports
// slips at odds >= 1.5 (docs/integrations/crm-player-activity-feed.md). So no
// new CRM work is needed:
//   daily   — slips TODAY (Lusaka day)
//   weekend — slips on Saturday + Sunday of the current Lusaka week; claimable
//             on the Saturday or the Sunday once reached.
// Claims live in user.sportsMissionClaims = { day, ids, weekend, weekendIds }.

export const SPORTS_MISSIONS = [
  { id: 'sports_starter', name: 'Sports Starter', kind: 'daily', target: 3, reward: { kwacha: 100 }, xp: 10, image: 'trophy' },
  { id: 'sports_pro', name: 'Sports Pro', kind: 'daily', target: 10, reward: { kwacha: 500 }, xp: 20, image: 'crown' },
  { id: 'sports_weekend', name: 'Weekend Warrior', kind: 'weekend', target: 8, reward: { kwacha: 1000 }, xp: 30, image: 'playingCards' },
];

/** "PLACE 3 BETS AT ODDS 1.5+ TODAY" / "… THIS WEEKEND (SAT–SUN)". */
export const sportsTerms = (m) => `PLACE ${Number(m?.target) || 0} BETS AT ODDS 1.5+ ${m?.kind === 'weekend' ? 'THIS WEEKEND (SAT–SUN)' : 'TODAY'}`;

const DAY_MS = 86400000;
const addDays = (day, n) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const dow = (day) => new Date(`${day}T00:00:00Z`).getUTCDay(); // 0 Sunday … 6 Saturday

/** The Saturday of the weekend `today` belongs to (Mon–Fri: the coming one). */
export function weekendOf(today) {
  const d = dow(today);
  return d === 0 ? addDays(today, -1) : addDays(today, 6 - d);
}
export const isWeekend = (today) => [0, 6].includes(dow(today));

const slips = (rows, day) => {
  const r = (rows || []).find(x => x && x.day === day);
  const n = Number(r?.sports_slips);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/** Per-mission view state from the season feed rows. */
export function sportsMissionStates(missions, { rows = [], today, claims = null } = {}) {
  const sat = weekendOf(today);
  const todaySlips = slips(rows, today);
  const weekendSlips = slips(rows, sat) + slips(rows, addDays(sat, 1));
  const c = claims && typeof claims === 'object' ? claims : {};
  const dayIds = c.day === today && Array.isArray(c.ids) ? c.ids : [];
  const wkIds = c.weekend === sat && Array.isArray(c.weekendIds) ? c.weekendIds : [];
  return missions.map(m => {
    const weekend = m.kind === 'weekend';
    const count = weekend ? weekendSlips : todaySlips;
    const claimed = (weekend ? wkIds : dayIds).includes(m.id);
    const reached = count >= m.target;
    const open = !weekend || isWeekend(today);
    return { mission: m, progress: Math.min(count, m.target), slips: count, reached, claimed, open, claimable: reached && open && !claimed };
  });
}

/** New claims object, or null when the claim is not allowed. */
export function recordSportsClaim(claims, missionId, today, states) {
  const s = (states || []).find(x => x.mission.id === missionId);
  if (!s || !s.claimable) return null;
  const c = claims && typeof claims === 'object' ? claims : {};
  const sat = weekendOf(today);
  const ids = c.day === today && Array.isArray(c.ids) ? c.ids : [];
  const weekendIds = c.weekend === sat && Array.isArray(c.weekendIds) ? c.weekendIds : [];
  if (s.mission.kind === 'weekend') {
    if (weekendIds.includes(missionId)) return null;
    return { day: today, ids, weekend: sat, weekendIds: [...weekendIds, missionId] };
  }
  if (ids.includes(missionId)) return null;
  return { day: today, ids: [...ids, missionId], weekend: sat, weekendIds };
}
