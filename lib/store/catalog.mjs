// Store catalog + purchase shaping (2026-10-07 gem economy). Pure, relative
// imports only — node --test loads it directly.
//
// ONE purchase pipeline: every Store entry, redemptions included, is a
// store_items row bought through POST /api/purchase -> purchase_item RPC.
// Redemption rows carry redeem_currency ('coins' | 'emeralds' | 'rubies' |
// 'diamonds') + redeem_amount (kwacha for coin packs, gem count for gems);
// their price and kwacha payout are DERIVED from economy.coinsPerKwacha and
// economy.gemValues — here for display, and again inside the RPC for the
// charge — so a dashboard rate change reprices every redemption at once.
import { GEMS, REWARD_KEYS, GEM_LABEL, economyRates, gemKwacha, formatKwacha, formatNumber, cleanReward } from '../economy/currency.mjs';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const REDEEM_CURRENCIES = ['coins', ...GEMS];

// The redemption set the migration seeds (and the Store expects).
export const KWACHA_PACKS = [1, 5, 10, 20, 50];
export const GEM_REDEMPTIONS = GEMS.map(g => ({ currency: g, amount: 1 }));

const posInt = (v) => Number.isInteger(v) && v > 0;
const n0 = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * Price + payout of a redemption: { price, payoutKwacha }, or null when the
 * row isn't a valid redemption. Mirrors purchase_item's server-side maths.
 */
export function redemptionQuote(currency, amount, economy) {
  if (!REDEEM_CURRENCIES.includes(currency) || !posInt(amount)) return null;
  const { coinsPerKwacha } = economyRates(economy);
  if (currency === 'coins') return { price: { kwacha: amount * coinsPerKwacha }, payoutKwacha: amount };
  return { price: { [currency]: amount }, payoutKwacha: gemKwacha(currency, economy, amount) };
}

/** "K5 bwanabet bonus" — the name every redemption is credited under. */
export const redemptionName = (payoutKwacha) => `${formatKwacha(payoutKwacha)} bwanabet bonus`;

/**
 * store_items rows (as /api/config selects them) -> the client catalog.
 *   redemption rows: { id, redeem: { currency, amount }, payoutKwacha, price, name, isMoney: true }
 *   ordinary rows:   { id, name, desc, price: { kwacha, emeralds?, rubies?, diamonds? }, isMoney, ... }
 * Sold-out rows and rows still priced in the retired `gems` currency are
 * dropped (purchase_item refuses them too).
 */
export function buildStoreCatalog(rows, economy) {
  const out = [];
  for (const i of Array.isArray(rows) ? rows : []) {
    if (!i || !i.id) continue;
    if (i.stock !== null && i.stock !== undefined && !(i.stock > 0)) continue;
    const base = { id: i.id, desc: i.descr || '', imageUrl: i.image_url || null, featured: !!i.featured, isNew: !!i.is_new };
    if (i.redeem_currency) {
      const q = redemptionQuote(i.redeem_currency, i.redeem_amount, economy);
      if (!q) continue;
      out.push({ ...base, name: redemptionName(q.payoutKwacha), redeem: { currency: i.redeem_currency, amount: i.redeem_amount }, payoutKwacha: q.payoutKwacha, price: q.price, isMoney: true });
      continue;
    }
    if (n0(i.price_gems) > 0) continue; // retired currency — needs repricing in the dashboard
    const price = { kwacha: n0(i.price_kwacha) };
    for (const g of GEMS) { const v = n0(i[`price_${g}`]); if (v) price[g] = v; }
    out.push({ ...base, name: i.name, price, isMoney: !!i.is_money });
  }
  return out;
}

/** Redemptions first by currency (coins, then emerald/ruby/diamond), then by payout. */
export function splitCatalog(items) {
  const list = Array.isArray(items) ? items : [];
  const order = (it) => REDEEM_CURRENCIES.indexOf(it.redeem.currency) * 1e9 + it.payoutKwacha;
  const redeem = list.filter(it => it.redeem).sort((a, b) => order(a) - order(b));
  return { coinPacks: redeem.filter(r => r.redeem.currency === 'coins'), gemRedemptions: redeem.filter(r => r.redeem.currency !== 'coins'), items: list.filter(it => !it.redeem) };
}

/** POST /api/purchase body -> { token, itemId } or { error }. */
export function parsePurchaseBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'bad_request' };
  const itemId = typeof body.itemId === 'string' ? body.itemId.trim() : '';
  if (!UUID_RE.test(itemId)) return { error: 'bad_request' };
  return { token: body.token, itemId };
}

/**
 * What a purchase row actually charged, in live currencies:
 * { kwacha, emeralds, rubies, diamonds }. Prefers the server row; falls back
 * to the client's catalog price only for a field the server didn't return
 * (an older RPC). Retired price_gems / legacy_price_diamonds never count.
 */
export function paidFromPurchase(purchase, fallbackPrice) {
  const p = purchase && typeof purchase === 'object' ? purchase : {};
  const f = cleanReward(fallbackPrice);
  const out = {};
  for (const k of REWARD_KEYS) {
    const v = p[`price_${k}`];
    out[k] = typeof v === 'number' ? n0(v) : (f[k] || 0);
  }
  return out;
}

/**
 * Rejected purchases not yet refunded -> { ids, total }. `total` sums the
 * exact currencies charged, so a refund returns exactly what was paid, once.
 */
export function refundTotals(purchases, refundedIds) {
  const done = new Set(Array.isArray(refundedIds) ? refundedIds : []);
  const todo = (Array.isArray(purchases) ? purchases : []).filter(p => p && p.status === 'rejected' && p.id && !done.has(p.id));
  const total = { kwacha: 0, emeralds: 0, rubies: 0, diamonds: 0 };
  for (const p of todo) {
    const paid = paidFromPurchase(p, null);
    for (const k of REWARD_KEYS) total[k] += paid[k];
  }
  return { ids: todo.map(p => p.id), total };
}

/** Purchase price in Telegram/admin wording: "5,000 coins", "1 Emerald", "2 Rubies". */
export function priceWords(paid) {
  const fmt = formatNumber;
  const plural = { emeralds: 'Emeralds', rubies: 'Rubies', diamonds: 'Diamonds' };
  const parts = [];
  if (paid.kwacha) parts.push(`${fmt(paid.kwacha)} ${paid.kwacha === 1 ? 'coin' : 'coins'}`);
  for (const g of GEMS) if (paid[g]) parts.push(`${fmt(paid[g])} ${paid[g] === 1 ? GEM_LABEL[g] : plural[g]}`);
  return parts.join(' + ');
}
