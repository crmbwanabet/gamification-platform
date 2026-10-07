// Apply dashboard mission_overrides to a mission list. Pure — node-testable.
// Rewards are reduced to the live currencies (coins = kwacha, emeralds, rubies,
// diamonds): the dashboard can attach gem prizes, and a retired `gems` key
// from an old row is dropped.
import { cleanReward, REWARD_KEYS } from '../economy/currency.mjs';

// Override amounts apply per currency when they are whole numbers >= 0 (0
// removes that currency, e.g. a gems-only prize); anything else keeps the base.
function mergeReward(base, patch) {
  const out = { ...(base || {}) };
  for (const k of REWARD_KEYS) {
    const v = patch[k];
    if (Number.isInteger(v) && v >= 0) out[k] = v;
  }
  return cleanReward(out);
}

export function applyMissionOverrides(missions, overrides) {
  if (!overrides || typeof overrides !== 'object') return missions;
  return missions
    .filter(m => overrides[m.id]?.enabled !== false)
    .map(m => {
      const o = overrides[m.id];
      if (!o) return m;
      return {
        ...m,
        ...(o.target ? { target: o.target } : {}),
        ...(o.xp ? { xp: o.xp } : {}),
        ...(o.reward && typeof o.reward === 'object' ? { reward: mergeReward(m.reward, o.reward) } : {}),
      };
    });
}
