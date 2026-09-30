# Coin Flip — design

**Date:** 2026-09-29 · **Status:** agreed in brainstorming, awaiting spec review

**Changelog:** 2026-09-30: sides renamed to HEADS / TAILS (HEADS = eagle art, TAILS = BWANA art; webps renamed `heads.webp` / `tails.webp`).
2026-09-30: UI cleanup — opens as a pop-up card over the dimmed platform (like the other games) instead of a full-screen takeover; the webp coin art is dropped for a CSS gold coin that just reads HEADS / TAILS (`heads.webp`, `tails.webp`, `config.js` / `COIN_FACES_READY` removed); result line is exactly WIN / LOSE; everything re-fitted to 360×640 inside the card.

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
- **Pick:** `HEADS` or `TAILS`.
- **Payout:** win returns `stake × 1.9` → 19 / 38 / 57 / 95 (5% house edge; top win 95 < the 200 cap). Loss forfeits the stake.
- **Result** is decided on the device at the moment of FLIP with `crypto.getRandomValues` — no network round-trip. (Same client-authoritative trust boundary as the rest of the platform.)

## Player flow (3 taps, one screen)

1. Tap a stake chip (default: last used, else 10).
2. Tap HEADS or TAILS (default: last used, else none — FLIP stays disabled until picked).
3. Tap **FLIP** → stake deducted immediately → coin toss animation (~1.4 s) → lands on the result face.
   - **Win:** result line "WIN" (gold, no amount), gold glow; the platform's notification + medium reward animation show the payout.
   - **Loss:** coin shows the other face; result line "LOSE".
   - Stake and pick stay selected, so **FLIP again is one tap**. FLIP is disabled while the coin is in the air (no double-charge).

## Visual system ("candy" kit)

From the chosen Grok concept (Coin Flip screen image, 2026-09-29):

- **Pop-up card** (same pattern as `GameShell` and the Spin & Win wheel): the platform stays visible behind a dimmed, blurred backdrop, with margins on phones too (card ≈ viewport − 32 px wide, max 400 px; height `min(600px, 100dvh − 40px)`). Backdrop click and the red X both close; opening/closing use the shared `anim-scale-in` / `anim-modal-close` / `anim-backdrop-close` classes. The card: a 2.5 px gold rim, a dark frame band with a row of small gold marquee dots (like the wheel), and a deep violet panel (`#2B0F5E` → `#1A0838` radial, soft glow behind the coin) with a thin gold inner line. No scrolling inside the card or the page.
- **Card header:** help `?` (left), the title (centre), the round red X (right), all 48 px hit areas; the coin-balance pill sits small under the title.
- **Title "COIN FLIP":** gold `#FFD21F`, thick dark-purple outline + stacked drop shadow, 38 px.
- **Candy buttons:** solid fill, lighter top highlight, thick bright border, 6 px darker base (`box-shadow: 0 6px 0 <dark>`); pressing drops the button onto its base. Pure CSS.
  - HEADS green `#43C21A`, TAILS violet `#A43BE8`, each with a small CSS gold mini-coin ("H" / "T") beside the label; FLIP large green with gold "WIN 1.9x" caption.
  - Stake chips: 10 violet, 20 blue `#1E63E6`, 30 red `#E3261E`, 50 green.
- **Selected state:** gold glowing ring + slight lift; unselected siblings dim.
- **Fonts:** Lilita One (display, all big text/numbers) + Nunito 800 (small text), **self-hosted** via `next/font/local` (woff2 in `app/fonts/`) — no Google fetch at build or load time. Exposed as `--font-game` / `--font-game-body`. Existing Bricolage/Onest stay until the platform reskin.
- **Coin:** drawn entirely in CSS, no image assets: a thick glossy gold coin (reeded outer rim, recessed inner face with a bevel, a fine inner ring, a radial shine and a solid drop underneath for thickness) with the word "HEADS" or "TAILS" embossed in Lilita One in darker gold (highlight below, shadow above). It is a CSS 3D element (`rotateY`, `backface-visibility: hidden`, TAILS face pre-rotated 180°) that tosses up in an arc, spins an odd/even number of half-turns to land on the result face, ease-out. The coin area is a CSS size container: the coin is sized in `cqh`/`cqw` and the arc's peak is computed from the area height, so the toss always stays inside the card and never covers the title, header or balance. A subtle golden swirl sits behind the coin, inside the card.
- **Result line:** exactly "WIN" (gold, glowing) or "LOSE" (white, outlined) — no amounts. Other status lines: "Pick a side", "Not enough coins", the pre-flip "Win N coins" hint, "Flipping…".
- **Reduced motion:** no toss/spin — the face swaps with a fade.
- Everything must fit the pop-up on a 360×640 screen without scrolling; tap targets ≥ 48 px tall (56+ for FLIP, the sides and the stake chips).

## Architecture

| Unit | Responsibility |
|---|---|
| `lib/coinflip/engine.mjs` | Pure: `STAKES`, `FACES`, `payoutFor(stake)`, `resolveFlip(stake, pick, rng)` → `{ face, win, payout }`. Throws on an invalid stake/pick. `rng` injectable for tests; default uses `crypto.getRandomValues`. |
| `components/games/candy/` | Shared candy kit: `tokens.js` (colours), `CandyButton`, `CandyChip`, `CandyScreen` (candy pop-up card: backdrop, gold-rimmed violet card with marquee dots, header with help / title / red X and the balance pill; an `overlay` slot renders e.g. the tutorial outside the backdrop). Reused by later games and the reskin. |
| `components/games/coinflip/CoinFlipGame.jsx` | Screen + state machine (`idle → flying → result`), coin animation. Props: `onClose, closing, balance, onSpend, onRound`. |
| `components/games/coinflip/Coin.jsx` | The 3D CSS coin (HEADS / TAILS text faces, toss animation, swirl, reduced-motion fade). |

**Wiring (`GamificationPlatform.jsx`):** overlay render for `activeGame === 'coinflip'`:
- `onSpend(stake)` → `addCoins(-stake)`.
- `onRound({ stake, win, payout })` — every flip:
  - win → `addCoins(payout)`, notif `+payout Coins`, `triggerReward('medium', …)`;
  - always → `gamesPlayed + 1`, `dailyTasksDone` `'game'`, `gamesPlayedToday` add `'coinflip'`, `trackMission('gamePlayed', { gameId: 'coinflip', coinsWon: win ? payout - stake : 0 })` (net winnings, matching Njuka).

**Data:**
- `lib/data/platform.js` MINIGAMES: `{ id: 'coinflip', name: 'Coin Flip', desc: 'Pick a side, flip, win 1.9x!', free: 0, cost: 0, stakeOnly: true, stakeRange: '10–50', image: 'coinflip', isNew: true }`.
- `lib/config/defaults.js` `DEFAULT_DAILY_PLAYS.coinflip = 0`.
- `components/redesign/PlayView.jsx`: the stakeOnly footer reads `g.stakeRange ?? '5–50'` (was hardcoded '5–50').
- `lib/data/images.js`: `coinflip` card image (`/images/coin.png`).
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
