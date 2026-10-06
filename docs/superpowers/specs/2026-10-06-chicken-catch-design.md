# Chicken Catch — design

**Date:** 2026-10-06 · **Status:** visual mock approved by the user (2026-10-05); built on the Penalty Crash pattern

## Context

Third "candy" game, and the second "pick one of N multipliers" game after Penalty Crash (spec `2026-10-01-penalty-crash-design.md`). Same constraints: no tapping skill, poor internet, cheap phones, bold bright look, one screen in the candy pop-up card. Its maths is the shared `lib/pick6` engine; only the bird table is new.

## Game rules

- **Stake-only** (`stakeOnly: true`): no free daily plays, no extra-play charge.
- **Stakes:** 10 / 20 / 30 / 50 coins. Tiers above the player's balance are disabled.
- **Pick:** one of 6 birds in the yard.
- **Win chance** = `0.95 / mult` for every bird (a 5% edge everywhere). A **catch** pays `Math.round(stake × mult)`; an **escape** forfeits the stake.
- **Result** is decided on the device at CATCH with `crypto.getRandomValues` (the same client-authoritative trust boundary as the rest of the platform).

| Bird | Mult | Win % | Pays at 10 / 20 / 30 / 50 |
|---|---|---|---|
| Fat brown hen | 1.2x | 79.17% | 12 / 24 / 36 / 60 |
| Plump white hen | 1.5x | 63.33% | 15 / 30 / 45 / 75 |
| Speckled hen | 2x | 47.50% | 20 / 40 / 60 / 100 |
| Lanky red hen | 2.5x | 38.00% | 25 / 50 / 75 / 125 |
| Small black hen | 3x | 31.67% | 30 / 60 / 90 / 150 |
| Proud rooster | 4x | 23.75% | 40 / 80 / 120 / **200** |

The top payout is 50 × 4 = 200, exactly the `MAX_WIN` cap.

## Player flow (3 taps, one screen)

1. Tap a stake chip. The default is the last stake used, else 10.
2. Tap a bird (it hops, flutters and clucks). The default is the last bird used, else none: the line reads "Pick a chicken" and CATCH stays disabled. The line then shows "Small black hen · 3x" and the CATCH caption shows "✦ WIN {payout} ✦".
3. Tap **CATCH**. The stake is deducted immediately and the line reads "Catch it!". The other birds scatter, the farmer chases the zig-zagging bird and dives (about 2 s).
   - **Catch:** he lands on it, jumps up holding it overhead (feathers, sparkles, confetti). The line reads "WIN"; at 3.2 s the WinCelebration panel pops in (YOU WON / count-up / COLLECT). The pill holds the pre-win balance and COLLECT flies the coins into it. No toast and no `triggerReward`.
   - **Escape:** the bird flaps onto a fence post, taunts him, and hops down behind the fence. He belly-flops. The line reads "LOSE" and the yard resets on its own after about 2 s.
   - CATCH is disabled during the chase, so a round can't be charged twice. A tap on a bird or chip after a result resets the yard at once; CATCH again is one tap.

## Visuals

The scene is a React port of the approved mock (`chicken-mock/index.html`). It is all SVG + CSS: no canvas, no WebGL, no new dependencies.

- **Card:** `CandyScreen`, with a two-line title "CHICKEN / CATCH" (27 / 34 px) and the balance pill under it.
- **Scene** (`viewBox 300×306`, re-fitted to the box): golden-hour village yard with sun rays, candy clouds, hills and acacia, a mango tree, two thatched huts, a reed fence with posts, swaying maize, sunlit dirt with grain, a hoe and pots, light motes and a vignette. The farmer (straw hat, chitenge shirt, overalls, moustache) has idle breathe and blink, a run cycle, a dive, a victory hold and a belly-flop. The 6 birds have an idle bob and peck, and multiplier tags with a gold selection ring.
- **Animation:** `motion.js` is the mock's frame renderer, ported as-is: `render(rig, t, pick, win, seed)` writes SVG attributes. Each round runs a rAF loop over t (3.6 s for a win, 4.1 s for a loss); idle and the reduced-motion end state are single frames. It does **not** use CSS keyframes like Penalty Crash, for three reasons. The farmer's limbs are two-bone IK paths (`d`). The chase is a fresh seeded simulation every round. And the actors are depth-sorted, with the escaping bird moved behind the fence. CSS can do none of these. React renders the nodes once and never reorders them or touches the attributes the renderer owns.
- **No in-scene "+payout"** (as in Penalty Crash): the panel is the star.
- **Three fixes over the mock:**
  1. **Farmer readable in idle:** the farmer's scale goes from 1 to 1.2, his feet move forward to (46, 262), and he tilts his head less (−12° vs −20°). His face reads at 360 px and stays clear of the 1.2x / 1.5x tags.
  2. **Clean belly-flop:** the loss pose is now flat (body 90°). The legs stretch out behind, the arms reach forward on the ground, and the head is up with spiral eyes and an "o" mouth. The dust cloud sits low at the hips, so the face stays clear. Dizzy stars orbit above the head's real position. The hat pops off, lands on its brim, rolls to a stop and wobbles flat.
  3. **Black hen visible:** a light lavender halo rims the body, head, neck and tail, and a soft sunlit patch lies under the bird.
- **Reduced motion:** no chase. The end frame shows at once (no cloud, no confetti), the result follows after 0.25 s, and the idle loops are off.
- Everything fits the pop-up at 360×640 with no scrolling. The bird hit areas are about 60–85 × 92–110 px.

## Architecture

