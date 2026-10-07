// Every candy game × every stake: the RTP computed EXACTLY from the engine's
// own tables / functions lies inside [97%, 99%], equals the configured RTP
// wherever the design is exact, and no payout breaks the 200 max-win cap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RTP_DEFAULT, RTP_MIN, RTP_MAX, clampRtp, roundHalfUp } from '../lib/rtp.mjs';
import * as pick6 from '../lib/pick6/engine.mjs';
import * as flip from '../lib/coinflip/engine.mjs';
import * as bottle from '../lib/bottle/wheel.mjs';
import * as scratch from '../lib/scratch/odds.mjs';
import * as numbers from '../lib/numbers/paytable.mjs';
import * as crash from '../lib/chicken2/crash.mjs';
import { SPOTS } from '../lib/penalty/spots.mjs';
import { BIRDS } from '../lib/chicken/birds.mjs';
import { PASSENGERS } from '../lib/minibus/passengers.mjs';

const RTPS = [RTP_MIN, RTP_DEFAULT, RTP_MAX, 0.975, 0.985];
const EPS = 1e-12;
const inBand = (r) => r >= RTP_MIN - EPS && r <= RTP_MAX + EPS;
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);

test('rtp band: default 98%, clamp to [0.97, 0.99], junk → default', () => {
  assert.equal(RTP_DEFAULT, 0.98);
  assert.equal(RTP_MIN, 0.97);
  assert.equal(RTP_MAX, 0.99);
  assert.equal(clampRtp(0.98), 0.98);
  assert.equal(clampRtp(0.5), 0.97);
  assert.equal(clampRtp(0.80), 0.97);
  assert.equal(clampRtp(1.2), 0.99);
  assert.equal(clampRtp(0.975), 0.975);
  for (const bad of [undefined, null, NaN, Infinity, -Infinity, '0.98', {}, [0.98]]) assert.equal(clampRtp(bad), RTP_DEFAULT, String(bad));
});

test('rounding: half up in integer hundredths — no float traps', () => {
  assert.equal(25 * 1.14, 28.499999999999996); // the trap Math.round would fall into
  assert.equal(Math.round(25 * 1.14), 28);
  assert.equal(roundHalfUp(25, 1.14), 29);      // 28.5 → 29
  assert.equal(roundHalfUp(25, 2.3), 58);       // 57.5 (57.4999… in floats)
  assert.equal(roundHalfUp(25, 1.9), 48);       // 47.5
  assert.equal(roundHalfUp(1, 1.5), 2);   // .5 rounds up
  assert.equal(roundHalfUp(1, 1.49), 1);  // .49 rounds down
  assert.equal(roundHalfUp(1, 1.2), 1);   // .2 rounds down
  assert.equal(roundHalfUp(1, 2.5), 3);
  assert.equal(roundHalfUp(25, 1.5), 38); // 37.5
  assert.equal(roundHalfUp(25, 2.5), 63); // 62.5
  assert.equal(roundHalfUp(5, 1.1), 6);   // 5.5
  assert.equal(roundHalfUp(5, 1.09), 5);  // 5.45
  assert.equal(roundHalfUp(20, 1.15), 23); // 22.999… in floats
  assert.equal(roundHalfUp(10, 1.05), 11); // 10.5
  // exhaustive: every stake × every 2-decimal multiplier up to 10x
  for (const s of [1, 5, 10, 20, 25, 50]) {
    for (let m = 100; m <= 1000; m++) {
      const exact = s * m; // hundredths of a coin, an integer
      const want = Math.floor(exact / 100) + (exact % 100 >= 50 ? 1 : 0);
      assert.equal(roundHalfUp(s, m / 100), want, `${s} × ${m / 100}`);
    }
  }
});

test('stakes: 1/10/25/50 for the 4x games, 1/5/10/20 for the 10x games', () => {
  for (const m of [pick6, flip, bottle, scratch]) {
    assert.deepEqual(m.STAKES, [1, 10, 25, 50]);
    assert.equal(m.DEFAULT_STAKE, 10);
  }
  for (const m of [numbers, crash]) {
    assert.deepEqual(m.STAKES, [1, 5, 10, 20]);
    assert.equal(m.DEFAULT_STAKE, 5);
  }
});

const PICK6_GAMES = { penalty: SPOTS, chicken: BIRDS, minibus: PASSENGERS };

test('pick6 (Penalty / Chicken / Minibus): RTP = configured, exactly, at every stake × tile', () => {
  for (const [game, tiles] of Object.entries(PICK6_GAMES)) {
    for (const rtp of RTPS) {
      for (const s of pick6.STAKES) {
        for (const { mult } of tiles) {
          const pay = pick6.payoutFor(s, mult);
          const p = pick6.winChance(s, mult, rtp);
          assert.ok(p > 0 && p < 1, `${game} ${s}×${mult} p=${p}`);
          const r = (p * pay) / s;
          near(r, clampRtp(rtp), `${game} stake ${s} × ${mult}`);
          assert.ok(inBand(r));
          assert.ok(pay <= 200 && pay >= s, `${game} ${s}×${mult} pays ${pay}`);
        }
      }
    }
  }
  assert.equal(pick6.payoutFor(50, 4), 200);
});

test('Coin Flip: RTP = configured, exactly, at every stake (1.9x label kept)', () => {
  assert.deepEqual(flip.STAKES.map(flip.payoutFor), [2, 19, 48, 95]);
  near(flip.winChance(1), 0.49, 'stake 1 → 49%');
  for (const rtp of RTPS) {
    for (const s of flip.STAKES) {
      const r = (flip.winChance(s, rtp) * flip.payoutFor(s)) / s;
      near(r, clampRtp(rtp), `stake ${s}`);
    }
  }
});

