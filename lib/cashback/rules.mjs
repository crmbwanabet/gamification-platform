// Daily gem CASHBACK (owner 2026-10-23). Pure, relative imports only, so
// node --test loads it directly (tests/cashback.test.mjs).
//
// A player gets 5% of their real-money net LOSS on bwanabet (casino + sports,
// stakes minus winnings; bonus money excluded) for each cashback WINDOW = one
// UTC day, 00:00Z → 00:00Z (02:00 → 02:00 Lusaka; the CRM only has casino
// totals per UTC day, owner 2026-10-23), paid as prize gems from 06:00 Lusaka
// (04:00Z) the next morning:
//   cashback (K) = 5% × net loss, in whole ngwee
//   value (coins) = cashback × economy.coinsPerKwacha
//   gems = as many diamonds as fit, then rubies, then the rest ROUNDED TO THE
//          NEAREST emerald (half up): K10 of cashback (a K200 loss) = 1 emerald
//          at the default values, less than that = nothing.
// Gem values come from economy.gemValues (default emerald 200,000 / ruby
// 500,000 / diamond 1,000,000 coins = K20 / K50 / K100).
// The window is named by its UTC date: window 2026-10-24 = 24 Oct 00:00Z →
// 25 Oct 00:00Z = 24 Oct 02:00 → 25 Oct 02:00 Lusaka, paid from 25 Oct 06:00
// Lusaka. Spec: docs/integrations/crm-cashback-feed.md
import { economyRates } from '../economy/currency.mjs';

export const CASHBACK_RATE = 0.05;
export const PAY_UTC_HOUR = 4; // gems go out from 06:00 Lusaka (UTC+2, no DST) after the window
const DAY_MS = 86400000;

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (day) => Date.parse(`${day}T00:00:00Z`);

/** The window that contains `now`: { day, start, end, payAt } (ISO times, end exclusive). */
export function windowAt(now = new Date()) {
  const t = now instanceof Date ? now.getTime() : Number(now);
  return windowFor(isoDay(t));
}

/** The window named `day` (its UTC date). */
export function windowFor(day) {
  const start = dayMs(day);
  return {
    day, start: new Date(start).toISOString(), end: new Date(start + DAY_MS).toISOString(),
    payAt: new Date(start + DAY_MS + PAY_UTC_HOUR * 3600000).toISOString(),
  };
}

/** The latest window whose pay time (06:00 Lusaka the next morning) has come by `now`. */
export function lastFinishedWindow(now = new Date()) {
  const t = now instanceof Date ? now.getTime() : Number(now);
  return isoDay(t - DAY_MS - PAY_UTC_HOUR * 3600000);
}

export const nextWindowDay = (day) => isoDay(dayMs(day) + DAY_MS);

/**
 * Net loss (kwacha) -> the award: { lossKwacha, cashbackKwacha, valueCoins,
 * diamonds, rubies, emeralds, paidCoins } (paidCoins = what the gems are worth).
 * No loss / bad input = all zero.
 */
export function cashbackAward(netLoss, economy) {
  const { coinsPerKwacha, gemValues } = economyRates(economy);
  const loss = typeof netLoss === 'number' && Number.isFinite(netLoss) && netLoss > 0 ? Math.round(netLoss * 100) / 100 : 0;
  const cashbackNgwee = Math.round(loss * 100 * CASHBACK_RATE);       // whole ngwee
  const valueCoins = Math.round((cashbackNgwee * coinsPerKwacha) / 100);
  let rest = valueCoins;
  const diamonds = Math.floor(rest / gemValues.diamond); rest -= diamonds * gemValues.diamond;
  const rubies = Math.floor(rest / gemValues.ruby); rest -= rubies * gemValues.ruby;
  const emeralds = Math.floor((2 * rest + gemValues.emerald) / (2 * gemValues.emerald)); // nearest, half up
  return {
    lossKwacha: loss, cashbackKwacha: cashbackNgwee / 100, valueCoins,
    diamonds, rubies, emeralds,
    paidCoins: diamonds * gemValues.diamond + rubies * gemValues.ruby + emeralds * gemValues.emerald,
  };
}

/** True when the award pays at least one gem. */
export const paysGems = (a) => !!a && (a.diamonds > 0 || a.rubies > 0 || a.emeralds > 0);

// Cashback taken as COINS instead (owner 2026-10-28): the player picks gems or
// coins when collecting; the coins are exactly what the gems are worth.
// Since 2026-10-29 ("Choose reward" pop-up) the player can also pick ONE gem
// kind: as many of it as the value buys, the rest in coins. 'gems' = the
// award's own gems (older clients).
export const CASHBACK_TAKES = ['gems', 'coins', 'emeralds', 'rubies', 'diamonds'];
const GEM_KEY = { emeralds: 'emerald', rubies: 'ruby', diamonds: 'diamond' };

/**
 * What a collection worth `pot` coins pays when taken as `take`:
 * { coins, emeralds, rubies, diamonds }. 'coins' = all coins; a gem kind = as
 * many as fit + the rest in coins. ('gems' is not handled here.)
 */
export function cashbackSplit(pot, take, economy) {
  const out = { coins: 0, emeralds: 0, rubies: 0, diamonds: 0 };
  const v = Number.isFinite(pot) && pot > 0 ? Math.floor(pot) : 0;
  if (!GEM_KEY[take]) { out.coins = v; return out; }
  const val = economyRates(economy).gemValues[GEM_KEY[take]];
  out[take] = Math.floor(v / val);
  out.coins = v - out[take] * val;
  return out;
}

/** Coins an award's gems are worth at economy.gemValues. */
export function awardCoins(a, economy) {
  if (!a) return 0;
  const { gemValues } = economyRates(economy);
  const n = (k) => (Number.isInteger(a[k]) && a[k] > 0 ? a[k] : 0);
  return n('diamonds') * gemValues.diamond + n('rubies') * gemValues.ruby + n('emeralds') * gemValues.emerald;
}
