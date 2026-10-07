// Lucky Numbers engine + paytable — pure, no React.
// Pick 6 of 1–20; 6 numbers are drawn; matches pay from the table below.
// The draw is decided on the device at the moment of DRAW with the platform
// CSPRNG (same client-authoritative trust boundary as the rest of the
// platform). rng is injectable for tests.
//
// Probabilities are hypergeometric and FIXED: P(k) = C(6,k)·C(14,6−k) / C(20,6),
// i.e. 3003 / 12012 / 15015 / 7280 / 1365 / 84 / 1 out of 38760 for k = 0..6.
// So the RTP is steered by the prizes: a small whole-coin paytable PER STAKE
// (paytableFor), chosen so the return lands inside [97%, 99%] at every stake:
//   2 matches  = stake × 1.2 (half up)    3 matches = stake × 1.6 (half up)
//   5+ matches = stake × 10 (the top prize) where the band allows, else lower
//   4 matches  = the whole-coin prize whose RTP is closest to the configured one
// The top prize is lowered only when no 4-match prize fits the band (stake 1:
// 1 / 2 / 6 / 7 coins → 98.97% whatever the config says). Achieved RTP at the
// 98% default: stake 1 98.97% · 5 97.75% · 10 98.10% · 20 97.92% (tested).
// NOTE: STAKES are mirrored by stakeRange '1–20' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.

import { RTP_DEFAULT, RTP_MIN, RTP_MAX, clampRtp, roundHalfUp } from '../rtp.mjs';

export const POOL = 20;
export const PICKS = 6;
export const STAKES = [1, 5, 10, 20];
export const DEFAULT_STAKE = 5;
export const MAX_WIN = 200;
export const TOP_MULT = 10;

// Display tiers (the paytable strip): 5 and 6 share the top prize.
export const TIERS = [
  { label: '2', min: 2 },
  { label: '3', min: 3 },
  { label: '4', min: 4 },
  { label: '5+', min: 5 },
];

// Index into TIERS for a match count, or -1 when it pays nothing.
export function tierIndex(matches) {
  for (let i = TIERS.length - 1; i >= 0; i--) if (matches >= TIERS[i].min) return i;
  return -1;
}

function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

// Exact P(k matches), k = 0..6
export function probabilities() {
  const total = choose(POOL, PICKS);
  const out = [];
  for (let k = 0; k <= PICKS; k++) out.push((choose(PICKS, k) * choose(POOL - PICKS, PICKS - k)) / total);
  return out;
}

// Hypergeometric weights out of C(20, 6) = 38760 (exact integers).
const WAYS = [0, 1, 2, 3, 4, 5, 6].map(k => choose(PICKS, k) * choose(POOL - PICKS, PICKS - k));
const TOTAL = choose(POOL, PICKS);

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`numbers: invalid stake ${String(stake)}`);
  }
}

// Return (payout / stake) of a full paytable `pays` (index = matches).
export function rtpOf(stake, pays) {
  return pays.reduce((a, p, k) => a + WAYS[k] * p, 0) / (TOTAL * stake);
}

// The whole-coin paytable at this stake + RTP: { pays: [k=0..6], rtp }.
const cache = new Map();
export function paytableFor(stake, rtp = RTP_DEFAULT) {
  assertStake(stake);
  const target = clampRtp(rtp);
  const key = `${stake}:${target}`;
  if (cache.has(key)) return cache.get(key);
  const a2 = roundHalfUp(stake, 1.2), a3 = roundHalfUp(stake, 1.6);
  let best = null;
  for (let top = TOP_MULT * stake; top >= a3 && !best; top--) {
    for (let a4 = a3; a4 <= top; a4++) {
      const pays = [0, 0, a2, a3, a4, top, top];
      const r = rtpOf(stake, pays);
      if (r < RTP_MIN - 1e-12 || r > RTP_MAX + 1e-12) continue;
      if (!best || Math.abs(r - target) < Math.abs(best.rtp - target) - 1e-12) best = { pays, rtp: r };
    }
  }
  if (!best) throw new Error(`numbers: no paytable inside the RTP band at stake ${stake}`);
  cache.set(key, best);
  return best;
}

export function payoutFor(stake, matches, rtp = RTP_DEFAULT) {
  if (!Number.isInteger(matches) || matches < 0 || matches > PICKS) {
    throw new Error(`numbers: invalid match count ${String(matches)}`);
  }
  return paytableFor(stake, rtp).pays[matches];
}

// Coins per display tier at this stake + RTP (for the paytable strip).
export function tierPays(stake, rtp = RTP_DEFAULT) {
  const { pays } = paytableFor(stake, rtp);
  return TIERS.map(t => pays[t.min]);
}

export function validatePicks(picks) {
  if (!Array.isArray(picks) || picks.length !== PICKS) {
    throw new Error(`numbers: pick exactly ${PICKS} numbers`);
  }
  for (const n of picks) {
    if (!Number.isInteger(n) || n < 1 || n > POOL) throw new Error(`numbers: pick out of range ${String(n)}`);
  }
  if (new Set(picks).size !== PICKS) throw new Error('numbers: duplicate pick');
  return picks;
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

// Partial Fisher–Yates: 6 unique numbers from 1..POOL, in draw order.
export function drawNumbers(rng = defaultRng) {
  const a = Array.from({ length: POOL }, (_, i) => i + 1);
  for (let i = 0; i < PICKS; i++) {
    const j = i + Math.min(POOL - i - 1, Math.floor(rng() * (POOL - i)));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, PICKS);
}

export function countMatches(picks, drawn) {
  const set = new Set(picks);
  return drawn.reduce((n, d) => n + (set.has(d) ? 1 : 0), 0);
}

export function resolveDraw(stake, picks, rng = defaultRng, rtp = RTP_DEFAULT) {
  assertStake(stake);
  validatePicks(picks);
  const drawn = drawNumbers(rng);
  const matches = countMatches(picks, drawn);
  const payout = payoutFor(stake, matches, rtp);
  return { drawn, matches, win: payout > 0, payout };
}
