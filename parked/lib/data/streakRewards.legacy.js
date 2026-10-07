// Parked 2026-10-07 from lib/data/platform.js — the daily-login STREAK
// bonuses (paid ON TOP of the 7-day daily reward). Product decision: a week
// of daily rewards pays exactly 6 x 10 + 100 = 160 coins, no streak extras.
// The streak COUNTER (user.streak) is still live: it drives day 1->7 of the
// daily reward. Payout wiring + the "Streak Bonuses" Missions-tab section are
// in parked/components/GamificationPlatform.removed-wiring.jsx (2026-10-07).
// Restore notes: parked/README.md.

// ============================================================================
// STREAK REWARDS  (daily-login streak milestones, claimable in the Rewards hub)
// ============================================================================
export const STREAK_REWARDS = [
  { days: 3, kwacha: 100, gems: 5 },
  { days: 7, kwacha: 300, gems: 15 },
  { days: 14, kwacha: 700, gems: 30, diamonds: 1 },
  { days: 30, kwacha: 2000, gems: 75, diamonds: 3 },
];
