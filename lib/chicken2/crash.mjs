// Chicken Catch 2 — crash maths. Pure, no React (node --test).
// Spec: docs/superpowers/specs/2026-10-07-chicken-catch-2-design.md
//
// A cash-out at the shown multiplier x pays payoutFor(stake, x) = stake × x
// rounded half up (lib/rtp) and wins iff the crash point C ≥ x. The crash
// point is drawn at RUN, FOR THE CHOSEN STAKE, so that its survival matches
// the ACTUAL rounded payout:
//   P(C ≥ x) = RTP × stake / payoutFor(stake, x)   for every 2-decimal x in [1.01, 50]
// and every cash-out — manual, AUTO or the 50x auto-collect — returns the RTP.
// Because the payout only steps up when stake × x crosses a half coin, C lands
// on the last multiplier before a step. Stakes start at 100 coins, so every
// 0.01x is its own payout step and C can land on any 2-decimal multiplier
// (2026-10-23: the old stakes 1/5/10/20 piled C onto X.49 at stake 1, half
// the rounds crashing at 1.49x). C is never the previous round's crash point
// (drawCrash `prev`, owner rule 2026-10-23): a repeat is redrawn, and the base
// odds are solved so that the run of rounds still lands on exactly these
// odds (baseCdf; tests/chicken2-crash.test.mjs measures it). C = 1.00 (an
// instant crash, probability 1 − RTP / 1.01 ≈ 3%) beats every cash-out, because
// 1.00x is never a cash-out (the button opens at 1.01x). C = 50 means "the farmer
// reaches the max": the round auto-collects at 50x (probability RTP / 50), so
// the biggest win is 2,000 × 50 = 100,000 coins.
// The multiplier grows as m(t) = e^(K·t): 2x at 5.8 s, 10x at ~19.3 s, 50x at ~32.7 s.

import { RTP_DEFAULT, RTP_MIN, RTP_MAX, clampRtp, roundHalfUp } from '../rtp.mjs';

export { RTP_DEFAULT, RTP_MIN, RTP_MAX, clampRtp };
export const MAX_MULT = 50;
export const MIN_CASHOUT = 1.01;
export const STAKES = [100, 500, 1000, 2000];
export const DEFAULT_STAKE = 500;
export const K = Math.LN2 / 5.8;

function assertStake(stake) {
  if (!STAKES.includes(stake)) throw new Error(`chicken2: invalid stake ${String(stake)}`);
}

function cryptoRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

// Whole coins: stake × mult rounded half up, the multiplier capped at MAX_MULT
// and worked in hundredths (100 × 1.15 is 115, 500 × 2.37 is 1,185).
export function payoutFor(stake, mult) {
  assertStake(stake);
  return roundHalfUp(stake, Math.min(MAX_MULT, Math.max(1, +mult || 1)));
}

// P(C ≥ x) for a cash-out multiplier x in [1.01, 50] at this stake + RTP
// (one draw; the no-repeat redraw in drawCrash is not in this formula).
export function survival(stake, x, rtp = RTP_DEFAULT) {
  if (x < MIN_CASHOUT) return 1;
  if (x > MAX_MULT) return 0;
  return (clampRtp(rtp) * stake) / payoutFor(stake, x);
}

// The odds of each crash point (hundredths 100..5000) for this stake + RTP:
// target[i] = P(C = x) = S(x) − S(x + 0.01), S = survival, S(1.00) = 1.
function targetOdds(stake, r) {
  const n = MAX_MULT * 100 - 99, p = new Float64Array(n);
  let s = 1;
  for (let i = 0; i < n; i++) {
    const next = i + 1 < n ? survival(stake, (101 + i) / 100, r) : 0;
    p[i] = s - next;
    s = next;
  }
  return p;
}

// No repeats without losing the RTP: a repeat of the last crash point is drawn
// again, which on its own makes the common points (1.00 ≈ 3%, 50x ≈ 2%) rarer
// than their odds (an AUTO 50x would return ~96%). So each round draws from a
// BASE table b, solved so that the chain "draw from b, redraw a repeat"
// (move i → j with b[j] / (1 − b[i])) settles on exactly the target odds p:
// p[j] = b[j] · (T − p[j] / (1 − b[j])), T = Σ p[i] / (1 − b[i]).
const tables = new Map();
function baseCdf(stake, r) {
  const key = `${stake}:${r}`;
  if (tables.has(key)) return tables.get(key);
  const p = targetOdds(stake, r), n = p.length, b = Float64Array.from(p);
  for (let it = 0; it < 60; it++) {
    let T = 0;
    for (let i = 0; i < n; i++) T += p[i] / (1 - b[i]);
    let sum = 0;
    for (let i = 0; i < n; i++) { b[i] = p[i] / (T - p[i] / (1 - b[i])); sum += b[i]; }
    for (let i = 0; i < n; i++) b[i] /= sum;
  }
  const cdf = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += b[i]; cdf[i] = acc; }
  tables.set(key, cdf);
  return cdf;
}

// For the tests: the target odds and the base odds, index i = crash (100 + i) / 100.
export function crashOdds(stake, rtp = RTP_DEFAULT) {
  assertStake(stake);
  const r = clampRtp(rtp), cdf = baseCdf(stake, r);
  const base = cdf.map((c, i) => c - (i ? cdf[i - 1] : 0));
  return { target: targetOdds(stake, r), base };
}

// The crash point, a 2-decimal multiplier in [1.00, MAX_MULT], never equal to
// `prev` (the previous round's crash point; a repeat is drawn again).
export function drawCrash(stake, rtp = RTP_DEFAULT, rng = cryptoRng, prev = null) {
  assertStake(stake);
  const cdf = baseCdf(stake, clampRtp(rtp));
  let c = drawOnce(cdf, rng);
  for (let i = 0; c === prev && i < 100; i++) c = drawOnce(cdf, rng);
  return c;
}

// One draw from the base table: the first point whose cumulative odds pass u.
function drawOnce(cdf, rng) {
  let u = rng();
  if (!(u >= 0 && u < 1)) u = 0;
  let lo = 0, hi = cdf.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (u < cdf[mid]) hi = mid; else lo = mid + 1; }
  return (100 + lo) / 100;
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
