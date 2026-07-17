# Njuka Boss Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Njuka Boss card game (Zambian draw-and-discard) as an 8th platform game: 4-seat table vs 3 provably fair bots, pure coin-stake economy (5/10/25/50, no free plays).

**Architecture:** Pure rules engine (`lib/njuka/engine.mjs`) + fair bot brain (`lib/njuka/bot.mjs`), both unit-tested via the existing `node --test` suite. UI is a standard game-modal component (`components/games/NjukaGame.jsx`) using GameShell/v2 tokens, wired into `GamificationPlatform.jsx` with a new `stakeOnly` game flag.

**Tech Stack:** Next.js 14 client component, node:test for engine/bot, existing gameKit (GameShell/GameBtn/OptionBtn), TutorialModal, RewardIcon.

**Spec:** `docs/superpowers/specs/2026-07-17-njuka-boss-integration-design.md`

**Key fairness invariant (repeated in every relevant task):** a bot's knowledge is exactly (its own hand, its `seen` rank counter). `seen` is fed ONLY from: own dealt cards, own drawn cards, public discards. Never from the deck, never from opponents' concealed hands.

**Deliberate deviations from the prototype** (approved: "improvements welcome"):
- No drag-to-reorder of the hand (tap-to-discard only — YAGNI on mobile).
- One 15s timer covers the player's whole turn (draw + discard), not 15s per phase; timeout auto-plays instead of forfeiting.
- No lobby/queue/kick/VIP/rake.
- Swap-selection does not pause the turn timer (prevents an AFK stall).

---

### Task 1: Engine — rules core (`connects`, `isWin`, `completions`)

**Files:**
- Create: `lib/njuka/engine.mjs`
- Create: `tests/njuka-engine.test.mjs`

- [ ] **Step 1: Write the failing tests**

Create `tests/njuka-engine.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connects, isWin, completions, label } from '../lib/njuka/engine.mjs';

test('connects: numbers at distance 1, A low, no wrap', () => {
  assert.ok(connects(1, 2));
  assert.ok(connects(7, 8));
  assert.ok(!connects(7, 9));
  assert.ok(!connects(1, 13));  // no wrap — K is a face, A a number
  assert.ok(!connects(10, 11)); // 10 does NOT connect to J
});

test('connects: J/Q/K are an any-order group', () => {
  assert.ok(connects(11, 13));
  assert.ok(connects(12, 11));
  assert.ok(!connects(11, 11)); // same face is not a run
});

test('isWin: triple + follower', () => {
  assert.ok(isWin([7, 7, 7, 8]));
  assert.ok(isWin([7, 7, 7, 6]));
  assert.ok(isWin([13, 13, 13, 11]));  // KKK + J (face group)
  assert.ok(!isWin([10, 10, 10, 11])); // 10s can't follow to J
  assert.ok(!isWin([1, 1, 1, 13]));    // AAA + K is not a win
});

test('isWin: pair + 2-run', () => {
  assert.ok(isWin([5, 5, 7, 8]));
  assert.ok(isWin([1, 1, 2, 3]));      // A-low run
  assert.ok(isWin([12, 12, 11, 13]));  // QQ + J-K any-order faces
  assert.ok(!isWin([3, 4, 5, 6]));     // plain run is nothing
  assert.ok(!isWin([7, 7, 8, 8]));     // two pairs isn't a win
  assert.ok(!isWin([7, 7, 7, 7]));     // quads aren't a win
  assert.ok(!isWin([5, 5, 7]));        // must be exactly 4 cards
});

test('completions lists winning 4th ranks for a trio, ascending', () => {
  assert.deepEqual(completions([7, 7, 7]), [6, 8]);
  assert.deepEqual(completions([7, 7, 2]), [1, 3]);
  assert.deepEqual(completions([11, 11, 11]), [12, 13]);
  assert.deepEqual(completions([2, 5, 9]), []);
});

test('label renders A and faces', () => {
  assert.equal(label(1), 'A');
  assert.equal(label(10), '10');
  assert.equal(label(13), 'K');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module ... lib/njuka/engine.mjs` (the four pre-existing test files still pass).

- [ ] **Step 3: Implement the rules core**

Create `lib/njuka/engine.mjs`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all files).

- [ ] **Step 5: Commit**

```bash
git add lib/njuka/engine.mjs tests/njuka-engine.test.mjs
git commit -m "njuka: rules core — connects/isWin/completions with tests"
```

---

### Task 2: Engine — deck, deal, and round-state transitions

**Files:**
- Modify: `lib/njuka/engine.mjs` (append)
- Modify: `tests/njuka-engine.test.mjs` (append)

**Phase machine:** `'draw' → drawCard → 'discard' → discardCard → 'end'` or `'discard' → applySwap → 'swapdraw' → drawCard → 'end'`; `advanceTurn` resets to `'draw'`. `drawCard` on an empty deck returns `null` and sets phase `'void'` (round void, UI refunds the stake).

- [ ] **Step 1: Append the failing tests**

Append to `tests/njuka-engine.test.mjs`:

