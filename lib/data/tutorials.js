// TUTORIALS — extracted from components/GamificationPlatform.jsx
// Each `image` value is a key into the IMAGES lookup object.

export const TUTORIALS = {
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
  coinflip: {
    title: '🪙 Coin Flip',
    subtitle: 'Pick a side, flip the coin — win 1.9x your stake!',
    image: 'coinflip',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 10, 20, 30 or 50.' },
      { icon: '🎯', title: 'Pick a Side', desc: 'Call it: HEADS or TAILS.' },
      { icon: '👆', title: 'Tap FLIP', desc: 'The coin flies and lands on one side. Match your pick and you win 1.9x your stake!' },
    ],
    prizes: ['Stake 10 → win 19 Coins', 'Stake 20 → win 38 Coins', 'Stake 30 → win 57 Coins', 'Stake 50 → win 95 Coins'],
    tips: ['No free plays — every flip is staked', 'The result is decided the moment you flip', 'Closing mid-flip still pays a win'],
  },
  penalty: {
    title: '⚽ Penalty Crash',
    subtitle: 'Pick your spot, beat the keeper — a goal pays the multiplier!',
    image: 'penalty',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 10, 20, 30 or 50.' },
      { icon: '🎯', title: 'Pick a Spot', desc: 'Tap one of the 6 spots on the goal. A bigger multiplier is a harder shot: 1.2x in the bottom centre up to 4x in the top-left corner.' },
      { icon: '👟', title: 'Tap KICK', desc: 'Beat the keeper and your goal pays your stake times the spot multiplier. If he saves it, you lose the stake.' },
    ],
    prizes: ['1.2x spot: stake 50 → win 60 Coins', '2x spot: stake 50 → win 100 Coins', '3x spot: stake 50 → win 150 Coins', '4x spot: stake 50 → win 200 Coins'],
    tips: ['No free plays — every kick is staked', 'The result is decided the moment you kick', 'Closing mid-kick still pays a goal'],
  },
  chicken: {
    title: '🐔 Chicken Catch',
    subtitle: 'Pick a chicken, help the farmer catch it — a catch pays the multiplier!',
    image: 'chicken',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 10, 20, 30 or 50.' },
      { icon: '🐔', title: 'Pick a Chicken', desc: 'Tap one of the 6 birds in the yard. A bigger multiplier is a faster, wilder bird: 1.2x for the fat brown hen up to 4x for the proud rooster.' },
      { icon: '🙌', title: 'Tap CATCH', desc: 'The farmer gives chase and dives. Catch it and you win your stake times its multiplier. If it gets away, you lose the stake.' },
    ],
    prizes: ['1.2x hen: stake 50 → win 60 Coins', '2x hen: stake 50 → win 100 Coins', '3x hen: stake 50 → win 150 Coins', '4x rooster: stake 50 → win 200 Coins'],
    tips: ['No free plays — every chase is staked', 'The result is decided the moment you tap CATCH', 'Closing mid-chase still pays a catch'],
  },
  minibus: {
    title: '🚐 Lucky Minibus',
    subtitle: 'Pick a passenger, beat the rival call boys — get them on your bus and win the multiplier!',
    image: 'minibus',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 10, 20, 30 or 50.' },
      { icon: '🧳', title: 'Pick a Passenger', desc: 'Tap one of the 6 passengers at the stop. A bigger multiplier is harder to win over: 1.2x for the grandmother with her mealie-meal up to 4x for the tourist.' },
      { icon: '🚐', title: 'Tap BOARD', desc: 'Your call boy races the rivals for their luggage. Get them on your minibus and you win your stake times their multiplier. If a rival grabs them first, you lose the stake.' },
    ],
    prizes: ['1.2x grandmother: stake 50 → win 60 Coins', '2x schoolboy: stake 50 → win 100 Coins', '3x headphones guy: stake 50 → win 150 Coins', '4x tourist: stake 50 → win 200 Coins'],
    tips: ['No free plays — every race is staked', 'The result is decided the moment you tap BOARD', 'Closing mid-race still pays a win'],
  },
  bottle: {
    title: '🥤 Bottle Spin',
    subtitle: 'Spin the bottle on the table — it points at your prize!',
    image: 'bottle',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 10, 20, 30 or 50.' },
      { icon: '🔄', title: 'Tap SPIN', desc: 'The bottle spins on the painted table and slows down until it points at one segment.' },
      { icon: '🎯', title: 'Win the Multiplier', desc: 'It pays your stake times the segment it points at, from 1.2x up to 4x. TRY AGAIN pays nothing.' },
    ],
    prizes: ['1.2x: stake 50 → win 60 Coins (30% of spins)', '1.5x: stake 50 → win 75 Coins (14%)', '2x: stake 50 → win 100 Coins (7%)', '3x: stake 50 → win 150 Coins (4%)', '4x: stake 50 → win 200 Coins (3%)'],
    tips: ['Bigger prizes come up less often — the segments look the same size, but the odds are set per prize', 'TRY AGAIN comes up 42% of the time', 'The result is decided the moment you tap SPIN', 'Closing mid-spin still pays a win'],
  },
  scratch: {
    title: '🎟️ Scratch Card',
    subtitle: 'Buy a card, tap the 3 foil panels — match 3 symbols to win!',
    image: 'luckyScratch',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how much a card costs: 10, 20, 30 or 50 coins.' },
      { icon: '🎟️', title: 'Tap BUY CARD', desc: 'A Lucky Scratch ticket slides in with 3 foil panels. The card is already decided — there is nothing to aim.' },
      { icon: '✨', title: 'Tap to Reveal', desc: 'Tap each panel (or REVEAL ALL). Three matching symbols win your stake times that symbol: maize 1.2x, mango 1.5x, bream 2x, drum 2.5x, fish-eagle feather 3x, gold crown 4x.' },
    ],
    prizes: ['3 maize: stake 50 → win 60 Coins', '3 bream: stake 50 → win 100 Coins', '3 feathers: stake 50 → win 150 Coins', '3 crowns: stake 50 → win 200 Coins'],
    tips: ['No free plays — every card is staked', 'The card is decided the moment you buy it', 'Closing before revealing still pays a winning card'],
  },
  numbers: {
    title: '🎱 Lucky Numbers',
    subtitle: 'Pick 6 numbers, watch the machine draw 6 balls — the more you match, the more you win!',
    image: 'numbers',
    steps: [
      { icon: '🔢', title: 'Pick 6 Numbers', desc: 'Tap 6 numbers from 1 to 20, or tap QUICK PICK for a random 6. Tap a number again to swap it out.' },
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 5, 10 or 20.' },
      { icon: '🎱', title: 'Tap DRAW', desc: 'The machine pops out 6 balls. Every ball that matches one of your numbers lights up. 2 matches pay 1.2x, 3 pay 1.6x, 4 pay 4.6x and 5 or 6 pay 10x your stake.' },
    ],
    prizes: ['2 matches: stake 20 → win 24 Coins', '3 matches: stake 20 → win 32 Coins', '4 matches: stake 20 → win 92 Coins', '5 or 6 matches: stake 20 → win 200 Coins'],
    tips: ['No free plays — every draw is staked', 'All 6 balls are decided the moment you tap DRAW', 'Your last numbers and stake are remembered', 'Closing mid-draw still pays your matches'],
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
