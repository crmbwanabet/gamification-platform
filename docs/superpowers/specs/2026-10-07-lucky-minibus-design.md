# Lucky Minibus — design

## Economy update — 2026-10-07 (supersedes the stakes, odds and rounding below)

- **Stakes:** 1 / 10 / 25 / 50 coins (`STAKES` in `lib/pick6/engine.mjs`; default chip 10). A remembered stake that is no longer offered falls back to 10. Card footer `stakeRange: '1–50'`.
- **Win chance** is derived from the ACTUAL rounded payout so every passenger returns exactly the configured RTP at every stake: `winChance(stake, mult, rtp) = rtp × stake / payoutFor(stake, mult)`. (A fixed `0.95 / mult` would return 131% on 1.5x at stake 1, which pays 2.)

| Mult | Stake 1 | Stake 10 | Stake 25 | Stake 50 |
|---|---|---|---|---|
| 1.2x | 1 @ 98.00% | 12 @ 81.67% | 30 @ 81.67% | 60 @ 81.67% |
| 1.5x | 2 @ 49.00% | 15 @ 65.33% | 38 @ 64.47% | 75 @ 65.33% |
| 2x | 2 @ 49.00% | 20 @ 49.00% | 50 @ 49.00% | 100 @ 49.00% |
| 2.5x | 3 @ 32.67% | 25 @ 39.20% | 63 @ 38.89% | 125 @ 39.20% |
| 3x | 3 @ 32.67% | 30 @ 32.67% | 75 @ 32.67% | 150 @ 32.67% |
| 4x | 4 @ 24.50% | 40 @ 24.50% | 100 @ 24.50% | **200** @ 24.50% |

(payout @ win chance at the 98% default.) At stake 1 the 1.2x tile pays 1 coin (the stake back) 98% of the time, and 1.5x/2x and 2.5x/3x pay the same — the tiles stay because the RTP is still exact on each.
- **Rounding:** every payout is `stake × multiplier` rounded **half up** (.5 up, .4 down), worked in integer hundredths in `lib/rtp.mjs` (`roundHalfUp`) so float noise never flips a half (25 × 1.14 = 28.5 → 29, although `25 * 1.14` is 28.4999… in floats).
- **RTP:** remote-config key `games.minibus.rtp`, default **0.98**, clamped to **[0.97, 0.99]** (`clampRtp` in `lib/rtp.mjs`, mirrored by `lib/config/merge.mjs`; listed with min/max in `/api/admin/catalog`). `GamificationPlatform` passes `rtp={cfg.games.minibus?.rtp}` into the game, which passes it to the engine on every round.
- **Max win** is still 200 (the top stake × the top multiplier).

**Date:** 2026-10-07 · **Status:** visual mock approved by the user (2026-10-06); built on the Chicken Catch pattern

## Context

Fourth "candy" game and the third "pick one of N multipliers" game, after Penalty Crash and Chicken Catch (spec `2026-10-06-chicken-catch-design.md`). The same constraints apply: no tapping skill, poor internet, cheap phones, a bold bright look and one screen in the candy pop-up card. The maths is the shared `lib/pick6` engine; only the passenger table is new.

## Game rules

- **Stake-only** (`stakeOnly: true`): no free daily plays and no extra-play charge.
- **Stakes:** ~~10 / 20 / 30 / 50~~ 1 / 10 / 25 / 50 coins (see the economy update). Tiers above the player's balance are disabled.
- **Pick:** one of 6 passengers at the bus stop.
- **Win chance** = ~~`0.95 / mult`~~ `rtp × stake / payout` (see the economy update; the table below is the old 10/20/30/50 one). A **win** (your call boy gets them on your bus) pays `Math.round(stake × mult)`. A **loss** (a rival takes them) forfeits the stake.
- **Result:** decided on the device at BOARD with `crypto.getRandomValues`, inside the platform's existing client-authoritative trust boundary.

| Passenger | Luggage | Mult | Win % | Pays at 10 / 20 / 30 / 50 |
|---|---|---|---|---|
| Grandmother | mealie-meal sack | 1.2x | 79.17% | 12 / 24 / 36 / 60 |
| Market lady | tomato basin | 1.5x | 63.33% | 15 / 30 / 45 / 75 |
| Schoolboy | backpack | 2x | 47.50% | 20 / 40 / 60 / 100 |
| Office worker | briefcase | 2.5x | 38.00% | 25 / 50 / 75 / 125 |
| Headphones guy | duffel | 3x | 31.67% | 30 / 60 / 90 / 150 |
| Tourist | rolling suitcase | 4x | 23.75% | 40 / 80 / 120 / **200** |

The top payout is 50 × 4 = 200, exactly the `MAX_WIN` cap.

## Player flow (3 taps, one screen)

1. **Tap a stake chip.** The default is the last stake used, or 10 if there is none.
2. **Tap a passenger.** They bounce and wave a raised hand.
   - The default is the last passenger used. If there is none, the line reads "Pick a passenger" and BOARD stays disabled.
   - Once a passenger is picked, the line shows "Tourist · 4x" and the BOARD caption shows "✦ WIN {payout} ✦".
3. **Tap BOARD.** The stake is deducted at once and the line reads "Call them in!". Your bus honks, the call boys race to the passenger, the winner grabs the luggage, and the passenger walks to that bus and hops in (about 2.5 s).
   - **Win:** your door slams, the bus bounces with the passenger's face in the window ("Tiyende!"), and sparkles, confetti and "+payout" appear. The line reads "WIN". At 3.25 s the WinCelebration panel pops in (YOU WON, a count-up and COLLECT). The pill holds the pre-win balance, and COLLECT flies the coins into it. There is no toast and no `triggerReward`.
   - **Loss:** the rival takes the passenger and drives off ("PAP PAP!", exhaust). Your call boy says "Eish!", throws his cap and stamps. The line reads "LOSE" and the stop resets on its own after about 2 s.
   - BOARD is disabled during the scramble, so a round can't be charged twice. After a result, tapping a passenger or chip resets the stop at once, and BOARD again is one tap.

