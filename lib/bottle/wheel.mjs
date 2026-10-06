// Bottle Spin — the pay table and the spin. Pure, no React. The result is
// decided on the device at SPIN (same client-authoritative trust boundary as
// the rest of the platform); rng is injectable so tests can force a segment.
//
// 8 painted segments, listed clockwise from the top of the table (index 0 =
// 12 o'clock, 45° each). The segments are drawn the same size, but the WEIGHTS
// decide the odds: bigger prizes come up less often.
//   EV = Σ weight × mult / Σ weight = 95 / 100 = 0.95 exactly (5% edge).
// Top prize 4x: 50 × 4 = 200 = the max-win cap.

export const STAKES = [10, 20, 30, 50];

export const SEGMENTS = [
  { id: 'x1_5', mult: 1.5, weight: 14, label: '1.5x' },
  { id: 'try1', mult: 0, weight: 14, label: 'TRY AGAIN' },
  { id: 'x2', mult: 2, weight: 7, label: '2x' },
  { id: 'x1_2', mult: 1.2, weight: 30, label: '1.2x' },
  { id: 'x4', mult: 4, weight: 3, label: '4x' },
  { id: 'try2', mult: 0, weight: 14, label: 'TRY AGAIN' },
  { id: 'x3', mult: 3, weight: 4, label: '3x' },
  { id: 'try3', mult: 0, weight: 14, label: 'TRY AGAIN' },
];

export const TOTAL_WEIGHT = SEGMENTS.reduce((s, x) => s + x.weight, 0);
export const MAX_MULT = Math.max(...SEGMENTS.map(s => s.mult));
const MULTS = new Set(SEGMENTS.map(s => s.mult));

export function expectedValue() {
  return SEGMENTS.reduce((s, x) => s + x.weight * x.mult, 0) / TOTAL_WEIGHT;
}

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`bottle: invalid stake ${String(stake)}`);
  }
}

export function payoutFor(stake, mult) {
  assertStake(stake);
  if (!MULTS.has(mult)) throw new Error(`bottle: invalid multiplier ${String(mult)}`);
  return Math.round(stake * mult);
}

// r in [0, 1) → segment index, walking the cumulative weights.
export function segmentFor(r) {
  if (typeof r !== 'number' || !(r >= 0 && r < 1)) throw new Error(`bottle: rng out of range ${String(r)}`);
  let x = r * TOTAL_WEIGHT;
  for (let i = 0; i < SEGMENTS.length; i++) {
    x -= SEGMENTS[i].weight;
    if (x < 0) return i;
  }
  return SEGMENTS.length - 1; // float guard; unreachable for r < 1
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function resolveSpin(stake, rng = defaultRng) {
  assertStake(stake);
  const index = segmentFor(rng());
  const { mult } = SEGMENTS[index];
  const win = mult > 0;
  return { index, mult, win, payout: win ? payoutFor(stake, mult) : 0 };
}
