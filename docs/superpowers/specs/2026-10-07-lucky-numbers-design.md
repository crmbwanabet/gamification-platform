# Lucky Numbers — design

## Economy update — 2026-10-07 (supersedes the stakes, odds and rounding below)

- **Stakes:** 1 / 5 / 10 / 20 coins (default chip 5; a remembered 15 etc. falls back to 5). Chips: 1 violet, 5 blue, 10 red, 20 green. Card footer `stakeRange: '1–20'`.
- **Paytable per stake** (`paytableFor(stake, rtp)` in `lib/numbers/paytable.mjs`): the hypergeometric odds are fixed, so the RTP is steered by whole-coin prizes. 2 matches = `stake × 1.2` (half up), 3 = `stake × 1.6` (half up), 5+ = `stake × 10` where the band allows, and 4 matches = the whole-coin prize whose RTP is closest to the configured one inside [97%, 99%]. The top prize drops below 10x only when no 4-match prize fits (stake 1). The paytable strip on the machine and the DRAW caption show coins at the selected stake.

| Stake | 2 / 3 / 4 / 5+ pays (RTP 97% · 98% · 99% config) | Achieved RTP |
|---|---|---|
| 1 | 1 / 2 / 6 / 7 (all three) | 98.97% (fixed) |
| 5 | 6 / 8 / 26·27·28 / 50 | 97.04% · 97.75% · 98.45% |
| 10 | 12 / 16 / 52·55·57 / 100 | 97.04% · 98.10% · 98.80% |
| 20 | 24 / 32 / 104·109·115 / 200 | 97.04% · 97.92% · 98.98% |

- So the config RTP picks the nearest table in the band rather than hitting it exactly. At stake 1, 2 matches pays 1 coin (the stake back).
- **Rounding:** every payout is `stake × multiplier` rounded **half up** (.5 up, .4 down), worked in integer hundredths in `lib/rtp.mjs` (`roundHalfUp`) so float noise never flips a half (25 × 1.14 = 28.5 → 29, although `25 * 1.14` is 28.4999… in floats).
- **RTP:** remote-config key `games.numbers.rtp`, default **0.98**, clamped to **[0.97, 0.99]** (`clampRtp` in `lib/rtp.mjs`, mirrored by `lib/config/merge.mjs`; listed with min/max in `/api/admin/catalog`). `GamificationPlatform` passes `rtp={cfg.games.numbers?.rtp}` into the game, which passes it to the engine on every round.
- **Max win** is still 200 (the top stake × the top multiplier).

**Date:** 2026-10-07 · **Status:** built on the candy-game pattern (Coin Flip / Penalty Crash / Chicken Catch)

## Context

The fourth "candy" game. The user's brief was "Lucky Numbers (picking 6 and waiting for draw)". The constraints are the same as the other candy games: cheap phones, poor internet, a bold and bright look, and one screen in the candy pop-up card. Everything is drawn in code (inline SVG + CSS) with no new dependencies.

**This version's draw is instant and per player.** All 6 numbers are decided the moment the player taps DRAW, and the machine animation only reveals them. **Follow-up (not built):** a shared, timed server draw, where everyone's tickets go into the same scheduled draw ("next draw in 04:59"). That needs server-held tickets, a draw job and server-side settlement. It belongs with the future server-authoritative earning project, not this client-side game.

## Game rules

- **Stake-only** (`stakeOnly: true`): no free daily plays and no extra-play charge.
- **Stakes:** ~~5 / 10 / 20~~ 1 / 5 / 10 / 20 coins (see the economy update). Tiers above the balance are disabled. The stakes are lower than the other candy games (10–50) so that the 10x top prize stays within the 200 max-win cap (20 × 10 = 200).
- **Pick:** exactly 6 of the numbers 1–20. The pool is 20 because a 5×4 grid fits 52×48 px tiles across a 360 px phone; 24 numbers would need 6 columns at about 44 px. 20 also makes matches common: on average a player matches 1.8 of the 6 drawn balls.
- **Draw:** 6 unique numbers drawn with `crypto.getRandomValues` (a partial Fisher–Yates shuffle in `lib/numbers/paytable.mjs`). This is the same client-authoritative trust boundary as the rest of the platform.
- **Pay:** ~~`Math.round(stake × mult)` from the table below~~ the whole-coin paytable for the stake (see the economy update; the table below is the original 0.9493 one). Fewer than 2 matches pays 0.

