// World Cup with Zambia (2026-10-09). Pure. Unlocks on the day the player
// reaches stage 16; Zambia then plays 8 sequential windows of 6 Lusaka days,
// starting the day after. A match is won as soon as the capped XP inside its
// window reaches the target, lost when the window ends short. Group: a loss
// only forfeits that bonus. Knockout loss = eliminated (the league goes on).
// The Final pays K10,000 REAL MONEY — never credited by the client: the
// server re-checks (lib/season/verify.mjs, POST /api/season/claim-prize).
// Bonus claims: user.season.wcClaims = [roundId, ...].
// FRIENDLY second chance (lib/season/friendly.mjs): a lost group or knockout
// match (never the Final) offers ONE friendly per cup run. Won: a group match
// counts as won (bonus claimable); a knockout loss is undone (Zambia
// reinstated, no bonus) and — so the schedule stays deterministic — every
// later round shifts: the next round starts the day AFTER the friendly's last
// Lusaka day (with the 24h window: full-time + 3 days instead of + 1). While a
// knockout friendly is live Zambia is not out yet and later rounds wait.
import { SEASON_DEFAULTS } from './config.mjs';
import { addDays, xpBetween, stageReachDay, msUntilDayEnd } from './xp.mjs';
import { friendlyState, friendlyKey, isActiveFriendly } from './friendly.mjs';

/**
 * Returns { unlocked, unlockDay, rounds, current, next, eliminated, knockedOutBy, champion, finalRound }.
 * Each round: { id, round, label, opponent, target, reward (the bonus on offer), bonus (paid if won), start, end, xp, gap,
 * status: 'locked' | 'upcoming' | 'live' | 'won' | 'lost' | 'out', claimed, claimable, msLeft }.
 */
export function worldCupState({ season, today, cfg = SEASON_DEFAULTS, claims = [], now = Date.now(), friendlies = null }) {
  const W = cfg.worldCup;
  const unlockDay = season && today ? stageReachDay(season, W.unlockStage) : null;
  if (!unlockDay || unlockDay > today) {
    const rounds = W.rounds.map(r => ({ ...r, reward: r.bonus, start: null, end: null, xp: 0, gap: r.target, status: 'locked', bonus: 0, claimed: false, claimable: false, msLeft: 0 }));
    return { unlocked: false, unlockDay: null, rounds, current: null, next: null, eliminated: false, knockedOutBy: null, champion: false, finalRound: rounds[rounds.length - 1], friendlies: [], friendly: null };
  }
  const done = new Set(Array.isArray(claims) ? claims : []);
  const fmap = friendlies && typeof friendlies === 'object' ? friendlies : {};
  let eliminated = false;
  let knockedOutBy = null;
  let friendlyUsed = false;   // ONE accepted friendly per cup run
  let nextStart = addDays(unlockDay, 1);
  const rounds = W.rounds.map((r) => {
    const start = nextStart;
    const end = addDays(start, W.windowDays - 1);
    nextStart = addDays(end, 1);
    const xp = today >= start ? xpBetween(season, start, end) : 0;
    let status;
    if (eliminated) status = 'out';
    else if (today < start) status = 'upcoming';
    else if (xp >= r.target) status = 'won';
    else if (today > end) status = 'lost';
    else status = 'live';
    // a lost group / knockout match: the FRIENDLY second chance (never the Final)
    let friendly = null;
    if (status === 'lost' && r.round !== 'final') {
      friendly = friendlyState({
        kind: 'wc', matchId: r.id, round: r.round, endDay: end, lostTarget: r.target, bonus: r.bonus, season,
        entry: fmap[friendlyKey('wc', r.id)], eligible: !friendlyUsed, now, cfg,
        context: { title: `World Cup · ${r.label}`, label: r.label, home: 'Zambia', lostTo: r.opponent, winBonus: r.round === 'group' ? r.bonus : 0 },
      });
      if (friendly && friendly.acceptedAt != null) friendlyUsed = true;
      if (friendly && friendly.status === 'won') status = 'won';
      // knockout: while the friendly is live (or won) Zambia is still in, and
      // the next round starts the day after the friendly's last day
      if (r.round === 'knockout' && friendly && (friendly.status === 'live' || friendly.status === 'won')) nextStart = addDays(friendly.to, 1);
    }
    const pending = r.round === 'knockout' && status === 'lost' && friendly && friendly.status === 'live';
    if (status === 'lost' && r.round !== 'group' && !pending) { eliminated = true; knockedOutBy = r.opponent; }
    // a knockout won through the friendly only reinstates Zambia (no bonus)
    const viaFriendly = !!(friendly && friendly.status === 'won');
    const bonus = status === 'won' && !(viaFriendly && r.round !== 'group') ? r.bonus : 0;
    const claimed = done.has(r.id);
    return {
      ...r, reward: r.bonus, start, end, xp, gap: Math.max(0, r.target - xp), status, bonus, claimed,
      claimable: status === 'won' && bonus > 0 && !claimed,
      msLeft: status === 'live' ? msUntilDayEnd(end, now) : 0,
      friendly, viaFriendly,
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
    friendlies: rounds.map(r => r.friendly).filter(isActiveFriendly),
    // the cup run's friendly once accepted (verify.mjs puts it in the prize summary)
    friendly: rounds.map(r => r.friendly).find(f => f && f.acceptedAt != null) || null,
  };
}

/** Record a World Cup bonus claim: the new claims list, or null when not claimable. */
export function claimWorldCupBonus(claims, roundId, state) {
  const r = state && state.rounds.find(x => x.id === roundId);
  const list = Array.isArray(claims) ? claims : [];
  if (!r || !r.claimable || list.includes(roundId)) return null;
  return [...list, roundId];
}
