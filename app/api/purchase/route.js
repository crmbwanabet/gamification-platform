import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyBwanabetToken } from '@/lib/auth/bwanabetToken';
import { purchaseMessage } from '@/lib/telegram/format.mjs';
import { parsePurchaseBody, STORE_UNLOCK_XP, BUYABLE_REDEEM, cleanStoreConfig } from '@/lib/store/catalog.mjs';
import { levelXpOf } from '@/lib/xp/levelReset.mjs';
import { sendPurchase } from '@/lib/telegram/client';
import { rateLimit } from '@/lib/rateLimit';
import { prizesOpenFor, prizesTester } from '@/lib/store/prizes.mjs';

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
// absolute state save agrees with the DB. Prices may be coins and/or the prize
// gems (emeralds, rubies, diamonds); kwacha redemptions carry payout_kwacha,
// which the RPC derives from economy.coinsPerKwacha (2026-10-07 migration).
export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`buy:${ip}`)) return NextResponse.json({ error: 'slow_down' }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const uid = authedUid(body?.token);
  if (!uid || uid === 'NaN') return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  const parsed = parsePurchaseBody(body);
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { itemId } = parsed;

  // Launch switch: the shop stays shut until the `store` row says open. Any
  // read failure keeps it shut (lib/store/catalog.mjs cleanStoreConfig).
  const { data: storeRow } = await supabaseAdmin.from('platform_config').select('value').eq('key', 'store').maybeSingle();
  if (!cleanStoreConfig(storeRow?.value).open) return NextResponse.json({ error: 'store_closed' }, { status: 403 });

  // Coin Shop opens at level 10: LEVEL XP = the saved profile XP minus the
  // village-restart base in the saved state (lib/xp/levelReset.mjs).
  const [{ data: prof }, { data: row }, { data: prizesRow }] = await Promise.all([
    supabaseAdmin.from('profiles').select('xp, state').eq('bwanabet_user_id', uid).maybeSingle(),
    supabaseAdmin.from('store_items').select('redeem_currency, prize_id').eq('id', itemId).maybeSingle(),
    supabaseAdmin.from('platform_config').select('value').eq('key', 'prizes').maybeSingle(),
  ]);
  if (!prof) return NextResponse.json({ error: 'profile_required' }, { status: 403 });
  // Real prizes (2026-10-26): sold to everyone once the `prizes` row is open,
  // before that to its testers only (who also skip the level lock to preview).
  const isPrize = !!row?.prize_id;
  if (isPrize && !prizesOpenFor(prizesRow?.value, uid)) return NextResponse.json({ error: 'item_locked' }, { status: 403 });
  const tester = isPrize && prizesTester(prizesRow?.value, uid);
  if (!tester && !(levelXpOf(prof.xp, prof.state?.levelReset) >= STORE_UNLOCK_XP)) return NextResponse.json({ error: 'store_locked' }, { status: 403 });

  // Kwacha packs + real prizes are on sale; every other item stays locked.
  if (!isPrize && row?.redeem_currency !== BUYABLE_REDEEM) return NextResponse.json({ error: 'item_locked' }, { status: 403 });

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
  const messageId = await sendPurchase(purchaseMessage(p, { prize: isPrize }), p.id);
  await supabaseAdmin.from('purchases')
    .update(messageId ? { telegram_message_id: messageId } : { telegram_error: true })
    .eq('id', p.id);

  return NextResponse.json({
    ok: true,
    purchase: {
      id: p.id, item_name: p.item_name, status: p.status,
      price_kwacha: p.price_kwacha, price_emeralds: p.price_emeralds, price_rubies: p.price_rubies, price_diamonds: p.price_diamonds,
      payout_kwacha: p.payout_kwacha ?? null,
    },
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
    .select('id,item_name,price_kwacha,price_emeralds,price_rubies,price_diamonds,payout_kwacha,status,created_at')
    .eq('uid', uid).order('created_at', { ascending: false }).limit(50);
  return NextResponse.json({ purchases: data || [] });
}
