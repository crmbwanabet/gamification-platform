// ============================================================================
// Vuma Katongo story stages — the player's XP progression.
// The player is a street kid who becomes a footballer; each stage is a place
// and (from stage 6) a club; league matches from stage 12, the first pro club. XP_LEVELS in lib/data/platform.js derives from this.
// Art: public/vuma/banner-NN.jpg (600x300 scene) + avatar-NN.jpg (256x256) + hero-NN.jpg (600x540 full body).
// Club names are synonym parodies of the real clubs (Manchester City -> Manchester Metropolis) — never the real names, never misspellings.
// Pure ESM so node --test can pin it (tests/vuma-stages.test.mjs).
// ============================================================================

// 23 stages = LOCATIONS (owner 2026-10-24, "BwanaBet Football Journey"): the
// hero now stays in THE VILLAGE for stages 1-5 (village football, a real
// ball, the village team, the village derby, the village league), then the
// old 19-stage list from the Copperbelt academy on, as stages 6-23 (club,
// place and art unchanged, art files renumbered +4). Each stage has FIVE
// sub-levels (SUB_LEVELS below, 115 in all; stories in ./stories.mjs), shown
// to players as "Level 1.3". Thresholds 2026-10-24 (players restarted at
// level 1 the same day, lib/xp/levelReset.mjs): the academy opens at 1,000
// XP, league matches at stage 12 (first pro club, 5,000), the World Cup at
// 22 (32,000), sub-level 23.5 at 49,800. XP comes mostly from real play on
// bwanabet (CRM feed), capped 400/day and 2,000/week.
// The owner's list says "Lusaka compound 2" / "Lusaka suburb 2"; the player
// never sees the "2", the place shows as "Lusaka compound" / "Lusaka suburb".
const RAW = [
  // [place, club, label (village stages), chapter, xp]
  ['The village', '', '', 'The village', 0],
  ['The village', '', 'Street Hero', 'The village', 100],
  ['The village', '', 'The Village Team', 'The village', 250],
  ['The village', '', 'The Village Derby', 'The village', 450],
  ['The village', '', 'Village League', 'The village', 700],
  ['Small town', 'Copperbelt Football Academy', '', 'The streets', 1000],
  ['Town', 'Junction Rovers FC', '', 'The streets', 1400],
  ['Big town compound', 'Nsofu Boys FC', '', 'Amateur league', 1900],
  ['Big town suburb', 'Mphamvu United', '', 'Amateur league', 2500],
  ['City compound', 'Mulilo Stars FC', '', 'Amateur league', 3200],
  ['City suburb', 'Kalulu FC', '', 'Amateur league', 4000],
  ['Lusaka compound', 'Kafue Gaels FC', '', 'Zambian league', 5000],
  ['Lusaka compound', 'Crimson Arrows FC', '', 'Zambian league', 6200],
  ['Lusaka suburb', 'Energy Dynamos FC', '', 'Zambian league', 7600],
  ['Lusaka suburb', 'ZEMCO United', '', 'Zambian league', 9200],
  ['Soweto', 'Shaka Chiefs', '', 'South Africa', 11000],
  ['Bristol', 'Bristol Wanderers', '', 'England', 13000],
  ['Leeds', 'Leeds Allied', '', 'England', 15500],
  ['Birmingham', 'Aston Manor', '', 'England', 18500],
  ['West London', 'Chelsea SC', '', 'England', 22000],
  ['Manchester', 'Manchester Union', '', 'England', 26500],
  ['Manchester', 'Manchester Metropolis', '', 'The very top', 32000],
  ['Doha', 'Doha Dam SC', '', 'The very top', 39000],
];
// Where the last stage's five sub-levels would end (23.5 = 39,000 + 4 x 2,700).
const END_XP = 52500;

// Level name per stage (owner names 2026-10-18; the village stages 1-5 take
// the journey's location names, 2026-10-24). Repeats keep the stage count;
// "XP to level N" when a name repeats.
const LEVEL_NAMES = [
  'Village Football',
  'Street Hero',
  'Village Team',
  'Village Derby',
  'Village League',
  'Street Legend',
  'Street Legend',
  'Amateur League',
  'Amateur League Hero',
  'Amateur League Hero',
  'Amateur League Legend',
  'Professional League',
  'Pro League Hero',
  'Pro League Hero',
  'Pro League Legend',
  'International League',
  'International League',
  'International League Hero',
  'International League Hero',
  'International League Hero',
  'International League Legend',
  'International League Legend',
  'International League Legend',
];

