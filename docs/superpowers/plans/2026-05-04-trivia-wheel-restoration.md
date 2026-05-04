# Trivia Restoration & Wheel Visual Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring back SpeedRound + StreakTrivia trivia games (ClassicQuiz already wired in WIP), and finish the WheelGame.jsx visual-parity port to the standalone bwanabet.com widget.

**Architecture:** Recover the two deleted trivia game files from git commit `4e9095c~1`, re-skin them to current palette (plum), typography (Bricolage/Onest), and card system (`.card`). Re-wire imports/state/mounts in `GamificationPlatform.jsx` mirroring the existing ClassicQuiz pattern. Re-add deleted image keys, `TRIVIA_GAMES` entries, and trivia missions. For the wheel: clean up cosmetic loss-segment labels (loss path is rigged-dead but labels stay visible), and verify two animation invariants are present.

**Tech Stack:** Next.js 14 App Router, React, Tailwind CSS, Lucide React. No formal test suite — verification is `npm run build` + manual `npm run dev` smoke testing.

**Spec:** `docs/superpowers/specs/2026-05-04-trivia-wheel-restoration-design.md`

---

## Pre-flight

Before starting, run these once to confirm baseline:

```bash
git status --short
git log --oneline -3
```

Expected: working tree has the WIP changes from before this plan started (modified `WheelGame.jsx`, untracked `ClassicQuizGame.jsx`, etc.). Top commit is `c2dc0ec` (spec amend).

If the working tree is unexpectedly clean, the engineer is starting from a different state than this plan was written against — pause and reconcile before proceeding.

---

## Task 1: Stage current WIP as a baseline commit

The user already wired most of ClassicQuiz and most of the wheel parity. Commit that as a clean baseline so subsequent tasks have a known starting point and atomic diffs.

**Files:**
- Stage: `components/games/ClassicQuizGame.jsx`, `components/games/WheelGame.jsx`, `components/GamificationPlatform.jsx`, `app/globals.css`, `lib/data/trivia.js`, `CLAUDE.md`, `.gitignore`

- [ ] **Step 1: Inspect what's about to be committed**

```bash
git status --short
git diff --stat HEAD -- components/games/WheelGame.jsx components/GamificationPlatform.jsx lib/data/trivia.js app/globals.css
```

Read each modified file's diff to confirm changes are the WIP you expect (no surprise edits).

- [ ] **Step 2: Stage and commit the WIP baseline**

```bash
git add components/games/ClassicQuizGame.jsx \
        components/games/WheelGame.jsx \
        components/GamificationPlatform.jsx \
        app/globals.css \
        lib/data/trivia.js \
        CLAUDE.md \
        .gitignore
git commit -m "$(cat <<'EOF'
WIP baseline: ClassicQuiz wired, wheel visual parity ~85%

Captures the in-progress state before restoring SpeedRound and
StreakTrivia and finishing wheel polish. ClassicQuiz is fully wired
(import, state, handler, mount, Trivia section UI). Wheel has rigged
always-win logic, particle system, count-up, screen flash, confetti,
and result overlay; loss-segment labels and a single-celebration
verification still pending.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 3: Verify baseline builds**

```bash
npm run build
```

Expected: build succeeds. If it fails, the WIP itself has a bug that must be fixed before proceeding.

---

## Task 2: Re-add trivia image keys

`SpeedRoundGame` and `StreakTriviaGame` tiles will reference `IMAGES.speedRound` and `IMAGES.streakTrivia`. Both keys were stripped in commit `4e9095c`. Restore them.

**Files:**
- Modify: `lib/data/images.js`

- [ ] **Step 1: Add the two missing image keys**

In `lib/data/images.js`, locate the `IMAGES` object and add these entries near the existing `brainQuiz` line (line 31):

```js
  brainQuiz: `${IMG_BASE}/brain-quiz.jpg`,
  speedRound: `${IMG_BASE}/speed-round.jpg`,
  streakTrivia: `${IMG_BASE}/streak-trivia.jpg`,
