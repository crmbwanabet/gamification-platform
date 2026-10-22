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

test('disguised spellings are caught (anti-evasion, 2026-10-22)', () => {
  const tricks = [
    's.h.i.t', 's h i t', 'sh it', 'd-i-c-k', 'D_I_C_K', 'a s s', 'c u m', 'n y o',   // spread out
    'fuсk', 'ѕhit', 'fυck', 'bitсh',                              // Cyrillic / Greek look-alikes
    'fu​ck', 'sh‍it', 'di‌ck',                                           // invisible characters
    'asss', 'assshole', 'shiiiit', 'diiick', 'tittts',                               // repeated letters
    'phuck', 'fvck', 'kunt', 'shyt', 'dikk', 'phuk', 'biatch', 'b1atch', 'sexxx',     // sound-alikes
    'shit99', 'Dick77', 'cum4u', '99shit',                                           // digits as padding
    'ni99a', 'n1gg3r', 'f4gg0t', 'b0ll0cks', '6itch',                                // digits as letters
    'kcuf', 'hctib', 'reggin',                                                       // backwards
    '$hit', 'b!tch', 'f@ggot', 'a$$', 'pu$$y', '|)ick',                              // symbols (saved names)
    'ｆｕｃｋ', 'Ｓｈｉｔ',                                                              // full-width
    'MaTaKo', 'm.b.o.r.o', 'nyoko99', 'n1n1', 'ch1puba', 'umb0l0',                    // Nyanja / Bemba
  ];
  for (const n of tricks) assert.equal(isObscene(n), true, JSON.stringify(n));
});

test('real Zambian and English names still pass', () => {
  const names = [
    'Mwansa', 'Chanda', 'Mulenga', 'Bwalya', 'Musonda', 'Mutale', 'Phiri', 'Banda', 'Tembo', 'Zulu', 'Ngoma', 'Lungu',
    'Mwale', 'Sakala', 'Daka', 'Nkhoma', 'Chileshe', 'Kabwe', 'Kunda', 'Mumba', 'Nyirenda', 'Mbewe', 'Mwila', 'Chola',
    'Kasonde', 'Mapalo', 'Natasha', 'Precious', 'Esther', 'Chisomo', 'Thandiwe', 'Kondwani', 'Mphatso', 'Chikondi',
    'Lusungu', 'Twaambo', 'Mutinta', 'Chipo', 'Kafula', 'Chabala', 'Mwamba', 'Kapembwa', 'Chishimba', 'Kaunda',
    'Mukuka', 'Sichone', 'Simukonda', 'Hamududu', 'Hachintu', 'Kalaba', 'Katongo', 'Mbesuma', 'Musukwa', 'Sinkala',
    'Vusi', 'Vincent', 'Victor', 'Patrick', 'Nick', 'Jackson', 'Dickson', 'Hancock', 'Cassius', 'Cassandra', 'Phillip',
    'Shiku', 'Titus', 'Tito', 'Asante', 'Essex', 'Scott', 'Chuck', 'Buck', 'Kaskazi', 'Mfuka', 'Kanyoni',
    'Chilufya', 'Mafinga', 'Sussex', 'Peniston', 'Grace', 'Mike99', 'Joe 7', 'King Chola', 'Lucky Star', 'B. Mwila',
    'Shitima', 'Mpundu', 'Chisanga', 'Kangwa', 'Bupe', 'Nkandu', 'Kapasa', 'Nachilima', 'Kasapo', 'Ngandu', 'Nkonde',
  ];
  const wrong = names.filter(isObscene);
  assert.deepEqual(wrong, []);
});

test('validateName refuses an obscene name with a clear reason', () => {
  const v = validateName('Matako');
  assert.equal(v.ok, false);
  assert.match(v.reason, /not allowed/);
  assert.equal(validateName('Chola').ok, true);
  assert.equal(validateName('Chólà Mwíla').ok, true, 'accents are fine');
  assert.equal(validateName('Иван').ok, false, 'other alphabets cannot be typed');
  assert.equal(validateName('fuсk').ok, false);
  assert.equal(validateName('s.h.i.t').ok, false);
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
