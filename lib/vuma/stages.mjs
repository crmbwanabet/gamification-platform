// ============================================================================
// Vuma Katongo story stages — the player's XP progression.
// Vuma is a street kid who becomes a footballer; each stage is a place (and,
// from stage 6, a club). XP_LEVELS in lib/data/platform.js derives from this.
// Art: public/vuma/banner-NN.jpg (600x300 scene) + avatar-NN.jpg (256x256) + hero-NN.jpg (600x540 full body).
// Club names are synonym parodies of the real clubs (Manchester City -> Manchester Metropolis) — never the real names, never misspellings.
// Pure ESM so node --test can pin it (tests/vuma-stages.test.mjs).
// ============================================================================

const RAW = [
  // [place, club, chapter, xp]
  ['The village', '', 'The streets', 0],
  ['Kapiri Mposhi compound', '', 'The streets', 100],
  ['Kanyama, Lusaka', '', 'The streets', 250],
  ['Matero', '', 'The streets', 500],
  ['Chelstone academy', '', 'The streets', 900],
  ['Kafue', 'Kafue Gaels FC', 'Zambian league', 1500],
  ['Lusaka', 'Crimson Arrows FC', 'Zambian league', 2300],
  ['Kitwe, Copperbelt', 'Energy Dynamos FC', 'Zambian league', 3300],
  ['Lusaka, cup final', 'ZEMCO United', 'Zambian league', 4600],
  ['Soweto', 'Emperor Chiefs', 'South Africa', 6200],
  ['Bristol', 'Bristol Wanderers', 'England', 8200],
  ['Leeds', 'Leeds Allied', 'England', 10700],
  ['Birmingham', 'Aston Manor', 'England', 13700],
  ['West London', 'Chelsea SC', 'England', 17300],
  ['Manchester', 'Manchester Union', 'England', 21600],
  ['Manchester', 'Manchester Metropolis', 'The very top', 26600],
  ['Doha', 'Doha Dam SC', 'The very top', 32500],
];

const pad = (n) => String(n).padStart(2, '0');

export const VUMA_STAGES = Object.freeze(RAW.map(([place, club, chapter, xp], i) => Object.freeze({
  stage: i + 1,
  place,
  club,
  chapter,
  xp,
  name: club || place,
  banner: `/vuma/banner-${pad(i + 1)}.jpg`,
  avatar: `/vuma/avatar-${pad(i + 1)}.jpg`,
  hero: `/vuma/hero-${pad(i + 1)}.jpg`,
})));

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
