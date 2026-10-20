import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORE_UNLOCK_STAGE, STORE_UNLOCK_XP, storeLocked } from '../lib/store/catalog.mjs';
import { getStage } from '../lib/vuma/stages.mjs';

test('the Coin Shop opens at stage 5 (900 XP)', () => {
  assert.equal(STORE_UNLOCK_STAGE, 5);
  assert.equal(STORE_UNLOCK_XP, 900);
  assert.equal(getStage(STORE_UNLOCK_XP - 1).stage, 4);
  assert.equal(getStage(STORE_UNLOCK_XP).stage, 5);
  assert.equal(storeLocked(1), true);
  assert.equal(storeLocked(4), true);
  assert.equal(storeLocked(5), false);
  assert.equal(storeLocked(19), false);
  assert.equal(storeLocked(undefined), true);
});
