// The platform's hardcoded values, expressed in remote-config shape.
// /api/config merges platform_config rows over this; the client falls back to
// it entirely when the fetch fails. Keep in sync with lib/data/platform.js.
import { GAME_ECONOMY, MINIGAMES, DAILY_REWARDS, STREAK_REWARDS, LEVEL_REWARDS } from '@/lib/data/platform';

// Mirrors DAILY_GAME_PLAYS in GamificationPlatform.jsx (single source once
// Task 4 makes the component read this instead).
export const DEFAULT_DAILY_PLAYS = { wheel: 3, scratch: 5, dice: 5, highlow: 5, plinko: 5, tapfrenzy: 5, stopclock: 5, njuka: 0 };

export const DEFAULT_CONFIG = {
  economy: { maxWin: GAME_ECONOMY.MAX_WIN, extraPlayCost: GAME_ECONOMY.EXTRA_PLAY_COST },
  games: Object.fromEntries(MINIGAMES.map(g => [g.id, { enabled: true, dailyPlays: DEFAULT_DAILY_PLAYS[g.id] ?? 5 }])),
  dailyRewards: DAILY_REWARDS,
  streakRewards: STREAK_REWARDS,
  levelRewards: LEVEL_REWARDS,
  missionOverrides: {},
};
