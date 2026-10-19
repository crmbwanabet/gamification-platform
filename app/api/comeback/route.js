import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { lusakaDay } from '@/lib/casino/feed.mjs';
import { comebackOffer, COMEBACK } from '@/lib/extras/rules.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function offerFor(uid, today) {
  const { data: rows, error } = await supabaseAdmin.from('player_activity')
    .select('day,deposits_amount,deposits_count,casino_stake,casino_rounds,sports_stake,sports_slips')
    .eq('user_id', uid).order('day', { ascending: false }).limit(120);
  if (error) throw new Error(error.message);
  const { data: claims, error: cErr } = await supabaseAdmin.from('comeback_claims').select('last_active_day').eq('user_id', uid);
  if (cErr) throw new Error(cErr.message);
  return comebackOffer(rows || [], today, (claims || []).map(c => c.last_active_day));
}

// GET /api/comeback -> { eligible, daysAway, coins } for the logged-in player.
export async function GET(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`comeback:${uid}`, 20, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  try {
    const o = await offerFor(uid, lusakaDay());
    return json({ eligible: o.eligible, daysAway: o.daysAway, coins: o.coins });
  } catch (e) {
    console.error('[comeback] failed:', e.message);
    return json({ error: 'unavailable' }, 503);
  }
}

// POST /api/comeback -> { ok, coins } once per lapse; the client credits the coins.
export async function POST(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`comeback-claim:${uid}`, 5, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  try {
    const o = await offerFor(uid, lusakaDay());
    if (!o.eligible) return json({ error: 'not_eligible' }, 403);
    const { error } = await supabaseAdmin.from('comeback_claims').insert({ user_id: uid, last_active_day: o.lastActiveDay, coins: COMEBACK.coins });
    if (error) {
      if (error.code === '23505') return json({ error: 'already_claimed' }, 409);
      throw new Error(error.message);
    }
    return json({ ok: true, coins: COMEBACK.coins });
  } catch (e) {
    console.error('[comeback-claim] failed:', e.message);
    return json({ error: 'unavailable' }, 503);
  }
}
