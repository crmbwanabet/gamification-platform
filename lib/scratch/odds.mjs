// Scratch Card odds — pure, no React (spec: docs/superpowers/specs/2026-10-07-scratch-card-design.md).
// The whole card is decided on the device at BUY CARD (same client-authoritative
// trust boundary as the rest of the platform); tapping the panels only reveals
// it. Three matching symbols pay that symbol's multiplier; anything else loses
// the stake. rng is injectable so tests (and nothing else) can force outcomes.
//
// A win pays stake × mult rounded half up (lib/rtp). The base probabilities `p`
// set the SHAPE of the prize ladder (sum p × mult = 0.95); at each stake they
// are rescaled from the ACTUAL rounded payouts so the return is exactly the
// configured RTP (winProbs): p'ᵢ = pᵢ × rtp / E(stake), E = Σ pᵢ·payoutᵢ / stake.
// The rest of the cards (≈ 49–52%) lose. E.g. RTP 98% at stake 10 → p' = p × 1.0316.
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.

import { RTP_DEFAULT, clampRtp, roundHalfUp } from '../rtp.mjs';

export const STAKES = [1, 10, 25, 50];
export const DEFAULT_STAKE = 10;
export const MAX_WIN = 200;

// Ordered low → high. `p` = base chance a card is a 3-of-a-kind of this symbol
// (rescaled per stake + RTP by winProbs).
export const SYMBOLS = [
  { id: 'maize',   name: 'Maize cob',          mult: 1.2, p: 0.15 },
  { id: 'mango',   name: 'Mango',              mult: 1.5, p: 0.12 },
  { id: 'bream',   name: 'Bream fish',         mult: 2,   p: 0.08 },
  { id: 'drum',    name: 'Drum',               mult: 2.5, p: 0.06 },
  { id: 'feather', name: 'Fish-eagle feather', mult: 3,   p: 0.05 },
  { id: 'crown',   name: 'Gold crown',         mult: 4,   p: 0.0325 },
];
export const SYMBOL_IDS = SYMBOLS.map(s => s.id);
export const TOP_MULT = Math.max(...SYMBOLS.map(s => s.mult));

// Share of LOSING cards dealt as a near miss (exactly two matching).
export const NEAR_MISS_SHARE = 0.42;

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`scratch: invalid stake ${String(stake)}`);
  }
}

export function payoutFor(stake, mult) {
  assertStake(stake);
  return roundHalfUp(stake, mult);
}

// Per-symbol win chances at this stake + RTP (same order as SYMBOLS).
export function winProbs(stake, rtp = RTP_DEFAULT) {
  assertStake(stake);
  const e = SYMBOLS.reduce((a, s) => a + s.p * payoutFor(stake, s.mult), 0) / stake;
  const k = clampRtp(rtp) / e;
  return SYMBOLS.map(s => s.p * k);
}

// Exact return (payout / stake) at this stake + RTP.
export function rtpFor(stake, rtp = RTP_DEFAULT) {
  const p = winProbs(stake, rtp);
  return SYMBOLS.reduce((a, s, i) => a + p[i] * payoutFor(stake, s.mult), 0) / stake;
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

const pickIndex = (u, n) => Math.min(n - 1, Math.max(0, Math.floor(u * n)));

// rng draw order (tests rely on it):
//   u0 outcome · loss: u1 near-miss? · near miss: u2 pair symbol, u3 odd symbol,
//   u4 odd position · otherwise: u2..u4 three distinct symbols (partial shuffle).
export function resolveCard(stake, rng = defaultRng, rtp = RTP_DEFAULT) {
  const probs = winProbs(stake, rtp);
  const u = rng();
  let cum = 0;
  for (let i = 0; i < SYMBOLS.length; i++) {
    const s = SYMBOLS[i];
    cum += probs[i];
    if (u < cum) {
      return { win: true, symbol: s.id, mult: s.mult, payout: payoutFor(stake, s.mult), panels: [s.id, s.id, s.id], nearMiss: false };
    }
  }
  const n = SYMBOL_IDS.length;
  let panels;
  const nearMiss = rng() < NEAR_MISS_SHARE;
  if (nearMiss) {
    const pair = pickIndex(rng(), n);
    const others = SYMBOL_IDS.filter((_, i) => i !== pair);
    const odd = others[pickIndex(rng(), n - 1)];
    const at = pickIndex(rng(), 3);
    panels = [0, 1, 2].map(i => (i === at ? odd : SYMBOL_IDS[pair]));
  } else {
    const pool = SYMBOL_IDS.slice();
    panels = [];
    for (let k = 0; k < 3; k++) panels.push(pool.splice(pickIndex(rng(), pool.length), 1)[0]);
  }
  return { win: false, symbol: null, mult: 0, payout: 0, panels, nearMiss };
}
