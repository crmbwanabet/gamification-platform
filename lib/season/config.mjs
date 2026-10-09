// Season (2026-10-09): EVERY number of the season system lives here — XP
// from real play, caps, side hustle, league, World Cup. Remote config can
// override any of it through the platform_config row `season`
// (cleanSeasonConfig validates + clamps; lib/config/merge.mjs applies it).
// Stage thresholds live in lib/vuma/stages.mjs. No imports: node --test and
// the server routes load it directly. Spec: docs/superpowers/specs/2026-10-09-season-world-cup.md

export const SEASON_DEFAULTS = Object.freeze({
  id: 'S1',            // prize idempotency key: one World Cup prize per player per season id
  startDay: null,      // 'YYYY-MM-DD' — feed/platform days before it are ignored (null = all)

  // XP from the CRM feed (player_activity), per Lusaka day
  crm: Object.freeze({
    casinoStakePerXp: 10,  // 1 XP per K10 real-money casino stake
    sportsStakePerXp: 4,   // 1 XP per K4 settled real-money sports stake (odds >= 1.5)
    depositDayXp: 30,      // any deposit that day (skipped on a pure deposit-withdraw day)
  }),
  platformDailyCap: 60,  // daily claim + game rounds + casino missions + casino rounds
  dailyCap: 400,         // CRM + platform per day
  weeklyCap: 2000,       // per Lusaka week (Mon–Sun); everything above any cap = overflow

  hustle: Object.freeze({
    unlockStage: 2,
    maxAccrueDays: 2,    // uncollected pay older than this is lost ("the shop was closed")
    levels: Object.freeze([
      Object.freeze({ level: 1, name: 'Washing cars in the compound', stock: 0, pay: 20 }),
      Object.freeze({ level: 2, name: 'Kantemba', stock: 1000, pay: 50 }),
      Object.freeze({ level: 3, name: "Vuma's Car Wash", stock: 3000, pay: 100 }),
      Object.freeze({ level: 4, name: 'Minibus', stock: 7000, pay: 200 }),
      Object.freeze({ level: 5, name: 'Vuma Mart', stock: 15000, pay: 400 }),
    ]),
  }),

  league: Object.freeze({
    unlockStage: 6,
    winXp: 1200,         // capped XP in the week to win the match
    pointsPerWin: 3,
    bonus: Object.freeze({ zambia: 150, southAfrica: 250, england: 400, top: 600 }),
  }),

  worldCup: Object.freeze({
    unlockStage: 16,
    windowDays: 6,
    prizeKwacha: 10000,  // the Final: real money, claimed through /api/season/claim-prize only
    rounds: Object.freeze([
      Object.freeze({ id: 'g1', round: 'group', label: 'Group match 1', opponent: 'Morocco', target: 1400, bonus: 500 }),
      Object.freeze({ id: 'g2', round: 'group', label: 'Group match 2', opponent: 'Mexico', target: 1400, bonus: 500 }),
      Object.freeze({ id: 'g3', round: 'group', label: 'Group match 3', opponent: 'Portugal', target: 1400, bonus: 500 }),
      Object.freeze({ id: 'r32', round: 'knockout', label: 'Round of 32', opponent: 'USA', target: 1600, bonus: 1000 }),
      Object.freeze({ id: 'r16', round: 'knockout', label: 'Round of 16', opponent: 'Nigeria', target: 1700, bonus: 1500 }),
      Object.freeze({ id: 'qf', round: 'knockout', label: 'Quarter-final', opponent: 'France', target: 1800, bonus: 2500 }),
      Object.freeze({ id: 'sf', round: 'knockout', label: 'Semi-final', opponent: 'Argentina', target: 1900, bonus: 5000 }),
      Object.freeze({ id: 'final', round: 'final', label: 'The Final', opponent: 'Brazil', target: 2000, bonus: 0 }),
    ]),
  }),

  // FRIENDLY MATCH second chance (2026-10-09, lib/season/friendly.mjs): after a
  // lost league match or World Cup match (never the Final) the player may pay
  // coins for a friendly vs a weaker local side; winning it reverses the loss.
  friendly: Object.freeze({
    offerHours: 24,        // accept within this many hours after full-time
    windowHours: 24,       // the friendly runs this long from the accept time
    targetPercent: 50,     // of the lost match's target ...
    roundTo: 10,           // ... rounded UP to this step (league 1,200 -> 600)
    maxTarget: 700,        // never above this: a 24h window spans <= 2 Lusaka days x 400 XP cap = 800
    leagueCostPercent: 50, // league entry = this % of the match's win bonus (150 -> 75)
    wcGroupCost: 250,
    wcKnockoutCost: 1000,
  }),
});

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Whole number in [min, max], else the fallback. */
function int(v, fallback, min, max) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.round(v)));
}

