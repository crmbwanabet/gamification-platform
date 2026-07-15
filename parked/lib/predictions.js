// Prediction reward economy (see docs/superpowers/specs/2026-07-03-predictions-reward-system-design.md).

/**
 * Coins paid for a correct prediction: scales with odds, clamped so favorites
 * still feel worth picking and longshots can't break the store economy.
 * Featured/top matches pay 1.5x.
 */
export function predictionWinCoins(odds, top = false) {
  const base = Math.min(Math.max(Math.round(25 * (odds || 2)), 50), 250);
  return top ? Math.round(base * 1.5) : base;
}

export const PREDICTION_WIN_XP = 15;
export const PREDICTION_PLACE_XP = 5;
export const PREDICTION_PLACE_XP_TOP = 10;
