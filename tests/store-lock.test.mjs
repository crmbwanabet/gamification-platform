import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORE_UNLOCK_STAGE, STORE_UNLOCK_XP, storeLocked, storeLockReason, cleanStoreConfig, STORE_DEFAULTS } from '../lib/store/catalog.mjs';
import { mergeConfig } from '../lib/config/merge.mjs';
import { getStage } from '../lib/vuma/stages.mjs';

const OPEN = { open: true };

test('the Coin Shop opens at stage 5 (900 XP) once it is switched on', () => {
  assert.equal(STORE_UNLOCK_STAGE, 5);
  assert.equal(STORE_UNLOCK_XP, 900);
  assert.equal(getStage(STORE_UNLOCK_XP - 1).stage, 4);
  assert.equal(getStage(STORE_UNLOCK_XP).stage, 5);
  assert.equal(storeLocked(1, OPEN), true);
  assert.equal(storeLocked(4, OPEN), true);
  assert.equal(storeLocked(5, OPEN), false);
  assert.equal(storeLocked(19, OPEN), false);
  assert.equal(storeLocked(undefined, OPEN), true);
  assert.equal(storeLockReason(4, OPEN), 'stage');
  assert.equal(storeLockReason(5, OPEN), null);
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
