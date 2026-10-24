import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RTP_DEFAULT, RTP_MIN, RTP_MAX, MAX_MULT, STAKES, DEFAULT_STAKE,
  clampRtp, drawCrash, survival, payoutFor, multAt, timeFor, cashOutWins, shownAt, endTime, settleOnClose,
} from '../lib/chicken2/crash.mjs';

// Seeded uniform [0,1) so the statistics are reproducible.
function seeded(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const N = 200_000;
// A run of rounds as the game plays them: each draw knows the previous crash point.
function sample(stake, rtp, seed = 7) {
  const r = seeded(seed), out = new Float64Array(N);
  let prev = null;
  for (let i = 0; i < N; i++) prev = out[i] = drawCrash(stake, rtp, r, prev);
  return out;
}

test('defaults: RTP 98%, range [0.97, 0.99], 5,000x ceiling, stakes 1/5/10/20 (max win 100,000)', () => {
  assert.equal(RTP_DEFAULT, 0.98);
  assert.equal(RTP_MIN, 0.97);
  assert.equal(RTP_MAX, 0.99);
  assert.equal(MAX_MULT, 5000);
  assert.deepEqual(STAKES, [1, 5, 10, 20]);
  assert.equal(DEFAULT_STAKE, 5);
  assert.equal(payoutFor(20, MAX_MULT), 100_000);
  assert.equal(payoutFor(1, MAX_MULT), 5_000);
});

test('survival is the crash curve P(C >= x) = RTP / x, the same at every stake', () => {
  for (const s of STAKES) {
    assert.ok(Math.abs(survival(s, 1.49) - 0.98 / 1.49) < 1e-12);
    assert.ok(Math.abs(survival(s, 1.5) - 0.98 / 1.5) < 1e-12);
    assert.ok(Math.abs(survival(s, 2) - 0.49) < 1e-12);
    assert.ok(Math.abs(survival(s, 50) - 0.0196) < 1e-12);
    assert.equal(survival(s, 1), 1);
    assert.equal(survival(s, 5000.01), 0);
  }
});

test('sampled P(C >= x) ~= survival for x in {1.01, 1.5, 2, 3, 5, 10, 50}, no-repeat redraw included', () => {
  for (const [stake, rtp, seed] of [[20, 0.98, 11], [1, 0.97, 12], [5, 0.99, 13]]) {
    const C = sample(stake, rtp, seed);
    for (const x of [1.01, 1.5, 2, 3, 5, 10, 50]) {
      let n = 0; for (const c of C) if (c >= x) n++;
      const p = n / N, want = survival(stake, x, rtp);
      const tol = 4 * Math.sqrt(want * (1 - want) / N) + 1e-4;
      assert.ok(Math.abs(p - want) < tol, `stake ${stake} rtp ${rtp} x ${x}: got ${p.toFixed(5)} want ${want.toFixed(5)}`);
    }
  }
});

test('crash points: 2-decimal, within [1.00, 5,000], never the same twice in a row, no clumping (not even at stake 1)', () => {
  for (const stake of STAKES) {
    const C = sample(stake, 0.98, 3 + stake);
    for (let i = 0; i < N; i++) {
      const c = C[i];
      assert.ok(c >= 1 && c <= MAX_MULT, `out of range ${c}`);
      assert.equal(Math.round(c * 100), +(c * 100).toFixed(6), `not 2-decimal ${c}`);
      if (i) assert.notEqual(c, C[i - 1], `stake ${stake}: ${c} twice in a row at round ${i}`);
    }
    // between 1.00 and 5,000 the most common point is 1.01, at under 1% of rounds
    const counts = new Map();
    for (const c of C) if (c > 1 && c < MAX_MULT) counts.set(c, (counts.get(c) || 0) + 1);
    assert.ok(Math.max(...counts.values()) / N < 0.011, `stake ${stake} clumps`);
  }
});

test('a repeat of prev is drawn again; u at the ends gives 1.00 and 5,000', () => {
  assert.equal(drawCrash(1, 0.98, () => 0), 1);
  assert.equal(drawCrash(1, 0.98, () => 0.99999999), MAX_MULT);
  const us = [0, 0, 0.5];
  const c = drawCrash(1, 0.98, () => us.shift(), 1);
  assert.ok(c > 1, `got ${c}`);
});

test('instant-crash rate (C = 1.00) is 1 - RTP / 1.01 (1.01x already pays more than the stake)', () => {
  for (const rtp of [0.98, 0.97]) {
    const C = sample(10, rtp, rtp === 0.98 ? 5 : 6);
    let n = 0; for (const c of C) if (c === 1) n++;
    const p = n / N, want = 1 - rtp / 1.01, tol = 4 * Math.sqrt(want * (1 - want) / N);
    assert.ok(Math.abs(p - want) < tol, `rtp ${rtp}: instant ${p} want ${want}`);
  }
});

test('EV of a fixed cash-out over a run of rounds ~= RTP in coins (stake × x whole)', () => {
  for (const [stake, x, seed] of [[10, 1.5, 9], [1, 2, 10], [20, 5, 14], [5, 10, 15], [20, 1.05, 16], [10, 50, 17]]) {
    const C = sample(stake, 0.98, seed);
    const pay = payoutFor(stake, x);
    let ret = 0;
    for (const c of C) if (cashOutWins(x, c)) ret += pay;
    const ev = ret / N / stake, q = survival(stake, x);
    const tol = 4 * (pay / stake) * Math.sqrt(q * (1 - q) / N);
    assert.ok(Math.abs(ev - 0.98) < tol, `EV stake ${stake} at ${x}: ${ev}`);
  }
});

test('a cash-out wins only when the crash point is at or above it, never at 1.00', () => {
  assert.equal(cashOutWins(2, 2), true);
  assert.equal(cashOutWins(2.01, 2), false);
  assert.equal(cashOutWins(1.5, 3.2), true);
  assert.equal(cashOutWins(1, 5), false);   // 1.00x is not a cash-out
  assert.equal(cashOutWins(1.01, 1), false); // instant crash beats everything
});

test('RTP is validated and clamped to [0.97, 0.99]', () => {
  assert.equal(clampRtp(0.98), 0.98);
  assert.equal(clampRtp(0.5), 0.97);
  assert.equal(clampRtp(0.85), 0.97);
  assert.equal(clampRtp(1.2), 0.99);
  assert.equal(clampRtp(0.99), 0.99);
  for (const bad of [undefined, null, NaN, Infinity, '0.95', {}]) assert.equal(clampRtp(bad), RTP_DEFAULT, String(bad));
  assert.equal(clampRtp(-1), RTP_MIN);
  // drawCrash clamps too: an RTP of 2 behaves like 0.99
  const r = seeded(1); let n = 0, prev = null;
  for (let i = 0; i < 50_000; i++) { prev = drawCrash(10, 2, r, prev); if (prev === 1) n++; }
  const want = 1 - 0.99 / 1.01;
  assert.ok(Math.abs(n / 50_000 - want) < 0.003, `rtp 2 -> instant ${n / 50_000}`);
});

test('drawCrash uses crypto when no rng is given; rejects unknown stakes', () => {
  const c = drawCrash(5, 0.98);
  assert.ok(c >= 1 && c <= MAX_MULT);
  assert.throws(() => drawCrash(7, 0.98));
  assert.throws(() => drawCrash(100, 0.98));
});

test('payouts: stake × x rounded DOWN to whole coins, never above 100,000', () => {
  for (const s of STAKES) {
    for (let m = 100; m <= 500_000; m += (m < 10_000 ? 1 : 97)) {
      const p = payoutFor(s, m / 100);
      assert.equal(p, Math.floor((s * m) / 100), `${s} x ${m / 100} -> ${p}`);
      assert.ok(p <= 100_000 && p >= s, `${s} x ${m / 100} -> ${p}`);
    }
  }
  assert.equal(payoutFor(20, 1.15), 23); // no float drift
  assert.equal(payoutFor(1, 1.49), 1);
  assert.equal(payoutFor(1, 1.99), 1);   // stake 1: only whole multipliers add a coin
  assert.equal(payoutFor(1, 2), 2);
  assert.equal(payoutFor(5, 1.1), 5);    // 5.5 → 5, never up
  assert.equal(payoutFor(5, 2.37), 11);
  assert.equal(payoutFor(10, 9999), 50_000); // the multiplier is capped at 5,000x
  assert.throws(() => payoutFor(7, 2));
});

test('growth curve: 2x in 5-6 s, 10x in 18-22 s, 5,000x in 69-73 s, timeFor inverts multAt', () => {
  assert.equal(multAt(0), 1);
  const t2 = timeFor(2), t10 = timeFor(10), tMax = timeFor(5000);
  assert.ok(t2 >= 5 && t2 <= 6, `2x at ${t2}`);
  assert.ok(t10 >= 18 && t10 <= 22, `10x at ${t10}`);
  assert.ok(tMax >= 69 && tMax <= 73, `5,000x at ${tMax}`);
  for (const x of [1.01, 1.5, 3.33, 7, 42.5]) assert.ok(Math.abs(multAt(timeFor(x)) - x) < 1e-9);
});

test('the counter: shown multiplier is floored, freezes at the crash point; he falls just past it', () => {
  assert.equal(shownAt(0, 5), 1);
  assert.equal(shownAt(timeFor(2.37) + 1e-6, 5), 2.37);
  assert.equal(shownAt(timeFor(9), 2.37), 2.37);
  assert.equal(shownAt(timeFor(6000)), MAX_MULT);
  assert.ok(endTime(2.37) > timeFor(2.37) && Math.abs(endTime(2.37) - timeFor(2.38)) < 1e-12);
  assert.equal(endTime(5000), timeFor(5000));
});

test('closing mid-run settles like a cash-out at that moment', () => {
  assert.deepEqual(settleOnClose(timeFor(1.8) + 1e-6, 3), { win: true, mult: 1.8 });
  assert.deepEqual(settleOnClose(endTime(3) + .01, 3), { win: false, mult: 3 });
  assert.deepEqual(settleOnClose(.05, 2), { win: true, mult: 1 });   // before 1.01x: stake back
  assert.deepEqual(settleOnClose(.05, 1), { win: false, mult: 1 });  // instant crash: lost
  assert.deepEqual(settleOnClose(timeFor(5000) + 1, 5000), { win: true, mult: 5000 });
  assert.equal(payoutFor(5, settleOnClose(.05, 2).mult), 5);
});
