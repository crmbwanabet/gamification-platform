// Speed Trap — a crash game with the SAME maths as Chicken Catch 2.
// Pure, no React (node --test). Every number that matters (crash curve
// P(C ≥ x) = RTP / x, never the same crash point twice in a row, payout =
// stake × x rounded UP to whole coins, stakes 1/5/10/20, 5,000× cap, the
// e^(K·t) growth, settle-on-close) comes from lib/chicken2/crash.mjs and is
// only re-exported here; this file adds the Speed Trap round result and the
// display helpers (×N text, speed gauge, history chip colours).

import {
  RTP_DEFAULT, RTP_MIN, RTP_MAX, clampRtp, MAX_MULT, MIN_CASHOUT, STAKES, DEFAULT_STAKE,
  drawCrash, payoutFor, survival, cashOutWins, multAt, timeFor, shownAt, endTime, settleOnClose,
} from '../chicken2/crash.mjs';

export {
  RTP_DEFAULT, RTP_MIN, RTP_MAX, clampRtp, MAX_MULT, MIN_CASHOUT, STAKES, DEFAULT_STAKE,
  drawCrash, payoutFor, survival, cashOutWins, multAt, timeFor, shownAt, endTime, settleOnClose,
};

// A CASH OUT tap t seconds into the drive, when the police stop the bus at
// `crash`. Too late (the counter has passed C) = caught; before 1.01× = no
// cash-out yet (the button is still closed); otherwise a win at the shown
// multiplier, paid like Chicken Catch 2.
export function cashOutAt(stake, t, crash) {
  if (t >= endTime(crash)) return { state: 'caught', win: false, mult: crash, payout: 0 };
  const mult = shownAt(t, crash);
  if (mult < MIN_CASHOUT) return { state: 'early', win: false, mult, payout: 0 };
  return { state: 'won', win: cashOutWins(mult, crash), mult, payout: payoutFor(stake, mult) };
}

// "×2.35" below 100×, "×1,250" from there (the design's format).
export function fmtMult(m) {
  const v = Math.max(1, +m || 1);
  return v < 100 ? `×${v.toFixed(2)}` : `×${Math.floor(v).toLocaleString('en-US')}`;
}

// The speed gauge: 0 km/h parked, 38 km/h at 1.00×, +42 km/h per doubling.
export function kmhFor(m, parked = false) {
  if (parked) return 0;
  return Math.round(38 + 42 * Math.log2(Math.max(1, +m || 1)));
}

// Needle angle in degrees: -90 (left) at 1×, +90 (right, red zone) at 32× and up.
export function needleFor(m, parked = false) {
  if (parked) return -90;
  return Math.max(-90, Math.min(90, -90 + (Math.log2(Math.max(1, +m || 1)) / 5) * 180));
}

// History chip colours: under 2× dark, 2–10× green, 10× and up gold.
export function histChip(c) {
  if (c >= 10) return { background: '#FFD21F', color: '#2A0A4F' };
  if (c >= 2) return { background: '#43C21A', color: '#FFFFFF' };
  return { background: 'rgba(0,0,0,.4)', color: '#FFFFFF' };
}
