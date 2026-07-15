# Parked features — predictions, trivia, quests

Removed from the live platform on 2026-07-15 per product decision ("hide for now").
Nothing in here is imported by the app — Next.js does not compile this folder.
The directory structure mirrors where each file used to live; to restore a file,
`git mv` it back and re-add the imports/props noted below.

## Contents

| Parked file | Original location | What it is |
|---|---|---|
| `components/games/ClassicQuizGame.jsx` | `components/games/` | Trivia game |
| `components/games/SpeedRoundGame.jsx` | `components/games/` | Trivia game |
| `components/games/StreakTriviaGame.jsx` | `components/games/` | Trivia game |
| `components/ui/DailyTriviaChallenge.jsx` | `components/ui/` | Daily 3-question trivia widget |
| `components/modals/QuestDetailModal.jsx` | `components/modals/` | Quest steps + claim modal (old design) |
| `components/redesign/PlayView.parked.jsx` | extracted from `components/redesign/PlayView.jsx` | v2 Predictions + Daily sub-tab components |
| `components/redesign/EarnView.QuestCard.parked.jsx` | extracted from `components/redesign/EarnView.jsx` | v2 quest list card |
| `components/legacy/GamificationPlatform.legacy-return.jsx` | extracted from `components/GamificationPlatform.jsx` | The ENTIRE old (pre-v2) app shell render — was unreachable dead code; includes old trivia/quests/predictions tabs AND old me.* screens (profile/VIP/referrals/leaderboard) |
| `components/GamificationPlatform.removed-wiring.jsx` | extracted from `components/GamificationPlatform.jsx` | Handlers/state stripped from the container: trackQuest, claimQuest, playTrivia, handleDailyChallenge, placePrediction, settlement effect, voucher check, trivia/quest modal renders, trivia mission cases |
| `lib/data/trivia.js` | `lib/data/` | Trivia question bank + helpers |
| `lib/data/quests-matches.js` | extracted from `lib/data/platform.js` | QUESTS + MATCHES (static predictions fixtures) |
| `lib/data/missions.predictions.js` | extracted from `lib/data/missions.js` | Bet/prediction missions pulled from the pools |
| `lib/predictions.js` | `lib/` | Prediction reward economy (odds → coins) |
| `lib/telegram.js` | `lib/` | Voucher-win Telegram notification |
| `app/api/matches/route.js` | `app/api/matches/` | Live fixtures/odds from bwanabet API |
| `app/api/matches/settle/route.js` | `app/api/matches/settle/` | Result settlement endpoint |
| `app/api/predictions/voucher/route.js` | `app/api/predictions/voucher/` | Streak-voucher grant (Telegram) endpoint |

## Notes for restoring

- `SessionProvider.jsx` had a `claimVoucher()` method (POST `/api/predictions/voucher`) — removed, see git history.
- `/api/state/route.js` still protects `predVouchersGranted` / `voucherLog` keys in saved state so old voucher bookkeeping survives; leave that in place.
- User state still carries `predictions` / `bets` / `wins` / quest keys so existing player history is preserved in Supabase.
- `LEGACY_TAB_MAP` in `GamificationPlatform.jsx` remaps `predict`/`predictions`/`daily`/`quests` CTAs to live tabs — restore the original targets when un-parking.
- `lib/data/tutorials.js` still contains trivia/predictions tutorial entries (data only, unreferenced).
