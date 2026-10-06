# Bottle Spin — design

**Date:** 2026-10-07 · **Status:** built on `game/bottle`

## Context

The user's brief: "Bottle spin (wheel of fortune)". It is a new stake-only game in the candy family
(Coin Flip, Penalty Crash, Chicken Catch). It is built for small, cheap phones and poor
internet: one action, no skill, bold and bright. It is the simplest game in the family: no pick,
just a stake and SPIN.

## Game rules

- **Stake-only** (`stakeOnly: true`): no free daily plays, no extra-play charge.
- **Stakes:** 10 / 20 / 30 / 50 coins. Tiers above the balance are disabled; the last stake is remembered (`localStorage['bottle:last']`).
- **Spin:** tap SPIN. The stake is charged at once, and the result is decided on the device at that moment with `crypto.getRandomValues` (`resolveSpin`). This is the same client-authoritative trust boundary as the rest of the platform.
- **Payout:** `Math.round(stake × mult)`; TRY AGAIN pays 0. Top prize 4x, so 50 × 4 = 200 = the max-win cap.

## Pay table (`lib/bottle/wheel.mjs`)

There are 8 painted segments of equal size. The **weights** decide the odds, so bigger prizes come up less often.
The tutorial says this plainly and lists the chance of each prize.

| # (clockwise from the far side) | Segment | Weight | Chance | Stake 10 / 20 / 30 / 50 pays |
|---|---|---|---|---|
| 0 | 1.5x | 14 | 14% | 15 / 30 / 45 / 75 |
| 1 | TRY AGAIN | 14 | 14% | 0 |
| 2 | 2x | 7 | 7% | 20 / 40 / 60 / 100 |
| 3 | 1.2x | 30 | 30% | 12 / 24 / 36 / 60 |
| 4 | 4x | 3 | 3% | 40 / 80 / 120 / 200 |
| 5 | TRY AGAIN | 14 | 14% | 0 |
| 6 | 3x | 4 | 4% | 30 / 60 / 90 / 150 |
| 7 | TRY AGAIN | 14 | 14% | 0 |

- Total weight 100. Any win: 58%. TRY AGAIN: 42%.
- **EV** = (30·1.2 + 14·1.5 + 7·2 + 4·3 + 3·4) / 100 = (36 + 21 + 14 + 12 + 12) / 100 = **0.95 exactly**, a 5% edge like the other games.
- Every payout is a whole number for every stake (the multipliers 1.2 / 1.5 / 2 / 3 / 4 give whole numbers on 10/20/30/50 anyway).

## Player flow

1. Tap a stake chip (default: the last one used, else 10).
2. Tap **SPIN** (caption `✦ WIN UP TO {stake × 4} ✦`). The stake is deducted, and SPIN is disabled until the bottle stops, so rapid taps charge once.
3. The bottle spins fast (motion blur), slows over about 2.55 s, overshoots by about 9°, and wobbles back over about 0.5 s (≈ 3.05 s in total). It stops inside the result segment, at a random point within ±11° of its centre (visual only).
4. **Win:** the segment glows (its light colour pulses, there is a gold edge and a gold arc along the rim, and sparkles), its label pops 1.32×, the other segments dim, the rim studs flash, and the line reads "WIN 3x". After 0.9 s the candy **WinCelebration** panel appears (YOU WON / count-up / COLLECT). COLLECT flies the coins to the pill, which held the pre-win balance until then.
5. **Loss (TRY AGAIN):** the segment gets a soft lilac edge, the others dim, and the line reads **LOSE**. After 2.4 s it returns to idle on its own. SPIN is available again at once.

## Scene (inline SVG, `components/games/bottle/`)

A sunset veranda under a mango tree. The sky runs from purple to gold, with a low sun, slow rays, candy clouds, hills, two thatched huts and the red earth of the yard. The mango canopy and its fruit hang over the top and sway. In front stands a round table under an orange **chitenge** cloth (navy/gold/red rosettes, teal diamonds, a patterned hem, folds, scalloped edge). On the far rim are an enamel mug of tea (with steam) and a plate of mangoes. On the table is the painted spinning board: 8 wedges with gold dividers, a wooden rim with 16 gold marquee studs (they chase when idle, run fast while spinning, flash on a win) and a gold hub. The labels stay upright (they are not foreshortened) so they read at 360 px.

