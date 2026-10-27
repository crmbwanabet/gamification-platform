// Street Parking: the 6 parking bays (2 rows of 3 either side of the driving
// lane). It plays EXACTLY like Penalty Crash: each bay is one of the penalty
// spots (same id, same multiplier, same order) and the round is decided by the
// shared pick-one-of-6 engine (lib/pick6/engine.mjs):
//   win chance = rtp × stake / half-up payout, a win pays roundUp(stake × mult).
// The only new thing is the rival taxi: on a loss it takes YOUR bay (you are
// late); on a win it parks in one of the 5 other bays. Pure, no React.
// Colours (fill / light ring / dark base) come from the approved design and
// stay close to the penalty spot colours.

import { SPOTS } from '../penalty/spots.mjs';
import { resolvePick, winChance } from '../pick6/engine.mjs';
import { RTP_DEFAULT } from '../rtp.mjs';

const PAINT = {
  TL: { c: '#FF2E63', l: '#FF8FA8', d: '#B0103A' },
  TC: { c: '#5FA81A', l: '#A5DE1E', d: '#3A6A08' },
  TR: { c: '#FF5A1F', l: '#FF9C74', d: '#B8340A' },
  BL: { c: '#FF8A1A', l: '#FFC078', d: '#B85A00' },
  BC: { c: '#3CC21A', l: '#8BEA5C', d: '#1F7A0A' },
  BR: { c: '#E0A300', l: '#FFE27A', d: '#8A6400' },
};

export const multLabel = (mult) => `×${mult}`;

export const BAYS = SPOTS.map((s, index) => ({
  id: s.id, index, row: s.row, col: s.col, mult: s.mult,
  label: `Parking spot ${multLabel(s.mult)}`,
  ...PAINT[s.id],
}));

export const BAY_IDS = BAYS.map(b => b.id);

// Uniform in [0, 1) from the platform CSPRNG (Node 18+ and browsers).
function defaultRng() {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
}

function bayAt(index) {
  const bay = Number.isInteger(index) ? BAYS[index] : undefined;
  if (!bay) throw new Error(`parking: invalid bay ${String(index)}`);
  return bay;
}

export function bayWinChance(stake, index, rtp = RTP_DEFAULT) {
  return winChance(stake, bayAt(index).mult, rtp);
}

// One round. rng is injectable for tests: the first draw decides win/loss
// (via the pick6 engine), the second (wins only) picks the taxi's bay.
export function playBay(stake, index, rng = defaultRng, rtp = RTP_DEFAULT) {
  const bay = bayAt(index);
  const { win, payout } = resolvePick(stake, bay.mult, rng, rtp);
  if (!win) return { win, payout, rival: index };
  const others = BAYS.filter(b => b.index !== index).map(b => b.index);
  const k = Math.min(others.length - 1, Math.max(0, Math.floor(rng() * others.length)));
  return { win, payout, rival: others[k] };
}
