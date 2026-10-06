import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RTP_DEFAULT, RTP_MIN, RTP_MAX, MAX_MULT, STAKES,
  clampRtp, drawCrash, payoutFor, multAt, timeFor, cashOutWins, shownAt, endTime, settleOnClose,
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
function sample(rtp, seed = 7) {
  const r = seeded(seed), out = new Float64Array(N);
  for (let i = 0; i < N; i++) out[i] = drawCrash(rtp, r);
  return out;
}

test('defaults: RTP 98%, range [0.80, 0.99], 10x ceiling, stakes 5/10/20', () => {
  assert.equal(RTP_DEFAULT, 0.98);
  assert.equal(RTP_MIN, 0.80);
  assert.equal(RTP_MAX, 0.99);
  assert.equal(MAX_MULT, 10);
  assert.deepEqual(STAKES, [5, 10, 20]);
});

test('P(C >= x) ~= RTP / x for x in {1.5, 2, 3, 5, 10}', () => {
  for (const rtp of [0.98, 0.9]) {
    const C = sample(rtp, rtp === 0.98 ? 11 : 12);
    for (const x of [1.5, 2, 3, 5, 10]) {
      let n = 0; for (const c of C) if (c >= x) n++;
      const p = n / N, want = rtp / x;
      const tol = 4 * Math.sqrt(want * (1 - want) / N) + 1e-4;
      assert.ok(Math.abs(p - want) < tol, `rtp ${rtp} x ${x}: got ${p.toFixed(5)} want ${want.toFixed(5)} (tol ${tol.toFixed(5)})`);
    }
  }
});

test('crash points: 2-decimal, within [1.00, 10]', () => {
  const C = sample(0.98, 3);
  for (let i = 0; i < 5000; i++) {
    const c = C[i];
    assert.ok(c >= 1 && c <= MAX_MULT, `out of range ${c}`);
    assert.equal(Math.round(c * 100), +(c * 100).toFixed(6), `not 2-decimal ${c}`);
  }
});

// An instant crash = C is 1.00: he falls before the counter reaches 1.01, the
// first cash-out. That is 1 - RTP (the raw draw under 1.00) plus the sliver of
// raw draws in [1.00, 1.01), which floor to 1.00 too: 1 - RTP / 1.01 in all
// (2.97% at RTP 98%). Nobody can cash those out, so EV stays exactly RTP.
test('instant-crash rate (C = 1.00) ~= 1 - RTP (+ the sub-1.01 sliver)', () => {
  for (const rtp of [0.98, 0.85]) {
    const C = sample(rtp, rtp === 0.98 ? 5 : 6);
    let n = 0; for (const c of C) if (c === 1) n++;
    const p = n / N, want = 1 - rtp / 1.01, tol = 4 * Math.sqrt(want * (1 - want) / N);
    assert.ok(Math.abs(p - want) < tol, `rtp ${rtp}: instant ${p} want ${want}`);
    assert.ok(p >= 1 - rtp && p - (1 - rtp) < 0.011, `rtp ${rtp}: instant ${p} vs 1 - RTP ${1 - rtp}`);
  }
});

test('EV of a fixed cash-out at 2x ~= RTP (and at 1.5x / 5x / 10x)', () => {
  const C = sample(0.98, 9);
  for (const x of [2, 1.5, 5, 10]) {
    let ret = 0;
    for (const c of C) if (cashOutWins(x, c)) ret += x;
    const ev = ret / N, tol = 4 * x * Math.sqrt((0.98 / x) * (1 - 0.98 / x) / N);
    assert.ok(Math.abs(ev - 0.98) < tol, `EV at ${x}: ${ev}`);
  }
});

test('a cash-out wins only when the crash point is at or above it, never at 1.00', () => {
  assert.equal(cashOutWins(2, 2), true);
  assert.equal(cashOutWins(2.01, 2), false);
  assert.equal(cashOutWins(1.5, 3.2), true);
  assert.equal(cashOutWins(1, 5), false);   // 1.00x is not a cash-out
  assert.equal(cashOutWins(1.01, 1), false); // instant crash beats everything
});

