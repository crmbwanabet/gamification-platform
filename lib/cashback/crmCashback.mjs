// Daily gem CASHBACK: the pull from the CRM (owner 2026-10-23). Pure, with the
// CRM fetch and the database injected so tests/cashback.test.mjs drives it
// without a network or Supabase; app/api/cron/cashback/route.js passes the
// real ones. Contract: docs/integrations/crm-cashback-feed.md
//
//   GET {CRM_URL}/api/player-cashback?window=YYYY-MM-DD&limit=1000[&after_user=ID]
//   x-api-key: GAMIFICATION_API_KEY
//   -> { window, complete, rows: [{ user_id, casino_stake, casino_win, sports_stake, sports_win }], next_after_user }
//
// One run pays every window whose pay time (06:00 Lusaka the next morning)
// has come and is not paid yet, oldest first
// (on the very first run: only the latest one, no back pay). A window waits
// while the CRM says it is not `complete` (its data has not landed yet).
// Players count from their REWARD ANCHOR (first daily-reward claim day, the
// window's day inclusive). Every reported player's day lands in the
// cashback_daily ledger (paid or not, with the reason); each award is inserted once per (player, window):
// a re-run or a later CRM correction never pays twice and never claws back.
import { normalizeUserId, isIsoDay } from '../casino/feed.mjs';
import { countsFrom } from '../season/anchor.mjs';
import { cashbackAward, paysGems, lastFinishedWindow, nextWindowDay } from './rules.mjs';

export const CASHBACK_CURSOR = 'crm_cashback';
export const DEFAULT_CRM_URL = 'https://bwanabet-crm-overview.vercel.app';
export const CASHBACK_LIMITS = Object.freeze({ pageSize: 1000, maxAmount: 1e9, timeoutMs: 20000, maxWindowsPerRun: 3 });

const AMOUNTS = ['casino_stake', 'casino_win', 'sports_stake', 'sports_win'];

function amount(v) {
  const n = typeof v === 'string' && /^\d{1,12}(\.\d{1,6})?$/.test(v.trim()) ? Number(v.trim()) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= CASHBACK_LIMITS.maxAmount ? Math.round(n * 100) / 100 : undefined;
}

/** One CRM row -> { user_id, loss } (net loss in kwacha, ≥ 0) or { error }. */
export function mapCashbackRow(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return { error: 'not_an_object' };
  const user_id = normalizeUserId(r.user_id);
  if (!user_id) return { error: 'bad_user_id' };
  const a = {};
  for (const k of AMOUNTS) {
    a[k] = amount(r[k]);
    if (a[k] === undefined) return { error: `bad_${k}` };
  }
  const loss = Math.round((a.casino_stake - a.casino_win + a.sports_stake - a.sports_win) * 100) / 100;
  return { user_id, loss: Math.max(0, loss), ...a };
}

const fail = (code) => Object.assign(new Error(code), { code });

/** GET one page. Throws { code: crm_unreachable | crm_http_<status> | crm_bad_body }; never puts the key in an error. */
export async function fetchCashbackPage({ fetch, baseUrl, apiKey, window, afterUser = null, limit = CASHBACK_LIMITS.pageSize }) {
  const q = new URLSearchParams({ window, limit: String(limit) });
  if (afterUser) q.set('after_user', afterUser);
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), CASHBACK_LIMITS.timeoutMs) : null;
  let res;
  try {
    res = await fetch(`${String(baseUrl).replace(/\/+$/, '')}/api/player-cashback?${q}`, {
      method: 'GET', headers: { 'x-api-key': apiKey, accept: 'application/json' }, cache: 'no-store', signal: ctl ? ctl.signal : undefined,
    });
  } catch {
    throw fail('crm_unreachable');
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (!res.ok) throw fail(`crm_http_${res.status}`);
  let body;
  try { body = await res.json(); } catch { throw fail('crm_bad_body'); }
  if (!body || body.window !== window || typeof body.complete !== 'boolean' || !Array.isArray(body.rows)) throw fail('crm_bad_body');
  const next = body.next_after_user == null ? null : String(body.next_after_user);
  return { complete: body.complete, rows: body.rows, next: next || null };
}

/** The saved progress -> { paid: day|null, window: day|null, afterUser: string|null }. */
export function cleanState(s) {
  const paid = s && isIsoDay(s.since) ? s.since : null;
  const window = s && isIsoDay(s.after_day) ? s.after_day : null;
  const afterUser = window && s && typeof s.after_user === 'string' && s.after_user ? s.after_user : null;
  return { paid, window, afterUser };
}

