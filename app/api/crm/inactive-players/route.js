import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rateLimit';
import { bearerMatches } from '@/lib/auth/feedSecret';
import { lusakaDay } from '@/lib/casino/feed.mjs';
import { addDays } from '@/lib/season/xp.mjs';
import { inactivePlayers, COMEBACK } from '@/lib/extras/rules.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const PAGE = 1000;

// GET /api/crm/inactive-players  (Authorization: Bearer <PLAYER_FEED_SECRET>)
// -> { day, link, coins, players: [{ userId, lastActiveDay, daysInactive }] }
// The CRM's list for the "come back" SMS: players whose last real-money
// activity was 7..60 days ago and who have not claimed a bonus for that lapse.
// Player IDs only (the CRM holds the phone numbers). Contract:
// docs/integrations/crm-comeback-sms.md
export async function GET(req) {
  const secret = process.env.PLAYER_FEED_SECRET || process.env.CASINO_FEED_SECRET;
  if (!secret || secret.length < 16) return json({ error: 'feed_disabled' }, 503);
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`crm-inactive:${ip}`, 10, 60000)) return json({ error: 'slow_down' }, 429);
  if (!bearerMatches(req, secret)) return json({ error: 'unauthorized' }, 401);
  if (!supabaseAdmin) return json({ error: 'not_configured' }, 503);

  const today = lusakaDay();
  const from = addDays(today, -(COMEBACK.maxDays + 1));
  try {
    const rows = [];
    for (let p = 0; p < 200; p++) {
      const { data, error } = await supabaseAdmin.from('player_activity')
        .select('user_id,day,deposits_amount,deposits_count,casino_stake,casino_rounds,sports_stake,sports_slips')
        .gte('day', from).order('user_id').order('day').range(p * PAGE, p * PAGE + PAGE - 1);
      if (error) throw new Error(error.message);
      rows.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    const { data: claims, error: cErr } = await supabaseAdmin.from('comeback_claims').select('user_id,last_active_day').gte('last_active_day', from);
    if (cErr) throw new Error(cErr.message);
    const claimed = new Set((claims || []).map(c => `${c.user_id}:${c.last_active_day}`));
    return json({ day: today, link: 'https://bwanabet.co.zm/?bonus=open', coins: COMEBACK.coins, players: inactivePlayers(rows, today, claimed) });
  } catch (e) {
    console.error('[crm-inactive] failed:', e.message);
    return json({ error: 'unavailable' }, 503);
  }
}
