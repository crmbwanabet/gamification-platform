// ============================================================================
// Platform Data Constants & Helpers
// Extracted from GamificationPlatform.jsx
// ============================================================================

import { WHEEL_IMAGES } from './images';
import { IMAGES } from './images';
import { DAILY_REWARDS } from './dailyRewards.mjs';
import { VUMA_STAGES, getStage, getNextStage, stageProgress } from '../vuma/stages.mjs';

// ============================================================================
// DAILY FREE SPIN ROTATION
// ============================================================================
export const DAILY_FREE_SPIN_ROTATION = [
  ['wheel', 'scratch', 'dice'],
  ['plinko', 'highlow', 'tapfrenzy'],
  ['tapfrenzy', 'stopclock', 'wheel'],
  ['wheel', 'plinko', 'scratch'],
  ['scratch', 'tapfrenzy', 'dice'],
  ['stopclock', 'highlow', 'plinko'],
  ['dice', 'wheel', 'highlow'],
];

export const getDailyFreeSpinGames = () => {
  const dayOfWeek = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  return DAILY_FREE_SPIN_ROTATION[dayOfWeek];
};

// ============================================================================
// WHEEL SEGMENTS — parked with the Wheel (nothing live reads this). Its gem
// and diamond prizes predate the 2026-10-07 gem economy (1 diamond = K20 now):
// reprice before restoring the Wheel.
// ============================================================================
export const WHEEL_SEGMENTS = [
  { id: 1, label: '1 Diamond', prize: { diamonds: 1 }, icon: '💎', image: 'diamond', color: '#a855f7' },
  { id: 2, label: '10 Coins', prize: { kwacha: 10 }, icon: '🪙', image: 'coinsStack', color: '#fbbf24' },
  { id: 3, label: '10 XP', prize: { xp: 10 }, icon: '⭐', image: 'xpStar', color: '#ec4899' },
  { id: 4, label: '150 XP', prize: { xp: 150 }, icon: '🔑', image: 'magicKey', color: '#22c55e' },
  { id: 5, label: '2 Gems', prize: { gems: 2 }, icon: '💚', image: 'emeralds', color: '#10b981' },
  { id: 6, label: '100C+100XP', prize: { xp: 100, kwacha: 100 }, icon: '🍀', image: 'clover', color: '#f97316' },
  { id: 7, label: '200 Coins', prize: { kwacha: 200 }, icon: '🪙', image: 'coinsPile', color: '#eab308' },
  { id: 8, label: '350 Coins', prize: { kwacha: 350 }, icon: '🧲', image: 'magnet', color: '#14b8a6' },
  { id: 9, label: '100 Coins', prize: { kwacha: 100 }, icon: '💍', image: 'ring', color: '#f43f5e' },
];

// ============================================================================
// LEVELS & VIP
// ============================================================================
// Player levels ARE the 17 Vuma Katongo story stages (2026-10-08; replaced
// Stone -> Master). Derived so getLevel/getNextLevel/getXPProgress keep working.
// `icon` is a fallback for emoji-only surfaces; UIs show stage.avatar instead.
export const XP_LEVELS = VUMA_STAGES.map(s => ({
  level: s.stage, name: s.name, xp: s.xp, icon: '⚽',
  place: s.place, club: s.club, chapter: s.chapter, banner: s.banner, avatar: s.avatar,
}));

export const VIP_TIERS = [
  { name: 'Standard', min: 0, icon: '⭐', cashback: 0 },
  { name: 'Bronze', min: 500, icon: '🥉', cashback: 0.5 },
  { name: 'Silver', min: 2000, icon: '🥈', cashback: 1 },
  { name: 'Gold', min: 5000, icon: '🥇', cashback: 1.5 },
  { name: 'Platinum', min: 15000, icon: '💠', cashback: 2 },
  { name: 'Diamond', min: 50000, icon: '💎', cashback: 3 },
];

// ============================================================================
// GAME ECONOMY
// Single source of truth — will be driven by the admin dashboard later.
// Extra plays are a deliberate gamble: they cost EXTRA_PLAY_COST and the most
// any single game can pay out is MAX_WIN.
// ============================================================================
export const GAME_ECONOMY = {
  MAX_WIN: 200,        // hard cap on any single game payout (coins)
  EXTRA_PLAY_COST: 50, // coins per play beyond the daily free allowance
};

