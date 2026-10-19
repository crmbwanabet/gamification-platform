import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { lusakaDay } from '@/lib/casino/feed.mjs';
import { loadSeasonConfig } from '@/lib/season/serverConfig';
import { prizeForRank, lastWeek } from '@/lib/extras/rules.mjs';
import { boardFor, findMe } from '@/lib/extras/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// POST /api/leaderboard/claim -> { ok, coins, rank } | { error }
// Last week's prize, recomputed here from the CRM rows (never the client's
// word) and recorded ONCE (primary key user + week). The client credits the
// coins after an ok, like every other reward.
export async function POST(req) {
  const uid = authedUid(bearer(req));
  if (!uid) return json({ error: 'not_logged_in' }, 401);
  if (!rateLimit(`board-claim:${uid}`, 5, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);

  const lw = lastWeek(lusakaDay());
  try {
    const me = findMe(await boardFor(lw.from, lw.to, await loadSeasonConfig()), uid);
    const coins = me ? prizeForRank(me.rank) : 0;
    if (!coins) return json({ error: 'no_prize' }, 403);
    const { error } = await supabaseAdmin.from('leaderboard_claims')
      .insert({ user_id: uid, week_start: lw.from, band: me.band, rank: me.rank, coins });
    if (error) {
      if (error.code === '23505') return json({ error: 'already_claimed' }, 409);
      throw new Error(error.message);
    }
    return json({ ok: true, coins, rank: me.rank, band: me.band });
  } catch (e) {
    console.error('[leaderboard-claim] failed:', e.message);
    return json({ error: 'unavailable' }, 503);
  }
}
