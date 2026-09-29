// Parked 2026-09-29 from lib/data/tutorials.js (TUTORIALS entries for the 7 parked games).

export const PARKED_GAME_TUTORIALS = {
  wheel: {
    title: '🎡 Wheel of Fortune',
    subtitle: 'Spin to win amazing prizes!',
    image: 'wheel',
    steps: [
      { icon: '👆', title: 'Tap to Spin', desc: 'Press the golden SPIN button in the center of the wheel.' },
      { icon: '⏳', title: 'Watch the Magic', desc: 'The wheel spins with realistic physics and slows down naturally.' },
      { icon: '🎁', title: 'Claim Your Prize', desc: 'Your prize is highlighted and automatically added to your balance!' },
    ],
    prizes: ['1 Diamond 💎', '10-350 Coins 🪙', '2 Gems 💚', '10-150 XP ⭐'],
    tips: ['You get 1 FREE spin daily', 'Extra spins cost 50 Coins', 'VIP members get bonus spins!'],
  },
  scratch: {
    title: '🎫 Scratch & Win',
    subtitle: 'Pick a card, scratch, and win coins!',
    image: 'scratchCard',
    steps: [
      { icon: '🎴', title: 'Pick ONE Card', desc: 'Three cards — two hide coin prizes, one is a blank. The first card you scratch is your pick!' },
      { icon: '🪙', title: 'Scratch It Off', desc: 'Drag across the gold foil to scratch. Reveal just over half the card to see your result.' },
      { icon: '💰', title: 'Instant Win', desc: 'Hit a prize and the coins are instantly credited. The other cards flip over so you can see what you missed!' },
    ],
    prizes: ['10 Coins', '20 Coins', '50 Coins', '100 Coins', '200 Coins (Top Prize!)'],
    tips: ['1 FREE scratch card daily — plays refresh at 6am', 'Once you start scratching, the other cards lock — choose wisely!', '2 out of 3 cards are winners'],
  },
  dice: {
    title: '🎲 Lucky Dice',
    subtitle: 'Guess the total and win big!',
    image: 'dice',
    steps: [
      { icon: '🔢', title: 'Pick Your Number', desc: 'Select a total from 2 to 12 - your prediction for both dice.' },
      { icon: '🎲', title: 'Roll the Dice', desc: 'Watch the 3D dice tumble realistically!' },
      { icon: '🎯', title: 'Win Prizes', desc: 'Exact match = 200 Coins! Close guess (±2) = 40 Coins!' },
    ],
    prizes: ['Exact Match: 200 Coins 🎯', 'Within ±2: 40 Coins 👍', 'Any play: +10 XP'],
    tips: ['7 is statistically most likely', '2 and 12 are hardest but pay big', '1 FREE roll daily — extra rolls cost Coins'],
  },
  highlow: {
    title: '🃏 Higher or Lower',
    subtitle: 'Build your winning streak!',
    image: 'playingCards',
    steps: [
      { icon: '👁️', title: 'See Current Card', desc: 'Look at the card shown - this is your reference point.' },
      { icon: '⬆️⬇️', title: 'Make Your Guess', desc: 'Will the next card be HIGHER or LOWER? Choose wisely!' },
      { icon: '💰', title: 'Cash Out Anytime', desc: 'Each correct guess adds 25 Coins to the pot. Cash out or risk it all!' },
    ],
    prizes: ['Each correct: +25 Coins', 'Pot caps at 200 Coins (8 streak)', 'Cash out anytime!'],
    tips: ['Cards near 1 or 13 are easier', '7 is 50/50 - risky!', 'Know when to cash out'],
  },
  plinko: {
    title: '🔮 Plinko Drop',
    subtitle: 'Drop the ball and watch it bounce!',
    image: 'slotMachine',
    steps: [
      { icon: '👆', title: 'Choose Position', desc: 'Slide the bar to choose where to drop the ball.' },
      { icon: '🔮', title: 'Drop & Watch', desc: 'The ball bounces off pegs unpredictably toward prize slots.' },
      { icon: '💰', title: 'Win Big', desc: 'Slots pay your wager × the multiplier — chase the progressive jackpot in the middle!' },
    ],
    prizes: ['Slot payout: wager × multiplier', 'Jackpot slot: progressive 🏆', 'Max win per ball: 200 Coins'],
    tips: ['Edge drops are risky but rewarding', 'Center drops are safer but lower', '1 FREE session daily — every drop costs its wager'],
  },
  tapfrenzy: {
    title: '⚡ Tap Frenzy',
    subtitle: 'How fast can you tap?',
    image: 'target',
    steps: [
      { icon: '⚡', title: 'Start Game', desc: 'Press START and get ready to tap!' },
      { icon: '👆', title: 'Tap the Loot', desc: 'Coins (1), gems (2), diamonds (3) and bolts (5) appear — tap them for points!' },
      { icon: '💣', title: 'Avoid the Bomb', desc: 'The grinning bomb subtracts 5 points — and shows up more as time runs out!' },
      { icon: '🔥', title: 'Frenzy Finale', desc: 'The last 4 seconds are FRENZY — everything is worth DOUBLE!' },
    ],
    prizes: ['60+ points: 200 Coins 🏆', '45+ points: 100 Coins', '30+ points: 50 Coins'],
    tips: ['Bolts are worth 5 points', 'It gets faster — more targets appear at once', 'Save your focus for the ×2 FRENZY at the end'],
  },
  stopclock: {
    title: '⏱️ Stop the Clock',
    subtitle: 'Test your reflexes!',
    image: 'brainQuiz',
    steps: [
      { icon: '🎯', title: 'See Target', desc: 'A random target (0-99) appears — its marker glows on the dial.' },
      { icon: '🛑', title: 'Stop the Needle', desc: 'Hit STOP as close to the target as you can!' },
      { icon: '⚡', title: '3 Stages', desc: 'WARM-UP, PRO, LIGHTNING — the needle gets faster and the prizes bigger!' },
      { icon: '💰', title: 'Bank It All', desc: 'Coins from all 3 stages add up — collect the total at the end.' },
    ],
    prizes: ['Perfect game: 200 Coins! 🏆', 'LIGHTNING exact: 80 Coins', 'All 3 within ±5: +40 bonus'],
    tips: ['Watch the needle approach the marker', 'Anticipate — tap slightly early', 'The SHARPSHOOTER bonus rewards consistency'],
  },
};
