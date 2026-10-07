// Currencies and the coin <-> kwacha economy (2026-10-07). Pure, relative
// imports only, so node --test loads it directly.
//
//   coins     earned in games and missions; stored as user.kwacha (legacy key
//             name, it has always meant coins). 1,000 coins = K1 by default
//             (remote config economy.coinsPerKwacha).
//   emeralds  prize-only gem, worth 5,000 coins (K5)   — state key `emeralds`
//   rubies    prize-only gem, worth 10,000 coins (K10) — state key `rubies`
//   diamonds  prize-only gem, worth 20,000 coins (K20) — state key `diamonds`
//
// Gems are WON AS PRIZES ONLY: nothing sells them and coins never convert into
// them. Kwacha is real money that admins credit to the player's bwanabet
// account after a Store redemption.
//
// The `diamonds` key is REUSED from the retired economy (old diamonds and
// `gems` were test currencies). The state blob carries `currencyVersion: 2`
// once it has been reset; anything without that marker is a pre-reset blob and
// its gem balances count as 0 everywhere (client hydration, /api/state, the
// purchase_item RPC). So an old test balance can never become a K20 diamond.

export const CURRENCY_VERSION = 2;
export const GEMS = ['emeralds', 'rubies', 'diamonds'];
/** Reward/price keys in display order. `kwacha` = coins (legacy key name). */
export const REWARD_KEYS = ['kwacha', ...GEMS];

// Config uses singular gem names (economy.gemValues.emerald); state uses plurals.
export const GEM_CONFIG_KEY = { emeralds: 'emerald', rubies: 'ruby', diamonds: 'diamond' };
export const GEM_LABEL = { emeralds: 'Emerald', rubies: 'Ruby', diamonds: 'Diamond' };

export const DEFAULT_COINS_PER_KWACHA = 1000;
export const DEFAULT_GEM_VALUES = { emerald: 5000, ruby: 10000, diamond: 20000 };
// Upper bounds keep every derived price inside a Postgres integer (the RPC
// enforces the same bounds).
export const MAX_COINS_PER_KWACHA = 1_000_000;
export const MAX_GEM_VALUE = 1_000_000_000;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const posInt = (v, max) => Number.isInteger(v) && v > 0 && v <= max;

/** Validated coinsPerKwacha + gemValues; each bad field falls back to its default. */
export function economyRates(economy) {
  const e = isObj(economy) ? economy : {};
  const coinsPerKwacha = posInt(e.coinsPerKwacha, MAX_COINS_PER_KWACHA) ? e.coinsPerKwacha : DEFAULT_COINS_PER_KWACHA;
  const gv = isObj(e.gemValues) ? e.gemValues : {};
  const gemValues = {};
  for (const k of Object.keys(DEFAULT_GEM_VALUES)) gemValues[k] = posInt(gv[k], MAX_GEM_VALUE) ? gv[k] : DEFAULT_GEM_VALUES[k];
  return { coinsPerKwacha, gemValues };
}

/**
 * Validate an `economy` platform_config row before it is merged: returns only
 * the fields that are safe to apply (bad coinsPerKwacha / gem values are
 * dropped so the default survives; good gem values merge per gem).
 */
export function cleanEconomyRow(row, current = {}) {
  if (!isObj(row)) return null;
  const { coinsPerKwacha, gemValues, ...rest } = row;
  const out = { ...rest };
  if (Object.hasOwn(row, 'coinsPerKwacha') && posInt(coinsPerKwacha, MAX_COINS_PER_KWACHA)) out.coinsPerKwacha = coinsPerKwacha;
  if (isObj(gemValues)) {
    const merged = { ...(isObj(current.gemValues) ? current.gemValues : DEFAULT_GEM_VALUES) };
    let any = false;
    for (const k of Object.keys(DEFAULT_GEM_VALUES)) {
      if (posInt(gemValues[k], MAX_GEM_VALUE)) { merged[k] = gemValues[k]; any = true; }
    }
    if (any) out.gemValues = merged;
  }
  return out;
}

/** Round to whole ngwee (2 dp) without float drift. */
const toNgwee = (k) => Math.round(Number(k) * 100 + Number.EPSILON * 100) / 100;

/** Coins -> kwacha at the configured rate (2 dp). */
export function coinsToKwacha(coins, economy) {
  return toNgwee(coins / economyRates(economy).coinsPerKwacha);
}

/** Kwacha -> coins (whole coins). */
export function kwachaToCoins(k, economy) {
  return Math.round(k * economyRates(economy).coinsPerKwacha);
}

/** Value of one gem ('emeralds' | 'rubies' | 'diamonds') in coins. */
export function gemCoins(gem, economy) {
  return economyRates(economy).gemValues[GEM_CONFIG_KEY[gem]] || 0;
}

/** Value of `n` gems in kwacha (2 dp). */
export function gemKwacha(gem, economy, n = 1) {
  return toNgwee((n * gemCoins(gem, economy)) / economyRates(economy).coinsPerKwacha);
}

/** 5000 -> "5,000". Deterministic (no locale), so SSR and client agree. */
export function formatNumber(n) {
  const v = Number(n) || 0;
  const neg = v < 0;
  const [int, dec] = Math.abs(v).toString().split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${grouped}${dec ? '.' + dec : ''}`;
}

/** 5 -> "K5", 2.5 -> "K2.50", 1000 -> "K1,000". */
export function formatKwacha(k) {
  const v = toNgwee(k);
  if (Number.isInteger(v)) return `K${formatNumber(v)}`;
  const [int, dec] = v.toFixed(2).split('.');
  return `K${formatNumber(Number(int))}.${dec}`;
}

const nonNegInt = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/**
 * Bring a saved user-state blob onto the gem economy. A blob without the
 * currencyVersion marker predates it: legacy `gems` and `diamonds` are reset
 * to 0 and the new gem keys start at 0. A current blob keeps its gems (only
 * sanitised to whole, non-negative numbers). Coins (`kwacha`) are untouched.
 */
export function migrateCurrencyState(state) {
  const s = isObj(state) ? state : {};
  const current = s.currencyVersion === CURRENCY_VERSION;
  const out = { ...s, currencyVersion: CURRENCY_VERSION, gems: 0 };
  for (const g of GEMS) out[g] = current ? nonNegInt(s[g]) : 0;
  return out;
}

/**
 * A reward/price row reduced to the live currencies as whole positive
 * numbers: { kwacha?, emeralds?, rubies?, diamonds? }. Retired `gems` and any
 * junk are dropped, so an old dashboard row can't pay a retired currency.
 */
export function cleanReward(r) {
  if (!isObj(r)) return {};
  const out = {};
  for (const k of REWARD_KEYS) { const v = nonNegInt(r[k]); if (v) out[k] = v; }
  return out;
}

/** Can `balances` ({ kwacha, emeralds, rubies, diamonds }) pay `price`? */
export function canAfford(price, balances) {
  const p = cleanReward(price);
  const b = isObj(balances) ? balances : {};
  return REWARD_KEYS.every(k => !p[k] || (Number(b[k]) || 0) >= p[k]);
}
