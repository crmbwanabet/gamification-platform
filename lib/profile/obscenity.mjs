// ============================================================================
// Obscenity check for player names (2026-10-16): English, Nyanja and Bemba.
// validateName (lib/profile/name.mjs) refuses any name this flags, so every
// path (name form, saved blobs via normalizeNameState, header, story copy)
// is covered by one check.
//
// Matching, after normalising (lowercase, accents off, digit look-alikes
// 0→o 1→i 3→e 4→a 5→s 7→t 8→b, repeated letters collapsed so "fuuuck" =
// "fuck"):
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

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b' };

/** Lowercase, strip accents, map digit look-alikes, keep letters + spaces. */
function normalise(raw) {
  return String(raw)
    .normalize('NFKD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[0134578]/g, d => LEET[d])
    .replace(/[^a-z]+/g, ' ')
    .trim();
}
const squash = (s) => s.replace(/(.)\1+/g, '$1');

const ANYWHERE = [...new Set([...ENGLISH_ANYWHERE, ...NYANJA_ANYWHERE, ...BEMBA_ANYWHERE])];
const WORD = new Set([...ENGLISH_WORD, ...NYANJA_WORD, ...BEMBA_WORD]);

/** True when the name contains an obscene word (English, Nyanja, Bemba). */
export function isObscene(raw) {
  if (typeof raw !== 'string' || !raw) return false;
  const text = normalise(raw);
  if (!text) return false;
  // Each check runs on the text as typed and with repeated letters collapsed
  // ("fuuuck" -> "fuck"), against the words as listed ("ass" keeps its "ss").
  const joined = text.replace(/ /g, '');
  const forms = [joined, squash(joined)];
  if (ANYWHERE.some(w => forms.some(f => f.includes(w)))) return true;
  return text.split(' ').some(t => WORD.has(t) || WORD.has(squash(t)));
}
