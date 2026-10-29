import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { isIsoDay } from '@/lib/casino/feed.mjs';
import { awardCoins, cashbackSplit, CASHBACK_TAKES } from '@/lib/cashback/rules.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Daily gem CASHBACK (2026-10-23): the logged-in player's awards that are not
// collected yet (GET), and collecting them (POST). The award rows are written
// by the cron (app/api/cron/cashback); collecting flips collected_at ONCE and
// only then does the client credit what this returns. Since 2026-10-29 the
// "Choose reward" pop-up collects every waiting window together and `take`
// picks coins or ONE gem kind: the value of the awarded gems (economy.gemValues)
// is paid as that, the rest in coins (cashbackSplit). 'gems' = the award's own
// gems (older clients). The payout is stored in `paid` on the oldest window.

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const COLS = 'window_day,cashback_kwacha,value_coins,emeralds,rubies,diamonds';
const view = (r) => ({
  window: r.window_day, cashbackKwacha: Number(r.cashback_kwacha), valueCoins: Number(r.value_coins),
  emeralds: r.emeralds, rubies: r.rubies, diamonds: r.diamonds,
});

// GET /api/cashback -> { awards: [{ window, cashbackKwacha, valueCoins, emeralds, rubies, diamonds }] } (oldest first)
export async function GET(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`cashback:${uid}`, 20, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  const { data, error } = await supabaseAdmin.from('cashback_awards').select(COLS)
    .eq('user_id', uid).is('collected_at', null).order('window_day', { ascending: true }).limit(30);
  if (error) { console.error('[cashback] list failed:', error.message); return json({ error: 'unavailable' }, 503); }
  return json({ awards: (data || []).map(view) });
}

// POST /api/cashback { windows: [day..] (or window: day), take } ->
//   { ok, take, paid: { coins, emeralds, rubies, diamonds }, windows: [day..] } once; 409 already_collected.
export async function POST(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`cashback-collect:${uid}`, 20, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);
  let body;
  try { body = await req.json(); } catch { body = null; }
  const days = Array.isArray(body?.windows) ? [...new Set(body.windows)] : body?.window != null ? [body.window] : [];
  if (!days.length || days.length > 30 || !days.every(isIsoDay)) return json({ error: 'bad_window' }, 400);
  const take = body.take == null ? 'gems' : body.take;
  if (!CASHBACK_TAKES.includes(take)) return json({ error: 'bad_take' }, 400);

  let economy = null;
  if (take !== 'gems') {
    const { data: eco, error: ecoErr } = await supabaseAdmin.from('platform_config').select('value').eq('key', 'economy').maybeSingle();
    if (ecoErr) { console.error('[cashback] economy read failed:', ecoErr.message); return json({ error: 'unavailable' }, 503); }
    economy = eco?.value;
  }
  // Claim first (one conditional update: a row is only ever collected once),
  // then work out the payout from the rows actually claimed.
  const { data: rows, error } = await supabaseAdmin.from('cashback_awards')
    .update({ collected_at: new Date().toISOString(), taken_as: take })
    .eq('user_id', uid).in('window_day', days).is('collected_at', null)
    .select(COLS);
  if (error) { console.error('[cashback] collect failed:', error.message); return json({ error: 'unavailable' }, 503); }
  if (!rows || !rows.length) return json({ error: 'already_collected' }, 409);

  const paid = take === 'gems'
    ? rows.reduce((s, r) => ({ coins: 0, emeralds: s.emeralds + r.emeralds, rubies: s.rubies + r.rubies, diamonds: s.diamonds + r.diamonds }), { coins: 0, emeralds: 0, rubies: 0, diamonds: 0 })
    : cashbackSplit(rows.reduce((s, r) => s + awardCoins(r, economy), 0), take, economy);
  const oldest = rows.map(r => r.window_day).sort()[0];
  const { error: recErr } = await supabaseAdmin.from('cashback_awards')
    .update({ paid, coins_paid: paid.coins || null })
    .eq('user_id', uid).eq('window_day', oldest);
  if (recErr) console.error('[cashback] payout record failed:', recErr.message); // collected already; the client still credits
  // coins + award: the pre-2026-10-29 shape, for widgets still open on the old client
  return json({ ok: true, take, paid, windows: rows.map(r => r.window_day), coins: paid.coins,
    award: { ...view(rows[0]), emeralds: paid.emeralds, rubies: paid.rubies, diamonds: paid.diamonds } });
}