### Paytable and exact probabilities

P(k) = C(6,k) · C(14,6−k) / C(20,6), with C(20,6) = 38 760.

| Matches | Ways | Probability | Mult | Pays at 5 / 10 / 20 | EV share |
|---|---|---|---|---|---|
| 0 | 3 003 | 7.748% | 0 | 0 | 0 |
| 1 | 12 012 | 30.991% | 0 | 0 | 0 |
| 2 | 15 015 | 38.738% | **1.2x** | 6 / 12 / 24 | 0.46486 |
| 3 | 7 280 | 18.782% | **1.6x** | 8 / 16 / 32 | 0.30052 |
| 4 | 1 365 | 3.522% | **4.6x** | 23 / 46 / 92 | 0.16200 |
| 5 | 84 | 0.217% | **10x** | 50 / 100 / 200 | 0.02167 |
| 6 | 1 | 0.003% | **10x** | 50 / 100 / 200 | 0.00026 |

- **EV = 36 795 / 38 760 = 0.94930** (house edge 5.07%), within the required 0.95 ± 0.002.
- Every multiplier is a multiple of 0.2, so stake × mult is already a whole number at 5, 10 and 20. `Math.round` never moves a payout, and the EV is exact at every stake.
- Hit rate (any win) = 61.3%. The top payout is 20 × 10 = **200**, exactly `MAX_WIN`.
- **Alternative considered:** 3 → 3.4x, 4 → 8.2x, 5+ → 10x with 2 matches paying 0 (the same EV, 22.5% hit rate). It was rejected because the brief asked for matches that happen often enough to be fun. With 2 matches being the most likely outcome, paying it at 1.2x keeps most rounds winning a little.

## Player flow (one screen)

1. **Pick 6 numbers** by tapping tiles (tap again to remove; a 7th tap is ignored), or tap **QUICK PICK** (a random 6; the tiles pop in one after another). **CLEAR** empties the grid. The line guides the player: "Pick 6 lucky numbers", then "Pick 2 more", then "Your lucky 6 are in!".
2. **Pick a stake** chip (5 / 10 / 20). The last stake and the last 6 numbers are remembered (`localStorage` `numbers:last`, validated on load).
3. Tap **DRAW** (caption "✦ WIN UP TO {stake × 10} ✦"). The stake is charged at once (`onSpend`) and all 6 numbers are decided. The machine's balls swirl and tumble and the bulbs blink. Every 0.7 s a ball rides the glass chute and hops into its tray slot (about 4.7 s in total). As each ball lands, its grid tile flashes. A match turns the tile gold with a star and pops a **MATCH!** sticker, and the line counts up ("2 MATCHES · 1.2x"). The paytable pill for the current tier lights up live.
4. **Result** (after the last ball, when `onRound` fires):
   - **Win:** the line reads "3 MATCHES" in gold, and after 0.65 s the `WinCelebration` panel pops in (YOU WON / count-up / COLLECT). The pill holds the pre-win balance and COLLECT flies the coins in.
   - **Loss:** "LOSE · 1 match" (or "· no matches").
   - Numbers that played no part fade back. Drawn numbers that the player did not pick keep a ring in their ball colour.
   - Any tap on a tile, chip, QUICK PICK or CLEAR clears the result. DRAW again is one tap with the same numbers.

## Visuals

