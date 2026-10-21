import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid } from '@/lib/auth/ssoUid';
import { TRACK_TYPES, REWARD_TYPES, cleanEvents } from '@/lib/trackTypes.mjs';

export const runtime = 'nodejs';

const MAX_EVENTS = 25;

// Fire-and-forget activity beacon (lib/track.js). Always 200s (the client
// never retries); invalid input is dropped, not errored.
//
// Identity (2026-10-19): the player id comes from the bwanabet token in the
// body, checked here exactly like /api/state (never the client's own `uid`,
// which is only kept as `claimed_uid` in meta for anonymous rows). The token is
// used for this check only: never stored, never logged.
// First login = the player's FIRST reward claim in the Bonus Center: stamped
// once on profiles.first_login_at (+ a 'first_login' event). The first
// 'daily_claimed' sets profiles.first_daily_at (the reward anchor). Every verified
// batch also moves profiles.last_seen_at.
export async function POST(req) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    if (!rateLimit(`track-ip:${ip}`, 240, 60000)) return NextResponse.json({ ok: true });
    const body = await req.json();
    const uid = authedUid(typeof body?.token === 'string' ? body.token : '');
    const sid = typeof body?.sid === 'string' ? body.sid.slice(0, 40) : null;
    const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS) : [];
    const rows = cleanEvents(events, TRACK_TYPES).map(e => ({
      uid: uid || 'anon',
      type: e.type,
      game_id: e.gameId,
      amount: e.amount,
      session_id: sid,
      verified: !!uid,
      meta: uid ? e.meta : { ...(e.meta || {}), claimed_uid: String(body?.uid || '').slice(0, 32) || null },
      ...(e.at ? { created_at: e.at } : {}),
    }));
    if (!rows.length || !supabaseAdmin) return NextResponse.json({ ok: true });

    const { error } = await supabaseAdmin.from('activity_events').insert(rows);
    if (error) console.error('[track] insert failed:', error.message);

    if (uid) {
      const id = Number(uid);
      const now = new Date().toISOString();
      await supabaseAdmin.from('profiles').update({ last_seen_at: now }).eq('bwanabet_user_id', id);
      // Reward anchor (lib/season/anchor.mjs): the first DAILY reward claim, once.
      const daily = rows.find(r => r.type === 'daily_claimed');
      if (daily) {
        await supabaseAdmin.from('profiles').update({ first_daily_at: daily.created_at || now })
          .eq('bwanabet_user_id', id).is('first_daily_at', null);
      }
      const reward = rows.find(r => REWARD_TYPES.has(r.type));
      if (reward) {
        const { data: first } = await supabaseAdmin.from('profiles')
          .update({ first_login_at: reward.created_at || now })
          .eq('bwanabet_user_id', id).is('first_login_at', null).select('bwanabet_user_id');
        if (first && first.length) {
          await supabaseAdmin.from('activity_events').insert({ uid, type: 'first_login', session_id: sid, verified: true, meta: { via: reward.type }, created_at: reward.created_at || now });
        }
      }
    }
  } catch (e) { /* drop */ }
  return NextResponse.json({ ok: true });
}