The table top is seen tilted (`K = 0.72`). The bottle is a cylinder lying in that plane, so only its length foreshortens and its width stays the same (`bottlePose`). Its glass highlight stays on the side that faces the sky. It is a plain green soda bottle: no label, no brand, no alcohol, a gold crown cap. The neck is the pointer.

Motion blur while fast: a translucent green fan swept behind both ends, three trailing ghost silhouettes, and a white speed arc past the cap. It all fades with speed. The bottle also rattles slightly at speed.

| File | Responsibility |
|---|---|
| `lib/bottle/wheel.mjs` | Pure: `STAKES`, `SEGMENTS`, `TOTAL_WEIGHT`, `MAX_MULT`, `expectedValue()`, `payoutFor(stake, mult)`, `segmentFor(r)`, `resolveSpin(stake, rng)` → `{ index, mult, win, payout }`. Throws on a bad stake / multiplier / rng value. |
| `components/games/bottle/geom.js` | Scene geometry, plane→screen projection, `bottlePose`, the spin curve (`planSpin`, `angleAt`). |
| `components/games/bottle/Scene.jsx` | Background, table, board, labels, result overlays, studs, foreground canopy; `SCENE_CSS`. |
| `components/games/bottle/Bottle.jsx` | Bottle art, shadow, motion-blur layers. |
| `components/games/bottle/motion.js` | Per-frame renderer (writes transforms straight onto the SVG nodes) and the result overlays. |
| `components/games/bottle/BottleGame.jsx` | Screen + state machine (`idle → spinning → result`). Props: `onClose, closing, balance, onSpend, onRound`. |

## Money contract (same as Coin Flip / Chicken Catch)

- `onSpend(stake)` fires at SPIN. `onRound({ stake, win, payout })` fires when the bottle **stops**. The resolved round waits in `pendingRef`; `fireRound()` nulls it before calling, and the unmount cleanup flushes it, so closing mid-spin still pays exactly once.
- Platform wiring (`GamificationPlatform.jsx`): `addCoins(-stake)` at spend, `addCoins(payout)` on a win (no toast; the game's panel shows it), `gamesPlayed + 1`, the daily task `'game'`, `gamesPlayedToday` add `'bottle'`, and `trackMission('gamePlayed', { gameId: 'bottle', coinsWon: win ? payout - stake : 0 })`.

## Data

- `lib/data/platform.js`: `{ id: 'bottle', name: 'Bottle Spin', desc: 'Spin the bottle, win up to 4x!', free: 0, cost: 0, stakeOnly: true, stakeRange: '10–50', image: 'bottle', isNew: true }`.
- `lib/config/defaults.js`: `DEFAULT_DAILY_PLAYS.bottle = 0`.
- `lib/data/images.js`: `bottle: '/games/bottle/card.svg'` (inline-drawn card art, about 11 KB).
- `lib/data/tutorials.js`: a `bottle` entry with steps, every prize with its chance, and "Bigger prizes come up less often".

## Accessibility and fit

- Reduced motion: no spin. The bottle fades out and back in at its final angle (about 0.5 s), and the idle loops (rays, sway, motes, steam, studs, glow) are off. The win panel shows its final number at once.
- Everything fits a 360×640 pop-up with no scroll. The stake chips are 56 px tall and SPIN 66 px. The `?`, ✕ and backdrop behave as in the other candy games.

## Testing

`tests/bottle-wheel.test.mjs` covers:

- the EV computed exactly from the weights (0.95 ± 0.002);
- payouts that are whole numbers and ≤ 200 for every stake;
- bigger prizes being rarer;
- the injected rng mapping to the right segment at the boundaries;
- invalid stakes, multipliers and rng values throwing;
- 20 000 crypto-rng spins averaging within 0.95 ± 0.03.

The live check uses Playwright at 360×640, with the outcomes forced by a test-only `crypto.getRandomValues` override.