## Visuals

The scene is a React port of the approved mock (`minibus-mock/index.html`). It is all SVG and CSS, with no canvas, no WebGL and no new dependencies.

- **Card:** `CandyScreen` with a two-line title, "LUCKY / MINIBUS" (27 / 34 px), and the balance pill under it.
- **Scene** (`viewBox 300×306`, re-fitted to the box):
  - **Backdrop:** a sunny Lusaka bus stop with a sky with slow rays, clouds and power lines; Mwape Store and Blessed Salon; a jacaranda with falling petals and an umbrella fruit stall; the road.
  - **Buses:** the rival's white "SHARP SHARP!" minibus and your blue "NO HURRY IN AFRICA" minibus, each with an idle engine shake, exhaust and a roof rack.
  - **Cast:** four call boys (yours plus three rivals, with "Town! Town!", "Kamwala!" and "Matero!" bubbles) and six passengers with idle loops, multiplier tags and a gold selection ring.
- **Animation:** `motion.js` is the mock's frame renderer: `render(rig, t, pick, win, payout)` writes SVG attributes (two-bone IK limbs, depth sort, re-parenting into the bus doorway). Each round is a rAF loop over t (3.6 s for a win, 4.3 s for a loss). Idle and the reduced-motion end state are single frames.
  - React renders the markup once (`Street.jsx`, static inner HTML built by `scene.js`) and never diffs inside it.
  - All ids, classes and keyframes are namespaced `mb-*` and scoped under `.mb-svg`.
- **Three fixes over the mock:**
  1. **Readable race whichever passenger is picked:**
     - The passengers are spread a little wider, and the tourist and office worker swap places.
     - Each runner gets its own lane. When there is room, the losing call boy comes round the passenger's far side. The two onlookers pull up on free spots on a ring round the pick, clear of everyone. Every path bends away from the pick.
  2. **"SHARP SHARP!" visible in idle:**
     - The rival call boy r2 moves from x 70 to x 46.
     - The slogan moves back along the rival bus (x 116 → 122).
     - The tourist's tall tag no longer sits under it.
  3. **The wave reads as a wave:**
     - The selected passenger raises the near hand beside the head; that arm is tucked behind the head and slightly stretched.
     - The hand swings side to side three times with a small triple bounce (1.1 s).
     - Reduced motion shows a static raised hand.
- **Reduced motion:** there is no scramble. The end frame shows at once, without confetti, the result follows after 0.25 s, and the idle loops are off.
- Everything fits the pop-up at 360×640 with no scrolling.

## Architecture

| Unit | Responsibility |
|---|---|
| `lib/pick6/engine.mjs` | Shared and unchanged: `resolvePick`, `payoutFor`, `STAKES`. |
| `lib/minibus/passengers.mjs` | The 6 passengers: `id`, `mult`, `name`, stop `x`/`y`/`dir`, `bag`, tag colours. |
| `components/games/minibus/MinibusGame.jsx` | The screen and state machine (`idle → run → result`), stake/passenger memory (`localStorage` `minibus:last`, validated), the exactly-once `onRound`, and passenger taps/keys by event delegation. |
| `motion.js` | The rig (element handles), the round plan (lanes), `render()`, poses, and the select / move / fade / wave helpers. |
| `kit.js` / `cast.js` / `scene.js` | The mock's art builders: helpers and the face/prop kit, the cast, and the scene, bus and effect markup. |
| `Street.jsx` | The scene's React layers and scoped CSS. |

**Wiring (`GamificationPlatform.jsx`):** the `activeGame === 'minibus'` overlay mirrors Chicken Catch:
- `onSpend(stake)` → `addCoins(-stake)`.
- `onRound({ stake, win, payout })`:
  - on a win → `addCoins(payout)`;
  - always → `gamesPlayed + 1`, `dailyTasksDone` gets `'game'`, `gamesPlayedToday` gets `'minibus'`, and `trackMission('gamePlayed', { gameId: 'minibus', coinsWon: win ? payout - stake : 0 })`.

**Data:**
- MINIGAMES entry: `{ id: 'minibus', name: 'Lucky Minibus', desc: 'Get your passenger on board first!', free: 0, cost: 0, stakeOnly: true, stakeRange: '10–50', image: 'minibus', isNew: true }`.
- `DEFAULT_DAILY_PLAYS.minibus = 0`.
- `IMAGES.minibus = '/games/minibus/card.svg'`: the blue minibus with your call boy on the step.
- A `minibus` tutorial.

## Error handling

- If the balance is below 10, all chips and BOARD are disabled and the line reads "Not enough coins".
- `onSpend` fires at BOARD. `onRound` fires when the race **lands**: 2.7 s on a win, 2.5 s on a loss, 0.25 s with reduced motion. If the player closes mid-scramble, the round is already resolved and charged, and the unmount cleanup fires the pending `onRound` once.
- Effect layers never take taps (`pointer-events: none`).

## Testing

- `tests/minibus-passengers.test.mjs` checks 6 unique multipliers matching the ladder, whole payouts, and none above 200.
- A live Playwright pass at 360×640 checks:
  - idle, scramble, win, panel and loss;
  - that rapid BOARD taps charge once;
  - that the pill and balance maths are right;
  - that closing mid-scramble pays once;
  - that ✕, the backdrop and `?` work;
  - that there is no scroll and no console errors;
  - reduced motion.
