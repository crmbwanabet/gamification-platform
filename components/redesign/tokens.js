// Design tokens for the platform shell.
// 2026-10-09: reskinned to design "A · Full candy" so the shell matches the
// candy games. Every colour comes from the candy kit (components/games/candy/
// tokens.js); the key names are the v2 ones so existing views keep working.

import { CANDY, textStroke } from '../games/candy/tokens';

export { CANDY };

export const C = {
  bg: CANDY.bgBottom,       // app background (deep violet)
  bgTop: '#24094A',         // header / panel top
  side: '#140430',          // darkest well
  panel: '#2B0F5E',         // card fill
  panelHi: '#3a137a',       // card gradient top
  panelLo: '#24094A',       // card gradient bottom
  panel2: 'rgba(20,4,48,.62)', // inner tiles / count badges
  track: '#140430',         // progress track / inset wells / fields
  green: CANDY.green.fill,  // primary action / claimed
  greenDeep: CANDY.green.dark,
  teal: '#35d0c4',          // in-progress indicators (cyan stays reserved for these)
  gold: CANDY.gold,         // coins / titles
  red: CANDY.red.fill,
  text: CANDY.text,
  sub: CANDY.sub,
  muted: 'rgba(255,255,255,.58)',
  line: 'rgba(255,255,255,0.10)',
};

// Candy surfaces shared by the shell views.
export const DEPTH = '#16042F';
export const VIOLET_EDGE = CANDY.violet.fill;
export const VIOLET_BASE = CANDY.violet.dark;

/** Chunky gold section title: round dark-purple outline + solid drop (the mock-up's .gt). */
export const GOLD_TITLE_SHADOW = [textStroke(2.5, CANDY.outline), `0 5px 0 ${DEPTH}`, `-2px 5px 0 ${DEPTH}`, `2px 5px 0 ${DEPTH}`].join(', ');
export const goldTitle = (size = 26) => ({
  margin: 0, fontFamily: CANDY.display, fontWeight: 400, fontSize: size, lineHeight: 1.05,
  color: CANDY.gold, letterSpacing: 0.5, textShadow: GOLD_TITLE_SHADOW, textTransform: 'uppercase',
});

/** Violet candy card: violet edge sitting on a darker violet base. */
export const violetCard = {
  background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`,
  border: `2.5px solid ${VIOLET_EDGE}`, borderRadius: 20,
  boxShadow: `0 5px 0 ${VIOLET_BASE}, 0 10px 18px rgba(0,0,0,.3)`,
};

/** Gold-rimmed panel (daily reward / modals): gold edge + deep-gold ring + glow. */
export const goldRim = {
  background: `linear-gradient(180deg, ${C.bgTop}, ${C.track})`,
  border: `2.5px solid ${CANDY.gold}`,
  boxShadow: `0 0 0 1.5px ${CANDY.goldDeep}, 0 0 22px rgba(255,210,31,.28)`,
};

/** Gold marquee dots row (same pattern as CandyScreen's frame). */
export const dotRow = (vertical = false) => ({
  position: 'absolute', pointerEvents: 'none',
  backgroundImage: 'radial-gradient(circle, #FFE27A 0 1.6px, rgba(255,210,31,.35) 2.2px, transparent 3px)',
  backgroundSize: vertical ? '8px 16px' : '16px 8px',
  backgroundRepeat: vertical ? 'repeat-y' : 'repeat-x',
  backgroundPosition: 'center',
});

/** Violet radial panel inside a gold rim. */
export const innerGlow = `radial-gradient(90% 90% at 50% 20%, ${CANDY.glow}, ${CANDY.bgTop})`;

/** App background (violet radial). */
export const APP_BG = `radial-gradient(120% 60% at 50% 0%, ${CANDY.glow} 0%, ${CANDY.bgTop} 45%, ${CANDY.bgBottom} 100%) fixed, ${CANDY.bgBottom}`;
