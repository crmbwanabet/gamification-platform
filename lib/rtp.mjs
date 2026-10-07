// Shared money maths for every candy game — pure, no imports (node --test).
//
// RTP (return to player) is configurable per game from the admin dashboard
// (`games.<id>.rtp` in platform_config, merged by lib/config/merge.mjs). Every
// value is validated and clamped to [RTP_MIN, RTP_MAX] = [97%, 99%]; anything
// that is not a finite number falls back to RTP_DEFAULT (98%).
//
// Rounding: a payout is stake × multiplier rounded HALF UP ("rounds up from .5,
// down from .4"). It is worked in integer hundredths so there are no float
// traps: 25 × 1.14 is 28.5 → 29, but in floats 25 * 1.14 === 28.499999999999996
// and Math.round would give 28 (likewise 25 × 2.3, 25 × 4.02 …).

export const RTP_DEFAULT = 0.98;
export const RTP_MIN = 0.97;
export const RTP_MAX = 0.99;

export function clampRtp(rtp) {
  if (typeof rtp !== 'number' || !Number.isFinite(rtp)) return RTP_DEFAULT;
  return Math.min(RTP_MAX, Math.max(RTP_MIN, rtp));
}

// Whole-coin payout: stake × mult, half up. `stake` is a whole number of
// coins; `mult` has at most 2 decimals (1.2, 1.9, 2.37 …).
export function roundHalfUp(stake, mult) {
  const m100 = Math.round(mult * 100);
  return Math.floor((stake * m100 + 50) / 100);
}
