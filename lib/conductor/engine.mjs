// Bus Conductor 2 engine — a 5-stop pyramid ("tower") game. Pure, no React.
//
// The player is the conductor. 6 passengers (RIDERS) wait at each of 5 stops
// (Chilenje, Kabwata, Kamwala, Matero, Town). At stop k (1..5), k of the 6 have
// no money. The player calls ONE passenger: a payer moves the bus up a stop (the
// player may CASH OUT or carry on), a no-money passenger loses the stake. Paying
// at stop 5 (the bus is full) pays out automatically.
//
// Odds (fixed by the picture, never by the stake):
//   survival at stop k        s_k = (6 − k) / 6               5/6, 4/6, 3/6, 2/6, 1/6
//   chance to clear k stops   S_k = s_1 × … × s_k             5/6, 20/36, 60/216, 120/1296, 120/7776
//   multiplier after k stops  m_k = rtp / S_k                 ×1.18, ×1.76, ×3.53, ×10.58, ×63.50 at 98%
//                                                             (shown to 2 decimals, half up: shownMult)
// Payout (rounded UP to the next whole coin on any fraction, owner 2026-10-26),
// worked EXACTLY in integers from the unrounded multiplier (never from the
// 2-decimal label, which can sit a hair below m_k — e.g. 1.764 shows ×1.76):
//   payout(stake, k) = ceil(stake × rtp / S_k)
// Expected return for a player who always cashes out after stop k:
//   EV_k = S_k × payout(stake, k) = S_k × ceil(stake × rtp / S_k) ≥ rtp × stake,
// and EV_k = rtp × stake EXACTLY whenever stake × rtp / S_k is already a whole
// number (rounding changes nothing). Any mix of cash-out choices is a mix of
// these, so no strategy returns less than the RTP. The RTP is clamped to
// [97%, 99%] (lib/rtp.mjs) and taken to 4 decimals (0.01%) for the integer maths.
//
// Fairness: the no-money passengers at a stop are drawn when the player calls
// (resolveStop): a uniform shuffle of the 6 places, the first k are broke, so
// the called passenger pays with probability exactly (6 − k) / 6; the others are
// revealed after. Randomness comes from crypto.getRandomValues; rng is
// injectable for tests (a function returning a number in [0, 1)).
// NOTE: STAKES must match stakeRange '1–50' in lib/data/platform.js and the
// tutorial lines in lib/data/tutorials.js — change all three together.

import { RTP_DEFAULT, clampRtp } from '../rtp.mjs';

export { RTP_DEFAULT, clampRtp };
export const STAKES = [1, 10, 25, 50];
export const DEFAULT_STAKE = 10;
export const RIDERS = 6;
export const STOPS = 5;
export const STOP_NAMES = ['CHILENJE', 'KABWATA', 'KAMWALA', 'MATERO', 'TOWN'];

const RTP_SCALE = 10000; // RTP in hundredths of a percent

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`conductor: invalid stake ${String(stake)}`);
  }
}
function assertStop(k, min = 1) {
  if (!Number.isInteger(k) || k < min || k > STOPS) {
    throw new Error(`conductor: invalid stop ${String(k)}`);
  }
}

/** How many of the 6 passengers at stop k (1..5) have no money: k. */
export function brokeCount(k) {
  assertStop(k);
  return k;
}

/** Chance a called passenger at stop k pays, as a fraction { num, den }. */
export function survival(k) {
  assertStop(k);
  return { num: RIDERS - k, den: RIDERS };
}

/** Chance to clear stops 1..k, as an unreduced fraction { num, den } (k = 0 → 1/1). */
export function reachChance(k) {
  assertStop(k, 0);
  let num = 1, den = 1;
  for (let i = 1; i <= k; i++) { num *= RIDERS - i; den *= RIDERS; }
  return { num, den };
}

/** The RTP actually used: clamped, in units of 0.01% (9800 = 98%). */
export function rtpUnits(rtp = RTP_DEFAULT) {
  return Math.round(clampRtp(rtp) * RTP_SCALE);
}

/** The exact (unrounded) multiplier after k stops: rtp / S_k. */
export function multiplier(k, rtp = RTP_DEFAULT) {
  assertStop(k);
  const { num, den } = reachChance(k);
  return (rtpUnits(rtp) * den) / (RTP_SCALE * num);
}

/** The multiplier as shown: 2 decimals, half up (×1.18, ×1.76 …), integer maths. */
export function shownMult(k, rtp = RTP_DEFAULT) {
  assertStop(k);
  const { num, den } = reachChance(k);
  // m × 100 = r × den / (100 × num); half up = floor((2·r·den + 100·num) / (200·num))
  const m100 = Math.floor((2 * rtpUnits(rtp) * den + 100 * num) / (200 * num));
  return m100 / 100;
}

/** "×1.18" */
export function multText(k, rtp = RTP_DEFAULT) {
  return `×${shownMult(k, rtp).toFixed(2)}`;
}

/** Whole coins paid for cashing out after k stops: ceil(stake × rtp / S_k). */
export function payoutFor(stake, k, rtp = RTP_DEFAULT) {
  assertStake(stake);
  assertStop(k);
  const { num, den } = reachChance(k);
  const top = stake * rtpUnits(rtp) * den;   // ≤ 50 × 9900 × 7776 < 2^53
  const bottom = RTP_SCALE * num;
  return Math.floor((top + bottom - 1) / bottom);
}

/** Exact expected return of "cash out after k stops", as { num, den } coins. */
export function expectedReturn(stake, k, rtp = RTP_DEFAULT) {
  const { num, den } = reachChance(k);
  return { num: num * payoutFor(stake, k, rtp), den };
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}
function randInt(n, rng) {
  const v = Math.floor(rng() * n);
  return v >= 0 && v < n ? v : n - 1;
}

/**
 * The player calls passenger `pick` (0..5) at stop k (1..5). Draws which k of
 * the 6 have no money (uniform shuffle) and returns
 * { pays, broke } — broke = the no-money places, ascending.
 */
export function resolveStop(k, pick, rng = defaultRng) {
  assertStop(k);
  if (!Number.isInteger(pick) || pick < 0 || pick >= RIDERS) {
    throw new Error(`conductor: invalid passenger ${String(pick)}`);
  }
  const a = Array.from({ length: RIDERS }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1, rng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  const broke = a.slice(0, k).sort((x, y) => x - y);
  return { pays: !broke.includes(pick), broke };
}

/** Biggest possible win at a stake (the bus is full): payout after stop 5. */
export function maxWin(stake, rtp = RTP_DEFAULT) {
  return payoutFor(stake, STOPS, rtp);
}
