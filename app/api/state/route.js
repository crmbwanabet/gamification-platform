import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyBwanabetToken } from '@/lib/auth/bwanabetToken';
import { migrateCurrencyState } from '@/lib/economy/currency.mjs';

export const runtime = 'nodejs';

// Mirror columns. `gems` is retired (2026-10-07) and no longer written; the
// prize gems are emeralds / rubies / diamonds (`diamonds` reused, see
// lib/economy/currency.mjs for why that is safe).
const NUMERIC = ['kwacha', 'emeralds', 'rubies', 'diamonds', 'xp', 'deposits', 'streak'];
const GEM_COLUMNS = ['emeralds', 'rubies'];

// POST { token, kwacha?, emeralds?, rubies?, diamonds?, ..., state? } -> persist this player's progress.
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
    // A blob without the currencyVersion marker predates the gem economy (an
    // old bundle still open in a tab): its gem balances are reset to 0, never
    // carried into the new emeralds/rubies/diamonds.
    patch.state = migrateCurrencyState(body.state);
    for (const g of ['emeralds', 'rubies', 'diamonds']) if (g in patch) patch[g] = patch.state[g];
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

  let { data, error } = await supabaseAdmin
    .from('profiles').update(patch).eq('bwanabet_user_id', uid).select('*').single();
  // Tolerate the minutes before the gem-currencies migration adds the
  // emeralds/rubies mirror columns: retry without them (state jsonb is the truth).
  if (error && GEM_COLUMNS.some(c => (error.message || '').includes(c))) {
    for (const c of GEM_COLUMNS) delete patch[c];
    ({ data, error } = await supabaseAdmin
      .from('profiles').update(patch).eq('bwanabet_user_id', uid).select('*').single());
  }
  if (error) return NextResponse.json({ error: 'db_error', detail: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, profile: data });
}
