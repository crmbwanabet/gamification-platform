// Daily login reward (7-day cycle) — pure data, no imports (node --test).
// "Log in every day and the coins climb; 7 days in a row, 1,000 coins." Days 1–6
// pay 10, 20, 50, 100, 200, 400 coins and day 7 (the bonus chest) pays 1,000, so a
// full week = 1,780 coins (2026-10-14; was 10..60 + 100 = 310). Missing a day resets
// the cycle to day 1 (GamificationPlatform's 6am rollover), so reaching day 7 IS a
// 7-day run. Coins only — no gems or diamonds. Mirrored as the `dailyRewards`
// remote-config default (lib/config/defaults.js), which a `daily_rewards` row in
// platform_config replaces wholesale (lib/config/merge.mjs, replaceArray).
export const DAILY_REWARDS = [
  { day: 1, kwacha: 10 },
  { day: 2, kwacha: 20 },
  { day: 3, kwacha: 50 },
  { day: 4, kwacha: 100 },
  { day: 5, kwacha: 200 },
  { day: 6, kwacha: 400 },
  { day: 7, kwacha: 1000 },
];
