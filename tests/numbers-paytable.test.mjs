import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POOL, PICKS, STAKES, DEFAULT_STAKE, MAX_WIN, TOP_MULT, TIERS, tierIndex, tierPays, probabilities, paytableFor, rtpOf,
  payoutFor, validatePicks, drawNumbers, resolveDraw, countMatches,
} from '../lib/numbers/paytable.mjs';

// Seeded LCG in [0, 1) — deterministic stand-in for the CSPRNG
function seeded(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 2 ** 32; };
}

test('game shape: pick 6 of 1–20, stakes 1/5/10/20 (default 5)', () => {
  assert.equal(POOL, 20);
  assert.equal(PICKS, 6);
  assert.deepEqual(STAKES, [1, 5, 10, 20]);
  assert.equal(DEFAULT_STAKE, 5);
  assert.equal(MAX_WIN, 200);
  assert.equal(TOP_MULT, 10);
});

test('paytable per stake (98% default): 2 → 1.2x, 3 → 1.6x (half up), 4 solved, 5+ = 10x where the band allows', () => {
  assert.deepEqual(paytableFor(1).pays, [0, 0, 1, 2, 6, 7, 7]);
  assert.deepEqual(paytableFor(5).pays, [0, 0, 6, 8, 27, 50, 50]);
  assert.deepEqual(paytableFor(10).pays, [0, 0, 12, 16, 55, 100, 100]);
  assert.deepEqual(paytableFor(20).pays, [0, 0, 24, 32, 109, 200, 200]);
  assert.deepEqual(tierPays(20), [24, 32, 109, 200]);
  assert.deepEqual(TIERS.map(t => t.label), ['2', '3', '4', '5+']);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(tierIndex), [-1, -1, 0, 1, 2, 3, 3]);
  for (const s of STAKES) {
    const { pays } = paytableFor(s);
    for (let k = 1; k <= 6; k++) assert.ok(pays[k] >= pays[k - 1], 'never pays less for more matches');
    assert.ok(pays[2] >= s, '2 matches at least returns the stake');
  }
});

test('the configured RTP moves the 4-match prize inside the band', () => {
  assert.deepEqual(paytableFor(20, 0.97).pays[4], 104);
  assert.deepEqual(paytableFor(20, 0.99).pays[4], 115);
  assert.ok(paytableFor(20, 0.97).rtp < paytableFor(20, 0.98).rtp && paytableFor(20, 0.98).rtp < paytableFor(20, 0.99).rtp);
  assert.deepEqual(paytableFor(20, 0.5), paytableFor(20, 0.97)); // clamped
  assert.deepEqual(paytableFor(1, 0.97), paytableFor(1, 0.99));  // stake 1 has a single in-band table
});

test('hypergeometric probabilities are exact and sum to 1', () => {
  const p = probabilities();
  assert.equal(p.length, 7);
  const T = 38760; // C(20, 6)
  const counts = [3003, 12012, 15015, 7280, 1365, 84, 1];
  counts.forEach((c, k) => assert.ok(Math.abs(p[k] - c / T) < 1e-15, `P(${k})`));
  assert.ok(Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12);
});

test('RTP at every stake is inside [0.97, 0.99] and matches the exact sum', () => {
  const p = probabilities();
  for (const s of STAKES) {
    const { pays, rtp } = paytableFor(s);
    const ev = p.reduce((a, x, k) => a + x * pays[k], 0) / s;
    assert.ok(Math.abs(ev - rtp) < 1e-12 && Math.abs(rtpOf(s, pays) - rtp) < 1e-12);
    assert.ok(rtp >= 0.97 && rtp <= 0.99, `stake ${s}: ${rtp}`);
  }
});

