import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { bearerMatches } from '@/lib/auth/feedSecret';
import { MINIGAMES } from '@/lib/data/platform';
import { lusakaMonth, previousMonthRange, rankGames, roundsByGame } from '@/lib/games/order.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// MONTHLY GAME ORDER (owner 2026-10-29): "on the first of every month, show the
// games in the order of most played". Runs DAILY (Vercel Cron 00:20Z = 02:20
// Lusaka); when the stored `game_order` row is not for the current Lusaka month
// it ranks the games by rounds played (game_played) over the WHOLE previous
// Lusaka month via ops_games() and upserts
//   platform_config.game_order = { month, order, rounds, computedAt }.
// Otherwise it is a no-op, so the order changes once a month and a missed run
// heals itself the next day. /api/config -> merge.mjs -> cfg.gameOrder.
//
// Auth: Authorization: Bearer <CRON_SECRET> (Vercel Cron sends it by itself).

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const KEY = 'game_order';

async function handle(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return json({ error: 'cron_disabled' }, 503);
  if (!bearerMatches(req, secret)) return json({ error: 'unauthorized' }, 401);
  if (!supabaseAdmin) return json({ error: 'not_configured' }, 503);

  const month = lusakaMonth(new Date());
  const { data: row, error: readErr } = await supabaseAdmin.from('platform_config').select('value').eq('key', KEY).maybeSingle();
  if (readErr) {
    console.error('[game-order] read', readErr.message);
    return json({ ok: false, error: 'db_error' }, 500);
  }
  if (row?.value?.month === month) return json({ ok: true, status: 'up_to_date', month });

  const { from, to } = previousMonthRange(month);
  const { data: rows, error } = await supabaseAdmin.rpc('ops_games', { p_from: from, p_to: to });
  if (error) {
    console.error('[game-order] ops_games', error.message);
    return json({ ok: false, error: 'db_error' }, 500);
  }
  const ids = MINIGAMES.map((g) => g.id);
  const value = { month, order: rankGames(rows, ids), rounds: roundsByGame(rows, ids), from, to, computedAt: new Date().toISOString() };
  const { error: writeErr } = await supabaseAdmin.from('platform_config')
    .upsert({ key: KEY, value, updated_at: value.computedAt, updated_by: 'cron:game-order' }, { onConflict: 'key' });
  if (writeErr) {
    console.error('[game-order] write', writeErr.message);
    return json({ ok: false, error: 'db_error' }, 500);
  }
  return json({ ok: true, status: 'updated', ...value });
}

export const GET = handle;   // Vercel Cron calls GET
export const POST = handle;  // manual runs