// ============================================================================
// MINIGAMES & STORE
// ============================================================================
export const MINIGAMES = [
  // 7 original games parked 2026-09-29 — see parked/lib/data/games.parked.js
  { id: 'njuka', name: 'Njuka Boss', desc: 'Stake coins, claim cards, take the pot!', free: 0, cost: 0, stakeOnly: true, stakeRange: '1–50', image: 'njuka', isNew: true },
  { id: 'coinflip', name: 'Coin Flip', desc: 'Pick a side, flip, win 1.9x!', free: 0, cost: 0, stakeOnly: true, stakeRange: '1–50', image: 'coinflip', isNew: true },
  { id: 'penalty', name: 'Penalty Crash', desc: 'Pick your spot, beat the keeper!', free: 0, cost: 0, stakeOnly: true, stakeRange: '1–50', image: 'penalty', isNew: true },
  { id: 'chicken', name: 'Chicken Catch', desc: 'Pick a chicken, help the farmer catch it!', free: 0, cost: 0, stakeOnly: true, stakeRange: '1–50', image: 'chicken', isNew: true },
  { id: 'chicken2', name: 'Chicken Catch 2', desc: 'Collect golden eggs — cash out before he falls!', free: 0, cost: 0, stakeOnly: true, stakeRange: '1–20', image: 'chicken2', isNew: true },
  { id: 'minibus', name: 'Lucky Minibus', desc: 'Get your passenger on board first!', free: 0, cost: 0, stakeOnly: true, stakeRange: '1–50', image: 'minibus', isNew: true },
  { id: 'bottle', name: 'Bottle Spin', desc: 'Spin the bottle, win up to 4x!', free: 0, cost: 0, stakeOnly: true, stakeRange: '1–50', image: 'bottle', isNew: true },
  { id: 'scratch', name: 'Scratch Card', desc: 'Tap to reveal — match 3 to win!', free: 0, cost: 0, stakeOnly: true, stakeRange: '1–50', image: 'luckyScratch', isNew: true },
  { id: 'numbers', name: 'Lucky Numbers', desc: 'Pick 6, watch the draw!', free: 0, cost: 0, stakeOnly: true, stakeRange: '1–20', image: 'numbers', isNew: true },
];

// Store starts empty — items for sale will be managed from the admin
// dashboard (planned after platform completion). Item shape when adding:
// { id, name, desc, price: { kwacha, emeralds?, rubies?, diamonds? }, image, featured?, isNew? }
export const STORE_ITEMS = [];

// MATCHES (predictions) + QUESTS parked — see parked/lib/data/quests-matches.js

// ============================================================================
// DAILY REWARDS — days 1–6: 10 coins each, day 7 (7 in a row): 100 coins.
// Lives in ./dailyRewards.mjs so node --test can pin it.
// ============================================================================
export { DAILY_REWARDS };

// ============================================================================
// STAGE-UP REWARDS  (granted once when the player reaches each Vuma stage)
// keyed by XP_LEVELS.level = stage number (2..17). Stage 1 is the start, no reward.
// ============================================================================
// Coins only (`kwacha` = coins): gems (emeralds/rubies/diamonds) are real-money
// prizes (K5/K10/K20 each), so no default source pays them. The dashboard
// can attach gem prizes per stage through the level_rewards config row, e.g.
// { "17": { "kwacha": 5000, "emeralds": 1 } }.
export const LEVEL_REWARDS = {
  2: { kwacha: 100 },
  3: { kwacha: 150 },
  4: { kwacha: 200 },
  5: { kwacha: 250 },
  6: { kwacha: 300 },
  7: { kwacha: 400 },
  8: { kwacha: 500 },
  9: { kwacha: 600 },
  10: { kwacha: 750 },
  11: { kwacha: 900 },
  12: { kwacha: 1000 },
  13: { kwacha: 1250 },
  14: { kwacha: 1500 },
  15: { kwacha: 2000 },
  16: { kwacha: 2500 },
  17: { kwacha: 5000 },
};

// ============================================================================
// STREAK REWARDS — REMOVED 2026-10-07 (product decision: a week of daily
// rewards pays exactly 6 x 10 + 100 = 160 coins, no streak extras). The old
// table is parked in parked/lib/data/streakRewards.legacy.js. The streak
// COUNTER (user.streak) stays: it drives day 1->7 of the daily reward.
// ============================================================================

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
// Delegate to the Vuma stage helpers (robust to undefined/negative/NaN xp).
export const getLevel = (xp) => XP_LEVELS[getStage(xp).stage - 1];
export const getNextLevel = (xp) => { const n = getNextStage(xp); return n ? XP_LEVELS[n.stage - 1] : null; };
export const getXPProgress = (xp) => stageProgress(xp);
export const getVIP = (deposits) => VIP_TIERS.reduce((curr, tier) => deposits >= tier.min ? tier : curr, VIP_TIERS[0]);
