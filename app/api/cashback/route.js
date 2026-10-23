import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { isIsoDay } from '@/lib/casino/feed.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Daily gem CASHBACK (2026-10-23): the logged-in player's awards that are not
// collected yet (GET), and collecting one (POST { window }). The award rows are
// written by the cron (app/api/cron/cashback); collecting flips collected_at
// ONCE and only then does the client credit the gems.

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const COLS = 'window_day,net_loss,cashback_kwacha,value_coins,emeralds,rubies,diamonds';
const view = (r) => ({
  window: r.window_day, loss: Number(r.net_loss), cashbackKwacha: Number(r.cashback_kwacha), valueCoins: Number(r.value_coins),
  emeralds: r.emeralds, rubies: r.rubies, diamonds: r.diamonds,
});

// GET /api/cashback -> { awards: [{ window, loss, cashbackKwacha, valueCoins, emeralds, rubies, diamonds }] } (oldest first)
export async function GET(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`cashback:${uid}`, 20, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  const { data, error } = await supabaseAdmin.from('cashback_awards').select(COLS)
    .eq('user_id', uid).is('collected_at', null).order('window_day', { ascending: true }).limit(30);
  if (error) { console.error('[cashback] list failed:', error.message); return json({ error: 'unavailable' }, 503); }
  return json({ awards: (data || []).map(view) });
}

// POST /api/cashback { window } -> { ok, award } once; 409 already_collected.
export async function POST(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`cashback-collect:${uid}`, 20, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  let body;
  try { body = await req.json(); } catch { body = null; }
  const day = body && body.window;
  if (!isIsoDay(day)) return json({ error: 'bad_window' }, 400);
  const { data, error } = await supabaseAdmin.from('cashback_awards')
    .update({ collected_at: new Date().toISOString() })
    .eq('user_id', uid).eq('window_day', day).is('collected_at', null)
    .select(COLS);
  if (error) { console.error('[cashback] collect failed:', error.message); return json({ error: 'unavailable' }, 503); }
  if (!data || !data.length) return json({ error: 'already_collected' }, 409);
  return json({ ok: true, award: view(data[0]) });
}