test('RTP is validated and clamped to [0.80, 0.99]', () => {
  assert.equal(clampRtp(0.98), 0.98);
  assert.equal(clampRtp(0.5), 0.80);
  assert.equal(clampRtp(1.2), 0.99);
  assert.equal(clampRtp(0.99), 0.99);
  for (const bad of [undefined, null, NaN, Infinity, '0.95', {}, -1]) {
    const v = clampRtp(bad);
    assert.ok(v === RTP_DEFAULT || v === RTP_MIN, `bad ${String(bad)} -> ${v}`);
  }
  assert.equal(clampRtp('0.95'), RTP_DEFAULT);
  assert.equal(clampRtp(NaN), RTP_DEFAULT);
  // drawCrash clamps too: an RTP of 2 behaves like 0.99
  const r = seeded(1); let n = 0;
  for (let i = 0; i < 50_000; i++) if (drawCrash(2, r) === 1) n++;
  assert.ok(Math.abs(n / 50_000 - (1 - 0.99 / 1.01)) < 0.003, `rtp 2 -> instant ${n / 50_000}`);
});

test('drawCrash uses crypto when no rng is given', () => {
  const c = drawCrash(0.98);
  assert.ok(c >= 1 && c <= 10);
});

test('payouts are whole numbers and never above 200', () => {
  for (const s of STAKES) {
    for (let m = 100; m <= 1000; m++) {
      const p = payoutFor(s, m / 100);
      assert.ok(Number.isInteger(p), `${s} x ${m / 100} -> ${p}`);
      assert.ok(p <= 200, `${s} x ${m / 100} -> ${p}`);
      assert.ok(p >= s, `${s} x ${m / 100} -> ${p}`);
    }
  }
  assert.equal(payoutFor(20, 10), 200);
  assert.equal(payoutFor(20, 1.15), 23); // no float drift (20 * 1.15 = 22.999…)
  assert.equal(payoutFor(5, 2.37), 11);
  assert.equal(payoutFor(10, 99), 100); // the multiplier is capped at 10x
  assert.throws(() => payoutFor(7, 2));
});

test('growth curve: 2x in 5-6 s, 10x in 18-22 s, timeFor inverts multAt', () => {
  assert.equal(multAt(0), 1);
  const t2 = timeFor(2), t10 = timeFor(10);
  assert.ok(t2 >= 5 && t2 <= 6, `2x at ${t2}`);
  assert.ok(t10 >= 18 && t10 <= 22, `10x at ${t10}`);
  for (const x of [1.01, 1.5, 3.33, 7]) assert.ok(Math.abs(multAt(timeFor(x)) - x) < 1e-9);
});

test('the counter: shown multiplier is floored, freezes at the crash point; he falls just past it', () => {
  assert.equal(shownAt(0, 5), 1);
  assert.equal(shownAt(timeFor(2.37) + 1e-6, 5), 2.37);
  assert.equal(shownAt(timeFor(9), 2.37), 2.37);
  assert.ok(endTime(2.37) > timeFor(2.37) && Math.abs(endTime(2.37) - timeFor(2.38)) < 1e-12);
  assert.equal(endTime(10), timeFor(10));
});

test('closing mid-run settles like a cash-out at that moment', () => {
  assert.deepEqual(settleOnClose(timeFor(1.8) + 1e-6, 3), { win: true, mult: 1.8 });
  assert.deepEqual(settleOnClose(endTime(3) + .01, 3), { win: false, mult: 3 });
  assert.deepEqual(settleOnClose(.05, 2), { win: true, mult: 1 });   // before 1.01x: stake back
  assert.deepEqual(settleOnClose(.05, 1), { win: false, mult: 1 });  // instant crash: lost
  assert.deepEqual(settleOnClose(timeFor(10) + 1, 10), { win: true, mult: 10 });
  assert.equal(payoutFor(5, settleOnClose(.05, 2).mult), 5);
});
