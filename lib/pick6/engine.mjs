// Pick-a-spot engine — shared by the "pick one of N multipliers" games
// (Penalty Crash, Chicken Catch, Lucky Minibus). Pure, no React.
// A win pays payoutFor(stake, mult) = stake × mult, odds from the half-up payout
// (since 2026-10-26 the PAID amount rounds UP, roundUp; the odds below still use the half-up payout, so stake 1 returns above the RTP);
// a loss forfeits the stake. The win chance is derived from that ACTUAL
// rounded payout, so the return is exactly the configured RTP at every stake:
//   winChance = rtp × stake / payout      (EV = winChance × payout = rtp × stake)
// e.g. 1.5x at stake 1 pays 2 → 49% at RTP 98% (not 0.98 / 1.5 = 65%, which
// would return 131%). The result is decided on the device at the moment of
// play (same client-authoritative trust boundary as the rest of the platform).
// rng is injectable for tests.
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.

import { RTP_DEFAULT, clampRtp, roundUp, roundHalfUp } from '../rtp.mjs';

export const STAKES = [1, 10, 25, 50];
export const DEFAULT_STAKE = 10;

function assertStake(stake, stakes) {
  if (typeof stake !== 'number' || !stakes.includes(stake)) {
    throw new Error(`pick6: invalid stake ${String(stake)}`);
  }
}

function assertMult(mult) {
  if (typeof mult !== 'number' || !Number.isFinite(mult) || !(mult > 1)) {
    throw new Error(`pick6: invalid multiplier ${String(mult)}`);
  }
}

export function payoutFor(stake, mult, stakes = STAKES) {
  assertStake(stake, stakes);
  assertMult(mult);
  return roundUp(stake, mult);
}

// Odds keep using the OLD half-up payout (owner 2026-10-26: players win as
// often as before; the win then pays the rounded-UP amount, so a stake-1
// return can sit above the RTP). Only stake 1 differs today.
export function winChance(stake, mult, rtp = RTP_DEFAULT, stakes = STAKES) {
  payoutFor(stake, mult, stakes); // validates
  return Math.min(1, (clampRtp(rtp) * stake) / roundHalfUp(stake, mult));
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function resolvePick(stake, mult, rng = defaultRng, rtp = RTP_DEFAULT, stakes = STAKES) {
  const payout = payoutFor(stake, mult, stakes);
  const win = rng() < winChance(stake, mult, rtp, stakes);
  return { win, payout: win ? payout : 0 };
}
