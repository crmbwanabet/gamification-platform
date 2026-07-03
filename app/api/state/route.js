import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyBwanabetToken } from '@/lib/auth/bwanabetToken';

export const runtime = 'nodejs';

const NUMERIC = ['kwacha', 'gems', 'diamonds', 'xp', 'deposits', 'streak'];

// POST { token, kwacha?, gems?, ..., state? } -> persist this player's progress.
// The token identifies the player (server-side); the client can't spoof another id.
export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_body' }, { status: 400 }); }

  const result = verifyBwanabetToken(body?.token);
  if (!result.valid || !result.payload?.id) return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  // Fail closed: never persist against an unverified (forgeable) token.
  if (!result.verified && process.env.SSO_ALLOW_UNVERIFIED !== 'true') {
    return NextResponse.json({ error: 'token_unverified', reason: 'signing_key_not_configured' }, { status: 401 });
  }
  const uid = Number(result.payload.id);

  const patch = {};
  for (const k of NUMERIC) if (typeof body?.[k] === 'number' && Number.isFinite(body[k])) patch[k] = body[k];
  // Cap the state blob so a client can't stuff arbitrarily large JSON into the row.
  if (body?.state && typeof body.state === 'object' && !Array.isArray(body.state)) {
    if (JSON.stringify(body.state).length > 20000) return NextResponse.json({ error: 'state_too_large' }, { status: 413 });
    patch.state = body.state;
    // Server-owned keys (voucher bookkeeping) live inside the same blob but are
    // written only by /api/predictions/voucher — carry them over so a client
    // save can never wipe them (which would re-grant already-sent vouchers).
    const { data: existing } = await supabaseAdmin
      .from('profiles').select('state').eq('bwanabet_user_id', uid).single();
    const cur = existing?.state;
    if (cur && typeof cur === 'object') {
      for (const k of ['predVouchersGranted', 'voucherLog']) if (k in cur) patch.state[k] = cur[k];
    }
  }
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from('profiles').update(patch).eq('bwanabet_user_id', uid).select('*').single();
  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, profile: data });
}