```

(Insert `speedRound` and `streakTrivia` after `brainQuiz`. Existing keys remain unchanged.)

- [ ] **Step 2: Verify the underlying images exist on the CDN**

The `IMG_BASE` constant points to `https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images`. Confirm both files exist:

```bash
curl -sIL https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images/speed-round.jpg | grep -E "HTTP|content-type"
curl -sIL https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images/streak-trivia.jpg | grep -E "HTTP|content-type"
```

Expected: both return `HTTP/1.1 200` (or similar) and a `content-type: image/jpeg` header. If either 404s, the engineer must upload the missing image to that repo before tiles will render — flag this and continue, treating the missing image as a follow-up.

- [ ] **Step 3: Verify build still passes**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add lib/data/images.js
git commit -m "$(cat <<'EOF'
Restore trivia image keys for SpeedRound and StreakTrivia

Stripped in 4e9095c with the trivia game removal; needed again now
that the games are coming back.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Restore TRIVIA_GAMES entries for SpeedRound and StreakTrivia

The `TRIVIA_GAMES` array in `lib/data/trivia.js` currently has only `classicQuiz`. Re-add the two trimmed entries so the trivia tile section renders three tiles.

**Files:**
- Modify: `lib/data/trivia.js`

- [ ] **Step 1: Add SpeedRound and StreakTrivia entries**

In `lib/data/trivia.js` around line 89, replace:

```js
export const TRIVIA_GAMES = [
  { id: 'classicQuiz', name: 'Classic Quiz', desc: '10 questions, pick a category', icon: '🧠', color: 'from-purple-500 to-fuchsia-600', free: 3, cost: 30, image: 'brainQuiz' },
];
```

with:

```js
export const TRIVIA_GAMES = [
  { id: 'classicQuiz',  name: 'Classic Quiz',   desc: '10 questions, pick a category', icon: '🧠', color: 'from-purple-500 to-fuchsia-600', free: 3, cost: 30, image: 'brainQuiz' },
  { id: 'speedRound',   name: 'Speed Round',    desc: '20 True/False in 60 seconds',   icon: '⚡', color: 'from-amber-500 to-orange-600',   free: 5, cost: 20, image: 'speedRound',   isNew: true },
  { id: 'streakTrivia', name: 'Streak Trivia',  desc: 'Answer or cash out!',            icon: '🏆', color: 'from-rose-500 to-pink-600',      free: 3, cost: 25, image: 'streakTrivia' },
];
```

Note: pre-refactor entries used `from-yellow-*` / `from-red-*` color tokens. Updated to `amber` / `rose` for consistency with the option-color palette used in `ClassicQuizGame.jsx`.

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Quick visual check (optional, recommended)**

```bash
npm run dev
```

Open `http://localhost:3000`, navigate to the Play tab → Minigames. The Trivia section at the bottom should now show 3 tiles (Classic Quiz, Speed Round, Streak Trivia). Clicking Speed Round or Streak Trivia will throw a runtime error because the components don't exist yet — this is expected, the next tasks fix it.

Stop the dev server with `Ctrl+C`.

- [ ] **Step 4: Commit**

