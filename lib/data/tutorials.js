// TUTORIALS — extracted from components/GamificationPlatform.jsx
// Each `image` value is a key into the IMAGES lookup object.

export const TUTORIALS = {
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
    tips: ['You get 3 FREE spins daily', 'Extra spins cost 50 Coins', 'VIP members get bonus spins!'],
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
    tips: ['5 FREE scratch cards daily — plays refresh at 6am', 'Once you start scratching, the other cards lock — choose wisely!', '2 out of 3 cards are winners'],
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
    tips: ['7 is statistically most likely', '2 and 12 are hardest but pay big', '5 FREE rolls daily'],
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
    tips: ['Edge drops are risky but rewarding', 'Center drops are safer but lower', '5 FREE drops daily'],
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
  njuka: {
    title: '🃏 Njuka Boss',
    subtitle: 'The Zambian card classic — winner takes the pot!',
    image: 'njuka',
    steps: [
      { icon: '🪙', title: 'Stake Coins', desc: 'Pick a stake (5–50 coins). All 4 seats pay in — the winner takes the whole pot!' },
      { icon: '🎴', title: 'Build 4 Cards', desc: 'Draw and discard to form a triple + follower (7·7·7·8) or a pair + run (5·5·7·8). A is low; J, Q and K connect to each other in any order — but 10 never connects to J.' },
      { icon: '⚡', title: 'Claim to Win', desc: 'If anyone discards a number card that completes your hand, TAP the glowing pile before the bots beat you to it. J/Q/K can never be claimed.' },
    ],
    prizes: ['Stake 5 → win 15 Coins', 'Stake 10 → win 30 Coins', 'Stake 25 → win 75 Coins', 'Stake 50 → win 150 Coins'],
    tips: ['No free plays — every round is staked', 'Stuck with two pairs? Swap one for a fresh draw', 'Run out of time and the game plays a sensible turn for you', 'The bots play 100% fair — they only see their own cards and the discard pile'],
  },
  daily: {
    title: '🎁 Daily Hub',
    subtitle: 'Complete 3 daily tasks for bonus rewards!',
    image: 'dailyGift',
    steps: [
      { icon: '🎯', title: '3 Daily Tasks', desc: 'Claim your streak, place a bet, and play a game each day.' },
      { icon: '🏆', title: 'Bonus Reward', desc: 'Complete all 3 tasks for a 200 Coin + 5 Gem + 100 XP bonus!' },
      { icon: '📈', title: 'Streak Calendar', desc: 'Day 1: 10 → Day 7: 250 + Gems + Diamonds. Don\'t break the streak!' },
    ],
    prizes: ['Daily Spin: up to 350 Coins + Gems', 'All Tasks Bonus: 200 🪙 + 5 💚', 'Day 7 Streak: 250 + 25g + 💎'],
    tips: ['Complete all 3 tasks every day', 'The wheel and scratch cards reset daily', 'Missing a day resets your streak!'],
  },
  missions: {
    title: '🎯 Missions',
    subtitle: 'Complete tasks for rewards!',
    image: 'target',
    steps: [
      { icon: '📋', title: 'View Missions', desc: 'Check available missions - each has a specific goal to complete.' },
      { icon: '✅', title: 'Complete Tasks', desc: 'Do the required action: bet, deposit, play games, etc.' },
      { icon: '🎁', title: 'Auto Rewards', desc: 'Rewards are automatically added when you complete a mission!' },
    ],
    prizes: ['Easy: 30-50 Coins', 'Medium: 50-100 Coins', 'Hard: 100-150K + Gems'],
    tips: ['Check for new missions daily', 'Hot missions give extra XP', 'Some missions have time limits'],
  },
  vip: {
    title: '👑 VIP Club',
    subtitle: 'Exclusive benefits for loyal players!',
    image: 'crown',
    steps: [
      { icon: '💳', title: 'Make Deposits', desc: 'Your total deposits determine your VIP tier level.' },
      { icon: '⬆️', title: 'Climb the Ranks', desc: 'Bronze → Silver → Gold → Platinum → Diamond VIP!' },
      { icon: '💎', title: 'Enjoy Perks', desc: 'Higher tiers = better cashback, exclusive rewards!' },
    ],
    prizes: ['Bronze: 0.5% cashback', 'Silver: 1%', 'Gold: 1.5%', 'Diamond: 3% cashback'],
    tips: ['VIP status is permanent', 'Cashback paid weekly', 'Diamond VIPs get personal manager'],
  },
  store: {
    title: '🛒 Rewards Store',
    subtitle: 'Spend your Coins on prizes!',
    image: 'shoppingBags',
    steps: [
      { icon: '🪙', title: 'Earn Coins', desc: 'Play games, complete missions, login daily to earn Coins.' },
      { icon: '🛍️', title: 'Browse Items', desc: 'Free spins, free bets, merchandise, and exclusive rewards!' },
      { icon: '✅', title: 'Purchase', desc: 'Click to buy - some items require Coins + Gems.' },
    ],
    prizes: ['Free Spins: 300-500K', 'Free Bets: 200-450K', 'Merch: 400-2000K'],
    tips: ['Featured items are limited!', 'New arrivals every week', 'Check for sale prices'],
  },
  // predictions tutorial parked — see parked/lib/data/tutorials.predictions.js
  referrals: {
    title: '👥 Referrals',
    subtitle: 'Invite friends, earn rewards!',
    image: 'trophy',
    steps: [
      { icon: '🔗', title: 'Get Your Code', desc: 'Copy your unique referral code from the Referrals page.' },
      { icon: '📤', title: 'Share with Friends', desc: 'Send your code to friends who want to join 100xBet.' },
      { icon: '🎁', title: 'Both Win', desc: 'You get 500K + 50 Gems for each friend who signs up!' },
    ],
    prizes: ['Per referral: 500 Coins', 'Per referral: 50 Gems', 'Per referral: 200 XP'],
    tips: ['Share on social media', 'Friends get welcome bonus too', 'No limit on referrals!'],
  },
};
