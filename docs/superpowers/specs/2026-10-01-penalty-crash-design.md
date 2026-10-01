# Penalty Crash — design

**Date:** 2026-10-01 · **Status:** visual mock approved by the user (2026-09-30); built on the Coin Flip pattern

## Context

Second of the new "candy" games after Coin Flip (spec `2026-09-29-coin-flip-design.md`). Same constraints: no tapping skill, poor internet, cheap phones, bold bright look, one screen in the candy pop-up card. It is also the first "pick one of N multipliers" game, so its maths lives in a shared engine that Chicken Catch and Lucky Minibus will reuse.

## Game rules

- **Stake-only** (`stakeOnly: true`): no free daily plays, no extra-play charge.
- **Stakes:** 10 / 20 / 30 / 50 coins. Tiers above the player's balance are disabled.
- **Pick:** one of 6 spots on the goal (2 rows × 3 columns).
- **Win chance** = `0.95 / mult` on every spot (a 5% edge everywhere). **Win** pays `Math.round(stake × mult)`; a **save** forfeits the stake.
- **Result** is decided on the device at KICK with `crypto.getRandomValues`, with no network round trip (the same client-authoritative trust boundary as the rest of the platform).

| Spot | Position | Mult | Win % | Pays at 10 / 20 / 30 / 50 |
|---|---|---|---|---|
| TL | top-left | 4x | 23.75% | 40 / 80 / 120 / **200** |
| TC | top-centre | 1.5x | 63.33% | 15 / 30 / 45 / 75 |
| TR | top-right | 3x | 31.67% | 30 / 60 / 90 / 150 |
| BL | bottom-left | 2.5x | 38.00% | 25 / 50 / 75 / 125 |
| BC | bottom-centre | 1.2x | 79.17% | 12 / 24 / 36 / 60 |
| BR | bottom-right | 2x | 47.50% | 20 / 40 / 60 / 100 |

The top payout is 50 × 4 = 200, exactly the `MAX_WIN` cap. All payouts are whole numbers.

## Player flow (3 taps, one screen)

1. Tap a stake chip. The default is the last stake used, else 10.
2. Tap a spot. The default is the last spot used, else none: the line reads "Pick a spot" and KICK stays disabled. The line then shows "Top right · 3x" and the KICK caption shows "✦ WIN {payout} ✦".
3. Tap **KICK**. The stake is deducted immediately and the line reads "Shooting…". The ball flies (about 0.6 s) while the keeper commits.
   - **Goal:** the ball bulges the net, then confetti, sparks and "+payout" in the scene. The line reads exactly "WIN" (gold), and the platform's notification and medium reward animation follow.
   - **Save:** the keeper parries with a POW burst. The line reads exactly "LOSE" (white).
   - KICK is disabled while the ball is in the air, so a round can't be charged twice. Stake and spot stay selected, so KICK again is one tap. The spots fade back in about 2 s after the kick, and a tap on a spot returns the scene to idle.

## Visuals

The scene is a port of the approved mock (`penalty-mock/index.html`). It is all SVG + CSS: no canvas, no WebGL, no new dependencies.

- **Card:** `CandyScreen`, with a two-line title "PENALTY / CRASH" (27 / 34 px) and the balance pill under it.
- **Scene** (`viewBox 300×306`, re-fitted to the box so the play area is never cropped): night stadium with roof lights, two floodlights with flares, crowd bokeh with camera flashes, "100X" ad boards, striped and mown pitch, goal net and rounded posts, and the chibi keeper (lime gloves, orange kit) whose eyes track the ball.
- **Animation:** `motion.js` ports the mock's time-based renderer as a pure `frameAt(t, spot, win)`. Each round, that function is sampled into CSS `@keyframes`, one per animated element (`pk-<key>` classes). Samples that CSS's own linear interpolation already reproduces are dropped (about 24 KB per round, cached). Confetti uses one shared keyframe set, with per-piece velocity and spin passed as CSS variables. The ghost balls replay the ball's keyframes with a delay.
- **Three fixes over the mock:**
  1. **Spot bubbles:** smaller (ring r 18.5 vs 25), with a faint tint instead of a solid halo. The rows sit further apart (y 78 / 166 vs 82 / 162), so the keeper's face sits clear between them and his body shows through. They keep the coloured ring and an outlined label. The invisible hit circle stays at r 27, about 51 px at 360 px wide.
  2. **Motion trail:** three tapered, fading ghost copies of the ball replace the light-beam streak.
  3. **Central keeper poses:** for a top-centre save the keeper jumps straight up, gloves over his head. For a bottom-centre save he does a crouch-smother: legs splayed, body dropped, gloves together low. When he guesses wrong on a centre shot he uses the other central move: on a top-centre goal he smothers low as the ball flies over him, and on a bottom-centre goal he jumps as it goes under him. Corner shots keep the mock's dives (the wrong guess dives to the mirror corner). His limbs are unit segments under translate/rotate/scaleX, so every pose interpolates smoothly in CSS.
