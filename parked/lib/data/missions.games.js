// Parked 2026-09-29 from lib/data/missions.js — missions tied to the 7 parked
// games, plus d_hopper (5 different games/day) and w_explorer (all 7 games/week),
// which cannot be completed with only Njuka live. Each line notes its original list
// by id prefix: d_ = DAILY_MISSION_POOL, w_ = WEEKLY_MISSIONS, else PERMANENT_MISSIONS.

export const PARKED_GAME_MISSIONS = [
  { id: 'd_spin', name: 'Quick Spin', desc: 'Spin the wheel once', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'wheel', reward: { kwacha: 50 }, xp: 25, image: 'wheel', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_scratch', name: 'Scratch It', desc: 'Play a scratch card', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'scratch', reward: { kwacha: 50 }, xp: 25, image: 'scratchCard', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_dice', name: 'Roll the Dice', desc: 'Play Lucky Dice once', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'dice', reward: { kwacha: 50 }, xp: 25, image: 'dice', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_plinko', name: 'Drop Zone', desc: 'Play Plinko once', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'plinko', reward: { kwacha: 50 }, xp: 25, image: 'plinko', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_hopper', name: 'Game Hopper', desc: 'Play 5 different games in a day', difficulty: 'medium', target: 5, type: 'uniqueGames', reward: { kwacha: 150 }, xp: 50, image: 'trophy', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_tap15', name: 'Tap Master', desc: 'Score 25+ in Tap Frenzy', difficulty: 'medium', target: 25, type: 'tapScore', gameId: 'tapfrenzy', reward: { kwacha: 200 }, xp: 60, image: 'target', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_highlow3', name: 'Streak Climber', desc: 'Play Higher or Lower 3 times', difficulty: 'medium', target: 3, type: 'gamePlay', gameId: 'highlow', reward: { kwacha: 175 }, xp: 50, image: 'playingCards', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_plinkoEdge', name: 'Edge Hunter', desc: 'Land 15 winning Plinko drops', difficulty: 'medium', target: 15, type: 'gamePlay', gameId: 'plinko', reward: { kwacha: 200 }, xp: 60, image: 'plinko', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_tap25', name: 'Tap Frenzy Pro', desc: 'Score 45+ in Tap Frenzy', difficulty: 'hard', target: 45, type: 'tapScore', gameId: 'tapfrenzy', reward: { kwacha: 350, gems: 5 }, xp: 100, image: 'target', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_clock3', name: 'Clock Master', desc: 'Stop within ±3 of target', difficulty: 'hard', target: 1, type: 'clockClose', gameId: 'stopclock', reward: { kwacha: 350, gems: 5 }, xp: 100, image: 'brainQuiz', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_jackpot', name: 'Jackpot Hunter', desc: 'Play 5 rounds of Stop the Clock', difficulty: 'hard', target: 5, type: 'gamePlay', gameId: 'stopclock', reward: { kwacha: 500, gems: 5 }, xp: 100, image: 'crown', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_scratch3', name: 'Scratch Spree', desc: 'Play 2 scratch cards', difficulty: 'easy', target: 2, type: 'gamePlay', gameId: 'scratch', reward: { kwacha: 100 }, xp: 25, image: 'scratchCard', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_dice3', name: 'Dice Roller', desc: 'Win 2 Lucky Dice rounds', difficulty: 'medium', target: 2, type: 'gamePlay', gameId: 'dice', reward: { kwacha: 175 }, xp: 50, image: 'dice', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_tap20', name: 'Tap Sprinter', desc: 'Score 35+ in Tap Frenzy', difficulty: 'medium', target: 35, type: 'tapScore', gameId: 'tapfrenzy', reward: { kwacha: 200 }, xp: 60, image: 'target', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'd_wheel5', name: 'Wheel Veteran', desc: 'Spin the wheel 7 times', difficulty: 'hard', target: 7, type: 'gamePlay', gameId: 'wheel', reward: { kwacha: 400, gems: 5 }, xp: 100, image: 'wheel', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'w_explorer', name: 'Game Explorer', desc: 'Play all 7 minigames this week', difficulty: 'hard', target: 7, type: 'uniqueGamesWeekly', reward: { kwacha: 500, gems: 12 }, xp: 120, image: 'trophy', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'w_plinko25', name: 'Plinko Pro', desc: 'Drop 25 Plinko balls this week', difficulty: 'hard', target: 25, type: 'gamePlay', gameId: 'plinko', reward: { kwacha: 500, gems: 12 }, xp: 120, image: 'plinko', cta: 'minigames', ctaLabel: 'Play Now' },
  { id: 'spinWheel', name: 'Lucky Spinner', desc: 'Spin the wheel', difficulty: 'easy', target: 1, type: 'wheelSpins', gameId: 'wheel', reward: { kwacha: 50 }, xp: 30, image: 'wheel', cta: 'minigames', ctaLabel: 'Play Now', tips: ['You get 1 free spin daily', 'Extra spins cost 50 Coins'] },
];
