import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { bearerMatches } from '@/lib/auth/feedSecret';
import { validatePlayerBatch, collapsePlayerBatch, mergePlayerWithStored, FEED_LIMITS } from '@/lib/season/feed.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CRM -> platform feed of each player's daily real-money activity (deposits,
// withdrawals, casino stake/rounds, settled sports stake/slips) per Lusaka day.
// Drives the Season XP (lib/season/xp.mjs). Contract for the CRM developers:
// docs/integrations/crm-player-activity-feed.md
//
// Auth: Authorization: Bearer <PLAYER_FEED_SECRET> (falls back to
// CASINO_FEED_SECRET, same CRM); disabled while unset. Rows are ABSOLUTE
// daily totals, upserted max-wins per column, so re-sending is always safe.

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req) {
  const secret = process.env.PLAYER_FEED_SECRET || process.env.CASINO_FEED_SECRET;
  if (!secret || secret.length < 16) return json({ error: 'feed_disabled' }, 503);

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`player-feed:${ip}`, 120, 60000)) return json({ error: 'slow_down' }, 429);

  if (!bearerMatches(req, secret)) return json({ error: 'unauthorized' }, 401);

  if (!supabaseAdmin) return json({ error: 'not_configured' }, 503);

  let text;
  try { text = await req.text(); } catch { return json({ error: 'bad_request' }, 400); }
  if (Buffer.byteLength(text, 'utf8') > FEED_LIMITS.maxBodyBytes) return json({ error: 'payload_too_large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'bad_json' }, 400); }

  const v = validatePlayerBatch(body);
  if (v.error) return json({ error: v.error, maxBatch: FEED_LIMITS.maxBatch }, v.error === 'batch_too_large' ? 413 : 400);
  if (!v.rows.length) return json({ error: 'no_valid_rows', rejected: v.rejected }, 400);

  const rows = collapsePlayerBatch(v.rows);

  // Preferred: one atomic statement (greatest() per column) — see the migration.
  const { error: rpcErr } = await supabaseAdmin.rpc('upsert_player_activity', { p_rows: rows });
  if (rpcErr) {
    // Fallback while the SQL function is missing: read, merge max-wins in JS,
    // upsert. Not atomic against a concurrent batch for the same key, but the
    // feed is absolute totals, so the next send heals any race.
    const missingFn = rpcErr.code === 'PGRST202' || /function .* does not exist|could not find the function/i.test(rpcErr.message || '');
    if (!missingFn) {
      console.error('[player-feed] rpc failed:', rpcErr.message);
      return json({ error: 'db_error' }, 500);
    }
    const users = [...new Set(rows.map(r => r.user_id))];
    const days = [...new Set(rows.map(r => r.day))];
    const { data: stored, error: selErr } = await supabaseAdmin
      .from('player_activity').select('*').in('user_id', users).in('day', days);
    if (selErr) {
      console.error('[player-feed] select failed:', selErr.message);
      return json({ error: 'db_error' }, 500);
    }
    const now = new Date().toISOString();
    const merged = mergePlayerWithStored(rows, stored || []).map(r => ({ ...r, updated_at: now }));
    const { error: upErr } = await supabaseAdmin.from('player_activity').upsert(merged, { onConflict: 'user_id,day' });
    if (upErr) {
      console.error('[player-feed] upsert failed:', upErr.message);
      return json({ error: 'db_error' }, 500);
    }
  }

  return json({ ok: true, accepted: v.rows.length, stored: rows.length, rejected: v.rejected });
}

export function GET() {
  return json({ error: 'method_not_allowed' }, 405);
}
