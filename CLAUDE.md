# 100xBet Gamification Platform

## Project
- **Stack**: Next.js 14 (App Router), Tailwind CSS, Supabase, Lucide React, three.js + cannon-es (lazy-loaded, Lucky Dice physics)
- **Deploy**: Vercel — https://100xbet-gamification.vercel.app
- **Vercel account**: crmbwanabet-2500
- **GitHub**: crmbwanabet/gamification-platform

## Architecture
- Main container: `components/GamificationPlatform.jsx` (~3600 lines after modular split)
- `components/games/` — 7 games: Dice (real rigid-body 3D physics), HighLow (casino felt + printed cards), Plinko (2D canvas physics, coin wagers), Scratch (silver tickets, pick-any + peek-through), StopClock, TapFrenzy, Wheel — plus 3 trivia games and `gameKit.jsx` (GameShell/GameBtn/OptionBtn)
- Game rewards are COINS displayed as number + `/ui/reward/coins.png` icon (never "K"-money labels)
- Daily plays: all game + trivia plays refresh to their allowance at 6am local (`refreshDailyPlays` — top-up, extras carry over)
- `components/modals/` — MissionDetailModal, QuestDetailModal, TutorialModal
- `components/ui/` — AnimatedGradientBG (WebGL2 shader), DailyTriviaChallenge
- `lib/data/` — images, missions, platform, trivia, tutorials
- Features: missions, quests, VIP, store, predictions, referrals, leaderboard, daily trivia
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
