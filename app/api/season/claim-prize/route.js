import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { lusakaDay } from '@/lib/casino/feed.mjs';
import { loadSeasonConfig, prizeKey } from '@/lib/season/serverConfig';
import { verifyWorldCupPrize } from '@/lib/season/verify.mjs';
import { purchaseMessage } from '@/lib/telegram/format.mjs';
import { sendPurchase } from '@/lib/telegram/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// POST /api/season/claim-prize  (Authorization: Bearer <SSO token>; body
// { platformXp?: { 'YYYY-MM-DD': n } }) — the World Cup Final's K10,000
// REAL-MONEY prize. NEVER auto-credited: the server recomputes the whole
// season from player_activity (lib/season/verify.mjs: platform XP at most
// 60/day) and only when it agrees the Final was won inserts ONE fulfilment
// row in `purchases` (prize_key unique per player per season) and posts it to
// the Telegram admin group, where the existing ✅ flow credits it.
// Idempotent: a repeat claim returns the existing row's status.
export async function POST(req) {
  if (!supabaseAdmin) return json({ error: 'not_configured' }, 503);
  let body = {};
  try { body = (await req.json()) || {}; } catch { /* empty body is fine */ }
  const uid = authedUid(bearer(req) || body.token);
  if (!uid) return json({ error: 'not_logged_in' }, 401);

  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`prize:${uid}`, 5, 60000) || !rateLimit(`prize-ip:${ip}`, 30, 60000)) return json({ error: 'slow_down' }, 429);

  const cfg = await loadSeasonConfig();
  const key = prizeKey(cfg);

  const { data: existing, error: exErr } = await supabaseAdmin
    .from('purchases').select('id,status').eq('uid', uid).eq('prize_key', key).maybeSingle();
  if (exErr) {
    console.error('[claim-prize] lookup failed:', exErr.message);
    return json({ error: 'unavailable' }, 503);
  }
  if (existing) return json({ ok: true, already: true, status: existing.status });

  const { data: rows, error } = await supabaseAdmin
    .from('player_activity').select('day,deposits_amount,deposits_count,withdrawals_amount,casino_stake,casino_rounds,sports_stake,sports_slips')
    .eq('user_id', uid).order('day', { ascending: false }).limit(1000);
  if (error) {
    console.error('[claim-prize] select failed:', error.message);
    return json({ error: 'unavailable' }, 503);
  }

  const v = verifyWorldCupPrize({ rows: rows || [], clientPlatform: body.platformXp, cfg, today: lusakaDay() });
  if (!v.won) return json({ error: 'not_verified', reason: v.reason }, 403);

  const { data: ins, error: insErr } = await supabaseAdmin.from('purchases').insert({
    uid, item_id: null, item_name: `World Cup prize — K${cfg.worldCup.prizeKwacha.toLocaleString('en-US')}`,
    price_kwacha: 0, price_gems: 0, is_money: true, payout_kwacha: cfg.worldCup.prizeKwacha,
    prize_key: key, prize_meta: v.summary, status: 'pending',
  }).select().single();
  if (insErr) {
    if (insErr.code === '23505') return json({ ok: true, already: true, status: 'pending' }); // a concurrent claim won the race
    console.error('[claim-prize] insert failed:', insErr.message);
    return json({ error: 'db_error' }, 500);
  }

  const messageId = await sendPurchase(purchaseMessage(ins), ins.id);
  await supabaseAdmin.from('purchases')
    .update(messageId ? { telegram_message_id: messageId } : { telegram_error: true })
    .eq('id', ins.id);

  return json({ ok: true, status: 'pending' });
}
