import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORE_UNLOCK_STAGE, STORE_UNLOCK_XP, itemBuyable, storeLocked, storeLockReason, cleanStoreConfig, STORE_DEFAULTS } from '../lib/store/catalog.mjs';
import { mergeConfig } from '../lib/config/merge.mjs';
import { getStage } from '../lib/vuma/stages.mjs';

const OPEN = { open: true };

test('the Coin Shop opens at level 10 (3,200 XP on the 23-stage list) once it is switched on', () => {
  assert.equal(STORE_UNLOCK_STAGE, 10);
  assert.equal(STORE_UNLOCK_XP, 3200);
  assert.equal(getStage(STORE_UNLOCK_XP - 1).stage, 9);
  assert.equal(getStage(STORE_UNLOCK_XP).stage, 10);
  assert.equal(storeLocked(1, OPEN), true);
  assert.equal(storeLocked(9, OPEN), true);
  assert.equal(storeLocked(10, OPEN), false);
  assert.equal(storeLocked(19, OPEN), false);
  assert.equal(storeLocked(undefined, OPEN), true);
  assert.equal(storeLockReason(9, OPEN), 'stage');
  assert.equal(storeLockReason(10, OPEN), null);
});

test('launch switch: shut by default = COMING SOON for every stage', () => {
  assert.equal(STORE_DEFAULTS.open, false);
  for (const s of [1, 5, 19]) {
    assert.equal(storeLockReason(s), 'soon');
    assert.equal(storeLockReason(s, { open: false }), 'soon');
    assert.equal(storeLocked(s, null), true);
  }
});

test('cleanStoreConfig only opens on a literal true', () => {
  assert.deepEqual(cleanStoreConfig({ open: true }), { open: true });
  for (const v of [null, undefined, 'open', [], {}, { open: 'true' }, { open: 1 }]) assert.deepEqual(cleanStoreConfig(v), { open: false });
});

test('the `store` config row reaches the merged config', () => {
  const defaults = { store: { open: false } };
  assert.deepEqual(mergeConfig(defaults, []).store, { open: false });
  assert.deepEqual(mergeConfig(defaults, [{ key: 'store', value: { open: true } }]).store, { open: true });
  assert.deepEqual(mergeConfig(defaults, [{ key: 'store', value: { open: 'yes' } }]).store, { open: false });
});

test('only the kwacha packs are buyable; prizes and other items stay locked', () => {
  assert.equal(itemBuyable({ redeem: { currency: 'coins', amount: 5 } }), true);
  assert.equal(itemBuyable({ redeem: { currency: 'emeralds', amount: 1 } }), false);
  assert.equal(itemBuyable({ id: 'cap', price: { kwacha: 20000 } }), false);
  assert.equal(itemBuyable(null), false);
});