/** Plain (unfrozen) deep copy of the defaults — what DEFAULT_CONFIG.season holds. */
export function seasonDefaults() {
  return JSON.parse(JSON.stringify(SEASON_DEFAULTS));
}

/**
 * Validate a remote `season` row over `base` (defaults when omitted). Unknown
 * keys and bad values are dropped so the base survives; numbers are clamped to
 * sane bands. Array entries are matched by position (levels / rounds keep their
 * names, ids and opponents — only the numbers are tunable).
 */
export function cleanSeasonConfig(v, base = seasonDefaults()) {
  const out = JSON.parse(JSON.stringify(base));
  if (!isObj(out.friendly)) out.friendly = seasonDefaults().friendly; // a base from before the friendly
  if (!isObj(v)) return out;
  if (typeof v.id === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(v.id)) out.id = v.id;
  if (v.startDay === null || (typeof v.startDay === 'string' && DAY_RE.test(v.startDay))) out.startDay = v.startDay;
  if (isObj(v.crm)) {
    out.crm.casinoStakePerXp = int(v.crm.casinoStakePerXp, out.crm.casinoStakePerXp, 1, 10000);
    out.crm.sportsStakePerXp = int(v.crm.sportsStakePerXp, out.crm.sportsStakePerXp, 1, 10000);
    out.crm.depositDayXp = int(v.crm.depositDayXp, out.crm.depositDayXp, 0, 10000);
  }
  out.platformDailyCap = int(v.platformDailyCap, out.platformDailyCap, 0, 10000);
  out.dailyCap = int(v.dailyCap, out.dailyCap, 1, 100000);
  out.weeklyCap = int(v.weeklyCap, out.weeklyCap, 1, 700000);
  if (isObj(v.hustle)) {
    const h = v.hustle;
    out.hustle.unlockStage = int(h.unlockStage, out.hustle.unlockStage, 1, 17);
    out.hustle.maxAccrueDays = int(h.maxAccrueDays, out.hustle.maxAccrueDays, 1, 30);
    if (Array.isArray(h.levels)) {
      out.hustle.levels.forEach((L, i) => {
        const r = h.levels[i];
        if (!isObj(r)) return;
        if (i > 0) L.stock = int(r.stock, L.stock, 1, 10000000);
        L.pay = int(r.pay, L.pay, 0, 100000);
      });
      // stock thresholds must keep rising, else the whole levels override is dropped
      for (let i = 1; i < out.hustle.levels.length; i++) {
        if (out.hustle.levels[i].stock <= out.hustle.levels[i - 1].stock) { out.hustle.levels = JSON.parse(JSON.stringify(base.hustle.levels)); break; }
      }
    }
  }
  if (isObj(v.league)) {
    const l = v.league;
    out.league.unlockStage = int(l.unlockStage, out.league.unlockStage, 1, 17);
    out.league.winXp = int(l.winXp, out.league.winXp, 1, 700000);
    out.league.pointsPerWin = int(l.pointsPerWin, out.league.pointsPerWin, 0, 100);
    if (isObj(l.bonus)) for (const k of Object.keys(out.league.bonus)) out.league.bonus[k] = int(l.bonus[k], out.league.bonus[k], 0, 1000000);
  }
  if (isObj(v.worldCup)) {
    const w = v.worldCup;
    out.worldCup.unlockStage = int(w.unlockStage, out.worldCup.unlockStage, 1, 17);
    out.worldCup.windowDays = int(w.windowDays, out.worldCup.windowDays, 1, 30);
    out.worldCup.prizeKwacha = int(w.prizeKwacha, out.worldCup.prizeKwacha, 0, 1000000);
    if (Array.isArray(w.rounds)) {
      out.worldCup.rounds.forEach((R, i) => {
        const r = w.rounds[i];
        if (!isObj(r)) return;
        R.target = int(r.target, R.target, 1, 700000);
        R.bonus = int(r.bonus, R.bonus, 0, 1000000);
      });
    }
  }
  if (isObj(v.friendly)) {
    const f = v.friendly;
    out.friendly.offerHours = int(f.offerHours, out.friendly.offerHours, 1, 168);
    out.friendly.windowHours = int(f.windowHours, out.friendly.windowHours, 1, 168);
    out.friendly.targetPercent = int(f.targetPercent, out.friendly.targetPercent, 1, 100);
    out.friendly.roundTo = int(f.roundTo, out.friendly.roundTo, 1, 1000);
    out.friendly.maxTarget = int(f.maxTarget, out.friendly.maxTarget, 10, 100000);
    out.friendly.leagueCostPercent = int(f.leagueCostPercent, out.friendly.leagueCostPercent, 0, 1000);
    out.friendly.wcGroupCost = int(f.wcGroupCost, out.friendly.wcGroupCost, 0, 1000000);
    out.friendly.wcKnockoutCost = int(f.wcKnockoutCost, out.friendly.wcKnockoutCost, 0, 1000000);
  }
  return out;
}
