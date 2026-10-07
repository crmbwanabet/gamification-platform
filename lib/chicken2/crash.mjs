// Chicken Catch 2 — crash maths. Pure, no React (node --test).
// Spec: docs/superpowers/specs/2026-10-07-chicken-catch-2-design.md
//
// A cash-out at the shown multiplier x pays payoutFor(stake, x) = stake × x
// rounded half up (lib/rtp) and wins iff the crash point C ≥ x. The crash
// point is drawn at RUN, FOR THE CHOSEN STAKE, so that its survival matches
// the ACTUAL rounded payout:
//   P(C ≥ x) = RTP × stake / payoutFor(stake, x)   for every 2-decimal x in [1.01, 10]
// and every cash-out — manual, AUTO or the 10x auto-collect — returns exactly
// RTP. (With the old continuous P(C ≥ x) = RTP / x, half-up rounding would
// pay 2 coins for a 1.50x cash-out at stake 1 at a 65% chance: 131%.)
// Because the payout only steps up when stake × x crosses a half coin, C lands
// on the last multiplier before a step: X.49 at stake 1, …09/…29 at 5, …04/…14
// at 10, …02/…07 at 20. C = 1.00 (an instant crash, probability exactly
// 1 − RTP) beats every cash-out, because 1.00x is never a cash-out (the button
// opens at 1.01x). C = 10 means "the farmer reaches the max": the round
// auto-collects at 10x (probability RTP / 10).
// The multiplier grows as m(t) = e^(K·t): 2x at 5.8 s, 10x at ~19.3 s.

import { RTP_DEFAULT, RTP_MIN, RTP_MAX, clampRtp, roundHalfUp } from '../rtp.mjs';

export { RTP_DEFAULT, RTP_MIN, RTP_MAX, clampRtp };
export const MAX_MULT = 10;
export const MIN_CASHOUT = 1.01;
export const STAKES = [1, 5, 10, 20];
export const DEFAULT_STAKE = 5;
export const K = Math.LN2 / 5.8;

function assertStake(stake) {
  if (!STAKES.includes(stake)) throw new Error(`chicken2: invalid stake ${String(stake)}`);
}

function cryptoRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

// Whole coins: stake × mult rounded half up, the multiplier capped at MAX_MULT
// and worked in hundredths (20 × 1.15 is 23, 5 × 1.10 is 5.5 → 6).
export function payoutFor(stake, mult) {
  assertStake(stake);
  return roundHalfUp(stake, Math.min(MAX_MULT, Math.max(1, +mult || 1)));
}

// P(C ≥ x) for a cash-out multiplier x in [1.01, 10] at this stake + RTP.
export function survival(stake, x, rtp = RTP_DEFAULT) {
  if (x < MIN_CASHOUT) return 1;
  if (x > MAX_MULT) return 0;
  return (clampRtp(rtp) * stake) / payoutFor(stake, x);
}

// The crash point, a 2-decimal multiplier in [1.00, MAX_MULT].
// u → the biggest payout P the round can still reach (P(P ≥ Q) = RTP·stake/Q),
// → the last 2-decimal multiplier that pays at most P (integer maths).
export function drawCrash(stake, rtp = RTP_DEFAULT, rng = cryptoRng) {
  assertStake(stake);
  const r = clampRtp(rtp);
  let u = rng();
  if (!(u >= 0 && u < 1)) u = 0;
  if (u === 0) return MAX_MULT;
  const reach = Math.ceil((r * stake) / u) - 1;           // biggest reachable payout
  if (reach < stake) return 1;                              // u ≥ RTP: instant crash
  const c100 = Math.floor((100 * reach + 49) / stake);     // last x with stake·x < reach + ½
  return Math.min(MAX_MULT * 100, c100) / 100;
}

// A cash-out at the shown multiplier x wins iff the hen is still running at x.
export function cashOutWins(x, crash) {
  return x >= MIN_CASHOUT && x <= crash;
}

// The growth curve and its inverse (seconds since RUN).
export const multAt = (t) => Math.exp(K * Math.max(0, t));
export const timeFor = (x) => Math.log(Math.max(1, x)) / K;

// The multiplier on screen at time t: hundredths, floored, never past the
// crash point (the counter freezes there when he falls).
export function shownAt(t, crash = MAX_MULT) {
  const m = Math.floor(multAt(t) * 100 + 1e-7) / 100;
  return Math.min(m, crash, MAX_MULT);
}

// When the run ends: the farmer falls the moment the counter would pass C
// (so C itself is shown — "Fell at 2.37×"); at the ceiling he auto-collects
// the moment the counter reaches 10.00.
export function endTime(crash) {
  return crash >= MAX_MULT ? timeFor(MAX_MULT) : timeFor(crash + 0.01);
}

// Closing the game mid-run settles the round as if CASH OUT were tapped at
// that moment: if he hasn't fallen yet, it pays the multiplier on screen —
// 1.00x (before the first cash-out step) pays the stake back, unless the
// round is an instant crash (C = 1.00), which is a loss. Once he has fallen
// it's a loss; past the 10x mark it's the max win.
export function settleOnClose(t, crash) {
  if (crash >= MAX_MULT && t >= timeFor(MAX_MULT)) return { win: true, mult: MAX_MULT };
  if (t >= endTime(crash)) return { win: false, mult: crash };
  const x = shownAt(t, crash);
  if (x >= MIN_CASHOUT) return { win: true, mult: x };
  return crash > 1 ? { win: true, mult: 1 } : { win: false, mult: 1 };
}
