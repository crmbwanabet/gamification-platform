---
name: animation-patterns
description: CSS and Framer Motion animation recipes for gamification UIs — micro-interactions, page transitions, reward feedback, progress reveals, and dopamine-triggering motion patterns.
---

This skill provides animation patterns for gamification and casino-style UIs. Use these patterns when building interactive components that need motion, feedback, or visual delight.

## Core Principles
- **Purpose over decoration**: Every animation should communicate state, reward, or progress
- **Performance first**: Prefer `transform` and `opacity` (GPU-accelerated). Never animate `width`, `height`, or `top/left`
- **Timing matters**: Use `cubic-bezier(0.22, 1, 0.36, 1)` for smooth entrances, `cubic-bezier(0.55, 0, 1, 0.45)` for exits
- **Duration guide**: Micro-interactions 150-250ms, reveals 300-500ms, celebrations 600-1200ms

## Animation Categories

### 1. Reward Feedback (dopamine triggers)
- **Coin burst**: Particles spray from source, arc downward with gravity
- **XP pop**: Number floats up from element, fades out at peak
- **Level up**: Full-screen flash + scale pulse + confetti shower
- **Streak fire**: Flame icon intensifies, border glows warmer with each streak day
- **Loot reveal**: Card flips with 3D perspective, lands with bounce

### 2. Progress & Completion
- **Progress bar fill**: Ease-out fill with trailing shimmer highlight
- **Step complete**: Checkmark draws in (stroke-dashoffset), circle scales with overshoot
- **Quest unlock**: Lock shakes, breaks apart, content fades in behind
- **Milestone pulse**: Ring expands outward from completed element, fades

### 3. Micro-interactions
- **Button press**: `scale(0.97)` on active, spring back on release
- **Card hover lift**: `translateY(-4px)` + shadow expansion
- **Tab switch**: Content slides out left, new content slides in from right
- **Toggle flip**: Element rotates 180deg on Y axis
- **Notification slide**: Enters from top with slight bounce, auto-exits with slide-up

### 4. Page Transitions
- **Staggered reveal**: Children animate in sequence with `animation-delay: calc(var(--i) * 60ms)`
- **Fade up**: `translateY(16px) → 0` with `opacity: 0 → 1`
- **Scale in**: `scale(0.92) → 1` from center

### 5. Urgency & Attention
- **Timer pulse**: Scale 1 → 1.08 when under 10 seconds, speed increases under 5
- **LIVE indicator**: Dot pulses with `scale(1) → scale(1.5)` + opacity cycle
- **Claim glow**: Border color oscillates, button has shimmer sweep
- **Limited badge**: Subtle wiggle every 3 seconds

## CSS Keyframe Templates

```css
/* Coin pop — number floats up and fades */
@keyframes coinPop {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  60% { opacity: 1; transform: translateY(-24px) scale(1.2); }
  100% { opacity: 0; transform: translateY(-40px) scale(0.8); }
}

/* Stagger entrance */
@keyframes staggerIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.stagger-child { animation: staggerIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
.stagger-child:nth-child(1) { animation-delay: 0ms; }
.stagger-child:nth-child(2) { animation-delay: 60ms; }
.stagger-child:nth-child(3) { animation-delay: 120ms; }

/* Shimmer sweep — for buttons and progress bars */
@keyframes shimmerSweep {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
.shimmer-sweep::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
  animation: shimmerSweep 2s ease-in-out infinite;
}

/* Reward shake — for claim buttons */
@keyframes rewardShake {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-3deg); }
  40% { transform: rotate(3deg); }
  60% { transform: rotate(-2deg); }
  80% { transform: rotate(1deg); }
}
```

## Framer Motion Patterns (when available)

```jsx
// Staggered list
const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// Spring bounce for rewards
const rewardSpring = { type: "spring", stiffness: 400, damping: 15 };

// Presence exit
<AnimatePresence mode="wait">
  <motion.div key={tab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} />
</AnimatePresence>
```

## Rules
- Never use `animation-fill-mode: forwards` on elements that need to be interactive after animation
- Always add `will-change: transform` to frequently animated elements, remove it after animation ends
- Use `prefers-reduced-motion` media query to disable non-essential animations
- Keep confetti/particle count under 50 for mobile performance
- Test animations at 2x speed to catch jank
