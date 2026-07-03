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

## Phase 2 addendum: real-value streak vouchers (2026-07-03)

Every **3 correct predictions in a row** earns a **K20 Free Bet** on bwanabet,
fulfilled the same way as wheel wins: a message to the Telegram admin group,
credited manually by admins. No auto-crediting.

- `lib/telegram.js` — `sendVoucherNotification(...)`, same
  `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` env convention as the wheel widget
  (copy values from that project's Vercel env); logs a stub when unset.
- `POST /api/predictions/voucher { token }` — verifies the SSO JWT (fail
  closed), loads the player's **saved** prediction history from Supabase,
  computes entitlement (disjoint 3-win runs over full settled history; loss
  resets the run), sends one Telegram message per newly-owed voucher, then
  records `predVouchersGranted`/`voucherLog` in the profile state. Grants are
  idempotent (entitled − granted); a failed Telegram send stays owed.
- `/api/state` now **preserves** `predVouchersGranted`/`voucherLog` across
  client state saves — the client blob can never wipe server-written voucher
  bookkeeping (would cause duplicate Telegram grants).
- Client: `session.claimVoucher()` is called once when the SSO profile loads
  and ~5s after a winning settlement (after the debounced save lands). On
  `granted > 0` shows a notification + big reward animation.
- Standalone/demo users (no SSO token) never trigger vouchers — there is no
  account to credit.
- Abuse posture: prediction state is client-authoritative (documented platform
  limitation), but every voucher passes through a human admin before crediting.

## Open questions (for retro-review)
- Payout curve (25×, 50–250 clamp) is a judgment call — tune freely; it's one
  constant + clamp in `lib/predictions.js`.
- Whether placement should still pay a token coin amount (removed here to match
  the tutorial's promise).
- Voucher milestone (3 wins → K20) and whether higher streaks should scale
  (e.g. 5 in a row → K50).
