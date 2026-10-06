// Lucky Numbers engine + paytable — pure, no React.
// Pick 6 of 1–20; 6 numbers are drawn; matches pay from the table below.
// The draw is decided on the device at the moment of DRAW with the platform
// CSPRNG (same client-authoritative trust boundary as the rest of the
// platform). rng is injectable for tests.
//
// Probabilities are hypergeometric: P(k) = C(6,k)·C(14,6−k) / C(20,6).
// Every multiplier is a multiple of 0.2, so stake × mult is already whole at
// stakes 5/10/20 — Math.round never moves the EV, which is exactly
// 36795 / 38760 = 0.94930 at every stake.
// NOTE: STAKES are mirrored by stakeRange '5–20' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.

export const POOL = 20;
export const PICKS = 6;
export const STAKES = [5, 10, 20];
export const MAX_WIN = 200;

// matches → multiplier (index = matches)
const MULTS = [0, 0, 1.2, 1.6, 4.6, 10, 10];

// Display tiers (the paytable strip): 5 and 6 share the top prize.
export const TIERS = [
  { label: '2', min: 2, mult: 1.2 },
  { label: '3', min: 3, mult: 1.6 },
  { label: '4', min: 4, mult: 4.6 },
  { label: '5+', min: 5, mult: 10 },
];

export function multFor(matches) {
  if (!Number.isInteger(matches) || matches < 0 || matches > PICKS) {
    throw new Error(`numbers: invalid match count ${String(matches)}`);
  }
  return MULTS[matches];
}

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

export function expectedValue() {
  return probabilities().reduce((ev, p, k) => ev + p * MULTS[k], 0);
}

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`numbers: invalid stake ${String(stake)}`);
  }
}

export function payoutFor(stake, matches) {
  assertStake(stake);
  return Math.round(stake * multFor(matches));
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

export function resolveDraw(stake, picks, rng = defaultRng) {
  assertStake(stake);
  validatePicks(picks);
  const drawn = drawNumbers(rng);
  const matches = countMatches(picks, drawn);
  const mult = multFor(matches);
  const payout = Math.round(stake * mult);
  return { drawn, matches, mult, win: payout > 0, payout };
}
