// Avatar items (2026-10-20): virtual things the player buys with coins in the
// Coin Shop and the story hero WEARS in the avatar pictures. Pure, no imports
// except the generated art manifest, so node --test loads it directly.
//
// Art = one transparent PNG LAYER per item, drawn in the 600x540 frame of the
// full-body hero pictures (public/vuma/hero-NN.jpg; the player stands in the
// same spot at every stage, so one layer fits them all):
//   public/vuma/items/<id>.png      shared layer, every stage
//   public/vuma/items/<id>-NN.png   this stage only (overrides the shared one)
// `npm run avatar:items` cuts the layers out of Grok edits and regenerates
// ./art.generated.mjs (docs/vuma/avatar-items-art.md). An item is SOLD only
// once its art covers all stages (owner decision: hold items until the art is
// ready). The round header / level-up avatar shows a crop of the hero picture
// (HEAD_CROP) with the layers whenever an item is worn.
import { ITEM_ART } from './art.generated.mjs';

export const STAGE_COUNT = 23; // = VUMA_STAGES.length (pinned by tests/avatar-items.test.mjs)

// Drawn back to front: the TV stands behind the player, the ball goes on top.
export const AVATAR_ITEMS = [
  { id: 'tv', name: '50" TV', slot: 'room', price: 150000, desc: 'A big screen behind you' },
  { id: 'tshirt', name: 'T-shirt', slot: 'top', price: 30000, desc: 'Worn over your kit' },
  { id: 'hoodie', name: 'Hoodie', slot: 'top', price: 60000, desc: 'Worn over your kit' },
  { id: 'cap', name: 'Cap', slot: 'head', price: 20000, desc: 'On your head' },
  { id: 'football', name: 'Football', slot: 'ball', price: 40000, desc: 'Under your arm' },
];
const BY_ID = new Map(AVATAR_ITEMS.map((it) => [it.id, it]));
export const itemById = (id) => BY_ID.get(id) || null;

/** The hero picture's head-and-shoulders square used for the round avatar. */
export const HERO_FRAME = { w: 600, h: 540 };
export const HEAD_CROP = { x: 185, y: 80, size: 230 };

const pad = (n) => String(n).padStart(2, '0');
const artOf = (id, art) => (art && Object.hasOwn(art, id) ? art[id] : null);

/** The layer URL for an item at a stage, or null when no art covers it. */
export function layerSrc(id, stage, art = ITEM_ART) {
  const a = artOf(id, art);
  if (!a) return null;
  const v = a.v ? `?v=${a.v}` : '';
  if (Array.isArray(a.stages) && a.stages.includes(stage)) return `/vuma/items/${id}-${pad(stage)}.png${v}`;
  return a.shared ? `/vuma/items/${id}.png${v}` : null;
}

/** True when every stage has art for the item (only then is it sold). */
export function itemReady(id, art = ITEM_ART) {
  const a = artOf(id, art);
  if (!a) return false;
  if (a.shared) return true;
  const s = new Set(Array.isArray(a.stages) ? a.stages : []);
  for (let i = 1; i <= STAGE_COUNT; i++) if (!s.has(i)) return false;
  return true;
}

/**
 * Remote-config row `avatar_items`: { "<id>": { "price": 25000, "enabled": false } }.
 * Unknown ids and bad values are dropped (price = positive integer up to 10M).
 */
export function cleanAvatarItems(v, base = {}) {
  const out = { ...base };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const id of Object.keys(v)) {
    if (!BY_ID.has(id) || !v[id] || typeof v[id] !== 'object') continue;
    const cur = { ...(out[id] || {}) };
    const { price, enabled } = v[id];
    if (Number.isInteger(price) && price > 0 && price <= 10_000_000) cur.price = price;
    if (typeof enabled === 'boolean') cur.enabled = enabled;
    out[id] = cur;
  }
  return out;
}

/** Default config shape: { tv: { price, enabled }, ... }. */
export const avatarItemDefaults = () => Object.fromEntries(AVATAR_ITEMS.map((it) => [it.id, { price: it.price, enabled: true }]));

/** The shop list: enabled items whose art is ready, with the configured price. */
export function shopAvatarItems(cfg, art = ITEM_ART) {
  const c = cfg || {};
  return AVATAR_ITEMS
    .filter((it) => c[it.id]?.enabled !== false && itemReady(it.id, art))
    .map((it) => ({ ...it, price: Number.isInteger(c[it.id]?.price) && c[it.id].price > 0 ? c[it.id].price : it.price }));
}

/** user.avatarItems -> { owned: [...ids], worn: [...ids] } (worn ⊆ owned, one per slot). */
export function normalizeAvatarItems(v) {
  const owned = [...new Set((Array.isArray(v?.owned) ? v.owned : []).filter((id) => BY_ID.has(id)))];
  const worn = [];
  const slots = new Set();
  for (const id of Array.isArray(v?.worn) ? v.worn : []) {
    const it = BY_ID.get(id);
    if (!it || !owned.includes(id) || slots.has(it.slot)) continue;
    slots.add(it.slot);
    worn.push(id);
  }
  return { owned, worn };
}

/** Wear one item (taking off whatever shares its slot) or take it off. */
export function setWorn(v, id, on) {
  const s = normalizeAvatarItems(v);
  const it = BY_ID.get(id);
  if (!it || !s.owned.includes(id)) return s;
  const worn = s.worn.filter((w) => w !== id && (!on || BY_ID.get(w).slot !== it.slot));
  return { owned: s.owned, worn: on ? [...worn, id] : worn };
}

/**
 * Buy an item with coins. Returns { ok, coins, items } (the new balance and
 * avatarItems; the item is worn straight away) or { ok: false, reason }.
 */
export function buyAvatarItem(v, id, price, coins) {
  const s = normalizeAvatarItems(v);
  if (!BY_ID.has(id)) return { ok: false, reason: 'unknown' };
  if (s.owned.includes(id)) return { ok: false, reason: 'owned' };
  if (!Number.isInteger(price) || price <= 0) return { ok: false, reason: 'unknown' };
  const have = Number(coins) || 0;
  if (have < price) return { ok: false, reason: 'coins', short: price - have };
  return { ok: true, coins: have - price, items: setWorn({ owned: [...s.owned, id], worn: s.worn }, id, true) };
}

/** Layer URLs to draw over the stage's hero picture, back to front. */
export function wornLayers(v, stage, art = ITEM_ART) {
  const { worn } = normalizeAvatarItems(v);
  return AVATAR_ITEMS
    .filter((it) => worn.includes(it.id))
    .map((it) => ({ id: it.id, src: layerSrc(it.id, stage, art) }))
    .filter((l) => l.src);
}
