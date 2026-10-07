// Bottle Spin — the pay table and the spin. Pure, no React. The result is
// decided on the device at SPIN (same client-authoritative trust boundary as
// the rest of the platform); rng is injectable so tests can force a segment.
//
// 8 painted segments, listed clockwise from the top of the table (index 0 =
// 12 o'clock, 45° each). The segments are drawn the same size, but the WEIGHTS
// decide the odds: bigger prizes come up less often.
// A win pays stake × mult rounded half up (lib/rtp). The prize weights below
// are fixed; the three TRY AGAIN segments share a losing weight L that is
// solved PER STAKE from the actual rounded payouts so the return is exactly the
// configured RTP (weightsFor):
//   Σ w·payout / (stake · (W_win + L)) = rtp  →  L = Σ w·payout / (stake·rtp) − W_win
// At stake 10/50 (every payout whole) and RTP 98%: L ≈ 38.9 of ≈ 96.9, so
// TRY AGAIN ≈ 40%. Top prize 4x: 50 × 4 = 200 = the max-win cap.
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.

import { RTP_DEFAULT, clampRtp, roundHalfUp } from '../rtp.mjs';

export const STAKES = [1, 10, 25, 50];
export const DEFAULT_STAKE = 10;

// `weight` on a TRY AGAIN segment is unused (its share comes from weightsFor).
export const SEGMENTS = [
  { id: 'x1_5', mult: 1.5, weight: 14, label: '1.5x' },
  { id: 'try1', mult: 0, weight: 0, label: 'TRY AGAIN' },
  { id: 'x2', mult: 2, weight: 7, label: '2x' },
  { id: 'x1_2', mult: 1.2, weight: 30, label: '1.2x' },
  { id: 'x4', mult: 4, weight: 3, label: '4x' },
  { id: 'try2', mult: 0, weight: 0, label: 'TRY AGAIN' },
  { id: 'x3', mult: 3, weight: 4, label: '3x' },
  { id: 'try3', mult: 0, weight: 0, label: 'TRY AGAIN' },
];

export const MAX_MULT = Math.max(...SEGMENTS.map(s => s.mult));
const MULTS = new Set(SEGMENTS.map(s => s.mult));
const LOSE_COUNT = SEGMENTS.filter(s => s.mult === 0).length;
const WIN_WEIGHT = SEGMENTS.reduce((a, s) => a + (s.mult > 0 ? s.weight : 0), 0);

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`bottle: invalid stake ${String(stake)}`);
  }
}

export function payoutFor(stake, mult) {
  assertStake(stake);
  if (!MULTS.has(mult)) throw new Error(`bottle: invalid multiplier ${String(mult)}`);
  return mult > 0 ? roundHalfUp(stake, mult) : 0;
}

// Per-segment weights at this stake + RTP (prize weights fixed, TRY AGAIN solved).
export function weightsFor(stake, rtp = RTP_DEFAULT) {
  assertStake(stake);
  const r = clampRtp(rtp);
  const paid = SEGMENTS.reduce((a, s) => a + (s.mult > 0 ? s.weight * payoutFor(stake, s.mult) : 0), 0);
  const lose = paid / (stake * r) - WIN_WEIGHT;
  return SEGMENTS.map(s => (s.mult > 0 ? s.weight : lose / LOSE_COUNT));
}

// Exact return (payout / stake) at this stake + RTP, from the weights.
export function rtpFor(stake, rtp = RTP_DEFAULT) {
  const w = weightsFor(stake, rtp);
  const total = w.reduce((a, x) => a + x, 0);
  return SEGMENTS.reduce((a, s, i) => a + w[i] * payoutFor(stake, s.mult), 0) / (stake * total);
}

// Chance of each segment at this stake + RTP (sums to 1).
export function chancesFor(stake, rtp = RTP_DEFAULT) {
  const w = weightsFor(stake, rtp);
  const total = w.reduce((a, x) => a + x, 0);
  return w.map(x => x / total);
}

// r in [0, 1) → segment index, walking the cumulative weights.
export function segmentFor(r, weights = weightsFor(DEFAULT_STAKE)) {
  if (typeof r !== 'number' || !(r >= 0 && r < 1)) throw new Error(`bottle: rng out of range ${String(r)}`);
  const total = weights.reduce((a, x) => a + x, 0);
  let x = r * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x < 0) return i;
  }
  return weights.length - 1; // float guard; unreachable for r < 1
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function resolveSpin(stake, rng = defaultRng, rtp = RTP_DEFAULT) {
  const index = segmentFor(rng(), weightsFor(stake, rtp));
  const { mult } = SEGMENTS[index];
  const win = mult > 0;
  return { index, mult, win, payout: win ? payoutFor(stake, mult) : 0 };
}
