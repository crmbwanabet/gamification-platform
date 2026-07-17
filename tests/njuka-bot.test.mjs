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
  assert.equal(typeof d.index, 'number'); // fallback discard is always provided
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
