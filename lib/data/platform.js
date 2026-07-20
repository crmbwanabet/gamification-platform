// ============================================================================
// Platform Data Constants & Helpers
// Extracted from GamificationPlatform.jsx
// ============================================================================

import { WHEEL_IMAGES } from './images';
import { IMAGES } from './images';

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
// WHEEL SEGMENTS
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
export const XP_LEVELS = [
  { level: 1, name: 'Stone', xp: 0, icon: '🪨' },
  { level: 2, name: 'Bronze', xp: 500, icon: '🥉' },
  { level: 3, name: 'Silver', xp: 1500, icon: '🥈' },
  { level: 4, name: 'Gold', xp: 3500, icon: '🥇' },
  { level: 5, name: 'Platinum', xp: 7000, icon: '💠' },
  { level: 6, name: 'Diamond', xp: 15000, icon: '💎' },
  { level: 7, name: 'Master', xp: 30000, icon: '👑' },
];

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
  { id: 'wheel', name: 'Wheel of Fortune', desc: 'Spin to win amazing prizes!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'wheel' },
  { id: 'scratch', name: 'Scratch & Win', desc: 'Scratch to reveal prizes!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'scratchCard' },
  { id: 'dice', name: 'Lucky Dice', desc: 'Roll the dice for rewards!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'dice' },
  { id: 'highlow', name: 'Higher or Lower', desc: 'Guess the next card!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'playingCards' },
  { id: 'plinko', name: 'Plinko Drop', desc: 'Drop the ball for big prizes!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'plinko', isNew: true },
  { id: 'tapfrenzy', name: 'Tap Frenzy', desc: 'Tap targets in 15 seconds!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'target', isNew: true },
  { id: 'stopclock', name: 'Stop the Clock', desc: 'Nail the target across 3 speeds!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'brainQuiz', isNew: true },
  { id: 'njuka', name: 'Njuka Boss', desc: 'Stake coins, claim cards, take the pot!', free: 0, cost: 0, stakeOnly: true, image: 'njuka', isNew: true },
];

// Store starts empty — items for sale will be managed from the admin
// dashboard (planned after platform completion). Item shape when adding:
// { id, name, desc, price: { kwacha, gems? }, image, featured?, isNew? }
export const STORE_ITEMS = [];

// MATCHES (predictions) + QUESTS parked — see parked/lib/data/quests-matches.js

// ============================================================================
// DAILY REWARDS
// ============================================================================
export const DAILY_REWARDS = [
  { day: 1, kwacha: 10 },
  { day: 2, kwacha: 25 },
  { day: 3, kwacha: 50 },
  { day: 4, kwacha: 75, gems: 5 },
  { day: 5, kwacha: 100, gems: 10 },
  { day: 6, kwacha: 150, gems: 15 },
  { day: 7, kwacha: 250, gems: 25, diamonds: 1 },
];

// ============================================================================
// LEVEL-UP REWARDS  (granted once when the player reaches each level)
// keyed by XP_LEVELS.level (2..7). Level 1 is the start, no reward.
// ============================================================================
export const LEVEL_REWARDS = {
  2: { kwacha: 250, gems: 5 },
  3: { kwacha: 500, gems: 10 },
  4: { kwacha: 1000, gems: 20, diamonds: 1 },
  5: { kwacha: 2000, gems: 40, diamonds: 2 },
  6: { kwacha: 4000, gems: 75, diamonds: 5 },
  7: { kwacha: 10000, gems: 150, diamonds: 10 },
};

// ============================================================================
// STREAK REWARDS  (daily-login streak milestones, claimable in the Rewards hub)
// ============================================================================
export const STREAK_REWARDS = [
  { days: 3, kwacha: 100, gems: 5 },
  { days: 7, kwacha: 300, gems: 15 },
  { days: 14, kwacha: 700, gems: 30, diamonds: 1 },
  { days: 30, kwacha: 2000, gems: 75, diamonds: 3 },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
export const getLevel = (xp) => XP_LEVELS.reduce((curr, lvl) => xp >= lvl.xp ? lvl : curr, XP_LEVELS[0]);
export const getNextLevel = (xp) => XP_LEVELS.find(l => l.xp > xp) || null;
export const getXPProgress = (xp) => {
  const curr = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  return ((xp - curr.xp) / (next.xp - curr.xp)) * 100;
};
export const getVIP = (deposits) => VIP_TIERS.reduce((curr, tier) => deposits >= tier.min ? tier : curr, VIP_TIERS[0]);
