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
// MINIGAMES & STORE
// ============================================================================
export const MINIGAMES = [
  { id: 'wheel', name: 'Wheel of Fortune', desc: 'Spin to win amazing prizes!', free: 3, cost: 50, image: 'wheel' },
  { id: 'scratch', name: 'Scratch & Win', desc: 'Scratch to reveal prizes!', free: 5, cost: 25, image: 'scratchCard' },
  { id: 'dice', name: 'Lucky Dice', desc: 'Roll the dice for rewards!', free: 5, cost: 20, image: 'dice' },
  { id: 'highlow', name: 'Higher or Lower', desc: 'Guess the next card!', free: 5, cost: 15, image: 'playingCards' },
  { id: 'plinko', name: 'Plinko Drop', desc: 'Drop the ball for big prizes!', free: 5, cost: 25, image: 'plinko', isNew: true },
  { id: 'tapfrenzy', name: 'Tap Frenzy', desc: 'Tap targets in 15 seconds!', free: 5, cost: 20, image: 'target', isNew: true },
  { id: 'stopclock', name: 'Stop the Clock', desc: 'Nail the target across 3 speeds!', free: 5, cost: 20, image: 'brainQuiz', isNew: true },
];

export const STORE_ITEMS = [
  { id: 'viking', name: '75 Free Spins - Vikings', desc: 'Vikings Go to Hell slot', price: { kwacha: 500 }, image: 'vikingSpins', featured: true },
  { id: 'spins50', name: '50 Free Spins', desc: 'Any slot game', price: { kwacha: 300 }, image: 'slotMachine' },
  { id: 'freeBet20', name: 'K20 Free Bet', desc: 'No wagering required', price: { kwacha: 200 }, image: 'freeBets' },
  { id: 'mystery', name: 'Mystery Box', desc: 'Random premium reward!', price: { kwacha: 400, gems: 10 }, image: 'mysteryBox', isNew: true },
  { id: 'hoodie', name: '100xBet Hoodie', desc: 'Limited edition', price: { kwacha: 1200, gems: 30 }, image: 'hoodie1', featured: true },
];

// ============================================================================
// MATCHES (Predictions)
// ============================================================================
export const MATCHES = [
  // Premier League
  { id: 'm1', league: 'Premier League', leagueShort: 'EPL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Manchester City', away: 'Liverpool', homeShort: 'MCI', awayShort: 'LIV', h: 1.85, d: 3.60, a: 4.20, time: 'Today 20:00', status: 'today', reward: 50 },
  { id: 'm2', league: 'Premier League', leagueShort: 'EPL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Arsenal', away: 'Chelsea', homeShort: 'ARS', awayShort: 'CHE', h: 1.72, d: 3.80, a: 4.50, time: 'Today 17:30', status: 'today', reward: 50 },
  { id: 'm3', league: 'Premier League', leagueShort: 'EPL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Tottenham', away: 'Manchester Utd', homeShort: 'TOT', awayShort: 'MUN', h: 2.20, d: 3.40, a: 3.10, time: 'Tomorrow 15:00', status: 'upcoming', reward: 50 },
  // La Liga
  { id: 'm4', league: 'La Liga', leagueShort: 'LaLiga', flag: '🇪🇸', home: 'Real Madrid', away: 'Barcelona', homeShort: 'RMA', awayShort: 'BAR', h: 2.10, d: 3.40, a: 3.50, time: 'Tomorrow 21:00', status: 'upcoming', reward: 75, featured: true },
  { id: 'm5', league: 'La Liga', leagueShort: 'LaLiga', flag: '🇪🇸', home: 'Atletico Madrid', away: 'Sevilla', homeShort: 'ATM', awayShort: 'SEV', h: 1.65, d: 3.90, a: 5.00, time: 'Sat 18:00', status: 'upcoming', reward: 50 },
  { id: 'm6', league: 'La Liga', leagueShort: 'LaLiga', flag: '🇪🇸', home: 'Real Sociedad', away: 'Villarreal', homeShort: 'RSO', awayShort: 'VIL', h: 2.30, d: 3.20, a: 3.10, time: 'Sat 20:30', status: 'upcoming', reward: 50 },
  // Champions League
  { id: 'm7', league: 'Champions League', leagueShort: 'UCL', flag: '🏆', home: 'Bayern Munich', away: 'PSG', homeShort: 'BAY', awayShort: 'PSG', h: 1.95, d: 3.70, a: 3.80, time: 'Wed 21:00', status: 'upcoming', reward: 100, featured: true },
  { id: 'm8', league: 'Champions League', leagueShort: 'UCL', flag: '🏆', home: 'Inter Milan', away: 'Man City', homeShort: 'INT', awayShort: 'MCI', h: 2.80, d: 3.30, a: 2.50, time: 'Wed 21:00', status: 'upcoming', reward: 100, featured: true },
  { id: 'm9', league: 'Champions League', leagueShort: 'UCL', flag: '🏆', home: 'Real Madrid', away: 'Dortmund', homeShort: 'RMA', awayShort: 'BVB', h: 1.55, d: 4.20, a: 5.50, time: 'Thu 21:00', status: 'upcoming', reward: 100 },
  // Serie A
  { id: 'm10', league: 'Serie A', leagueShort: 'Serie A', flag: '🇮🇹', home: 'AC Milan', away: 'Juventus', homeShort: 'MIL', awayShort: 'JUV', h: 2.40, d: 3.10, a: 3.00, time: 'Sun 20:45', status: 'upcoming', reward: 60 },
  { id: 'm11', league: 'Serie A', leagueShort: 'Serie A', flag: '🇮🇹', home: 'Napoli', away: 'Roma', homeShort: 'NAP', awayShort: 'ROM', h: 1.80, d: 3.60, a: 4.30, time: 'Sun 18:00', status: 'upcoming', reward: 60 },
  { id: 'm12', league: 'Serie A', leagueShort: 'Serie A', flag: '🇮🇹', home: 'Inter Milan', away: 'Atalanta', homeShort: 'INT', awayShort: 'ATA', h: 1.90, d: 3.50, a: 3.90, time: 'Mon 20:45', status: 'upcoming', reward: 60 },
  // Bundesliga
  { id: 'm13', league: 'Bundesliga', leagueShort: 'BuLi', flag: '🇩🇪', home: 'Bayern Munich', away: 'Dortmund', homeShort: 'BAY', awayShort: 'BVB', h: 1.50, d: 4.50, a: 5.80, time: 'Sat 18:30', status: 'upcoming', reward: 75, featured: true },
  { id: 'm14', league: 'Bundesliga', leagueShort: 'BuLi', flag: '🇩🇪', home: 'RB Leipzig', away: 'Leverkusen', homeShort: 'RBL', awayShort: 'LEV', h: 2.60, d: 3.40, a: 2.70, time: 'Sun 15:30', status: 'upcoming', reward: 60 },
  { id: 'm15', league: 'Bundesliga', leagueShort: 'BuLi', flag: '🇩🇪', home: 'Freiburg', away: 'Stuttgart', homeShort: 'FRE', awayShort: 'STU', h: 2.35, d: 3.30, a: 3.00, time: 'Sun 17:30', status: 'upcoming', reward: 50 },
];

