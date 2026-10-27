// Server-side World Cup prize check (2026-10-09). Pure, so node --test pins
// it; POST /api/season/claim-prize calls it with the player's player_activity
// rows. The client's own season view is NEVER trusted for the K10,000 prize.
//
// Platform XP (daily claim, games, missions, casino rounds) is client-held, so
// the server takes the client's own per-day platform map, each day clamped to
// [0, cfg.platformDailyCap] (60): an honest client's values pass unchanged, so
// the recomputed season is IDENTICAL to the one the player saw (same unlock
// day, same 8 windows, same result), and a modified client can never add more
// than the cap. No map (never the real app) = platform XP 0 everywhere, which
// is never more generous than the truth. (Until 2026-10-27 a 'max' method ran
// FIRST, assuming 60 XP every day: its windows started earlier than the
// screen's, so a player whose screen said "knocked out" could verify as
// champion. Gone.)
//
// FRIENDLY (2026-10-09): the path to the Final may include ONE World Cup
// friendly. Coins are client-held, so the server cannot see the payment: a
// friendly counts as accepted when the client reports its accept time AND that
// time falls inside the 24h offer window after the lost match's full-time
// (worldcup.mjs / friendly.mjs enforce both, plus one per run). Its RESULT is
// recomputed here from the player_activity rows like every match.
//
// LEVEL XP (2026-10-27): since the village restart (lib/xp/levelReset.mjs) the
// client unlocks the World Cup on LEVEL XP = season XP minus the saved
// `user.levelReset.base` (GamificationPlatform `lvSeason`). The server applies
// the SAME `levelSeason` transform to the base it reads from profiles.state,
// so the unlock day and all 8 windows are the ones the player saw; a missing
// or junk base = no base, exactly like the client.
import { SEASON_DEFAULTS } from './config.mjs';
import { computeSeasonXp, addDays, isIsoDay } from './xp.mjs';
import { worldCupState } from './worldcup.mjs';
import { cleanFriendlies } from './friendly.mjs';
import { rowsFromAnchor } from './anchor.mjs';
import { levelSeason, cleanLevelReset } from '../xp/levelReset.mjs';

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

/** Only the World Cup friendlies of a client payload (sanitised). */
export function wcFriendlies(v) {
  const out = {};
  for (const [k, e] of Object.entries(cleanFriendlies(v))) if (k.startsWith('wc:') && e.acceptedAt) out[k] = e;
  return out;
}

function summarize(season, wc, method, reset) {
  const f = wc.friendly;
  return {
    method,
    seasonXp: season.xp,
    levelBase: reset ? reset.base : 0,
    feedDays: season.feedDays,
    unlockDay: wc.unlockDay,
    rounds: wc.rounds.map(r => ({ id: r.id, opponent: r.opponent, start: r.start, end: r.end, xp: r.xp, target: r.target, status: r.status, ...(r.viaFriendly ? { viaFriendly: true } : null) })),
    friendly: f ? { round: f.matchId, label: f.label, lostTo: f.lostTo, opponent: f.opponent, acceptedAt: new Date(f.acceptedAt).toISOString(), from: f.from, to: f.to, xp: f.xp, target: f.target, status: f.status } : null,
  };
}

/**
 * { won, method, reason, summary }. `rows` = the player's player_activity rows,
 * `clientPlatform` = the platform XP map the client sent (optional),
 * `friendlies` = the client's user.season.friendlies (only wc:* accept times are used),
 * `anchor` = the Lusaka day of the player's first daily reward claim
 * (lib/season/anchor.mjs): rows before it never count, no anchor = no rows,
 * exactly like GET /api/season serves them to the client. `undefined` (an old
 * caller) keeps every row. `levelReset` = the saved `state.levelReset` marker
 * (profiles.state): its `base` is taken off the cumulative XP before the
 * World Cup is computed, like the client's `lvSeason`; missing/junk = 0.
 */
export function verifyWorldCupPrize({ rows: allRows = [], clientPlatform = null, friendlies = null, cfg = SEASON_DEFAULTS, today, now = Date.now(), anchor, levelReset = null }) {
  const rows = anchor === undefined ? allRows : rowsFromAnchor(allRows, anchor);
  const fr = wcFriendlies(friendlies);
  const reset = cleanLevelReset(levelReset);
  const lookback = addDays(today, -MAX_LOOKBACK_DAYS);
  const rowDays = (Array.isArray(rows) ? rows : []).map(r => r && r.day).filter(d => isIsoDay(d) && d >= lookback && d <= today).sort();
  if (!rowDays.length) return { won: false, method: null, reason: 'no_activity', summary: null };
  const client = clampClientPlatform(clientPlatform, cfg, lookback, today);
  const clientDays = Object.keys(client).sort();
  // level XP, as the client sees it (levelSeason is a no-op without a base);
  // platform XP = the client's clamped map ('client'), else none ('strict')
  const method = clientDays.length ? 'client' : 'strict';
  const season = levelSeason(computeSeasonXp({ rows, platform: client, cfg, today }), reset);
  const wc = worldCupState({ season, today, cfg, now, friendlies: fr });
  const summary = summarize(season, wc, method, reset);
  if (wc.champion) return { won: true, method, reason: null, summary };
  const reason = !wc.unlocked ? 'not_unlocked' : wc.eliminated ? 'eliminated' : 'final_not_won';
  return { won: false, method: null, reason, summary };
}

/** Telegram admin text for a verified prize. */
export function worldCupPrizeMessage({ uid, prizeKwacha, seasonId, summary, ref }) {
  const k = `K${Number(prizeKwacha).toLocaleString('en-US')}`;
  const lines = [`🏆 World Cup prize${ref ? ` ${ref}` : ''} — credit ${k} to player ${uid}`, `Season ${seasonId} · verified server-side (${summary?.method === 'strict' ? 'no platform XP map sent, counted 0' : 'client platform XP, max 60/day'})`];
  if (summary) {
    const base = Number(summary.levelBase) > 0 ? ` (level XP, restart base ${Number(summary.levelBase).toLocaleString('en-US')} taken off)` : '';
    lines.push(`Season XP ${Number(summary.seasonXp).toLocaleString('en-US')}${base} · ${summary.feedDays} feed days · World Cup from ${summary.unlockDay}`);
    for (const r of summary.rounds || []) lines.push(`${r.status === 'won' ? '✅' : r.status === 'lost' ? '❌' : '·'} ${r.opponent} ${r.start}..${r.end}: ${r.xp}/${r.target} XP${r.viaFriendly ? ' (lost, won back in the friendly)' : ''}`);
    const f = summary.friendly;
    if (f) lines.push(`🤝 Friendly after the ${f.label || f.round} loss to ${f.lostTo}: vs ${f.opponent}, accepted ${String(f.acceptedAt).slice(0, 16).replace('T', ' ')} UTC, ${f.from}..${f.to}: ${f.xp}/${f.target} XP ${f.status === 'won' ? '✅' : '❌'}`);
  }
  return lines.join('\n');
}
