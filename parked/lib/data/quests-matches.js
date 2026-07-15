// Extracted from lib/data/platform.js on 2026-07-15 (predictions + quests parked).
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
