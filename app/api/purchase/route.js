import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { purchaseMessage } from '@/lib/telegram/format.mjs';
import { sendPurchase } from '@/lib/telegram/client';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-backed store purchase. Validates the item + stock atomically via the
// purchase_item RPC and requires an existing SSO profile (purchases must be
// fulfillable + refundable). Coin balances are client-held (existing trust
// model) — the client deducts only after ok:true.
export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`buy:${ip}`)) return NextResponse.json({ error: 'slow_down' }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const uid = String(body?.uid || '').trim().slice(0, 64);
  const itemId = String(body?.itemId || '').trim();
  if (!uid || !/^[0-9a-f-]{36}$/i.test(itemId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  // SSO players only: profile row must exist (also blocks forged-uid spam).
  const { data: prof } = await supabaseAdmin.from('profiles').select('bwanabet_user_id').eq('bwanabet_user_id', uid).limit(1);
  if (!prof || !prof.length) return NextResponse.json({ error: 'profile_required' }, { status: 403 });

  const { data, error } = await supabaseAdmin.rpc('purchase_item', { p_uid: uid, p_item_id: itemId });
  if (error) {
    console.error('[purchase] rpc failed:', error.message);
    return NextResponse.json({ error: 'purchase_failed' }, { status: 500 });
  }
  if (data?.error) return NextResponse.json({ error: data.error }, { status: 400 });

  const p = data.purchase;
  const messageId = await sendPurchase(purchaseMessage(p), p.id);
  await supabaseAdmin.from('purchases')
    .update(messageId ? { telegram_message_id: messageId } : { telegram_error: true })
    .eq('id', p.id);

  return NextResponse.json({ ok: true, purchase: { id: p.id, item_name: p.item_name, price_kwacha: p.price_kwacha, price_gems: p.price_gems, status: p.status } });
}

// The player's own purchase list — used by the app on session load to
// reconcile rejected-purchase refunds (exactly once, via refundedPurchaseIds).
export async function GET(req) {
  if (!supabaseAdmin) return NextResponse.json({ purchases: [] });
  const uid = String(new URL(req.url).searchParams.get('uid') || '').trim().slice(0, 64);
  if (!uid) return NextResponse.json({ purchases: [] });
  const { data } = await supabaseAdmin.from('purchases')
    .select('id,item_name,price_kwacha,price_gems,status,created_at')
    .eq('uid', uid).order('created_at', { ascending: false }).limit(50);
  return NextResponse.json({ purchases: data || [] });
}
