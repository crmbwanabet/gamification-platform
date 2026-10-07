# Parked features — predictions, trivia, quests, the 7 original games

Removed from the live platform on 2026-07-15 per product decision ("hide for now").
Nothing in here is imported by the app — Next.js does not compile this folder.
The directory structure mirrors where each file used to live; to restore a file,
`git mv` it back and re-add the imports/props noted below.

## 2026-10-07 — pre-casino missions + streak bonuses

Product decisions: missions became exactly four DAILY casino-round missions fed by the CRM (`lib/missions/casino.mjs`, `casinoRounds` type), and the daily-login streak BONUSES stopped paying (a week of daily rewards = 6 × 10 + 100 = 160 coins). The streak counter (`user.streak`) is still live and drives day 1→7 of the daily reward.

| Parked file | Original location | What it is |
|---|---|---|
| `lib/data/missions.legacy.js` | `lib/data/missions.js` | `DAILY_MISSION_POOL` (d_daily, d_coins200, d_marathon), `WEEKLY_MISSIONS` (w_warrior, w_spender, w_xp500), `PERMANENT_MISSIONS` (retail), `getDailyMissions()`, old `DIFFICULTY_CONFIG` |
| `lib/data/streakRewards.legacy.js` | `lib/data/platform.js` | `STREAK_REWARDS` (3/7/14/30-day milestones) |
| 2026-10-07 section of `components/GamificationPlatform.removed-wiring.jsx` | `GamificationPlatform.jsx` + `redesign/EarnView.jsx` | the full `trackMission` progress engine, the streak-bonus payout in `claimDailyReward`, the "Streak Bonuses" Missions-tab section, the old grid `MissionCard` |

Saved player state is untouched: `missionProgress` / `missionsComplete` (old mission progress) stay in `profiles.state` and in the initial `user` object, nothing reads them except the header "badges" count, and the new missions use a separate key (`casinoMissionClaims`). Old ids in a `mission_overrides` config row are ignored.

To restore the old missions: `git mv` the data back as `lib/data/missions.js` exports (keep `CASINO_MISSIONS` alongside), put the parked `trackMission` body back, and build `activeMissions` from both lists. Their progress/claim model differs: old missions auto-complete from in-app actions, while casino missions are claimed by hand from the feed counter. Add the old pools back to `/api/admin/catalog` too.
To restore streak bonuses: move `STREAK_REWARDS` back into `platform.js`, set `streakRewards: STREAK_REWARDS` in `lib/config/defaults.js`, re-add the `streak_rewards` key in `lib/config/merge.mjs` (and its test), and put the payout block + `RewardsSection` streak list back.

## 2026-09-29 — the 7 original games

Product decision: remove every game except Njuka (poor internet + small phones; no tapping/complex mechanics). Replaced one at a time by simple pick-and-reveal games (Coin Flip first).

| Parked file | Original location | What it is |
|---|---|---|
| `components/games/{Wheel,Scratch,Dice,HighLow,Plinko,TapFrenzy,StopClock}Game.jsx` | `components/games/` | The 7 games (their `../gameKit` / `../../lib` imports assume the original location) |
| `lib/data/games.parked.js` | extracted from `lib/data/platform.js` | Their MINIGAMES entries + DEFAULT_DAILY_PLAYS (1 each, in `lib/config/defaults.js`) |
| `lib/data/missions.games.js` | extracted from `lib/data/missions.js` | 18 missions: all game-specific ones + d_hopper / w_explorer (multi-game, unreachable with one game) |
| `lib/data/tutorials.games.js` | extracted from `lib/data/tutorials.js` | Their TUTORIALS entries |
| bottom section of `components/GamificationPlatform.removed-wiring.jsx` | `components/GamificationPlatform.jsx` | imports, `handleWin` (wheel), tapScore/clockClose/wheelSpins mission cases, 7 overlay renders |

Still live but dormant: `WHEEL_SEGMENTS`/`DAILY_FREE_SPIN_ROTATION` in `lib/data/platform.js`, the Overview wheel card (renders only if a `wheel` game exists), and game images in `lib/data/images.js`.

## Contents (2026-07-15 parking)

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
| `lib/data/tutorials.predictions.js` | extracted from `lib/data/tutorials.js` | The predictions how-to-play tutorial entry |
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
- `lib/data/tutorials.js` keeps only live-feature tutorials; the predictions entry is parked here.