- **Card:** `CandyScreen` with a two-line title "LUCKY / NUMBERS" (27 / 34 px), the `?` and ✕ buttons, and the balance pill.
- **Stage** (106 px): the ball machine, which is a glass dome of 10 candy balls on a pink-red pedestal with a gold band of bulbs, a gold crown knob and a glass chute. Next to it are a paytable strip ("MATCHES → WIN", 4 pills: 2 → 1.2x, 3 → 1.6x, 4 → 4.6x, 5+ → 10x) and a glass tray with 6 "?" cups.
- **Balls:** glossy lottery balls (a coloured shell, chunky dark outline and white face). The colour follows the grid row: 1–5 red, 6–10 orange, 11–15 green, 16–20 blue. The drawn ball and its tile share a colour, so a match reads at a glance.
- **Grid:** 5×4 chunky candy tiles, 52×48 px each. A picked tile takes its row's ball colour and a white ball face.
- **Buttons:** 3 stake chips (violet / blue / red). The action row is CLEAR (violet) · DRAW (green, big) · QUICK PICK (orange).
- **Reduced motion:** no swirl, flight, twinkles, sticker or ring. The 6 balls appear in place, the tiles light up at once, and the result follows after 0.25 s.
- It fits the 360×640 pop-up with no scrolling.

## Architecture

| Unit | Responsibility |
|---|---|
| `lib/numbers/paytable.mjs` | Pure engine: `POOL`, `PICKS`, `STAKES`, `TIERS`, `multFor`, `tierIndex`, `probabilities`, `expectedValue`, `payoutFor`, `validatePicks`, `drawNumbers(rng)`, `resolveDraw(stake, picks, rng)`. |
| `tests/numbers-paytable.test.mjs` | Probabilities sum to 1, EV is 0.95 ± 0.002, payouts are whole and ≤ 200, the draw is unique and in range, an injected rng is deterministic, invalid picks throw, and 20 000 simulated draws average within ±0.03 of 0.95. |
| `components/games/numbers/NumbersGame.jsx` | Screen and state machine (`idle → draw → result`), the draw timeline, the exactly-once `onRound`, memory, and the tray with its flying balls (WAAPI). |
| `Machine.jsx` | The SVG ball machine plus its CSS (swirl, tumble, bulbs). |
| `Grid.jsx` | The 1–20 tiles and their states (picked / drawn / match / dim), with the MATCH! sticker and star. |
| `Ball.jsx` | The lottery ball and the row colours. |

**Money safety (same pattern as Chicken Catch):**
- `busyRef` locks DRAW from the tap until the last ball lands, so a rapid double tap charges once.
- The resolved round waits in `pendingRef`, and `fireRound()` nulls it before calling `onRound`. Closing mid-draw fires the pending `onRound` exactly once from the unmount cleanup.

**Wiring (`GamificationPlatform.jsx`):** the `activeGame === 'numbers'` overlay mirrors Chicken Catch:
- `onSpend(stake)` → `addCoins(-stake)`.
- `onRound({ stake, win, payout })`:
  - on a win → `addCoins(payout)`;
  - always → `gamesPlayed + 1`, the `'game'` daily task, `gamesPlayedToday`, and `trackMission('gamePlayed', { gameId: 'numbers', coinsWon: win ? payout - stake : 0 })`.

**Data:**
- MINIGAMES `{ id: 'numbers', name: 'Lucky Numbers', desc: 'Pick 6, watch the draw!', free: 0, cost: 0, stakeOnly: true, stakeRange: '5–20', image: 'numbers', isNew: true }`; the PlayView footer shows "5–20".
- `DEFAULT_DAILY_PLAYS.numbers = 0`.
- `IMAGES.numbers = '/games/numbers/card.svg'`: the ball machine popping out 7 · 13 · 3 · 19, about 8 KB.
- A `numbers` tutorial.

**Keep in sync:** `STAKES` in the engine, `stakeRange '5–20'` in `platform.js`, and the tutorial prize lines.

## Error handling

- If the balance is below 5, all chips and DRAW are disabled and the line reads "Not enough coins".
- DRAW stays disabled until 6 numbers are picked and while a draw or celebration is running.
- Effect layers (sticker, ring, star, flying coins) never take taps.
