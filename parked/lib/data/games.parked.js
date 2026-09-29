// Parked 2026-09-29 from lib/data/platform.js MINIGAMES (only Njuka kept live).
// Restore: paste back into MINIGAMES and re-add their DEFAULT_DAILY_PLAYS (1 each)
// in lib/config/defaults.js.
import { GAME_ECONOMY } from '../../../lib/data/platform';

export const PARKED_MINIGAMES = [
  { id: 'wheel', name: 'Wheel of Fortune', desc: 'Spin to win amazing prizes!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'wheel' },
  { id: 'scratch', name: 'Scratch & Win', desc: 'Scratch to reveal prizes!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'scratchCard' },
  { id: 'dice', name: 'Lucky Dice', desc: 'Roll the dice for rewards!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'dice' },
  { id: 'highlow', name: 'Higher or Lower', desc: 'Guess the next card!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'playingCards' },
  { id: 'plinko', name: 'Plinko Drop', desc: 'Drop the ball for big prizes!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'plinko', isNew: true },
  { id: 'tapfrenzy', name: 'Tap Frenzy', desc: 'Tap targets in 15 seconds!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'target', isNew: true },
  { id: 'stopclock', name: 'Stop the Clock', desc: 'Nail the target across 3 speeds!', free: 1, cost: GAME_ECONOMY.EXTRA_PLAY_COST, image: 'brainQuiz', isNew: true },
];

export const PARKED_DAILY_PLAYS = { wheel: 1, scratch: 1, dice: 1, highlow: 1, plinko: 1, tapfrenzy: 1, stopclock: 1 };
