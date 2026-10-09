// World Cup with Zambia (2026-10-09). Pure. Unlocks on the day the player
// reaches stage 16; Zambia then plays 8 sequential windows of 6 Lusaka days,
// starting the day after. A match is won as soon as the capped XP inside its
// window reaches the target, lost when the window ends short. Group: a loss
// only forfeits that bonus. Knockout loss = eliminated (the league goes on).
// The Final pays K10,000 REAL MONEY — never credited by the client: the
// server re-checks (lib/season/verify.mjs, POST /api/season/claim-prize).
// Bonus claims: user.season.wcClaims = [roundId, ...].
import { SEASON_DEFAULTS } from './config.mjs';
import { addDays, xpBetween, stageReachDay, msUntilDayEnd } from './xp.mjs';

/**
 * Returns { unlocked, unlockDay, rounds, current, next, eliminated, knockedOutBy, champion, finalRound }.
 * Each round: { id, round, label, opponent, target, reward (the bonus on offer), bonus (paid if won), start, end, xp, gap,
 * status: 'locked' | 'upcoming' | 'live' | 'won' | 'lost' | 'out', claimed, claimable, msLeft }.
 */
export function worldCupState({ season, today, cfg = SEASON_DEFAULTS, claims = [], now = Date.now() }) {
  const W = cfg.worldCup;
  const unlockDay = season && today ? stageReachDay(season, W.unlockStage) : null;
  if (!unlockDay || unlockDay > today) {
    const rounds = W.rounds.map(r => ({ ...r, reward: r.bonus, start: null, end: null, xp: 0, gap: r.target, status: 'locked', bonus: 0, claimed: false, claimable: false, msLeft: 0 }));
    return { unlocked: false, unlockDay: null, rounds, current: null, next: null, eliminated: false, knockedOutBy: null, champion: false, finalRound: rounds[rounds.length - 1] };
  }
  const done = new Set(Array.isArray(claims) ? claims : []);
  let eliminated = false;
  let knockedOutBy = null;
  const rounds = W.rounds.map((r, i) => {
    const start = addDays(unlockDay, 1 + i * W.windowDays);
    const end = addDays(start, W.windowDays - 1);
    const xp = today >= start ? xpBetween(season, start, end) : 0;
    let status;
    if (eliminated) status = 'out';
    else if (today < start) status = 'upcoming';
    else if (xp >= r.target) status = 'won';
    else if (today > end) status = 'lost';
    else status = 'live';
    if (status === 'lost' && r.round !== 'group') { eliminated = true; knockedOutBy = r.opponent; }
    const bonus = status === 'won' ? r.bonus : 0;
    const claimed = done.has(r.id);
    return {
      ...r, reward: r.bonus, start, end, xp, gap: Math.max(0, r.target - xp), status, bonus, claimed,
      claimable: status === 'won' && bonus > 0 && !claimed,
      msLeft: status === 'live' ? msUntilDayEnd(end, now) : 0,
    };
  });
  const finalRound = rounds[rounds.length - 1];
  return {
    unlocked: true, unlockDay, rounds,
    current: rounds.find(r => r.status === 'live') || null,
    next: rounds.find(r => r.status === 'upcoming') || null,
    eliminated, knockedOutBy,
    champion: finalRound.status === 'won',
    finalRound,
  };
}

/** Record a World Cup bonus claim: the new claims list, or null when not claimable. */
export function claimWorldCupBonus(claims, roundId, state) {
  const r = state && state.rounds.find(x => x.id === roundId);
  const list = Array.isArray(claims) ? claims : [];
  if (!r || !r.claimable || list.includes(roundId)) return null;
  return [...list, roundId];
}
