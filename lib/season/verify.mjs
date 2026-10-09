// Server-side World Cup prize check (2026-10-09). Pure, so node --test pins
// it; POST /api/season/claim-prize calls it with the player's player_activity
// rows. The client's own season view is NEVER trusted for the K10,000 prize.
//
// Platform XP (daily claim, games, missions, casino rounds) is client-held, so
// the server counts it at the most a real client can earn, cfg.platformDailyCap
// (60) a day, and never more:
//   1. 'max'    — 60 for every day from the first known day to today;
//   2. 'client' — else the client's own per-day platform XP, each day clamped
//                 to [0, 60] (identical to what the client showed, so a real
//                 winner whose windows shift under assumption 1 still verifies).
// Either way no day can exceed the cap, so a modified client cannot fake it.
import { SEASON_DEFAULTS } from './config.mjs';
import { computeSeasonXp, maxPlatformDays, addDays, isIsoDay } from './xp.mjs';
import { worldCupState } from './worldcup.mjs';

const MAX_LOOKBACK_DAYS = 400;

/** Client platform map -> { day: 0..cap } (junk and out-of-range days dropped). */
export function clampClientPlatform(map, cfg = SEASON_DEFAULTS, from = null, to = null) {
  const out = {};
  if (!map || typeof map !== 'object' || Array.isArray(map)) return out;
  let n = 0;
  for (const [day, v] of Object.entries(map)) {
    if (++n > 1000) break;
    if (!isIsoDay(day) || (from && day < from) || (to && day > to)) continue;
    let x = v;
    if (v && typeof v === 'object') x = ['daily', 'games', 'missions', 'casino'].reduce((s, k) => s + (Number(v[k]) > 0 ? Number(v[k]) : 0), 0);
    x = Number(x);
    out[day] = Number.isFinite(x) && x > 0 ? Math.min(Math.floor(x), cfg.platformDailyCap) : 0;
  }
  return out;
}

function summarize(season, wc, method) {
  return {
    method,
    seasonXp: season.xp,
    feedDays: season.feedDays,
    unlockDay: wc.unlockDay,
    rounds: wc.rounds.map(r => ({ id: r.id, opponent: r.opponent, start: r.start, end: r.end, xp: r.xp, target: r.target, status: r.status })),
  };
}

/**
 * { won, method, reason, summary }. `rows` = the player's player_activity rows,
 * `clientPlatform` = the platform XP map the client sent (optional).
 */
export function verifyWorldCupPrize({ rows = [], clientPlatform = null, cfg = SEASON_DEFAULTS, today }) {
  const lookback = addDays(today, -MAX_LOOKBACK_DAYS);
  const rowDays = (Array.isArray(rows) ? rows : []).map(r => r && r.day).filter(d => isIsoDay(d) && d >= lookback && d <= today).sort();
  if (!rowDays.length) return { won: false, method: null, reason: 'no_activity', summary: null };
  const client = clampClientPlatform(clientPlatform, cfg, lookback, today);
  const clientDays = Object.keys(client).sort();
  let first = rowDays[0];
  if (clientDays.length && clientDays[0] < first) first = clientDays[0];
  if (cfg.startDay && cfg.startDay > first) first = cfg.startDay;

  const sMax = computeSeasonXp({ rows, platform: maxPlatformDays(first, today, cfg), cfg, today });
  const wMax = worldCupState({ season: sMax, today, cfg });
  if (wMax.champion) return { won: true, method: 'max', reason: null, summary: summarize(sMax, wMax, 'max') };

  if (clientDays.length) {
    const sCli = computeSeasonXp({ rows, platform: client, cfg, today });
    const wCli = worldCupState({ season: sCli, today, cfg });
    if (wCli.champion) return { won: true, method: 'client', reason: null, summary: summarize(sCli, wCli, 'client') };
  }
  const reason = !wMax.unlocked ? 'not_unlocked' : wMax.eliminated ? 'eliminated' : 'final_not_won';
  return { won: false, method: null, reason, summary: summarize(sMax, wMax, 'max') };
}

/** Telegram admin text for a verified prize. */
export function worldCupPrizeMessage({ uid, prizeKwacha, seasonId, summary, ref }) {
  const k = `K${Number(prizeKwacha).toLocaleString('en-US')}`;
  const lines = [`🏆 World Cup prize${ref ? ` ${ref}` : ''} — credit ${k} to player ${uid}`, `Season ${seasonId} · verified server-side (${summary?.method === 'client' ? 'client platform XP, max 60/day' : 'platform XP at max 60/day'})`];
  if (summary) {
    lines.push(`Season XP ${Number(summary.seasonXp).toLocaleString('en-US')} · ${summary.feedDays} feed days · World Cup from ${summary.unlockDay}`);
    for (const r of summary.rounds || []) lines.push(`${r.status === 'won' ? '✅' : r.status === 'lost' ? '❌' : '·'} ${r.opponent} ${r.start}..${r.end}: ${r.xp}/${r.target} XP`);
  }
  return lines.join('\n');
}
