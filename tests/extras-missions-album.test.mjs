import { test } from 'node:test';
import assert from 'node:assert/strict';
import { albumCards, albumSets, earnedCount, ALBUM_SETS } from '../lib/album/cards.mjs';

test('album: locked cards never name the place; stage cards follow the stage', () => {
  const cards = albumCards({ stage: 6 });
  const stages = cards.filter(c => c.id.startsWith('stage-'));
  assert.equal(stages.length, 23);
  assert.equal(stages.filter(c => c.earned).length, 6);
  assert.equal(stages[6].title, '?');
  assert.equal(stages[6].image, null);
  assert.equal(stages[5].title, 'Copperbelt Football Academy');
  assert.equal(earnedCount(cards), 6);
});

test('album: rivals, World Cup wins and side quests; set bonuses once', () => {
  const league = { matches: [{ status: 'won', opponent: 'Lusaka Dynamics' }, { status: 'lost', opponent: 'Fish Eagles FC' }] };
  const worldCup = { rounds: [{ id: 'g1', label: 'Group match 1', opponent: 'Morocco', status: 'won' }] };
  const hustle = { unlocked: true, level: { level: 2 } };
  const cards = albumCards({ stage: 15, league, worldCup, hustle });
  assert.ok(cards.find(c => c.id === 'rival-Lusaka Dynamics').earned);
  assert.ok(!cards.find(c => c.id === 'rival-Fish Eagles FC').earned);
  assert.ok(cards.find(c => c.id === 'wc-g1').earned);
  assert.equal(cards.filter(c => c.set === 'quests' && c.earned).length, 2);
  const sets = albumSets(cards, []);
  const zambia = sets.find(s => s.id === 'zambia');
  assert.equal(zambia.complete, true);
  assert.equal(zambia.claimable, true);
  assert.equal(albumSets(cards, ['zambia']).find(s => s.id === 'zambia').claimable, false);
  assert.equal(sets.find(s => s.id === 'abroad').claimable, false);
  assert.equal(sets.length, ALBUM_SETS.length);
});
