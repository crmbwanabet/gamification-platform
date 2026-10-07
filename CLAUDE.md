# 100xBet Gamification Platform

## Project
- **Stack**: Next.js 14 (App Router), Tailwind CSS, Supabase, Lucide React, three.js + cannon-es (lazy-loaded, Lucky Dice physics)
- **Deploy**: Vercel — https://100xbet-gamification.vercel.app
- **Vercel account**: crmbwanabet-2500
- **GitHub**: crmbwanabet/gamification-platform

## Architecture
- Main container: `components/GamificationPlatform.jsx` (~1500 lines, single client component; the old pre-v2 shell was excised 2026-07-15)
- **`parked/`** — predictions, trivia, and quests were REMOVED from the platform 2026-07-15; all their code lives in `parked/` (mirror structure + README with restore notes). Nothing in `parked/` is compiled. Don't re-import from it — `git mv` files back to restore
- `components/games/` — 9 live games, all `stakeOnly` (no free plays; every round is staked inside the game via `onSpend`, `DEFAULT_DAILY_PLAYS` = 0 for each): **Njuka Boss** (card game vs fair bots, own STAKES 1/10/25/50, no house edge so no RTP knob) plus 8 **candy games** — Coin Flip (`coinflip`), Penalty Crash (`penalty`), Chicken Catch (`chicken`, farmer chase; scene pieces in `chicken/shared/`), **Chicken Catch 2** (`chicken2`, a crash game: golden eggs push the multiplier up, cash out before the farmer falls, 10× cap, engine `lib/chicken2/crash.mjs`, crash point drawn per stake so every cash-out returns exactly the RTP after rounding), Lucky Minibus (`minibus`), Bottle Spin (`bottle`), Scratch Card (`scratch`, image key `luckyScratch`), Lucky Numbers (`numbers`). Stakes **1/5/10/20** for `numbers` and `chicken2` (default chip 5); the rest **1/10/25/50** (default chip 10); a remembered stake no longer offered falls back to the default chip; card footers read `stakeRange` '1–20' / '1–50'. Each candy game = `components/games/<id>/` + pure engine in `lib/<id>/` + `tests/<id>-*.test.mjs` + card art `public/games/<id>/card.svg`; wiring = an overlay block in `GamificationPlatform.jsx` + entries in `MINIGAMES`, `DEFAULT_DAILY_PLAYS`, `images.js`, `tutorials.js`. The pre-2026-09 games (Dice, HighLow, Plinko, old Scratch, StopClock, TapFrenzy, Wheel) are parked in `parked/`
- **Deploys on push**: every push to `main` auto-deploys via the Vercel GitHub integration (no `vercel` CLI needed); watch it with `gh api repos/crmbwanabet/gamification-platform/commits/<sha>/status --jq .state`
- **Candy kit** (`components/games/candy/`): `CandyScreen`/`CandyButton`/`CandyChip`/`tokens` give every candy game the same shell; `WinCelebration` is the single win moment (YOU WON panel, count-up, COLLECT flies coins into the balance pill; its effects are StrictMode-safe, so it works under `next dev` too). The platform credits the payout via `onRound` before the panel; result lines read plain WIN / LOSE and there are no in-scene "+N" floats
- **`lib/pick6/engine.mjs`**: shared pick-one-of-6 engine (win chance = rtp × stake / rounded payout, top payout 50 × 4x = 200) behind Penalty Crash, Chicken Catch and Lucky Minibus; outcomes come from `crypto.getRandomValues` (tests pin it via an injected rng)
- **RTP + rounding (`lib/rtp.mjs`, 2026-10-07)**: every candy game has a per-game RTP in remote config, **`games.<id>.rtp`**, default **0.98**, clamped to **[0.97, 0.99]** (`clampRtp`; `merge.mjs` applies the same clamp; `/api/admin/catalog` lists `{ default, min, max }` per game); `GamificationPlatform` passes `rtp={cfg.games.<id>?.rtp}` into each game → engine. Every payout = `stake × mult` rounded **half up** in integer hundredths (`roundHalfUp`, no float traps). Each engine derives its odds from the ACTUAL rounded payout at the chosen stake so the RTP holds at every stake: pick6 + Coin Flip `P(win) = rtp × stake / payout`; Bottle Spin solves the TRY AGAIN weight per stake; Scratch rescales its ladder per stake; Lucky Numbers picks a small whole-coin paytable per stake (achieved 97.0–99.0%, stake 1 fixed at 98.97%); Chicken Catch 2 uses `P(C ≥ x) = rtp × stake / payout(stake, x)`. `tests/rtp-all-games.test.mjs` checks every game × stake exactly
- **Economy** (`GAME_ECONOMY` in `lib/data/platform.js`): max win per game = 200 coins, extra play = 50 coins (a deliberate gamble). All pay tables scaled to the cap. NOTE: `extraPlayCost` is remote-config-driven; `maxWin` is NOT wired into pay tables yet (dashboard shows it read-only)
- **Remote config** (admin dashboard backbone, 2026-07-15): Supabase tables `platform_config`/`store_items`/`activity_events`/`purchases` (service-role only). Public `GET /api/config` (60s edge cache) merges rows over `lib/config/defaults.js` via tested `lib/config/merge.mjs`; `useRemoteConfig()` hook feeds `GamificationPlatform` — game visibility, daily plays (`lib/config/plays.mjs`), extra-play cost, store items, mission overrides (`lib/config/missions.mjs`), daily/streak/level reward tables. Config failure ⇒ hardcoded defaults, players never blocked. Changes land next widget load. `POST /api/track` = batched activity beacon (`lib/track.js`): session_start/game_played/mission_completed/daily_claimed/level_up. Tests: `npm test` (node --test, pure .mjs modules)
- Game rewards are COINS displayed as number + `/ui/reward/coins.png` icon (never "K"-money labels). Rewards read "{N} coins" ("5 gems", "1 diamond", "30 XP"), never a bare number: use `amountText`/`rewardParts` from `lib/rewardText.mjs`
- **Daily login reward** (`lib/data/dailyRewards.mjs`, re-exported by `platform.js`, remote-config key `daily_rewards`): days 1–6 = 10 coins, day 7 (7 in a row; a missed day resets to day 1) = 100 coins, coins only. `STREAK_REWARDS` (3/7/14/30-day milestones, e.g. 7 days = 300 coins + 15 gems) still pay on top
- Daily plays: all game plays refresh to their allowance at 6am local (`refreshDailyPlays` — top-up, extras carry over); `playGame` charges the extra-play cost when free plays run out
- **Widget mode**: the platform embeds on bwanabet.com as a full-screen popup — `public/widget.js` launcher (red-X dismissable bubble) + iframe (`?widget=1&uid=`); in-app red X (top-right) postMessages `100x-widget:close`. Test harness: `/widget-test.html`
- Header shows the user ID (SSO `bwanabet_user_id` → username → `?uid` → 'Player'); nav badges are things-to-attend-to in platform green (Home = unclaimed daily reward, Missions = open missions)
- Missions: difficulty = time budget (easy ~1 day, medium ~3 days, hard ~1 week); progress persists across days; missions with `gameId` open that game directly from the mission modal
- **Store (LIVE pipeline, gated on the JWT key)**: items come from remote config (CRM dashboard stocks them). Purchases are server-backed: `POST /api/purchase` (identity from the verified bwanabet JWT — NEVER client-supplied; atomic stock via `purchase_item` RPC; rate-limited) → Telegram admin-group message with a ✅ credit button (`lib/telegram/`) → `/api/telegram/webhook` (secret-verified) or the CRM Fulfillment queue credits/rejects. Rejections refund exactly-once on the player's next session (`refundedPurchaseIds`). TRUST POSTURE (user decisions 2026-07-17): production runs with `SSO_ALLOW_UNVERIFIED=true` (no JWT signing key) — accepted because purchases credit the NAMED player's bwanabet account and withdrawals lock to the registered phone number. Purchases ARE balance-enforced: `purchase_item` RPC verifies + deducts the server-held `profiles.state` kwacha/gems atomically with the stock decrement; the client mirrors the deduction and its absolute state save reconciles. Known boundary: `/api/state` saves remain client-authoritative (a modified client can still write arbitrary balances) — server-authoritative EARNING is a separate future project. If the bwanabet JWT key ever becomes available, set it + drop the override for defense in depth
- `components/modals/` — MissionDetailModal (v2 design), TutorialModal (old design, opened from games' help buttons)
- `lib/data/` — images, missions, platform, tutorials
- Features: missions, VIP, store, referrals, leaderboard (quests/predictions/trivia parked; user state keeps their keys so saved player history survives)
- Currency system: Kwacha (coins), Gems, Diamonds, XP
- Nav = **Home / Missions / Store** (2026-10; the Play and Me tabs are gone): **Home** (daily reward, then all games via `GamesGrid`, missions teaser, featured item), **Missions** (`missions`; `EarnView` = missions + streak bonuses + level milestones), **Store**. Nav icons are inline SVG in `components/redesign/NavIcons.jsx`. `LEGACY_TAB_MAP` maps old ids: `minigames`/`play.*`/`predict*` -> Home scrolled to the games, `daily` -> Home, `earn`/`earn.*`/`quests` -> Missions, `me.*`/profile ids -> Home (profile = header avatar modal)

## Design Direction
- Casino/gamified aesthetic — deep indigo-plum background palette (cyan reserved for Diamond VIP tier, General Knowledge category, in-progress indicators, diamond reward text)
- Typography: Bricolage Grotesque (display) + Onest (body) + JetBrains Mono (tabular)
- Unified card system: `.card` base with `--elevated` / `--flat` / `--match` variants
- Dopamine-driven engagement: urgency cues, progress bars, streaks
- Mobile-first, responsive grid layouts
- Skill: `.claude/skills/frontend-design/SKILL.md` loaded for design quality

## Reward Animations
- `triggerReward(tier, sourceEl, rewards)` — 22 call sites across the app
- 2-layer motion budget (excludes persistent WebGL background):
  - `small` → 1 layer: floating number(s)
  - `medium` → 2 layers: floating number(s) + gold screen flash (~180ms)
  - `big` → 2 layers: fly-to-header currency trail + confetti burst
- `useReducedMotion` hook collapses every tier to a single static floating number when `prefers-reduced-motion` is set

## Commands
```bash
npm run dev      # local dev server
npm run build    # production build
vercel --prod    # deploy to production
```

## Tools & Skills Inventory
See `TOOLS.md` for the full list of installed tools, skills, and MCP servers.
