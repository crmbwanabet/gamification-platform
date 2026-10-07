// Reward amounts as words, so a number never stands alone next to an icon:
// "50 coins", "1 coin", "1 emerald", "2 rubies", "1 diamond", "30 XP".
// (User request 2026-10; gem currencies 2026-10-07 — the old `gems` are retired.)
import { formatNumber } from './economy/currency.mjs';

const UNITS = {
  coins: ['coin', 'coins'],
  emeralds: ['emerald', 'emeralds'],
  rubies: ['ruby', 'rubies'],
  diamonds: ['diamond', 'diamonds'],
  xp: ['XP', 'XP'],
};

/** One amount with its unit: amountText(5000, 'coins') → "5,000 coins". */
export function amountText(n, kind = 'coins') {
  const [one, many] = UNITS[kind] || UNITS.coins;
  return `${formatNumber(n)} ${Number(n) === 1 ? one : many}`;
}

/** A reward row ({ kwacha, emeralds, rubies, diamonds }) as named amounts: ["50 coins", "1 emerald"]. */
export function rewardParts(r) {
  if (!r) return [];
  const out = [];
  if (r.kwacha) out.push(amountText(r.kwacha, 'coins'));
  if (r.emeralds) out.push(amountText(r.emeralds, 'emeralds'));
  if (r.rubies) out.push(amountText(r.rubies, 'rubies'));
  if (r.diamonds) out.push(amountText(r.diamonds, 'diamonds'));
  return out;
}
