# Trivia Restoration & Wheel Visual Parity — Design

**Date:** 2026-05-04
**Repo:** `crmbwanabet/gamification-platform`
**Branch:** `main` (work currently uncommitted)

---

## 1. Overview

Two changes shipped together:

1. **Trivia restoration** — bring back ClassicQuiz, SpeedRound, and StreakTrivia mini-games removed in commit `4e9095c`. Recover gameplay logic from git, re-skin to the current palette/typography/card system.
2. **Wheel visual parity** — finish the in-progress `WheelGame.jsx` rewrite so the in-platform wheel looks and feels exactly like the standalone widget at `wheel-of-fortune-roan.vercel.app`. Visual/animation parity only — no server-side spin, no Supabase tables, no Telegram, no daily lockout.

---

## 2. Goals & Non-Goals

**Goals**

- Restore 3 quiz games as playable mini-games inside `play.minigames` under a "Trivia" sub-section.
- Match standalone wheel widget's spin physics, particle system, count-up, screen shake, result overlay.
- Keep the wheel a free in-platform mini-game paying platform Kwacha — multi-play (`gamePlays.wheel`), like other games.
- Restore trivia missions and `triviaPlays` user-state, matching pre-refactor behavior.

**Non-goals**

- Server-side spin endpoint, Supabase widget tables, Telegram alerts, customer-ID validation, real-money prize budget — all standalone widget backend stays out.
- 1-spin-per-day-forever lockout on the platform wheel.
- Changes to `DailyTriviaChallenge` or the `play.daily` tab (already exists, stays as-is).
- New trivia categories or new trivia games beyond the original three.

---

## 3. File-Level Map

### New / restored

- `components/games/ClassicQuizGame.jsx` — already drafted in WIP (271 lines, untracked). Keep as the canonical pattern; minor polish during the re-skin pass.
- `components/games/SpeedRoundGame.jsx` — recover via `git show 4e9095c~1:components/games/SpeedRoundGame.jsx > components/games/SpeedRoundGame.jsx`, then re-skin.
- `components/games/StreakTriviaGame.jsx` — recover via `git show 4e9095c~1:components/games/StreakTriviaGame.jsx > components/games/StreakTriviaGame.jsx`, then re-skin.

### Modified

- `components/GamificationPlatform.jsx`
  - Add 3 imports: `ClassicQuizGame`, `SpeedRoundGame`, `StreakTriviaGame`.
  - Restore `triviaPlays: { classicQuiz: 3, speedRound: 5, streakTrivia: 3 }` on user-state initial.
  - Restore `playTrivia(triviaId)` handler (decrement count, mount game).
  - Restore the 3 game-mount JSX blocks.
  - Restore the "Trivia" section inside `play.minigames` (3-col grid below the games grid). Use `.card` / `.card--elevated` instead of legacy `card-interactive`.
- `components/games/WheelGame.jsx` — finish WIP. See §5.
- `lib/data/missions.js` — re-add 5 trivia missions: `d_trivia1`, `d_trivia10`, `d_speed12`, `d_tstreak5`, `w_trivia50`.
- `lib/data/images.js` — re-add 3 image keys (`classicQuiz`, `speedRound`, `streakTrivia`) referenced by trivia tiles and missions.

### Untouched

- `components/ui/DailyTriviaChallenge.jsx`, `play.daily` tab, `lib/data/trivia.js` (question pools already intact).

---

## 4. Trivia Restoration

### Re-skin pass

Recovered files reflect pre-refactor styles. Update each:

1. **Palette** — cyan `#06b6d4` and Tailwind `cyan-*` classes → plum (match existing CSS vars / Tailwind classes used elsewhere). Preserve cyan only where semantic (in-progress indicators, diamond-tier text — unlikely in trivia, flag if found).
2. **Typography** — drop explicit `font-` overrides; rely on `font-display` (Bricolage Grotesque), `font-body` (Onest), `font-mono` (JetBrains Mono) layout defaults.
3. **Cards / surfaces** — replace `card-interactive` etc. with the unified `.card` system (`.card`, `.card--elevated`, `.card--flat`). Trivia tiles → `.card--elevated`.
4. **Option-color scheme** — reuse the 4-color option palette from `ClassicQuizGame.jsx` (rose / blue / amber / emerald) across SpeedRound and StreakTrivia for trio cohesion, even if originals had different colors.
5. **Reward integration** — keep the `onWin` callback contract; trivia wins fire the platform's normal `triggerReward()` flow (unlike the wheel — see §5).

### Restored missions (in `lib/data/missions.js`)

| ID | Name | Type | Target | Reward | Difficulty |
|----|------|------|--------|--------|------------|
| `d_trivia1` | Quiz Time | `triviaPlay` | 1 | K50 + 25xp | easy |
| `d_trivia10` | Trivia Buff | `triviaCorrect` | 10 | K175 + 50xp | medium |
| `d_speed12` | Speed Demon | `speedScore` | 12 | K200 + 60xp | medium |
| `d_tstreak5` | Trivia Streak | `triviaStreak` | 5 | K400 + 5 gems + 100xp | hard |
| `w_trivia50` | Trivia Master | `weeklyTriviaCorrect` | 50 | K500 + 12 gems + 120xp | hard |

CTA target: `'minigames'` → maps via `LEGACY_TAB_MAP` to `play.minigames`.

