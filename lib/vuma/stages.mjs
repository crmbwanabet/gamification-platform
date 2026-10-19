// ============================================================================
// Vuma Katongo story stages — the player's XP progression.
// The player is a street kid who becomes a footballer; each stage is a place
// and (from stage 2) a club; league matches from stage 8, the first pro club. XP_LEVELS in lib/data/platform.js derives from this.
// Art: public/vuma/banner-NN.jpg (600x300 scene) + avatar-NN.jpg (256x256) + hero-NN.jpg (600x540 full body).
// Club names are synonym parodies of the real clubs (Manchester City -> Manchester Metropolis) — never the real names, never misspellings.
// Pure ESM so node --test can pin it (tests/vuma-stages.test.mjs).
// ============================================================================

// 19 stages (2026-10-19, owner list): 11 Zambian locations, each with its
// football club (the 4 Zambian pro clubs now live in the 4 Lusaka locations),
// then the 8 abroad stages unchanged. Thresholds: stages 2..8 squeezed in
// below the old first-club 3,000 XP so matches (stage 8) open at the same XP
// as before; stages 12..19 keep the old 10..17 thresholds (World Cup at
// 39,000, the end at 50,000). XP comes mostly from real play on bwanabet (CRM
// feed), capped 400/day and 2,000/week. Stage 2 at 50 XP = the first visit.
// The owner's list says "Lusaka compound 2" / "Lusaka suburb 2"; the player
// never sees the "2", the place shows as "Lusaka compound" / "Lusaka suburb".
const RAW = [
  // [place, club, chapter, xp]
  ['The village', '', 'The streets', 0],
  ['Small town', 'Copperbelt Football Academy', 'The streets', 50],
  ['Town', 'Junction Rovers FC', 'The streets', 200],
  ['Big town compound', 'Nsofu Boys FC', 'Amateur league', 500],
  ['Big town suburb', 'Mphamvu United', 'Amateur league', 900],
  ['City compound', 'Mulilo Stars FC', 'Amateur league', 1400],
  ['City suburb', 'Kalulu FC', 'Amateur league', 2100],
  ['Lusaka compound', 'Kafue Gaels FC', 'Zambian league', 3000],
  ['Lusaka compound', 'Crimson Arrows FC', 'Zambian league', 4800],
  ['Lusaka suburb', 'Energy Dynamos FC', 'Zambian league', 7000],
  ['Lusaka suburb', 'ZEMCO United', 'Zambian league', 9600],
  ['Soweto', 'Shaka Chiefs', 'South Africa', 12600],
  ['Bristol', 'Bristol Wanderers', 'England', 16000],
  ['Leeds', 'Leeds Allied', 'England', 19800],
  ['Birmingham', 'Aston Manor', 'England', 24000],
  ['West London', 'Chelsea SC', 'England', 28600],
  ['Manchester', 'Manchester Union', 'England', 33600],
  ['Manchester', 'Manchester Metropolis', 'The very top', 39000],
  ['Doha', 'Doha Dam SC', 'The very top', 50000],
];

// Level name per stage (owner names 2026-10-18, spread over 19 stages
// 2026-10-19). Repeats keep the stage count; "XP to stage N" when a name
// repeats. The level name is what the app shows for the stage and for "XP to
// next"; the place/club stays in the art, the level-up modal and the story,
// so where he goes is a surprise.
const LEVEL_NAMES = [
  'Village Football',
  'Street Hero',
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

export const VUMA_STAGES = Object.freeze(RAW.map(([place, club, chapter, xp], i) => Object.freeze({
  stage: i + 1,
  place,
  club,
  chapter,
  xp,
  name: club || place,
  title: LEVEL_NAMES[i],
  banner: `/vuma/banner-${pad(i + 1)}.jpg`,
  avatar: `/vuma/avatar-${pad(i + 1)}.jpg`,
  hero: `/vuma/hero-${pad(i + 1)}.jpg`,
})));

/** "Village Football" — the stage's level name. */
export const stageDescription = (s) => (s && s.title) || '';
/** "XP to …" target: the next level name, or "stage N" when the name repeats. */
export const nextStageLabel = (cur, next) => (!next ? '' : next.title && next.title !== cur?.title ? next.title : `stage ${next.stage}`);

/** Stage at which the intro "Bonus panel" collapses to an expandable header. */
export const INTRO_COLLAPSE_STAGE = 8; // the first pro club, 3,000 XP (was stage 6 before the 19-stage list)

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
