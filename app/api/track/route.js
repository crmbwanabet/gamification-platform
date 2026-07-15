import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const TYPES = new Set(['session_start', 'game_played', 'mission_completed', 'daily_claimed', 'purchase', 'level_up']);
const MAX_EVENTS = 25;

// Fire-and-forget beacon. Always 200s (client never retries); invalid input
// is dropped, not errored.
export async function POST(req) {
  try {
    const body = await req.json();
    const uid = String(body?.uid || 'anon').slice(0, 64);
    const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS) : [];
    const rows = events
      .filter(e => TYPES.has(e?.type))
      .map(e => ({
        uid,
        type: e.type,
        game_id: e.gameId ? String(e.gameId).slice(0, 32) : null,
        amount: Number.isFinite(e.amount) ? Math.max(0, Math.min(Math.trunc(e.amount), 100000)) : null,
        meta: e.meta && typeof e.meta === 'object' ? e.meta : null,
      }));
    if (rows.length && supabaseAdmin) {
      const { error } = await supabaseAdmin.from('activity_events').insert(rows);
      if (error) console.error('[track] insert failed:', error.message);
    }
  } catch (e) { /* drop */ }
  return NextResponse.json({ ok: true });
}
