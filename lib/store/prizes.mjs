// Real prizes for the Coin Shop (owner, 2026-10-22). Shown LOCKED ("Coming
// soon") until their prices and delivery are set; only the kwacha packs can be
// bought (itemBuyable in ./catalog.mjs). Art: public/ui/prizes/<id>.webp
// (design canvas U29ENtxP8VnDX8KxBhmv1w). Pure, no imports.

// HIDDEN from players until the owner signs off prices + art (owner 2026-10-26: "still working on it").
export const PRIZES_LIVE = false;

export const PRIZE_TIERS = Object.freeze([
  { id: 'everyday', title: 'Everyday prizes', pay: 'Coins', items: [
    ['cap', 'BwanaBet Cap'], ['buckethat', 'BwanaBet Bucket Hat'], ['tshirt', 'BwanaBet T-shirt'], ['football', 'Football'], ['powerbank', 'Power Bank'],
  ] },
  { id: 'big', title: 'Big prizes', pay: 'Coins + emeralds', items: [
    ['hoodie', 'BwanaBet Hoodie'], ['wifi', 'Wi-Fi + 1 Year Bundle'], ['iphonex', 'iPhone X'], ['galaxyultra', 'Samsung Galaxy Ultra'],
  ] },
  { id: 'top', title: 'Top prizes', pay: 'Rubies + diamonds', items: [
    ['iphone18', 'iPhone 18 Pro'], ['tv', '50" TV'], ['scooter', 'Electric Scooter'], ['car', 'Honda Fit'],
  ] },
].map(t => Object.freeze({ ...t, items: t.items.map(([id, name]) => Object.freeze({ id, name, art: `/ui/prizes/${id}.webp` })) })));

export const PRIZE_COUNT = PRIZE_TIERS.reduce((n, t) => n + t.items.length, 0);
