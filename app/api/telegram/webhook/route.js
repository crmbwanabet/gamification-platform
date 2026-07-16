import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseCreditCallback, handledSuffix, purchaseMessage } from '@/lib/telegram/format.mjs';
import { editPurchaseMessage, answerCallback } from '@/lib/telegram/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Telegram webhook: handles the "✅ Mark credited" button tap in the admin
// group. Verified via the secret token Telegram echoes back on every call.
// Race-safe: the UPDATE only wins while status='pending' — a dashboard-side
// credit/reject beats it and the tapper is told it's already handled.
export async function POST(req) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let update;
  try { update = await req.json(); } catch { return NextResponse.json({ ok: true }); }
  const cq = update?.callback_query;
  if (!cq) return NextResponse.json({ ok: true }); // not a button tap — ignore

  const purchaseId = parseCreditCallback(cq.data);
  if (!purchaseId || !supabaseAdmin) { await answerCallback(cq.id, 'Unrecognized action'); return NextResponse.json({ ok: true }); }

  const by = cq.from?.username ? '@' + cq.from.username : (cq.from?.first_name || 'admin');
  const { data } = await supabaseAdmin.from('purchases')
    .update({ status: 'credited', handled_by: `telegram:${by}`, handled_at: new Date().toISOString() })
    .eq('id', purchaseId).eq('status', 'pending')
    .select().limit(1);

  if (data && data.length) {
    const p = data[0];
    await editPurchaseMessage(p.telegram_message_id || cq.message?.message_id, purchaseMessage(p) + handledSuffix('credited', by));
    await answerCallback(cq.id, 'Marked credited ✅');
  } else {
    await answerCallback(cq.id, 'Already handled');
  }
  return NextResponse.json({ ok: true });
}