/**
 * env: { GAMIFICATION_API_KEY, CRM_URL }. db: {
 *   readState() -> feed_cursors row | null,
 *   saveState({ paid, window, afterUser }, lastRun),
 *   loadEconomy() -> economy row | null,
 *   loadAnchors(ids) -> { [userId]: anchorDay },
 *   insertDaily(rows) -> void (ON CONFLICT DO NOTHING; the cashback_daily ledger, optional),
 *   insertAwards(rows) -> number inserted (ON CONFLICT DO NOTHING),
 * }.
 * Returns { status: disabled | up_to_date | waiting | done | time_up | crm_error | db_error, ... } with no secrets.
 */
export async function runCashback({ env = {}, fetch, db, now = new Date(), clock = Date.now, budgetMs = 240000, limit = CASHBACK_LIMITS.pageSize }) {
  const apiKey = typeof env.GAMIFICATION_API_KEY === 'string' ? env.GAMIFICATION_API_KEY.trim() : '';
  if (!apiKey) return { status: 'disabled', reason: 'GAMIFICATION_API_KEY is not set' };
  const baseUrl = (typeof env.CRM_URL === 'string' && /^https?:\/\//.test(env.CRM_URL.trim())) ? env.CRM_URL.trim() : DEFAULT_CRM_URL;
  const deadline = clock() + budgetMs;
  const out = { status: 'up_to_date', windows: [], pages: 0, rows: 0, recorded: 0, awarded: 0, rejected: 0 };

  let state, economy;
  try {
    state = cleanState(await db.readState());
    economy = await db.loadEconomy();
  } catch {
    return { ...out, status: 'db_error', error: 'state_read_failed' };
  }
  const target = lastFinishedWindow(now);
  let win = state.window || (state.paid ? nextWindowDay(state.paid) : target);
  let afterUser = state.window ? state.afterUser : null;
  const runAt = new Date(now).toISOString();
  const save = async (s) => db.saveState(s, { at: runAt, ...out });

  for (let n = 0; win <= target && n < CASHBACK_LIMITS.maxWindowsPerRun; n++) {
    for (;;) {
      if (clock() > deadline) { out.status = 'time_up'; return out; }
      let page;
      try {
        page = await fetchCashbackPage({ fetch, baseUrl, apiKey, window: win, afterUser, limit });
      } catch (e) {
        return { ...out, status: 'crm_error', error: e.code || 'crm_error', window: win };
      }
      if (!page.complete) { out.status = 'waiting'; out.window = win; return out; }
      out.pages += 1;
      out.rows += page.rows.length;
      const mapped = [];
      for (const r of page.rows) {
        const m = mapCashbackRow(r);
        if (m.error) out.rejected += 1; else mapped.push(m);
      }
      try {
        const anchors = mapped.length ? await db.loadAnchors(mapped.map(m => m.user_id)) : {};
        const daily = [];
        const awards = [];
        for (const m of mapped) {
          const a = cashbackAward(m.loss, economy);
          const status = !(m.loss > 0) ? 'no_loss' : !countsFrom(win, anchors[m.user_id]) ? 'not_eligible' : !paysGems(a) ? 'below_minimum' : 'awarded';
          const gems = status === 'awarded' ? { emeralds: a.emeralds, rubies: a.rubies, diamonds: a.diamonds } : { emeralds: 0, rubies: 0, diamonds: 0 };
          const amounts = { casino_stake: m.casino_stake, casino_win: m.casino_win, sports_stake: m.sports_stake, sports_win: m.sports_win };
          daily.push({ user_id: m.user_id, window_day: win, ...amounts, net_loss: a.lossKwacha, cashback_kwacha: a.cashbackKwacha, ...gems, status });
          if (status !== 'awarded') continue;
          awards.push({
            user_id: m.user_id, window_day: win, net_loss: a.lossKwacha, cashback_kwacha: a.cashbackKwacha,
            value_coins: a.paidCoins, ...gems, ...amounts,
          });
        }
        // the ledger first: every reported player's day is on record before any gem is paid
        if (daily.length && db.insertDaily) await db.insertDaily(daily);
        out.recorded += daily.length;
        if (awards.length) out.awarded += await db.insertAwards(awards);
        afterUser = page.next;
        if (afterUser) await save({ paid: state.paid, window: win, afterUser });
        else {
          state = { paid: win, window: null, afterUser: null };
          out.windows.push(win);
          out.status = 'done';
          await save(state);
        }
      } catch {
        return { ...out, status: 'db_error', error: 'award_write_failed', window: win };
      }
      if (!afterUser) break;
    }
    win = nextWindowDay(win);
  }
  return out;
}
