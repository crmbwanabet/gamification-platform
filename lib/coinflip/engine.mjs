// Coin Flip engine — pure, no React. The result is decided on the device at
// the moment of FLIP (same client-authoritative trust boundary as the rest of
// the platform). rng is injectable so tests can force each outcome.
//
// A win pays stake × 1.9 rounded half up (lib/rtp): 2 / 19 / 48 / 95. The win
// chance comes from that ACTUAL payout so the return is exactly the configured
// RTP at every stake: P(win) = rtp × stake / payout (stake 1 pays 2 → 49% at
// RTP 98%; stake 10 pays 19 → 51.6%). The face shown follows the result.
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.

import { RTP_DEFAULT, clampRtp, roundHalfUp } from '../rtp.mjs';

export const STAKES = [1, 10, 25, 50];
export const DEFAULT_STAKE = 10;
export const MULT = 1.9;
export const FACES = ['HEADS', 'TAILS'];

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`coinflip: invalid stake ${String(stake)}`);
  }
}

export function payoutFor(stake) {
  assertStake(stake);
  return roundHalfUp(stake, MULT);
}

export function winChance(stake, rtp = RTP_DEFAULT) {
  return (clampRtp(rtp) * stake) / payoutFor(stake);
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function resolveFlip(stake, pick, rng = defaultRng, rtp = RTP_DEFAULT) {
  assertStake(stake);
  if (!FACES.includes(pick)) throw new Error(`coinflip: invalid pick ${String(pick)}`);
  const win = rng() < winChance(stake, rtp);
  const face = win ? pick : FACES.find(f => f !== pick);
  return { face, win, payout: win ? payoutFor(stake) : 0 };
}
