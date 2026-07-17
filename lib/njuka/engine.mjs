// lib/njuka/engine.mjs — pure rules + round state for Njuka Boss.
// No DOM, no timers; shuffle takes an injectable rng so tests are
// deterministic. Cards are { r: 1..13, s: '♠♥♦♣' } — suits are cosmetic,
// every rule works on ranks alone.

export const FACES = new Set([11, 12, 13]);
export const SUITS = ['♠', '♥', '♦', '♣'];
const LABELS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const label = (r) => LABELS[r] || String(r);

// A=1 low, no wrap. Numbers connect at distance 1. J/Q/K are an any-order
// group: two DISTINCT faces always connect; a face never connects to a
// number (so 10–J is NOT a run and AAA+K is not a win).
export function connects(a, b) {
  if (FACES.has(a) && FACES.has(b)) return a !== b;
  if (FACES.has(a) || FACES.has(b)) return false;
  return Math.abs(a - b) === 1;
}

function countRanks(ranks) {
  const m = {};
  for (const r of ranks) m[r] = (m[r] || 0) + 1;
  return m;
}

function removeCopies(ranks, r, n) {
  const rest = [...ranks];
  for (let i = 0; i < n; i++) rest.splice(rest.indexOf(r), 1);
  return rest;
}

// A winning 4-card hand: triple + follower (7·7·7·8) or pair + 2-run (5·5·7·8).
export function isWin(ranks) {
  if (ranks.length !== 4) return false;
  const counts = countRanks(ranks);
  for (const k in counts) {
    const r = +k;
    if (counts[k] >= 3) {
      const rest = removeCopies(ranks, r, 3);
      if (rest.length === 1 && connects(r, rest[0])) return true;
    }
    if (counts[k] >= 2) {
      const rest = removeCopies(ranks, r, 2);
      if (rest.length === 2 && connects(rest[0], rest[1])) return true;
    }
  }
  return false;
}

// Which 4th ranks would complete this 3-card hand (ascending).
export function completions(ranks3) {
  const out = [];
  for (let r = 1; r <= 13; r++) if (isWin([...ranks3, r])) out.push(r);
  return out;
}

// ---------------------------------------------------------------------------
// Round state. Shape:
// { deck, hands: [[card]], discard: [card], turn, phase, winner }
// phase: 'draw' | 'discard' | 'swapdraw' | 'end' | 'void'
// ---------------------------------------------------------------------------

export function buildDeck() {
  const deck = [];
  for (let r = 1; r <= 13; r++) for (const s of SUITS) deck.push({ r, s });
  return deck;
}

export function shuffle(deck, rng = Math.random) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export const handRanks = (hand) => hand.map((card) => card.r);

export function createRound(numSeats = 4, rng = Math.random) {
  const deck = shuffle(buildDeck(), rng);
  const hands = [];
  for (let s = 0; s < numSeats; s++) hands.push([deck.pop(), deck.pop(), deck.pop()]);
  return { deck, hands, discard: [], turn: 0, phase: 'draw', winner: null };
}

// Returns the drawn card, or null when the deck is exhausted (phase 'void' —
// the round is a wash and the caller refunds the player's stake).
export function drawCard(state) {
  if (state.phase !== 'draw' && state.phase !== 'swapdraw') throw new Error('not a draw phase');
  const card = state.deck.pop();
  if (!card) { state.phase = 'void'; return null; }
  state.hands[state.turn].push(card);
  state.phase = state.phase === 'swapdraw' ? 'end' : 'discard';
  return card;
}

export function discardCard(state, idx) {
  if (state.phase !== 'discard') throw new Error('not discard phase');
  const [card] = state.hands[state.turn].splice(idx, 1);
  state.discard.push(card);
  state.phase = 'end';
  return card;
}

export function advanceTurn(state) {
  state.turn = (state.turn + 1) % state.hands.length;
  state.phase = 'draw';
}

// Seats (other than the discarder) whose hand + this card is an instant win.
// Faces and swap-thrown (noClaim) cards can never be claimed.
export function claimants(state, card, fromSeat) {
  if (card.noClaim || FACES.has(card.r)) return [];
  return state.hands
    .map((_, i) => i)
    .filter((i) => i !== fromSeat && isWin([...handRanks(state.hands[i]), card.r]));
}

// Two selected cards may be thrown if they form a pair or a 2-run.
export function validSwapPair(ranks4, i, j) {
  if (i === j || ranks4[i] == null || ranks4[j] == null) return false;
  return ranks4[i] === ranks4[j] || connects(ranks4[i], ranks4[j]);
}

// The swap RIGHT exists only when the 4-card hand holds two DISJOINT
// pair/2-run combos (you keep one plan, throw the other). Returns the first
// throwable pair of indices, or null.
export function swapPair(ranks4) {
  const opts = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) if (validSwapPair(ranks4, i, j)) opts.push([i, j]);
  }
  for (const a of opts) {
    for (const b of opts) {
      if (a[0] !== b[0] && a[0] !== b[1] && a[1] !== b[0] && a[1] !== b[1]) return a;
    }
  }
  return null;
}

// Throw two cards (marked un-claimable) from the current 4-card hand; the
// player then draws a replacement via drawCard (phase 'swapdraw') and the
// turn ends with 3 cards — no win check is possible on a 3-card hand.
export function applySwap(state, i, j) {
  if (state.phase !== 'discard') throw new Error('not discard phase');
  const hand = state.hands[state.turn];
  if (!validSwapPair(handRanks(hand), i, j)) throw new Error('invalid swap pair');
  for (const idx of [i, j].sort((a, b) => b - a)) {
    const [card] = hand.splice(idx, 1);
    card.noClaim = true;
    state.discard.push(card);
  }
  state.phase = 'swapdraw';
}