test('Bottle Spin: RTP = configured, exactly, at every stake', () => {
  for (const rtp of RTPS) {
    for (const s of bottle.STAKES) {
      const w = bottle.weightsFor(s, rtp);
      assert.ok(w.every(x => x > 0), `stake ${s}: weights ${w}`);
      const total = w.reduce((a, x) => a + x, 0);
      const r = bottle.SEGMENTS.reduce((a, seg, i) => a + w[i] * bottle.payoutFor(s, seg.mult), 0) / (s * total);
      near(r, clampRtp(rtp), `stake ${s}`);
      near(bottle.rtpFor(s, rtp), clampRtp(rtp), `rtpFor ${s}`);
      for (const seg of bottle.SEGMENTS) assert.ok(bottle.payoutFor(s, seg.mult) <= 200);
    }
  }
  assert.equal(bottle.payoutFor(50, 4), 200);
});

test('Scratch Card: RTP = configured, exactly, at every stake', () => {
  for (const rtp of RTPS) {
    for (const s of scratch.STAKES) {
      const p = scratch.winProbs(s, rtp);
      const winP = p.reduce((a, x) => a + x, 0);
      assert.ok(winP > 0.4 && winP < 0.6, `stake ${s}: win chance ${winP}`);
      const r = scratch.SYMBOLS.reduce((a, sym, i) => a + p[i] * scratch.payoutFor(s, sym.mult), 0) / s;
      near(r, clampRtp(rtp), `stake ${s}`);
      for (const sym of scratch.SYMBOLS) assert.ok(scratch.payoutFor(s, sym.mult) <= scratch.MAX_WIN);
    }
  }
  assert.equal(scratch.payoutFor(50, 4), 200);
});

test('Lucky Numbers: whole-coin paytable per stake, RTP inside [97%, 99%], closest to the configured RTP', () => {
  const ways = [3003, 12012, 15015, 7280, 1365, 84, 1]; // out of C(20,6) = 38760
  const exact = (s, pays) => pays.reduce((a, p, k) => a + ways[k] * p, 0) / (38760 * s);
  // documented achieved RTP at the 98% default
  const doc = { 1: [[0, 0, 1, 2, 6, 7, 7], 0.98968], 5: [[0, 0, 6, 8, 27, 50, 50], 0.97748], 10: [[0, 0, 12, 16, 55, 100, 100], 0.98100], 20: [[0, 0, 24, 32, 109, 200, 200], 0.97924] };
  for (const s of numbers.STAKES) {
    const t = numbers.paytableFor(s);
    assert.deepEqual(t.pays, doc[s][0], `stake ${s}`);
    assert.ok(Math.abs(t.rtp - doc[s][1]) < 5e-6, `stake ${s}: ${t.rtp}`);
  }
  for (const rtp of RTPS) {
    for (const s of numbers.STAKES) {
      const { pays, rtp: got } = numbers.paytableFor(s, rtp);
      near(exact(s, pays), got, `stake ${s}`);
      assert.ok(inBand(got), `stake ${s} rtp ${rtp}: ${got}`);
      for (let k = 0; k < pays.length; k++) {
        assert.ok(Number.isInteger(pays[k]) && pays[k] <= 200, `stake ${s}: pays ${pays}`);
        if (k) assert.ok(pays[k] >= pays[k - 1], `stake ${s}: more matches never pay less ${pays}`);
      }
      assert.equal(pays[2], roundHalfUp(s, 1.2));
      assert.equal(pays[3], roundHalfUp(s, 1.6));
      // no other 4-match prize (same top prize) lands closer to the configured RTP
      for (let a4 = pays[3]; a4 <= pays[5]; a4++) {
        const r = exact(s, [0, 0, pays[2], pays[3], a4, pays[5], pays[6]]);
        if (inBand(r)) assert.ok(Math.abs(r - clampRtp(rtp)) >= Math.abs(got - clampRtp(rtp)) - EPS, `stake ${s} a4 ${a4}`);
      }
    }
    // the top prize stays 10x wherever the band allows (5, 10, 20)
    for (const s of [5, 10, 20]) assert.equal(numbers.paytableFor(s, rtp).pays[6], 10 * s);
  }
  assert.equal(numbers.paytableFor(20).pays[6], 200);
});

test('Chicken Catch 2: every cash-out (any stake, any 2-decimal target) returns exactly the RTP', () => {
  for (const rtp of RTPS) {
    for (const s of crash.STAKES) {
      for (let x100 = 101; x100 <= 1000; x100++) {
        const x = x100 / 100;
        const pay = crash.payoutFor(s, x);
        assert.ok(pay <= 200, `${s} × ${x}`);
        const r = (crash.survival(s, x, rtp) * pay) / s;
        near(r, clampRtp(rtp), `stake ${s} cash-out ${x}`);
      }
    }
  }
});

test('Chicken Catch 2: drawCrash realises the survival exactly (u just below / above the boundary)', () => {
  for (const rtp of [0.97, 0.98, 0.99]) {
    for (const s of crash.STAKES) {
      for (const x of [1.01, 1.02, 1.05, 1.1, 1.25, 1.49, 1.5, 1.99, 2, 2.37, 3, 5, 7.77, 9.99, 10]) {
        const edge = crash.survival(s, x, rtp); // P(C ≥ x) must equal P(u < edge)
        assert.ok(crash.drawCrash(s, rtp, () => edge * (1 - 1e-9)) >= x, `${s} ${x} below`);
        assert.ok(crash.drawCrash(s, rtp, () => edge * (1 + 1e-9)) < x, `${s} ${x} above`);
      }
    }
  }
});
