// Souvenir album (2026-10-19). Pure. Every card is DERIVED from progress the
// app already tracks, so nothing new is saved per card and nothing can be
// lost: stages reached, league opponents beaten, World Cup rounds won and
// side-quest levels reached. Locked cards show only a "?" + their slot (the
// story stays a surprise: a locked stage card never names the place/club).
// Saved state: user.albumSeen (number of cards already announced) and
// user.albumClaims (ids of the set bonuses paid).
import { VUMA_STAGES } from '../vuma/stages.mjs';
import { LEAGUE_TIERS, opponentArt } from '../season/league.mjs';
import { SEASON_DEFAULTS } from '../season/config.mjs';
import { hustleImage } from '../season/hustle.mjs';

const OPPONENTS = [...new Set(Object.values(LEAGUE_TIERS).flatMap(t => t.opponents))];

export const ALBUM_SETS = [
  { id: 'zambia', name: 'Zambia journey', note: 'Stages 1–11', bonus: 1000 },
  { id: 'abroad', name: 'Abroad', note: 'Stages 12–19', bonus: 5000 },
  { id: 'rivals', name: 'Rivals beaten', note: 'Win a league match against every side', bonus: 2000 },
  { id: 'worldcup', name: 'World Cup', note: 'Win all 8 World Cup matches', bonus: 5000 },
  { id: 'quests', name: 'Side quests', note: 'Reach all 10 side quests', bonus: 2000 },
];

/**
 * Every card with { id, set, title, sub, image, earned }.
 * stage = current stage; league / worldCup = leagueState / worldCupState;
 * hustle = hustleState (null before the feed answers).
 */
export function albumCards({ stage = 1, league = null, worldCup = null, hustle = null, cfg = SEASON_DEFAULTS } = {}) {
  const cards = [];
  for (const s of VUMA_STAGES) {
    const earned = s.stage <= stage;
    cards.push({ id: `stage-${s.stage}`, set: s.stage <= 11 ? 'zambia' : 'abroad', earned,
      title: earned ? s.name : '?', sub: `Stage ${s.stage}`, image: earned ? s.avatar : null });
  }
  const beaten = new Set((league?.matches || []).filter(m => m.status === 'won').map(m => m.opponent));
  for (const name of OPPONENTS) {
    const earned = beaten.has(name);
    cards.push({ id: `rival-${name}`, set: 'rivals', earned, title: earned ? name : '?', sub: 'League win', image: earned ? opponentArt(name) : null });
  }
  const rounds = worldCup?.rounds?.length ? worldCup.rounds : cfg.worldCup.rounds;
  for (const r of rounds) {
    const earned = r.status === 'won';
    cards.push({ id: `wc-${r.id}`, set: 'worldcup', earned, title: earned ? `Zambia beat ${r.opponent}` : '?', sub: r.label, image: earned ? opponentArt(r.opponent) : null });
  }
  const questLevel = hustle?.unlocked ? hustle.level.level : 0;
  for (const L of cfg.hustle.levels) {
    const earned = L.level <= questLevel;
    cards.push({ id: `quest-${L.level}`, set: 'quests', earned, title: earned ? L.name : '?', sub: `Side quest ${L.level}`, image: earned ? hustleImage(L.level) : null });
  }
  return cards;
}

/** Sets with progress: { ...set, total, have, complete, claimed, claimable }. */
export function albumSets(cards, claims = []) {
  const paid = Array.isArray(claims) ? claims : [];
  return ALBUM_SETS.map(s => {
    const mine = cards.filter(c => c.set === s.id);
    const have = mine.filter(c => c.earned).length;
    const complete = mine.length > 0 && have === mine.length;
    const claimed = paid.includes(s.id);
    return { ...s, total: mine.length, have, complete, claimed, claimable: complete && !claimed };
  });
}

export const earnedCount = (cards) => cards.filter(c => c.earned).length;
