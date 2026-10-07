import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { validateCasinoBatch, collapseBatch, mergeWithStored, FEED_LIMITS } from '@/lib/casino/feed.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CRM -> platform feed of casino rounds per player per Lusaka day.
// Spec for the CRM developers: docs/integrations/crm-casino-rounds-feed.md
//
// Auth: Authorization: Bearer <CASINO_FEED_SECRET> (constant-time compare;
// the endpoint is disabled while the env var is unset). Rows are ABSOLUTE
// daily totals, upserted max-wins, so re-sending is always safe.

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// Compare SHA-256 digests so the lengths always match and nothing about the
// secret's length leaks through timing.
function secretMatches(given, expected) {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req) {
  const secret = process.env.CASINO_FEED_SECRET;
  if (!secret || secret.length < 16) return json({ error: 'feed_disabled' }, 503);

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`casino-feed:${ip}`, 120, 60000)) return json({ error: 'slow_down' }, 429);

  const auth = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!m || !secretMatches(m[1].trim(), secret)) return json({ error: 'unauthorized' }, 401);

  if (!supabaseAdmin) return json({ error: 'not_configured' }, 503);

  let text;
  try { text = await req.text(); } catch { return json({ error: 'bad_request' }, 400); }
  if (Buffer.byteLength(text, 'utf8') > FEED_LIMITS.maxBodyBytes) return json({ error: 'payload_too_large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'bad_json' }, 400); }

  const v = validateCasinoBatch(body);
  if (v.error) return json({ error: v.error, maxBatch: FEED_LIMITS.maxBatch }, v.error === 'batch_too_large' ? 413 : 400);
  if (!v.rows.length) return json({ error: 'no_valid_rows', rejected: v.rejected }, 400);

  const rows = collapseBatch(v.rows);

  // Preferred path: one atomic statement (insert ... on conflict do update
  // set rounds = greatest(stored, incoming)) — see the migration.
  const { error: rpcErr } = await supabaseAdmin.rpc('upsert_casino_rounds', { p_rows: rows });
  if (rpcErr) {
    // Fallback while the SQL function is missing: read, merge max-wins in JS,
    // upsert. Not atomic against a concurrent batch for the same player/day,
    // but the feed is absolute totals, so the next send heals any race.
    const missingFn = rpcErr.code === 'PGRST202' || /function .* does not exist|could not find the function/i.test(rpcErr.message || '');
    if (!missingFn) {
      console.error('[casino-feed] rpc failed:', rpcErr.message);
      return json({ error: 'db_error' }, 500);
    }
    const users = [...new Set(rows.map(r => r.user_id))];
    const days = [...new Set(rows.map(r => r.day))];
    const { data: stored, error: selErr } = await supabaseAdmin
      .from('casino_activity').select('user_id,day,rounds').in('user_id', users).in('day', days);
    if (selErr) {
      console.error('[casino-feed] select failed:', selErr.message);
      return json({ error: 'db_error' }, 500);
    }
    const now = new Date().toISOString();
    const merged = mergeWithStored(rows, stored || []).map(r => ({ ...r, updated_at: now }));
    const { error: upErr } = await supabaseAdmin.from('casino_activity').upsert(merged, { onConflict: 'user_id,day' });
    if (upErr) {
      console.error('[casino-feed] upsert failed:', upErr.message);
      return json({ error: 'db_error' }, 500);
    }
  }

  return json({ ok: true, accepted: v.rows.length, stored: rows.length, rejected: v.rejected });
}

export function GET() {
  return json({ error: 'method_not_allowed' }, 405);
}
