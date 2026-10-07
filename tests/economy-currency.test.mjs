import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  economyRates, cleanEconomyRow, coinsToKwacha, kwachaToCoins, gemCoins, gemKwacha,
  formatKwacha, formatNumber, migrateCurrencyState, cleanReward, canAfford, CURRENCY_VERSION,
} from '../lib/economy/currency.mjs';

test('defaults: 1,000 coins = K1; emerald K5, ruby K10, diamond K20', () => {
  assert.deepEqual(economyRates(undefined), { coinsPerKwacha: 1000, gemValues: { emerald: 5000, ruby: 10000, diamond: 20000 } });
  assert.equal(coinsToKwacha(1000), 1);
  assert.equal(coinsToKwacha(3400), 3.4);
  assert.equal(kwachaToCoins(50), 50000);
  assert.equal(gemCoins('emeralds'), 5000);
  assert.equal(gemKwacha('emeralds'), 5);
  assert.equal(gemKwacha('rubies'), 10);
  assert.equal(gemKwacha('diamonds'), 20);
  assert.equal(gemKwacha('diamonds', undefined, 3), 60);
});

test('conversions follow the configured rate', () => {
  const eco = { coinsPerKwacha: 2000, gemValues: { emerald: 5000, ruby: 10000, diamond: 20000 } };
  assert.equal(coinsToKwacha(5000, eco), 2.5);
  assert.equal(kwachaToCoins(5, eco), 10000);
  assert.equal(gemKwacha('emeralds', eco), 2.5);
  assert.equal(gemKwacha('rubies', { coinsPerKwacha: 3000 }), 3.33); // whole ngwee
});

test('economyRates: each invalid field falls back on its own', () => {
  assert.equal(economyRates({ coinsPerKwacha: 0 }).coinsPerKwacha, 1000);
  assert.equal(economyRates({ coinsPerKwacha: 12.5 }).coinsPerKwacha, 1000);
  assert.equal(economyRates({ coinsPerKwacha: '1000' }).coinsPerKwacha, 1000);
  assert.equal(economyRates({ coinsPerKwacha: 2_000_000 }).coinsPerKwacha, 1000); // above the cap
  assert.equal(economyRates({ coinsPerKwacha: 500 }).coinsPerKwacha, 500);
  assert.deepEqual(economyRates({ gemValues: { ruby: 12000, diamond: -3 } }).gemValues, { emerald: 5000, ruby: 12000, diamond: 20000 });
});

test('cleanEconomyRow keeps other economy fields and drops bad rates', () => {
  assert.deepEqual(cleanEconomyRow({ extraPlayCost: 60, coinsPerKwacha: -1 }), { extraPlayCost: 60 });
  assert.deepEqual(cleanEconomyRow({ coinsPerKwacha: 1500 }), { coinsPerKwacha: 1500 });
  assert.equal(cleanEconomyRow('nope'), null);
});

test('formatKwacha / formatNumber', () => {
  assert.equal(formatKwacha(1), 'K1');
  assert.equal(formatKwacha(5), 'K5');
  assert.equal(formatKwacha(2.5), 'K2.50');
  assert.equal(formatKwacha(3.333), 'K3.33');
  assert.equal(formatKwacha(1000), 'K1,000');
  assert.equal(formatKwacha(1234.5), 'K1,234.50');
  assert.equal(formatKwacha(0), 'K0');
  assert.equal(formatNumber(3400), '3,400');
  assert.equal(formatNumber(1000000), '1,000,000');
  assert.equal(formatNumber(12), '12');
  assert.equal(formatNumber(-5000), '-5,000');
});

test('state migration: a legacy blob loses gems + old diamonds, new keys start at 0', () => {
  const legacy = { kwacha: 3400, gems: 900, diamonds: 30, xp: 120, refundedPurchaseIds: ['x'] };
  const out = migrateCurrencyState(legacy);
  assert.equal(out.currencyVersion, CURRENCY_VERSION);
  assert.equal(out.gems, 0);
  assert.equal(out.diamonds, 0); // an old test diamond can never become a K20 diamond
  assert.equal(out.emeralds, 0);
  assert.equal(out.rubies, 0);
  assert.equal(out.kwacha, 3400); // coins untouched
  assert.equal(out.xp, 120);
  assert.deepEqual(out.refundedPurchaseIds, ['x']);
  // even a blob that already happens to carry emeralds is reset when unmarked
  assert.equal(migrateCurrencyState({ emeralds: 4 }).emeralds, 0);
});

test('state migration: a current blob keeps its gems (sanitised)', () => {
  const cur = { currencyVersion: 2, kwacha: 10, emeralds: 2, rubies: 1, diamonds: 1, gems: 7 };
  const out = migrateCurrencyState(cur);
  assert.deepEqual([out.emeralds, out.rubies, out.diamonds, out.gems], [2, 1, 1, 0]);
  const junk = migrateCurrencyState({ currencyVersion: 2, emeralds: -3, rubies: 'x', diamonds: 1.7 });
  assert.deepEqual([junk.emeralds, junk.rubies, junk.diamonds], [0, 0, 1]);
  assert.deepEqual(migrateCurrencyState(null), { currencyVersion: 2, gems: 0, emeralds: 0, rubies: 0, diamonds: 0 });
  assert.equal(migrateCurrencyState(migrateCurrencyState({ diamonds: 9 })).diamonds, 0); // idempotent
});

test('cleanReward keeps only live currencies as whole positive numbers', () => {
  assert.deepEqual(cleanReward({ kwacha: 50, gems: 5, emeralds: 1, rubies: 0, diamonds: 2, xp: 30 }), { kwacha: 50, emeralds: 1, diamonds: 2 });
  assert.deepEqual(cleanReward({ kwacha: -10, rubies: 'x' }), {});
  assert.deepEqual(cleanReward(null), {});
});

test('canAfford checks every currency in the price', () => {
  const bal = { kwacha: 3400, emeralds: 1, rubies: 0, diamonds: 2 };
  assert.equal(canAfford({ kwacha: 1000 }, bal), true);
  assert.equal(canAfford({ kwacha: 5000 }, bal), false);
  assert.equal(canAfford({ emeralds: 1 }, bal), true);
  assert.equal(canAfford({ rubies: 1 }, bal), false);
  assert.equal(canAfford({ kwacha: 0, diamonds: 2 }, bal), true);
  assert.equal(canAfford({ kwacha: 500, diamonds: 3 }, bal), false);
});
