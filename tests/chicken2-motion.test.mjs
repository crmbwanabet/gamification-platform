import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  chase, lastMiss, plan, frameAt, eggsCollected, runEnd, waveClock, waveRate, clockTime, intensity,
  lungeHand, MISS_U, TAIL,
} from '../lib/chicken2/motion.mjs';
import { endTime, timeFor } from '../lib/chicken2/crash.mjs';

const SEEDS = [1, 42, 777, 123456, 999999];
const CRASHES = [1.00, 1.01, 1.37, 2.00, 2.37, 3.84, 5.5, 9.99];
const round = (seed, crash, cashT = null) => ({ seed, tc: crash >= 10 ? Infinity : endTime(crash), cashT });

test('the chase takes (t, seed) only — the crash point is not an input', () => {
  assert.equal(chase.length, 2);
  assert.equal(lastMiss.length, 2);
  assert.equal(plan.length, 1);
});

test('no foreshadowing: every frame before the crash is identical whatever the crash point', () => {
  for (const seed of SEEDS) {
    const rounds = CRASHES.map(c => round(seed, c));
    const tMax = Math.max(...rounds.map(r => r.tc));
    for (let t = 0.004; t < tMax; t += 0.037) {
      const ref = chase(t, seed);
      for (const r of rounds) {
        if (t >= r.tc) continue;
        const f = frameAt(t, r);
        assert.equal(f.mode, 'run');
        assert.deepEqual(f.s, ref, `seed ${seed} t ${t.toFixed(3)} crash end ${r.tc.toFixed(3)}`);
        assert.equal(eggsCollected(r, t), eggsCollected(round(seed, 10), t));
      }
    }
  }
});

test('the end branch starts from the run state at the end time (no snap, any phase)', () => {
  for (const seed of SEEDS) {
    for (const c of CRASHES) {
      const r = round(seed, c), f = frameAt(r.tc + 0.01, r);
      assert.equal(f.mode, 'fall');
      assert.deepEqual(f.s, chase(r.tc, seed));
      assert.equal(f.end, r.tc);
    }
    // a cash-out stops the run at the cash-out time, before the crash
    const r = round(seed, 5.5, timeFor(2.2));
    assert.equal(runEnd(r), timeFor(2.2));
    assert.equal(frameAt(timeFor(2.2) + .5, r).mode, 'catch');
    assert.deepEqual(frameAt(timeFor(2.2) + .5, r).s, chase(timeFor(2.2), seed));
  }
});

test('a crash can land mid-lunge (hands at her tail) — and the lunge looks the same either way', () => {
  const seed = 42;
  const tm = clockTime(4 + MISS_U);                 // the 5th near-miss, ~2.9x
  const s = chase(tm, seed);
  assert.ok(s.L > 0.95, `full lunge at the miss (L ${s.L})`);
  const r = { seed, tc: tm + 0.005, cashT: null }, max = round(seed, 10);
  assert.deepEqual(frameAt(tm, r).s, frameAt(tm, max).s);
  assert.equal(frameAt(tm + 0.02, r).mode, 'fall');
});

test('near-catches: hands end a few units short of her tail, never on her', () => {
  for (const seed of SEEDS) {
    for (let k = 0; k < 13; k++) {
      const s = chase(clockTime(k + MISS_U), seed);
      const gap = (s.hx - TAIL) - (s.fx + lungeHand(s.I)[0]);
      assert.ok(gap > 1.5 && gap < 10, `seed ${seed} miss ${k}: hand→tail ${gap.toFixed(2)}`);
    }
  }
});

test('the waves get more frantic as the multiplier rises', () => {
  assert.ok(waveRate(0) < waveRate(5.8) && waveRate(5.8) < waveRate(13.5));
  assert.ok(1 / waveRate(0) > 2.2 && 1 / waveRate(19.3) < 1.5);
  assert.equal(intensity(0), 0);
  assert.ok(Math.abs(intensity(timeFor(3)) - 0.5) < 1e-9);
  assert.equal(intensity(timeFor(6)), 1);
  // bigger leaps later on
  const leapAt = (k) => chase(clockTime(k + 0.61), 42).leap;
  assert.ok(leapAt(8) > leapAt(0) * 1.5);
  // more feathers per miss later on
  assert.ok(lastMiss(clockTime(9 + MISS_U) + .01, 42).n > lastMiss(clockTime(MISS_U) + .01, 42).n);
  // the clock is strictly increasing and clockTime inverts it
  for (let t = 0.5; t < 20; t += 0.5) assert.ok(Math.abs(clockTime(waveClock(t)) - t) < 1e-6);
});

test('he always runs forward and the egg plan is seeded (same seed = same round)', () => {
  for (const seed of SEEDS) {
    let prev = chase(0.6, seed).fx;
    for (let t = 0.61; t < 20; t += 0.01) { const x = chase(t, seed).fx; assert.ok(x > prev - 1e-9, `seed ${seed} t ${t}`); prev = x; }
    const P = plan(seed);
    assert.ok(P.te.length > 25);
    P.te.forEach((te, i) => assert.ok(P.tp[i] >= te && P.tp[i] < te + 2, `egg ${i}`));
  }
  assert.deepEqual(chase(3.3, 5), chase(3.3, 5));
  assert.notDeepEqual(chase(3.3, 5), chase(3.3, 6));
});
