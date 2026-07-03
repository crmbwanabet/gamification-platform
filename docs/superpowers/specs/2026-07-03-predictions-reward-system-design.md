# Predictions Reward System — Design

**Date:** 2026-07-03
**Status:** Implemented (user was AFK during design review; approved design pending
retro-review — see Open Questions)

## Problem

Predictions settle with real match results (phase 2, `010aa04`), but the reward
loop is a placeholder and out of sync with promises already shipped elsewhere:

- The mission engine handles `betPlaced` / `betWon` / `betLost` events with live
  missions (First Bet Today, Bet Builder, High Roller, Hot Streak, Winner Winner,
  Winning Week) — but the v2 `placePrediction` and the settlement effect fire
  none of them, so every bet mission is dead in v2.
- The predictions tutorial promises "Regular: 50–60 coins, Featured ⭐: 75–100,
  +5 XP per prediction"; the placeholder pays `20 × odds` (23–434) plus placement
  coins the tutorial never mentions.
- `user.bets` / `user.wins` counters exist (profile "Wins" stat) but predictions
  never increment them.
- The weekly quest step `w_s2` (action `betPlaced`) can never progress.

## Design

Alignment over invention: make the predictions loop feed the existing
missions/quests/economy rather than building a parallel reward system.

### Placing a pick
- +5 XP (+10 for featured/top matches). **No placement coins** — coins come from
  being right; volume rewards come from the bet missions instead.
- Fires `trackMission('betPlaced')` and `trackQuest('betPlaced')`.
- Increments `user.bets`.
- Prediction record stores `top` so settlement can apply the featured bonus.

### Winning (at settlement)
- Payout: `round(25 × odds)` clamped to **50–250** coins; featured/top ×1.5
  (75–375). Favorites pay the 50 floor, even matches ~70, longshots hit the cap.
- +15 XP per win.
- Fires `trackMission('betWon')` (drives Hot Streak / Winner Winner / Winning
  Week — the streak missions ARE the streak system; no custom multiplier state),
  `trackQuest('betWon')`, `trackQuest('coinsEarned', { amount })`.
- Increments `user.wins`.
- Existing big-reward animation + notification stay.

### Losing (at settlement)
- Fires `trackMission('betLost')` — resets `winStreak` mission progress.
- No payout, no penalty.

### UI
- Odds buttons show a small gold `+N` payout preview under the odds value
  (see-the-prize dopamine cue).
- Tutorial prizes text updated to match the new numbers.

### Shared helper
- `lib/predictions.js` exports `predictionWinCoins(odds, top)` used by both the
  settlement effect (GamificationPlatform) and the payout preview (PlayView).

## Alternatives considered
- **Custom streak multiplier ladder** (×1.25/×1.5/×2 on consecutive wins):
  redundant with the streak missions; adds state; deferred.
- **Real free-bet vouchers** at milestones via the wheel's Telegram crediting
  flow: attractive funnel-to-sportsbook play but needs operator-side workflow;
  separate phase.

## Open questions (for retro-review)
- Payout curve (25×, 50–250 clamp) is a judgment call — tune freely; it's one
  constant + clamp in `lib/predictions.js`.
- Whether placement should still pay a token coin amount (removed here to match
  the tutorial's promise).
