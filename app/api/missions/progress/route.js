import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { lusakaDay } from '@/lib/casino/feed.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// GET /api/missions/progress  (Authorization: Bearer <bwanabet SSO token>)
// -> { day, rounds, updatedAt } — today's (Lusaka) casino rounds for the
// logged-in player, from the CRM feed (casino_activity). Identity comes from
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

  const { data, error } = await supabaseAdmin
    .from('casino_activity').select('rounds,updated_at')
    .eq('user_id', uid).eq('day', day).maybeSingle();
  if (error) {
    // e.g. the table is not migrated yet — the client shows 0 + a note.
    console.error('[missions/progress] select failed:', error.message);
    return json({ error: 'unavailable', day, rounds: 0, updatedAt: null }, 503);
  }
  return json({ day, rounds: data?.rounds ?? 0, updatedAt: data?.updated_at ?? null });
}
