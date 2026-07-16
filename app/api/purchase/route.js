import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyBwanabetToken } from '@/lib/auth/bwanabetToken';
import { purchaseMessage, UUID_RE } from '@/lib/telegram/format.mjs';
import { sendPurchase } from '@/lib/telegram/client';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Identity comes from the verified bwanabet JWT — mirrors /api/state. The
// client can't purchase (or list) as anyone but themselves.
function authedUid(token) {
  const result = verifyBwanabetToken(token);
  if (!result.valid || !result.payload?.id) return null;
  if (!result.verified && process.env.SSO_ALLOW_UNVERIFIED !== 'true') return null;
  return String(Number(result.payload.id));
}

// Server-backed store purchase. The purchase_item RPC atomically: verifies
// the profile exists, verifies the SERVER-HELD balance covers the price,
// deducts it (state jsonb + mirror columns), decrements stock, and inserts
// the pending purchase. The client mirrors the deduction locally so its next
// absolute state save agrees with the DB.
export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`buy:${ip}`)) return NextResponse.json({ error: 'slow_down' }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const uid = authedUid(body?.token);
  if (!uid || uid === 'NaN') return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  const itemId = String(body?.itemId || '').trim();
  if (!UUID_RE.test(itemId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  const { data, error } = await supabaseAdmin.rpc('purchase_item', { p_uid: uid, p_item_id: itemId });
  if (error) {
    console.error('[purchase] rpc failed:', error.message);
    return NextResponse.json({ error: 'purchase_failed' }, { status: 500 });
  }
  if (data?.error) {
    const status = data.error === 'profile_required' ? 403 : 400;
    return NextResponse.json({ error: data.error }, { status });
  }

  const p = data.purchase;
  const messageId = await sendPurchase(purchaseMessage(p), p.id);
  await supabaseAdmin.from('purchases')
    .update(messageId ? { telegram_message_id: messageId } : { telegram_error: true })
    .eq('id', p.id);

  return NextResponse.json({
    ok: true,
    purchase: { id: p.id, item_name: p.item_name, price_kwacha: p.price_kwacha, price_gems: p.price_gems, status: p.status },
    balance: data.balance || null, // server-held balance after deduction
  });
}

// The player's own purchase list — used by the app on session load to
// reconcile rejected-purchase refunds (exactly once, via refundedPurchaseIds).
export async function GET(req) {
  if (!supabaseAdmin) return NextResponse.json({ purchases: [] });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const uid = authedUid(token);
  if (!uid || uid === 'NaN') return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  const { data } = await supabaseAdmin.from('purchases')
    .select('id,item_name,price_kwacha,price_gems,status,created_at')
    .eq('uid', uid).order('created_at', { ascending: false }).limit(50);
  return NextResponse.json({ purchases: data || [] });
}
