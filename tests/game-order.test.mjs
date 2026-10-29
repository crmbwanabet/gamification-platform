import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lusakaMonth, previousMonthRange, rankGames, roundsByGame, cleanGameOrder, applyOrder } from '../lib/games/order.mjs';

const IDS = ['njuka', 'coinflip', 'penalty', 'chicken', 'tower'];

test('lusakaMonth uses UTC+2', () => {
  assert.equal(lusakaMonth(new Date('2026-10-31T21:59:59Z')), '2026-10');
  assert.equal(lusakaMonth(new Date('2026-10-31T22:00:00Z')), '2026-11'); // 00:00 Lusaka on 1 Nov
  assert.equal(lusakaMonth('2026-12-31T23:00:00Z'), '2027-01');
});

test('previousMonthRange = the whole previous Lusaka month', () => {
  assert.deepEqual(previousMonthRange('2026-11'), { from: '2026-09-30T22:00:00.000Z', to: '2026-10-31T22:00:00.000Z' });
  assert.deepEqual(previousMonthRange('2027-01'), { from: '2026-11-30T22:00:00.000Z', to: '2026-12-31T22:00:00.000Z' });
  assert.deepEqual(previousMonthRange('2026-03'), { from: '2026-01-31T22:00:00.000Z', to: '2026-02-28T22:00:00.000Z' });
  assert.throws(() => previousMonthRange('2026-1'));
});

test('rankGames sorts by rounds desc; ties + unplayed keep default order; unknown dropped', () => {
  const rows = [
    { game: 'penalty', rounds: 50 }, { game: 'chicken', rounds: 50 }, { game: 'coinflip', rounds: 90 },
    { game: '?', rounds: 999 }, { game: 'wheel', rounds: 500 }, { game: 'njuka', rounds: 0 },
  ];
  assert.deepEqual(rankGames(rows, IDS), ['coinflip', 'penalty', 'chicken', 'njuka', 'tower']);
  assert.deepEqual(rankGames([], IDS), IDS);
  assert.deepEqual(rankGames(null, IDS), IDS);
});

test('roundsByGame sums known ids and ignores junk', () => {
  assert.deepEqual(roundsByGame([{ game: 'njuka', rounds: '12' }, { game: 'njuka', rounds: 3 }, { game: 'x', rounds: 5 }, { game: 'tower', rounds: 'abc' }], IDS), { njuka: 15 });
});

test('cleanGameOrder keeps unique known ids only', () => {
  assert.deepEqual(cleanGameOrder({ month: '2026-11', order: ['penalty', 'bogus', 'penalty', 3, 'njuka'] }, IDS), ['penalty', 'njuka']);
  assert.deepEqual(cleanGameOrder(['chicken'], IDS), ['chicken']);
  assert.deepEqual(cleanGameOrder({ order: 'njuka' }, IDS), []);
  assert.deepEqual(cleanGameOrder(null, IDS), []);
});

test('applyOrder: saved order first, missing keep default position, comingSoon always last', () => {
  const games = [
    { id: 'njuka' }, { id: 'coinflip' }, { id: 'penalty' }, { id: 'chicken' },
    { id: 'tower', comingSoon: true }, { id: 'parking', comingSoon: true },
  ];
  const ids = (list) => list.map((g) => g.id);
  assert.deepEqual(ids(applyOrder(games, ['penalty', 'tower', 'chicken'])), ['penalty', 'chicken', 'njuka', 'coinflip', 'tower', 'parking']);
  assert.deepEqual(ids(applyOrder(games, ['parking', 'tower'])), ['njuka', 'coinflip', 'penalty', 'chicken', 'parking', 'tower']);
  assert.deepEqual(ids(applyOrder(games, [])), ids(games));
  assert.deepEqual(ids(applyOrder(games, undefined)), ids(games));
  assert.notEqual(applyOrder(games, []), games); // new array, input untouched
});
