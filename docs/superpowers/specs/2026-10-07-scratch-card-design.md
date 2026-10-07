# Scratch Card — design

## Economy update — 2026-10-07 (supersedes the stakes, odds and rounding below)

- **Stakes:** 1 / 10 / 25 / 50 coins (default chip 10; a remembered 20/30 falls back to 10). Card footer `stakeRange: '1–50'`. Caption "WIN UP TO" = `payoutFor(stake, 4)`.
- **Odds per stake:** the `p` column below is now the SHAPE of the ladder (Σ p × mult = 0.95). `winProbs(stake, rtp)` rescales it from the actual rounded payouts: `p' = p × rtp / E(stake)`, `E = Σ p·payout / stake`, so the EV is exactly the RTP. Win chance at the 98% default: stake 1 47.79%, 10 50.81%, 25 50.61%, 50 50.81%. Near misses are still 42% of the losing cards.
- Payouts: stake 1 → 1 / 2 / 2 / 3 / 3 / 4; stake 25 → 30 / 38 / 50 / 63 / 75 / 100; stakes 10 and 50 as before. At stake 1 three maize pay 1 coin (the stake back).
- **Rounding:** every payout is `stake × multiplier` rounded **half up** (.5 up, .4 down), worked in integer hundredths in `lib/rtp.mjs` (`roundHalfUp`) so float noise never flips a half (25 × 1.14 = 28.5 → 29, although `25 * 1.14` is 28.4999… in floats).
- **RTP:** remote-config key `games.scratch.rtp`, default **0.98**, clamped to **[0.97, 0.99]** (`clampRtp` in `lib/rtp.mjs`, mirrored by `lib/config/merge.mjs`; listed with min/max in `/api/admin/catalog`). `GamificationPlatform` passes `rtp={cfg.games.scratch?.rtp}` into the game, which passes it to the engine on every round.
- **Max win** is still 200 (the top stake × the top multiplier).

**Date:** 2026-10-07 · **Status:** built on the candy Penalty Crash / Chicken Catch pattern

## Context

Fourth "candy" game. Same constraints: cheap phones and poor internet, no skill, bold bright look, one screen in the candy pop-up card. There is **no rubbing gesture**: it is tap to reveal. Everything is drawn in code (inline SVG + CSS), with no images or new dependencies. The old pre-2026-09 scratch game stays parked (`parked/components/games/ScratchGame.jsx`). The new game reuses the id `scratch` because nothing live references the old one (the `DAILY_FREE_SPIN_ROTATION` import in the platform is unused).

## Game rules

- **Stake-only** (`stakeOnly: true`): no free daily plays and no extra-play charge. Stakes are ~~10 / 20 / 30 / 50~~ 1 / 10 / 25 / 50 (see the economy update), and tiers above the balance are disabled.
- **BUY CARD** charges the stake (`onSpend`) and decides the whole card at once with `crypto.getRandomValues` (`lib/scratch/odds.mjs` → `resolveCard`). Tapping the panels only reveals the result.
- There are 3 panels. Three matching symbols pay `stake × mult` rounded half up; anything else loses the stake.

### Odds (`lib/scratch/odds.mjs`)

`p` is the chance that a card is three of that symbol. This base ladder returns `Σ p × mult = 0.95`; it is rescaled per stake to the configured RTP (see the economy update).

| Symbol | Mult | p | EV share | Pays at 10 / 20 / 30 / 50 |
|---|---|---|---|---|
| Maize cob | 1.2x | 15.00% | 0.180 | 12 / 24 / 36 / 60 |
| Mango | 1.5x | 12.00% | 0.180 | 15 / 30 / 45 / 75 |
| Bream fish | 2x | 8.00% | 0.160 | 20 / 40 / 60 / 100 |
| Drum | 2.5x | 6.00% | 0.150 | 25 / 50 / 75 / 125 |
| Fish-eagle feather | 3x | 5.00% | 0.150 | 30 / 60 / 90 / 150 |
| Gold crown | 4x | 3.25% | 0.130 | 40 / 80 / 120 / **200** |
| **Total** | | **49.25%** | **0.950** | |

Every payout is a whole number (`Math.round` is a no-op for this ladder), so the EV holds in coins at every stake. The top prize is 50 × 4 = 200, the max-win cap.

**Losing cards** (50.75%) are plausible layouts that never have 3 matching:
- **42% are near misses** (exactly two matching): a uniform pair symbol, a different odd symbol, and the odd one at a uniform position.
- **The rest are three distinct symbols.**

The near-miss pair is uniform across symbols (not weighted toward the crown) on purpose. A winning card is always 3 of the winning symbol, so the win and the symbols shown can never disagree. The rng draw order is fixed (documented in the module), so an injected rng is deterministic.

## Player flow

1. Tap a stake chip. The default is the last stake used (`localStorage` `scratch:last`, validated), else 10. The big button reads **BUY CARD ✦ WIN UP TO {stake×4} ✦**.
2. Tap **BUY CARD**. The stake is deducted and the old ticket slides out left while a new **LUCKY SCRATCH** ticket slides in from the right (460 ms). The big button becomes **REVEAL ALL** (blue). It is armed after the slide-in, so a rapid double tap on BUY can't also reveal or buy twice. The chips are dimmed and locked.
3. Tap each foil panel, or **REVEAL ALL** (left to right, 260 ms apart). The foil cracks into 4 shards that fly apart with a flash and 12 sparkle bits (560 ms), and the symbol pops up with its multiplier tag.
   - **Near-miss tension:** when two revealed panels match and one is still covered, that panel wiggles with a gold glow and the line reads "One more…!".
