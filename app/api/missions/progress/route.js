import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { lusakaDay } from '@/lib/casino/feed.mjs';
import { loadAnchor } from '@/lib/season/anchorServer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// GET /api/missions/progress  (Authorization: Bearer <bwanabet SSO token>)
// -> { day, since, rounds, total, updatedAt } — today's (Lusaka) casino rounds
// (casino-rounds XP) and the TOTAL since the player's first DAILY REWARD claim
// (`since` = the reward anchor, lib/season/anchor.mjs; none yet = all 0,
// the one-time missions) for the logged-in player, from player_activity (hourly CRM pull) + the older casino_activity. Identity comes from
// the SSO token exactly like /api/purchase; there is no uid parameter.
// No row yet => rounds 0, updatedAt null (the feed has not reported today).
export async function GET(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`progress:${uid}`, 20, 60000) || !rateLimit(`progress-ip:${ip}`, 120, 60000)) {
    return json({ error: 'slow_down' }, 429);
  }

  const day = lusakaDay();
  if (!supabaseAdmin) return json({ error: 'unavailable', day, rounds: 0, updatedAt: null }, 503);

  // Nothing counts before the player's first daily reward claim (the reward
  // anchor, lib/season/anchor.mjs): the one-time missions AND today's
  // casino-rounds XP count from that Lusaka day, inclusive. No claim yet = 0.
  let since;
  try { since = await loadAnchor(uid); } catch (e) {
    console.error('[missions/progress] anchor failed:', e.message);
    return json({ error: 'unavailable', day, since: null, rounds: 0, total: 0, updatedAt: null }, 503);
  }
  if (!since) return json({ day, since: null, rounds: 0, total: 0, updatedAt: null, anchored: false });

  // Rounds come from player_activity (the hourly CRM pull, the live source
  // since 2026-10-21) and the older casino_activity push (nothing feeds it
  // now); per day the higher of the two counts.
  const [pa, ca] = await Promise.all([
    supabaseAdmin.from('player_activity').select('day,casino_rounds,updated_at')
      .eq('user_id', uid).gte('day', since).order('day', { ascending: false }).limit(1000),
    supabaseAdmin.from('casino_activity').select('day,rounds,updated_at')
      .eq('user_id', uid).gte('day', since).order('day', { ascending: false }).limit(1000),
  ]);
  if (pa.error && ca.error) {
    // e.g. the tables are not migrated yet — the client shows 0 + a note.
    console.error('[missions/progress] select failed:', pa.error.message);
    return json({ error: 'unavailable', day, since, rounds: 0, total: 0, updatedAt: null }, 503);
  }
  const byDay = new Map();
  const add = (d, rounds, at) => {
    const cur = byDay.get(d) || { day: d, rounds: 0, updated_at: null };
    if (Number(rounds) > cur.rounds) cur.rounds = Number(rounds);
    if (at && (!cur.updated_at || at > cur.updated_at)) cur.updated_at = at;
    byDay.set(d, cur);
  };
  for (const r of pa.data || []) add(r.day, r.casino_rounds, r.updated_at);
  for (const r of ca.data || []) add(r.day, r.rounds, r.updated_at);
  const rows = [...byDay.values()];
  const todayRow = rows.find(r => r.day === day);
  const total = rows.reduce((a, r) => a + (Number(r.rounds) > 0 ? Number(r.rounds) : 0), 0);
  const updatedAt = rows.reduce((a, r) => (r.updated_at && (!a || r.updated_at > a) ? r.updated_at : a), null);
  return json({ day, since, rounds: todayRow?.rounds ?? 0, total, updatedAt });
}