```bash
git add lib/data/trivia.js
git commit -m "$(cat <<'EOF'
Restore SpeedRound and StreakTrivia entries in TRIVIA_GAMES

Updates color tokens to amber/rose (was yellow/red pre-refactor) to
match the ClassicQuiz option-color palette. Tiles now render but
clicking SpeedRound/StreakTrivia errors until components are restored.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Recover SpeedRoundGame.jsx from git

Restore the deleted file as-is from one commit before the refactor that removed it. Re-skin happens in Task 5.

**Files:**
- Create: `components/games/SpeedRoundGame.jsx`

- [ ] **Step 1: Recover the file**

```bash
git show 4e9095c~1:components/games/SpeedRoundGame.jsx > components/games/SpeedRoundGame.jsx
```

- [ ] **Step 2: Verify the file exists and has expected content**

```bash
wc -l components/games/SpeedRoundGame.jsx
head -10 components/games/SpeedRoundGame.jsx
```

Expected: ~220 lines, starts with `'use client';` and imports `getSpeedQuestions` from `'../../lib/data/trivia'`.

- [ ] **Step 3: Confirm `getSpeedQuestions` exists in trivia.js**

```bash
grep -n "getSpeedQuestions" lib/data/trivia.js
```

Expected: at least one match. If missing, the engineer needs to also recover that helper from git — flag and pause.

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

Expected: build succeeds (file uses existing exports). It may have lint warnings about unused imports or style issues — those are expected and fixed during re-skin.

- [ ] **Step 5: Do NOT commit yet — re-skin happens in Task 5 and they commit together.**

---

## Task 5: Re-skin SpeedRoundGame.jsx

The recovered file uses pre-refactor styling: cyan accents, Inter typography classes, legacy card classes. Bring it in line with the rest of the app.

**Files:**
- Modify: `components/games/SpeedRoundGame.jsx`

- [ ] **Step 1: Inventory style mismatches**

Read the file, scanning for these patterns. Note line numbers for each occurrence.

```bash
grep -n -E "cyan-|sky-|#06b6d4|#0891b2|font-(sans|inter)|card-interactive|card-glass" components/games/SpeedRoundGame.jsx
```

- [ ] **Step 2: Apply re-skin transformations**

For each match found above, apply this mapping (all colors are illustrative — match what the rest of the codebase uses):

| Old | New | Reason |
|-----|-----|--------|
| `from-cyan-*`, `to-cyan-*` (non-semantic) | `from-purple-*`, `from-fuchsia-*`, or context-appropriate plum | Palette switch |
| `cyan-500/40` etc. (border/glow) | `purple-500/40`, `fuchsia-500/40` | Palette switch |
| `text-cyan-400` (decorative) | `text-purple-300` or `text-fuchsia-300` | Palette switch |
| `font-sans`, explicit `font-inter` | (remove — body inherits Onest) | Typography |
| `card-interactive` | `card card--elevated` | Unified card system |
| `card-glass` | `card card--flat` | Unified card system |

**Preserve cyan only where semantic** — search for any of: VIP-Diamond context, "in progress" indicators, "diamond reward" copy. SpeedRound is unlikely to have any of these; if so, don't change them.

- [ ] **Step 3: Match ClassicQuiz option colors for trio cohesion**

If `SpeedRoundGame.jsx` has any per-option color arrays (e.g., a True/False palette), align them with `ClassicQuizGame.jsx`'s 4-color set: rose / blue / amber / emerald. Skip if SpeedRound only uses 2 colors (True/False) — pick rose for False, emerald for True.

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

- [ ] **Step 5: Manual visual smoke test**

```bash
npm run dev
```

Open `http://localhost:3000` → Play → Minigames → click Speed Round tile. Game should open. Play through:

- "Ready" screen renders with current typography (Bricolage display, Onest body).
- Start the round; True/False buttons show plum-aligned colors, not cyan.
- Timer counts down. Combo updates.
- Round ends, result screen renders, "Play Again" or close works.
- No console errors.

Stop dev server.

- [ ] **Step 6: Commit Task 4 + Task 5 together**

```bash
git add components/games/SpeedRoundGame.jsx
git commit -m "$(cat <<'EOF'
Restore SpeedRoundGame, reskinned to current palette

Recovered from 4e9095c~1 and updated: cyan -> plum/purple, dropped
explicit Inter classes (Onest is the body default), card-interactive
-> unified .card system, True/False button colors aligned with
ClassicQuiz palette (rose/emerald) for trio cohesion.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Recover StreakTriviaGame.jsx from git

Same pattern as Task 4 but for StreakTrivia.

**Files:**
- Create: `components/games/StreakTriviaGame.jsx`

- [ ] **Step 1: Recover the file**

```bash
git show 4e9095c~1:components/games/StreakTriviaGame.jsx > components/games/StreakTriviaGame.jsx
```

- [ ] **Step 2: Verify the file exists and has expected content**

```bash
wc -l components/games/StreakTriviaGame.jsx
head -10 components/games/StreakTriviaGame.jsx
```

Expected: ~275 lines, starts with `'use client';` and imports `getRandomQuestion` from `'../../lib/data/trivia'`.

- [ ] **Step 3: Confirm `getRandomQuestion` exists in trivia.js**

```bash
grep -n "getRandomQuestion" lib/data/trivia.js
```

Expected: at least one match. If missing, recover from git first.

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

- [ ] **Step 5: Do NOT commit yet — re-skin happens in Task 7 and they commit together.**

---

## Task 7: Re-skin StreakTriviaGame.jsx

Same mapping as Task 5.

**Files:**
- Modify: `components/games/StreakTriviaGame.jsx`

- [ ] **Step 1: Inventory style mismatches**

```bash
grep -n -E "cyan-|sky-|#06b6d4|#0891b2|font-(sans|inter)|card-interactive|card-glass" components/games/StreakTriviaGame.jsx
```

- [ ] **Step 2: Apply re-skin transformations**

Same mapping table as Task 5. Note that StreakTriviaGame already has a 4-color `barColors` array (rose / blue / amber / teal). Update `teal` → `emerald` for consistency with ClassicQuiz palette:

```js
// In barColors, change the 4th entry:
{ bg: 'from-teal-600/30 to-emerald-700/20', border: 'border-teal-500/40', dot: 'bg-teal-500', hover: 'hover:border-teal-400/60', glow: 'shadow-teal-500/15' },
```

becomes:

```js
{ bg: 'from-emerald-600/30 to-green-700/20', border: 'border-emerald-500/40', dot: 'bg-emerald-500', hover: 'hover:border-emerald-400/60', glow: 'shadow-emerald-500/15' },
```

(Remaining 3 colors — rose, blue, amber — already match ClassicQuiz; the 2nd one in ClassicQuiz uses `indigo`/`cyan` border-from but the visual is close enough — preserve original blue tokens.)

- [ ] **Step 3: Verify build passes**

```bash
npm run build
```

- [ ] **Step 4: Manual visual smoke test**

```bash
npm run dev
```

Open Play → Minigames → Streak Trivia tile. Game should open. Play through:

- Ready screen renders with current typography.
- Start; option buttons show 4-color palette aligned with ClassicQuiz.
- Streak counter increments on correct, "cash out" works.
- Game over screen renders.
- No console errors.

Stop dev server.

- [ ] **Step 5: Commit Task 6 + Task 7 together**

```bash
git add components/games/StreakTriviaGame.jsx
git commit -m "$(cat <<'EOF'
Restore StreakTriviaGame, reskinned to current palette

