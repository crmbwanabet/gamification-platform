import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PRIZE_IDS, PRIZE_COUNT, cleanPrizesConfig, prizesOpenFor, convertOpenFor, prizesTester, convertCoins, buyOpenFor, buyGemCost, BUY_RATE, prizeOptions, shopPrizes, priceKwacha, CONVERT_RATE } from '../lib/store/prizes.mjs';
import { buildStoreCatalog, splitCatalog } from '../lib/store/catalog.mjs';
import { mergeConfig } from '../lib/config/merge.mjs';
import { purchaseMessage } from '../lib/telegram/format.mjs';

test('13 real prizes, unique ids', () => {
  assert.equal(PRIZE_COUNT, 13);
  assert.equal(new Set(PRIZE_IDS).size, 13);
});

test('prizes config: closed by default, testers are digit ids, rate in (0, 1]', () => {
  assert.deepEqual(cleanPrizesConfig(null), { open: false, convert: false, buy: true, testers: [], convertRate: 0.75, buyRate: 1.25 });
  assert.deepEqual(cleanPrizesConfig({ open: 'yes', convert: 1, testers: ['53', 7, 'abc', ''], convertRate: 2 }), { open: false, convert: false, buy: true, testers: ['53', '7'], convertRate: 0.75, buyRate: 1.25 });
  assert.deepEqual(cleanPrizesConfig({ open: true, convert: true, convertRate: 0.5 }), { open: true, convert: true, buy: true, testers: [], convertRate: 0.5, buyRate: 1.25 });
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

test('conversion has its own switch: prizes open for all, convert for testers only', () => {
  const cfg = { open: true, convert: false, testers: ['53'] };
  assert.equal(prizesOpenFor(cfg, '54'), true);
  assert.equal(convertOpenFor(cfg, '54'), false);
  assert.equal(convertOpenFor(cfg, '53'), true);
  assert.equal(convertOpenFor({ convert: true }, '54'), true);
});

test('shop prizes: only prizes with live options, cheapest option first', () => {
  const eco = { coinsPerKwacha: 10000, gemValues: { emerald: 200000, ruby: 500000, diamond: 1000000 } };
  assert.equal(priceKwacha({ kwacha: 700000 }, eco), 70);
  assert.equal(priceKwacha({ kwacha: 0, emeralds: 5 }, eco), 100);
  assert.equal(priceKwacha({ diamonds: 40 }, eco), 4000);
  const items = [
    { id: 'c1', prizeId: 'car', price: { kwacha: 0, diamonds: 500 } },
    { id: 'x1', prizeId: 'iphonex', price: { kwacha: 0, rubies: 100 } },
    { id: 'x2', prizeId: 'iphonex', price: { kwacha: 0, diamonds: 40 } },
    { id: 'f1', prizeId: 'football', price: { kwacha: 700000 } },
    { id: 's1', prizeId: 'scooter', price: { kwacha: 0, emeralds: 300 } },
  ];
  const cards = shopPrizes(items, eco);
  assert.deepEqual(cards.map(c => c.prize.id), ['football', 'iphonex', 'scooter', 'car']);
  assert.equal(cards[1].prize.name, 'iPhone X');
  assert.deepEqual(cards[1].options.map(o => o.id), ['x1', 'x2']);
  assert.equal(cards[0].prize.art, '/ui/prizes/football.webp');
});

test('coins buy gems at 125% of their value, rounded up; on unless buy: false', () => {
  const eco = { coinsPerKwacha: 10000, gemValues: { emerald: 200000, ruby: 500000, diamond: 1000000 } };
  assert.equal(BUY_RATE, 1.25);
  assert.equal(buyGemCost('diamonds', 1, eco), 1250000); // owner's example
  assert.equal(buyGemCost('rubies', 1, eco), 625000);
  assert.equal(buyGemCost('emeralds', 2, eco), 500000);
  assert.equal(buyGemCost('emeralds', 1, { gemValues: { emerald: 3 } }, 1.5), 5);
  assert.equal(buyGemCost('gems', 1, eco), 0);
  assert.equal(buyGemCost('emeralds', 0, eco), 0);
  // a round trip always loses coins
  for (const g of ['emeralds', 'rubies', 'diamonds']) assert.ok(convertCoins(g, 1, eco) < buyGemCost(g, 1, eco));
  assert.equal(cleanPrizesConfig({ buyRate: 0.9 }).buyRate, 1.25); // below 1 would sell gems under value
  assert.equal(cleanPrizesConfig({ buyRate: 1.5 }).buyRate, 1.5);
  assert.equal(buyOpenFor(null, '54'), true);
  assert.equal(buyOpenFor({ buy: false, testers: ['53'] }, '53'), true);
  assert.equal(buyOpenFor({ buy: false, testers: ['53'] }, '54'), false);
});
