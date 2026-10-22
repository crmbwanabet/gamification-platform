// ============================================================================
// Obscenity check for player names (2026-10-16): English, Nyanja and Bemba
// swear words, and English insults (2026-10-22).
// validateName (lib/profile/name.mjs) refuses any name this flags, so every
// path (name form, saved blobs via normalizeNameState, header, story copy)
// is covered by one check.
//
// Matching, after normalising (lowercase, accents off, invisible characters
// dropped, look-alike letters from other alphabets and symbols/digits read as
// the letters they imitate, digits also read as gaps, repeated letters
// collapsed, sound-alike spellings folded: "phuck", "fvck", "kunt", "shyt";
// anti-evasion pass 2026-10-22):
//   ANYWHERE — blocked inside any name, spaces/dots/dashes ignored
//              ("f.u.c.k", "xFuckx"). Only words no real name contains.
//   WORD     — blocked only as a whole word, so real names that contain
//              them stay allowed ("Dickson", "Grace", "Hancock", "Kanyoni").
//
// Nyanja and Bemba lists are a starting set and need a native speaker's
// review; add words here (lowercase, plain letters). Tests:
// tests/profile-obscenity.test.mjs.
// ============================================================================

const ENGLISH_ANYWHERE = [
  'fuck', 'fck', 'cunt', 'motherf', 'nigger', 'nigga', 'faggot', 'whore', 'bitch', 'bastard',
  'asshole', 'arsehole', 'wanker', 'bollock', 'dildo', 'blowjob', 'handjob', 'masturbat', 'orgasm',
  'pussy', 'vagina', 'boobs', 'titties', 'shithead', 'bullshit', 'slut', 'porn', 'hitler', 'retard',
];
// Insults (owner 2026-10-22: "idiot", "fakboy", "stupid", "foolish" got
// through). Not swear words, but no player should be named one.
const INSULT_ANYWHERE = [
  'idiot', 'stupid', 'stoopid', 'stupit', 'stupd', 'foolish', 'imbecil', 'cretin', 'dumbass', 'dumbo', 'nitwit', 'halfwit', 'dimwit', 'numbskull',
  'fakboy', 'fukboy', 'fuckboy', 'fakyou', 'fukyou', 'fakoff', 'fukoff', 'mofo', 'loser', 'looser', 'retard',
];
const INSULT_WORD = [
  'fool', 'fools', 'fooly', 'dumb', 'dummy', 'dunce', 'moron', 'morons', 'twit', 'jerk', 'jerks', 'scum', 'trash', 'ugly',
  'fatso', 'lame', 'nerd', 'freak', 'weirdo', 'clown', 'donkey', 'pig', 'pigs', 'idiots', 'stupids', 'fak', 'fakk', 'fakin', 'fuking', 'fukin',
];
const ENGLISH_WORD = [
  'fuk', 'fuks', 'penis', 'penises', 'shit', 'shite', 'dick', 'dicks', 'cock', 'cocks', 'prick', 'twat', 'wank', 'cum', 'jizz', 'tits', 'tit',
  'ass', 'arse', 'fag', 'fags', 'rape', 'rapist', 'sex', 'sexy', 'nude', 'nudes', 'anal', 'horny', 'nazi', 'kkk', 'piss',
  'damn', 'crap', 'hoe', 'hoes', 'bich', 'biatch',
];

// Nyanja (Zambian Nyanja / Chewa)
const NYANJA_ANYWHERE = [
  'nyini', 'mboro', 'matako', 'machende', 'kuchinda', 'kunyela', 'kunyera', 'mahule', 'chitsiru',
];
const NYANJA_WORD = [
  'nyo', 'nyoko', 'mbolo', 'hule', 'mafi', 'nyela', 'nyera', 'chinda', 'tako', 'chende', 'galu', 'wopusa', 'chopusa', 'opusa',
];

// Bemba
const BEMBA_ANYWHERE = [
  'umbolo', 'imbolo', 'ichipuba', 'icipuba', 'ukunyela',
];
const BEMBA_WORD = [
  'nyo', 'mbolo', 'chipuba', 'cipuba', 'kapuba', 'ishilu', 'imbwa', 'noko', 'amafi', 'chimbwi', 'cimbwi', 'nyela', 'mafi',
];

