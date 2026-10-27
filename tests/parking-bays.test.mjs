import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundHalfUp, roundUp } from '../lib/rtp.mjs';
import { STAKES, winChance, payoutFor } from '../lib/pick6/engine.mjs';
import { SPOTS } from '../lib/penalty/spots.mjs';
import { BAYS, BAY_IDS, bayWinChance, playBay, multLabel } from '../lib/parking/bays.mjs';

// rng that returns the given draws in order (then repeats the last one)
const seq = (...xs) => { let i = 0; return () => xs[Math.min(i++, xs.length - 1)]; };

test('6 bays = the 6 penalty spots, same ids, order, rows and multipliers', () => {
  assert.equal(BAYS.length, 6);
  assert.deepEqual(BAY_IDS, SPOTS.map(s => s.id));
  BAYS.forEach((b, i) => {
    assert.equal(b.index, i);
    assert.equal(b.mult, SPOTS[i].mult);
    assert.equal(b.row, SPOTS[i].row);
    assert.equal(b.col, SPOTS[i].col);
    assert.match(b.c, /^#[0-9A-F]{6}$/i);
  });
  assert.deepEqual(BAYS.filter(b => b.row === 0).map(b => b.mult), [4, 1.5, 3]);
  assert.deepEqual(BAYS.filter(b => b.row === 1).map(b => b.mult), [2.5, 1.2, 2]);
  assert.equal(multLabel(1.5), '×1.5');
});

test('win chance per bay per stake = the pick6 formula rtp × stake / half-up payout', () => {
  for (const rtp of [undefined, 0.97, 0.98, 0.99]) {
    for (const b of BAYS) for (const s of STAKES) {
      const expected = Math.min(1, (rtp ?? 0.98) * s / roundHalfUp(s, b.mult));
      const got = bayWinChance(s, b.index, rtp);
      assert.ok(Math.abs(got - expected) < 1e-12, `bay ${b.id} stake ${s} rtp ${rtp}`);
      assert.equal(got, winChance(s, b.mult, rtp));
    }
  }
});

test('rng decides win / loss; a win pays the rounded-UP payout, a loss pays 0 and the taxi takes YOUR bay', () => {
  for (const b of BAYS) for (const s of STAKES) {
    const p = bayWinChance(s, b.index);
    const win = playBay(s, b.index, seq(0, 0));
    assert.equal(win.win, true);
    assert.equal(win.payout, payoutFor(s, b.mult));
    assert.equal(win.payout, roundUp(s, b.mult));

    const justIn = playBay(s, b.index, seq(p - 1e-9, 0.5));
    assert.equal(justIn.win, true, `just under the chance wins (${b.id} ${s})`);

    const lose = playBay(s, b.index, seq(p));
    assert.equal(lose.win, false, `at the chance loses (${b.id} ${s})`);
    assert.equal(lose.payout, 0);
    assert.equal(lose.rival, b.index);
  }
});

test('on a win the rival taxi never takes your bay, and every other bay can be its bay', () => {
  for (const b of BAYS) {
    const seen = new Set();
    for (let k = 0; k < 100; k++) {
      const r = playBay(10, b.index, seq(0, k / 100));
      assert.equal(r.win, true);
      assert.notEqual(r.rival, b.index);
      assert.ok(Number.isInteger(r.rival) && r.rival >= 0 && r.rival < 6);
      seen.add(r.rival);
    }
    const r = playBay(10, b.index, seq(0, 0.9999999999));
    assert.notEqual(r.rival, b.index);
    assert.equal(seen.size, 5, `all 5 other bays reachable from ${b.id}`);
  }
});

test('default crypto rng: wins never share your bay, losses always do', () => {
  for (let k = 0; k < 2000; k++) {
    const i = k % 6;
    const r = playBay(STAKES[k % 4], i);
    if (r.win) { assert.notEqual(r.rival, i); assert.ok(r.payout > 0); }
    else { assert.equal(r.rival, i); assert.equal(r.payout, 0); }
  }
});

test('bad bay or stake throws', () => {
  assert.throws(() => playBay(10, 6, seq(0)));
  assert.throws(() => playBay(10, -1, seq(0)));
  assert.throws(() => playBay(10, '0', seq(0)));
  assert.throws(() => playBay(5, 0, seq(0)));
  assert.throws(() => bayWinChance(10, 9));
});
