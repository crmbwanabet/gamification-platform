// lib/njuka/engine.mjs — pure rules + round state for Njuka Boss.
// No DOM, no timers; shuffle takes an injectable rng so tests are
// deterministic. Cards are { r: 1..13, s: '♠♥♦♣' } — suits are cosmetic,
// every rule works on ranks alone.

export const FACES = new Set([11, 12, 13]);
export const SUITS = ['♠', '♥', '♦', '♣'];
const LABELS = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
export const label = (r) => LABELS[r] || String(r);

// A=1 low, no wrap. Numbers connect at distance 1. J/Q/K are an any-order
// group: two DISTINCT faces always connect; a face never connects to a
// number (so 10–J is NOT a run and AAA+K is not a win).
export function connects(a, b) {
  if (FACES.has(a) && FACES.has(b)) return a !== b;
  if (FACES.has(a) || FACES.has(b)) return false;
  return Math.abs(a - b) === 1;
}

function countRanks(ranks) {
  const m = {};
  for (const r of ranks) m[r] = (m[r] || 0) + 1;
  return m;
}

function removeCopies(ranks, r, n) {
  const rest = [...ranks];
  for (let i = 0; i < n; i++) rest.splice(rest.indexOf(r), 1);
  return rest;
}

// A winning 4-card hand: triple + follower (7·7·7·8) or pair + 2-run (5·5·7·8).
export function isWin(ranks) {
  if (ranks.length !== 4) return false;
  const counts = countRanks(ranks);
  for (const k in counts) {
    const r = +k;
    if (counts[k] >= 3) {
      const rest = removeCopies(ranks, r, 3);
      if (rest.length === 1 && connects(r, rest[0])) return true;
    }
    if (counts[k] >= 2) {
      const rest = removeCopies(ranks, r, 2);
      if (rest.length === 2 && connects(rest[0], rest[1])) return true;
    }
  }
  return false;
}

// Which 4th ranks would complete this 3-card hand (ascending).
export function completions(ranks3) {
  const out = [];
  for (let r = 1; r <= 13; r++) if (isWin([...ranks3, r])) out.push(r);
  return out;
}
