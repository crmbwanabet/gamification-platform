import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { PREDICTION_COINS } from '@/lib/extras/rules.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// POST /api/predictions/claim { eventId } -> { ok, coins }
// Marks a settled, correct pick as claimed in ONE conditional update, so a
// pick pays once however often this is called. The client credits the coins.
export async function POST(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`pred-claim:${uid}`, 20, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const eventId = String(body?.eventId || '');
  if (!eventId) return json({ error: 'bad_request' }, 400);

  const { data: row, error } = await supabaseAdmin.from('predictions').select('pick,outcome,settled_at,claimed_at')
    .eq('user_id', uid).eq('event_id', eventId).maybeSingle();
  if (error) return json({ error: 'unavailable' }, 503);
  if (!row || !row.settled_at || row.pick !== row.outcome) return json({ error: 'not_won' }, 403);
  if (row.claimed_at) return json({ error: 'already_claimed' }, 409);

  const { data: upd, error: uErr } = await supabaseAdmin.from('predictions').update({ claimed_at: new Date().toISOString() })
    .eq('user_id', uid).eq('event_id', eventId).is('claimed_at', null).select('event_id');
  if (uErr) return json({ error: 'unavailable' }, 503);
  if (!upd || !upd.length) return json({ error: 'already_claimed' }, 409);
  return json({ ok: true, coins: PREDICTION_COINS });
}