| Unit | Responsibility |
|---|---|
| `lib/pick6/engine.mjs` | Shared and unchanged: `resolvePick`, `payoutFor`, `STAKES`. |
| `lib/chicken/birds.mjs` | The 6 birds: `id`, `mult`, `name`, yard `x`/`y`/`dir`, art params, tag colours. |
| `components/games/chicken/ChickenGame.jsx` | Screen and state machine (`idle → chase → result`), stake/bird memory (`localStorage` `chicken:last`, validated), and the exactly-once `onRound`. |
| `components/games/chicken/motion.js` | The rig (element handles), the chase simulation, `render()`, and the select / cluck / fade helpers. |
| `rig.js` | Shared geometry: helpers, IK, bird geometry, farmer poses. |
| `Yard.jsx` / `Farmer.jsx` / `Chickens.jsx` / `Effects.jsx` | The scene / the farmer and his hat / the birds, tags and shadows / dust, cloud, loose hat, feathers, confetti, sparkles, dizzy stars, sweat and grip hands. |

**Wiring (`GamificationPlatform.jsx`):** the `activeGame === 'chicken'` overlay mirrors Penalty Crash:
- `onSpend(stake)` → `addCoins(-stake)`.
- `onRound({ stake, win, payout })`:
  - on a win → `addCoins(payout)` (no toast, no `triggerReward`);
  - always → `gamesPlayed + 1`, `dailyTasksDone` `'game'`, `gamesPlayedToday` gets `'chicken'`, and `trackMission('gamePlayed', { gameId: 'chicken', coinsWon: win ? payout - stake : 0 })`.

**Data:**
- MINIGAMES `{ id: 'chicken', name: 'Chicken Catch', desc: 'Pick a chicken, help the farmer catch it!', free: 0, cost: 0, stakeOnly: true, stakeRange: '10–50', image: 'chicken', isNew: true }`.
- `DEFAULT_DAILY_PLAYS.chicken = 0`.
- `IMAGES.chicken = '/games/chicken/card.svg'`: the farmer reaching for a fleeing hen at sunset, about 11 KB.
- A `chicken` tutorial.

## Error handling

- If the balance is below 10, all chips and CATCH are disabled and the line reads "Not enough coins".
- `onSpend` fires at CATCH. `onRound` fires when the farmer **lands** (2.3 s on a win, 2.15 s on a loss, 0.25 s with reduced motion). If the player closes mid-chase, the round is already resolved and charged, and the unmount cleanup fires the pending `onRound` once.
- Effect layers never take taps (`pointer-events: none`).

## Testing

- `tests/chicken-birds.test.mjs` (part of `npm test`) checks:
  - 6 birds with unique ids and unique mults, matching the 1.2 / 1.5 / 2 / 2.5 / 3 / 4 ladder;
  - every payout is a whole number and none exceeds 200.
- Playwright at 360×640 (dpr 2) and 390×844, against `next start`, with outcomes forced through an init-script `crypto.getRandomValues` override, covers:
  - no scroll;
  - 6 rapid CATCH taps charge once (−30);
  - a win credits +90 at 30 × 3x, with the pill at the pre-win balance during the panel, CATCH blocked under the panel, and COLLECT walking the pill up;
  - a loss is −30;
  - closing mid-chase pays exactly once (win and loss);
  - ✕, a backdrop click and `?` all work;
  - the stake and bird are remembered;
  - reduced motion runs no scene animations;
  - Coin Flip and Penalty Crash still pay;
  - there are no console errors.

## Out of scope

Lucky Minibus (it will reuse `lib/pick6`), new missions for Chicken Catch, server-authoritative results.

## Update 2026-10-07: farmer and side-scrolling chase

The user asked for a farmer who looks like a farmer, stands back from the flock ready to catch, and a chase whose background shows him running, at the same duration.

- **Farmer:**
  - a weathered, friendly older farmer: squinting, sun-crinkled eyes with crow's feet;
  - bushy grey-flecked brows, a broad bulb nose and cheek lines;
  - a short salt-and-pepper beard and moustache, and a grass stalk in his mouth;
  - a battered straw hat with a sweat-stained leather band, and a red neckerchief.
- **Idle stance:** he stands at the left edge (feet (36, 266), scale 1.12), clear of the flock. The birds sit 2–22 units further right. He crouches in a ready stance, both arms forward with open hands.
- **Priming on a pick:** picking a bird plays a 260 ms tween. He leans in, turns his head to the bird, aims his hands at it, locks his eyes on it (lowered lids, pupils on the bird), sets his brows and mouth.
- **Chase:** a side-scroller (`shared/camera.js`). CATCH charges the stake as before, and then:
  - he bursts out of the crouch;
  - the camera pans with him at 260 units/s with parallax: sky still, clouds 0.05, hills 0.15, trees / far huts / maize 0.35, fence and big hut 0.6, ground and tufts 1.0, foreground tufts 1.35;
  - speed lines streak in, and dust is left behind;
  - the arms pump with fists;
  - the bird zig-zags ahead flapping, and the rest of the flock flutters aside and is left behind;
  - at the dive the camera eases to a stop, and the catch or the escape plays out in the scrolled location. On an escape, the bird uses the nearest fence post ahead.
  - The next round is back in the yard.
- **Timing unchanged:** dive 1.72 s, landing 2.0 s, result + `onRound` 2.3 s (win) / 2.15 s (loss), panel 3.2 s, animation end 3.6 s / 4.1 s.
- **Code layout:** the scene pieces moved to `components/games/chicken/shared/` (shared with Chicken Catch 2). `motion.js` keeps the chase.
