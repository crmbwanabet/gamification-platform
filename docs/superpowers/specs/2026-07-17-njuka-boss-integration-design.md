# Njuka Boss — Platform Integration Design

**Date:** 2026-07-17
**Status:** Approved design, pending implementation plan
**Source:** `C:\Users\USER\Desktop\Claude projects\card game\njuka-boss\index.html` (555-line static prototype)

## Summary

Rebuild the Njuka Boss card game (Zambian draw-and-discard) as a native
100xBet platform game: a 4-seat table where the player faces 3 **fair**
strategy bots and stakes real platform coins per round. The prototype's
bots cheat (deck peeking + omniscient card counting); the rebuild makes
cheating structurally impossible and proves it with tests.

## Decisions (user-approved 2026-07-17)

| Decision | Choice |
|---|---|
| Table format | Fixed 4-seat table: player + 3 bots (clearly labeled as bots). No lobby, no seat picker. |
| Economy | **Pure stakes** — no daily free plays, no extra-play charge. Entering is free; every round costs its stake in coins. |
| Stake tiers | 5 / 10 / 25 / 50 coins (winner profit 15 / 30 / 75 / 150 — under the 200 `MAX_WIN` cap) |
| Timeout | Auto-play the turn (auto-draw + auto-discard); round stays live, stake stays in the pot |
| Name | **Njuka Boss** |
| Architecture | Pure engine module (`lib/njuka/engine.mjs`, unit-tested) + UI component (`components/games/NjukaGame.jsx`) |
| Bots | 100% fair — decisions from own hand + discard history only. Improvements over the prototype welcome; it's a good foundation, not a sacred text. |

## Game rules (ported from prototype, unchanged)

- 52-card deck, ranks 1–13. **Suits are cosmetic only** — they render on
  cards but never affect logic.
- Each active seat holds 3 cards; on your turn you draw a 4th, then
  discard back to 3 (or declare a win).
- **Winning 4-card hand**, either shape:
  - **Triple + follower**: three of a kind + one card *connected* to that
    rank (e.g. `7 7 7 + 8`, `7 7 7 + 6`).
  - **Pair + 2-run**: a pair + two connected cards (e.g. `5 5 + 7 8`).
- **Connection rule** (`consec`): A = 1, low only, no wrap-around.
  Number cards connect when ranks differ by exactly 1. **J/Q/K form an
  "any-order" group** — any two distinct faces connect (`J-K` is a valid
  run, `K K K + J` a valid win). A face never connects to a number:
  **10 does not connect to J**.
- **Claims**: when any player discards a **number card (A–10)** that
  completes another player's hand, that player may claim it for an
  instant win within the claim window. **Faces (J/Q/K) can never be
  claimed** — they must be drawn. Cards thrown during a swap are
  un-claimable.
- **Swap a pair**: if your 4 cards (after drawing) contain two disjoint
  pairs/2-runs, you may throw one pair (marked un-claimable) and draw a
  replacement card, then your turn ends. (Engine generalizes the
  prototype: the two thrown cards must form a pair or a 2-run.)
- **Turn timer**: 15 seconds.

## Engine — `lib/njuka/engine.mjs`

Pure functions, no DOM, no timers, no randomness hidden inside decision
logic (shuffle takes an injectable RNG for testability). Exports:

- `isWin(ranks4)` / `completions(ranks3)` / `connects(a, b)` — rule core.
- `buildDeck()`, `shuffle(deck, rng)`, `deal(state)` — setup.
- Round-state transitions: `draw`, `discard`, `claimEligible(state, card, seat)`,
  `swapOptions(hand4)`, `applySwap` — the component drives these; the
  engine owns all rule truth.
- `botDecide(hand4, botSeen)` → `{ action: 'win' | 'discard' | 'swap', ... }`
- `botSeen` maintenance helpers (see fairness below).

## Fair bot

### What the prototype did wrong (both removed)

1. **Deck peeking** — `botFuture()` read the upcoming deck cards; the
   "difficulty" depths (Blind/Peek-1/Tough/Max) were just how far ahead
   it peeked. House mode peeked 6 cards deep.
2. **Omniscient card counter** — a single global `seen` object counted
   every card dealt or drawn by *anyone*, including cards face-down in
   opponents' hands. `botDiscard` used it to compute live outs
   (`4 - seen[r]`), i.e. it read your hole cards.

### The fair rebuild

- **Per-bot knowledge object** (`botSeen`): fed ONLY from (a) the bot's
  own dealt/drawn cards and (b) cards publicly discarded or revealed at
  showdown. Nothing else ever touches it.
- **Structural guarantee**: `botDecide(hand4, botSeen)` — the signature
  has no deck, no opponent hands, no global state. Cheating would
  require changing the API, not just a bug.
