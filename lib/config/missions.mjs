// Apply dashboard mission_overrides to a mission list. Pure — node-testable.
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
        ...(o.reward ? { reward: { ...m.reward, ...o.reward } } : {}),
      };
    });
}
