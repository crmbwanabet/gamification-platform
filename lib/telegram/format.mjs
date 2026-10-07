// Pure Telegram message shaping for the purchase flow — node-testable.
import { paidFromPurchase, priceWords, UUID_RE } from '../store/catalog.mjs';
import { formatKwacha } from '../economy/currency.mjs';

export { UUID_RE };

// Kwacha redemptions (payout_kwacha set by purchase_item) lead with the exact
// instruction the admin acts on:
//   "💵 Credit K5 bwanabet bonus to player 123456 — paid 5,000 coins"
// Other items keep the item/price layout (+ the money-prize line).
export function purchaseMessage(p) {
  const paid = priceWords(paidFromPurchase(p, null)) || 'nothing';
  const ref = `#${String(p.id).slice(0, 8)}`;
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