### IA placement

Inside `play.minigames`, render the existing 7-game grid first, then a "Trivia" section heading followed by a 3-tile grid for ClassicQuiz / SpeedRound / StreakTrivia. Matches the pre-refactor layout. `play.daily` continues to host `DailyTriviaChallenge` separately.

---

## 5. Wheel Visual Parity

### WIP audit (current state of `components/games/WheelGame.jsx`, 887 lines)

| Standalone feature | WIP status |
|---|---|
| 10 segments (5 prizes K10/20/50/100/200 + 5 losses) | ✅ done |
| 3-phase animation (free spin → friction → easeOutCubic) | ✅ done |
| Pulsing STOP button + hub ring pulse | ✅ done |
| Particle system | ✅ ported from widget |
| Count-up K0→final on win | ✅ done |
| Screen flash + confetti + floating numbers | ✅ done |
| Result overlay (YOU WON / BETTER LUCK) | ✅ done |
| Tutorial entry (HelpCircle button) | ✅ wired |
| Pointer-peg spring physics | Verify; port from widget if absent |
| 1.5s pause after stop before result overlay | Verify; add `setTimeout(..., 1500)` if absent |

### Rigging note (added 2026-05-04)

The WIP wheel is intentionally rigged to always land on a prize segment (`WheelGame.jsx:355–359`). Loss segments stay on the wheel for **visual fidelity** with the standalone widget, but `winIndices` excludes them so users never land on a loss. This is deliberate: in the platform context, the user already spends a `gamePlays.wheel` to open the wheel, so every spin must be rewarding.

Consequence for this scope: the loss-overlay copy never renders, so the loss-overlay copy edit is dropped. The loss-segment label cleanup remains (cosmetic — visual fidelity wants concise labels even on decorative slots). Rigging tuning (slight loss probability, gem prizes) is **deferred** to a later pass.

### Concrete edits required

1. **Loss-segment label cleanup** — for each `isLoss: true` entry in `WHEEL_SEGMENTS`:
   ```js
   label: 'Try Again Tomorrow'  →  label: 'Try Again'
   ```
   Cosmetic only (loss segments never get picked), but cleaner.

2. **Verify single celebration** — `claimPrize` calls `onWin(prize)` (routes through the platform's normal currency-add path) but must NOT also call `triggerReward()`. The standalone overlay is the only celebration. If `triggerReward('big', ...)` is currently invoked from the wheel win path, remove that call.

3. **Pointer-peg spring physics** — confirm presence of stiffness 0.3, damping 0.15, impulse-on-hit (impulse scales with rotation speed). Already confirmed in WIP at lines 308–330.

4. **1.5s post-stop pause** — confirm there's a 1500ms gap between wheel stop-detect and `setSpinResult(...)`. Add a `setTimeout` if absent.

### Deferred (out of scope for this change)

- Rigging tuning — slight loss probability, the exact win/loss ratio.
- Prize-data changes — adding gem rewards to segments.

### What does NOT change

- Segment data (10-slot layout, prize values, colors) — already matches standalone.
- Wheel size, frame, peg placement, glossy overlays — already matches.
- `gamePlays.wheel` decrement on play — keeps existing multi-play behavior.
- `onWin` callback contract — currency goes to header via existing platform flow.

---

## 6. Verification (manual, in-browser)

No formal test suite. Verification surface:

**Build gate** — `npm run build` succeeds.

**Trivia smoke test** (`npm run dev`)
- `play.minigames` shows 7 games + 3 trivia tiles in a "Trivia" section.
- Each trivia tile shows free-play counter (3/5/3 initial), disables to "X coins" at zero.
- Each game opens, plays through, fires `triggerReward()`, currency lands in header.
- Trivia missions appear and progress.

**Wheel smoke test**
- Wheel tile opens at the standalone-style spin screen.
- Spin → STOP → friction → easeOut land. Pointer peg visibly springs.
- ~1.5s pause after stop, result overlay zooms in.
- Win path: count-up, screen flash, confetti, particles, "Claim Prize" → currency to header. **No** second confetti burst from `triggerReward`.
- Loss path: overlay shows "BETTER LUCK NEXT TIME" / "TRY AGAIN" (not "TOMORROW").
- `gamePlays.wheel` decrements; multi-play works.

**Reduced-motion check** — DevTools → Rendering → emulate `prefers-reduced-motion: reduce`.
- Trivia: 1-layer floating numbers (`useReducedMotion` collapses tiers).
- Wheel: standalone overlay still shows, particles/confetti suppressed by CSS `@media` safety net.

**Visual consistency** — trivia screens use plum, Bricolage display, Onest body, `.card` system. No leftover cyan or Inter.

---

## 7. Sequencing

Bundle as one PR/commit. Both touch `GamificationPlatform.jsx`; both are self-contained. The trivia work and wheel polish don't have logical dependencies but ship together as a coherent "restore + finish wheel" change.

Ordering inside the implementation plan:

1. Restore SpeedRoundGame + StreakTriviaGame from git, re-skin all 3 trivia games.
2. Wire trivia into `GamificationPlatform.jsx` (imports, state, handler, mounts, IA section).
3. Re-add trivia missions and image keys.
4. Wheel polish (3 concrete edits + 2 verifications).
5. Build, manual smoke test, commit.
