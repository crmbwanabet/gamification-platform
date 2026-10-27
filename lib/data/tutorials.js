// TUTORIALS — extracted from components/GamificationPlatform.jsx
// Each `image` value is a key into the IMAGES lookup object.
// Game prize lines are built from the engines so they stay truthful when the
// stakes, the rounding or the default RTP change.
import { STAKES as FLIP_STAKES, payoutFor as flipPayout } from '@/lib/coinflip/engine.mjs';
import { SEGMENTS as BOTTLE_SEGMENTS, chancesFor as bottleChances } from '@/lib/bottle/wheel.mjs';
import { paytableFor as numbersTable } from '@/lib/numbers/paytable.mjs';

import { payoutFor as towerPay } from '@/lib/tower/engine.mjs';
import { payoutFor as crossPay } from '@/lib/crossing/engine.mjs';
import { payoutFor as condPay } from '@/lib/conductor/engine.mjs';

const pct = (x) => `${Math.round(x * 100)}%`;
const BOTTLE_P = bottleChances(50); // at the default RTP; shifts slightly per stake
const bottleP = (mult) => pct(BOTTLE_SEGMENTS.reduce((a, sg, i) => a + (sg.mult === mult ? BOTTLE_P[i] : 0), 0));
const NUM20 = numbersTable(20).pays;
const ROUNDING_TIP = 'Wins are whole coins: stake × multiplier, always rounded UP (e.g. 1 × 1.2 = 1.2 → 2, 25 × 1.5 = 37.5 → 38)';

