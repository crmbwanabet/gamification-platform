// Chicken Catch 2 — crash maths. Pure, no React, no imports (node --test).
// Spec: docs/superpowers/specs/2026-10-07-chicken-catch-2-design.md
//
// The crash point C is drawn at RUN from the platform CSPRNG:
//   C = max(1.00, floor(100·RTP / (1 − U)) / 100), capped at MAX_MULT (10x)
// so for every 2-decimal x in [1.01, 10]: P(C ≥ x) = RTP / x exactly, and a
// cash-out at x (it wins iff C ≥ x) returns x · RTP / x = RTP. C = 1.00 (an
// instant crash, probability 1 − RTP) beats every cash-out, because 1.00x is
// never a cash-out (the button opens at 1.01x). C = 10 means "the farmer
// reaches the max": the round auto-collects at 10x.
// The multiplier grows as m(t) = e^(K·t): 2x at 5.8 s, 10x at ~19.3 s.

export const RTP_DEFAULT = 0.98;
export const RTP_MIN = 0.80;
export const RTP_MAX = 0.99;
export const MAX_MULT = 10;
export const MIN_CASHOUT = 1.01;
export const STAKES = [5, 10, 20];
export const K = Math.LN2 / 5.8;

// Remote-config RTP → a safe number. Anything that is not a finite number
// falls back to the default; numbers are clamped into [RTP_MIN, RTP_MAX].
export function clampRtp(rtp) {
  if (typeof rtp !== 'number' || !Number.isFinite(rtp)) return RTP_DEFAULT;
  return Math.min(RTP_MAX, Math.max(RTP_MIN, rtp));
}

function cryptoRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

// The crash point, a 2-decimal multiplier in [1.00, MAX_MULT].
export function drawCrash(rtp = RTP_DEFAULT, rng = cryptoRng) {
  const r = clampRtp(rtp);
  let u = rng();
  if (!(u >= 0 && u < 1)) u = 0;
  const c = Math.floor((100 * r) / (1 - u)) / 100;
  return Math.min(MAX_MULT, Math.max(1, c));
}

// A cash-out at the shown multiplier x wins iff the hen is still running at x.
export function cashOutWins(x, crash) {
  return x >= MIN_CASHOUT && x <= crash;
}

// Whole coins: floor(stake × mult), the multiplier capped at MAX_MULT and
// worked in hundredths so 20 × 1.15 is 23, not 22.
export function payoutFor(stake, mult) {
  if (!STAKES.includes(stake)) throw new Error(`chicken2: invalid stake ${String(stake)}`);
  const m100 = Math.round(Math.min(MAX_MULT, Math.max(1, +mult || 1)) * 100);
  return Math.floor((stake * m100) / 100);
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
