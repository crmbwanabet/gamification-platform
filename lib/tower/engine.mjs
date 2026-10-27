// Tower Build — engine. Pure, no React (node --test).
//
// The crane drops one floor at a time onto the house. Each floor holds or the
// house falls; after every floor that holds the player can CASH OUT or build
// the next one. 15 floors, the 15th is the roof (auto-collects the top prize).
// A fall loses the stake.
//
// Money maths (exactly fair, like Chicken Catch 2's crash curve):
//   HOLD = the design's nominal hold chances, 0.9 ×5, 0.85 ×5, 0.8 ×4, 0.75.
//   MULT_k = rtp / (HOLD_1 × … × HOLD_k), half-up to 2 decimals — the
//            multiplier shown on the ladder after k floors (stake-independent).
//   reach(k) = rtp / MULT_k — the REAL chance that floors 1..k all hold, so the
//            real hold chance of floor k is reach(k) / reach(k−1)
//            (reach(0) = 1; floor 1 holds with rtp / MULT_1). These sit within
//            ±0.5% of HOLD (the 2-decimal rounding of the multiplier).
//   payout(k) = roundUp(stake × MULT_k) — whole coins, any fraction rounds UP.
//   Expected return of cashing out at floor k:
//            reach(k) × payout(k) = rtp × payout(k) / MULT_k  ≥  rtp × stake,
//            EQUAL to rtp × stake whenever stake × MULT_k is a whole number
//            (roundUp changes nothing), above it otherwise (stake 1 mostly).
// Outcomes come from crypto.getRandomValues (the rng is injectable for tests).
// The result is decided on the device at the moment of the drop (same
// client-authoritative trust boundary as the rest of the platform).
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial lines in lib/data/tutorials.js — change all three together.

import { RTP_DEFAULT, clampRtp, roundUp, roundHalfUp } from '../rtp.mjs';

export { RTP_DEFAULT, clampRtp };
export const STAKES = [1, 10, 25, 50];
export const DEFAULT_STAKE = 10;
export const HOLD = Object.freeze([0.9, 0.9, 0.9, 0.9, 0.9, 0.85, 0.85, 0.85, 0.85, 0.85, 0.8, 0.8, 0.8, 0.8, 0.75]);
export const MAX_FLOORS = HOLD.length; // 15, the last one is the roof

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`tower: invalid stake ${String(stake)}`);
  }
}
function assertFloor(k) {
  if (!Number.isInteger(k) || k < 1 || k > MAX_FLOORS) {
    throw new Error(`tower: invalid floor ${String(k)}`);
  }
}

// The multiplier table for this RTP: index k−1 = MULT_k (2 decimals).
const tables = new Map();
export function multTable(rtp = RTP_DEFAULT) {
  const r = clampRtp(rtp);
  if (tables.has(r)) return tables.get(r);
  const out = [];
  let s = 1;
  for (const h of HOLD) {
    s *= h;
    // roundHalfUp(100, x) = 100 × x half-up in whole hundredths; guard float
    // fuzz (0.98 / 0.9 = 1.0888… is safe, but keep it explicit).
    out.push(Math.floor((r / s) * 100 + 0.5 + 1e-9) / 100);
  }
  const t = Object.freeze(out);
  tables.set(r, t);
  return t;
}

// The multiplier after k floors (k = 0 → 0, nothing built yet).
export function multAt(k, rtp = RTP_DEFAULT) {
  if (k === 0) return 0;
  assertFloor(k);
  return multTable(rtp)[k - 1];
}

// Whole-coin payout for cashing out with k floors built.
export function payoutFor(stake, k, rtp = RTP_DEFAULT) {
  assertStake(stake);
  if (k === 0) return 0;
  return roundUp(stake, multAt(k, rtp));
}

// The old half-up payout (reference only: the odds never use it).
export function halfUpPayout(stake, k, rtp = RTP_DEFAULT) {
  assertStake(stake);
  return roundHalfUp(stake, multAt(k, rtp));
}

// The real chance that floors 1..k all hold.
export function reachChance(k, rtp = RTP_DEFAULT) {
  if (k === 0) return 1;
  return clampRtp(rtp) / multAt(k, rtp);
}

// The real chance that floor k holds, given floors 1..k−1 stand.
export function holdChance(k, rtp = RTP_DEFAULT) {
  assertFloor(k);
  return reachChance(k, rtp) / reachChance(k - 1, rtp);
}

// Expected return (coins) of a round that cashes out at floor k.
export function expectedReturn(stake, k, rtp = RTP_DEFAULT) {
  return reachChance(k, rtp) * payoutFor(stake, k, rtp);
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function cryptoRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

// Drop floor k (1..15) onto a house of k−1 floors: does it hold?
export function dropFloor(k, rtp = RTP_DEFAULT, rng = cryptoRng) {
  const p = holdChance(k, rtp);
  let u = rng();
  if (!(u >= 0 && u < 1)) u = 0.999999; // a broken rng never hands out a win
  return u < p;
}
