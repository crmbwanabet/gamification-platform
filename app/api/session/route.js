import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyBwanabetToken, profileFromClaims } from '@/lib/auth/bwanabetToken';

export const runtime = 'nodejs';

// POST { token } -> validate the bwanabet token, then load-or-create this
// player's profile (keyed by bwanabet user id) and return it.
export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'supabase_not_configured' }, { status: 500 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_body' }, { status: 400 }); }

  const result = verifyBwanabetToken(body?.token);
  if (!result.valid || !result.payload?.id) {
    return NextResponse.json({ error: 'invalid_token', reason: result.reason }, { status: 401 });
  }
  // Fail closed: a token whose signature was NOT verified (no signing key
  // configured) is forgeable — reject it unless an operator explicitly opts in.
  if (!result.verified && process.env.SSO_ALLOW_UNVERIFIED !== 'true') {
    console.error('[session] REJECTED unverified token — set BWANABET_JWT_SECRET/_PUBLIC_KEY (or SSO_ALLOW_UNVERIFIED=true for dev)');
    return NextResponse.json({ error: 'token_unverified', reason: 'signing_key_not_configured' }, { status: 401 });
  }

  const claims = profileFromClaims(result.payload);
  const uid = claims.bwanabet_user_id;

  const { data: existing, error: selErr } = await supabaseAdmin
    .from('profiles').select('*').eq('bwanabet_user_id', uid).maybeSingle();
  if (selErr) return NextResponse.json({ error: 'db_error', detail: selErr.message }, { status: 500 });

  let profile = existing;
  if (!existing) {
    const { data: created, error: insErr } = await supabaseAdmin
      .from('profiles').insert(claims).select('*').single();
    if (insErr) return NextResponse.json({ error: 'db_error', detail: insErr.message }, { status: 500 });
    profile = created;
  } else {
    // refresh identity fields from the token; keep the game state/currencies
    const { data: updated } = await supabaseAdmin
      .from('profiles').update(claims).eq('bwanabet_user_id', uid).select('*').single();
    if (updated) profile = updated;
  }

  return NextResponse.json({ ok: true, verified: !!result.verified, profile });
}