```js
import {
  buildDeck, shuffle, createRound, handRanks, drawCard, discardCard,
  advanceTurn, claimants, validSwapPair, swapPair, applySwap,
} from '../lib/njuka/engine.mjs';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
const c = (r) => ({ r, s: '♠' });

test('buildDeck: 52 cards, 4 of each rank', () => {
  const deck = buildDeck();
  assert.equal(deck.length, 52);
  const counts = {};
  deck.forEach(x => { counts[x.r] = (counts[x.r] || 0) + 1; });
  for (let r = 1; r <= 13; r++) assert.equal(counts[r], 4);
});

test('shuffle is deterministic with an injected rng', () => {
  const a = shuffle(buildDeck(), seededRng(42));
  const b = shuffle(buildDeck(), seededRng(42));
  assert.deepEqual(a, b);
});

test('createRound deals 3 cards to each of 4 seats', () => {
  const S = createRound(4, seededRng(1));
  assert.equal(S.hands.length, 4);
  S.hands.forEach(h => assert.equal(h.length, 3));
  assert.equal(S.deck.length, 40);
  assert.equal(S.turn, 0);
  assert.equal(S.phase, 'draw');
  assert.equal(S.winner, null);
  assert.deepEqual(S.discard, []);
});

test('draw → discard → advance cycle', () => {
  const S = createRound(4, seededRng(2));
  const card = drawCard(S);
  assert.ok(card);
  assert.equal(S.hands[0].length, 4);
  assert.equal(S.phase, 'discard');
  const out = discardCard(S, 0);
  assert.equal(S.hands[0].length, 3);
  assert.equal(S.discard[S.discard.length - 1], out);
  assert.equal(S.phase, 'end');
  advanceTurn(S);
  assert.equal(S.turn, 1);
  assert.equal(S.phase, 'draw');
});

test('drawCard on an empty deck voids the round', () => {
  const S = createRound(4, seededRng(3));
  S.deck = [];
  assert.equal(drawCard(S), null);
  assert.equal(S.phase, 'void');
});

test('claimants: numbers that complete a hand — never faces, noClaim, or self', () => {
  const S = createRound(4, seededRng(4));
  S.hands = [
    [c(2), c(5), c(12)],
    [c(3), c(6), c(12)],
    [c(9), c(9), c(9)],
    [c(4), c(11), c(13)],
  ];
  assert.deepEqual(claimants(S, { r: 8, s: '♣' }, 0), [2]);            // 999 + 8 wins
  assert.deepEqual(claimants(S, { r: 8, s: '♣', noClaim: true }, 0), []); // swap throws are safe
  assert.deepEqual(claimants(S, { r: 8, s: '♣' }, 2), []);             // discarder can't claim own card
  S.hands[2] = [c(13), c(13), c(13)];
  assert.deepEqual(claimants(S, { r: 11, s: '♣' }, 0), []);            // faces can never be claimed
});

test('swapPair: a throwable pair exists only with two disjoint combos', () => {
  assert.equal(swapPair([5, 5, 7, 9]), null);       // one combo only — no swap
  assert.deepEqual(swapPair([5, 5, 9, 9]), [0, 1]); // two pairs
  assert.deepEqual(swapPair([2, 3, 9, 10]), [0, 1]);// two 2-runs
  assert.equal(swapPair([2, 5, 9, 12]), null);      // nothing combines
});

test('validSwapPair accepts pairs and 2-runs only', () => {
  assert.ok(validSwapPair([5, 5, 9, 9], 0, 1));
  assert.ok(validSwapPair([2, 3, 9, 10], 2, 3));
  assert.ok(!validSwapPair([5, 5, 9, 9], 0, 2));
  assert.ok(!validSwapPair([5, 5, 9, 9], 1, 1));
});

test('applySwap throws two cards un-claimably, then swapdraw refills to 3', () => {
  const S = createRound(4, seededRng(5));
  S.hands[0] = [c(5), c(5), c(9), c(9)];
  S.phase = 'discard';
  applySwap(S, 0, 1);
  assert.equal(S.hands[0].length, 2);
  assert.equal(S.phase, 'swapdraw');
  const thrown = S.discard.slice(-2);
  assert.ok(thrown.every(x => x.noClaim && x.r === 5));
  const drawn = drawCard(S);
  assert.ok(drawn);
  assert.equal(S.hands[0].length, 3);
  assert.equal(S.phase, 'end');
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npm test`
Expected: FAIL — `buildDeck` etc. not exported. Task 1 tests still pass.

- [ ] **Step 3: Append the implementation**

Append to `lib/njuka/engine.mjs`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/njuka/engine.mjs tests/njuka-engine.test.mjs
git commit -m "njuka: round state — deck/deal/draw/discard/claims/swap with tests"
```

---

### Task 3: The fair bot (`lib/njuka/bot.mjs`)

**Files:**
- Create: `lib/njuka/bot.mjs`
- Create: `tests/njuka-bot.test.mjs`

**Fairness invariant:** `botDecide(ranks4, seen)` — nothing else. No deck, no opponents, no globals. `botDecide` ALWAYS returns a usable `index` (best discard) even when `action` is `'swap'`, so callers (e.g. the player auto-play) can fall back to a plain discard.

- [ ] **Step 1: Write the failing tests**

Create `tests/njuka-bot.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSeen, observe, liveOuts, botDecide, BOT_CLAIM_DELAY, BOT_CLAIM_MISS,
} from '../lib/njuka/bot.mjs';
import {
  createRound, handRanks, drawCard, discardCard, advanceTurn, applySwap,
} from '../lib/njuka/engine.mjs';

function seededRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

test('botDecide API is structurally fair: (hand, seen) and nothing else', () => {
  assert.equal(botDecide.length, 2);
});

test('declares a win when holding one', () => {
  assert.equal(botDecide([7, 7, 7, 8], createSeen([7, 7, 7, 8])).action, 'win');
});

test('keeps the trio with more live outs (throws the lone face)', () => {
  // keep 7-7-2 (outs A,3 — 8 live copies, claimable) beats keep 7-7-J (outs Q,K — draw-only)
  const d = botDecide([7, 7, 2, 11], createSeen([7, 7, 2, 11]));
  assert.equal(d.action, 'discard');
  assert.equal(d.index, 3);
});

test('card counting flips the decision when outs die', () => {
  const seen = createSeen([7, 7, 2, 11]);
  for (let i = 0; i < 4; i++) { observe(seen, 1); observe(seen, 3); } // every A and 3 seen
  const d = botDecide([7, 7, 2, 11], seen);
  assert.equal(d.action, 'discard');
  assert.equal(d.index, 2); // the 2 is now the dead card
});

test('liveOuts subtracts seen copies and weights claimable outs 1.25×', () => {
  const seen = createSeen([7, 7, 2]);
  assert.equal(liveOuts([7, 7, 2], seen), (4 + 4) * 1.25);
  observe(seen, 1); observe(seen, 1);
  assert.equal(liveOuts([7, 7, 2], seen), (2 + 4) * 1.25);
  assert.equal(liveOuts([11, 11, 11], seen), 4 + 4); // face outs unweighted
});

