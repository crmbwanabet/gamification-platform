import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  connects, isWin, completions, label,
  buildDeck, shuffle, createRound, handRanks, drawCard, discardCard,
  advanceTurn, claimants, validSwapPair, swapPair, applySwap,
} from '../lib/njuka/engine.mjs';

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
