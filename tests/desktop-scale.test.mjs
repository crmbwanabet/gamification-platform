import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desktopScale, DESKTOP_MIN_WIDTH } from '../lib/ui/desktopScale.mjs';

test('phones keep the game card at its own size', () => {
  assert.equal(desktopScale(390, 844, 400, 600), 1);
  assert.equal(desktopScale(DESKTOP_MIN_WIDTH - 1, 1200, 400, 600), 1);
});

test('desktop: the card grows to the screen height, capped', () => {
  assert.equal(desktopScale(1912, 882, 400, 600), 1.4); // (882 - 40) / 600
  assert.equal(desktopScale(2560, 1440, 400, 600), 1.6); // capped
  assert.equal(desktopScale(1912, 600, 400, 600), 1); // a short window never shrinks below 1
  assert.equal(desktopScale(1000, 1400, 680, 720, 1.3), 1.3);
  assert.equal(desktopScale(1912, 882, 0, 600), 1);
});
