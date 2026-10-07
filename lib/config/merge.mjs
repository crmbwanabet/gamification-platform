// Pure merge of platform_config rows over DEFAULT_CONFIG. Only relative .mjs
// imports so the node test runner can load it directly (package is CJS; .mjs
// opts into ESM).
import { RTP_MIN, RTP_MAX } from '../rtp.mjs';
import { cleanEconomyRow } from '../economy/currency.mjs';

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// DB key -> config field + merge strategy
const KEYS = {
  // economy: shallow, but coinsPerKwacha / gemValues are validated first
  // (positive integers; a bad value keeps the default — lib/economy/currency.mjs).
  economy:            { field: 'economy',          mode: 'economy' },
  games:              { field: 'games',            mode: 'perGame' },
  daily_rewards:      { field: 'dailyRewards',     mode: 'replaceArray' },
  // streak_rewards: removed 2026-10-07 — streak bonuses no longer pay, so a
  // stored row is ignored (the default stays an empty list).
  level_rewards:      { field: 'levelRewards',     mode: 'shallow' },
  mission_overrides:  { field: 'missionOverrides', mode: 'shallow' },
};

// Per-game RTP (every candy game, e.g. games.chicken2.rtp, games.coinflip.rtp):
// a finite number, clamped to [0.97, 0.99] — the same band as clampRtp in
// lib/rtp.mjs. Anything else is dropped so the default survives.
function cleanGame(g) {
  if (!Object.hasOwn(g, 'rtp')) return g;
  const { rtp, ...rest } = g;
  return typeof rtp === 'number' && Number.isFinite(rtp) ? { ...rest, rtp: Math.min(RTP_MAX, Math.max(RTP_MIN, rtp)) } : rest;
}

export function mergeConfig(defaults, rows) {
  const out = structuredClone(defaults);
  for (const row of rows || []) {
    const spec = Object.hasOwn(KEYS, row?.key ?? '') ? KEYS[row.key] : undefined;
    if (!spec) continue;
    const v = row.value;
    if (spec.mode === 'replaceArray') {
      if (Array.isArray(v) && v.length > 0) out[spec.field] = v;
    } else if (spec.mode === 'economy') {
      const clean = cleanEconomyRow(v, out.economy);
      if (clean) out.economy = { ...out.economy, ...clean };
    } else if (spec.mode === 'shallow') {
      if (isObj(v)) out[spec.field] = { ...out[spec.field], ...v };
    } else if (spec.mode === 'perGame') {
      if (isObj(v)) {
        for (const id of Object.keys(v)) {
          if (Object.hasOwn(out.games, id) && isObj(v[id])) out.games[id] = { ...out.games[id], ...cleanGame(v[id]) };
        }
      }
    }
  }
  return out;
}
