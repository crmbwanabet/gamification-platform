import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAKES, SYMBOLS, SYMBOL_IDS, MAX_WIN, expectedMultiplier, payoutFor, resolveCard } from '../lib/scratch/odds.mjs';

// Scripted rng: returns the given values in order, then repeats the last one.
const seq = (...vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)]; };
// Small deterministic PRNG (mulberry32) for property sweeps.
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('stakes, symbols and the approved multiplier ladder', () => {
  assert.deepEqual(STAKES, [10, 20, 30, 50]);
  assert.equal(MAX_WIN, 200);
  assert.equal(SYMBOLS.length, 6);
  assert.deepEqual(SYMBOLS.map(s => s.mult), [1.2, 1.5, 2, 2.5, 3, 4]);
  assert.equal(new Set(SYMBOL_IDS).size, 6);
  for (const s of SYMBOLS) {
    assert.ok(typeof s.name === 'string' && s.name.length > 0);
    assert.ok(s.p > 0 && s.p < 1, `${s.id} p`);
  }
  assert.ok(SYMBOLS.reduce((a, s) => a + s.p, 0) < 1, 'some cards must lose');
});

test('EV computed exactly: sum p × payout / stake = 0.95 ± 0.002 at every stake', () => {
  assert.ok(Math.abs(expectedMultiplier() - 0.95) <= 0.002, `ev ${expectedMultiplier()}`);
  for (const stake of STAKES) {
    const ev = SYMBOLS.reduce((a, s) => a + s.p * payoutFor(stake, s.mult), 0) / stake;
    assert.ok(Math.abs(ev - 0.95) <= 0.002, `stake ${stake}: ev ${ev}`);
  }
});

test('payouts are whole numbers and never exceed the 200 cap; top prize is 50 × 4 = 200', () => {
  for (const stake of STAKES) {
    for (const s of SYMBOLS) {
      const p = payoutFor(stake, s.mult);
      assert.ok(Number.isInteger(p), `${stake} × ${s.mult}`);
      assert.ok(p <= MAX_WIN, `${stake} × ${s.mult} = ${p}`);
      assert.equal(p, Math.round(stake * s.mult));
    }
  }
  assert.equal(payoutFor(50, 4), 200);
});

test('a winning card always shows 3 of the winning symbol and pays its multiplier', () => {
  let cum = 0;
  for (const s of SYMBOLS) {
    const card = resolveCard(30, seq(cum + s.p / 2, 0.5, 0.5, 0.5));
    cum += s.p;
    assert.equal(card.win, true, s.id);
    assert.equal(card.symbol, s.id);
    assert.deepEqual(card.panels, [s.id, s.id, s.id]);
    assert.equal(card.mult, s.mult);
    assert.equal(card.payout, payoutFor(30, s.mult));
    assert.equal(card.nearMiss, false);
  }
});

test('a losing card never has 3 matching, pays 0, and its panels are valid symbols', () => {
  const rng = mulberry(42);
  let losses = 0, nearMisses = 0;
  for (let i = 0; i < 20000; i++) {
    const card = resolveCard(STAKES[i % 4], rng);
    for (const id of card.panels) assert.ok(SYMBOL_IDS.includes(id));
    assert.equal(card.panels.length, 3);
    const counts = card.panels.reduce((m, id) => ((m[id] = (m[id] || 0) + 1), m), {});
    const top = Math.max(...Object.values(counts));
    if (card.win) {
      assert.equal(top, 3);
      assert.equal(card.panels[0], card.symbol);
      assert.ok(card.payout > 0);
    } else {
      losses++;
      assert.ok(top < 3, `losing card with 3 matching: ${card.panels}`);
      assert.equal(card.payout, 0);
      assert.equal(card.symbol, null);
      assert.equal(card.nearMiss, top === 2);
      if (top === 2) nearMisses++;
    }
  }
  const share = nearMisses / losses;
  assert.ok(share > 0.25 && share < 0.6, `near-miss share of losses ${share}`);
});

test('forced near-miss loss: exactly two matching panels', () => {
  const lossU = SYMBOLS.reduce((a, s) => a + s.p, 0) + 0.01;
  const card = resolveCard(10, seq(lossU, 0, 0.99, 0.5, 0.5));
  assert.equal(card.win, false);
  assert.equal(card.nearMiss, true);
  assert.equal(new Set(card.panels).size, 2);
});

test('an injected rng is deterministic', () => {
  const a = [], b = [];
  const r1 = mulberry(7), r2 = mulberry(7);
  for (let i = 0; i < 500; i++) { a.push(resolveCard(20, r1)); b.push(resolveCard(20, r2)); }
  assert.deepEqual(a, b);
});

test('invalid stake throws', () => {
  for (const bad of [0, 15, '10', NaN, undefined, -10, 100]) {
    assert.throws(() => resolveCard(bad, () => 0), `stake ${String(bad)}`);
    assert.throws(() => payoutFor(bad, 2), `stake ${String(bad)}`);
  }
});

test('default rng: 20 000 cards give a mean multiplier of 0.95 ± 0.03', () => {
  const N = 20000;
  let sum = 0;
  for (let i = 0; i < N; i++) sum += resolveCard(10).payout / 10;
  const mean = sum / N;
  assert.ok(Math.abs(mean - 0.95) <= 0.03, `mean ${mean}`);
});
