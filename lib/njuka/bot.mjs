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
