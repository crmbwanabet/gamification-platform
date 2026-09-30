// Coin Flip engine — pure, no React. The result is decided on the device at
// the moment of FLIP (same client-authoritative trust boundary as the rest of
// the platform). rng is injectable so tests can force each face.

export const STAKES = [10, 20, 30, 50];
export const FACES = ['HEADS', 'TAILS'];

function assertStake(stake) {
  if (typeof stake !== 'number' || !STAKES.includes(stake)) {
    throw new Error(`coinflip: invalid stake ${String(stake)}`);
  }
}

// Win returns stake × 1.9 (5% house edge). Integer maths: 19/38/57/95.
export function payoutFor(stake) {
  assertStake(stake);
  return Math.round((stake * 19) / 10);
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function resolveFlip(stake, pick, rng = defaultRng) {
  assertStake(stake);
  if (!FACES.includes(pick)) throw new Error(`coinflip: invalid pick ${String(pick)}`);
  const face = rng() < 0.5 ? 'HEADS' : 'TAILS';
  const win = face === pick;
  return { face, win, payout: win ? payoutFor(stake) : 0 };
}
