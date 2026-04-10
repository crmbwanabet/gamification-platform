---
name: gamification-components
description: Tailwind + React component patterns for gambling and gamification UIs — cards, progress systems, reward modals, leaderboards, currency displays, quest trackers, and engagement widgets.
---

This skill provides reusable component patterns for casino/gamification platforms built with Tailwind CSS and React. Use these patterns when building or redesigning game-related UI components.

## Design System Tokens

### Surface Hierarchy (dark theme)
```
Background:     rgba(8,6,18,1)        — page bg / shader
Surface-0:      rgba(10,15,25,0.7)    — cards, sections
Surface-1:      rgba(10,15,25,0.85)   — elevated cards, modals
Surface-2:      rgba(10,15,25,0.95)   — dropdowns, tooltips
Border-subtle:  rgba(255,255,255,0.04) — section dividers
Border-default: rgba(255,255,255,0.06) — card borders
Border-active:  rgba(6,182,212,0.3)   — focused/active states
```

### Currency Colors
```
Coins/Kwacha:  text-yellow-400,  bg rgba(234,179,8,0.08),   border rgba(234,179,8,0.2)
Gems:          text-emerald-400, bg rgba(16,185,129,0.08),  border rgba(16,185,129,0.2)
Diamonds:      text-blue-400,    bg rgba(59,130,246,0.08),  border rgba(59,130,246,0.2)
XP:            text-cyan-400,    bg rgba(6,182,212,0.08),   border rgba(6,182,212,0.2)
```

### Difficulty Colors
```
Easy:    bg-green-500/15 text-green-400 border-green-500/20
Medium:  bg-yellow-500/15 text-yellow-400 border-yellow-500/20
Hard:    bg-red-500/15 text-red-400 border-red-500/20
```

## Component Patterns

### 1. Action Card (game/reward entry point)
```
Structure:
┌─────────────────────────┐
│  [Image h-36]           │  ← object-cover, gradient-to-t overlay
│  [Badge] top-right      │  ← "3 FREE" / "LIVE" / "Ready"
│  [Help] top-left        │  ← small ? icon
├─────────────────────────┤
│  Title          Status  │  ← bold text-sm + gray meta
│  [Progress dots/bar]    │  ← if applicable
│  [CTA Button]           │  ← btn-3d, full-width
└─────────────────────────┘
Border: 1px solid rgba(255,255,255,0.06)
Background: rgba(10,15,25,0.85)
Border-radius: 16px (rounded-2xl)
```

### 2. Priority Action Strip (top of dashboard)
```
When user has an unclaimed reward or urgent action:
┌────────────────────────────────────────────┐
│  [Icon]  "Your daily reward is waiting!"   │  [Collect Now →]
│          Day 3 of 7 — 5 day streak 🔥     │
└────────────────────────────────────────────┘
Background: gradient green/emerald at 0.1 opacity
Border: 1px solid green at 0.2 opacity
```

### 3. Quest Card (multi-step progress)
```
┌──────┬─────────────────────────────┐
│      │ [difficulty] [status badge] │
│ IMG  │ Quest Name                  │
│ w-32 │ Description text...         │
│      │ [Step1][Step2][Step3][Step4] │  ← individual progress bars per step
│      │ 🪙500  💚50  ⚡250         │  ← reward row
└──────┴─────────────────────────────┘
If claimable: add green CTA bar at bottom
```

### 4. Mission Card (single-target progress)
```
┌─────────────────────────┐
│  [Image h-28]           │
│  [Difficulty badge]     │
├─────────────────────────┤
│  Mission Name           │
│  [████████░░] 8/10      │  ← thin progress bar
│  🪙100  💚5             │  ← rewards
└─────────────────────────┘
```

### 5. Currency Pill (top bar)
```
┌──────────────────┐
│ [icon] 1,250 [+] │
└──────────────────┘
Sizes: icon 24px, text text-lg font-bold, + button 20px
Background: currency-color at 0.08
Border: currency-color at 0.2
```

### 6. Leaderboard Row
```
┌─────────────────────────────────┐
│ #1  [avatar] Player1    1,250  │
│     ████████████████░░  Lvl 5  │
└─────────────────────────────────┘
Top 3: gold/silver/bronze left accent
Current user: highlighted border
```

### 7. Daily Hub Progress
```
┌────────────────────────────────┐
│  Daily Hub         [2/3]      │
│  ● ● ○  2/3 tasks            │
│  [████████░░░░░░░░░]          │
└────────────────────────────────┘
Click navigates to daily tab
```

## CTA Label Guidelines

**Don't use generic labels. Use action + benefit:**
- "Claim!" → "Collect Reward"
- "Play!" → "Spin Now →"
- "Predict!" → "Predict & Earn →"
- "Buy" → "Get Coins"
- "View" → "View all →"
- "Start" → "Begin Quest →"

**Urgency triggers:**
- "3 FREE spins" (scarcity)
- "15 LIVE" with pulsing dot (time pressure)
- "Day 3 of 7" (streak progress)
- "Ready" badge on unclaimed rewards

## Spacing & Layout Rules
- Card padding: `p-3.5` (14px)
- Section gap: `space-y-5` (20px)
- Card grid gap: `gap-3` or `gap-3.5`
- Image heights: hero cards `h-36`, mission cards `h-28`, store cards `h-24`
- Border radius: cards `rounded-2xl` (16px), buttons `rounded-xl` (12px), badges `rounded-md` (6px)
- Max content width: `max-w-7xl`

## Responsive Breakpoints
- Mobile: single column, stacked cards
- `sm` (640px): 2-column grids
- `md` (768px): sidebar visible, 2-3 column grids
- `lg` (1024px): 3-4 column grids
- Sidebar width: 224px (w-56)