4. When the last foil is gone, `onRound` fires.
   - **Win:** the 3 matching panels glow (pulsing gold ring, spinning rays, bouncing symbol), the paytable cell lights up, and the line reads **WIN**. After 1.1 s the `WinCelebration` panel pops in (YOU WON / count-up / COLLECT). The pill holds the pre-win balance and COLLECT flies the coins in.
   - **Loss:** the line reads **LOSE**, and the revealed card stays until the next BUY.

## Visuals

The game uses `CandyScreen`, with a two-line title "SCRATCH / CARD" (27 / 34 px) and the balance pill.

**The ticket** fills the game area above the controls:
- **Body:** a glossy hot-pink candy body with a gold rim, a dark outline, a solid base drop, diagonal sheen stripes and a holographic rainbow shimmer that sweeps across.
- **Header:** a chunky gold "LUCKY SCRATCH" title over a "✦ MATCH 3 TO WIN ✦" ribbon.
- **Panels:** a recessed tray of 3 panels, each about 75×129 px at 360 px wide. The foil is silver with an iridescent tint and fine texture, a gold "?" coin and "TAP!" (shown only while the panel can be tapped), and its own shimmer.
- **Bottom:** a perforation with gold-rimmed notches, then the paytable strip of the 6 symbols with their multipliers.

**Symbols** (`Symbols.jsx`, 100×100 viewBox) have chunky dark-purple outlines and glossy candy fills:
- a maize cob with husk leaves;
- a kidney-shaped mango with a red-to-yellow-to-green blush and a leaf;
- a blue bream with orange fins;
- an ngoma drum with a hide top and a red/gold zigzag band;
- an orange fish-eagle feather;
- a gold crown with green and red gems.

The gradients live once in `<SymbolDefs/>`. The lobby art is `public/games/scratch/card.svg` (about 7 KB, no text): a tilted ticket showing two crowns and a third bursting from its foil.

**Reduced motion:** no slide, shimmer, shards, sparkles or wiggle. The foil fades in 160 ms, the win glow is a static gold ring, and the panel shows at once.

The layout fits 360×640 with no scroll. Every tap target is at least 48 px: panels 75×129, chips 66×56, ✕ and ? 48×48.

## Architecture

| Unit | Responsibility |
|---|---|
| `lib/scratch/odds.mjs` | `SYMBOLS` (id, name, mult, p), `STAKES`, `MAX_WIN`, `expectedMultiplier()`, `payoutFor()`, `resolveCard(stake, rng)` |
| `components/games/scratch/ScratchGame.jsx` | Screen and state machine (`idle → card → done`), per-panel state (`covered → bursting → open`), stake memory, the exactly-once `onRound`, and the double-charge lock |
| `components/games/scratch/Ticket.jsx` | The ticket, panels, foil burst, tease, glow and paytable; `TICKET_CSS` |
| `components/games/scratch/Symbols.jsx` | The 6 symbol drawings and `SymbolDefs` |

**Exactly-once:**
- `lockRef` is held from BUY until the round is reported, and the resolved round waits in `pendingRef`.
- `fireRound()` nulls it before calling `onRound`.
- Unmount clears the timers and flushes it, so closing mid-card (✕ or the backdrop) pays a decided win once and charges a loss once.

**Wiring (`GamificationPlatform.jsx`):** the `activeGame === 'scratch'` overlay mirrors Chicken Catch.
- `onSpend(stake)` → `addCoins(-stake)`.
- `onRound({ stake, win, payout })`:
  - on a win → `addCoins(payout)` (no toast);
  - always → `gamesPlayed + 1`, `dailyTasksDone` `'game'`, `gamesPlayedToday` gets `'scratch'`, and `trackMission('gamePlayed', { gameId: 'scratch', coinsWon: win ? payout - stake : 0 })`.

**Data:**
- MINIGAMES entry `{ id: 'scratch', name: 'Scratch Card', desc: 'Tap to reveal — match 3 to win!', free: 0, cost: 0, stakeOnly: true, stakeRange: '10–50', image: 'luckyScratch', isNew: true }`.
- `DEFAULT_DAILY_PLAYS.scratch = 0`.
- `IMAGES.luckyScratch = '/games/scratch/card.svg'`. The key is not `scratchCard`, which already holds the parked game's remote jpg, and not the case-twin `scratchcard`.
- A `scratch` tutorial.

## Testing

`tests/scratch-odds.test.mjs` (part of `npm test`, written first) checks:
- the ladder and stakes;
- the EV, computed exactly, is 0.95 ± 0.002 at every stake;
- payouts are whole numbers, at most 200, and 50 × 4 = 200;
- forced wins show 3 of the symbol;
- across 20 000 seeded cards, losses never have 3 matching, `nearMiss` is right, and the near-miss share is 25–60%;
- a forced near miss works;
- an injected rng is deterministic;
- invalid stakes throw;
- 20 000 default-rng cards give a mean multiplier within 0.95 ± 0.03.

Playwright at 360×640 (dpr 2) against `next start` covers the following. It funds the balance through React state and forces outcomes with an init-script `crypto.getRandomValues` queue.
- no scroll, and tap targets of at least 48 px;
- 6 synchronous plus 5 rapid BUY taps charge once;
- a 30 × feather win nets +60, with the pill at the pre-win balance and BUY blocked under the panel;
- COLLECT walks the pill up;
- a loss is −30;
- closing mid-card pays a win once (no late double pay) and charges a loss once (✕ and backdrop);
- the stake is remembered;
- ? opens the tutorial and its backdrop closes only the tutorial;
- broke disables BUY;
- reduced motion: REVEAL ALL is armed at once, there are no shards and no running animations;
- no console errors.

## Out of scope

Missions for Scratch Card, server-authoritative results, and multi-row (9-panel) tickets.
