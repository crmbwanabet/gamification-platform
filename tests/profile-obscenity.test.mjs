import test from 'node:test';
import assert from 'node:assert/strict';
import { isObscene } from '../lib/profile/obscenity.mjs';
import { validateName, heroName, heroId, heroText } from '../lib/profile/name.mjs';

test('blocks English, Nyanja and Bemba words, disguised or not', () => {
  for (const n of ['fuck', 'FuckYou', 'f.u.c.k', 'fuuuck', '5h1t', 'b1tch', 'shit', 'big dick', 'slut99',
    'nyini', 'Mboro', 'matako', 'nyo', 'nyoko', 'mafi', 'hule', 'kuchinda',
    'chipuba', 'ishilu', 'imbwa', 'umbolo']) {
    assert.equal(isObscene(n), true, n);
  }
});

test('keeps real names that contain short words', () => {
  for (const n of ['Dickson', 'Grace', 'Hancock', 'Kanyoni', 'Chilufya', 'Mfuka', 'Cassius', 'Mwila B', 'Essex', 'Mafinga', 'Sussex', 'Scott', 'Peniston']) {
    assert.equal(isObscene(n), false, n);
  }
});

test('validateName refuses an obscene name with a clear reason', () => {
  const v = validateName('Matako');
  assert.equal(v.ok, false);
  assert.match(v.reason, /not allowed/);
  assert.equal(validateName('Chola').ok, true);
});

test('hero = name, else the player ID without "user", else Player', () => {
  assert.equal(heroName('Chola', '123456'), 'Chola');
  assert.equal(heroName(null, '123456'), '123456');
  assert.equal(heroName(null, 'user123456'), '123456');
  assert.equal(heroName(null, 'User_42'), '42');
  assert.equal(heroName(null, null), 'Player');
  assert.equal(heroName('Matako', '77'), '77'); // an obscene saved name never shows
  assert.equal(heroId('  user  '), null);
  assert.equal(heroText("Vuma's Car Wash", null, '123456'), "123456's Car Wash");
});
