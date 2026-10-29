import { test } from 'node:test';
import assert from 'node:assert/strict';
import { desktopScale, cardFit, DESKTOP_MIN_WIDTH } from '../lib/ui/desktopScale.mjs';

test('phones keep the game card at its own size', () => {
  assert.equal(desktopScale(390, 844, 400, 600), 1);
  assert.equal(desktopScale(DESKTOP_MIN_WIDTH - 1, 1200, 400, 600), 1);
});

test('desktop: the card grows to fill the screen height (top to bottom), capped at 3x', () => {
  assert.equal(desktopScale(1912, 882, 400, 600), 1.44); // (882 - 16) / 600
  assert.equal(desktopScale(1920, 1080, 400, 600), 1.77); // (1080 - 16) / 600 = 1.773
  assert.equal(desktopScale(2560, 1440, 400, 600), 2.37); // (1440 - 16) / 600
  assert.equal(desktopScale(900, 2000, 400, 600), 2.17); // narrow window: (900 - 32) / 400
  assert.equal(desktopScale(5000, 4000, 400, 600), 3); // capped
  assert.equal(desktopScale(1912, 600, 400, 600), 1); // a short window never shrinks below 1
  assert.equal(desktopScale(1000, 1400, 680, 720, 1.3), 1.3);
  assert.equal(desktopScale(1912, 882, 0, 600), 1);
});

test('cardFit: desktop scales up exactly like desktopScale, at the designed width', () => {
  assert.deepEqual(cardFit(1366, 900, 400, 600), { scale: 1.47, width: 400 }); // (900 - 16) / 600
  assert.deepEqual(cardFit(1920, 1080, 400, 600), { scale: 1.77, width: 400 });
});

test('cardFit: tall phones keep scale 1, narrow ones narrow the layout (never wider than the screen)', () => {
  assert.deepEqual(cardFit(412, 915, 400, 600), { scale: 1, width: 380 });
  assert.deepEqual(cardFit(390, 844, 400, 600), { scale: 1, width: 358 });
  assert.deepEqual(cardFit(360, 640, 400, 600), { scale: 1, width: 328 }); // 640 - 28 = 612 >= 600
  assert.deepEqual(cardFit(480, 800, 400, 600), { scale: 1, width: 400 });
});

test('cardFit: a short screen scales the 600-tall layout DOWN instead of squashing it', () => {
  // 320 x 568: (568 - 28) / 600 = 0.9; layout widens to 288 / 0.9 = 320
  assert.deepEqual(cardFit(320, 568, 400, 600), { scale: 0.9, width: 320 });
  // landscape phone 844 x 390: (390 - 28) / 600 = 0.603 -> 0.6, full 400 layout width
  assert.deepEqual(cardFit(844, 390, 400, 600), { scale: 0.6, width: 400 });
  // short desktop window: desktopScale says 1, cardFit still shrinks it to fit
  assert.deepEqual(cardFit(1912, 600, 400, 600), { scale: 0.95, width: 400 });
  // the scaled card always fits the window
  for (const [vw, vh] of [[320, 568], [360, 560], [844, 390], [667, 375], [568, 320], [1912, 500]]) {
    const { scale, width } = cardFit(vw, vh, 400, 600);
    assert.ok(width * scale <= vw - 32 + 0.5, `${vw}x${vh} width`);
    assert.ok(600 * scale <= vh - 28 + 0.5, `${vw}x${vh} height`);
  }
});

test('cardFit: bad input is harmless', () => {
  assert.deepEqual(cardFit(0, 0, 400, 600), { scale: 1, width: 400 });
  assert.deepEqual(cardFit(390, 844, 0, 600), { scale: 1, width: 0 });
  assert.equal(cardFit(200, 100, 400, 600).scale, 0.3); // floor
});
