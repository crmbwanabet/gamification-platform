import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { lusakaDay } from '@/lib/casino/feed.mjs';
import { loadSeasonConfig, prizeKey } from '@/lib/season/serverConfig';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

const COLS = 'day,deposits_amount,deposits_count,withdrawals_amount,casino_stake,casino_rounds,sports_stake,sports_slips,updated_at';
const MAX_ROWS = 400;

// GET /api/season  (Authorization: Bearer <bwanabet SSO token>)
// -> { day, days: [player_activity rows, ascending], prize: { status, at } | null }
// The logged-in player's daily CRM activity (latest 400 days), from which the
// client derives Season XP, the league and the World Cup (lib/season/*).
// Identity from the SSO token exactly like /api/missions/progress: there is
// no uid parameter. 503 while the table is missing.
export async function GET(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`season:${uid}`, 20, 60000) || !rateLimit(`season-ip:${ip}`, 120, 60000)) {
    return json({ error: 'slow_down' }, 429);
  }

  const day = lusakaDay();
  if (!supabaseAdmin) return json({ error: 'unavailable', day, days: [], prize: null }, 503);

  const { data, error } = await supabaseAdmin
    .from('player_activity').select(COLS)
    .eq('user_id', uid).order('day', { ascending: false }).limit(MAX_ROWS);
  if (error) {
    console.error('[season] select failed:', error.message);
    return json({ error: 'unavailable', day, days: [], prize: null }, 503);
  }

  // The World Cup prize claim, if any (a failure just means "no claim known").
  let prize = null;
  try {
    const cfg = await loadSeasonConfig();
    const { data: p, error: pErr } = await supabaseAdmin
      .from('purchases').select('status,created_at').eq('uid', uid).eq('prize_key', prizeKey(cfg)).maybeSingle();
    if (!pErr && p) prize = { status: p.status, at: p.created_at };
  } catch { /* ignore */ }

  return json({ day, days: (data || []).slice().reverse(), prize });
}
