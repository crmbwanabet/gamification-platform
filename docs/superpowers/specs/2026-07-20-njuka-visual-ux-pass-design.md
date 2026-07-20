# Njuka Boss — Visual/UX Pass (v2 presentation)

**Date:** 2026-07-20
**Status:** Implemented and user-approved via live localhost preview loop (2026-07-17 → 2026-07-20)
**Base spec:** `2026-07-17-njuka-boss-integration-design.md` (game logic, fairness, economy — all UNCHANGED by this pass)

## Summary

Full presentation redesign of the shipped Njuka Boss game, iterated live with
the user on localhost. Game logic, the fair-bot contract, and the pure-stake
economy are untouched except one approved extension: player-selectable table
size (2/3/4 seats) with payout scaled to opponents.

## What changed (all user-approved)

### One continuous scene
- The photoreal casino table (`public/images/njuka-table.jpg`, Flux-generated:
  mahogany rail, brass inlay, leather chairs, navy felt, dark indigo room) is
  the permanent backdrop of every screen.
- **Menu = blurred table.** Stake/seat selection floats over the table at
  `blur(9px)`; "Deal me in" animates the blur away (~0.7s CSS filter
  transition) and the deal begins. Leaving the table brings the blur back.
- Menu, between-rounds screen, and rules all share one overlay style: dark
  scrim, gold display title, OptionBtn pills, GameBtn actions.

### Layout (poker-app research–informed)
- **Mobile (<640px):** full-viewport takeover via a new opt-in
  `fullBleed` prop on `GameShell` (other games unaffected).
- **Desktop:** centered modal grown to 680px; scene fixed at 560px tall.
- Bots sit ON the chairs baked into the artwork (`SEAT_LAYOUTS` maps chair
  anchor % per table size: 2 seats → top-center; 3 → left+right; 4 → all
  three). Player's hand, hint, countdown ring, and action buttons are
  overlaid ON the table scene — nothing renders outside it.
- Pot badge is the fixed focal anchor at table center; deck + discard on the
  felt below it.

### Table size selection (gameplay extension)
- Menu + between-rounds pills: 2/3/4 players (1–3 bots).
- Engine already generic (`createRound(numSeats)`); payout = 
  `stake × (seats − 1)` capped at `MAX_WIN`; pot display, ante chip flights,
  and menu win-preview all follow the seat count.

### Cards
- **Backs:** matte black, thin gold inner frame, bwanabet wordmark
  (`public/images/bwanabet-logo.png`, pulled from bwanabet.com — yellow/white
  on black, melts into the card).
- **Fronts:** white, rank+suit corner indices (top-left + mirrored
  bottom-right) with large center suit glyph; red ♥♦ / black ♠♣. Corner
  indices drop below 34px width (opponent minis show compact center label).
- Opponent minis enlarged 18→28px.

### Animations (Web Animations API, CSS transforms — components/games/njuka/anim.js)
- Staggered deal flights deck→every seat (~90ms stagger, 320ms each).
- Player's drawn card 3D-flips (`rotateY`, backface-visibility pair).
- Discards fly from the discarder to the pile (pile fly-in, no ghosts).
- Chip flights: every seat antes to the pot at round start; pot flies to the
  winner at showdown (imperative `flyChip`, self-removing fixed-position
  tokens).
- Turn indication: steady gold ring on the active bot's avatar (inactive
  seats dim/desaturate); player gets a conic-gradient countdown ring.
- **NO FLASHING (explicit user requirement):** all pulse/blink animations
  removed; actionable states use steady glows (gold = draw, red = claim).
- Everything no-ops under `prefers-reduced-motion`.

### Input
- Tap to discard AND **drag-to-discard**: pointer-capture drag with the pile
  brightening on hover; drop on/near the pile discards, elsewhere springs
  back. Drag suppresses the synthetic click via a dataset flag.

### Tutorial + Rules (menu buttons under "Deal me in", Lucide icons)
- **Interactive tutorial** (`Tutorial.jsx`): 11-step spotlight tour on a
  STAGED table (no engine, no coins, fixed cards 7♠7♥8♦ / K♣ / 9♣). Gold
  spotlight hole (`box-shadow` cutout) walks every element: pot, bot seats +
  fairness, hand + winning shapes, deck, discard, Declare button, Swap
  button, timer ring. Three steps are performed by the player for real:
  draw the K♣, throw it, then claim the staged 9♣ (glowing pile → trophy
  moment). Skip/Back/Next; interactive steps gate Next behind the action.
- **Rules screen** (`Rules.jsx`): same overlay style; 7 icon-headed sections
  with REAL rendered cards for the winning shapes and the 10✕J non-connect;
  covers goal, turns, claims, swap, clock/auto-play, stakes & payout.
- The legacy TutorialModal stays on the shell's ? icon.

### Art
- Game-card + tutorial-header art: the user's chosen Grok image
  (`public/images/njuka.jpg`); `IMAGES.njuka` uses a LOCAL path (bundled, no
  dependency on the raw.githubusercontent mirror).

## File map
- `components/games/njuka/NjukaGame.jsx` — logic (unchanged core) + scene
- `components/games/njuka/Card.jsx` — card faces/backs, flip/fly hooks
- `components/games/njuka/Tutorial.jsx` — interactive tour
- `components/games/njuka/Rules.jsx` — rules screen
- `components/games/njuka/anim.js` — WAAPI helpers + durations
- `components/games/gameKit.jsx` — `fullBleed` prop
- `public/images/njuka.jpg`, `njuka-table.jpg`, `bwanabet-logo.png`
- (old `components/games/NjukaGame.jsx` removed)

## Known/accepted
- Table art is generated; replace `public/images/njuka-table.jpg` (and tune
  `SEAT_LAYOUTS` anchors) to re-skin the room at any time.
- `next build` must not run while `next dev` is serving (shared `.next` —
  corrupts dev asset manifests; caused a 404 incident during preview).
- STAKES tiers still mirrored in PlayView footer + tutorials.js prize lines.
