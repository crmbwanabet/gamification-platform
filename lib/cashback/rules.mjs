// Daily gem CASHBACK (owner 2026-10-23). Pure, relative imports only, so
// node --test loads it directly (tests/cashback.test.mjs).
//
// A player gets 5% of their real-money net LOSS on bwanabet (casino + sports,
// stakes minus winnings; bonus money excluded) for each cashback WINDOW,
// 06:00 → 06:00 Lusaka (04:00 → 04:00 UTC), paid as prize gems:
//   cashback (K) = 5% × net loss, in whole ngwee
//   value (coins) = cashback × economy.coinsPerKwacha
//   gems = as many diamonds as fit, then rubies, then the rest ROUNDED TO THE
//          NEAREST emerald (half up): K10 of cashback (a K200 loss) = 1 emerald
//          at the default values, less than that = nothing.
// Gem values come from economy.gemValues (default emerald 200,000 / ruby
// 500,000 / diamond 1,000,000 coins = K20 / K50 / K100).
// The window is named by the Lusaka date it STARTS on: window 2026-10-23 =
// 23 Oct 06:00 → 24 Oct 06:00 Lusaka. Spec: docs/integrations/crm-cashback-feed.md
import { economyRates } from '../economy/currency.mjs';

export const CASHBACK_RATE = 0.05;
export const WINDOW_START_UTC_HOUR = 4; // 06:00 Lusaka (UTC+2, no DST)
const DAY_MS = 86400000;

const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const dayMs = (day) => Date.parse(`${day}T00:00:00Z`);

/** The window that contains `now`: { day, start, end } (ISO times, end exclusive). */
export function windowAt(now = new Date()) {
  const t = now instanceof Date ? now.getTime() : Number(now);
  const day = isoDay(t - WINDOW_START_UTC_HOUR * 3600000);
  return windowFor(day);
}

/** The window named `day` (its Lusaka start date). */
export function windowFor(day) {
  const start = dayMs(day) + WINDOW_START_UTC_HOUR * 3600000;
  return { day, start: new Date(start).toISOString(), end: new Date(start + DAY_MS).toISOString() };
}

/** The latest window that has fully ENDED by `now` (the one paid at 06:00). */
export function lastFinishedWindow(now = new Date()) {
  const t = now instanceof Date ? now.getTime() : Number(now);
  return windowAt(t - DAY_MS).day;
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