Recovered from 4e9095c~1 and updated: cyan -> plum/purple, dropped
explicit Inter classes, card-interactive -> .card system, 4th option
color teal -> emerald to align with ClassicQuiz/SpeedRound option
palette.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Wire SpeedRound and StreakTrivia into GamificationPlatform.jsx

Mirror the existing ClassicQuiz wiring pattern for both new games.

**Files:**
- Modify: `components/GamificationPlatform.jsx`

- [ ] **Step 1: Add imports**

Around line 45 (where `ClassicQuizGame` is imported), add two more imports:

```js
import ClassicQuizGame from './games/ClassicQuizGame';
import SpeedRoundGame from './games/SpeedRoundGame';
import StreakTriviaGame from './games/StreakTriviaGame';
```

- [ ] **Step 2: Expand the triviaPlays initial state**

Around line 872, locate:

```js
triviaPlays: { classicQuiz: 3 },
```

Replace with:

```js
triviaPlays: { classicQuiz: 3, speedRound: 5, streakTrivia: 3 },
```

These free-play counts mirror the pre-refactor defaults and `TRIVIA_GAMES.free` values.

- [ ] **Step 3: Add the two missing game-mount JSX blocks**

Around line 1517–1530, the existing ClassicQuiz mount looks like this:

```jsx
{activeTrivia === 'classicQuiz' && (
  <ClassicQuizGame
    onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
    onWin={(n, meta) => {
      addCoins(n);
      showNotif('🧠 +' + n + ' Coins!');
      triggerReward('medium', null, { coins: n });
      trackMission('triviaPlayed', { triviaType: 'classic' });
      trackQuest('triviaPlayed', {});
      if (meta?.triviaCorrect) { trackMission('triviaCorrect', { count: meta.triviaCorrect }); trackQuest('triviaCorrect', { count: meta.triviaCorrect }); }
      trackQuest('coinsEarned', { amount: n });
    }}
  />
)}
```

Immediately after that block (and before the next `{/* Quest Detail Modal */}` comment), add these two blocks:

```jsx
{activeTrivia === 'speedRound' && (
  <SpeedRoundGame
    onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
    onWin={(n, meta) => {
      addCoins(n);
      showNotif('⚡ +' + n + ' Coins!');
      triggerReward('medium', null, { coins: n });
      trackMission('triviaPlayed', { triviaType: 'speed' });
      trackQuest('triviaPlayed', {});
      if (meta?.triviaCorrect) { trackMission('triviaCorrect', { count: meta.triviaCorrect }); trackQuest('triviaCorrect', { count: meta.triviaCorrect }); }
      if (meta?.triviaCorrect) { trackMission('speedScore', { score: meta.triviaCorrect }); }
      trackQuest('coinsEarned', { amount: n });
    }}
  />
)}

{activeTrivia === 'streakTrivia' && (
  <StreakTriviaGame
    onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
    onWin={(n, meta) => {
      addCoins(n);
      showNotif('🏆 +' + n + ' Coins!');
      triggerReward('medium', null, { coins: n });
      trackMission('triviaPlayed', { triviaType: 'streak' });
      trackQuest('triviaPlayed', {});
      if (meta?.triviaCorrect) { trackMission('triviaCorrect', { count: meta.triviaCorrect }); trackQuest('triviaCorrect', { count: meta.triviaCorrect }); }
      if (meta?.maxStreak) { trackMission('triviaStreak', { streak: meta.maxStreak }); }
      trackQuest('coinsEarned', { amount: n });
    }}
  />
)}
```

