import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { GEMS } from '@/lib/economy/currency.mjs';
import { prizesOpenFor } from '@/lib/store/prizes.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Gems -> coins (owner 2026-10-26): 75% of the gem's coin value
// (`prizes.convertRate`). The convert_gems RPC checks + moves the SERVER-HELD
// balance atomically and logs gem_conversions; the client then mirrors the
// returned change so its next absolute state save agrees (like /api/purchase).
// Gated with the real prizes: the `prizes` row open, else its testers only.

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// POST { gem: 'emeralds'|'rubies'|'diamonds', count } -> { ok, gem, count, coins, balance }
export async function POST(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`gem-convert:${uid}`, 20, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad_request' }, 400); }
  const gem = body?.gem;
  const count = body?.count;
  if (!GEMS.includes(gem) || !Number.isInteger(count) || count < 1 || count > 10000) return json({ error: 'bad_request' }, 400);

  const { data: cfg } = await supabaseAdmin.from('platform_config').select('value').eq('key', 'prizes').maybeSingle();
  if (!prizesOpenFor(cfg?.value, uid)) return json({ error: 'convert_locked' }, 403);

  const { data, error } = await supabaseAdmin.rpc('convert_gems', { p_uid: uid, p_gem: gem, p_count: count });
  if (error) { console.error('[gems/convert] rpc failed:', error.message); return json({ error: 'unavailable' }, 503); }
  if (data?.error) return json({ error: data.error }, data.error === 'profile_required' ? 403 : 400);
  return json({ ok: true, gem: data.gem, count: data.count, coins: Number(data.coins), balance: data.balance || null });
}
