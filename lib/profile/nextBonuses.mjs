// "Next level bonuses" line in the profile (owner 2026-10-22, replaces
// "Next: <level name>"). Lists only what the next level REALLY gives: its
// level-up prize (cfg.levelRewards) and anything that opens there (side quest,
// Coin Shop, football league, the World Cup once WORLD_CUP_OPEN) plus a name
// change for named players. Never the next place or club (the story stays a
// surprise). Pure.
import { rewardParts } from '../rewardText.mjs';
import { WORLD_CUP_OPEN } from '../season/config.mjs';

/**
 * next          — the next level number (null at the top = [])
 * levelRewards  — { [level]: { kwacha, emeralds, … } }
 * season        — season config ({ hustle, league, worldCup }.unlockStage)
 * storeStage    — level the Coin Shop opens at
 * named         — the player has a name (a rename unlocks each level)
 */
export function nextLevelBonuses({ next, levelRewards = {}, season = null, storeStage = null, named = false } = {}) {
  if (!Number.isInteger(next) || next < 2) return [];
  const out = [...rewardParts(levelRewards && levelRewards[next])];
  if (season?.hustle?.unlockStage === next) out.push('side quests');
  if (storeStage === next) out.push('Coin Shop opens');
  if (season?.league?.unlockStage === next) out.push('league matches');
  if (WORLD_CUP_OPEN && season?.worldCup?.unlockStage === next) out.push('World Cup with Zambia');
  if (named) out.push('name change');
  return out;
}
