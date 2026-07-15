# 100xBet Gamification Platform

## Project
- **Stack**: Next.js 14 (App Router), Tailwind CSS, Supabase, Lucide React, three.js + cannon-es (lazy-loaded, Lucky Dice physics)
- **Deploy**: Vercel — https://100xbet-gamification.vercel.app
- **Vercel account**: crmbwanabet-2500
- **GitHub**: crmbwanabet/gamification-platform

## Architecture
- Main container: `components/GamificationPlatform.jsx` (~1500 lines, single client component; the old pre-v2 shell was excised 2026-07-15)
- **`parked/`** — predictions, trivia, and quests were REMOVED from the platform 2026-07-15; all their code lives in `parked/` (mirror structure + README with restore notes). Nothing in `parked/` is compiled. Don't re-import from it — `git mv` files back to restore
- `components/games/` — 7 games: Dice (real rigid-body 3D physics), HighLow (casino felt + printed cards), Plinko (2D canvas physics, coin wagers), Scratch (silver tickets, first scratch locks the others), StopClock (3 escalating stages, cartoon stopwatch), TapFrenzy (cartoon icons + difficulty ramp + FRENZY), Wheel — plus `gameKit.jsx` (GameShell/GameBtn/OptionBtn)
- **Economy** (`GAME_ECONOMY` in `lib/data/platform.js`): max win per game = 200 coins, extra play = 50 coins (a deliberate gamble). All pay tables scaled to the cap. NOTE: `extraPlayCost` is remote-config-driven; `maxWin` is NOT wired into pay tables yet (dashboard shows it read-only)
- **Remote config** (admin dashboard backbone, 2026-07-15): Supabase tables `platform_config`/`store_items`/`activity_events`/`purchases` (service-role only). Public `GET /api/config` (60s edge cache) merges rows over `lib/config/defaults.js` via tested `lib/config/merge.mjs`; `useRemoteConfig()` hook feeds `GamificationPlatform` — game visibility, daily plays (`lib/config/plays.mjs`), extra-play cost, store items, mission overrides (`lib/config/missions.mjs`), daily/streak/level reward tables. Config failure ⇒ hardcoded defaults, players never blocked. Changes land next widget load. `POST /api/track` = batched activity beacon (`lib/track.js`): session_start/game_played/mission_completed/daily_claimed/level_up. Tests: `npm test` (node --test, pure .mjs modules)
- Game rewards are COINS displayed as number + `/ui/reward/coins.png` icon (never "K"-money labels)
- Daily plays: all game plays refresh to their allowance at 6am local (`refreshDailyPlays` — top-up, extras carry over); `playGame` charges the extra-play cost when free plays run out
- **Widget mode**: the platform embeds on bwanabet.com as a full-screen popup — `public/widget.js` launcher (red-X dismissable bubble) + iframe (`?widget=1&uid=`); in-app red X (top-right) postMessages `100x-widget:close`. Test harness: `/widget-test.html`
- Header shows the user ID (SSO `bwanabet_user_id` → username → `?uid` → 'Player'); nav badges are things-to-attend-to in platform green (Play = free plays left, Earn = open missions + unclaimed daily)
- Missions: difficulty = time budget (easy ~1 day, medium ~3 days, hard ~1 week); progress persists across days; missions with `gameId` open that game directly from the mission modal
- Store: `STORE_ITEMS` is EMPTY until the admin dashboard populates it (StoreView shows a restocking state; Overview hides store sections)
- `components/modals/` — MissionDetailModal (v2 design), TutorialModal (old design, opened from games' help buttons)
- `lib/data/` — images, missions, platform, tutorials
- Features: missions, VIP, store, referrals, leaderboard (quests/predictions/trivia parked; user state keeps their keys so saved player history survives)
- Currency system: Kwacha (coins), Gems, Diamonds, XP
- Tabs use hierarchical keys (`home`, `play.*`, `earn.*`, `me.*`) with `LEGACY_TAB_MAP` for CTA compatibility

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
