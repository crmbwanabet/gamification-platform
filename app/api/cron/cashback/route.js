import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { bearerMatches } from '@/lib/auth/feedSecret';
import { loadAnchors } from '@/lib/season/anchorServer';
import { runCashback, CASHBACK_CURSOR } from '@/lib/cashback/crmCashback.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Daily gem CASHBACK (2026-10-23): every 10 minutes, pay each UTC-day window
// (02:00 → 02:00 Lusaka) from 06:00 Lusaka the next morning, once the CRM says its data is complete
// (`GET {CRM_URL}/api/player-cashback`, x-api-key: GAMIFICATION_API_KEY).
// Every reported player's day lands in the cashback_daily ledger; gem awards
// land in cashback_awards (one per player per window); the player
// collects them in the Bonus Center. Logic: lib/cashback/crmCashback.mjs.
// Doc: docs/integrations/crm-cashback-feed.md
//
// Auth: Authorization: Bearer <CRON_SECRET> (Vercel Cron sends it itself).
// A clean no-op ({ status: 'disabled' }) while GAMIFICATION_API_KEY is unset.

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const dbFail = (error) => Object.assign(new Error('db'), { code: 'db_error', detail: error && error.message });

let running = false; // one run per warm instance

const db = {
  async readState() {
    const { data, error } = await supabaseAdmin.from('feed_cursors')
      .select('since,after_user,after_day').eq('name', CASHBACK_CURSOR).maybeSingle();
    if (error) throw dbFail(error);
    return data;
  },
  async saveState(s, lastRun) {
    const { error } = await supabaseAdmin.from('feed_cursors').upsert({
      name: CASHBACK_CURSOR, since: s.paid, after_day: s.window, after_user: s.afterUser,
      last_run: lastRun, updated_at: new Date().toISOString(),
    }, { onConflict: 'name' });
    if (error) { console.error('[cashback] state save failed:', error.message); throw dbFail(error); }
  },
  async loadEconomy() {
    const { data, error } = await supabaseAdmin.from('platform_config').select('value').eq('key', 'economy').maybeSingle();
    if (error) throw dbFail(error);
    return data?.value || null;
  },
  loadAnchors,
  async insertDaily(rows) {
    const { error } = await supabaseAdmin.from('cashback_daily')
      .upsert(rows, { onConflict: 'user_id,window_day', ignoreDuplicates: true });
    if (error) { console.error('[cashback] ledger insert failed:', error.message); throw dbFail(error); }
  },
  async insertAwards(rows) {
    const { data, error } = await supabaseAdmin.from('cashback_awards')
      .upsert(rows, { onConflict: 'user_id,window_day', ignoreDuplicates: true }).select('user_id');
    if (error) { console.error('[cashback] insert failed:', error.message); throw dbFail(error); }
    return (data || []).length;
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
    const out = await runCashback({
      env: { GAMIFICATION_API_KEY: process.env.GAMIFICATION_API_KEY, CRM_URL: process.env.CRM_URL },
      fetch, db, budgetMs: (maxDuration - 60) * 1000,
    });
    if (out.status === 'crm_error' || out.status === 'db_error') console.warn('[cashback]', out.status, out.error || '', out.window || '');
    const code = out.status === 'crm_error' ? 502 : out.status === 'db_error' ? 500 : 200;
    return json({ ok: code === 200, ...out }, code);
  } finally {
    running = false;
  }
}

export const GET = handle;   // Vercel Cron calls GET
export const POST = handle;  // manual runs
