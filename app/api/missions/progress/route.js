import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { lusakaDay } from '@/lib/casino/feed.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// GET /api/missions/progress  (Authorization: Bearer <bwanabet SSO token>)
// -> { day, since, rounds, total, updatedAt } — today's (Lusaka) casino rounds
// (casino-rounds XP) and the TOTAL since the player's first login (`since`,
// the one-time missions) for the logged-in player, from the CRM feed (casino_activity). Identity comes from
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

  // The one-time missions (lib/missions/ladder.mjs) count from the player's
  // first Bonus Center login = the Lusaka day their profile was created.
  const { data: prof } = await supabaseAdmin.from('profiles').select('created_at').eq('bwanabet_user_id', uid).maybeSingle();
  const since = prof?.created_at ? lusakaDay(new Date(prof.created_at)) : day;

  const { data, error } = await supabaseAdmin
    .from('casino_activity').select('day,rounds,updated_at')
    .eq('user_id', uid).gte('day', since).order('day', { ascending: false }).limit(1000);
  if (error) {
    // e.g. the table is not migrated yet — the client shows 0 + a note.
    console.error('[missions/progress] select failed:', error.message);
    return json({ error: 'unavailable', day, since, rounds: 0, total: 0, updatedAt: null }, 503);
  }
  const rows = data || [];
  const todayRow = rows.find(r => r.day === day);
  const total = rows.reduce((a, r) => a + (Number(r.rounds) > 0 ? Number(r.rounds) : 0), 0);
  const updatedAt = rows.reduce((a, r) => (r.updated_at && (!a || r.updated_at > a) ? r.updated_at : a), null);
  return json({ day, since, rounds: todayRow?.rounds ?? 0, total, updatedAt });
}
