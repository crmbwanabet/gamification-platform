import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connects, isWin, completions, label } from '../lib/njuka/engine.mjs';

test('connects: numbers at distance 1, A low, no wrap', () => {
  assert.ok(connects(1, 2));
  assert.ok(connects(7, 8));
  assert.ok(!connects(7, 9));
  assert.ok(!connects(1, 13));  // no wrap — K is a face, A a number
  assert.ok(!connects(10, 11)); // 10 does NOT connect to J
});

test('connects: J/Q/K are an any-order group', () => {
  assert.ok(connects(11, 13));
  assert.ok(connects(12, 11));
  assert.ok(!connects(11, 11)); // same face is not a run
});

test('isWin: triple + follower', () => {
  assert.ok(isWin([7, 7, 7, 8]));
  assert.ok(isWin([7, 7, 7, 6]));
  assert.ok(isWin([13, 13, 13, 11]));  // KKK + J (face group)
  assert.ok(!isWin([10, 10, 10, 11])); // 10s can't follow to J
  assert.ok(!isWin([1, 1, 1, 13]));    // AAA + K is not a win
});

test('isWin: pair + 2-run', () => {
  assert.ok(isWin([5, 5, 7, 8]));
  assert.ok(isWin([1, 1, 2, 3]));      // A-low run
  assert.ok(isWin([12, 12, 11, 13]));  // QQ + J-K any-order faces
  assert.ok(!isWin([3, 4, 5, 6]));     // plain run is nothing
  assert.ok(!isWin([7, 7, 8, 8]));     // two pairs isn't a win
  assert.ok(!isWin([7, 7, 7, 7]));     // quads aren't a win
  assert.ok(!isWin([5, 5, 7]));        // must be exactly 4 cards
});

test('completions lists winning 4th ranks for a trio, ascending', () => {
  assert.deepEqual(completions([7, 7, 7]), [6, 8]);
  assert.deepEqual(completions([7, 7, 2]), [1, 3]);
  assert.deepEqual(completions([11, 11, 11]), [12, 13]);
  assert.deepEqual(completions([2, 5, 9]), []);
});

test('label renders A and faces', () => {
  assert.equal(label(1), 'A');
  assert.equal(label(10), '10');
  assert.equal(label(13), 'K');
});
