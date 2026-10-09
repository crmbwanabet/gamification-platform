// League (2026-10-09). Pure. From the Lusaka week (Mon–Sun) the player reaches
// stage 6, one match a week, forever (it keeps running during and after the
// World Cup). The opponent comes from the tier of the player's stage at the
// start of the week. Win = cfg.league.winXp capped XP that week; a win pays
// the tier's bonus coins once (user.season.leagueClaims = [weekStart, ...]).
// Club names are synonym parodies: never the real names, never misspellings.
import { SEASON_DEFAULTS } from './config.mjs';
import { addDays, weekStart, cumAt, xpBetween, stageReachDay, msUntilDayEnd } from './xp.mjs';
import { VUMA_STAGES, getStage } from '../vuma/stages.mjs';
import { friendlyState, friendlyKey, isActiveFriendly } from './friendly.mjs';

// Opponent pools use ONLY names that have versus art (public/vuma/vs/opp-<slug>.png,
// 2026-10-09). The top tier has no clubs of its own yet: it replays the
// strongest English sides.
export const LEAGUE_TIERS = Object.freeze({
  zambia: Object.freeze({ id: 'zambia', name: 'Zambian league', opponents: Object.freeze(['Lusaka Dynamics', 'Emerald Buffaloes', 'Fish Eagles FC', 'Crimson Arrows FC']) }),
  southAfrica: Object.freeze({ id: 'southAfrica', name: 'South African league', opponents: Object.freeze(['Orlando Buccaneers', 'Mamelodi Sunsets']) }),
  england: Object.freeze({ id: 'england', name: 'English league', opponents: Object.freeze(['Arsenal Armoury FC', 'Liverpool Harbour', 'Tottenham Cockerels', 'Newcastle Union']) }),
  top: Object.freeze({ id: 'top', name: 'European nights', opponents: Object.freeze(['Liverpool Harbour', 'Arsenal Armoury FC', 'Newcastle Union', 'Tottenham Cockerels']) }),
});

/** Art slug: kebab-case of a team name ("Fish Eagles FC" -> "fish-eagles-fc"). */
export const teamSlug = (name) => String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** Versus art: the opponent squad PNG for a team. */
export const opponentArt = (name) => `/vuma/vs/opp-${teamSlug(name)}.png`;
/** Versus art: Vuma in his stage kit (or the Zambia kit at the World Cup). */
export const vumaArt = (stage) => (stage === 'zambia' ? '/vuma/vs/vuma-zambia.png' : `/vuma/vs/vuma-${String(stage).padStart(2, '0')}.png`);

const CHAPTER_TIER = { 'Zambian league': 'zambia', 'South Africa': 'southAfrica', England: 'england', 'The very top': 'top' };

/** League tier id for a story stage (stages before the first club play in the Zambian tier). */
export function tierForStage(stage) {
  const s = VUMA_STAGES[Math.max(1, Math.min(VUMA_STAGES.length, stage)) - 1];
  return CHAPTER_TIER[s.chapter] || 'zambia';
}

const MAX_WEEKS = 600;

/**
 * The league so far. Returns { unlocked, unlockDay, matches, record, current }.
 * Each match: { id (= weekStart), n, weekStart, weekEnd, tier, tierName,
 * opponent, target, xp, gap, status: 'live' | 'won' | 'lost', bonus, claimed,
 * claimable, msLeft, friendly, viaFriendly }. A match is won as soon as the
 * target is reached; it is lost once its week has ended short, unless its
 * FRIENDLY (lib/season/friendly.mjs, `friendlies` = user.season.friendlies)
 * is won, which turns it into a win (viaFriendly).
 */
export function leagueState({ season, today, cfg = SEASON_DEFAULTS, claims = [], now = Date.now(), friendlies = null }) {
  const L = cfg.league;
  const empty = { unlocked: false, unlockDay: null, matches: [], record: { played: 0, won: 0, lost: 0, points: 0 }, current: null, friendlies: [] };
  const fmap = friendlies && typeof friendlies === 'object' ? friendlies : {};
  const unlockDay = season && today ? stageReachDay(season, L.unlockStage) : null;
  if (!unlockDay || unlockDay > today) return empty;
  const done = new Set(Array.isArray(claims) ? claims : []);
  const matches = [];
  const lastWeek = weekStart(today);
  let wk = weekStart(unlockDay);
  for (let n = 0; wk <= lastWeek && n < MAX_WEEKS; n++, wk = addDays(wk, 7)) {
    const end = addDays(wk, 6);
    const stageAtStart = Math.max(getStage(cumAt(season, addDays(wk, -1))).stage, L.unlockStage);
    const tier = LEAGUE_TIERS[tierForStage(stageAtStart)];
    const home = VUMA_STAGES[stageAtStart - 1].club;
    // never play your own club: skip to the next name in the pool
    let opponent = tier.opponents[n % tier.opponents.length];
    if (opponent === home) opponent = tier.opponents[(n + 1) % tier.opponents.length];
    const xp = xpBetween(season, wk, end);
    let status = xp >= L.winXp ? 'won' : today > end ? 'lost' : 'live';
    const tierBonus = L.bonus[tier.id] || 0;
    // a lost match: the FRIENDLY second chance (one per week = this match's);
    // winning it reverses the loss into a win (bonus + points claimable)
    let friendly = null;
    if (status === 'lost') {
      friendly = friendlyState({
        kind: 'league', matchId: wk, endDay: end, lostTarget: L.winXp, bonus: tierBonus, season,
        entry: fmap[friendlyKey('league', wk)], now, cfg,
        context: { title: `${tier.name} · Week ${n + 1}`, home, homeStage: stageAtStart, lostTo: opponent, winBonus: tierBonus, winPoints: L.pointsPerWin },
      });
      if (friendly && friendly.status === 'won') status = 'won';
    }
    const bonus = status === 'won' ? tierBonus : 0;
    const claimed = done.has(wk);
    matches.push({
      id: wk, n: n + 1, weekStart: wk, weekEnd: end, tier: tier.id, tierName: tier.name,
      home, homeStage: stageAtStart, opponent, slug: teamSlug(opponent),
      target: L.winXp, xp, gap: Math.max(0, L.winXp - xp), status, bonus,
      claimed, claimable: status === 'won' && bonus > 0 && !claimed,
      msLeft: status === 'live' ? msUntilDayEnd(end, now) : 0,
      friendly, viaFriendly: !!(friendly && friendly.status === 'won'),
    });
  }
  const won = matches.filter(m => m.status === 'won').length;
  const lost = matches.filter(m => m.status === 'lost').length;
  return {
    unlocked: true, unlockDay, matches,
    record: { played: won + lost, won, lost, points: won * L.pointsPerWin },
    current: matches[matches.length - 1] || null,
    // open friendly offers + live friendlies (normally at most one)
    friendlies: matches.map(m => m.friendly).filter(isActiveFriendly),
  };
}

/** Record a league bonus claim: the new claims list, or null when not claimable. */
export function claimLeagueBonus(claims, matchId, state) {
  const m = state && state.matches.find(x => x.id === matchId);
  const list = Array.isArray(claims) ? claims : [];
  if (!m || !m.claimable || list.includes(matchId)) return null;
  return [...list, matchId];
}
