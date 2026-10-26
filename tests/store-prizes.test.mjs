import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRIZE_IDS, PRIZE_COUNT, cleanPrizesConfig, prizesOpenFor, prizesTester, convertCoins, prizeOptions, CONVERT_RATE } from '../lib/store/prizes.mjs';
import { buildStoreCatalog, splitCatalog } from '../lib/store/catalog.mjs';
import { mergeConfig } from '../lib/config/merge.mjs';
import { purchaseMessage } from '../lib/telegram/format.mjs';

test('13 real prizes, unique ids', () => {
  assert.equal(PRIZE_COUNT, 13);
  assert.equal(new Set(PRIZE_IDS).size, 13);
});

test('prizes config: closed by default, testers are digit ids, rate in (0, 1]', () => {
  assert.deepEqual(cleanPrizesConfig(null), { open: false, testers: [], convertRate: 0.75 });
  assert.deepEqual(cleanPrizesConfig({ open: 'yes', testers: ['53', 7, 'abc', ''], convertRate: 2 }), { open: false, testers: ['53', '7'], convertRate: 0.75 });
  assert.deepEqual(cleanPrizesConfig({ open: true, convertRate: 0.5 }), { open: true, testers: [], convertRate: 0.5 });
  assert.equal(mergeConfig({ prizes: { open: false, testers: [], convertRate: 0.75 } }, [{ key: 'prizes', value: { open: true } }]).prizes.open, true);
});

test('only testers see closed prizes; everyone once open', () => {
  const closed = { open: false, testers: ['53'] };
  assert.equal(prizesOpenFor(closed, '53'), true);
  assert.equal(prizesOpenFor(closed, 53), true);
  assert.equal(prizesOpenFor(closed, '54'), false);
  assert.equal(prizesOpenFor(closed, null), false);
  assert.equal(prizesTester(closed, '53'), true);
  assert.equal(prizesOpenFor({ open: true }, '54'), true);
  assert.equal(prizesTester({ open: true, testers: ['53'] }, '53'), false); // open = the normal level lock again
});

test('gems convert at 75% of their coin value, floored', () => {
  const eco = { coinsPerKwacha: 10000, gemValues: { emerald: 200000, ruby: 500000, diamond: 1000000 } };
  assert.equal(CONVERT_RATE, 0.75);
  assert.equal(convertCoins('emeralds', 1, eco), 150000);
  assert.equal(convertCoins('rubies', 2, eco), 750000);
  assert.equal(convertCoins('diamonds', 1, eco), 750000);
  assert.equal(convertCoins('emeralds', 1, { gemValues: { emerald: 3 } }, 0.5), 1);
  assert.equal(convertCoins('gems', 1, eco), 0);
  assert.equal(convertCoins('emeralds', 0, eco), 0);
  assert.equal(convertCoins('emeralds', 1.5, eco), 0);
});

test('prize rows group by prize_id and stay out of the other items', () => {
  const rows = [
    { id: 'a', name: 'Power Bank', prize_id: 'powerbank', price_kwacha: 1000000, stock: null },
    { id: 'b', name: 'Power Bank', prize_id: 'powerbank', price_kwacha: 0, price_emeralds: 5, stock: null },
    { id: 'c', name: 'Mug', price_kwacha: 100, stock: null },
    { id: 'd', name: 'Ghost', prize_id: 'nope', price_kwacha: 1, stock: null },
  ];
  const cat = buildStoreCatalog(rows, undefined);
  assert.equal(cat[0].prizeId, 'powerbank');
  assert.equal('prizeId' in cat[2], false);
  const { items, prizes } = splitCatalog(cat);
  assert.deepEqual(items.map(i => i.id), ['c']);
  assert.deepEqual(prizes.map(i => i.id), ['a', 'b', 'd']);
  const opts = prizeOptions(prizes);
  assert.deepEqual(Object.keys(opts), ['powerbank']); // unknown prize ids are ignored
  assert.deepEqual(opts.powerbank.map(o => o.price), [{ kwacha: 1000000 }, { kwacha: 0, emeralds: 5 }]);
});

test('Telegram: a real prize asks for delivery', () => {
  const m = purchaseMessage({ id: '12345678-aaaa', uid: '99', item_name: 'Power Bank', price_kwacha: 0, price_emeralds: 5 }, { prize: true });
  assert.match(m, /REAL PRIZE #12345678/);
  assert.match(m, /Prize: Power Bank/);
  assert.match(m, /Paid: 5 Emeralds/);
  assert.match(m, /arrange delivery/);
});
