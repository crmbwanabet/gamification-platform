// Pure merge of platform_config rows over DEFAULT_CONFIG. No imports so the
// node test runner can load it directly (package is CJS; .mjs opts into ESM).
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// DB key -> config field + merge strategy
const KEYS = {
  economy:            { field: 'economy',          mode: 'shallow' },
  games:              { field: 'games',            mode: 'perGame' },
  daily_rewards:      { field: 'dailyRewards',     mode: 'replaceArray' },
  streak_rewards:     { field: 'streakRewards',    mode: 'replaceArray' },
  level_rewards:      { field: 'levelRewards',     mode: 'shallow' },
  mission_overrides:  { field: 'missionOverrides', mode: 'shallow' },
};

export function mergeConfig(defaults, rows) {
  const out = structuredClone(defaults);
  for (const row of rows || []) {
    const spec = KEYS[row?.key];
    if (!spec) continue;
    const v = row.value;
    if (spec.mode === 'replaceArray') {
      if (Array.isArray(v)) out[spec.field] = v;
    } else if (spec.mode === 'shallow') {
      if (isObj(v)) out[spec.field] = { ...out[spec.field], ...v };
    } else if (spec.mode === 'perGame') {
      if (isObj(v)) {
        for (const id of Object.keys(v)) {
          if (out.games[id] && isObj(v[id])) out.games[id] = { ...out.games[id], ...v[id] };
        }
      }
    }
  }
  return out;
}