test('dead hand with two pairs swaps (and still offers a fallback index)', () => {
  const seen = createSeen([2, 2, 9, 9]);
  [1, 3, 8, 10].forEach(r => { for (let i = 0; i < 4; i++) observe(seen, r); });
  observe(seen, 2); observe(seen, 2); // the other two 2s
  observe(seen, 9); observe(seen, 9); // the other two 9s
  const d = botDecide([2, 2, 9, 9], seen);
  assert.equal(d.action, 'swap');
  assert.deepEqual(d.indices, [0, 1]);
  assert.equal(typeof d.index, 'number');
});

test('claim behavior constants are player-favorable', () => {
  assert.ok(BOT_CLAIM_DELAY[0] >= 800);
  assert.ok(BOT_CLAIM_DELAY[1] > BOT_CLAIM_DELAY[0]);
  assert.ok(BOT_CLAIM_MISS > 0 && BOT_CLAIM_MISS < 0.3);
});

test('full simulated round: every bot knows exactly what it legitimately saw', () => {
  const S = createRound(4, seededRng(7));
  const seen = S.hands.map(h => createSeen(handRanks(h)));
  const legit = S.hands.map(h => handRanks(h).slice()); // ranks each seat may know
  let guard = 0;
  while (S.phase !== 'void' && guard++ < 200) {
    const seat = S.turn;
    const card = drawCard(S);
    if (!card) break;
    observe(seen[seat], card.r); legit[seat].push(card.r);
    const dec = botDecide(handRanks(S.hands[seat]), seen[seat]);
    if (dec.action === 'win') break;
    let discards;
    if (dec.action === 'swap') {
      applySwap(S, dec.indices[0], dec.indices[1]);
      discards = S.discard.slice(-2);
      const d2 = drawCard(S);
      if (!d2) break;
      observe(seen[seat], d2.r); legit[seat].push(d2.r);
    } else {
      discards = [discardCard(S, dec.index)];
    }
    for (const d of discards) {
      for (let i = 0; i < 4; i++) if (i !== seat) { observe(seen[i], d.r); legit[i].push(d.r); }
    }
    advanceTurn(S);
  }
  assert.ok(guard > 1, 'round actually ran');
  for (let i = 0; i < 4; i++) {
    const total = Object.values(seen[i]).reduce((a, b) => a + b, 0);
    assert.equal(total, legit[i].length, `seat ${i} counts exactly its legitimate observations`);
    for (const r in seen[i]) assert.ok(seen[i][r] <= 4, 'never more copies than exist');
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module ... lib/njuka/bot.mjs`.

- [ ] **Step 3: Implement the bot**

Create `lib/njuka/bot.mjs`:

```js
// lib/njuka/bot.mjs — the FAIR bot brain.
//
// FAIRNESS CONTRACT: a bot's entire knowledge is (its own hand, its `seen`
// rank counter). `seen` may only ever be fed from cards the bot legitimately
// observed: its own dealt/drawn cards and public discards. There is
// deliberately no deck, no opponent hand, and no global state in any
// signature here — the prototype's deck-peeking (`botFuture`) and omniscient
// shared `seen` are gone by construction. tests/njuka-bot.test.mjs enforces
// the shape.
import { FACES, isWin, completions, swapPair } from './engine.mjs';

export const BOT_CLAIM_DELAY = [900, 2200]; // ms before a bot fires a claim
export const BOT_CLAIM_MISS = 0.12;         // chance a bot misses a claim entirely

export function createSeen(ranks = []) {
  const seen = {};
  for (const r of ranks) seen[r] = (seen[r] || 0) + 1;
  return seen;
}

export function observe(seen, rank) {
  seen[rank] = (seen[rank] || 0) + 1;
}

// Weighted count of unseen cards that would complete the trio. Number outs
// weigh 25% extra: they can be claimed off discards as well as drawn, while
// face outs (J/Q/K) can only ever be drawn.
export function liveOuts(ranks3, seen) {
  let outs = 0;
  for (const r of completions(ranks3)) {
    const live = Math.max(0, 4 - (seen[r] || 0));
    outs += FACES.has(r) ? live : live * 1.25;
  }
  return outs;
}

// Decide the turn holding 4 cards. Returns:
//   { action: 'win' }
//   { action: 'swap', indices: [i, j], index }   (index = fallback discard)
//   { action: 'discard', index }
export function botDecide(ranks4, seen) {
  if (isWin(ranks4)) return { action: 'win' };
  let index = 0, bestScore = -Infinity, bestOuts = 0;
  for (let i = 0; i < 4; i++) {
    const keep = ranks4.filter((_, j) => j !== i);
    const outs = liveOuts(keep, seen);
    // Tiny tie-break: prefer throwing faces — they can never be claimed
    // against you. (0.01 < the 0.25 outs quantum, so it never outvotes outs.)
    const score = outs + (FACES.has(ranks4[i]) ? 0.01 : 0);
    if (score > bestScore) { bestScore = score; bestOuts = outs; index = i; }
  }
  if (bestOuts === 0) {
    const indices = swapPair(ranks4);
    if (indices) return { action: 'swap', indices, index };
  }
  return { action: 'discard', index };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all files, including both njuka suites).

- [ ] **Step 5: Commit**

```bash
git add lib/njuka/bot.mjs tests/njuka-bot.test.mjs
git commit -m "njuka: fair bot — own-hand + public-discard knowledge only, with fairness tests"
```

---

### Task 4: Data entries + PlayView stake-only card

**Files:**
- Modify: `lib/data/platform.js` (MINIGAMES, after the `stopclock` line ~85)
- Modify: `lib/config/defaults.js:8` (DEFAULT_DAILY_PLAYS)
- Modify: `lib/data/tutorials.js` (append to TUTORIALS)
- Modify: `components/redesign/PlayView.jsx:32-54` (GameCard)

- [ ] **Step 1: Add the MINIGAMES entry**

In `lib/data/platform.js`, after the `stopclock` line inside `MINIGAMES`, add:

```js
  { id: 'njuka', name: 'Njuka Boss', desc: 'Stake coins, claim cards, take the pot!', free: 0, cost: 0, stakeOnly: true, image: 'playingCards', isNew: true },
```

(`stakeOnly` is a new flag: no daily plays, no extra-play charge — rounds are coin-staked inside the game. `cost: 0` is display-only; `activeGames` overwrites `cost` with `extraPlayCost` for every game, and the `stakeOnly` branch added in Task 6 ignores it.)

- [ ] **Step 2: Zero its daily plays**

In `lib/config/defaults.js` line 8, add `njuka: 0`:

```js
export const DEFAULT_DAILY_PLAYS = { wheel: 3, scratch: 5, dice: 5, highlow: 5, plinko: 5, tapfrenzy: 5, stopclock: 5, njuka: 0 };
```

(The 6am refresh then tops njuka up to 0 — i.e. never grants free plays. If an admin sets dailyPlays > 0 in the dashboard it is harmless: the `stakeOnly` launch path never consumes plays.)

- [ ] **Step 3: Add the tutorial**

In `lib/data/tutorials.js`, add a `njuka` key to `TUTORIALS` (after `stopclock`, or last — order is irrelevant):

```js
  njuka: {
    title: '🃏 Njuka Boss',
    subtitle: 'The Zambian card classic — winner takes the pot!',
    image: 'playingCards',
    steps: [
      { icon: '🪙', title: 'Stake Coins', desc: 'Pick a stake (5–50 coins). All 4 seats pay in — the winner takes the whole pot!' },
      { icon: '🎴', title: 'Build 4 Cards', desc: 'Draw and discard to form a triple + follower (7·7·7·8) or a pair + run (5·5·7·8). A is low; J, Q and K connect to each other in any order — but 10 never connects to J.' },
      { icon: '⚡', title: 'Claim to Win', desc: 'If anyone discards a number card that completes your hand, TAP the glowing pile before the bots beat you to it. J/Q/K can never be claimed.' },
    ],
    prizes: ['Stake 5 → win 15', 'Stake 10 → win 30', 'Stake 25 → win 75', 'Stake 50 → win 150'],
    tips: ['No free plays — every round is staked', 'Stuck with two pairs? Swap one for a fresh draw', 'Run out of time and the game plays a sensible turn for you', 'The bots play 100% fair — they only see their own cards and the discard pile'],
  },
```

- [ ] **Step 4: Teach GameCard about stake-only games**

In `components/redesign/PlayView.jsx`, replace the `GameCard` function (lines 32–54) with:

```jsx
function GameCard({ g, free, onPlay, i = 0 }) {
  const out = !g.stakeOnly && free <= 0;
  return (
    <Card className="card-enter" style={{ overflow: 'hidden', cursor: out ? 'default' : 'pointer', opacity: out ? 0.72 : 1, animationDelay: `${i * 45}ms` }}>
      <div onClick={() => !out && onPlay && onPlay(g.id)} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ position: 'relative' }}>
          <Thumb src={IMAGES[g.image]} alt={g.name} h={82} radius={0} />
          {g.isNew && <span style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}><Badge bg={C.red} color="#fff">New</Badge></span>}
          <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, fontSize: 9.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, background: g.stakeOnly ? 'rgba(230,173,74,.92)' : free > 0 ? 'rgba(79,169,139,.92)' : 'rgba(0,0,0,.55)', color: g.stakeOnly ? '#2b1e04' : free > 0 ? '#08210f' : C.sub }}>
            {g.stakeOnly ? 'STAKES' : free > 0 ? `${free} FREE` : '0'}
          </span>
        </div>
        <div style={{ padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{g.name}</div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 13px', borderRadius: 7, background: out ? C.track : C.green, color: out ? C.muted : '#08210f' }}>{out ? 'No plays' : 'Play'}</span>
            <span style={{ fontSize: 10.5, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{g.stakeOnly ? <><RewardIcon kind="coins" size={13} />5–50</> : free > 0 ? 'Free' : <><RewardIcon kind="coins" size={13} />{g.cost}</>}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 5: Verify tests and build**

Run: `npm test`
Expected: PASS (existing config tests use inline fixtures, not MINIGAMES — nothing breaks).
Run: `npm run build`
Expected: compiles clean.

- [ ] **Step 6: Commit**

```bash
git add lib/data/platform.js lib/config/defaults.js lib/data/tutorials.js components/redesign/PlayView.jsx
git commit -m "njuka: game entry (stakeOnly), zero daily plays, tutorial, STAKES game card"
```

---

### Task 5: The NjukaGame component

**Files:**
- Create: `components/games/NjukaGame.jsx`

This is one file written in one step (React UI has no unit-test harness in this repo; `npm run build` + the Task 7 browser pass verify it). All engine/bot calls below exist exactly as defined in Tasks 1–3.

- [ ] **Step 1: Write the component**

Create `components/games/NjukaGame.jsx`:

```jsx
'use client'

import React, { useState, useRef, useEffect } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell, GameBtn, OptionBtn } from './gameKit';
import { GAME_ECONOMY } from '@/lib/data/platform';
import {
  label, isWin, handRanks, createRound, drawCard, discardCard, advanceTurn,
  claimants, swapPair, validSwapPair, applySwap,
} from '@/lib/njuka/engine.mjs';
import { createSeen, observe, botDecide, BOT_CLAIM_DELAY, BOT_CLAIM_MISS } from '@/lib/njuka/bot.mjs';

// ============================================================================
// NJUKA BOSS — Zambian draw-and-discard, rebuilt native (spec:
// docs/superpowers/specs/2026-07-17-njuka-boss-integration-design.md).
// 4 seats: you + 3 FAIR bots. Each seat's knowledge lives in seenRef and is
// fed EXCLUSIVELY from its own cards + public discards (see seatSees /
// everyoneElseSees — those two helpers are the entire fairness boundary).
// Pure-stake economy: no free plays; every round deducts the stake via
// onSpend and a win pays stake + min(3×stake, MAX_WIN) via onWin.
// ============================================================================

const STAKES = [5, 10, 25, 50];
const TURN_MS = 15000;  // player's whole turn (draw + discard)
const CLAIM_MS = 5000;  // claim window after an eligible discard
const NEXT_MS = 6000;   // auto-deal countdown between rounds
const BOT_NAMES = ['Mwape', 'Bwalya', 'Chanda', 'Mutale', 'Phiri', 'Banda', 'Tembo', 'Zulu', 'Daka', 'Sakala', 'Mumba', 'Nkhata'];
const SEAT_POS = [null, { left: '16%', top: '26%' }, { left: '50%', top: '14%' }, { left: '84%', top: '26%' }];

function CardFace({ card, w = 54, hidden, tappable, picked, pulse, outline, onClick }) {
  const red = card && (card.s === '♥' || card.s === '♦');
  return (
    <div onClick={onClick} style={{
      width: w, height: Math.round(w * 1.45), borderRadius: Math.max(5, Math.round(w * 0.12)),
      background: hidden ? 'repeating-linear-gradient(45deg, #453263, #453263 5px, #33254a 5px, #33254a 10px)' : '#faf7ef',
      color: red ? '#c0202f' : '#191922',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
      fontSize: Math.round(w * 0.4), fontWeight: 800,
      boxShadow: '0 3px 8px rgba(0,0,0,.4)', userSelect: 'none',
      cursor: (tappable || onClick) ? 'pointer' : 'default',
      outline: picked ? '3px solid #4da6ff' : outline ? `3px solid ${outline}` : tappable ? `2px solid ${C.gold}` : 'none',
      transform: picked ? 'translateY(-8px)' : 'none',
      transition: 'transform .12s',
      border: hidden ? '1px solid rgba(0,0,0,.35)' : '1px solid rgba(0,0,0,.15)',
      animation: pulse ? 'njukaPulse .7s infinite' : 'none',
    }}>
      {!hidden && card ? `${label(card.r)}${card.s}` : ''}
    </div>
  );
}

export default function NjukaGame({ onClose, closing, onWin, onSpend, onRefund, balance = 0 }) {
  const [screen, setScreen] = useState('stake');   // 'stake' | 'table'
  const [stake, setStakeState] = useState(10);
  const [showTutorial, setShowTutorial] = useState(false);
  const [, force] = useState(0);
  const [hint, setHint] = useState('');
  const [timerFrac, setTimerFrac] = useState(1);
  const [claimable, setClaimable] = useState(false);
  const [swapSel, setSwapSel] = useState(null);    // null | [picked indices]
  const [banner, setBanner] = useState(null);      // { title, sub, cards, kind }
  const [nextIn, setNextIn] = useState(null);
  const [sessionNet, setSessionNet] = useState(0);
  const [reduceMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const roundRef = useRef(null);   // engine round state (mutable)
  const seenRef = useRef([]);      // per-seat fair knowledge — see header comment
  const botsRef = useRef([]);      // 3 bot names, fixed for the session
  const timersRef = useRef([]);
  const turnTimerRef = useRef(null);
  const claimFireRef = useRef(null);
  const stakeRef = useRef(10);
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const rerender = () => force(n => n + 1);
  const setStake = (v) => { stakeRef.current = v; setStakeState(v); };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timersRef.current.push(t); return t; };
  const stopTurnTimer = () => { if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; } };
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; stopTurnTimer(); };
  useEffect(() => clearTimers, []);

  const botName = (seat) => botsRef.current[seat - 1] || 'Bot';

  // ---- knowledge upkeep: THE fairness boundary ----
  // A draw is private (only the drawer sees it); a discard is public (all
  // OTHER seats see it — the discarder already counted the card when it
  // entered their hand).
  const seatSees = (seat, rank) => observe(seenRef.current[seat], rank);
  const everyoneElseSees = (exceptSeat, rank) => seenRef.current.forEach((sn, i) => { if (i !== exceptSeat) observe(sn, rank); });

  // ---- round lifecycle ----
  const startRound = (st = stakeRef.current) => {
    clearTimers(); setBanner(null); setSwapSel(null); setClaimable(false); setNextIn(null); setTimerFrac(1);
    if (balanceRef.current < st) {
      roundRef.current = null; setScreen('stake');
      setHint('Not enough coins for that stake — visit Earn to top up');
      rerender(); return;
    }
    onSpend(st);
    if (!botsRef.current.length) botsRef.current = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, 3);
    const S = createRound(4);
    S.stake = st;
    roundRef.current = S;
    // deal: each seat learns ONLY its own three cards
    seenRef.current = S.hands.map(h => createSeen(handRanks(h)));
    setScreen('table'); setHint(''); rerender();
    beginTurn();
  };

  const beginTurn = () => {
    const S = roundRef.current; if (!S || S.winner) return;
    S.phase = 'draw'; setTimerFrac(1); rerender();
    if (S.turn === 0) {
      setHint('Your turn — tap the deck to draw');
      startTurnTimer();
    } else {
      setHint(`${botName(S.turn)} is thinking…`);
      later(() => botTurn(S.turn), 800 + Math.random() * 900);
    }
  };

  const startTurnTimer = () => {
    stopTurnTimer();
    let left = TURN_MS;
    turnTimerRef.current = setInterval(() => {
      left -= 250; setTimerFrac(Math.max(0, left / TURN_MS));
      if (left <= 0) { stopTurnTimer(); autoPlay(); }
    }, 250);
  };

  const endTurn = () => {
    const S = roundRef.current; if (!S || S.winner) return;
    advanceTurn(S);
    beginTurn();
  };

  // ---- player actions ----
  const playerDraw = () => {
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || (S.phase !== 'draw' && S.phase !== 'swapdraw')) return;
    const wasSwap = S.phase === 'swapdraw';
    const card = drawCard(S);
    if (!card) { voidRound(); return; }
    seatSees(0, card.r);
    if (wasSwap) {
      stopTurnTimer();
      setHint(`Drew ${label(card.r)} — turn passes`);
      rerender(); later(endTurn, 600); return;
    }
    if (isWin(handRanks(S.hands[0]))) setHint('NJUKA! Declare your win!');
    else setHint('Tap a card to discard' + (swapPair(handRanks(S.hands[0])) ? ' — or swap a pair' : ''));
    rerender();
  };

  const declareWin = () => {
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard' || !isWin(handRanks(S.hands[0]))) return;
    finishWin(0, 'formed the hand', S.hands[0].slice());
  };

  const playerDiscard = (idx) => {
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard' || swapSel) return;
    stopTurnTimer();
    const card = discardCard(S, idx);
    everyoneElseSees(0, card.r);
    rerender();
    afterDiscard(0, card);
  };

  const toggleSwapCard = (idx) => {
    setSwapSel(sel => {
      if (!sel) return sel;
      if (sel.includes(idx)) return sel.filter(i => i !== idx);
      return [...sel.slice(-1), idx]; // keep at most the previous pick + this one
    });
  };

  const confirmSwap = () => {
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard') return;
    if (!swapSel || swapSel.length !== 2) return;
    const [i, j] = swapSel;
    if (!validSwapPair(handRanks(S.hands[0]), i, j)) return;
    applySwap(S, i, j);
    S.discard.slice(-2).forEach(card => everyoneElseSees(0, card.r));
    setSwapSel(null);
    setHint('Now tap the deck to draw your replacement');
    rerender();
  };

  // ---- timeout: play a sensible turn for the player (no forfeit) ----
  const autoPlay = () => {
    const S = roundRef.current; if (!S || S.winner || S.turn !== 0) return;
    stopTurnTimer(); setSwapSel(null);
    if (S.phase === 'draw' || S.phase === 'swapdraw') {
      const wasSwap = S.phase === 'swapdraw';
      const card = drawCard(S);
      if (!card) { voidRound(); return; }
      seatSees(0, card.r);
      if (wasSwap) { rerender(); later(endTurn, 400); return; }
    }
    const ranks = handRanks(S.hands[0]);
    if (isWin(ranks)) { finishWin(0, 'formed the hand', S.hands[0].slice()); return; }
    const dec = botDecide(ranks, seenRef.current[0]); // same fair heuristic plays for you
    const card = discardCard(S, dec.index);
    everyoneElseSees(0, card.r);
    setHint('⏱ Time up — played for you');
    rerender();
    afterDiscard(0, card);
  };

  // ---- bot turn (fair: own hand + own seen only) ----
  const botTurn = (seat) => {
    const S = roundRef.current; if (!S || S.winner || S.turn !== seat) return;
    const card = drawCard(S);
    if (!card) { voidRound(); return; }
    seatSees(seat, card.r);
    rerender();
    const dec = botDecide(handRanks(S.hands[seat]), seenRef.current[seat]);
    if (dec.action === 'win') { finishWin(seat, 'drew the winner', S.hands[seat].slice()); return; }
    if (dec.action === 'swap') {
      applySwap(S, dec.indices[0], dec.indices[1]);
      S.discard.slice(-2).forEach(x => everyoneElseSees(seat, x.r));
      const d2 = drawCard(S);
      if (!d2) { voidRound(); return; }
      seatSees(seat, d2.r);
      rerender(); later(endTurn, 500); return;
    }
    const disc = discardCard(S, dec.index);
    everyoneElseSees(seat, disc.r);
    rerender();
    afterDiscard(seat, disc);
  };

  // ---- claims: the tap race ----
  const afterDiscard = (from, card) => {
    const S = roundRef.current; if (!S || S.winner) return;
    const elig = claimants(S, card, from);
    if (!elig.length) { later(endTurn, 450); return; }
    let resolved = false;
    const fire = (seat) => {
      if (resolved || !roundRef.current || roundRef.current.winner) return;
      resolved = true;
      setClaimable(false); claimFireRef.current = null;
      S.discard.pop();
      S.hands[seat].push(card);
      finishWin(seat, `claimed the ${label(card.r)}`, S.hands[seat].slice());
    };
    // fair bots race with a human-favorable delay + miss chance
    elig.filter(s => s !== 0).forEach(s => {
      if (Math.random() > BOT_CLAIM_MISS) {
        later(() => fire(s), BOT_CLAIM_DELAY[0] + Math.random() * (BOT_CLAIM_DELAY[1] - BOT_CLAIM_DELAY[0]));
      }
    });
    if (elig.includes(0)) {
      setHint(`⚡ The ${label(card.r)} completes your hand — TAP the pile to WIN!`);
      setClaimable(true);
      claimFireRef.current = () => fire(0);
      later(() => {
        if (!resolved) {
          resolved = true; setClaimable(false); claimFireRef.current = null;
          setHint(`Missed the claim on the ${label(card.r)}`);
          later(endTurn, 350);
        }
      }, CLAIM_MS);
    } else {
      later(() => { if (!resolved) { resolved = true; endTurn(); } }, CLAIM_MS + 200);
    }
  };

  // ---- outcomes ----
  const finishWin = (seat, how, cards) => {
    const S = roundRef.current; if (!S || S.winner) return;
    clearTimers(); setClaimable(false); claimFireRef.current = null; setSwapSel(null);
    S.winner = { seat, how, cards };
    if (seat === 0) {
      const profit = Math.min(S.stake * 3, GAME_ECONOMY.MAX_WIN);
      setSessionNet(n => n + profit);
      onWin(S.stake + profit, { net: profit, stake: S.stake });
      setBanner({ title: 'NJUKA! You win 🎉', sub: `+${profit} coins — you ${how}`, cards, kind: 'win' });
    } else {
      setSessionNet(n => n - S.stake);
      setBanner({ title: `${botName(seat)} wins`, sub: `${botName(seat)} ${how} — your ${S.stake} coin stake is gone`, cards, kind: 'lose' });
    }
    rerender();
    scheduleNext();
  };

  const voidRound = () => {
    const S = roundRef.current; if (!S || S.winner) return;
    clearTimers(); setClaimable(false); claimFireRef.current = null; setSwapSel(null);
    S.winner = { seat: -1, how: 'deck exhausted', cards: [] };
    if (onRefund) onRefund(S.stake);
    setBanner({ title: 'Round void', sub: 'The deck ran out — your stake was returned', cards: [], kind: 'void' });
    rerender();
    scheduleNext();
  };

  const scheduleNext = () => {
    let n = Math.round(NEXT_MS / 1000);
    setNextIn(n);
    const tick = () => {
      n -= 1;
      if (n <= 0) { startRound(); return; }
      setNextIn(n);
      later(tick, 1000);
    };
    later(tick, 1000);
  };

  const leaveTable = () => {
    clearTimers(); roundRef.current = null;
    setBanner(null); setNextIn(null); setScreen('stake'); setHint('');
  };

  // ---- render ----
  const S = roundRef.current;
  const myTurn = S && !S.winner && S.turn === 0;
  const canDraw = myTurn && (S.phase === 'draw' || S.phase === 'swapdraw');
  const canDiscard = myTurn && S.phase === 'discard' && !swapSel;
  const myRanks = S && S.hands[0] ? handRanks(S.hands[0]) : [];
  const haveWin = myTurn && S.phase === 'discard' && isWin(myRanks);
  const canOfferSwap = canDiscard && !haveWin && !!swapPair(myRanks);
  const swapValid = !!swapSel && swapSel.length === 2 && validSwapPair(myRanks, swapSel[0], swapSel[1]);
  const topDiscard = S && S.discard.length ? S.discard[S.discard.length - 1] : null;

  const stakeScreen = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.sub, marginBottom: 14 }}>
        <span>Balance</span>
        <b style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="coins" size={14} />{balance}</b>
      </div>
      <div style={{ background: C.track, borderRadius: 14, padding: '12px 14px', fontSize: 12.5, color: C.sub, lineHeight: 1.55, marginBottom: 16 }}>
        Make a 4-card hand: <b style={{ color: C.text }}>triple + follower</b> (7·7·7·8) or <b style={{ color: C.text }}>pair + run</b> (5·5·7·8).
        Claim number cards off the pile — J/Q/K must be drawn. Winner takes the whole pot.
        Your 3 opponents are bots that play fair: they see only their own cards and the discards.
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Your stake</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {STAKES.map(s => (
          <OptionBtn key={s} selected={stake === s} disabled={balance < s} onClick={() => setStake(s)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><RewardIcon kind="coins" size={13} />{s}</span>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginTop: 2 }}>win {Math.min(s * 3, GAME_ECONOMY.MAX_WIN)}</div>
          </OptionBtn>
        ))}
      </div>
      <GameBtn onClick={() => startRound(stake)} disabled={balance < stake}>
        Take a seat — stake {stake} coins
      </GameBtn>
      {hint && <div style={{ marginTop: 10, fontSize: 12, color: C.gold, textAlign: 'center' }}>{hint}</div>}
      <div style={{ marginTop: 10, fontSize: 11, color: C.muted, textAlign: 'center' }}>No free plays — every round is staked. Leaving mid-round forfeits your stake.</div>
    </div>
  );

  const seatEl = (seat) => {
    const isTurn = S && !S.winner && S.turn === seat;
    const revealed = S && S.winner && S.winner.seat === seat;
    const hand = (S && S.hands[seat]) || [];
    return (
      <div key={seat} style={{ position: 'absolute', ...SEAT_POS[seat], transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          background: 'rgba(10,8,22,.5)', borderRadius: 10, padding: '5px 9px', minWidth: 76,
          outline: isTurn ? `2px solid ${C.gold}` : 'none',
          boxShadow: isTurn ? `0 0 12px ${C.gold}55` : 'none',
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: C.text }}>
            {botName(seat)} <span style={{ fontSize: 9, fontWeight: 600, color: C.muted }}>bot</span>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {hand.map((card, i) => <CardFace key={i} card={card} w={17} hidden={!revealed} />)}
          </div>
        </div>
      </div>
    );
  };

  const tableScreen = (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: C.sub, marginBottom: 8 }}>
        <span>Stake <b style={{ color: C.text }}>{S ? S.stake : stake}</b> · Pot <b style={{ color: C.gold }}>{(S ? S.stake : stake) * 4}</b></span>
        <span style={{ color: sessionNet >= 0 ? C.green : C.red, fontWeight: 800 }}>{sessionNet >= 0 ? '+' : ''}{sessionNet} session</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><RewardIcon kind="coins" size={12} /><b style={{ color: C.text }}>{balance}</b></span>
      </div>

      <div style={{ position: 'relative', height: 250, borderRadius: '46% / 32%', background: 'radial-gradient(ellipse at center, #35305a 0%, #262143 70%, #1e1a36 100%)', border: '1px solid rgba(255,255,255,.09)', boxShadow: 'inset 0 0 46px rgba(0,0,0,.55)' }}>
        {[1, 2, 3].map(seatEl)}
        <div style={{ position: 'absolute', left: '50%', top: '62%', transform: 'translate(-50%, -50%)', display: 'flex', gap: 20, alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 1, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Deck · {S ? S.deck.length : 0}</div>
            <CardFace hidden w={44} tappable={canDraw} pulse={canDraw && !reduceMotion} onClick={canDraw ? playerDraw : undefined} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 1, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Discard</div>
            <CardFace card={topDiscard} w={44} hidden={!topDiscard}
              outline={claimable ? C.red : null}
              pulse={claimable && !reduceMotion}
              onClick={claimable ? () => claimFireRef.current && claimFireRef.current() : undefined} />
          </div>
        </div>
      </div>

      <div style={{ height: 3, borderRadius: 2, background: C.track, margin: '10px 2px 8px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(myTurn ? timerFrac : 0) * 100}%`, background: timerFrac < 0.25 ? C.red : C.gold, transition: 'width .25s linear' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', minHeight: 86, alignItems: 'flex-end' }}>
        {((S && S.hands[0]) || []).map((card, i) => (
          <CardFace key={i} card={card} w={56}
            tappable={canDiscard || !!swapSel}
            picked={!!swapSel && swapSel.includes(i)}
            onClick={() => { if (swapSel) toggleSwapCard(i); else if (canDiscard) playerDiscard(i); }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, minHeight: 44, flexWrap: 'wrap' }}>
        {claimable && <GameBtn full={false} variant="danger" onClick={() => claimFireRef.current && claimFireRef.current()} style={{ animation: reduceMotion ? 'none' : 'njukaPulse .8s infinite' }}>⚡ TAP TO WIN</GameBtn>}
        {haveWin && !swapSel && <GameBtn full={false} onClick={declareWin} style={{ animation: reduceMotion ? 'none' : 'njukaPulse .8s infinite' }}>🎉 Declare NJUKA</GameBtn>}
        {canOfferSwap && <GameBtn full={false} variant="ghost" onClick={() => { setSwapSel([]); setHint('Pick 2 cards forming a pair or run to throw'); }}>Swap a pair</GameBtn>}
        {swapSel && <GameBtn full={false} disabled={!swapValid} onClick={confirmSwap}>Throw &amp; draw</GameBtn>}
        {swapSel && <GameBtn full={false} variant="ghost" onClick={() => { setSwapSel(null); setHint('Tap a card to discard'); }}>Cancel</GameBtn>}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: C.sub, minHeight: 17, marginTop: 6 }}>{hint}</div>

      {banner && (
        <div style={{ position: 'absolute', inset: -8, background: 'rgba(10,8,20,.88)', borderRadius: 18, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: banner.kind === 'win' ? C.gold : C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>{banner.title}</div>
          {banner.cards.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {banner.cards.map((card, i) => <CardFace key={i} card={card} w={38} />)}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: C.sub }}>{banner.sub}</div>
          {nextIn != null && <div style={{ fontSize: 12, color: C.muted }}>Next round in {nextIn}s — stake {stake}</div>}
          <div style={{ display: 'flex', gap: 6 }}>
            {STAKES.map(s => (
              <OptionBtn key={s} selected={stake === s} disabled={balanceRef.current < s} onClick={() => setStake(s)} style={{ padding: '7px 10px', fontSize: 12.5 }}>{s}</OptionBtn>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <GameBtn full={false} onClick={() => startRound()}>Deal now</GameBtn>
            <GameBtn full={false} variant="ghost" onClick={leaveTable}>Leave table</GameBtn>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <GameShell title="🃏 Njuka Boss" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)} maxWidth={470}>
      <style>{`@keyframes njukaPulse { 50% { transform: scale(1.06); filter: brightness(1.15); } }`}</style>
      {screen === 'stake' ? stakeScreen : tableScreen}
      {showTutorial && <TutorialModal tutorialKey="njuka" onClose={() => setShowTutorial(false)} />}
    </GameShell>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: compiles clean (component is not yet reachable — wiring lands in Task 6).

- [ ] **Step 3: Commit**

```bash
git add components/games/NjukaGame.jsx
git commit -m "njuka: table component — stake screen, fair-bot round loop, claims, banner"
```

---

### Task 6: Platform wiring

**Files:**
- Modify: `components/GamificationPlatform.jsx` (import block ~line 47, `playGame` ~line 1202, game overlays after the `stopclock` block ~line 1380)

- [ ] **Step 1: Add the import**

Next to the other game imports (around line 47):

```js
import NjukaGame from './games/NjukaGame';
```

- [ ] **Step 2: Add the stakeOnly branch to `playGame`**

In `playGame`, directly after the availability check (`if (!activeGames.some(...)) { ...; return; }`), insert:

```js
    // Stake-per-round games (njuka): entry is free — no daily play consumed,
    // no extra-play charge. Every round is paid inside the game via onSpend.
    if (activeGames.find(g => g.id === gameId)?.stakeOnly) { setActiveGame(gameId); return; }
```

- [ ] **Step 3: Add the overlay**

In `gameOverlays`, after the `{activeGame === 'stopclock' && (...)}` block, add:

```jsx
      {activeGame === 'njuka' && (
        <NjukaGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          balance={user.kwacha}
          onSpend={(n) => addCoins(-n)}
          onRefund={(n) => { addCoins(n); showNotif(`Round void — ${n} Coins returned`); }}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif(`🎉 +${meta?.net ?? n} Coins!`);
            triggerReward('big', null, { coins: meta?.net ?? n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'njuka']));
            trackMission('gamePlayed', { gameId: 'njuka', coinsWon: meta?.net ?? n, gamesSet: gamesPlayedToday });
          }}
        />
      )}
```

(`onWin` receives the full pot credit — stake back + profit — so `addCoins(n)` restores the stake and adds the winnings; the toast/reward show the net profit from `meta.net`. `triggerReward('big', …)` per spec: pot wins are the top celebration tier.)

- [ ] **Step 4: Verify build + tests**

Run: `npm test && npm run build`
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add components/GamificationPlatform.jsx
git commit -m "njuka: wire into platform — stakeOnly launch, overlay, big-win rewards"
```

---

### Task 7: End-to-end verification in the browser

**Files:** none created — this task drives the running app and fixes anything it surfaces.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background). Open `http://localhost:3000` with the chrome-devtools MCP browser.

- [ ] **Step 2: Verify the checklist**

1. **Play tab** shows the Njuka Boss card with the gold `STAKES` badge and `5–50` coin footer; card is clickable.
2. Opening it does **not** decrement any free-play counter (check the Play nav badge before/after).
3. Stake screen: tiers render, unaffordable tiers disabled, balance shown. Pick 10 → **Take a seat** deducts exactly 10 from the header balance.
4. Round plays: bots take visible turns, deck count falls, your draw → tap a card to discard works, turn timer bar runs.
5. Let the timer expire once: the game draws/discards for you ("Time up — played for you"), no forfeit.
6. Win a round (persist — or temporarily set `STAKES = [5]` locally NEVER committed): banner + `+30 coins` toast + big reward animation + header balance up by stake+profit.
7. Lose a round: stake gone, banner names the bot, session net goes negative.
8. Claim moment: when a discard completes your hand the pile glows red and TAP TO WIN fires an instant win.
9. Help button opens the Njuka tutorial; close works; widget red-X unaffected.
10. Console: no errors or React warnings.

- [ ] **Step 3: Fix anything found, re-run `npm test && npm run build`, commit fixes**

```bash
git add -A
git commit -m "njuka: e2e fixes from browser verification"
```

(Skip the commit if nothing needed fixing.)

---

### Task 8: Ship

- [ ] **Step 1: Push and deploy** (per the standing auto-deploy policy — pre-production)

```bash
git push && vercel --prod
```

Expected: deploy succeeds; smoke-check the production URL (`https://100xbet-gamification.vercel.app`) — Njuka card visible on the Play tab and a round starts.

- [ ] **Step 2: Update memory**

Add a `project_njuka_game.md` memory noting: game shipped, fair-bot architecture (engine/bot module split, seen-counter contract), stakeOnly economy flag, and anything learned during E2E.
