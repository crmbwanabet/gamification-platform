import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { PREDICTION_COINS, weekSlip } from '@/lib/extras/rules.mjs';
import { weekStart, addDays, isIsoDay } from '@/lib/season/xp.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// POST /api/predictions/claim { week } -> { ok, coins }
// Pays a week's slip (all SLIP_SIZE picks right) once: the slip is recomputed
// from the stored rows, then ONE conditional update marks every pick claimed,
// so a second call (or a race) updates nothing. The client credits the coins.
export async function POST(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`pred-claim:${uid}`, 20, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const week = String(body?.week || '');
  if (!isIsoDay(week) || weekStart(week) !== week) return json({ error: 'bad_request' }, 400);
  const till = addDays(week, 6);

  const { data: rows, error } = await supabaseAdmin.from('predictions').select('event_id,pick,outcome,settled_at,claimed_at,pick_day,kickoff')
    .eq('user_id', uid).gte('pick_day', week).lte('pick_day', till);
  if (error) return json({ error: 'unavailable' }, 503);
  const slip = weekSlip(rows || [], week);
  if (slip.claimed) return json({ error: 'already_claimed' }, 409);
  if (!slip.claimable) return json({ error: 'not_won' }, 403);

  const ids = slip.picks.map(r => r.event_id);
  const { data: upd, error: uErr } = await supabaseAdmin.from('predictions').update({ claimed_at: new Date().toISOString() })
    .eq('user_id', uid).in('event_id', ids).is('claimed_at', null).select('event_id');
  if (uErr) return json({ error: 'unavailable' }, 503);
  if (!upd || upd.length !== ids.length) return json({ error: 'already_claimed' }, 409);
  return json({ ok: true, coins: PREDICTION_COINS });
}