// ============================================================================
// QUESTS
// ============================================================================
export const QUESTS = [
  {
    id: 'welcome',
    name: 'Welcome Journey',
    desc: 'Complete your first steps and earn big rewards!',
    image: 'treasureChest',
    difficulty: 'easy',
    diffColor: 'text-green-400 bg-green-500/15 border-green-500/30',
    reward: { kwacha: 500, gems: 50 },
    xp: 250,
    steps: [
      { id: 'w_s1', action: 'deposit', target: 1, desc: 'Make your first deposit', icon: '💰', go: { tab: 'overview', label: 'Deposit' } },
      { id: 'w_s2', action: 'betPlaced', target: 1, desc: 'Place your first prediction', icon: '🎯', go: { tab: 'predictions', label: 'Predict' } },
      { id: 'w_s3', action: 'wheelSpun', target: 1, desc: 'Spin the Wheel of Fortune', icon: '🎡', go: { tab: 'minigames', game: 'wheel', label: 'Play' } },
      { id: 'w_s4', action: 'missionCompleted', target: 1, desc: 'Complete any mission', icon: '✅', go: { tab: 'missions', label: 'Missions' } },
    ],
  },
  {
    id: 'explorer',
    name: 'Game Explorer',
    desc: 'Try all the minigames available!',
    image: 'questMap',
    difficulty: 'medium',
    diffColor: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
    reward: { kwacha: 300, gems: 30 },
    xp: 200,
    steps: [
      { id: 'e_s1', action: 'gamePlayed', gameId: 'wheel', target: 1, desc: 'Play Wheel of Fortune', icon: '🎡', go: { tab: 'minigames', game: 'wheel', label: 'Play' } },
      { id: 'e_s2', action: 'gamePlayed', gameId: 'scratch', target: 1, desc: 'Play Scratch & Win', icon: '🎫', go: { tab: 'minigames', game: 'scratch', label: 'Play' } },
      { id: 'e_s3', action: 'gamePlayed', gameId: 'dice', target: 1, desc: 'Play Lucky Dice', icon: '🎲', go: { tab: 'minigames', game: 'dice', label: 'Play' } },
      { id: 'e_s4', action: 'gamePlayed', gameId: 'plinko', target: 1, desc: 'Play Plinko Drop', icon: '🎯', go: { tab: 'minigames', game: 'plinko', label: 'Play' } },
    ],
  },
];

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
