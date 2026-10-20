// Missions (2026-10-20): the one-time BwanaBet missions in four ladders
// (casino rounds, sports bets, deposit days, daily-reward days), counted since
// the player's first login. Definitions + pure logic: lib/missions/ladder.mjs.
// Parked: the daily casino missions (parked/lib/missions/casino.daily.mjs), the
// daily/weekend bet-slip missions (parked/lib/missions/sports.daily.mjs) and the
// older daily-pool / weekly / permanent missions (parked/lib/data/missions.legacy.js).
import { CASINO_MISSIONS, BWANABET_MISSIONS } from '../missions/ladder.mjs';

export { CASINO_MISSIONS, BWANABET_MISSIONS };

// The live mission list (before remote-config mission_overrides): the one-time
// BwanaBet missions, four ladders (lib/missions/ladder.mjs, 2026-10-20).
export const MISSIONS = BWANABET_MISSIONS;

export const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy' },
  medium: { label: 'Medium' },
  hard: { label: 'Hard' },
  legend: { label: 'Legend' },
};
