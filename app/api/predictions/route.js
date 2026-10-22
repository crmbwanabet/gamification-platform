import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { lusakaDay } from '@/lib/casino/feed.mjs';
import { getFootballMatches, getFootballResults } from '@/lib/altenar/client';
import { PICKS, PREDICTION_COINS, SLIP_SIZE, pickOpen, settlePick, weekSlip } from '@/lib/extras/rules.mjs';
import { weekStart, addDays } from '@/lib/season/xp.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const DAY = 86400000;
const SETTLE_AFTER_MS = 150 * 60 * 1000; // results are looked up 2.5h after kick-off
const dstr = (t) => new Date(t).toISOString().slice(0, 10);

let fixtures = { at: 0, data: null };
async function upcoming() {
  if (fixtures.data && Date.now() - fixtures.at < 120000) return fixtures.data;
  try {
    const data = await getFootballMatches({ limit: 12 });
    fixtures = { at: Date.now(), data };
    return data;
  } catch (e) {
    if (fixtures.data) return fixtures.data;
    throw e;
  }
}

// Results per date window, cached 10 minutes (postponed matches never get a
// result; without this every page open would ask the sportsbook again).
const resultsCache = new Map();
async function resultsFor(from, till) {
  const key = `${from}:${till}`;
  const hit = resultsCache.get(key);
  if (hit && Date.now() - hit.at < 600000) return hit.data;
  const data = await getFootballResults(from, till);
  resultsCache.set(key, { at: Date.now(), data });
  if (resultsCache.size > 50) resultsCache.delete(resultsCache.keys().next().value);
  return data;
}

// Settle the player's finished picks (bwanabet sportsbook results).
async function settle(uid, rows) {
  const due = rows.filter(r => !r.settled_at && Date.parse(r.kickoff) + SETTLE_AFTER_MS < Date.now());
  if (!due.length) return rows;
  const times = due.map(r => Date.parse(r.kickoff));
  const from = Math.min(...times), till = Math.max(...times) + DAY;
  const results = {};
  try {
    for (let t = from; t <= till; t += 3 * DAY) Object.assign(results, await resultsFor(dstr(t), dstr(Math.min(t + 2 * DAY, till))));
  } catch (e) {
    console.error('[predictions] results lookup failed:', e.message);
    return rows;
  }
  for (const r of due) {
    const res = results[r.event_id];
    if (!res) continue;
    const at = new Date().toISOString();
    const { error } = await supabaseAdmin.from('predictions').update({ outcome: res.outcome, score: res.score, settled_at: at })
      .eq('user_id', uid).eq('event_id', r.event_id).is('settled_at', null);
    if (!error) Object.assign(r, { outcome: res.outcome, score: res.score, settled_at: at });
  }
  return rows;
}

const view = (r) => {
  const status = r.settled_at ? settlePick(r.pick, { outcome: r.outcome }) : 'pending';
  return { eventId: r.event_id, home: r.home, away: r.away, league: r.league, kickoff: r.kickoff, pick: r.pick, score: r.score || null, status };
};
const slipView = (s) => ({ week: s.week, size: s.size, right: s.right, status: s.status, claimed: s.claimed, claimable: s.claimable, picks: s.picks.map(view) });

// GET /api/predictions -> { matches, week: {start, picks, max}, slips, coins }
// slips = this week's slip first, then up to 2 earlier weeks the player played.
// Fixtures are public; `mine` needs the SSO token. Finished picks settle here.
export async function GET(req) {
  const uid = authedUid(bearer(req));
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`pred-ip:${ip}`, 60, 60000)) return json({ error: 'slow_down' }, 429);
  let matches = [];
  try { matches = await upcoming(); } catch (e) { console.error('[predictions] fixtures failed:', e.message); }
  let mine = [];
  if (uid && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.from('predictions').select('*').eq('user_id', uid).order('kickoff', { ascending: false }).limit(30);
    if (!error) mine = await settle(uid, data || []);
  }
  const week = weekStart(lusakaDay());
  const picked = Object.fromEntries(mine.map(r => [r.event_id, r.pick]));
  const earlier = [...new Set(mine.map(r => r.pick_day && weekStart(r.pick_day)).filter(w => w && w < week))].sort().reverse().slice(0, 2);
  const current = weekSlip(mine, week);
  return json({
    matches: matches.map(m => ({ id: m.eventId, league: m.league, home: m.home, away: m.away, time: m.time, open: pickOpen(m.time), myPick: picked[m.eventId] || null, odds: { h: m.h ?? null, d: m.d ?? null, a: m.a ?? null } })),
    week: { start: week, picks: current.picks.length, max: SLIP_SIZE },
    slips: [current, ...earlier.map(w => weekSlip(mine, w))].map(slipView),
    coins: PREDICTION_COINS,
  });
}

// POST /api/predictions { eventId, pick } -> { ok } — one free pick per fixture,
// SLIP_SIZE picks per Lusaka week.
// The fixture (teams, kick-off) comes from the server's own list, never the client.
export async function POST(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`pred:${uid}`, 20, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const eventId = String(body?.eventId || '');
  const pick = String(body?.pick || '');
  if (!eventId || !PICKS.includes(pick)) return json({ error: 'bad_pick' }, 400);

  let match;
  try { match = (await upcoming()).find(m => m.eventId === eventId); } catch { return json({ error: 'fixtures_unavailable' }, 503); }
  if (!match) return json({ error: 'unknown_match' }, 404);
  if (!pickOpen(match.time)) return json({ error: 'closed' }, 409);

  const day = lusakaDay();
  const week = weekStart(day);
  const { count, error: cErr } = await supabaseAdmin.from('predictions').select('event_id', { count: 'exact', head: true })
    .eq('user_id', uid).gte('pick_day', week).lte('pick_day', addDays(week, 6));
  if (cErr) return json({ error: 'unavailable' }, 503);
  if ((count || 0) >= SLIP_SIZE) return json({ error: 'weekly_limit', max: SLIP_SIZE }, 429);

  const { error } = await supabaseAdmin.from('predictions').insert({
    user_id: uid, event_id: eventId, pick, home: match.home, away: match.away, league: match.league, kickoff: match.time, pick_day: day,
  });
  if (error) {
    if (error.code === '23505') return json({ error: 'already_picked' }, 409);
    console.error('[predictions] insert failed:', error.message);
    return json({ error: 'unavailable' }, 503);
  }
  return json({ ok: true });
}
