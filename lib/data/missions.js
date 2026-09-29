import { IMAGES } from './images';

// Daily missions pool (up to 8 picked each day: 2 easy, 3 medium, 3 hard —
// fewer while the pool is small)
// Difficulty = time budget: easy ~1 day, medium ~3 days, hard ~1 week of
// normal free-play allowances (progress persists across days)
export const DAILY_MISSION_POOL = [
  // missions for the 7 parked games (+ multi-game ones unreachable with only Njuka)
  // parked 2026-09-29 — see parked/lib/data/missions.games.js
  // Easy
  { id: 'd_daily', name: 'Daily Collector', desc: 'Claim your daily reward', difficulty: 'easy', target: 1, type: 'dailyClaim', reward: { kwacha: 50 }, xp: 20, image: 'dailyGift', cta: 'daily', ctaLabel: 'Go to Daily' },
  // Medium
  // prediction missions parked — see parked/lib/data/missions.predictions.js
  { id: 'd_coins200', name: 'Coin Collector', desc: 'Win 500 Coins from games', difficulty: 'medium', target: 500, type: 'coinsWon', reward: { kwacha: 150 }, xp: 50, image: 'treasureChest', cta: 'minigames', ctaLabel: 'Go to Games' },
  // Hard
  { id: 'd_marathon', name: 'Game Marathon', desc: 'Win 1,000 Coins from games', difficulty: 'hard', target: 1000, type: 'coinsWon', reward: { kwacha: 400, gems: 10 }, xp: 120, image: 'trophy', cta: 'minigames', ctaLabel: 'Go to Games' },
];

// Weekly missions (reset every Monday)
export const WEEKLY_MISSIONS = [
  { id: 'w_warrior', name: 'Weekly Warrior', desc: 'Complete 20 daily missions this week', difficulty: 'medium', target: 20, type: 'dailyMissionsDone', reward: { kwacha: 500, gems: 10 }, xp: 100, image: 'medal', cta: 'missions', ctaLabel: 'View Missions' },
  { id: 'w_spender', name: 'Big Spender', desc: 'Spend 500 Coins in the store', difficulty: 'medium', target: 500, type: 'coinsSpent', reward: { kwacha: 300, gems: 5 }, xp: 75, image: 'shoppingBags', cta: 'store', ctaLabel: 'Go to Store' },
  { id: 'w_xp500', name: 'XP Grinder', desc: 'Earn 500 XP this week', difficulty: 'hard', target: 500, type: 'weeklyXP', reward: { kwacha: 400, gems: 10 }, xp: 100, image: 'crown', cta: 'overview', ctaLabel: 'View Progress' },
];

// Permanent missions (always available, one-time completion)
export const PERMANENT_MISSIONS = [
  { id: 'retail', name: 'Retail Therapy', desc: 'Make a purchase in the store', difficulty: 'easy', target: 1, type: 'storePurchase', reward: { kwacha: 1000 }, xp: 1000, image: 'shoppingBags', cta: 'store', ctaLabel: 'Go to Store', tips: ['Browse the store for free spins, bets, and merch', 'Spending coins here also counts toward Weekly missions'] },
  // prediction missions parked — see parked/lib/data/missions.predictions.js
];

// Seeded random: picks 8 daily missions based on date (2 easy, 3 medium, 3 hard)
export const getDailyMissions = () => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const seededRandom = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };

  const easy = DAILY_MISSION_POOL.filter(m => m.difficulty === 'easy');
  const medium = DAILY_MISSION_POOL.filter(m => m.difficulty === 'medium');
  const hard = DAILY_MISSION_POOL.filter(m => m.difficulty === 'hard');

  const pick = (arr, count, offset) => {
    const shuffled = [...arr].sort((a, b) => seededRandom(seed + offset + arr.indexOf(a)) - seededRandom(seed + offset + arr.indexOf(b)));
    return shuffled.slice(0, count);
  };

  return [...pick(easy, 2, 1), ...pick(medium, 3, 100), ...pick(hard, 3, 200)];
};

export const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/30' },
  medium: { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/30' },
  hard: { label: 'Hard', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/30' },
};

// Keep MISSIONS as alias for backward compatibility with overview
export const MISSIONS = PERMANENT_MISSIONS;
