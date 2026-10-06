// Pick-a-spot engine — shared by the "pick one of N multipliers" games
// (Penalty Crash, Chicken Catch; later Lucky Minibus). Pure, no React.
// Every spot carries the same 5% edge: win chance = (1 - EDGE) / mult, a win
// pays Math.round(stake × mult), a loss forfeits the stake. The result is
// decided on the device at the moment of play (same client-authoritative trust
// boundary as the rest of the platform). rng is injectable for tests.

export const EDGE = 0.05;
export const STAKES = [10, 20, 30, 50];

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

export function winChance(mult) {
  assertMult(mult);
  return (1 - EDGE) / mult;
}

export function payoutFor(stake, mult, stakes = STAKES) {
  assertStake(stake, stakes);
  assertMult(mult);
  return Math.round(stake * mult);
}

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

export function resolvePick(stake, mult, rng = defaultRng, stakes = STAKES) {
  const payout = payoutFor(stake, mult, stakes);
  const win = rng() < winChance(mult);
  return { win, payout: win ? payout : 0 };
}
