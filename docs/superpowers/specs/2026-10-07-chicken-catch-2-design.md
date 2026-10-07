# Chicken Catch 2 — design

**Date:** 2026-10-07 · **Status:** built on `feat/chicken` (the user's brief: "more like a crash game … make RTP 98%, adjustable later in the gamification dashboard")

## Context

A crash game in the Chicken Catch world. The farmer chases a hen that lays golden eggs; every egg he runs through pushes the multiplier up, and the player cashes out before he falls. It reuses Chicken Catch's scene, farmer, bird art, effects and side-scrolling camera (`components/games/chicken/shared/`). Same constraints as the other candy games: one screen in the candy pop-up at 360×640, no scroll, tap targets of at least 48 px, bright look, poor internet.

## Game rules

- **Id `chicken2`**, stake-only (`stakeOnly: true`, `DEFAULT_DAILY_PLAYS.chicken2 = 0`).
- **Stakes:** 5 / 10 / 20 coins. Tiers above the balance are disabled.
- **Multiplier ceiling 10×.** The round auto-collects at 10× ("MAX WIN!"), so the top payout is 20 × 10 = 200, the platform max-win cap.
- **RUN** charges the stake (`onSpend`) and draws the crash point C with `crypto.getRandomValues`. RUN is locked until the round has settled.
- **CASH OUT** (live caption: `floor(stake × multiplier)` coins) banks the shown multiplier. It opens at 1.01× (1.00× is not a cash-out).
- **AUTO** (Off / 1.5× / 2× / 3× / 5×) cycles on a chip next to the stakes and is fixed at RUN. The round cashes out exactly at that multiplier if C reaches it. This helps players on slow connections.
- **Fall:** if the counter would pass C, the farmer trips, the hen flies off over the fence (dropping her eggs), and the line reads **LOSE**. The counter freezes red as "CRASHED @ 2.37×".
- **Recent results:** a strip over the scene shows the player's last 8 crash points, newest first, as pills: red < 2×, gold 2–5×, green ≥ 5×. It is stored in `localStorage` `chicken2:history` (try/catch). A round's C joins it once the player has seen it: at the fall, when the ghost run reaches C after a cash-out (or at once with reduced motion or the 10× max), or when the round is closed or replaced.

## Maths (`lib/chicken2/crash.mjs`, pure, tested)

- **Crash point:** `C = min(10, max(1.00, floor(100·RTP / (1 − U)) / 100))` with U uniform in [0, 1) from the CSPRNG.
  - For every 2-decimal x in [1.01, 10]: **P(C ≥ x) = RTP / x exactly**. A cash-out at x wins iff C ≥ x, so its EV is x · RTP / x = **RTP**, for every target, manual or AUTO, and for the 10× max.
  - **Instant crash** (C = 1.00, he falls before the first cash-out step) has probability 1 − RTP/1.01. That is 1 − RTP (raw draws under 1.00) plus the sliver of raw draws in [1.00, 1.01), which no one could cash out anyway: 2.97% at 98% RTP. This is the "(round as needed)" of the brief, and it never raises EV above RTP.
- **RTP:** `RTP_DEFAULT = 0.98`. `clampRtp` accepts a finite number and clamps it to [0.80, 0.99]; anything else falls back to 0.98.
- **Payout:** `payoutFor(stake, mult) = floor(stake × mult)`, worked in hundredths (20 × 1.15 = 23, not 22), with the multiplier capped at 10. It is always a whole number and never above 200.
- **Growth curve:** `m(t) = e^(K·t)` with K = ln2 / 5.8. That gives 2× at 5.8 s and 10× at 19.3 s. The counter shows `floor(m·100)/100`, frozen at C.
  - He falls at `endTime(C) = t(C + 0.01)`, the moment the counter would pass C, so C itself is on screen.
  - At C = 10 the auto-collect fires at t(10).
- **Tests:** `tests/chicken2-crash.test.mjs`, 200k seeded samples each. They check:
  - P(C ≥ x) ≈ RTP/x for x in {1.5, 2, 3, 5, 10} at 98% and 90%;
  - the instant-crash rate;
  - the EV of fixed cash-outs at 1.5 / 2 / 5 / 10 ≈ RTP;
  - the cash-out win rule, RTP clamping, the crypto default, whole payouts ≤ 200, the growth curve, counter freezing and the close-mid-run settlement.

## RTP from the gamification dashboard

- **Config key:** the `games` row of `platform_config`, field **`chicken2.rtp`**. For example:

  ```sql
  insert into platform_config (key, value) values ('games', '{"chicken2": {"rtp": 0.97}}')
  on conflict (key) do update set value = platform_config.value || excluded.value;
  ```

  If a `games` row already exists, the dashboard merges into it per game: `{ "chicken2": { "rtp": 0.97 } }` next to the other games' `enabled` / `dailyPlays`.
- **Defaults:** `lib/config/defaults.js` puts `games.chicken2.rtp = 0.98` (via `GAME_EXTRAS`).
- **Merge:** `lib/config/merge.mjs` keeps `rtp` in the per-game merge, clamps a number to [0.80, 0.99], and drops anything else so the default survives. A dashboard save of `{ chicken2: { enabled } }` without `rtp` keeps it. This is tested in `tests/merge.test.mjs`.
- **Plumbing:** `GET /api/config` → `useRemoteConfig()` → `GamificationPlatform` passes `rtp={cfg.games.chicken2?.rtp}` → `Chicken2Game` → `clampRtp(rtp)` at every RUN. If config fails, the game uses 0.98. A change lands on the next widget load (60 s edge cache).
- **Dashboard hint:** `GET /api/admin/catalog` lists `chicken2` with `rtp: { default: 0.98, min: 0.8, max: 0.99 }`, so the dashboard can render an RTP field for any game that carries one. The dashboard UI itself is out of scope.

## Settlement (money logic)

- `onSpend(stake)` fires at RUN, exactly once (`runningRef` lock).
- `onRound({ stake, win, payout })` fires once per round: at the cash-out (manual, AUTO or the 10× max) or at the fall. `roundRef.done` flips before `onRound`.
  - A CASH OUT tap is checked against the clock: at or after the fall time it is a fall, so a late tap never pays.
  - Timers back up the frame loop, which pauses in background tabs.
- **Closing mid-run** (`settleOnClose`) settles as if CASH OUT were tapped at that moment:
  - he hasn't fallen and the counter is ≥ 1.01× → pays the shown multiplier;
  - the counter is still 1.00× → pays the stake back, unless C = 1.00 (an instant crash), which is a loss;
  - he has already fallen → loss;
  - past the 10× mark → the max win.

  The player can't gain by closing: it is the same as the CASH OUT they could have tapped, and the 1.00× refund has EV 1 with no upside. Unmount with no open round does nothing.
- **Platform wiring** mirrors Chicken Catch: `addCoins(-stake)` / `addCoins(payout)` on a win. The win shows only through WinCelebration, with no toast. `gamesPlayed + 1`, `'game'` daily task, `gamesPlayedToday`, and `trackMission('gamePlayed', { gameId: 'chicken2', coinsWon: win ? payout − stake : 0 })`.
- **Celebration:** WinCelebration appears 1.5 s after the cash-out, so the catch and the ghost run show first. The pill holds the pre-win balance until COLLECT.

## Visuals

- **Scene:** the Chicken Catch yard and farmer with a single golden hen, dir facing him, and a straw nest with a golden egg by her.
- **Counter:** a big multiplier sits over the sky, under the results strip, gold while running. Each egg he runs through pulses it.
  - After a cash-out it reads "CASHED OUT 2.20×". A faded ghost line runs on at 5× speed to "would crash @ 5.49×", so the player sees where the run would have ended. The frame loop keeps going until the ghost reaches C.
  - After a fall it reads red "CRASHED @ 2.37×" with a shake.
- **Run, the near-catch waves** (`lib/chicken2/motion.mjs`, drawn by `motion2.js`):
  - the camera pans at 200 units/s with parallax (`shared/camera.js`) and speed lines;
  - the chase runs on a wave clock Φ(t) whose rate rises with time, and so with the multiplier: a cycle every ~2.3 s at the start, ~1.75 s at 2×, ~1.45 s by 10×. In each cycle (u = frac Φ):
    - **close in** (u 0–0.5): he gains on her, and the feet-to-hen gap shrinks from 138 units;
    - **lunge** (0.5–0.645): he leaps and pitches forward with arms straight out (`lungePose`, explicit elbows so it blends with the sprint), and his lead hand arrives 2–8 units (inches) short of her tail feathers;
    - **near-miss** (0.645): she flaps and darts forward and up in a puff of 3–6 tail feathers, and his face reads "so close!";
    - **recover** (0.645–1): the gap reopens and he drops back into his stride;
  - intensity I = clamp((m − 1) / 4) (0 at 1×, 1 at 5×+) makes later waves wilder: higher leaps (5 → 12), a deeper pitch, bigger darts, closer misses and more feathers. A per-round cosmetic seed varies each miss a little (closeness, dart up vs dash), plus her weave;
  - the hen weaves ahead and lays a golden egg every ~0.8 s (seeded jitter). The farmer only ever runs forward, so he runs through each egg, which pops with a star burst and pulses the counter.
- **Cash-out:** from whatever pose he is in, the hen brakes, he dives (0.28 s), lands on her, and jumps up holding her overhead with sparkles and confetti (the Chicken Catch win).
- **Fall, at any phase** (mid-stride, mid-leap, or mid-lunge with his fingertips at her tail): it starts from his exact pose, lift and position at the crash time and carries his momentum. He blends into a trip (0.16 s), then a sliding belly-flop (0.26 s), with dust, the rolling hat and dizzy stars. The hen squawks and flies up and away over the fence from where she was, five eggs scatter and bounce, and feathers fly. If his slide would carry him too far right, the camera drifts on to keep him in view. Nothing snaps or teleports.
- **Reset:** a loss resets to the yard about 2.8 s after the fall. A win resets when the panel closes, and a chip tap resets at once.
- **Reduced motion:** no scene animation and no pill pop. A still frame of the first lunge shows at RUN, then a still end frame (the catch hold or the belly-flop). The counter still counts, since it is text, and the result follows at once. The panel delay is 0.25 s.
- **Card:** `public/games/chicken2/card.svg` (≈12 KB): the farmer sprinting after the golden hen, eggs on the trail and a 10× badge.

## Fairness: no foreshadowing

Everything the player sees before the crash is a function of **(t, seed) only**. That covers the farmer's and hen's positions, the lunge rhythm, leaps, darts, feathers, eggs, dust, the counter colour and the copy. The seed is cosmetic: it is drawn with `Math.random` at RUN, independent of the CSPRNG crash draw. There is no music.

- `chase(t, seed)`, `lastMiss(t, seed)` and `plan(seed)` do not take the crash point.
- `frameAt(t, round)` uses `round.tc` / `round.cashT` only to decide **when** the run stops. Before then it returns `chase(t, seed)`. After then it returns `chase(end, seed)`, the state the catch or the fall starts from.
- So the farmer never slows, hesitates, looks worried or changes rhythm before a crash. A round that crashes at 1.5× and one that runs to 10× look identical up to 1.5×.
- **Test:** `tests/chicken2-motion.test.mjs` checks:
  - for several seeds and crash points from 1.00× to 9.99×, every frame before the crash deep-equals `chase(t, seed)` and the egg pickups match a 10× round;
  - the fall and catch start from `chase(end, seed)`;
  - a crash can land mid-lunge;
  - the hands stop 1.5–10 units short of the tail at every miss;
  - the waves speed up with leaps and feathers growing;
  - he always runs forward and the egg plan is seeded.

## Architecture

| Unit | Responsibility |
|---|---|
| `lib/chicken2/crash.mjs` | The maths above (`RTP_DEFAULT`, `clampRtp`, `drawCrash`, `payoutFor`, `multAt` / `timeFor` / `shownAt` / `endTime`, `cashOutWins`, `settleOnClose`). |
| `components/games/chicken2/Chicken2Game.jsx` | Screen, state (`idle → run → cashed / fell`), counter, recent-results strip (`chicken2:history`), AUTO, timers, exactly-once settlement, stake / AUTO memory (`localStorage` `chicken2:last`). |
| `lib/chicken2/motion.mjs` | The pure choreography: wave clock, `chase(t, seed)`, `lastMiss`, `lungePose` / `lungeHand`, the egg `plan`, `frameAt`, `eggsCollected` (tested, no imports). |
| `components/games/chicken2/motion2.js` | The renderer `render2(rig, t, round)`: poses the farmer and hen from the chase state, and runs the catch and fall branches from the end-time pose. |
| `components/games/chicken2/Eggs.jsx` | The golden egg art, the egg / scatter pools and the nest. |
| `components/games/chicken/shared/*` | Shared with Chicken Catch: `rig.js` (geometry, poses), `actors.js` (farmer / bird renderers), `camera.js` (parallax camera), `Yard.jsx` (layered scene + run tiles), `Farmer.jsx`, `Chickens.jsx` (bird art; `plain` = no tag), `Effects.jsx`, `fit.js`. |

## Out of scope

Dashboard UI for the RTP field, server-authoritative crash points (the same client-authoritative trust boundary as the other candy games), and new missions.
