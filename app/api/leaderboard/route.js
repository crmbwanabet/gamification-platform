import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { authedUid, bearer } from '@/lib/auth/ssoUid';
import { lusakaDay } from '@/lib/casino/feed.mjs';
import { loadSeasonConfig } from '@/lib/season/serverConfig';
import { LEAGUE_BANDS, BOARD_SIZE, prizeForRank, maskId, thisWeek, lastWeek } from '@/lib/extras/rules.mjs';
import { boardFor, findMe } from '@/lib/extras/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// GET /api/leaderboard  (Authorization: Bearer <bwanabet SSO token>, optional)
// -> { week: {from,to}, bands: [{ id, name, top: [{rank, label, xp, me}] }],
//      me: {band, rank, xp} | null, lastWeek: { rank, band, coins, claimed } | null, prizes }
// This week's XP from real play only (CRM rows), per stage band. Names are the
// player's own (obscenity-checked) else a partly hidden ID.
export async function GET(req) {
  const uid = authedUid(bearer(req));
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`board-ip:${ip}`, 60, 60000)) return json({ error: 'slow_down' }, 429);
  if (!supabaseAdmin) return json({ error: 'unavailable' }, 503);

  const today = lusakaDay();
  const cfg = await loadSeasonConfig();
  const wk = thisWeek(today);
  try {
    const bands = await boardFor(wk.from, wk.to, cfg);
    const me = uid ? findMe(bands, uid) : null;
    let last = null;
    if (uid) {
      const lw = lastWeek(today);
      const prev = findMe(await boardFor(lw.from, lw.to, cfg), uid);
      const coins = prev ? prizeForRank(prev.rank) : 0;
      if (coins > 0) {
        const { data } = await supabaseAdmin.from('leaderboard_claims').select('coins').eq('user_id', uid).eq('week_start', lw.from).maybeSingle();
        last = { rank: prev.rank, band: prev.band, coins, claimed: !!data, week: lw };
      }
    }
    return json({
      week: wk,
      bands: LEAGUE_BANDS.map(b => ({
        id: b.id, name: b.name, from: b.from, to: b.to, players: bands[b.id].length,
        top: bands[b.id].slice(0, BOARD_SIZE).map(r => ({ rank: r.rank, label: r.name || maskId(r.userId), xp: r.xp, me: r.userId === uid })),
      })),
      me, lastWeek: last, prizes: [1, 2, 3, 4].map(prizeForRank),
    });
  } catch (e) {
    console.error('[leaderboard] failed:', e.message);
    return json({ error: 'unavailable' }, 503);
  }
}
