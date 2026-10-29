// Guard (2026-10-29): the game cards are scaled up on desktop (and scale in on
// open) with a CSS transform. getBoundingClientRect INCLUDES that transform, so
// a game that sizes or positions things inside the card from it gets the scale
// twice: Road Crossing looked zoomed in, then the Negotiator room slid off its
// box. Any game file that reads screen rects must also convert them back to
// layout pixels (offsetWidth/Height: layout size, or k = rect.width / offsetWidth).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../components/games/', import.meta.url));
function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.jsx?$/.test(n) ? [p] : [];
  });
}

test('games never size the scene from screen rects without undoing the card scale', () => {
  const bad = files(ROOT).filter((p) => {
    const src = readFileSync(p, 'utf8');
    // `void el.getBoundingClientRect()` is only a reflow (restarts a CSS animation)
    const reads = src.replace(/void [\w.?[\]]+\.getBoundingClientRect\(\)/g, '');
    return /getBoundingClientRect\(\)/.test(reads) && !/offsetWidth/.test(reads);
  });
  assert.deepEqual(bad, [], 'convert screen rects with offsetWidth (see tests/scaled-card-measure.test.mjs)');
});

test('no scene measures its own box with getBoundingClientRect', () => {
  const bad = files(ROOT).filter((p) =>
    /const r = el\.getBoundingClientRect\(\);[^\n]*setView/.test(readFileSync(p, 'utf8')));
  assert.deepEqual(bad, []);
});
