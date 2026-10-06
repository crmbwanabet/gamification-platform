// Reward amounts as words, so a number never stands alone next to an icon:
// "50 coins", "1 coin", "5 gems", "1 diamond", "30 XP". (User request 2026-10.)
const UNITS = {
  coins: ['coin', 'coins'],
  gems: ['gem', 'gems'],
  diamonds: ['diamond', 'diamonds'],
  xp: ['XP', 'XP'],
};

/** One amount with its unit: amountText(50, 'coins') → "50 coins". */
export function amountText(n, kind = 'coins') {
  const [one, many] = UNITS[kind] || UNITS.coins;
  return `${n} ${Number(n) === 1 ? one : many}`;
}

/** A reward row ({ kwacha, gems, diamonds }) as named amounts: ["50 coins", "5 gems", "1 diamond"]. */
export function rewardParts(r) {
  if (!r) return [];
  const out = [];
  if (r.kwacha) out.push(amountText(r.kwacha, 'coins'));
  if (r.gems) out.push(amountText(r.gems, 'gems'));
  if (r.diamonds) out.push(amountText(r.diamonds, 'diamonds'));
  return out;
}
