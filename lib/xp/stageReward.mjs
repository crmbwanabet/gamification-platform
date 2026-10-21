// Stage-up coins are paid ONCE per stage (2026-10-21). user.xp is derived from
// the CRM rows and can DROP when the CRM corrects a day down (voided slips);
// a player who falls a stage and climbs back must not be paid (or celebrated)
// again. user.stageRewarded = the highest stage already rewarded; XP itself
// still shows the true figure. Pure, tests/stage-reward.test.mjs.

const stageNum = (v) => (Number.isFinite(Number(v)) && Number(v) >= 1 ? Math.floor(Number(v)) : 0);

/**
 * The highest stage already rewarded when a saved state loads: the saved
 * marker, or (players from before it) the stage of the saved XP, silently.
 */
export function initialStageRewarded(saved, savedLevel) {
  return Math.max(stageNum(saved), stageNum(savedLevel), 1);
}

/**
 * The stage-up to pay now: every stage above `rewarded` up to `level`.
 * Returns { levels, total, rewarded } (levels empty and rewarded unchanged
 * when the player is not above the highest stage already paid).
 */
export function stageUpRewards(rewarded, level, levelRewards, clean = (r) => r || {}) {
  const from = stageNum(rewarded) || 1;
  const to = stageNum(level);
  const total = { kwacha: 0, emeralds: 0, rubies: 0, diamonds: 0 };
  const levels = [];
  for (let L = from + 1; L <= to; L++) {
    levels.push(L);
    const r = clean(levelRewards?.[L]);
    for (const k of Object.keys(total)) total[k] += Number(r?.[k]) > 0 ? Number(r[k]) : 0;
  }
  return { levels, total, rewarded: Math.max(from, to) };
}
