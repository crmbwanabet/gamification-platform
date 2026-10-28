import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { bearerMatches } from '@/lib/auth/feedSecret';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Ops console DAILY ROLLUP (2026-10-28): every 10 minutes, fold the new
// activity_events into ops_daily via ops_rollup() (each call adds at most 2
// hours of events, so a missed run catches up over a few calls). The ops
// reports read ops_daily + the raw tail since the last run, so they stay live.
// Migration: lib/supabase/migrations/2026-10-28-ops-daily-rollup.sql
//
// Auth: Authorization: Bearer <CRON_SECRET> (Vercel Cron sends it by itself).

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const MAX_CALLS = 12; // up to 24 hours of backlog per run

let running = false; // one run per warm instance

async function handle(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return json({ error: 'cron_disabled' }, 503);
  if (!bearerMatches(req, secret)) return json({ error: 'unauthorized' }, 401);
  if (!supabaseAdmin) return json({ error: 'not_configured' }, 503);
  if (running) return json({ status: 'busy' }, 409);
  running = true;
  try {
    let calls = 0, rows = 0, last = null;
    while (calls < MAX_CALLS) {
      const { data, error } = await supabaseAdmin.rpc('ops_rollup');
      if (error) {
        console.error('[ops-rollup]', error.message);
        return json({ ok: false, error: 'db_error', calls, rows, rolledTo: last }, 500);
      }
      calls += 1;
      const r = (data || [])[0] || {};
      rows += Number(r.rows_upserted) || 0;
      last = r.rolled_to || last;
      // caught up: this call reached "now - 1 min" (less than its 2-hour step)
      if (!r.rolled_to || Date.parse(r.rolled_to) - Date.parse(r.rolled_from) < 2 * 3600e3) break;
    }
    return json({ ok: true, calls, rows, rolledTo: last });
  } finally {
    running = false;
  }
}

export const GET = handle;   // Vercel Cron calls GET
export const POST = handle;  // manual runs