- **Reduced motion:** no flight. The end frame shows at once with no confetti and "+payout" held, the spots return after 0.9 s, and the idle loops (bob, pulse, flashes, flares) are off.
- Everything fits the pop-up at 360×640 with no scrolling. Chips are 56 px tall and KICK is 66 px.

## Architecture

| Unit | Responsibility |
|---|---|
| `lib/pick6/engine.mjs` | Shared, pure: `EDGE = 0.05`, `STAKES`, `winChance(mult)`, `payoutFor(stake, mult, stakes?)`, `resolvePick(stake, mult, rng?, stakes?)` → `{ win, payout }`. Throws on a stake outside the list or a mult ≤ 1 / non-finite. |
| `lib/penalty/spots.mjs` | The 6 spots: `id`, `row`, `col`, `mult`, `label`, scene `x`/`y`, colours. |
| `components/games/penalty/PenaltyGame.jsx` | Screen + state machine (`idle → kicking → result`), stake/spot memory (`localStorage` `penalty:last`, validated), and the exactly-once `onRound`. |
| `components/games/penalty/motion.js` | Pure frame function, keeper target poses, CSS frame/keyframe generation. |
| `Scene.jsx` / `Keeper.jsx` / `Ball.jsx` / `Spots.jsx` / `Effects.jsx` | Stadium + net + goal frame / the keeper / ball, shadow and ghost trail / the 6 bubbles + aim ring / pocket, POW, confetti, sparks, "+payout". |

**Wiring (`GamificationPlatform.jsx`):** the `activeGame === 'penalty'` overlay mirrors Coin Flip:
- `onSpend(stake)` → `addCoins(-stake)`.
- `onRound({ stake, win, payout })`:
  - on a win → `addCoins(payout)`, the notification `+payout Coins`, and `triggerReward('medium', …)`;
  - always → `gamesPlayed + 1`, `dailyTasksDone` `'game'`, `gamesPlayedToday` gets `'penalty'`, and `trackMission('gamePlayed', { gameId: 'penalty', coinsWon: win ? payout - stake : 0 })`.

**Data:**
- MINIGAMES: `{ id: 'penalty', name: 'Penalty Crash', desc: 'Pick your spot, beat the keeper!', free: 0, cost: 0, stakeOnly: true, stakeRange: '10–50', image: 'penalty', isNew: true }`.
- `DEFAULT_DAILY_PLAYS.penalty = 0`.
- `IMAGES.penalty = '/games/penalty/card.svg'`: candy-style card art (goal, gloves, ball), about 5 KB.
- A `penalty` tutorial: stake → spot (a bigger multiplier is a harder shot) → KICK → a goal pays the multiplier.

## Error handling

- If the balance is below 10, all chips and KICK are disabled and the line reads "Not enough coins".
- `onRound` fires when the ball **lands** (0.72 s, or 0.25 s with reduced motion). If the player closes mid-kick, the round is already resolved and charged, and the unmount cleanup fires the pending `onRound` once.
- The effect layers above the spots are `pointer-events: none`, because a POW burst at opacity 0 would otherwise swallow taps.

## Testing

- `tests/pick6-engine.test.mjs` (part of `npm test`; written first and seen failing) covers:
  - payouts for every stake × spot;
  - all payouts are integers and none exceeds 200;
  - the injected rng threshold equals `winChance`;
  - a custom stake list;
  - invalid stake and mult throw;
  - 20 000 default-rng picks at 2x win 47.5% ± 2%.
- Playwright at 360×640 (dpr 2) and 390×844 covers:
  - no scroll, and spot hit areas of 51–52 px;
  - 6 rapid KICK taps charge once (−30);
  - a forced win credits +payout (net +60 at 30 × 3x), and a forced loss is −30;
  - close mid-kick still pays exactly once;
  - ✕, a backdrop click, and `?` (a click inside the tutorial keeps the game open) all work;
  - the stake and spot are remembered;
  - reduced motion runs no `pk` animations;
  - Coin Flip still opens and pays;
  - there are no console errors.
- Screenshots were compared against the mock at the same timestamps (kick 0.32 s, win 1.2 s, lose 1.0 s).

## Out of scope

Chicken Catch and Lucky Minibus (they will reuse `lib/pick6`), new missions for Penalty Crash, server-authoritative results.