The `meta.maxStreak` and `speedScore` tracker calls assume the recovered games pass those fields in their `onWin` callbacks. Verify by grepping:

```bash
grep -n "onWin(" components/games/SpeedRoundGame.jsx
grep -n "onWin(" components/games/StreakTriviaGame.jsx
```

If the recovered games don't pass `maxStreak` or score, either (a) update the games to pass them or (b) remove the corresponding `trackMission` lines. Original games did pass them — they should still work.

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

- [ ] **Step 5: Manual smoke test all three trivia games**

```bash
npm run dev
```

Open Play → Minigames → Trivia section. All three tiles render. Each tile shows free-play counter (3 / 5 / 3 respectively).

Click each tile in turn:
- ClassicQuiz: opens, plays, win lands coins in header, returns to Minigames tab.
- SpeedRound: opens, plays, win lands coins, returns. Free-play counter decrements.
- StreakTrivia: opens, plays, win lands coins, returns. Free-play counter decrements.

After playing all three: free-play counts should be 2 / 4 / 2.

Stop dev server.

- [ ] **Step 6: Commit**

```bash
git add components/GamificationPlatform.jsx
git commit -m "$(cat <<'EOF'
Wire SpeedRound and StreakTrivia into platform

Add imports, expand triviaPlays initial state, add the two missing
game-mount JSX blocks mirroring the existing ClassicQuiz pattern.
Trivia section in play.minigames now renders three working tiles.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Re-add the 5 trivia missions

Restore the missions deleted alongside the trivia games so trivia play actually progresses missions.

**Files:**
- Modify: `lib/data/missions.js`

- [ ] **Step 1: Inspect current daily and weekly mission arrays**

```bash
grep -n -E "DAILY_MISSIONS|WEEKLY_MISSIONS" lib/data/missions.js
```

Note the line numbers where each array opens and closes. The 4 daily trivia missions go at the end of the daily array (before the closing `];`). The weekly one goes at the end of the weekly array.

- [ ] **Step 2: Add 4 daily trivia missions**

Insert these four entries at the end of the `DAILY_MISSIONS` array (before its closing `];`):

```js
  { id: 'd_trivia1',  name: 'Quiz Time',     desc: 'Play 1 trivia game',                    difficulty: 'easy',   target: 1,  type: 'triviaPlay',     reward: { kwacha: 50 },             xp: 25,  image: 'brainQuiz',    cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_trivia10', name: 'Trivia Buff',   desc: 'Answer 10 questions correctly',          difficulty: 'medium', target: 10, type: 'triviaCorrect',  reward: { kwacha: 175 },            xp: 50,  image: 'brainQuiz',    cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_speed12',  name: 'Speed Demon',   desc: 'Score 12+ in Speed Round',               difficulty: 'medium', target: 12, type: 'speedScore',     reward: { kwacha: 200 },            xp: 60,  image: 'speedRound',   cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_tstreak5', name: 'Trivia Streak', desc: 'Reach streak of 5 in Streak Trivia',     difficulty: 'hard',   target: 5,  type: 'triviaStreak',   reward: { kwacha: 400, gems: 5 },   xp: 100, image: 'streakTrivia', cta: 'minigames', ctaLabel: 'Go to Games' },
```

Note: pre-refactor `d_trivia1` and `d_trivia10` used `image: 'classicQuiz'`. Updated to `image: 'brainQuiz'` to match the current ClassicQuiz image key.

- [ ] **Step 3: Add 1 weekly trivia mission**

Insert this entry at the end of the `WEEKLY_MISSIONS` array (before its closing `];`):

```js
  { id: 'w_trivia50', name: 'Trivia Master', desc: 'Answer 50 questions correctly this week', difficulty: 'hard', target: 50, type: 'weeklyTriviaCorrect', reward: { kwacha: 500, gems: 12 }, xp: 120, image: 'brainQuiz', cta: 'minigames', ctaLabel: 'Go to Games' },
