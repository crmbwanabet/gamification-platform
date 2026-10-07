// Daily casino-round missions (2026-10-07). Pure data + logic, no imports
// beyond relative .mjs, so node --test loads it directly.
//
// ONE counter drives all four: casino rounds the player played on
// bwanabet.com TODAY (Africa/Lusaka day), fed by the CRM into
// casino_activity and read through GET /api/missions/progress. Each mission
// is claimable once per Lusaka day when rounds >= target; claims live in the
// user state as casinoMissionClaims = { day: 'YYYY-MM-DD', ids: [...] } and
// reset when the day changes. Rewards/targets can be tuned per id through
// the remote-config mission_overrides row (applyMissionOverrides).

export const CASINO_MISSIONS = [
  { id: 'casino_starter', name: 'Casino Starter', desc: 'Play 20 casino rounds today on bwanabet.com', difficulty: 'easy', target: 20, type: 'casinoRounds', unit: 'rounds', reward: { kwacha: 50 }, xp: 0, image: 'slotMachine' },
  { id: 'casino_regular', name: 'Casino Regular', desc: 'Play 50 casino rounds today on bwanabet.com', difficulty: 'medium', target: 50, type: 'casinoRounds', unit: 'rounds', reward: { kwacha: 100 }, xp: 0, image: 'playingCards' },
  { id: 'casino_pro', name: 'Casino Pro', desc: 'Play 100 casino rounds today on bwanabet.com', difficulty: 'hard', target: 100, type: 'casinoRounds', unit: 'rounds', reward: { kwacha: 500 }, xp: 0, image: 'trophy' },
  { id: 'casino_legend', name: 'Casino Legend', desc: 'Play 200 casino rounds today on bwanabet.com', difficulty: 'legend', target: 200, type: 'casinoRounds', unit: 'rounds', reward: { kwacha: 1000 }, xp: 0, image: 'crown' },
];

/** Mission ids already claimed on `day` (claims from another day count as none). */
export function claimsForDay(claims, day) {
  if (!claims || typeof claims !== 'object' || claims.day !== day || !Array.isArray(claims.ids)) return [];
  return claims.ids;
}

/**
 * Per-mission view state.
 *  rounds      — today's count from the feed
 *  progressDay — the Lusaka day those rounds belong to (from the server)
 *  today       — the current Lusaka day (a stale progressDay counts as 0 rounds)
 *  claims      — user.casinoMissionClaims
 */
export function casinoMissionStates(missions, { rounds = 0, progressDay = null, today, claims = null } = {}) {
  const day = today || progressDay;
  const count = progressDay && progressDay === day && Number.isFinite(rounds) ? Math.max(0, rounds) : 0;
  const claimed = claimsForDay(claims, day);
  return missions.map(m => {
    const isClaimed = claimed.includes(m.id);
    const reached = count >= m.target;
    return {
      mission: m,
      progress: Math.min(count, m.target),
      rounds: count,
      reached,
      claimed: isClaimed,
      claimable: reached && !isClaimed,
    };
  });
}

/** Number of missions ready to claim (the Missions nav badge). */
export const countClaimable = (states) => states.filter(s => s.claimable).length;

/**
 * Record a claim. Returns the new claims object, or null when the claim is
 * not allowed (unknown/locked mission, or already claimed that day).
 */
export function recordClaim(claims, missionId, day, states) {
  const s = (states || []).find(x => x.mission.id === missionId);
  if (!s || !s.claimable) return null;
  const ids = claimsForDay(claims, day);
  if (ids.includes(missionId)) return null;
  return { day, ids: [...ids, missionId] };
}
