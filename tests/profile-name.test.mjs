import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateName, canRename, nextRenameStage, setName, normalizeNameState, playerLabel, playerName } from '../lib/profile/name.mjs';

test('validateName trims, collapses spaces, accepts accents/digits/. _ -', () => {
  assert.deepEqual(validateName('  Mwila   Banda '), { ok: true, name: 'Mwila Banda' });
  assert.deepEqual(validateName('Zoë_99'), { ok: true, name: 'Zoë_99' });
  assert.deepEqual(validateName('J.K-7'), { ok: true, name: 'J.K-7' });
  assert.deepEqual(validateName('Ab'), { ok: true, name: 'Ab' });
  assert.equal(validateName('A'.repeat(16)).ok, true);
  // combining accent normalises to one character
  assert.deepEqual(validateName('José'), { ok: true, name: 'José' });
});

test('validateName rejects with a short reason', () => {
  for (const [raw, reason] of [
    ['', 'Enter a name'], ['   ', 'Enter a name'], [null, 'Enter a name'], [42, 'Enter a name'],
    ['A', 'Use at least 2 characters'],
    ['A'.repeat(17), 'Use at most 16 characters'],
    ['bad<script>', 'Use letters, numbers, spaces, . _ or -'],
    ['hi!', 'Use letters, numbers, spaces, . _ or -'],
    ['emoji😀', 'Use letters, numbers, spaces, . _ or -'],
    ['...', 'Include a letter or number'],
  ]) {
    const v = validateName(raw);
    assert.equal(v.ok, false, String(raw));
    assert.equal(v.reason, reason, String(raw));
  }
});

test('first name any time; then once per stage-up', () => {
  const fresh = { xp: 0 };
  assert.equal(canRename(fresh, 1), true);
  assert.equal(nextRenameStage(fresh, 1), null);
  const named = setName(fresh, 'Mwila', 3);
  assert.deepEqual({ n: named.displayName, s: named.nameSetAtStage }, { n: 'Mwila', s: 3 });
  assert.equal(fresh.displayName, undefined, 'pure: input untouched');
  assert.equal(canRename(named, 3), false);
  assert.equal(nextRenameStage(named, 3), 4);
  assert.equal(setName(named, 'Other', 3), null, 'locked rename refused');
  assert.equal(canRename(named, 4), true);
  const renamed = setName(named, 'Chanda', 5);
  assert.equal(renamed.displayName, 'Chanda');
  assert.equal(renamed.nameSetAtStage, 5);
  assert.equal(canRename(renamed, 5), false);
});

test('setName: invalid -> null, same name -> unchanged', () => {
  assert.equal(setName({}, 'x', 1), null);
  const u = { displayName: 'Mwila', nameSetAtStage: 2 };
  assert.equal(setName(u, '  Mwila ', 2), u);
});

test('normalizeNameState handles old blobs and junk', () => {
  assert.deepEqual(normalizeNameState({ xp: 10 }), { displayName: null, nameSetAtStage: null });
  assert.deepEqual(normalizeNameState(null), { displayName: null, nameSetAtStage: null });
  assert.deepEqual(normalizeNameState({ displayName: '<b>', nameSetAtStage: 4 }), { displayName: null, nameSetAtStage: null });
  assert.deepEqual(normalizeNameState({ displayName: ' Ok  Name ', nameSetAtStage: 4 }), { displayName: 'Ok Name', nameSetAtStage: 4 });
  assert.deepEqual(normalizeNameState({ displayName: 'Ok', nameSetAtStage: 'x' }), { displayName: 'Ok', nameSetAtStage: 0 });
  // a name with a missing lock never strands the player
  assert.equal(canRename({ displayName: 'Ok' }, 1), true);
});

test('playerLabel: name over ID, else ID, else Player', () => {
  assert.deepEqual(playerLabel({ displayName: 'Mwila' }, 123456), { title: 'Mwila', sub: 'ID 123456', named: true });
  assert.deepEqual(playerLabel({ displayName: 'Mwila' }, null), { title: 'Mwila', sub: null, named: true });
  assert.deepEqual(playerLabel({}, '123456'), { title: 'ID 123456', sub: null, named: false });
  assert.deepEqual(playerLabel({}, ''), { title: 'Player', sub: null, named: false });
  assert.equal(playerName({ displayName: 'a' }), null);
});
