// "Candy" game kit tokens — from the chosen Grok Coin Flip concept (2026-09-29):
// deep violet screen, chunky gold title, raised solid-colour buttons.
// Shared by the new games and, later, the platform-wide reskin.
// Each button colour has a lighter `light` (top highlight + border) and a
// darker `dark` (the 6px base the button sits on).

export const CANDY = {
  bgTop: '#2B0F5E',
  bgBottom: '#1A0838',
  glow: '#5B2BB0',       // soft light behind the hero element
  gold: '#FFD21F',
  goldDeep: '#E0A300',
  outline: '#2A0A4F',    // dark-purple outline on titles / big numbers
  text: '#FFFFFF',
  sub: 'rgba(255,255,255,.72)',

  green: { fill: '#43C21A', light: '#7BE34F', dark: '#2A7D0E' },
  violet: { fill: '#A43BE8', light: '#C98AF5', dark: '#6A1CA3' },
  blue: { fill: '#1E63E6', light: '#6A9BF5', dark: '#113F9C' },
  red: { fill: '#E3261E', light: '#F5716B', dark: '#991510' },
  off: { fill: '#54496B', light: '#6A5F82', dark: '#2F2742' }, // disabled

  display: "var(--font-game), 'Lilita One', system-ui, sans-serif",
  body: "var(--font-game-body), 'Nunito', system-ui, sans-serif",
};

// Thick dark-purple outline + drop shadow, done with stacked text-shadows so it
// renders the same everywhere (no -webkit-text-stroke / paint-order quirks).
export const outlineShadow = (w = 3, color = CANDY.outline, drop = 5) => [
  `${w}px 0 0 ${color}`, `-${w}px 0 0 ${color}`, `0 ${w}px 0 ${color}`, `0 -${w}px 0 ${color}`,
  `${w}px ${w}px 0 ${color}`, `-${w}px ${w}px 0 ${color}`, `${w}px -${w}px 0 ${color}`, `-${w}px -${w}px 0 ${color}`,
  `0 ${w + drop}px 0 ${color}`,
].join(', ');
