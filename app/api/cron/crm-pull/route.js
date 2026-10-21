import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { bearerMatches } from '@/lib/auth/feedSecret';
import { runCrmPull, CRM_PULL_CURSOR } from '@/lib/season/crmPullJob.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Hourly import of the CRM's player-daily feed (2026-10-21) into
// player_activity. Pulls `GET {CRM_URL}/api/player-daily` (x-api-key:
// GAMIFICATION_API_KEY) from the saved keyset cursor, OVERWRITES each
// (user_id, day) via replace_player_activity(), saves the cursor after every
// committed page and stops ~60 s before the function limit (the next run
// resumes). The pull is the source of truth; POST /api/activity/player-daily
// (max-wins push) stays for now. Doc: docs/integrations/crm-player-daily-pull.md
//
// Auth: Authorization: Bearer <CRON_SECRET> (Vercel Cron sends it by itself;
// a Supabase pg_cron + pg_net job can too). Disabled while CRON_SECRET is
// unset; a clean no-op ({ status: 'disabled' }) while GAMIFICATION_API_KEY is.

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const dbFail = (error) => Object.assign(new Error('db'), { code: 'db_error', detail: error && error.message });

let running = false; // one run per warm instance

const db = {
  async readCursor() {
    const { data, error } = await supabaseAdmin.from('feed_cursors')
      .select('since,after_user,after_day').eq('name', CRM_PULL_CURSOR).maybeSingle();
    if (error) throw dbFail(error);
    return data;
  },
  async writeRows(rows) {
    const { error } = await supabaseAdmin.rpc('replace_player_activity', { p_rows: rows });
    if (error) { console.error('[crm-pull] replace failed:', error.message); throw dbFail(error); }
  },
  async saveCursor(c, lastRun) {
    const { error } = await supabaseAdmin.from('feed_cursors').upsert({
      name: CRM_PULL_CURSOR, since: c ? c.since : null, after_user: c && c.after_user ? c.after_user : null,
      after_day: c && c.after_day ? c.after_day : null, last_run: lastRun, updated_at: new Date().toISOString(),
    }, { onConflict: 'name' });
    if (error) { console.error('[crm-pull] cursor save failed:', error.message); throw dbFail(error); }
  },
  async saveRun(lastRun) {
    await supabaseAdmin.from('feed_cursors').update({ last_run: lastRun }).eq('name', CRM_PULL_CURSOR);
  },
};

async function handle(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return json({ error: 'cron_disabled' }, 503);
  if (!bearerMatches(req, secret)) return json({ error: 'unauthorized' }, 401);
  if (!supabaseAdmin) return json({ error: 'not_configured' }, 503);
  if (running) return json({ status: 'busy' }, 409);
  running = true;
  try {
    const out = await runCrmPull({
      env: { GAMIFICATION_API_KEY: process.env.GAMIFICATION_API_KEY, CRM_URL: process.env.CRM_URL },
      fetch, db, budgetMs: (maxDuration - 60) * 1000,
    });
    if (out.status !== 'done' && out.status !== 'disabled') console.warn('[crm-pull]', out.status, out.error || '', `pages=${out.pages} written=${out.written}`);
    const code = out.status === 'crm_error' ? 502 : out.status === 'db_error' ? 500 : 200;
    return json({ ok: code === 200, ...out }, code);
  } finally {
    running = false;
  }
}

export const GET = handle;   // Vercel Cron calls GET
export const POST = handle;  // pg_net / manual runs
