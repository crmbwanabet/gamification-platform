// Missions (2026-10-07): exactly four DAILY casino-round missions, fed by the
// CRM (casino rounds played on bwanabet.com today, Lusaka day). Definitions +
// pure logic live in lib/missions/casino.mjs (node --test). The previous
// daily-pool / weekly / permanent missions are parked in
// parked/lib/data/missions.legacy.js.
import { CASINO_MISSIONS } from '../missions/casino.mjs';

export { CASINO_MISSIONS };

// The live mission list (before remote-config mission_overrides).
export const MISSIONS = CASINO_MISSIONS;

export const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy' },
  medium: { label: 'Medium' },
  hard: { label: 'Hard' },
  legend: { label: 'Legend' },
};
