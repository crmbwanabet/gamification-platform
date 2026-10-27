// Road Crossing engine — pure, no React (design: tower/project/Cross.dc.html,
// owner-approved 2026-10-27). The villager carries his chicken across the 8
// lanes of Great East Road to the market. Stake-only: the stake is charged when
// the round starts; after each lane he may CASH OUT or step on (GO); a car on
// a lane = the stake is lost; reaching the market (lane 8) cashes out at once.
//
// Multipliers (from the design): after k lanes, on difficulty p (the nominal
// chance a lane is safe: EASY 0.9 · MEDIUM 0.8 · HARD 0.6),
//   mult(k) = rtp / p^k, rounded half up to 2 decimals      (k = 1..8)
// e.g. RTP 98%: EASY 1.09 … 2.28, MEDIUM 1.23 … 5.84, HARD 1.63 … 58.35.
// A cash-out after k lanes PAYS payoutFor(stake, mult(k)) = stake × mult(k)
// rounded UP to the next whole coin (roundUp, owner 2026-10-26).
//
// Odds follow the platform rule (as lib/pick6/engine.mjs): they come from the
// OLD half-up payout, H(k) = roundHalfUp(stake, mult(k)), so the chance to have
// crossed k lanes safely is
//   S(0) = 1,  S(k) = rtp × stake / H(k)
// and lane k on its own is safe with q(k) = S(k) / S(k-1) (≤ 1, because H(k)
// never falls as k grows; = 1 when H(k) = H(k-1), i.e. no car can come).
// Expected return of "cash out after lane k" (any k, stake, difficulty):
//   E(k) = S(k) × payoutFor(stake, mult(k)) = rtp × stake × roundUp / roundHalfUp
// which is EXACTLY rtp × stake whenever rounding up and half up agree (stake ×
// mult a whole number, or a fraction of .5 or more) and above it otherwise.
// Stakes 10/25/50 sit at or a little above the RTP; stake 1 well above it
// (e.g. EASY lane 1: H = 1 coin, pays 2 → 196%). Because q(k) depends on the
// stake, the per-lane car chance shown to the player comes from carChance(),
// never from the nominal p. Every safe/hit draw comes from crypto.getRandomValues
// at the moment of play (rng injectable for tests; client-authoritative trust
// boundary like the other candy games).
// NOTE: when wiring, STAKES are mirrored by stakeRange '1–50' in
// lib/data/platform.js and the tutorial lines in lib/data/tutorials.js.

import { RTP_DEFAULT, clampRtp, roundUp, roundHalfUp } from '../rtp.mjs';

export { clampRtp };
export const STAKES = [1, 10, 25, 50];
export const DEFAULT_STAKE = 10;
export const LANES = 8;
export const DIFFICULTY = Object.freeze({ easy: 0.9, medium: 0.8, hard: 0.6 });
export const DIFFS = ['easy', 'medium', 'hard'];
export const DEFAULT_DIFF = 'medium';

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`crossing: invalid stake ${String(stake)}`);
  }
}
function assertDiff(diff) {
  if (!Object.prototype.hasOwnProperty.call(DIFFICULTY, diff)) {
    throw new Error(`crossing: invalid difficulty ${String(diff)}`);
  }
}
function assertLane(k, min = 1) {
  if (!Number.isInteger(k) || k < min || k > LANES) {
    throw new Error(`crossing: invalid lane ${String(k)}`);
  }
}

// mult(k) = rtp / p^k, half up to 2 decimals (k = 1..8).
export function multiplier(diff, k, rtp = RTP_DEFAULT) {
  assertDiff(diff);
  assertLane(k);
  const r = clampRtp(rtp);
  // + 1e-9: no float traps (0.98 / 0.8 = 1.2249999… in floats, 1.225 → 1.23)
  return Math.round((r / DIFFICULTY[diff] ** k) * 100 + 1e-9) / 100;
}

export function multTable(diff, rtp = RTP_DEFAULT) {
  return Array.from({ length: LANES }, (_, i) => multiplier(diff, i + 1, rtp));
}

// What a cash-out after k lanes pays (rounded UP to whole coins).
export function payoutFor(stake, diff, k, rtp = RTP_DEFAULT) {
  assertStake(stake);
  return roundUp(stake, multiplier(diff, k, rtp));
}

// S(k): the chance to have crossed k lanes safely.
export function survival(stake, diff, k, rtp = RTP_DEFAULT) {
  assertStake(stake);
  assertDiff(diff);
  assertLane(k, 0);
  if (k === 0) return 1;
  return Math.min(1, (clampRtp(rtp) * stake) / roundHalfUp(stake, multiplier(diff, k, rtp)));
}

// q(k): the chance lane k is safe once he stands before it.
export function laneSafeChance(stake, diff, k, rtp = RTP_DEFAULT) {
  assertLane(k);
  return Math.min(1, survival(stake, diff, k, rtp) / survival(stake, diff, k - 1, rtp));
}

// The car chance shown for the next lane (0..1).
export function carChance(stake, diff, k, rtp = RTP_DEFAULT) {
  return Math.max(0, 1 - laneSafeChance(stake, diff, k, rtp));
}

// E(k): expected coins back for "cash out after lane k".
export function expectedReturn(stake, diff, k, rtp = RTP_DEFAULT) {
  return survival(stake, diff, k, rtp) * payoutFor(stake, diff, k, rtp);
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

// Step onto lane k (he has crossed k-1). Returns the outcome; when he reaches
// the market (k = 8, safe) `done` is true and `payout` is what the auto cash-out pays.
export function stepLane(stake, diff, k, rng = defaultRng, rtp = RTP_DEFAULT) {
  const safe = rng() < laneSafeChance(stake, diff, k, rtp);
  const mult = multiplier(diff, k, rtp);
  const done = !safe || k === LANES;
  return { lane: k, safe, mult, done, payout: safe && k === LANES ? payoutFor(stake, diff, k, rtp) : 0 };
}
