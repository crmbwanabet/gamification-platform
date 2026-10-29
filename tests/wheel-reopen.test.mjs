// Re-opening the hosted wheel (bug 2026-10-29: "FREE SPIN READY" -> SPIN froze
// the page). The wheel renders NOTHING after its own X (handleClose latches
// `closed`) until a fresh bwanabet-auth arrives; our transparent full-screen
// overlay then covered the Bonus Center with an empty iframe that ate every click.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wheelReopenAction } from '../lib/wheel/reopen.mjs';

test('logged in: every open re-sends the token (un-latches the wheel, like its own embed.js)', () => {
  assert.equal(wheelReopenAction({ hasToken: true, closedSinceLoad: true }), 'auth');
  assert.equal(wheelReopenAction({ hasToken: true, closedSinceLoad: false }), 'auth');
});

test('preview (test mode, no token): reload the frame only when the wheel closed itself since it loaded', () => {
  assert.equal(wheelReopenAction({ hasToken: false, closedSinceLoad: true }), 'reload');
  assert.equal(wheelReopenAction({ hasToken: false, closedSinceLoad: false }), 'none');
});

test('useWheel open() goes through wheelReopenAction', () => {
  const src = readFileSync(new URL('../components/extras/useWheel.jsx', import.meta.url), 'utf8');
  assert.match(src, /import \{ wheelReopenAction \} from '\.\.\/\.\.\/lib\/wheel\/reopen\.mjs'/);
  assert.match(src, /open: reopen/);
});
