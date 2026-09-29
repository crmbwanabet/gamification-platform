# Coin Flip — design

**Date:** 2026-09-29 · **Status:** agreed in brainstorming, awaiting spec review

## Context

The 7 original games are parked (commit 2015298); only Njuka is live. New games
must avoid tapping/complex mechanics (poor internet, small cheap phones) and use a
bold, bright look. Coin Flip is the first new game, and its visual system — the
"candy" look from the chosen Grok concept (deep violet, chunky gold title, raised
colour buttons) — becomes the shared kit for the later games and for a separate
platform-wide reskin afterwards.

## Game rules

- **Stake-only** (`stakeOnly: true`, like Njuka): no free daily plays, no extra-play charge.
- **Stakes:** 10 / 20 / 30 / 50 coins. Tiers above the player's balance are disabled.
- **Pick:** `EAGLE` or `100x`.
- **Payout:** win returns `stake × 1.9` → 19 / 38 / 57 / 95 (5% house edge; top win 95 < the 200 cap). Loss forfeits the stake.
- **Result** is decided on the device at the moment of FLIP with `crypto.getRandomValues` — no network round-trip. (Same client-authoritative trust boundary as the rest of the platform.)

## Player flow (3 taps, one screen)

1. Tap a stake chip (default: last used, else 10).
2. Tap EAGLE or 100x (default: last used, else none — FLIP stays disabled until picked).
3. Tap **FLIP** → stake deducted immediately → coin toss animation (~1.4 s) → lands on the result face.
   - **Win:** "YOU WIN" + big `+19` (payout), gold glow; platform fires the medium reward animation.
   - **Loss:** coin shows the other face, short "So close!" line.
   - Stake and pick stay selected, so **FLIP again is one tap**. FLIP is disabled while the coin is in the air (no double-charge).

## Visual system ("candy" kit)

From the chosen Grok concept (Coin Flip screen image, 2026-09-29):

- **Background:** deep violet `#2B0F5E` → `#1A0838` radial, soft glow behind the coin.
- **Title "COIN FLIP":** gold `#FFD21F`, thick dark-purple outline + drop shadow.
- **Candy buttons:** solid fill, lighter top highlight, thick bright border, 6 px darker base (`box-shadow: 0 6px 0 <dark>`); pressing drops the button onto its base. Pure CSS.
  - EAGLE green `#43C21A`, 100x violet `#A43BE8`, FLIP large green with gold "WIN 1.9x" caption.
  - Stake chips: 10 violet, 20 blue `#1E63E6`, 30 red `#E3261E`, 50 green.
- **Selected state:** gold glowing ring + slight lift; unselected siblings dim.
- **Header:** coin-balance pill (top-left), help `?` and the standard red X (top-right).
- **Fonts:** Lilita One (display, all big text/numbers) + Nunito 800 (small text), **self-hosted** via `next/font/local` (woff2 in `app/fonts/`) — no Google fetch at build or load time. Exposed as `--font-game` / `--font-game-body`. Existing Bricolage/Onest stay until the platform reskin.
- **Coin:** two webp faces (eagle, 100x), ≤ 25 KB each, 512 px, from Grok front-on prompts the user supplies. The coin is a CSS 3D element (`rotateY`, `backface-visibility: hidden`) that tosses up in an arc, spins an odd/even number of half-turns to land on the result face, ease-out. Until the webps arrive, a CSS-drawn gold placeholder coin with the label is used so the build is not blocked.
- **Reduced motion:** no toss/spin — the face swaps with a fade.
- Everything must fit a 360×640 screen without scrolling; tap targets ≥ 56 px tall.

## Architecture

| Unit | Responsibility |
|---|---|
| `lib/coinflip/engine.mjs` | Pure: `STAKES`, `FACES`, `payoutFor(stake)`, `resolveFlip(stake, pick, rng)` → `{ face, win, payout }`. Throws on an invalid stake/pick. `rng` injectable for tests; default uses `crypto.getRandomValues`. |
| `components/games/candy/` | Shared candy kit: `tokens.js` (colours), `CandyButton`, `CandyChip`, `CandyScreen` (full-bleed violet screen + header with balance / help / red X). Reused by later games and the reskin. |
| `components/games/coinflip/CoinFlipGame.jsx` | Screen + state machine (`idle → flying → result`), coin animation. Props: `onClose, closing, balance, onSpend, onRound`. |
| `components/games/coinflip/Coin.jsx` | The 3D coin (faces, toss animation, placeholder fallback). |

**Wiring (`GamificationPlatform.jsx`):** overlay render for `activeGame === 'coinflip'`:
- `onSpend(stake)` → `addCoins(-stake)`.
- `onRound({ stake, win, payout })` — every flip:
  - win → `addCoins(payout)`, notif `+payout Coins`, `triggerReward('medium', …)`;
  - always → `gamesPlayed + 1`, `dailyTasksDone` `'game'`, `gamesPlayedToday` add `'coinflip'`, `trackMission('gamePlayed', { gameId: 'coinflip', coinsWon: win ? payout - stake : 0 })` (net winnings, matching Njuka).

**Data:**
- `lib/data/platform.js` MINIGAMES: `{ id: 'coinflip', name: 'Coin Flip', desc: 'Pick a side, flip, win 1.9x!', free: 0, cost: 0, stakeOnly: true, stakeRange: '10–50', image: 'coinflip', isNew: true }`.
- `lib/config/defaults.js` `DEFAULT_DAILY_PLAYS.coinflip = 0`.
- `components/redesign/PlayView.jsx`: the stakeOnly footer reads `g.stakeRange ?? '5–50'` (was hardcoded '5–50').
- `lib/data/images.js`: `coinflip` card image (eagle face).
- `lib/data/tutorials.js`: `coinflip` entry (pick stake → pick side → flip; win pays 1.9x).

## Error handling

- Balance below 10 → all chips disabled, FLIP disabled, line "Not enough coins".
- `onRound` fires when the coin **lands** (so the win notification never spoils the reveal). Close mid-flight: the round is already resolved and charged at FLIP, and the component's unmount cleanup fires the pending `onRound` immediately — closing never loses a win and never fires it twice.
- Invalid stake/pick can't reach the engine from the UI; the engine still throws (tested).

## Testing

- `tests/coinflip-engine.test.mjs` (in `npm test`): payouts 19/38/57/95; injected rng picks each face; win iff face === pick; invalid stake/pick throw; 10 000 default-rng flips land within 47–53% per face.
- Manual on a 360×640 viewport: chips disable when unaffordable; FLIP deducts exactly the stake; win credits the payout; no double charge on rapid taps; reduced-motion path; help and red X work; Play card shows STAKES badge + `10–50`.

## Out of scope

Platform-wide reskin (next, separate spec); the other 6 new games; new missions for Coin Flip; server-authoritative results.
