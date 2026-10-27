import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as st from '../lib/speedtrap/index.mjs';
import * as c2 from '../lib/chicken2/crash.mjs';

test('Speed Trap uses the Chicken Catch 2 maths unchanged', () => {
  for (const k of ['drawCrash', 'payoutFor', 'survival', 'multAt', 'timeFor', 'shownAt', 'endTime', 'settleOnClose', 'clampRtp']) {
    assert.equal(st[k], c2[k], k);
  }
  assert.deepEqual(st.STAKES, [1, 5, 10, 20]);
  assert.equal(st.DEFAULT_STAKE, 5);
  assert.equal(st.MAX_MULT, 5000);
  assert.equal(st.payoutFor(20, st.MAX_MULT), 100_000);
});

test('a cash-out before the stop wins stake × shown multiplier, rounded up like Chicken Catch 2', () => {
  const crash = 3.12;
  for (const stake of st.STAKES) {
    for (const t of [0.5, 2, 5, 9]) {
      const r = st.cashOutAt(stake, t, crash);
      const m = st.shownAt(t, crash);
      if (m < st.MIN_CASHOUT) { assert.equal(r.state, 'early'); continue; }
      assert.equal(r.state, 'won');
      assert.equal(r.win, true);
      assert.equal(r.mult, m);
      assert.ok(m <= crash);
      assert.equal(r.payout, c2.payoutFor(stake, m));
    }
  }
  assert.equal(st.cashOutAt(1, st.timeFor(1.01) + 0.001, 5).payout, 2);   // 1 × 1.01 → 2 coins
});

test('a cash-out at the crash point still wins; once the counter would pass it, caught', () => {
  const crash = 2.37;
  const atCrash = st.cashOutAt(10, st.timeFor(crash) + 1e-6, crash);
  assert.equal(atCrash.state, 'won');
  assert.equal(atCrash.mult, crash);
  const late = st.cashOutAt(10, st.endTime(crash), crash);
  assert.deepEqual(late, { state: 'caught', win: false, mult: crash, payout: 0 });
  assert.equal(st.cashOutAt(10, st.endTime(crash) + 3, crash).win, false);
});

test('instant stop (1.00×) can never be cashed out', () => {
  for (const t of [0, 0.05, 0.2, 1]) assert.equal(st.cashOutAt(5, t, 1).win, false);
});

test('closing mid-drive settles like Chicken Catch 2', () => {
  assert.deepEqual(st.settleOnClose(st.timeFor(1.5) + 0.01, 4), c2.settleOnClose(st.timeFor(1.5) + 0.01, 4));
  assert.equal(st.settleOnClose(st.endTime(2), 2).win, false);
});

test('never the same stop twice in a row', () => {
  let s = 99;
  const rng = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  let prev = null;
  for (let i = 0; i < 2000; i++) { const c = st.drawCrash(5, 0.98, rng, prev); assert.notEqual(c, prev); prev = c; }
});

test('display helpers: ×N text, gauge, history chips', () => {
  assert.equal(st.fmtMult(1), '×1.00');
  assert.equal(st.fmtMult(2.351), '×2.35');
  assert.equal(st.fmtMult(1250.4), '×1,250');
  assert.equal(st.kmhFor(1), 38);
  assert.equal(st.kmhFor(2), 80);
  assert.equal(st.kmhFor(3, true), 0);
  assert.equal(st.needleFor(1), -90);
  assert.equal(st.needleFor(32), 90);
  assert.equal(st.needleFor(5000), 90);
  assert.equal(st.needleFor(5, true), -90);
  assert.equal(st.histChip(1.4).color, '#FFFFFF');
  assert.equal(st.histChip(3).background, '#43C21A');
  assert.equal(st.histChip(12).background, '#FFD21F');
});