test('payouts are whole numbers and never exceed 200', () => {
  for (const s of STAKES) {
    for (let k = 0; k <= 6; k++) {
      const p = payoutFor(s, k);
      assert.ok(Number.isInteger(p), `${s} × ${k} matches`);
      assert.ok(p <= MAX_WIN, `${s} × ${k} = ${p}`);
    }
  }
  assert.equal(payoutFor(20, 6), 200);
  assert.equal(payoutFor(5, 2), 6);
  assert.throws(() => payoutFor(30, 3));
  assert.throws(() => payoutFor(10, 7));
});

test('draw returns 6 unique integers in 1..20', () => {
  for (let i = 0; i < 500; i++) {
    const d = drawNumbers();
    assert.equal(d.length, 6);
    assert.equal(new Set(d).size, 6);
    for (const n of d) assert.ok(Number.isInteger(n) && n >= 1 && n <= 20, `n ${n}`);
  }
});

test('injected rng is deterministic', () => {
  assert.deepEqual(drawNumbers(seeded(7)), drawNumbers(seeded(7)));
  assert.notDeepEqual(drawNumbers(seeded(7)), drawNumbers(seeded(8)));
  // rng() → 0 always takes the first remaining number
  assert.deepEqual(drawNumbers(() => 0), [1, 2, 3, 4, 5, 6]);
  const seq = [0.5, 0.1, 0.9, 0.3, 0.7, 0.2];
  const fixed = () => { let i = 0; return () => seq[i++ % seq.length]; };
  assert.deepEqual(drawNumbers(fixed()), drawNumbers(fixed()));
  const r = resolveDraw(10, [1, 2, 3, 4, 5, 6], () => 0);
  assert.deepEqual(r, { drawn: [1, 2, 3, 4, 5, 6], matches: 6, win: true, payout: 100 });
});

test('resolveDraw counts matches and pays the table', () => {
  const picks = [1, 2, 3, 15, 16, 17];
  const r = resolveDraw(20, picks, () => 0); // drawn 1..6 → 3 matches
  assert.equal(r.matches, 3);
  assert.equal(r.payout, 32);
  assert.equal(r.win, true);
  assert.equal(resolveDraw(1, [1, 2, 13, 14, 15, 16], () => 0).payout, 1); // 2 matches at stake 1: the stake back
  assert.equal(resolveDraw(20, [1, 2, 3, 4, 15, 16], () => 0, 0.99).payout, 115);
  const lose = resolveDraw(5, [20, 19, 18, 17, 16, 7], () => 0);
  assert.deepEqual(lose, { drawn: [1, 2, 3, 4, 5, 6], matches: 0, win: false, payout: 0 });
  assert.equal(countMatches([1, 2, 3], [3, 4, 1]), 2);
});

test('invalid picks and stakes throw', () => {
  assert.throws(() => validatePicks([1, 2, 3, 4, 5]), /6/);
  assert.throws(() => validatePicks([1, 2, 3, 4, 5, 6, 7]));
  assert.throws(() => validatePicks([1, 1, 2, 3, 4, 5]), /duplicate/);
  assert.throws(() => validatePicks([0, 1, 2, 3, 4, 5]), /range/);
  assert.throws(() => validatePicks([1, 2, 3, 4, 5, 21]), /range/);
  assert.throws(() => validatePicks([1, 2, 3, 4, 5, 2.5]));
  assert.throws(() => validatePicks('123456'));
  assert.doesNotThrow(() => validatePicks([20, 1, 7, 13, 2, 9]));
  assert.throws(() => resolveDraw(10, [1, 2, 3, 4, 5]));
  assert.throws(() => resolveDraw(15, [1, 2, 3, 4, 5, 6]));
  assert.throws(() => paytableFor(2));
});

test('20 000 simulated draws at stake 10: mean return within ±0.03 of the table RTP', () => {
  const rng = seeded(20261007);
  const picks = [3, 7, 11, 14, 18, 20];
  let sum = 0;
  const N = 20000;
  for (let i = 0; i < N; i++) sum += resolveDraw(10, picks, rng).payout / 10;
  const mean = sum / N;
  assert.ok(Math.abs(mean - paytableFor(10).rtp) <= 0.03, `mean ${mean}`);
});
