// Pure merge of platform_config rows over DEFAULT_CONFIG. Only relative .mjs
// imports so the node test runner can load it directly (package is CJS; .mjs
// opts into ESM).
import { RTP_MIN, RTP_MAX } from '../rtp.mjs';
import { cleanEconomyRow } from '../economy/currency.mjs';
import { cleanSeasonConfig } from '../season/config.mjs';
import { cleanAvatarItems } from '../avatar/items.mjs';
import { cleanStoreConfig } from '../store/catalog.mjs';
import { cleanPrizesConfig } from '../store/prizes.mjs';
import { cleanGameOrder } from '../games/order.mjs';

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
  // season (2026-10-09): every Season number (XP caps, hustle, league, World
  // Cup) — validated + clamped by cleanSeasonConfig (lib/season/config.mjs).
  season:             { field: 'season',           mode: 'season' },
  // avatar_items (2026-10-20): { "cap": { "price": 25000, "enabled": false } }
  // (lib/avatar/items.mjs cleanAvatarItems; unknown ids / bad prices dropped).
  avatar_items:       { field: 'avatarItems',      mode: 'avatarItems' },
  // store (2026-10-21): { "open": true } opens the Coin Shop (lib/store/catalog.mjs).
  store:              { field: 'store',            mode: 'store' },
  // prizes (2026-10-26): { open, testers, convertRate } (lib/store/prizes.mjs).
  prizes:             { field: 'prizes',           mode: 'prizes' },
  // game_order (2026-10-29): { month, order: [ids], rounds, computedAt }, written
  // once a month by /api/cron/game-order (most played last month first).
  // Only known game ids survive; junk = [] = the default MINIGAMES order.
  game_order:         { field: 'gameOrder',        mode: 'gameOrder' },
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
    } else if (spec.mode === 'season') {
      if (isObj(v) && isObj(out.season)) out.season = cleanSeasonConfig(v, out.season);
    } else if (spec.mode === 'avatarItems') {
      out.avatarItems = cleanAvatarItems(v, out.avatarItems);
    } else if (spec.mode === 'store') {
      out.store = cleanStoreConfig(v);
    } else if (spec.mode === 'prizes') {
      out.prizes = cleanPrizesConfig(v);
    } else if (spec.mode === 'gameOrder') {
      out.gameOrder = cleanGameOrder(v, Object.keys(out.games || {}));
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