```

- [ ] **Step 4: Verify the mission tracker types are wired**

The new missions use `type` values: `triviaPlay`, `triviaCorrect`, `speedScore`, `triviaStreak`, `weeklyTriviaCorrect`. The `trackMission` calls in Task 8 use `triviaPlayed`, `triviaCorrect`, `speedScore`, `triviaStreak`. There's a mismatch: `triviaPlay` (mission type) vs `triviaPlayed` (tracker action).

Decide which side to align. Check how other missions and tracker calls correlate:

```bash
grep -n "trackMission" components/GamificationPlatform.jsx | head -20
grep -n "case '" components/GamificationPlatform.jsx | grep -E "trivia|speed|streak" | head -10
```

If the existing convention uses past-tense action names (`triviaPlayed`) and the missions key off that, update the new mission's `type` to match. If missions key directly off the literal `type` field, keep it as-is and update `trackMission` calls.

Most likely fix: change the new mission `type: 'triviaPlay'` → `type: 'triviaPlayed'` to match the tracker call already in the WIP ClassicQuiz mount (line 1524).

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

- [ ] **Step 6: Manual smoke test mission progress**

```bash
npm run dev
```

- Navigate to Missions tab. The 4 new daily trivia missions appear. The new weekly mission appears in the weekly tab.
- Play any trivia game. Return to Missions. The "Quiz Time" mission shows progress 1/1 and is claimable.
- Win a SpeedRound with score >= 12. "Speed Demon" shows progress.
- Win a StreakTrivia with streak >= 5. "Trivia Streak" shows progress.

Stop dev server.

- [ ] **Step 7: Commit**

```bash
git add lib/data/missions.js
git commit -m "$(cat <<'EOF'
Restore 5 trivia missions

Re-adds 4 daily missions (d_trivia1, d_trivia10, d_speed12,
d_tstreak5) and 1 weekly (w_trivia50). Image keys updated from
'classicQuiz' to 'brainQuiz' to match current image inventory.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Wheel — clean up loss-segment labels (cosmetic)

The wheel is rigged to always land on a prize segment (`WheelGame.jsx:355-359`), but loss segments stay on the wheel for visual fidelity. The current label "Try Again Tomorrow" is leftover from the daily-lockout standalone widget — irrelevant in the multi-play platform context. Update for visual cleanliness even though users never land here.

**Files:**
- Modify: `components/games/WheelGame.jsx`

- [ ] **Step 1: Update loss-segment labels**

In `components/games/WheelGame.jsx` around lines 11–22, find the `WHEEL_SEGMENTS` array. Each `isLoss: true` entry has `label: 'Try Again Tomorrow'`. Change all five to `label: 'Try Again'`:

```js
const WHEEL_SEGMENTS = [
  { id: 1,  label: 'K10',         prize: { kwacha: 10 },  color: '#00e5ff', isLoss: false },
  { id: 2,  label: 'Try Again',   prize: null,            color: '#78909c', isLoss: true  },
  { id: 3,  label: 'K50',         prize: { kwacha: 50 },  color: '#d500f9', isLoss: false },
  { id: 4,  label: 'Try Again',   prize: null,            color: '#78909c', isLoss: true  },
  { id: 5,  label: 'K200',        prize: { kwacha: 200 }, color: '#ffd600', isLoss: false },
  { id: 6,  label: 'Try Again',   prize: null,            color: '#78909c', isLoss: true  },
  { id: 7,  label: 'K20',         prize: { kwacha: 20 },  color: '#00e676', isLoss: false },
  { id: 8,  label: 'Try Again',   prize: null,            color: '#78909c', isLoss: true  },
  { id: 9,  label: 'K100',        prize: { kwacha: 100 }, color: '#ff6d00', isLoss: false },
  { id: 10, label: 'Try Again',   prize: null,            color: '#78909c', isLoss: true  },
];
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build
```

- [ ] **Step 3: Visual confirmation**

```bash
npm run dev
```

Open Play → Minigames → Wheel. The wheel renders. The 5 grey segments now read "Try Again" instead of "Try Again Tomorrow". Spin and land on a prize — loss path doesn't fire (rigged).

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add components/games/WheelGame.jsx
git commit -m "$(cat <<'EOF'
Wheel: shorten loss-segment labels to 'Try Again'

The platform wheel uses gamePlays.wheel multi-play, so the standalone
widget's daily-lockout 'Try Again Tomorrow' copy doesn't apply.
Loss segments are decorative (rigged-dead path) but the label change
still cleans up the visible wheel.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Wheel — verify single celebration (no double triggerReward)

