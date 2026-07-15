// Prediction/bet missions pulled from lib/data/missions.js on 2026-07-15
// (predictions feature parked). Types bets/wins/winStreak/weeklyWins are
// tracked by trackMission cases that were also removed — restore both.
import { IMAGES } from '../../../lib/data/images';

// Were in DAILY_MISSION_POOL:
export const DAILY_PREDICTION_MISSIONS = [
  { id: 'd_bet5', name: 'Bet Builder', desc: 'Place 5 bets', difficulty: 'medium', target: 5, type: 'bets', reward: { kwacha: 200 }, xp: 60, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_streak3', name: 'Hot Streak', desc: 'Win 3 bets in a row', difficulty: 'hard', target: 3, type: 'winStreak', reward: { kwacha: 400, gems: 5 }, xp: 100, image: 'winTrophy', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_bet10', name: 'High Roller', desc: 'Place 10 bets', difficulty: 'hard', target: 10, type: 'bets', reward: { kwacha: 400, gems: 8 }, xp: 120, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict' },
];

// Was in WEEKLY_MISSIONS:
export const WEEKLY_PREDICTION_MISSIONS = [
  { id: 'w_wins10', name: 'Winning Week', desc: 'Win 10 bets this week', difficulty: 'hard', target: 10, type: 'weeklyWins', reward: { kwacha: 600, gems: 15 }, xp: 150, image: 'winTrophy', cta: 'predict', ctaLabel: 'Go to Predict' },
];

// Were in PERMANENT_MISSIONS:
export const PERMANENT_PREDICTION_MISSIONS = [
  { id: 'firstBet', name: 'Place Your Bet', desc: 'Place your first bet', difficulty: 'easy', target: 1, type: 'bets', reward: { kwacha: 30 }, xp: 15, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict', tips: ['Pick any match to bet on', 'Featured matches pay more XP'] },
  { id: 'bet10', name: 'Regular Player', desc: 'Place 10 bets', difficulty: 'medium', target: 10, type: 'bets', reward: { kwacha: 75 }, xp: 40, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict', tips: ['Bet on multiple matches', 'Each bet earns XP too'] },
  { id: 'win5', name: 'Winner Winner!', desc: 'Win 5 bets', difficulty: 'hard', target: 5, type: 'wins', reward: { kwacha: 150, gems: 10 }, xp: 60, image: 'winTrophy', hot: true, cta: 'predict', ctaLabel: 'Go to Predict', tips: ['Research teams before betting', 'Featured matches have higher payouts'] },
];
