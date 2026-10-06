// The platform's hardcoded values, expressed in remote-config shape.
// /api/config merges platform_config rows over this; the client falls back to
// it entirely when the fetch fails. Keep in sync with lib/data/platform.js.
import { GAME_ECONOMY, MINIGAMES, DAILY_REWARDS, STREAK_REWARDS, LEVEL_REWARDS } from '@/lib/data/platform';
import { RTP_DEFAULT as CHICKEN2_RTP } from '@/lib/chicken2/crash.mjs';

// Mirrors DAILY_GAME_PLAYS in GamificationPlatform.jsx (single source once
// Task 4 makes the component read this instead).
export const DEFAULT_DAILY_PLAYS = { njuka: 0, coinflip: 0, penalty: 0, chicken: 0, chicken2: 0, minibus: 0, bottle: 0, scratch: 0, numbers: 0 };

// Per-game tunables beyond enabled/dailyPlays. The admin dashboard edits them
// through the `games` platform_config row, e.g. {"chicken2": {"rtp": 0.97}}
// (merge.mjs validates + clamps rtp to [0.80, 0.99]).
const GAME_EXTRAS = { chicken2: { rtp: CHICKEN2_RTP } };

export const DEFAULT_CONFIG = {
  economy: { maxWin: GAME_ECONOMY.MAX_WIN, extraPlayCost: GAME_ECONOMY.EXTRA_PLAY_COST },
  games: Object.fromEntries(MINIGAMES.map(g => [g.id, { enabled: true, dailyPlays: DEFAULT_DAILY_PLAYS[g.id] ?? 1, ...GAME_EXTRAS[g.id] }])),
  dailyRewards: DAILY_REWARDS,
  streakRewards: STREAK_REWARDS,
  levelRewards: LEVEL_REWARDS,
  missionOverrides: {},
};
