// Vuma's side hustle (2026-10-09). Pure. Unlocks at stage 2 (first visit);
// its STOCK is the season's cumulative overflow XP (XP above the daily/weekly
// caps). The level reached on a day sets that day's pay; the player collects
// in the widget and uncollected pay accrues for at most `maxAccrueDays` days
// ("the shop was closed" for the rest). Numbers: lib/season/config.mjs.
// State: user.hustle = { lastCollectDay: 'YYYY-MM-DD' | null, collected: total coins }.
import { SEASON_DEFAULTS } from './config.mjs';
import { addDays, dayDiff, cumAt, stageReachDay, isIsoDay } from './xp.mjs';

/** Level for a stock of overflow XP. */
export function hustleLevelFor(stock, cfg = SEASON_DEFAULTS) {
  const levels = cfg.hustle.levels;
  let cur = levels[0];
  for (const L of levels) if (stock >= L.stock) cur = L;
  return cur;
}

export const hustleImage = (level) => `/vuma/hustle-${level}.jpg`;

/**
 * Everything the hustle card shows. `season` = computeSeasonXp(...) result.
 * ready = coins collectable now; pendingDays = days since the last collect
 * (or since unlock); paidDays = the ones that still pay; closedDays = lost.
 */
export function hustleState({ season, hustle = null, today, cfg = SEASON_DEFAULTS }) {
  const H = cfg.hustle;
  const stock = season ? season.overflow : 0;
  const level = hustleLevelFor(stock, cfg);
  const next = H.levels.find(L => L.stock > stock) || null;
  const base = { stock, level, next, toNext: next ? next.stock - stock : 0, image: hustleImage(level.level), levels: H.levels };
  const unlockDay = season && today ? stageReachDay(season, H.unlockStage) : null;
  if (!unlockDay || unlockDay > today) {
    return { ...base, unlocked: false, unlockDay: null, ready: 0, pendingDays: 0, paidDays: 0, closedDays: 0, collectedToday: false };
  }
  const last = hustle && isIsoDay(hustle.lastCollectDay) ? hustle.lastCollectDay : null;
  let from = last ? addDays(last, 1) : unlockDay;
  if (from < unlockDay) from = unlockDay;
  const pendingDays = from <= today ? dayDiff(from, today) + 1 : 0;
  const paidDays = Math.min(pendingDays, H.maxAccrueDays);
  let ready = 0;
  for (let i = 0; i < paidDays; i++) {
    const d = addDays(today, -i);
    ready += hustleLevelFor(cumAt(season, d, 'cumOverflow'), cfg).pay;
  }
  return { ...base, unlocked: true, unlockDay, ready, pendingDays, paidDays, closedDays: pendingDays - paidDays, collectedToday: last === today };
}

/** Collect: { coins, hustle } with the new state, or null when nothing is ready. */
export function collectHustle(state, hustle, today) {
  if (!state || !state.unlocked || !(state.ready > 0) || !isIsoDay(today)) return null;
  const prev = hustle && Number.isFinite(hustle.collected) ? hustle.collected : 0;
  return { coins: state.ready, hustle: { lastCollectDay: today, collected: prev + state.ready } };
}
