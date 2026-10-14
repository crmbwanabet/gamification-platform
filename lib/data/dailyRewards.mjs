// Daily login reward (7-day cycle) — pure data, no imports (node --test).
// "Log in every day and the coins climb; 7 days in a row, 100 coins." Days 1–6
// pay 10, 20, 30, 40, 50, 60 coins and day 7 pays 100, so a full week = 310
// coins (2026-10-14; was 6 x 10 + 100 = 160). Missing a day resets the cycle to day 1
// (GamificationPlatform's 6am rollover), so reaching day 7 IS a 7-day run.
// Coins only — no gems or diamonds. Mirrored as the `dailyRewards` remote-config
// default (lib/config/defaults.js), which the admin dashboard can override.
export const DAILY_REWARDS = [
  { day: 1, kwacha: 10 },
  { day: 2, kwacha: 20 },
  { day: 3, kwacha: 30 },
  { day: 4, kwacha: 40 },
  { day: 5, kwacha: 50 },
  { day: 6, kwacha: 60 },
  { day: 7, kwacha: 100 },
];
