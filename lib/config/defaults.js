// The platform's hardcoded values, expressed in remote-config shape.
// /api/config merges platform_config rows over this; the client falls back to
// it entirely when the fetch fails. Keep in sync with lib/data/platform.js.
import { GAME_ECONOMY, MINIGAMES, DAILY_REWARDS, LEVEL_REWARDS } from '@/lib/data/platform';
import { RTP_DEFAULT } from '@/lib/rtp.mjs';
import { DEFAULT_COINS_PER_KWACHA, DEFAULT_GEM_VALUES } from '@/lib/economy/currency.mjs';

// Mirrors DAILY_GAME_PLAYS in GamificationPlatform.jsx (single source once
// Task 4 makes the component read this instead).
export const DEFAULT_DAILY_PLAYS = { njuka: 0, coinflip: 0, penalty: 0, chicken: 0, chicken2: 0, minibus: 0, bottle: 0, scratch: 0, numbers: 0 };

// Per-game tunables beyond enabled/dailyPlays. The admin dashboard edits them
// through the `games` platform_config row, e.g. {"chicken2": {"rtp": 0.97}}
// (merge.mjs validates + clamps rtp to [0.97, 0.99]). Every candy game has an
// RTP (default 98%); Njuka Boss is player-vs-bots with no house edge, so none.
const RTP_GAMES = ['coinflip', 'penalty', 'chicken', 'chicken2', 'minibus', 'bottle', 'scratch', 'numbers'];
const GAME_EXTRAS = Object.fromEntries(RTP_GAMES.map(id => [id, { rtp: RTP_DEFAULT }]));

export const DEFAULT_CONFIG = {
  // coinsPerKwacha: 1,000 coins = K1 (Store redemptions are priced from it).
  // gemValues: what one prize gem is worth IN COINS (its kwacha value derives
  // from coinsPerKwacha). Both validated as positive integers by merge.mjs.
  economy: {
    maxWin: GAME_ECONOMY.MAX_WIN, extraPlayCost: GAME_ECONOMY.EXTRA_PLAY_COST,
    coinsPerKwacha: DEFAULT_COINS_PER_KWACHA, gemValues: { ...DEFAULT_GEM_VALUES },
  },
  games: Object.fromEntries(MINIGAMES.map(g => [g.id, { enabled: true, dailyPlays: DEFAULT_DAILY_PLAYS[g.id] ?? 1, ...GAME_EXTRAS[g.id] }])),
  dailyRewards: DAILY_REWARDS,
  // Streak bonuses removed 2026-10-07 (parked). Kept as an empty list so
  // anything reading the config shape (the admin dashboard) still finds the
  // key; merge.mjs no longer applies a stored streak_rewards row.
  streakRewards: [],
  levelRewards: LEVEL_REWARDS,
  missionOverrides: {},
};
