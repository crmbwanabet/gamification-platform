// Real prizes for the Coin Shop (owner, 2026-10-22; prices + gem conversion
// 2026-10-26). Art: public/ui/prizes/<id>.webp (design canvas
// U29ENtxP8VnDX8KxBhmv1w). Pure, relative imports only.
//
// The PRICES live in store_items rows (prize_id = the ids below, one row per
// price option, migration 2026-10-26-real-prizes.sql) and are bought through
// the usual POST /api/purchase -> purchase_item path. Remote-config row
// `prizes` = { open, testers, convertRate }: until open is true only the
// tester ids see the prizes and the gem -> coin conversion (the server checks
// the same row in /api/purchase and /api/gems/convert).
import { GEMS, gemCoins } from '../economy/currency.mjs';

export const PRIZE_TIERS = Object.freeze([
  { id: 'everyday', title: 'Everyday prizes', pay: 'Coins', items: [
    ['cap', 'BwanaBet Cap'], ['buckethat', 'BwanaBet Bucket Hat'], ['tshirt', 'BwanaBet T-shirt'], ['football', 'Football'], ['powerbank', 'Power Bank'],
  ] },
  { id: 'big', title: 'Big prizes', pay: 'Coins or gems', items: [
    ['hoodie', 'BwanaBet Hoodie'], ['wifi', 'Wi-Fi Router + 1 Year Bundle'], ['scooter', 'Electric Scooter'], ['iphonex', 'iPhone X (refurbished)'],
  ] },
  { id: 'top', title: 'Top prizes', pay: 'Rubies or diamonds', items: [
    ['tv', '55" TV'], ['galaxyultra', 'Samsung Galaxy S26 Ultra'], ['iphone18', 'iPhone 18 Pro'], ['car', 'Honda Fit (2012-2015)'],
  ] },
].map(t => Object.freeze({ ...t, items: t.items.map(([id, name]) => Object.freeze({ id, name, art: `/ui/prizes/${id}.webp` })) })));

export const PRIZE_COUNT = PRIZE_TIERS.reduce((n, t) => n + t.items.length, 0);
export const PRIZE_IDS = PRIZE_TIERS.flatMap(t => t.items.map(i => i.id));

// Gems -> coins at 75% of the gem's coin value (owner 2026-10-26).
export const CONVERT_RATE = 0.75;
export const PRIZES_DEFAULTS = Object.freeze({ open: false, testers: [], convertRate: CONVERT_RATE });

/** The `prizes` config row -> { open, testers: string[], convertRate in (0, 1] }. */
export function cleanPrizesConfig(v) {
  const o = v !== null && typeof v === 'object' && !Array.isArray(v) ? v : {};
  const testers = Array.isArray(o.testers) ? o.testers.map(String).filter(s => /^\d{1,12}$/.test(s)) : [];
  const r = o.convertRate;
  const convertRate = typeof r === 'number' && Number.isFinite(r) && r > 0 && r <= 1 ? r : CONVERT_RATE;
  return { open: o.open === true, testers, convertRate };
}

/** Prizes + gem conversion open for this player: everyone once open, else the testers only. */
export function prizesOpenFor(cfg, uid) {
  const c = cleanPrizesConfig(cfg);
  if (c.open) return true;
  return uid != null && c.testers.includes(String(uid));
}

/** A tester while the prizes are still closed (skips the level lock to preview them). */
export function prizesTester(cfg, uid) {
  const c = cleanPrizesConfig(cfg);
  return !c.open && uid != null && c.testers.includes(String(uid));
}

/** Coins paid for `count` gems: floor(count x gem coin value x rate), as convert_gems pays. */
export function convertCoins(gem, count, economy, rate = CONVERT_RATE) {
  if (!GEMS.includes(gem) || !Number.isInteger(count) || count < 1) return 0;
  return Math.floor(count * gemCoins(gem, economy) * rate);
}

/** Catalog items (buildStoreCatalog, prizeId set) -> { [prizeId]: options[] } in catalog order. */
export function prizeOptions(items) {
  const out = {};
  for (const it of Array.isArray(items) ? items : []) {
    if (!it || !PRIZE_IDS.includes(it.prizeId)) continue;
    (out[it.prizeId] ||= []).push(it);
  }
  return out;
}