export const TUTORIALS = {
  njuka: {
    title: '🃏 Njuka Boss',
    subtitle: 'The Zambian card classic — winner takes the pot!',
    image: 'njuka',
    steps: [
      { icon: '🪙', title: 'Stake Coins', desc: 'Pick a stake (1–50 coins). All 4 seats pay in — the winner takes the whole pot!' },
      { icon: '🎴', title: 'Build 4 Cards', desc: 'Draw and discard to form a triple + follower (7·7·7·8) or a pair + run (5·5·7·8). A is low; J, Q and K connect to each other in any order — but 10 never connects to J.' },
      { icon: '⚡', title: 'Claim to Win', desc: 'If anyone discards a number card that completes your hand, TAP the glowing pile before the bots beat you to it. J/Q/K can never be claimed.' },
    ],
    prizes: ['Stake 1 → win 3 Coins', 'Stake 10 → win 30 Coins', 'Stake 25 → win 75 Coins', 'Stake 50 → win 150 Coins'],
    tips: ['No free plays — every round is staked', 'Stuck with two pairs? Swap one for a fresh draw', 'Run out of time and the game plays a sensible turn for you', 'The bots play 100% fair — they only see their own cards and the discard pile'],
  },
  coinflip: {
    title: '🪙 Coin Flip',
    subtitle: 'Pick a side, flip the coin — win 1.9x your stake!',
    image: 'coinflip',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 10, 25 or 50.' },
      { icon: '🎯', title: 'Pick a Side', desc: 'Call it: HEADS or TAILS.' },
      { icon: '👆', title: 'Tap FLIP', desc: 'The coin flies and lands on one side. Match your pick and you win 1.9x your stake, rounded to whole coins!' },
    ],
    prizes: FLIP_STAKES.map(st => `Stake ${st} → win ${flipPayout(st)} Coins`),
    tips: ['No free plays — every flip is staked', 'Wins are whole coins: 1.9x always rounded up (stake 25 → 47.5 → 48)', 'The result is decided the moment you flip', 'Closing mid-flip still pays a win'],
  },
  penalty: {
    title: '⚽ Penalty Crash',
    subtitle: 'Pick your spot, beat the keeper — a goal pays the multiplier!',
    image: 'penalty',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 10, 25 or 50.' },
      { icon: '🎯', title: 'Pick a Spot', desc: 'Tap one of the 6 spots on the goal. A bigger multiplier is a harder shot: 1.2x in the bottom centre up to 4x in the top-left corner.' },
      { icon: '👟', title: 'Tap KICK', desc: 'Beat the keeper and your goal pays your stake times the spot multiplier. If he saves it, you lose the stake.' },
    ],
    prizes: ['1.2x spot: stake 50 → win 60 Coins', '2x spot: stake 50 → win 100 Coins', '3x spot: stake 50 → win 150 Coins', '4x spot: stake 50 → win 200 Coins'],
    tips: ['No free plays — every kick is staked', ROUNDING_TIP, 'The result is decided the moment you kick', 'Closing mid-kick still pays a goal'],
  },
  chicken: {
    title: '🐔 Chicken Catch',
    subtitle: 'Pick a chicken, help the farmer catch it — a catch pays the multiplier!',
    image: 'chicken',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 10, 25 or 50.' },
      { icon: '🐔', title: 'Pick a Chicken', desc: 'Tap one of the 6 birds in the yard. A bigger multiplier is a faster, wilder bird: 1.2x for the fat brown hen up to 4x for the proud rooster.' },
      { icon: '🙌', title: 'Tap CATCH', desc: 'The farmer gives chase and dives. Catch it and you win your stake times its multiplier. If it gets away, you lose the stake.' },
    ],
    prizes: ['1.2x hen: stake 50 → win 60 Coins', '2x hen: stake 50 → win 100 Coins', '3x hen: stake 50 → win 150 Coins', '4x rooster: stake 50 → win 200 Coins'],
    tips: ['No free plays — every chase is staked', ROUNDING_TIP, 'The result is decided the moment you tap CATCH', 'Closing mid-chase still pays a catch'],
  },
  chicken2: {
    title: '🥚 Chicken Catch 2',
    subtitle: 'The hen lays golden eggs as the farmer chases her — every egg pushes the multiplier up. Cash out before he falls!',
    image: 'chicken2',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 5, 10 or 20. AUTO can cash out for you at 1.5x, 2x, 3x or 5x.' },
      { icon: '🏃', title: 'Tap RUN', desc: 'The farmer chases the hen and runs through her golden eggs. The multiplier climbs from 1.00x while he runs.' },
      { icon: '💰', title: 'Cash Out', desc: 'Tap CASH OUT to bank your stake times the multiplier, rounded UP to whole coins (the button shows what you get). If he trips first, the hen flies off and you lose the stake. At 5,000x he catches her and collects for you.' },
    ],
    prizes: ['2x: stake 20 → win 40 Coins', '10x: stake 20 → win 200 Coins', '100x: stake 20 → win 2,000 Coins', '5,000x (max): stake 20 → win 100,000 Coins'],
    tips: ['No free plays — every run is staked', 'Where he falls is decided the moment you tap RUN', 'He never falls at the same multiplier twice in a row', 'Closing mid-run cashes out at the current multiplier'],
  },
  minibus: {
    title: '🚐 Lucky Minibus',
    subtitle: 'Pick a passenger, beat the rival call boys — get them on your bus and win the multiplier!',
    image: 'minibus',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 10, 25 or 50.' },
      { icon: '🧳', title: 'Pick a Passenger', desc: 'Tap one of the 6 passengers at the stop. A bigger multiplier is harder to win over: 1.2x for the grandmother with her mealie-meal up to 4x for the tourist.' },
      { icon: '🚐', title: 'Tap BOARD', desc: 'Your call boy races the rivals for their luggage. Get them on your minibus and you win your stake times their multiplier. If a rival grabs them first, you lose the stake.' },
    ],
    prizes: ['1.2x grandmother: stake 50 → win 60 Coins', '2x schoolboy: stake 50 → win 100 Coins', '3x headphones guy: stake 50 → win 150 Coins', '4x tourist: stake 50 → win 200 Coins'],
    tips: ['No free plays — every race is staked', ROUNDING_TIP, 'The result is decided the moment you tap BOARD', 'Closing mid-race still pays a win'],
  },
  bottle: {
    title: '🥤 Bottle Spin',
    subtitle: 'Spin the bottle on the table — it points at your prize!',
    image: 'bottle',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 10, 25 or 50.' },
      { icon: '🔄', title: 'Tap SPIN', desc: 'The bottle spins on the painted table and slows down until it points at one segment.' },
      { icon: '🎯', title: 'Win the Multiplier', desc: 'It pays your stake times the segment it points at, from 1.2x up to 4x. TRY AGAIN pays nothing.' },
    ],
    prizes: [`1.2x: stake 50 → win 60 Coins (about ${bottleP(1.2)} of spins)`, `1.5x: stake 50 → win 75 Coins (${bottleP(1.5)})`, `2x: stake 50 → win 100 Coins (${bottleP(2)})`, `3x: stake 50 → win 150 Coins (${bottleP(3)})`, `4x: stake 50 → win 200 Coins (${bottleP(4)})`],
    tips: ['Bigger prizes come up less often — the segments look the same size, but the odds are set per prize', `TRY AGAIN comes up about ${bottleP(0)} of the time (the odds shift a little per stake so every stake returns the same)`, ROUNDING_TIP, 'The result is decided the moment you tap SPIN', 'Closing mid-spin still pays a win'],
  },
  scratch: {
    title: '🎟️ Scratch Card',
    subtitle: 'Buy a card, tap the 3 foil panels — match 3 symbols to win!',
    image: 'luckyScratch',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how much a card costs: 1, 10, 25 or 50 coins.' },
      { icon: '🎟️', title: 'Tap BUY CARD', desc: 'A Lucky Scratch ticket slides in with 3 foil panels. The card is already decided — there is nothing to aim.' },
      { icon: '✨', title: 'Tap to Reveal', desc: 'Tap each panel (or REVEAL ALL). Three matching symbols win your stake times that symbol: maize 1.2x, mango 1.5x, bream 2x, drum 2.5x, fish-eagle feather 3x, gold crown 4x.' },
    ],
    prizes: ['3 maize: stake 50 → win 60 Coins', '3 bream: stake 50 → win 100 Coins', '3 feathers: stake 50 → win 150 Coins', '3 crowns: stake 50 → win 200 Coins'],
    tips: ['No free plays — every card is staked', ROUNDING_TIP, 'The card is decided the moment you buy it', 'Closing before revealing still pays a winning card'],
  },
  numbers: {
    title: '🎱 Lucky Numbers',
    subtitle: 'Pick 6 numbers, watch the machine draw 6 balls — the more you match, the more you win!',
    image: 'numbers',
    steps: [
      { icon: '🔢', title: 'Pick 6 Numbers', desc: 'Tap 6 numbers from 1 to 20, or tap QUICK PICK for a random 6. Tap a number again to swap it out.' },
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 5, 10 or 20.' },
      { icon: '🎱', title: 'Tap DRAW', desc: 'The machine pops out 6 balls. Every ball that matches one of your numbers lights up. 2 or more matches win whole coins — the machine shows the prizes for your stake.' },
    ],
    prizes: [`2 matches: stake 20 → win ${NUM20[2]} Coins`, `3 matches: stake 20 → win ${NUM20[3]} Coins`, `4 matches: stake 20 → win ${NUM20[4]} Coins`, `5 or 6 matches: stake 20 → win ${NUM20[5]} Coins`],
    tips: ['No free plays — every draw is staked', 'All 6 balls are decided the moment you tap DRAW', 'Your last numbers and stake are remembered', 'Closing mid-draw still pays your matches'],
  },
  tower: {
    title: '🏗️ Tower Build',
    subtitle: 'Build floors on the crane — every floor pays more. Cash out before the tower falls!',
    image: 'tower',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 10, 25 or 50.' },
      { icon: '🏗️', title: 'Tap BUILD', desc: 'The crane swings a floor over the tower. Tap to drop it. If it holds, your tower grows one floor and the multiplier goes up. There are 15 floors.' },
      { icon: '💰', title: 'Cash Out', desc: 'Tap CASH OUT to bank your stake times the multiplier, rounded UP to whole coins. If the floor does not hold, the tower falls and you lose the stake.' },
    ],
    prizes: [`1 floor: stake 50 → win ${towerPay(50, 1)} Coins`, `5 floors: stake 50 → win ${towerPay(50, 5)} Coins`, `10 floors: stake 50 → win ${towerPay(50, 10)} Coins`, `15 floors (the roof): stake 50 → win ${towerPay(50, 15)} Coins`],
    tips: ['No free plays — every tower is staked', ROUNDING_TIP, 'Each floor is decided the moment you drop it', 'Closing mid-round cashes out what you already built. Before the first floor, your stake comes back'],
  },
  speedtrap: {
    title: '🚔 Speed Trap',
    subtitle: 'The minibus speeds up and the multiplier climbs. Take your coins before the police stop it!',
    image: 'speedtrap',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 5, 10 or 20. AUTO can cash out for you at 1.5x, 2x, 3x or 5x.' },
      { icon: '🚐', title: 'Tap GO', desc: 'The minibus drives faster and faster. The multiplier climbs from 1.00x while it drives.' },
      { icon: '💰', title: 'Take Your Coins', desc: 'Tap CASH OUT to bank your stake times the multiplier, rounded UP to whole coins. If the police stop the bus first, you lose the stake. At 5,000x the bus is parked and you win.' },
    ],
    prizes: ['2x: stake 20 → win 40 Coins', '10x: stake 20 → win 200 Coins', '100x: stake 20 → win 2,000 Coins', '5,000x (max): stake 20 → win 100,000 Coins'],
    tips: ['No free plays — every drive is staked', 'Where the police stop the bus is decided the moment you tap GO', 'The bus never stops at the same multiplier twice in a row', 'Closing mid-drive cashes out at the current multiplier'],
  },
  crossing: {
    title: '🐔 Road Crossing',
    subtitle: 'Help the villager and his chicken cross 8 lanes of the Great East Road. Cash out after any lane!',
    image: 'crossing',
    steps: [
      { icon: '🪙', title: 'Pick a Stake and Level', desc: 'Choose 1, 10, 25 or 50 coins, then EASY, MEDIUM or HARD. Harder roads have more cars and pay much more.' },
      { icon: '🚶', title: 'Cross a Lane', desc: 'Tap to step onto the next lane. If it is safe, the multiplier goes up. If a car comes, you lose the stake.' },
      { icon: '💰', title: 'Cash Out', desc: 'Tap CASH OUT after any lane to bank your stake times the multiplier, rounded UP to whole coins. Reach the market after lane 8 and you win automatically.' },
    ],
    prizes: [`Easy, 8 lanes: stake 50 → win ${crossPay(50, 'easy', 8)} Coins`, `Medium, 8 lanes: stake 50 → win ${crossPay(50, 'medium', 8)} Coins`, `Hard, 4 lanes: stake 50 → win ${crossPay(50, 'hard', 4)} Coins`, `Hard, 8 lanes: stake 50 → win ${crossPay(50, 'hard', 8)} Coins`],
    tips: ['No free plays — every crossing is staked', ROUNDING_TIP, 'Each lane is decided the moment you step', 'Closing mid-crossing cashes out what you already won. Before the first lane, your stake comes back'],
  },
  parking: {
    title: '🅿️ Street Parking',
    subtitle: 'Pick a parking bay and park before the rival taxi takes it!',
    image: 'parking',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 10, 25 or 50.' },
      { icon: '🅿️', title: 'Pick a Bay', desc: 'Tap one of the 6 bays. A bigger multiplier is a harder bay to get: 1.2x up to 4x.' },
      { icon: '🚗', title: 'Tap PARK', desc: 'Race the taxi for your bay. Park first and you win your stake times the bay multiplier. If the taxi gets there first, YOU ARE LATE and you lose the stake.' },
    ],
    prizes: ['1.2x bay: stake 50 → win 60 Coins', '2x bay: stake 50 → win 100 Coins', '3x bay: stake 50 → win 150 Coins', '4x bay: stake 50 → win 200 Coins'],
    tips: ['No free plays — every park is staked', ROUNDING_TIP, 'The result is decided the moment you tap PARK', 'Closing mid-race still pays a win'],
  },
  conductor: {
    title: '🚌 Bus Conductor 2',
    subtitle: 'Five stops, six riders at each. Pick who pays — cash out after any stop!',
    image: 'conductor',
    steps: [
      { icon: '🪙', title: 'Pick a Stake', desc: 'Choose how many coins to play: 1, 10, 25 or 50.' },
      { icon: '🧑‍🤝‍🧑', title: 'Pick a Rider', desc: 'At each stop, tap one of the 6 riders to ask for the fare. At stop 1, 1 rider has no money. At stop 2, 2 riders have no money, and so on.' },
      { icon: '💰', title: 'Cash Out', desc: 'If your rider pays, the multiplier goes up. Tap CASH OUT after any stop to bank your stake times the multiplier, rounded UP to whole coins. If your rider has no money, you lose the stake.' },
    ],
    prizes: [1, 2, 3, 5].map(k => `${k} stop${k > 1 ? 's' : ''}: stake 50 → win ${condPay(50, k)} Coins`),
    tips: ['No free plays — every trip is staked', ROUNDING_TIP, 'Who has no money is decided the moment you pick', 'Closing mid-trip cashes out what you already won. Before the first stop, your stake comes back'],
  },
  daily: {
    title: '🎁 Daily Hub',
    subtitle: 'Complete 3 daily tasks for bonus rewards!',
    image: 'dailyGift',
    steps: [
      { icon: '🎯', title: '3 Daily Tasks', desc: 'Claim your streak, place a bet, and play a game each day.' },
      { icon: '🏆', title: 'Bonus Reward', desc: 'Complete all 3 tasks for a 200 Coin + 5 Gem + 100 XP bonus!' },
      { icon: '📈', title: 'Streak Calendar', desc: 'Days 1–6: 10 Coins a day → Day 7 in a row: 100 Coins. Don\'t break the streak!' },
    ],
    prizes: ['Daily Spin: up to 350 Coins + Gems', 'All Tasks Bonus: 200 🪙 + 5 💚', 'Day 7 in a row: 100 Coins'],
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
