import { Target, Brain, Music, Globe } from 'lucide-react';

// ============================================================================
// TRIVIA QUESTIONS — question pools keyed by category
// ============================================================================

export const TRIVIA_QUESTIONS = {
  sports: [
    { q: 'Which country won the 2022 FIFA World Cup?', a: 'Argentina', wrong: ['France', 'Brazil', 'Germany'] },
    { q: 'How many players are on a football pitch per team?', a: '11', wrong: ['9', '10', '12'] },
    { q: 'Which club has won the most Champions League titles?', a: 'Real Madrid', wrong: ['AC Milan', 'Barcelona', 'Liverpool'] },
    { q: 'What is the duration of a standard football match?', a: '90 minutes', wrong: ['80 minutes', '100 minutes', '120 minutes'] },
    { q: 'Who holds the record for most international goals?', a: 'Cristiano Ronaldo', wrong: ['Lionel Messi', 'Pelé', 'Ali Daei'] },
    { q: 'Which African nation first reached a World Cup quarterfinal?', a: 'Cameroon', wrong: ['Nigeria', 'Ghana', 'Senegal'] },
    { q: 'What color card means a player is sent off?', a: 'Red', wrong: ['Yellow', 'Blue', 'Green'] },
    { q: 'Which Premier League club is known as "The Gunners"?', a: 'Arsenal', wrong: ['Chelsea', 'Tottenham', 'West Ham'] },
    { q: 'In which year was the first FIFA World Cup held?', a: '1930', wrong: ['1926', '1934', '1950'] },
    { q: 'What is the penalty spot distance from goal?', a: '12 yards', wrong: ['10 yards', '14 yards', '11 yards'] },
    { q: 'Which footballer is known as "The Egyptian King"?', a: 'Mohamed Salah', wrong: ['Sadio Mané', 'Pierre-Emerick Aubameyang', 'Riyad Mahrez'] },
    { q: 'How many teams compete in the English Premier League?', a: '20', wrong: ['18', '22', '16'] },
    { q: 'Which country hosted the 2010 FIFA World Cup?', a: 'South Africa', wrong: ['Brazil', 'Germany', 'Russia'] },
    { q: 'What does VAR stand for in football?', a: 'Video Assistant Referee', wrong: ['Visual Aid Review', 'Video Analysis Room', 'Verified Action Replay'] },
    { q: 'Which club does Kylian Mbappé play for (2024-25)?', a: 'Real Madrid', wrong: ['PSG', 'Barcelona', 'Manchester City'] },
  ],
  general: [
    { q: 'What is the largest planet in our solar system?', a: 'Jupiter', wrong: ['Saturn', 'Neptune', 'Uranus'] },
    { q: 'What is the chemical symbol for gold?', a: 'Au', wrong: ['Ag', 'Go', 'Gd'] },
    { q: 'How many continents are there on Earth?', a: '7', wrong: ['5', '6', '8'] },
    { q: 'What is the speed of light approximately?', a: '300,000 km/s', wrong: ['150,000 km/s', '500,000 km/s', '1,000,000 km/s'] },
    { q: 'Which organ pumps blood through the body?', a: 'Heart', wrong: ['Lungs', 'Liver', 'Brain'] },
    { q: 'What is the hardest natural substance?', a: 'Diamond', wrong: ['Titanium', 'Platinum', 'Quartz'] },
    { q: 'How many bones are in the adult human body?', a: '206', wrong: ['186', '212', '198'] },
    { q: 'What gas do plants absorb from the atmosphere?', a: 'Carbon dioxide', wrong: ['Oxygen', 'Nitrogen', 'Hydrogen'] },
    { q: 'Which planet is known as the Red Planet?', a: 'Mars', wrong: ['Venus', 'Mercury', 'Jupiter'] },
    { q: 'What is the boiling point of water in Celsius?', a: '100°C', wrong: ['90°C', '110°C', '120°C'] },
    { q: 'Who developed the theory of relativity?', a: 'Albert Einstein', wrong: ['Isaac Newton', 'Nikola Tesla', 'Stephen Hawking'] },
    { q: 'What is the largest ocean on Earth?', a: 'Pacific Ocean', wrong: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'] },
    { q: 'How many elements are in the periodic table?', a: '118', wrong: ['100', '108', '126'] },
    { q: 'What force keeps us on the ground?', a: 'Gravity', wrong: ['Magnetism', 'Friction', 'Inertia'] },
    { q: 'Which blood type is the universal donor?', a: 'O negative', wrong: ['A positive', 'AB positive', 'B negative'] },
  ],
  music: [
    { q: 'Who is known as the "King of Pop"?', a: 'Michael Jackson', wrong: ['Prince', 'Elvis Presley', 'Stevie Wonder'] },
    { q: 'Which artist released the album "Lemonade"?', a: 'Beyoncé', wrong: ['Rihanna', 'Adele', 'Taylor Swift'] },
    { q: 'What instrument does a DJ primarily use?', a: 'Turntables', wrong: ['Guitar', 'Piano', 'Drums'] },
    { q: 'Which Nigerian artist made "Essence"?', a: 'Wizkid', wrong: ['Burna Boy', 'Davido', 'Olamide'] },
    { q: 'How many strings does a standard guitar have?', a: '6', wrong: ['4', '5', '8'] },
    { q: 'Who sang "Bohemian Rhapsody"?', a: 'Queen', wrong: ['The Beatles', 'Led Zeppelin', 'Pink Floyd'] },
    { q: 'Which genre originated in Jamaica?', a: 'Reggae', wrong: ['Blues', 'Jazz', 'Funk'] },
    { q: 'Who is known as the "Queen of Afrobeats"?', a: 'Tiwa Savage', wrong: ['Yemi Alade', 'Simi', 'Teni'] },
    { q: 'What does the "B" stand for in R&B?', a: 'Blues', wrong: ['Bass', 'Beat', 'Band'] },
    { q: 'Which South African group sang "Jerusalema"?', a: 'Master KG', wrong: ['Black Coffee', 'DJ Maphorisa', 'Kabza De Small'] },
    { q: 'How many keys are on a standard piano?', a: '88', wrong: ['76', '92', '64'] },
    { q: 'Who won the most Grammy Awards ever?', a: 'Beyoncé', wrong: ['Taylor Swift', 'Adele', 'Stevie Wonder'] },
    { q: 'What country is Afrobeats originally from?', a: 'Nigeria', wrong: ['Ghana', 'South Africa', 'Kenya'] },
    { q: 'Which Zambian artist is known as "King Dandy"?', a: 'Dandy Krazy', wrong: ['Chef 187', 'Macky 2', 'Yo Maps'] },
    { q: 'What music platform has the most subscribers?', a: 'Spotify', wrong: ['Apple Music', 'YouTube Music', 'Tidal'] },
  ],
  african: [
    { q: 'What is the largest country in Africa by area?', a: 'Algeria', wrong: ['Sudan', 'DR Congo', 'Libya'] },
    { q: 'Which river is the longest in Africa?', a: 'Nile', wrong: ['Congo', 'Niger', 'Zambezi'] },
    { q: 'What is the capital of Zambia?', a: 'Lusaka', wrong: ['Kitwe', 'Ndola', 'Livingstone'] },
    { q: 'Which African country has the largest population?', a: 'Nigeria', wrong: ['Ethiopia', 'Egypt', 'DR Congo'] },
    { q: 'What is Victoria Falls known as locally?', a: 'Mosi-oa-Tunya', wrong: ['Kalambo Falls', 'Tugela Falls', 'Blue Nile Falls'] },
    { q: 'Which country is home to the Great Pyramids?', a: 'Egypt', wrong: ['Sudan', 'Libya', 'Morocco'] },
    { q: 'What language is most widely spoken in East Africa?', a: 'Swahili', wrong: ['Amharic', 'Somali', 'Yoruba'] },
    { q: 'Which African country was never colonized?', a: 'Ethiopia', wrong: ['Liberia', 'Morocco', 'Egypt'] },
    { q: 'What is the currency of Kenya?', a: 'Kenyan Shilling', wrong: ['Kenyan Dollar', 'Kenyan Rand', 'Kenyan Kwacha'] },
    { q: 'Mount Kilimanjaro is located in which country?', a: 'Tanzania', wrong: ['Kenya', 'Uganda', 'Rwanda'] },
    { q: 'Which desert covers much of North Africa?', a: 'Sahara', wrong: ['Kalahari', 'Namib', 'Nubian'] },
    { q: 'When did most African countries gain independence?', a: '1960s', wrong: ['1940s', '1950s', '1970s'] },
    { q: 'Which African city hosted the 2010 World Cup final?', a: 'Johannesburg', wrong: ['Cape Town', 'Durban', 'Pretoria'] },
    { q: 'What is the Zambian national language?', a: 'English', wrong: ['Bemba', 'Nyanja', 'Tonga'] },
    { q: 'Which lake is the largest in Africa?', a: 'Lake Victoria', wrong: ['Lake Tanganyika', 'Lake Malawi', 'Lake Chad'] },
  ],
};

// ============================================================================
// TRIVIA CATEGORIES & GAMES
// ============================================================================

export const TRIVIA_CATEGORIES = [
  { id: 'sports', name: 'Sports & Football', icon: '⚽', color: 'from-green-500 to-emerald-600' },
  { id: 'general', name: 'General Knowledge', icon: '🧠', color: 'from-blue-500 to-cyan-600' },
  { id: 'music', name: 'Music & Entertainment', icon: '🎵', color: 'from-blue-500 to-rose-600' },
  { id: 'african', name: 'African Culture', icon: '🌍', color: 'from-amber-500 to-orange-600' },
];

export const TRIVIA_GAMES = [
  { id: 'classicQuiz',  name: 'Classic Quiz',   desc: '10 questions, pick a category', icon: '🧠', color: 'from-purple-500 to-fuchsia-600', free: 3, cost: 30, image: 'brainQuiz' },
  { id: 'speedRound',   name: 'Speed Round',    desc: '20 True/False in 60 seconds',   icon: '⚡', color: 'from-amber-500 to-orange-600',   free: 5, cost: 20, image: 'speedRound',   isNew: true },
  { id: 'streakTrivia', name: 'Streak Trivia',  desc: 'Answer or cash out!',            icon: '🏆', color: 'from-rose-500 to-pink-600',      free: 3, cost: 25, image: 'streakTrivia' },
];

// ============================================================================
// HELPER — get shuffled questions for a category
// ============================================================================

export const getQuestions = (category, count = 10) => {
  const pool = TRIVIA_QUESTIONS[category] || [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(q => ({
    ...q,
    options: [q.a, ...q.wrong].sort(() => Math.random() - 0.5),
  }));
};

// ============================================================================
// DAILY TRIVIA — rotation, difficulty, streak multipliers
// ============================================================================

export const DAILY_CAT_ROTATION = ['sports', 'general', 'music', 'african', 'sports', 'music', 'general'];

export const DAILY_CAT_INFO = {
  sports:  { name: 'Sports',           icon: '⚽', Icon: Target, color: '#22c55e' },
  general: { name: 'General Knowledge', icon: '🧠', Icon: Brain,  color: '#22D3EE' },
  music:   { name: 'Music',            icon: '🎵', Icon: Music,  color: '#ec4899' },
  african: { name: 'African Culture',  icon: '🌍', Icon: Globe,  color: '#f59e0b' },
};

export const DAILY_DIFFICULTY = [
  { label: 'Easy',   color: '#22c55e', bg: 'rgba(34,197,94,.1)',  border: 'rgba(34,197,94,.25)',  reward: 100, time: 20 },
  { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', reward: 200, time: 15 },
  { label: 'Hard',   color: '#ef4444', bg: 'rgba(239,68,68,.1)',  border: 'rgba(239,68,68,.25)',  reward: 300, time: 10 },
];

export const DAILY_PERFECT_BONUS = { coins: 200, gems: 5 };

export const DAILY_STREAK_MULTIPLIERS = [1, 1, 1.25, 1.5, 1.75, 2];

export const getDailyStreakMult = (streak) =>
  DAILY_STREAK_MULTIPLIERS[Math.min(streak, DAILY_STREAK_MULTIPLIERS.length - 1)];

export const getDailyQuestions = () => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0 ... Sun=6
  const category = DAILY_CAT_ROTATION[dayOfWeek];
  const pool = [...(TRIVIA_QUESTIONS[category] || [])];
  // Deterministic shuffle based on seed
  const seededShuffle = (arr, s) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = ((s * (i + 1) * 9301 + 49297) % 233280) % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const shuffled = seededShuffle(pool, seed);
  return shuffled.slice(0, 3).map((q, i) => ({
    ...q,
    options: [q.a, ...q.wrong].sort(() => Math.random() - 0.5),
    difficulty: i,
    category,
  }));
};

export const getDailyQuestion = () => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const allQuestions = Object.values(TRIVIA_QUESTIONS).flat();
  const index = seed % allQuestions.length;
  const q = allQuestions[index];
  const catKeys = Object.keys(TRIVIA_QUESTIONS);
  const category = catKeys.find(k => TRIVIA_QUESTIONS[k].includes(q));
  return { ...q, options: [q.a, ...q.wrong].sort(() => Math.random() - 0.5), category };
};

// ============================================================================
// SPEED & STREAK helpers
// ============================================================================

export const getSpeedQuestions = (count = 20) => {
  const allQ = Object.values(TRIVIA_QUESTIONS).flat();
  const shuffled = [...allQ].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map(q => {
    const isTrue = Math.random() > 0.5;
    return {
      statement: isTrue ? `${q.q.replace('?', '')} — ${q.a}` : `${q.q.replace('?', '')} — ${q.wrong[0]}`,
      answer: isTrue,
      source: q.q,
    };
  });
};

// Get random question for streak (mixed categories)
export const getRandomQuestion = () => {
  const allQ = Object.values(TRIVIA_QUESTIONS).flat();
  const q = allQ[Math.floor(Math.random() * allQ.length)];
  return { ...q, options: [q.a, ...q.wrong].sort(() => Math.random() - 0.5) };
};
