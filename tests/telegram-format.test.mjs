import { test } from 'node:test';
import assert from 'node:assert/strict';
import { purchaseMessage, handledSuffix, parseCreditCallback } from '../lib/telegram/format.mjs';

const P = { id: 'a1b2c3d4-0000-0000-0000-000000000000', uid: '207978', item_name: 'K20 Free Bet', price_kwacha: 200, price_gems: 0 };

test('purchaseMessage: includes player, item, price', () => {
  const m = purchaseMessage(P);
  assert.ok(m.includes('207978'));
  assert.ok(m.includes('K20 Free Bet'));
  assert.ok(m.includes('200 coins'));
  assert.ok(m.startsWith('🛒'));
});

test('purchaseMessage: gem prices shown only when nonzero; retired gems never shown', () => {
  assert.ok(!/Emerald|Rub|Diamond/.test(purchaseMessage(P)));
  assert.ok(purchaseMessage({ ...P, price_kwacha: 0, price_emeralds: 1 }).includes('Paid: 1 Emerald'));
  assert.ok(purchaseMessage({ ...P, price_kwacha: 0, price_rubies: 2 }).includes('Paid: 2 Rubies'));
  assert.ok(purchaseMessage({ ...P, price_kwacha: 0, price_diamonds: 3 }).includes('Paid: 3 Diamonds'));
  assert.ok(purchaseMessage({ ...P, price_kwacha: 500, price_diamonds: 1 }).includes('Paid: 500 coins + 1 Diamond'));
  assert.ok(!purchaseMessage({ ...P, price_gems: 5 }).includes('gems'));
});

test('purchaseMessage: kwacha redemptions carry only the user ID and amount', () => {
  const coin = purchaseMessage({ ...P, uid: '123456', item_name: 'K5 bwanabet bonus', price_kwacha: 5000, payout_kwacha: 5, is_money: true });
  assert.equal(coin, 'User ID: 123456\nAmount: K5');
  const gem = purchaseMessage({ ...P, uid: '123456', price_kwacha: 0, price_emeralds: 1, payout_kwacha: '5.00', is_money: true });
  assert.equal(gem, 'User ID: 123456\nAmount: K5');
  const frac = purchaseMessage({ ...P, price_kwacha: 0, price_rubies: 1, payout_kwacha: 2.5 });
  assert.equal(frac, 'User ID: 207978\nAmount: K2.50');
});

test('purchaseMessage: money prizes carry a credit-warning line', () => {
  const m = purchaseMessage({ ...P, is_money: true, item_name: 'K50 Bwanabet Credit' });
  assert.ok(m.includes('💵 MONEY PRIZE'));
  assert.ok(!purchaseMessage(P).includes('MONEY PRIZE'));
});

test('handledSuffix: credit and reject variants', () => {
  assert.equal(handledSuffix('credited', 'jane'), '\n\n✅ Credited by jane');
  assert.equal(handledSuffix('rejected', 'jane'), '\n\n❌ Rejected by jane (refunded)');
});

test('parseCreditCallback: extracts uuid, rejects junk', () => {
  assert.equal(parseCreditCallback('credit:' + P.id), P.id);
  assert.equal(parseCreditCallback('credit:not-a-uuid'), null);
  assert.equal(parseCreditCallback('boom'), null);
  assert.equal(parseCreditCallback(null), null);
});
