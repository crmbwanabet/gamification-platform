// Desktop size-up for the game windows (owner 2026-10-27: "the game windows
// are too small" on desktop). The games are laid out for a phone-sized card
// (candy games 400 x 600); on a desktop-width window (the app's 861 px
// breakpoint) the whole card is scaled up to fill most of the screen height,
// never past `max`. Phones keep scale 1. Pure ESM (node --test).

export const DESKTOP_MIN_WIDTH = 861;

/** Scale for a baseW x baseH card in a vw x vh window: 1 on phones, else up to `max` (2 decimals, rounded down). */
export function desktopScale(vw, vh, baseW, baseH, max = 1.6, margin = 40) {
  if (!(vw >= DESKTOP_MIN_WIDTH) || !(baseW > 0) || !(baseH > 0)) return 1;
  const s = Math.min((vh - margin) / baseH, (vw - 32) / baseW, max);
  return s > 1 ? Math.floor(s * 100) / 100 : 1;
}
