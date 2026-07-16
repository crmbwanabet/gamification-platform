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

test('purchaseMessage: gems shown only when nonzero', () => {
  assert.ok(!purchaseMessage(P).includes('gems'));
  assert.ok(purchaseMessage({ ...P, price_gems: 5 }).includes('5 gems'));
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
