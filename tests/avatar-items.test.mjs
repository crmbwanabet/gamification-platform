import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVATAR_ITEMS, STAGE_COUNT, layerSrc, itemReady, cleanAvatarItems, avatarItemDefaults, shopAvatarItems,
  normalizeAvatarItems, setWorn, buyAvatarItem, wornLayers,
} from '../lib/avatar/items.mjs';
import { VUMA_STAGES } from '../lib/vuma/stages.mjs';
import { mergeConfig } from '../lib/config/merge.mjs';

const ART = {
  cap: { shared: true, stages: [19], v: 'abc' },
  tshirt: { shared: false, stages: Array.from({ length: 19 }, (_, i) => i + 1) },
  hoodie: { shared: false, stages: [1, 2, 3] },
};

test('one stage count everywhere', () => {
  assert.equal(STAGE_COUNT, VUMA_STAGES.length);
});

test('the five items at the agreed prices', () => {
  assert.deepEqual(AVATAR_ITEMS.map(i => [i.id, i.price]), [['tv', 150000], ['tshirt', 30000], ['hoodie', 60000], ['cap', 20000], ['football', 40000]]);
});

test('layer paths: per-stage overrides shared, none without art', () => {
  assert.equal(layerSrc('cap', 5, ART), '/vuma/items/cap.png?v=abc');
  assert.equal(layerSrc('cap', 19, ART), '/vuma/items/cap-19.png?v=abc');
  assert.equal(layerSrc('hoodie', 2, ART), '/vuma/items/hoodie-02.png');
  assert.equal(layerSrc('hoodie', 4, ART), null);
  assert.equal(layerSrc('tv', 1, ART), null);
});

test('an item is sold only when art covers every stage', () => {
  assert.equal(itemReady('cap', ART), true);
  assert.equal(itemReady('tshirt', ART), true);
  assert.equal(itemReady('hoodie', ART), false);
  assert.equal(itemReady('tv', ART), false);
  assert.deepEqual(shopAvatarItems(avatarItemDefaults(), ART).map(i => i.id), ['tshirt', 'cap']);
});

test('remote config: prices and switches, junk dropped', () => {
  const c = cleanAvatarItems({ cap: { price: 25000 }, tshirt: { enabled: false }, tv: { price: -5 }, hat: { price: 1 }, football: 'x' }, avatarItemDefaults());
  assert.equal(c.cap.price, 25000);
  assert.equal(c.tv.price, 150000);
  assert.equal(c.hat, undefined);
  assert.deepEqual(shopAvatarItems(c, ART).map(i => [i.id, i.price]), [['cap', 25000]]);
  const merged = mergeConfig({ avatarItems: avatarItemDefaults() }, [{ key: 'avatar_items', value: { cap: { price: 21000 } } }]);
  assert.equal(merged.avatarItems.cap.price, 21000);
  assert.equal(merged.avatarItems.tv.price, 150000);
});

test('buying: coins checked, worn at once, never twice', () => {
  const r = buyAvatarItem(undefined, 'cap', 20000, 25000);
  assert.deepEqual(r, { ok: true, coins: 5000, items: { owned: ['cap'], worn: ['cap'] } });
  assert.equal(buyAvatarItem(r.items, 'cap', 20000, 99999).reason, 'owned');
  assert.deepEqual(buyAvatarItem(undefined, 'tv', 150000, 1000), { ok: false, reason: 'coins', short: 149000 });
  assert.equal(buyAvatarItem(undefined, 'hat', 1, 10).reason, 'unknown');
});

test('one item per slot: the hoodie replaces the T-shirt', () => {
  let s = { owned: ['tshirt', 'hoodie', 'cap'], worn: ['tshirt', 'cap'] };
  s = setWorn(s, 'hoodie', true);
  assert.deepEqual(s.worn, ['cap', 'hoodie']);
  s = setWorn(s, 'cap', false);
  assert.deepEqual(s.worn, ['hoodie']);
  assert.deepEqual(setWorn(s, 'tv', true).worn, ['hoodie'], 'not owned: nothing changes');
  assert.deepEqual(normalizeAvatarItems({ owned: ['cap', 'junk'], worn: ['cap', 'tshirt', 'cap'] }), { owned: ['cap'], worn: ['cap'] });
});

test('worn layers come back to front, only where art exists', () => {
  const s = { owned: ['cap', 'tshirt', 'hoodie'], worn: ['cap', 'tshirt'] };
  assert.deepEqual(wornLayers(s, 19, ART).map(l => l.src), ['/vuma/items/tshirt-19.png', '/vuma/items/cap-19.png?v=abc']);
  assert.deepEqual(wornLayers({ owned: ['hoodie'], worn: ['hoodie'] }, 9, ART), []);
});
