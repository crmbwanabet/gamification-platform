// Per-game daily allowances from config: disabled games are excluded so the
// 6am refresh stops topping them up (their stored balances stay untouched).
export function playsFromConfig(games) {
  return Object.fromEntries(
    Object.entries(games || {})
      .filter(([, g]) => g && g.enabled !== false)
      .map(([id, g]) => [id, g.dailyPlays])
  );
}
