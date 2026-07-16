// Pure Telegram message shaping for the purchase flow — node-testable.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function purchaseMessage(p) {
  const price = [
    p.price_kwacha ? `${p.price_kwacha} coins` : null,
    p.price_gems ? `${p.price_gems} gems` : null,
  ].filter(Boolean).join(' + ');
  return `🛒 Store purchase #${String(p.id).slice(0, 8)}\nPlayer: ${p.uid}\nItem: ${p.item_name}\nPaid: ${price}`;
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
