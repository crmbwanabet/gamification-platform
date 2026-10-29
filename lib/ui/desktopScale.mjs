// Desktop size-up for the game windows (owner 2026-10-27: "the game windows
// are too small" on desktop). The games are laid out for a phone-sized card
// (candy games 400 x 600); on a desktop-width window (the app's 861 px
// breakpoint) the whole card is scaled up to fill the screen from top to bottom
// (owner 2026-10-28: "they should be top to bottom"), never past `max`.
// Phones keep scale 1. Pure ESM (node --test).

export const DESKTOP_MIN_WIDTH = 861;

/** Scale for a baseW x baseH card in a vw x vh window: 1 on phones, else up to `max` (2 decimals, rounded down). */
export function desktopScale(vw, vh, baseW, baseH, max = 3, margin = 16) {
  if (!(vw >= DESKTOP_MIN_WIDTH) || !(baseW > 0) || !(baseH > 0)) return 1;
  const s = Math.min((vh - margin) / baseH, (vw - 32) / baseW, max);
  return s > 1 ? Math.floor(s * 100) / 100 : 1;
}

// Fit-down for short screens (2026-10-29: landscape phones and short portrait
// phones squashed the scene to a strip and the content overflowed). The card
// keeps its designed LAYOUT height (baseH) and, when the window is too short
// for it, the whole card is scaled DOWN with the same transform as the desktop
// scale-up. The layout width is then widened to `width` = min(baseW, the room
// left / scale), so the scaled card still fits the window width.
export const FIT_PAD_X = 32; // the pop-up backdrop's side padding (16 + 16)
export const FIT_PAD_Y = 28; // its top + bottom padding (14 + 14)
export const MIN_FIT = 0.3;

/** { scale, width } for a baseW x baseH card in a vw x vh window: scale-up on desktop, scale-down when too short, else 1. */
export function cardFit(vw, vh, baseW, baseH, max = 3, padX = FIT_PAD_X, padY = FIT_PAD_Y) {
  if (!(baseW > 0) || !(baseH > 0) || !(vw > 0) || !(vh > 0)) return { scale: 1, width: baseW > 0 ? baseW : 0 };
  const up = desktopScale(vw, vh, baseW, baseH, max);
  if (up > 1) return { scale: up, width: baseW };
  const room = (vh - padY) / baseH;
  const scale = room >= 1 ? 1 : Math.max(MIN_FIT, Math.floor(room * 100) / 100);
  const width = Math.max(1, Math.min(baseW, Math.floor((vw - padX) / scale)));
  return { scale, width };
}
