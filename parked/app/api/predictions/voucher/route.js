import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyBwanabetToken } from '@/lib/auth/bwanabetToken';
import { sendVoucherNotification } from '@/lib/telegram';

export const runtime = 'nodejs';

const STREAK_TARGET = 3;
const VOUCHER_LABEL = 'K20 Free Bet';

// How many vouchers this player's full settled-prediction history entitles
// them to: every disjoint run of STREAK_TARGET consecutive wins = 1 voucher
// (a loss resets the run). Deterministic over history, so grants are
// idempotent: entitled - alreadyGranted = what's owed now.
function entitledVouchers(predictions) {
  const settled = (Array.isArray(predictions) ? predictions : [])
    .filter((p) => p && (p.status === 'won' || p.status === 'lost'))
    .sort((a, b) => (a.settledAt || 0) - (b.settledAt || 0));
  let run = 0, entitled = 0;
  for (const p of settled) {
    if (p.status === 'won') {
      run += 1;
      if (run === STREAK_TARGET) { entitled += 1; run = 0; }
    } else {
      run = 0;
    }
  }
  return entitled;
}

// POST { token } → checks the player's SAVED prediction history (Supabase) and
// sends any newly-earned streak vouchers to the Telegram admin group for
// manual crediting (same fulfillment flow as the wheel widget).
export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_body' }, { status: 400 }); }

  const result = verifyBwanabetToken(body?.token);
  if (!result.valid || !result.payload?.id) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  // Fail closed: never grant real-value vouchers against a forgeable token.
  if (!result.verified && process.env.SSO_ALLOW_UNVERIFIED !== 'true') {
    return NextResponse.json({ error: 'token_unverified', reason: 'signing_key_not_configured' }, { status: 401 });
  }
  const uid = Number(result.payload.id);

  const { data: profile, error } = await supabaseAdmin
    .from('profiles').select('*').eq('bwanabet_user_id', uid).single();
  if (error || !profile) return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });

  const state = (profile.state && typeof profile.state === 'object') ? profile.state : {};
  const alreadyGranted = Number(state.predVouchersGranted) || 0;
  const entitled = entitledVouchers(state.predictions);
  const owed = entitled - alreadyGranted;
  if (owed <= 0) return NextResponse.json({ ok: true, granted: 0, totalGranted: alreadyGranted });

  // Send one notification per voucher; only count grants whose notification
  // reached Telegram ('sent') or the dev stub ('stub'). A 'failed' send stays
  // owed and is retried on the next claim call.
  let delivered = 0;
  for (let i = 0; i < owed; i++) {
    const status = await sendVoucherNotification({
      userId: uid,
      username: profile.username,
      phone: profile.phone,
      voucher: VOUCHER_LABEL,
      streak: STREAK_TARGET,
    });
    if (status === 'failed') break;
    delivered += 1;
  }
  if (delivered === 0) return NextResponse.json({ error: 'notify_failed' }, { status: 502 });

  const log = Array.isArray(state.voucherLog) ? state.voucherLog : [];
  const newState = {
    ...state,
    predVouchersGranted: alreadyGranted + delivered,
    voucherLog: [...log, ...Array.from({ length: delivered }, () => ({ at: Date.now(), voucher: VOUCHER_LABEL }))].slice(-50),
  };
  const { error: upErr } = await supabaseAdmin
    .from('profiles').update({ state: newState }).eq('bwanabet_user_id', uid);
  if (upErr) return NextResponse.json({ error: 'db_error', detail: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, granted: delivered, voucher: VOUCHER_LABEL, totalGranted: alreadyGranted + delivered });
}