Per spec §5.2: the standalone overlay (count-up + confetti + screen flash) is the ONLY celebration. `claimPrize` should call `onWin(prize)` to credit the currency but must NOT also call `triggerReward()`. Verify and remove if found.

**Files:**
- Inspect / possibly modify: `components/games/WheelGame.jsx`
- Inspect: `components/GamificationPlatform.jsx` (the `onWin` handler passed to `<WheelGame />`)

- [ ] **Step 1: Find the wheel's `onWin` handler in GamificationPlatform.jsx**

```bash
grep -n -B1 -A12 "<WheelGame" components/GamificationPlatform.jsx
```

Read the entire `onWin={(...) => { ... }}` block. List every function it calls.

- [ ] **Step 2: Decide — does the platform's `onWin` call `triggerReward()`?**

If the wheel's `onWin` handler in GamificationPlatform.jsx **does** call `triggerReward('big', ...)` or `triggerReward('medium', ...)`, that's the double celebration we want to remove. Remove the `triggerReward` line from the wheel's `onWin` only. Keep `addCoins`, `showNotif`, `trackMission`, `trackQuest`.

If `onWin` does **not** call `triggerReward`, no change needed for this file — but check WheelGame.jsx too in step 3.

- [ ] **Step 3: Confirm WheelGame.jsx itself doesn't call triggerReward**

```bash
grep -n "triggerReward" components/games/WheelGame.jsx
```

Expected: zero matches. If matches found, the wheel is invoking the platform's reward system internally and bypassing `onWin` — read each match in context and remove only the calls that fire alongside the standalone overlay.

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

- [ ] **Step 5: Visual smoke test**

```bash
npm run dev
```

Open Play → Minigames → Wheel → spin → land on a prize. Watch the win celebration:

- Count-up `K0 → final` runs in the overlay.
- Screen flash, confetti, and floating numbers fire ONCE.
- "Claim Prize" button appears.
- Click "Claim Prize" → currency lands in header WITHOUT a second confetti burst or fly-to-header trail.

If a second celebration fires (header trail + confetti) when Claim is clicked, `triggerReward` is still being invoked — return to step 2 and find the missed call.

Stop dev server.

- [ ] **Step 6: Commit (only if changes were made)**

```bash
git add -p   # interactive: only stage the triggerReward removal
git commit -m "$(cat <<'EOF'
Wheel: drop platform triggerReward to keep single celebration

Per spec, the wheel's standalone-style overlay (count-up + confetti
+ screen flash) is the only celebration. The platform's triggerReward
call was firing a second confetti burst on prize claim — removed.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If no changes were needed (no double celebration), skip the commit and add a note in the next task's commit message.

---

## Task 12: Wheel — verify 1.5s post-stop pause

Per spec §5.4: after the wheel stops spinning, there should be ~1500ms before `setSpinResult(...)` fires the result overlay. Verify presence; add if absent.

**Files:**
- Inspect / possibly modify: `components/games/WheelGame.jsx`

- [ ] **Step 1: Find where setSpinResult is called from the spin-completion path**

```bash
grep -n "setSpinResult" components/games/WheelGame.jsx
```

Read each match in context. The relevant call is the one in the spin-completion / brake-finished path (NOT the one in `claimPrize` which clears it).

- [ ] **Step 2: Check for a 1500ms delay near the call**

Look for a `setTimeout` wrapping `setSpinResult` with a delay of 1500 (or a constant named like `RESULT_DELAY` set to 1500). Check 30 lines above and below the call.

- [ ] **Step 3: If absent, add the delay**

Wrap the spin-completion `setSpinResult(prize)` call in a `setTimeout`:

```js
// Replace:
setSpinResult(prize);
// With:
setTimeout(() => setSpinResult(prize), 1500);
```

If the call is inside an animation completion handler that already has its own timing, integrate cleanly without nesting timeouts. Read 50 lines of surrounding context before editing.

- [ ] **Step 4: Verify build passes**

```bash
npm run build
```

- [ ] **Step 5: Visual smoke test**

```bash
npm run dev
```

Open the wheel, spin, hit STOP. After the wheel finishes braking and lands:
- Wheel sits still, fully visible, for ~1.5 seconds.
- Then the result overlay zooms in.

If the overlay appears immediately on stop (no pause), the delay isn't being applied — return to step 3.

Stop dev server.

- [ ] **Step 6: Commit (only if changes were made)**

```bash
git add components/games/WheelGame.jsx
git commit -m "$(cat <<'EOF'
Wheel: add 1.5s pause between stop and result overlay

