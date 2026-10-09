// Pure Telegram message shaping for the purchase flow — node-testable.
import { paidFromPurchase, priceWords, UUID_RE } from '../store/catalog.mjs';
import { formatKwacha } from '../economy/currency.mjs';
import { worldCupPrizeMessage } from '../season/verify.mjs';

export { UUID_RE };

// Kwacha redemptions (payout_kwacha set by purchase_item) lead with the exact
// instruction the admin acts on:
//   "💵 Credit K5 bwanabet bonus to player 123456 — paid 5,000 coins"
// Other items keep the item/price layout (+ the money-prize line).
export function purchaseMessage(p) {
  const paid = priceWords(paidFromPurchase(p, null)) || 'nothing';
  const ref = `#${String(p.id).slice(0, 8)}`;
  // Season prize rows (World Cup Final, 2026-10-09): rebuilt from prize_meta so
  // a Telegram edit after the ✅ tap keeps the season summary.
  if (typeof p.prize_key === 'string' && p.prize_key.startsWith('worldcup:')) {
    return worldCupPrizeMessage({ uid: p.uid, prizeKwacha: p.payout_kwacha, seasonId: p.prize_key.slice(9), summary: p.prize_meta, ref });
  }
  const payout = Number(p.payout_kwacha);
  if (Number.isFinite(payout) && payout > 0) {
    return `💵 Kwacha redemption ${ref}\nCredit ${formatKwacha(payout)} bwanabet bonus to player ${p.uid} — paid ${paid}`;
  }
  const money = p.is_money ? '\n💵 MONEY PRIZE — credit the player\'s bwanabet account' : '';
  return `🛒 Store purchase ${ref}\nPlayer: ${p.uid}\nItem: ${p.item_name}\nPaid: ${paid}${money}`;
}

export function handledSuffix(status, by) {
  return status === 'credited' ? `\n\n✅ Credited by ${by}` : `\n\n❌ Rejected by ${by} (refunded)`;
}

// callback_data is "credit:<purchase uuid>" — anything else is ignored.
export function parseCreditCallback(data) {
  if (typeof data !== 'string' || !data.startsWith('credit:')) return null;
  const id = data.slice(7);
  return UUID_RE.test(id) ? id : null;
}
