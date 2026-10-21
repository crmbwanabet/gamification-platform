import { test } from 'node:test';
import assert from 'node:assert/strict';
import { anchorDay, countsFrom, rowsFromAnchor, rowsFromAnchors } from '../lib/season/anchor.mjs';
import { verifyWorldCupPrize } from '../lib/season/verify.mjs';

test('anchorDay = the Lusaka (UTC+2) day of the first daily claim', () => {
  assert.equal(anchorDay(null), null);
  assert.equal(anchorDay(undefined), null);
  assert.equal(anchorDay(''), null);
  assert.equal(anchorDay('junk'), null);
  assert.equal(anchorDay('2026-10-20T10:00:00Z'), '2026-10-20');
  assert.equal(anchorDay('2026-10-20T22:30:00Z'), '2026-10-21'); // 00:30 in Lusaka
  assert.equal(anchorDay(new Date('2026-10-20T21:59:59Z')), '2026-10-20');
});

test('the anchor day itself counts, earlier days never, no anchor = nothing', () => {
  assert.equal(countsFrom('2026-10-20', '2026-10-20'), true);
  assert.equal(countsFrom('2026-10-21', '2026-10-20'), true);
  assert.equal(countsFrom('2026-10-19', '2026-10-20'), false);
  assert.equal(countsFrom('2026-10-21', null), false);
});

test('rowsFromAnchor drops the days before the first daily claim', () => {
  const rows = [{ day: '2026-10-18', casino_rounds: 9 }, { day: '2026-10-20', casino_rounds: 5 }, { day: '2026-10-21', casino_rounds: 1 }, null];
  assert.deepEqual(rowsFromAnchor(rows, '2026-10-20').map((r) => r.day), ['2026-10-20', '2026-10-21']);
  assert.deepEqual(rowsFromAnchor(rows, null), []);
  assert.deepEqual(rowsFromAnchor(null, '2026-10-20'), []);
});

test('rowsFromAnchors cuts each player by their own anchor; unanchored players drop out', () => {
  const rows = [
    { user_id: 1, day: '2026-10-19' }, { user_id: 1, day: '2026-10-20' },
    { user_id: 2, day: '2026-10-19' }, { user_id: 2, day: '2026-10-20' },
    { user_id: 3, day: '2026-10-20' },
  ];
  const out = rowsFromAnchors(rows, { 1: '2026-10-20', 2: '2026-10-19' });
  assert.deepEqual(out.map((r) => `${r.user_id}:${r.day}`), ['1:2026-10-20', '2:2026-10-19', '2:2026-10-20']);
  assert.deepEqual(rowsFromAnchors(rows, null), []);
});

test('the World Cup prize check ignores activity before the anchor', () => {
  const rows = [{ day: '2026-10-01', casino_stake: 100000, sports_stake: 0 }];
  const v = verifyWorldCupPrize({ rows, today: '2026-10-21', anchor: '2026-10-10' });
  assert.equal(v.won, false);
  assert.equal(v.reason, 'no_activity');
  const none = verifyWorldCupPrize({ rows, today: '2026-10-21', anchor: null });
  assert.equal(none.reason, 'no_activity');
});