Matches the standalone widget's pacing — gives the user a moment to
read the landed segment before the celebration kicks in.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If the pause was already present, skip the commit.

---

## Task 13: Final smoke test, sweep, and sign-off

Full pass against the spec's verification checklist (§6) to confirm everything works together.

- [ ] **Step 1: Production build**

```bash
npm run build
```

Expected: build succeeds with no errors. Lint warnings are tolerable but read each one — anything new and concerning gets a follow-up.

- [ ] **Step 2: Trivia smoke test**

```bash
npm run dev
```

In `play.minigames`:
- 7 mini-games render in the top grid.
- "Trivia" section below renders 3 tiles (Classic Quiz, Speed Round, Streak Trivia).
- Each tile shows free-play counter (3, 5, 3 respectively before any plays).
- Click each. Each game:
  - Opens with current palette/typography/cards.
  - Plays through cleanly.
  - Win path fires `triggerReward('medium', ...)` and currency lands in header.
  - Returns to Minigames tab.
  - Free-play counter decrements.
- Trivia missions appear in Missions tab.
- Playing a trivia game progresses `d_trivia1`. Score 12+ in SpeedRound progresses `d_speed12`. Streak 5+ in StreakTrivia progresses `d_tstreak5`. (`d_trivia10` and `w_trivia50` need 10/50 correct cumulatively — too long for smoke; just verify they show up.)

- [ ] **Step 3: Wheel smoke test**

In `play.minigames` → Wheel:
- Wheel renders with standalone-style chrome frame, 10 segments, gold pegs, glossy overlays.
- Loss segments read "Try Again" (not "Try Again Tomorrow").
- Pulsing STOP button visible during free spin.
- Hit STOP → friction brake → easeOut land. Pointer peg visibly springs.
- ~1.5s pause after stop. Then result overlay zooms in.
- Win path: count-up `K0 → final`, screen flash, confetti, particles, "Claim Prize" button. Click → currency lands in header. NO second confetti burst.
- `gamePlays.wheel` decrements; can spin again until zero.

- [ ] **Step 4: Reduced-motion check**

DevTools → Rendering → emulate `prefers-reduced-motion: reduce`.
- Trivia: floating numbers collapse to 1 layer.
- Wheel: standalone overlay still shows; particles/confetti are suppressed by CSS `@media` safety net.

- [ ] **Step 5: Visual consistency sweep**

Open SpeedRound and StreakTrivia. Confirm:
- Plum/purple accents, no leftover cyan (except in semantic places — VIP Diamond tier indicator, General Knowledge category icon, in-progress dots).
- Bricolage Grotesque on display headings, Onest on body text, JetBrains Mono on counters/timers.
- Tiles use the unified `.card` system (consistent shadow, border-radius, hover lift with the 7 mini-games).

- [ ] **Step 6: Stop dev server, final git status**

```bash
git status --short
git log --oneline -10
```

Expected: working tree clean. `git log` shows the chain of commits from this plan landing on top of the WIP baseline (`c2dc0ec` and earlier).

- [ ] **Step 7: Push (optional — confirm with user first)**

```bash
git push origin main
```

Per CLAUDE.md the `main` branch deploys to Vercel production at `https://100xbet-gamification.vercel.app`. **Do not push without confirming with the user** — they may want to review locally or batch with other work.

---

## Self-Review Notes

**Spec coverage:** Each section of the spec is covered by tasks in this plan:
- §3 file map → Tasks 2, 4, 5, 6, 7, 8, 9
- §4 trivia restoration → Tasks 4–9
- §5 wheel polish → Tasks 10, 11, 12
- §6 verification → Task 13
- §7 sequencing → Plan ordering follows the spec

**Deferred items** (per spec §5 "Deferred"):
- Wheel rigging tuning (slight loss probability) — not in this plan, owned by future work.
- Wheel gem prizes — not in this plan.

**Known assumptions to verify during execution:**
- Task 8 step 3 assumes recovered SpeedRound and StreakTrivia pass `meta.triviaCorrect` and `meta.maxStreak` in their `onWin` callbacks. Verify with the grep step.
- Task 9 step 4 may require renaming the new mission `type` field; the engineer needs to inspect existing mission tracker conventions to align.
- Task 11 might be a no-op (no double celebration in current WIP). That's fine — verification is still required.
- Task 12 might be a no-op (1.5s pause already present). That's fine.
