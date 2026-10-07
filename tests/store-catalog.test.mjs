import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  redemptionQuote, redemptionName, buildStoreCatalog, splitCatalog, parsePurchaseBody,
  paidFromPurchase, refundTotals, KWACHA_PACKS, GEM_REDEMPTIONS,
} from '../lib/store/catalog.mjs';

const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
// The rows the 2026-10-07 migration seeds.
const SEED = [
  ...KWACHA_PACKS.map((k, i) => ({ id: id(i + 1), name: `K${k} bwanabet bonus`, redeem_currency: 'coins', redeem_amount: k, price_kwacha: k * 1000, stock: null, is_money: true })),
  ...GEM_REDEMPTIONS.map((g, i) => ({ id: id(10 + i), name: g.currency, redeem_currency: g.currency, redeem_amount: 1, price_kwacha: 0, stock: null, is_money: true })),
];

test('redemptionQuote: coin packs K1/K5/K10/K20/K50 at 1,000 coins = K1', () => {
  assert.deepEqual(KWACHA_PACKS.map(k => redemptionQuote('coins', k).price.kwacha), [1000, 5000, 10000, 20000, 50000]);
  assert.equal(redemptionQuote('coins', 5).payoutKwacha, 5);
});

test('redemptionQuote: 1 emerald -> K5, 1 ruby -> K10, 1 diamond -> K20, paid with the gem', () => {
  assert.deepEqual(redemptionQuote('emeralds', 1), { price: { emeralds: 1 }, payoutKwacha: 5 });
  assert.deepEqual(redemptionQuote('rubies', 1), { price: { rubies: 1 }, payoutKwacha: 10 });
  assert.deepEqual(redemptionQuote('diamonds', 1), { price: { diamonds: 1 }, payoutKwacha: 20 });
});

test('redemptionQuote follows coinsPerKwacha and gemValues; rejects junk', () => {
  const eco = { coinsPerKwacha: 2000, gemValues: { emerald: 5000, ruby: 10000, diamond: 30000 } };
  assert.deepEqual(redemptionQuote('coins', 5, eco), { price: { kwacha: 10000 }, payoutKwacha: 5 });
  assert.equal(redemptionQuote('emeralds', 1, eco).payoutKwacha, 2.5);
  assert.equal(redemptionQuote('diamonds', 1, eco).payoutKwacha, 15);
  assert.equal(redemptionQuote('gems', 1), null);
  assert.equal(redemptionQuote('coins', 0), null);
  assert.equal(redemptionQuote('coins', 1.5), null);
});

test('buildStoreCatalog: seeded redemptions priced from config, named by payout', () => {
  const cat = buildStoreCatalog(SEED, { coinsPerKwacha: 1000 });
  const { coinPacks, gemRedemptions, items } = splitCatalog(cat);
  assert.deepEqual(coinPacks.map(c => [c.name, c.price.kwacha, c.payoutKwacha]), [
    ['K1 bwanabet bonus', 1000, 1], ['K5 bwanabet bonus', 5000, 5], ['K10 bwanabet bonus', 10000, 10],
    ['K20 bwanabet bonus', 20000, 20], ['K50 bwanabet bonus', 50000, 50],
  ]);
  assert.deepEqual(gemRedemptions.map(g => [g.redeem.currency, g.price, g.payoutKwacha]), [
    ['emeralds', { emeralds: 1 }, 5], ['rubies', { rubies: 1 }, 10], ['diamonds', { diamonds: 1 }, 20],
  ]);
  assert.equal(items.length, 0);
  assert.ok(cat.every(c => c.isMoney));
  // a dashboard rate change reprices every pack at once
  const k2 = splitCatalog(buildStoreCatalog(SEED, { coinsPerKwacha: 1500 })).coinPacks;
  assert.deepEqual(k2.map(c => c.price.kwacha), [1500, 7500, 15000, 30000, 75000]);
});

test('buildStoreCatalog: ordinary items keep coin + gem prices; legacy gems-priced and sold-out rows drop', () => {
  const rows = [
    { id: id(20), name: 'Free spins', descr: 'x', price_kwacha: 500, price_emeralds: 0, price_rubies: 1, price_diamonds: 0, stock: 3, is_money: false },
    { id: id(21), name: 'Old K10', price_kwacha: 0, price_gems: 300, stock: null },
    { id: id(22), name: 'Gone', price_kwacha: 100, stock: 0 },
    { id: id(23), name: 'Bad redeem', redeem_currency: 'gems', redeem_amount: 1, stock: null },
  ];
  const cat = buildStoreCatalog(rows, {});
  assert.deepEqual(cat.map(c => c.name), ['Free spins']);
  assert.deepEqual(cat[0].price, { kwacha: 500, rubies: 1 });
  assert.equal(cat[0].isMoney, false);
});

test('redemptionName formats the payout', () => {
  assert.equal(redemptionName(5), 'K5 bwanabet bonus');
  assert.equal(redemptionName(2.5), 'K2.50 bwanabet bonus');
});

test('parsePurchaseBody: needs a uuid itemId', () => {
  assert.deepEqual(parsePurchaseBody({ token: 't', itemId: ` ${id(1)} ` }), { token: 't', itemId: id(1) });
  for (const bad of [null, [], 'x', {}, { itemId: 'nope' }, { itemId: 42 }, { itemId: `${id(1)}; drop` }]) {
    assert.deepEqual(parsePurchaseBody(bad), { error: 'bad_request' });
  }
});

test('paidFromPurchase: server row wins, fallback only for missing fields, retired gems never count', () => {
  assert.deepEqual(paidFromPurchase({ price_kwacha: 5000, price_emeralds: 0, price_rubies: 0, price_diamonds: 0 }, { kwacha: 4000 }),
    { kwacha: 5000, emeralds: 0, rubies: 0, diamonds: 0 });
  // an older RPC that doesn't return price_emeralds: the catalog price fills in
  assert.deepEqual(paidFromPurchase({ price_kwacha: 0 }, { emeralds: 1 }), { kwacha: 0, emeralds: 1, rubies: 0, diamonds: 0 });
  assert.deepEqual(paidFromPurchase({ price_kwacha: 10, price_gems: 300, legacy_price_diamonds: 15 }, null), { kwacha: 10, emeralds: 0, rubies: 0, diamonds: 0 });
  assert.deepEqual(paidFromPurchase(null, null), { kwacha: 0, emeralds: 0, rubies: 0, diamonds: 0 });
});

test('refundTotals: rejected purchases refund the exact currency, exactly once', () => {
  const purchases = [
    { id: 'a', status: 'rejected', price_kwacha: 5000, price_emeralds: 0, price_rubies: 0, price_diamonds: 0 },
    { id: 'b', status: 'rejected', price_kwacha: 0, price_emeralds: 1, price_rubies: 0, price_diamonds: 0 },
    { id: 'c', status: 'credited', price_kwacha: 0, price_rubies: 1 },
    { id: 'd', status: 'pending', price_kwacha: 0, price_diamonds: 1 },
    { id: 'e', status: 'rejected', price_kwacha: 0, price_diamonds: 0, legacy_price_diamonds: 15, price_gems: 300 },
  ];
  const first = refundTotals(purchases, []);
  assert.deepEqual(first.ids, ['a', 'b', 'e']);
  assert.deepEqual(first.total, { kwacha: 5000, emeralds: 1, rubies: 0, diamonds: 0 });
  const again = refundTotals(purchases, first.ids);
  assert.deepEqual(again.ids, []);
  assert.deepEqual(again.total, { kwacha: 0, emeralds: 0, rubies: 0, diamonds: 0 });
});