const pad = (n) => String(n).padStart(2, '0');

export const VUMA_STAGES = Object.freeze(RAW.map(([place, club, label, chapter, xp], i) => Object.freeze({
  stage: i + 1,
  place,
  club,
  chapter,
  xp,
  name: club || label || place,
  title: LEVEL_NAMES[i],
  banner: `/vuma/banner-${pad(i + 1)}.jpg`,
  avatar: `/vuma/avatar-${pad(i + 1)}.jpg`,
  hero: `/vuma/hero-${pad(i + 1)}.jpg`,
})));

/** "Village Football" — the stage's level name. */
export const stageDescription = (s) => (s && s.title) || '';
/** "XP to …" target: the next level name, or "level N" when the name repeats. */
export const nextStageLabel = (cur, next) => (!next ? '' : next.title && next.title !== cur?.title ? next.title : `level ${next.stage}`);

/** Stage at which the intro "Bonus panel" collapses to an expandable header. */
export const INTRO_COLLAPSE_STAGE = 12; // the first pro club, 5,000 XP (stage 8 before the 23-stage list)

export const STAGE_COUNT = VUMA_STAGES.length;

/** Undefined / negative / NaN / non-numeric xp all count as 0. */
const cleanXp = (xp) => {
  const n = Number(xp);
  return Number.isFinite(n) && n > 0 ? n : (n === Infinity ? n : 0);
};

/** The stage the player is in at this XP. */
export function getStage(xp) {
  const x = cleanXp(xp);
  let cur = VUMA_STAGES[0];
  for (const s of VUMA_STAGES) if (x >= s.xp) cur = s;
  return cur;
}

/** The next stage, or null at the final stage. */
export function getNextStage(xp) {
  const x = cleanXp(xp);
  return VUMA_STAGES.find(s => s.xp > x) || null;
}

/** 0–100 progress through the current stage; 100 at the final stage. */
export function stageProgress(xp) {
  const x = cleanXp(xp);
  const cur = getStage(x);
  const next = getNextStage(x);
  if (!next) return 100;
  return Math.max(0, Math.min(100, ((x - cur.xp) / (next.xp - cur.xp)) * 100));
}

// === Sub-levels (2026-10-24): 5 per stage, 115 in all, "Level 1.3" ===
// Sub-level k of a stage opens at stage xp + (k - 1) / 5 of the way to the
// next stage, rounded to 10 XP. `index` 1..115 runs across the stages.
export const SUB_LEVELS_PER_STAGE = 5;
export const SUB_LEVELS = Object.freeze(VUMA_STAGES.flatMap((s, i) => {
  const next = i + 1 < VUMA_STAGES.length ? VUMA_STAGES[i + 1].xp : END_XP;
  return Array.from({ length: SUB_LEVELS_PER_STAGE }, (_, k) => Object.freeze({
    index: i * SUB_LEVELS_PER_STAGE + k + 1,
    stage: s.stage,
    sub: k + 1,
    id: `${s.stage}.${k + 1}`,
    xp: s.xp + Math.round(((next - s.xp) * k) / SUB_LEVELS_PER_STAGE / 10) * 10,
  }));
}));

/** The sub-level the player is in at this XP. */
export function getSubLevel(xp) {
  const x = cleanXp(xp);
  let cur = SUB_LEVELS[0];
  for (const l of SUB_LEVELS) if (x >= l.xp) cur = l;
  return cur;
}

/** The next sub-level, or null at 23.5. */
export function getNextSubLevel(xp) {
  const x = cleanXp(xp);
  return SUB_LEVELS.find(l => l.xp > x) || null;
}

/** 0–100 progress through the current sub-level; 100 at the last one. */
export function subLevelProgress(xp) {
  const x = cleanXp(xp);
  const cur = getSubLevel(x);
  const next = getNextSubLevel(x);
  if (!next) return 100;
  return Math.max(0, Math.min(100, ((x - cur.xp) / (next.xp - cur.xp)) * 100));
}

// Saved states from before 2026-10-24 count stages on the 19-stage list:
// old stage s >= 2 is new stage s + 4 (the 4 new village stages came in
// after stage 1). Markers saved with `stageList: 23` are already new.
export const STAGE_LIST = 23;
export const OLD_STAGE_SHIFT = 4;
export function migrateStageNumber(stage) {
  const n = Math.floor(Number(stage));
  if (!Number.isFinite(n) || n < 1) return stage;
  return n >= 2 ? Math.min(VUMA_STAGES.length, n + OLD_STAGE_SHIFT) : n;
}