// Digits used as letters ("5h1t", "b1tch", "ni99a").
const LEET = { 0: 'o', 1: 'i', 2: 'z', 3: 'e', 4: 'a', 5: 's', 6: 'b', 7: 't', 8: 'b', 9: 'g' };
// Look-alike letters that NFKD does not turn into a-z: other Latin forms and
// the Cyrillic / Greek letters that look Latin ("fuсk" with a Cyrillic с).
// validateName only accepts Latin letters anyway; this guards saved names.
const HOMOGLYPH = {
  ı: 'i', ɩ: 'i', ſ: 's', ß: 'ss', ɑ: 'a', æ: 'ae', œ: 'oe', ø: 'o', ł: 'l', đ: 'd', ħ: 'h', ŧ: 't', ƒ: 'f', ɡ: 'g', ŋ: 'n', þ: 'p',
  а: 'a', в: 'b', е: 'e', ё: 'e', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', і: 'i', ї: 'i', ј: 'j', ѕ: 's', ԁ: 'd', ԛ: 'q', ԝ: 'w', ь: 'b', п: 'n', г: 'r', ш: 'w', и: 'u', д: 'd', л: 'n',
  α: 'a', β: 'b', ε: 'e', η: 'n', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', γ: 'y', μ: 'u', ω: 'w',
};
// Symbols used as letters (the name form refuses them; saved names may not).
const SYMBOL = { '@': 'a', $: 's', '!': 'i', '|': 'i', '+': 't', '€': 'e', '£': 'l', '¡': 'i' };
// Sound-alike spellings fold to one form ("phuck", "fvck", "kunt", "shyt"
// all meet "fuck" / "cunt" / "shit"); applied to the names AND the lists.
const sound = (s) => s.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/[cq]/g, 'k').replace(/v/g, 'u').replace(/y/g, 'i').replace(/z/g, 's').replace(/x/g, 'ks');

/**
 * The name as plain a-z words. `digits`: 'leet' reads digits as letters,
 * 'gap' reads them as spaces ("shit99" -> "shit"). Invisible characters
 * (zero-width spaces, joiners) are dropped, not read as gaps.
 */
function normalise(raw, digits = 'leet') {
  let s = String(raw).normalize('NFKD').replace(/\p{M}/gu, '').replace(/\p{Cf}/gu, '').toLowerCase();
  s = s.replace(/\|\)/g, 'd').replace(/\|\</g, 'k');
  s = [...s].map(ch => HOMOGLYPH[ch] || SYMBOL[ch] || ch).join('');
  s = digits === 'leet' ? s.replace(/[0-9]/g, d => LEET[d]) : s.replace(/[0-9]/g, ' ');
  return s.replace(/[^a-z]+/g, ' ').trim();
}
// Repeated letters: all runs to one ("fuuuck" -> "fuck") and runs of 3+ to
// two ("asss" -> "ass"), so words that have a double letter still match.
const squash = (s) => s.replace(/(.)\1+/g, '$1');
const squash2 = (s) => s.replace(/(.)\1{2,}/g, '$1$1');
const forms = (s) => [s, squash(s), squash2(s)];

const ANY_WORDS = [...new Set([...ENGLISH_ANYWHERE, ...INSULT_ANYWHERE, ...NYANJA_ANYWHERE, ...BEMBA_ANYWHERE])];
const WORD_WORDS = [...new Set([...ENGLISH_WORD, ...INSULT_WORD, ...NYANJA_WORD, ...BEMBA_WORD])];
// Two spellings of every list: as written, and folded by `sound`. Squashed
// ANYWHERE words ("ashole") join too; short folded words are left out of the
// ANYWHERE check, which would otherwise hit real names.
const LISTS = [
  { fold: (s) => s, any: [...new Set([...ANY_WORDS, ...ANY_WORDS.map(squash).filter(w => w.length >= 4)])], word: new Set(WORD_WORDS) },
  { fold: sound, any: [...new Set(ANY_WORDS.map(sound).flatMap(w => [w, squash(w)]).filter(w => w.length >= 4))], word: new Set(WORD_WORDS.map(sound)) },
];

/**
 * True when the name contains an obscene word (English, Nyanja, Bemba), also
 * when disguised: digits or symbols for letters, look-alike letters from other
 * alphabets, letters spread out with spaces / dots / dashes ("s h i t",
 * "d.i.c.k"), repeated letters, sound-alike spellings, or written backwards.
 */
export function isObscene(raw) {
  if (typeof raw !== 'string' || !raw) return false;
  for (const digits of ['leet', 'gap']) {
    const text = normalise(raw, digits);
    if (!text) continue;
    for (const { fold, any, word } of LISTS) {
      const tokens = text.split(' ').map(fold);
      const joined = tokens.join('');
      const back = [...joined].reverse().join('');
      if (forms(joined).some(f => any.some(w => f.includes(w)))) return true;
      if (any.some(w => w.length >= 4 && back.includes(w))) return true;
      // whole words, also when split up: every run of neighbouring parts
      // ("s h i t", "sh it") is read as one word
      for (let i = 0; i < tokens.length; i++) {
        let span = '';
        for (let j = i; j < tokens.length; j++) {
          span += tokens[j];
          if (forms(span).some(f => word.has(f))) return true;
        }
      }
    }
  }
  return false;
}
