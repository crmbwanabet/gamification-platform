import { IMAGES } from './images';

// Daily missions pool (8 random picked each day from 18)
export const DAILY_MISSION_POOL = [
  // Easy (6)
  { id: 'd_spin', name: 'Quick Spin', desc: 'Spin the wheel once', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'wheel', reward: { kwacha: 50 }, xp: 25, image: 'wheel', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_scratch', name: 'Scratch It', desc: 'Play a scratch card', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'scratch', reward: { kwacha: 50 }, xp: 25, image: 'scratchCard', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_dice', name: 'Roll the Dice', desc: 'Play Lucky Dice once', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'dice', reward: { kwacha: 50 }, xp: 25, image: 'dice', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_plinko', name: 'Drop Zone', desc: 'Play Plinko once', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'plinko', reward: { kwacha: 50 }, xp: 25, image: 'plinko', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_bet1', name: 'First Bet Today', desc: 'Place a bet today', difficulty: 'easy', target: 1, type: 'bets', reward: { kwacha: 75 }, xp: 30, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_daily', name: 'Daily Collector', desc: 'Claim your daily reward', difficulty: 'easy', target: 1, type: 'dailyClaim', reward: { kwacha: 50 }, xp: 20, image: 'dailyGift', cta: 'daily', ctaLabel: 'Go to Daily' },
  // Medium (6)
  { id: 'd_hopper', name: 'Game Hopper', desc: 'Play 3 different games', difficulty: 'medium', target: 3, type: 'uniqueGames', reward: { kwacha: 150 }, xp: 50, image: 'trophy', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_bet5', name: 'Bet Builder', desc: 'Place 5 bets', difficulty: 'medium', target: 5, type: 'bets', reward: { kwacha: 200 }, xp: 60, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_coins200', name: 'Coin Collector', desc: 'Win 200 Coins from games', difficulty: 'medium', target: 200, type: 'coinsWon', reward: { kwacha: 150 }, xp: 50, image: 'treasureChest', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_tap15', name: 'Tap Master', desc: 'Score 15+ in Tap Frenzy', difficulty: 'medium', target: 15, type: 'tapScore', reward: { kwacha: 200 }, xp: 60, image: 'target', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_highlow3', name: 'Streak Climber', desc: 'Hit a 3-card streak in Higher or Lower', difficulty: 'medium', target: 3, type: 'gamePlay', gameId: 'highlow', reward: { kwacha: 175 }, xp: 50, image: 'playingCards', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_plinkoEdge', name: 'Edge Hunter', desc: 'Land an edge slot in Plinko', difficulty: 'medium', target: 1, type: 'gamePlay', gameId: 'plinko', reward: { kwacha: 200 }, xp: 60, image: 'plinko', cta: 'minigames', ctaLabel: 'Go to Games' },
  // Hard (6)
  { id: 'd_streak3', name: 'Hot Streak', desc: 'Win 3 bets in a row', difficulty: 'hard', target: 3, type: 'winStreak', reward: { kwacha: 400, gems: 5 }, xp: 100, image: 'winTrophy', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_tap25', name: 'Tap Frenzy Pro', desc: 'Score 25+ in Tap Frenzy', difficulty: 'hard', target: 25, type: 'tapScore', reward: { kwacha: 350, gems: 5 }, xp: 100, image: 'target', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_clock3', name: 'Clock Master', desc: 'Stop within ±3 of target', difficulty: 'hard', target: 1, type: 'clockClose', reward: { kwacha: 350, gems: 5 }, xp: 100, image: 'brainQuiz', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_bet10', name: 'High Roller', desc: 'Place 10 bets in one day', difficulty: 'hard', target: 10, type: 'bets', reward: { kwacha: 400, gems: 8 }, xp: 120, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_jackpot', name: 'Jackpot Hunter', desc: 'Land the 1000x on Stop the Clock', difficulty: 'hard', target: 1, type: 'gamePlay', gameId: 'stopclock', reward: { kwacha: 500, gems: 5 }, xp: 100, image: 'crown', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_marathon', name: 'Game Marathon', desc: 'Play 6 different games', difficulty: 'hard', target: 6, type: 'uniqueGames', reward: { kwacha: 400, gems: 10 }, xp: 120, image: 'trophy', cta: 'minigames', ctaLabel: 'Go to Games' },

  { id: 'd_scratch3', name: 'Scratch Spree', desc: 'Play 3 scratch cards', difficulty: 'easy', target: 3, type: 'gamePlay', gameId: 'scratch', reward: { kwacha: 50 }, xp: 25, image: 'scratchCard', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_dice3', name: 'Dice Roller', desc: 'Win 3 Lucky Dice rounds', difficulty: 'medium', target: 3, type: 'gamePlay', gameId: 'dice', reward: { kwacha: 175 }, xp: 50, image: 'dice', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_tap20', name: 'Tap Sprinter', desc: 'Score 20+ in Tap Frenzy', difficulty: 'medium', target: 20, type: 'tapScore', reward: { kwacha: 200 }, xp: 60, image: 'target', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_wheel5', name: 'Wheel Veteran', desc: 'Spin the wheel 5 times', difficulty: 'hard', target: 5, type: 'gamePlay', gameId: 'wheel', reward: { kwacha: 400, gems: 5 }, xp: 100, image: 'wheel', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_trivia1', name: 'Quiz Time', desc: 'Play 1 trivia game', difficulty: 'easy', target: 1, type: 'triviaPlay', reward: { kwacha: 50 }, xp: 25, image: 'brainQuiz', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_trivia10', name: 'Trivia Buff', desc: 'Answer 10 questions correctly', difficulty: 'medium', target: 10, type: 'triviaCorrect', reward: { kwacha: 175 }, xp: 50, image: 'brainQuiz', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_speed12', name: 'Speed Demon', desc: 'Score 12+ in Speed Round', difficulty: 'medium', target: 12, type: 'speedScore', reward: { kwacha: 200 }, xp: 60, image: 'speedRound', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_tstreak5', name: 'Trivia Streak', desc: 'Reach streak of 5 in Streak Trivia', difficulty: 'hard', target: 5, type: 'triviaStreak', reward: { kwacha: 400, gems: 5 }, xp: 100, image: 'streakTrivia', cta: 'minigames', ctaLabel: 'Go to Games' },
];

// Weekly missions (5, reset every Monday)
export const WEEKLY_MISSIONS = [
  { id: 'w_warrior', name: 'Weekly Warrior', desc: 'Complete 20 daily missions this week', difficulty: 'medium', target: 20, type: 'dailyMissionsDone', reward: { kwacha: 500, gems: 10 }, xp: 100, image: 'medal', cta: 'missions', ctaLabel: 'View Missions' },
  { id: 'w_spender', name: 'Big Spender', desc: 'Spend 500 Coins in the store', difficulty: 'medium', target: 500, type: 'coinsSpent', reward: { kwacha: 300, gems: 5 }, xp: 75, image: 'shoppingBags', cta: 'store', ctaLabel: 'Go to Store' },
  { id: 'w_wins10', name: 'Winning Week', desc: 'Win 10 bets this week', difficulty: 'hard', target: 10, type: 'weeklyWins', reward: { kwacha: 600, gems: 15 }, xp: 150, image: 'winTrophy', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'w_explorer', name: 'Game Explorer', desc: 'Play all 7 minigames this week', difficulty: 'hard', target: 7, type: 'uniqueGamesWeekly', reward: { kwacha: 500, gems: 12 }, xp: 120, image: 'trophy', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'w_xp500', name: 'XP Grinder', desc: 'Earn 500 XP this week', difficulty: 'hard', target: 500, type: 'weeklyXP', reward: { kwacha: 400, gems: 10 }, xp: 100, image: 'crown', cta: 'overview', ctaLabel: 'View Progress' },
  { id: 'w_plinko25', name: 'Plinko Pro', desc: 'Drop 25 Plinko balls this week', difficulty: 'hard', target: 25, type: 'gamePlay', gameId: 'plinko', reward: { kwacha: 500, gems: 12 }, xp: 120, image: 'plinko', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'w_trivia50', name: 'Trivia Master', desc: 'Answer 50 questions correctly this week', difficulty: 'hard', target: 50, type: 'weeklyTriviaCorrect', reward: { kwacha: 500, gems: 12 }, xp: 120, image: 'brainQuiz', cta: 'minigames', ctaLabel: 'Go to Games' },
];

// Permanent missions (always available, one-time completion)
export const PERMANENT_MISSIONS = [
  { id: 'retail', name: 'Retail Therapy', desc: 'Make a purchase in the store', difficulty: 'easy', target: 1, type: 'storePurchase', reward: { kwacha: 1000 }, xp: 1000, image: 'shoppingBags', cta: 'store', ctaLabel: 'Go to Store', tips: ['Browse the store for free spins, bets, and merch', 'Spending coins here also counts toward Weekly missions'] },
  { id: 'deposit', name: 'Time to Deposit!', desc: 'Make a deposit', difficulty: 'easy', target: 1, type: 'deposits', reward: { kwacha: 100, gems: 5 }, xp: 50, image: 'creditCards', hot: true, cta: 'overview', ctaLabel: 'Deposit Now', tips: ['Any deposit amount counts', 'Higher deposits unlock VIP tiers'] },
  { id: 'firstBet', name: 'Place Your Bet', desc: 'Place your first bet', difficulty: 'easy', target: 1, type: 'bets', reward: { kwacha: 30 }, xp: 15, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict', tips: ['Pick any match to bet on', 'Featured matches pay more XP'] },
  { id: 'bet10', name: 'Regular Player', desc: 'Place 10 bets', difficulty: 'medium', target: 10, type: 'bets', reward: { kwacha: 75 }, xp: 40, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict', tips: ['Bet on multiple matches', 'Each bet earns XP too'] },
  { id: 'win5', name: 'Winner Winner!', desc: 'Win 5 bets', difficulty: 'hard', target: 5, type: 'wins', reward: { kwacha: 150, gems: 10 }, xp: 60, image: 'winTrophy', hot: true, cta: 'predict', ctaLabel: 'Go to Predict', tips: ['Research teams before betting', 'Featured matches have higher payouts'] },
  { id: 'spinWheel', name: 'Lucky Spinner', desc: 'Spin the wheel 3 times', difficulty: 'easy', target: 3, type: 'wheelSpins', reward: { kwacha: 50 }, xp: 30, image: 'wheel', cta: 'minigames', ctaLabel: 'Go to Games', tips: ['You get 3 free spins daily', 'Extra spins cost 50 Coins'] },
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
