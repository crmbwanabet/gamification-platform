import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid } from '@/lib/auth/ssoUid';
import { cleanPing, MIN_PING_GAP_MS } from '@/lib/heartbeat.mjs';

export const runtime = 'nodejs';

// Heartbeat (2026-10-21, lib/heartbeat.mjs): one tiny call per 30 s per open
// player. Upserts the session's play_sessions row and moves
// profiles.last_seen_at in ONE rpc (ping_session; migration
// lib/supabase/migrations/2026-10-21-play-sessions.sql). The player id comes
// only from the bwanabet token in the body (authedUid, as /api/track); the
// token is never stored or logged. Anonymous sessions are kept with uid null.
// Always 200 (the client never retries); bad input is dropped.
export async function POST(req) {
  try {
    const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
    if (!rateLimit(`ping-ip:${ip}`, 60, 60000)) return NextResponse.json({ ok: true });
    const body = await req.json();
    const ping = cleanPing(body);
    if (!ping || !supabaseAdmin) return NextResponse.json({ ok: true });
    // at most one regular ping per sid every 20 s (ping_session enforces the
    // same gap in the database); a final ping (hide/close) always counts
    const key = ping.final ? `ping-final:${ping.sid}` : `ping:${ping.sid}`;
    if (!rateLimit(key, ping.final ? 3 : 1, ping.final ? 60000 : MIN_PING_GAP_MS)) return NextResponse.json({ ok: true });
    const uid = authedUid(typeof body.token === 'string' ? body.token : '');
    const { error } = await supabaseAdmin.rpc('ping_session', { p_sid: ping.sid, p_uid: uid, p_final: ping.final });
    if (error) console.error('[ping] failed:', error.message);
  } catch (e) { /* drop */ }
  return NextResponse.json({ ok: true });
}