- **Strategy** (mirrors a skilled human):
  1. For each of the 4 possible discards, count **weighted live outs**
     of the kept trio: Σ over completing ranks r of `4 − botSeen[r]`.
  2. Tie-breaks: prefer keeping number-card outs (claimable off
     discards; faces are draw-only), prefer discarding useless faces
     (faces are always claim-safe to throw).
  3. Take a swap when it improves expected outs.
- **Claim behavior**: on a claimable discard that wins for a bot, the
  bot fires after a randomized **0.9–2.2s** delay with a **~12% miss
  chance**. The player always sees the glowing pile immediately and can
  beat the bots to the tap. Deliberately slightly player-favorable.
- Expected result: ~25% win rate per seat between equal players;
  skilled humans beat the table.

## Economy

- `MINIGAMES` entry in `lib/data/platform.js`:
  `{ id: 'njuka', name: 'Njuka Boss', free: 0, cost: 0, stakeOnly: true, ... }`
- `playGame()` in `GamificationPlatform.jsx` gets a `stakeOnly` branch:
  opening njuka never consumes a daily play and never charges the
  extra-play cost. The nav "free plays" badge is unaffected (njuka
  contributes 0).
- **Round start**: player's chosen stake is deducted for real
  (`onSpend(stake)` → `addCoins(-stake)`). This differs from Plinko,
  whose wagers are session-display only.
- **Win**: credit `4 × stake` (own stake returned + 3× profit). Profit
  is passed through `Math.min(profit, GAME_ECONOMY.MAX_WIN)` as a safety
  net (never binds at current tiers). Standard `onWin` side effects:
  mission progress (`gamePlayed`, gameId `njuka`), activity tracking,
  reward animation.
- **Loss / bot wins**: stake is simply gone. Bot stakes are notional
  house money — nothing is credited anywhere when a bot wins.
- **Timeout**: auto-play keeps the player in the round; no forfeit.
- Balance below the lowest stake → error toast pointing at Earn
  missions / daily rewards; stake buttons the player can't afford are
  disabled.
- No rake.

## UI — `components/games/NjukaGame.jsx`

Native v2 game modal, same shell conventions as the existing 7 games
(v2 `C` tokens, full-screen overlay, top-right close, help button →
`TutorialModal`, widget red-X compatible, `useReducedMotion` respected).

- **Stake screen** (on open): tier picker 5/10/25/50 with coin icons
  (`RewardIcon`), one-glance rules recap, Play button. Unaffordable
  tiers disabled.
- **Table**: felt oval restyled to the indigo-plum palette. 3 bots
  across the top — avatar, Zambian name + honest "bot" tag, card backs,
  per-seat turn timer ring. Center: deck (tap to draw) + discard pile +
  pot display in coins. Bottom: player's hand as large cards (tap to
  discard, drag to reorder), action row (Declare Win / Swap a pair /
  claim), hint line.
- **Claim moment** (signature thrill): pulsing/glowing discard pile +
  big "TAP TO WIN" button during the claim window.
- **Reveal banner**: winner's 4 cards shown; player wins get
  `triggerReward('big', …)`, losses a restrained "Bwalya wins" beat.
- **Between rounds**: auto-next countdown with the stake switcher
  inline; Leave returns to stake screen / close.
- Improvements over the prototype are in scope (it's a foundation):
  cleaner turn indication, coin iconography instead of text, better
  claim/win feedback, mobile-first sizing consistent with the platform.

## Integration points

- `components/GamificationPlatform.jsx`: import + overlay block
  (`activeGame === 'njuka'`), `onWin` wiring identical to other games
  plus an `onSpend(n)` prop for stake deduction.
- `lib/data/platform.js`: `MINIGAMES` entry.
- `lib/data/tutorials.js`: rules tutorial (win shapes, connection rule,
  claims, swap, stakes).
- Remote config: game visibility toggles automatically from the
  dashboard (keyed by game id). Daily-plays and extra-play-cost knobs do
  not apply to njuka.

## Testing (`npm test`, node --test, pure .mjs)

- **Rules**: prototype's self-checks (`777+8` ✓, `55+78` ✓, `3456` ✗,
  `KKK+J` ✓, `10-10-10+J` ✗) plus edge cases — A-low no wrap (`A A 2 3`
  wins: pair A-A + run 2-3; `A A A K` does not — K is not a follower of A), 10/J boundary, face any-order
  runs (`Q Q J K` ✓), swap-pair detection on disjoint pairs.
- **Fairness**: `botDecide` receives no deck/opponent data (API-level);
  `botSeen` after a scripted round equals exactly own-cards + discards
  (never opponents' concealed cards).
- **Strategy sanity**: bot keeps the trio with more live outs in
  constructed positions; discards dead faces over live numbers.
- **Economy math**: pot/profit per tier, MAX_WIN clamp.

## Out of scope

Real multiplayer, lobby/queue/kick/boss mechanics, VIP tables, rake,
server-side round validation (client-authoritative like all platform
games — consistent with the accepted trust posture), difficulty
settings (one fair bot strength for all).
