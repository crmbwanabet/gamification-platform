import { NextResponse } from 'next/server';
import { supabaseAdmin as db } from '@/lib/supabase/admin';
import { ROUTE_PERMS, can, cleanPermissions, effectivePermissions, editProblem, checkPassword, cleanUsername, SECTIONS, ACTIONS } from '@/lib/ops/perms.mjs';
import { hashPassword, verifyPassword, safeEqual, verifyChain } from '@/lib/ops/crypto.mjs';
import { sessionAdmin, startSession, tooManyFailures, noteFailure, audit, clientIp } from '@/lib/ops/server';
import { getStage } from '@/lib/vuma/stages.mjs';
import { bandForStage, LEAGUE_BANDS } from '@/lib/extras/rules.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Bonus Center OPS CONSOLE API (2026-10-22). The console (public/ops/index.html,
// served at /ops) is a static page; every figure comes from here. Same model as
// the USSD ops console: own logins (master / limited with ticked sections),
// X-Admin-Session token (12 h, only its sha256 stored), 10 failed logins per IP
// per 15 min, hash-chained audit log. READ-ONLY in v1: the only writes are
// sign-in/out, passwords and managing logins. Days are Africa/Lusaka days.

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status, error, extra) => json({ error, ...(extra || {}) }, status);
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const lusakaToday = () => new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
const addDay = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const num = (v) => (v == null ? 0 : Number(v) || 0);

/** [from, to) as timestamps for Lusaka days `from`..`to` inclusive (default: today). */
function windowOf(sp) {
  const today = lusakaToday();
  let from = DAY_RE.test(sp.get('from') || '') ? sp.get('from') : today;
  let to = DAY_RE.test(sp.get('to') || '') ? sp.get('to') : from;
  if (to < from) [from, to] = [to, from];
  if (Date.parse(to) - Date.parse(from) > 400 * 864e5) from = addDay(to, -400);
  return { from, to, fromTs: `${from}T00:00:00+02:00`, toTs: `${addDay(to, 1)}T00:00:00+02:00`, live: to >= today };
}

const levelOf = (xp) => { const s = getStage(num(xp)); return { level: s.stage, title: s.title, band: bandForStage(s.stage).id }; };

async function profilesFor(uids) {
  const ids = [...new Set(uids)].filter(u => /^\d+$/.test(u)).map(Number);
  const out = new Map();
  for (let i = 0; i < ids.length; i += 500) {
    const { data } = await db.from('profiles').select('bwanabet_user_id, xp, state->>displayName').in('bwanabet_user_id', ids.slice(i, i + 500));
    for (const p of data || []) out.set(String(p.bwanabet_user_id), { xp: num(p.xp), name: p.displayName || null });
  }
  return out;
}

const matchesQ = (q, uid, name) => !q || uid.includes(q) || (name || '').toLowerCase().includes(q.toLowerCase());

// ---------------------------------------------------------------- handlers --

async function report(sp) {
  const w = windowOf(sp);
  const rows = sp.get('rows') === 'days' ? 'days' : 'players';
  const q = (sp.get('q') || '').trim();
  const band = sp.get('band') || 'all';
  if (rows === 'days') {
    const { data, error } = await db.rpc('ops_report_days', { p_from: w.fromTs, p_to: w.toTs });
    if (error) throw error;
    return { window: w, rows, items: (data || []).map(r => ({ ...r, staked: num(r.staked), paid: num(r.paid), coins_out: num(r.coins_out), active_minutes: num(r.active_minutes) })) };
  }
  const { data, error } = await db.rpc('ops_report_players', { p_from: w.fromTs, p_to: w.toTs });
  if (error) throw error;
  const prof = await profilesFor((data || []).map(r => r.uid));
  const items = (data || []).map(r => {
    const p = prof.get(r.uid) || { xp: 0, name: null };
    return { ...r, name: p.name, xp: p.xp, ...levelOf(p.xp), staked: num(r.staked), paid: num(r.paid), coins_out: num(r.coins_out), active_minutes: num(r.active_minutes) };
  }).filter(r => matchesQ(q, r.uid, r.name) && (band === 'all' || r.band === band));
  return { window: w, rows, items };
}

async function coins(sp) {
  const w = windowOf(sp);
  const { data, error } = await db.rpc('ops_coins', { p_from: w.fromTs, p_to: w.toTs });
  if (error) throw error;
  const { data: buys } = await db.from('purchases').select('status, price_kwacha, payout_kwacha, is_money, prize_key')
    .gte('created_at', w.fromTs).lt('created_at', w.toTs).limit(5000);
  const shop = { count: 0, coinsSpent: 0, kwachaPending: 0, kwachaCredited: 0, kwachaRejected: 0, prizes: 0 };
  for (const b of buys || []) {
    shop.count += 1;
    if (b.prize_key) shop.prizes += 1; else if (b.status !== 'rejected') shop.coinsSpent += num(b.price_kwacha);
    const k = num(b.payout_kwacha);
    if (b.status === 'credited') shop.kwachaCredited += k; else if (b.status === 'rejected') shop.kwachaRejected += k; else shop.kwachaPending += k;
  }
  return { window: w, rows: (data || []).map(r => ({ ...r, coins: num(r.coins), staked: r.staked == null ? null : num(r.staked), paid: r.paid == null ? null : num(r.paid) })), shop };
}

async function games(sp) {
  const w = windowOf(sp);
  const { data, error } = await db.rpc('ops_games', { p_from: w.fromTs, p_to: w.toTs });
  if (error) throw error;
  return { window: w, items: (data || []).map(r => ({ ...r, staked: num(r.staked), paid: num(r.paid) })) };
}

async function transactions(sp) {
  const w = windowOf(sp);
  let qy = db.from('purchases').select('id, created_at, uid, item_name, status, price_kwacha, price_emeralds, price_rubies, price_diamonds, payout_kwacha, is_money, prize_key, handled_by, handled_at, telegram_error')
    .gte('created_at', w.fromTs).lt('created_at', w.toTs).order('created_at', { ascending: false }).limit(1000);
  const status = sp.get('status');
  if (status && status !== 'all') qy = qy.eq('status', status);
  const q = (sp.get('q') || '').trim();
  if (/^\d+$/.test(q)) qy = qy.eq('uid', q);
  const { data, error } = await qy;
  if (error) throw error;
  return { window: w, items: data || [] };
}

async function trends(sp) {
  const w = windowOf(sp);
  const { data, error } = await db.rpc('ops_report_days', { p_from: w.fromTs, p_to: w.toTs });
  if (error) throw error;
  return { window: w, days: (data || []).map(r => ({ ...r, staked: num(r.staked), paid: num(r.paid), coins_out: num(r.coins_out), active_minutes: num(r.active_minutes) })) };
}

async function players(sp) {
  const q = (sp.get('q') || '').trim().slice(0, 40);
  const band = sp.get('band') || 'all';
  const { data, error } = await db.rpc('ops_players', { p_q: q || null, p_limit: 1000 });
  if (error) throw error;
  const items = (data || []).map(r => ({ ...r, ...levelOf(r.xp), coins: num(r.coins), active_minutes: num(r.active_minutes), casino_7d: num(r.casino_7d), sports_7d: num(r.sports_7d), deposits_7d: num(r.deposits_7d) }))
    .filter(r => band === 'all' || r.band === band);
  return { items };
}

async function player(sp) {
  const uid = (sp.get('uid') || '').trim();
  if (!/^\d+$/.test(uid)) return null;
  const [{ data: p }, { data: sessions }, { data: events }, { data: bets }, { data: buys }, { data: preds }, { data: gameRows }] = await Promise.all([
    db.from('profiles').select('bwanabet_user_id, xp, kwacha, emeralds, rubies, diamonds, created_at, updated_at, last_seen_at, first_login_at, first_daily_at, state').eq('bwanabet_user_id', Number(uid)).maybeSingle(),
    db.from('play_sessions').select('started_at, last_ping_at, active_seconds, pings, ended_at, verified').eq('uid', uid).order('started_at', { ascending: false }).limit(20),
    db.from('activity_events').select('created_at, type, game_id, amount, meta').eq('uid', uid).order('created_at', { ascending: false }).limit(60),
    db.from('player_activity').select('day, casino_stake, casino_rounds, sports_stake, sports_slips, deposits_amount, deposits_count, withdrawals_amount, crm_synced_at').eq('user_id', uid).order('day', { ascending: false }).limit(30),
    db.from('purchases').select('created_at, item_name, status, price_kwacha, payout_kwacha, prize_key').eq('uid', uid).order('created_at', { ascending: false }).limit(20),
    db.from('predictions').select('created_at, home, away, pick, outcome, claimed_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(20),
    db.rpc('ops_player_games', { p_uid: uid }),
  ]);
  const s = (p && p.state && typeof p.state === 'object') ? p.state : {};
  return {
    uid,
    exists: !!p,
    profile: p ? {
      name: s.displayName || null, ...levelOf(p.xp), xp: num(p.xp),
      coins: num(s.kwacha ?? p.kwacha), emeralds: num(s.emeralds ?? p.emeralds), rubies: num(s.rubies ?? p.rubies), diamonds: num(s.diamonds ?? p.diamonds),
      missions: Array.isArray(s.missionClaims) ? s.missionClaims : [], streak: num(s.streak), dailyDay: num(s.dailyDay), lastDailyClaim: s.lastDailyClaim || null,
      gamesPlayed: num(s.gamesPlayed), firstSeen: p.created_at, lastSeen: p.last_seen_at || p.updated_at, firstDaily: p.first_daily_at,
    } : null,
    sessions: sessions || [], events: events || [], bets: bets || [], purchases: buys || [], predictions: preds || [],
    games: (gameRows || []).map(r => ({ ...r, staked: num(r.staked), paid: num(r.paid), won_net: num(r.won_net) })),
  };
}

async function activity(sp) {
  const before = Number(sp.get('before')) || null;
  let qy = db.from('ops_audit').select('id, at, actor, ip, action, target, detail').order('id', { ascending: false }).limit(50);
  if (before) qy = qy.lt('id', before);
  const { data, error } = await qy;
  if (error) throw error;
  const { count } = await db.from('ops_audit').select('id', { count: 'exact', head: true });
  return { items: data || [], total: count || 0 };
}

async function verifyActivity() {
  const { data, error } = await db.from('ops_audit').select('*').order('id', { ascending: true }).limit(20000);
  if (error) throw error;
  return verifyChain(data || []);
}

const minutesSince = (t) => (t ? Math.round((Date.now() - new Date(t).getTime()) / 60000) : null);

async function health() {
  const t0 = Date.now();
  const checks = [];
  const add = (check, status, reading, detail = '') => checks.push({ check, status, reading, detail });
  const safe = async (fn, name) => { try { await fn(); } catch (e) { add(name, 'unknown', 'could not check', String(e && e.message || e).slice(0, 160)); } };

  await safe(async () => {
    const { data } = await db.from('feed_cursors').select('last_run, updated_at').eq('name', 'crm_player_daily').maybeSingle();
    const lr = data?.last_run || {};
    const age = minutesSince(lr.at);
    const st = lr.status && lr.status !== 'done' ? 'broken' : age == null ? 'unknown' : age <= 15 ? 'healthy' : age <= 60 ? 'needs attention' : 'broken';
    add('CRM pull (every 10 min)', st, age == null ? 'never ran' : `${age} min ago`, `${lr.status || '?'} · fetched ${num(lr.fetched)}, written ${num(lr.written)}, rejected ${num(lr.rejected)} · source ${(process.env.CRM_URL || 'default').replace(/^https?:\/\//, '')}`);
  }, 'CRM pull (every 10 min)');
  await safe(async () => {
    const { data } = await db.from('player_activity').select('crm_synced_at').order('crm_synced_at', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
    const age = minutesSince(data?.crm_synced_at);
    add('Betting data freshness', age == null ? 'unknown' : age <= 20 ? 'healthy' : age <= 90 ? 'needs attention' : 'broken', age == null ? 'no data' : `newest CRM row ${age} min old`, 'Casino loads into ClickHouse every 5 min; deposits hourly at :06, sports at :51.');
  }, 'Betting data freshness');
  await safe(async () => {
    const { data } = await db.from('activity_events').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
    const age = minutesSince(data?.created_at);
    add('Player tracking', age == null ? 'unknown' : age <= 60 ? 'healthy' : 'needs attention', age == null ? 'no events' : `last event ${age} min ago`, 'Quiet hours can be normal at night.');
  }, 'Player tracking');
  await safe(async () => {
    const { count } = await db.from('online_now').select('*', { count: 'exact', head: true });
    add('Players in the Bonus Center now', 'healthy', `${count || 0} online`, 'A ping in the last 90 seconds.');
  }, 'Players in the Bonus Center now');
  await safe(async () => {
    const r = await fetch('https://wheel.bwanabet.dev/ping.txt', { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    add('Wheel of Fortune', r.ok ? 'healthy' : 'broken', `HTTP ${r.status}`, 'wheel.bwanabet.dev');
  }, 'Wheel of Fortune');
  await safe(async () => {
    const r = await fetch('https://wheel-of-fortune-roan.vercel.app/embed.js', { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    const txt = r.ok ? await r.text() : '';
    const ok = txt.includes('bonus.bwanabet.dev/widget.js');
    add('bwanabet.com tag', ok ? 'healthy' : 'needs attention', ok ? 'loads the Bonus Center' : `HTTP ${r.status}`, 'The tag on the site (embed.js) must load bonus.bwanabet.dev/widget.js.');
  }, 'bwanabet.com tag');
  await safe(async () => {
    const { data } = await db.from('platform_config').select('key, value');
    const store = (data || []).find(r => r.key === 'store');
    add('Remote config', (data || []).length ? 'healthy' : 'needs attention', `${(data || []).length} rows`, `Coin Shop ${store && store.value && store.value.open === true ? 'OPEN' : 'coming soon'}`);
  }, 'Remote config');
  await safe(async () => {
    const tg = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
    const { count } = await db.from('purchases').select('id', { count: 'exact', head: true }).eq('status', 'pending').lt('created_at', new Date(Date.now() - 24 * 3600e3).toISOString());
    add('Fulfilment (Telegram)', !tg ? 'broken' : (count || 0) > 0 ? 'needs attention' : 'healthy', tg ? `${count || 0} pending > 24 h` : 'bot not configured', 'Coin Shop redemptions wait here for an admin to credit them.');
  }, 'Fulfilment (Telegram)');

  const broken = checks.filter(c => c.status === 'broken').length;
  const attention = checks.filter(c => c.status === 'needs attention').length;
  return { checks, broken, attention, ms: Date.now() - t0 };
}

// ------------------------------------------------------------------ auth --

async function authStatus() {
  const { count } = await db.from('ops_admins').select('id', { count: 'exact', head: true });
  return { hasUsers: (count || 0) > 0, setupEnabled: !!process.env.OPS_SETUP_CODE };
}

async function bootstrap(body, ip) {
  if (!process.env.OPS_SETUP_CODE) return fail(503, 'setup_disabled');
  const { count } = await db.from('ops_admins').select('id', { count: 'exact', head: true });
  if ((count || 0) > 0) return fail(409, 'already_set_up');
  if (await tooManyFailures(ip)) return fail(429, 'too_many_attempts');
  if (!safeEqual(body.setupCode, process.env.OPS_SETUP_CODE)) { await noteFailure(ip); return fail(401, 'bad_setup_code'); }
  const username = cleanUsername(body.username);
  if (!username) return fail(400, 'bad_username');
  const pw = checkPassword(body.password);
  if (!pw.ok) return fail(400, 'weak_password', { reason: pw.reason });
  const h = hashPassword(body.password);
  const { data, error } = await db.from('ops_admins').insert({ username, pw_hash: h.hash, pw_salt: h.salt, pw_iter: h.iter, role: 'master', permissions: [], created_by: 'setup' }).select('id, username, role, permissions').single();
  if (error) return fail(409, 'already_set_up');
  await audit({ actor: username, ip, action: 'auth.setup', target: username });
  const s = await startSession(data.id, ip);
  return json({ ...s, user: { username, role: 'master', permissions: effectivePermissions(data) } });
}

async function login(body, ip) {
  if (await tooManyFailures(ip)) return fail(429, 'too_many_attempts');
  const username = cleanUsername(body.username);
  const { data: a } = username ? await db.from('ops_admins').select('*').eq('username', username).maybeSingle() : { data: null };
  if (!a || a.active === false || !verifyPassword(body.password, { hash: a.pw_hash, salt: a.pw_salt, iter: a.pw_iter })) {
    await noteFailure(ip);
    await audit({ actor: username || '?', ip, action: 'auth.login_failed' });
    return fail(401, 'bad_login');
  }
  const s = await startSession(a.id, ip);
  await audit({ actor: a.username, ip, action: 'auth.login' });
  return json({ ...s, user: { username: a.username, role: a.role, permissions: effectivePermissions(a) } });
}

async function users() {
  const { data, error } = await db.from('ops_admins').select('id, username, role, permissions, active, created_at, created_by, last_login_at').order('id');
  if (error) throw error;
  return { items: data || [], sections: SECTIONS, actions: ACTIONS };
}

async function activeMasters() {
  const { count } = await db.from('ops_admins').select('id', { count: 'exact', head: true }).eq('role', 'master').eq('active', true);
  return count || 0;
}

// ---------------------------------------------------------------- router --

const READS = { report, coins, games, transactions, trends, players, activity, health, users,
  player: async (sp) => (await player(sp)) || { error: 'bad_uid' },
  'activity/verify': verifyActivity,
  me: null,
};

async function route(req, ctx, method) {
  if (!db) return fail(503, 'not_configured');
  const path = (ctx.params?.path || []).join('/');
  const ip = clientIp(req);
  try {
    if (method === 'GET' && path === 'auth/status') return json(await authStatus());
    let body = {};
    if (method === 'POST') { try { body = await req.json(); } catch { body = {}; } if (!body || typeof body !== 'object') body = {}; }
    if (method === 'POST' && path === 'auth/bootstrap') return await bootstrap(body, ip);
    if (method === 'POST' && path === 'auth/login') return await login(body, ip);

    const admin = await sessionAdmin(req);
    if (!admin) return fail(401, 'signed_out');
    if (!(path in ROUTE_PERMS)) return fail(404, 'not_found');
    if (!can(admin, ROUTE_PERMS[path])) return fail(403, 'not_allowed');
    const me = { username: admin.username, role: admin.role, permissions: effectivePermissions(admin) };

    if (method === 'GET') {
      if (path === 'me') return json(me);
      const fn = READS[path];
      if (!fn) return fail(404, 'not_found');
      return json(await fn(new URL(req.url).searchParams));
    }

    // POST: sign-out, own password, logins
    if (path === 'auth/logout') {
      await db.from('ops_sessions').delete().eq('token_hash', admin.tokenHash);
      await audit({ actor: admin.username, ip, action: 'auth.logout' });
      return json({ ok: true });
    }
    if (path === 'auth/password') {
      const { data: a } = await db.from('ops_admins').select('*').eq('id', admin.id).single();
      if (!verifyPassword(body.current, { hash: a.pw_hash, salt: a.pw_salt, iter: a.pw_iter })) return fail(401, 'bad_password');
      const pw = checkPassword(body.password);
      if (!pw.ok) return fail(400, 'weak_password', { reason: pw.reason });
      const h = hashPassword(body.password);
      await db.from('ops_admins').update({ pw_hash: h.hash, pw_salt: h.salt, pw_iter: h.iter }).eq('id', admin.id);
      await db.from('ops_sessions').delete().eq('admin_id', admin.id).neq('token_hash', admin.tokenHash);
      await audit({ actor: admin.username, ip, action: 'auth.password', target: admin.username });
      return json({ ok: true });
    }
    if (path === 'users/create') {
      const username = cleanUsername(body.username);
      if (!username) return fail(400, 'bad_username');
      const pw = checkPassword(body.password);
      if (!pw.ok) return fail(400, 'weak_password', { reason: pw.reason });
      const role = body.role === 'master' ? 'master' : 'limited';
      if (role === 'master' && admin.role !== 'master') return fail(403, 'not_allowed');
      const h = hashPassword(body.password);
      const permissions = role === 'master' ? [] : cleanPermissions(body.permissions);
      const { error } = await db.from('ops_admins').insert({ username, pw_hash: h.hash, pw_salt: h.salt, pw_iter: h.iter, role, permissions, created_by: admin.username });
      if (error) return fail(409, 'username_taken');
      await audit({ actor: admin.username, ip, action: 'user.create', target: username, detail: { role, permissions } });
      return json({ ok: true });
    }
    if (path === 'users/update' || path === 'users/password') {
      const { data: before } = await db.from('ops_admins').select('id, username, role, permissions, active').eq('id', Number(body.id)).maybeSingle();
      if (!before) return fail(404, 'no_such_login');
      if (before.role === 'master' && admin.role !== 'master') return fail(403, 'not_allowed');
      if (path === 'users/password') {
        const pw = checkPassword(body.password);
        if (!pw.ok) return fail(400, 'weak_password', { reason: pw.reason });
        const h = hashPassword(body.password);
        await db.from('ops_admins').update({ pw_hash: h.hash, pw_salt: h.salt, pw_iter: h.iter }).eq('id', before.id);
        await db.from('ops_sessions').delete().eq('admin_id', before.id);
        await audit({ actor: admin.username, ip, action: 'user.password', target: before.username });
        return json({ ok: true });
      }
      const after = {
        ...before,
        role: body.role === 'master' || body.role === 'limited' ? body.role : before.role,
        permissions: Array.isArray(body.permissions) ? cleanPermissions(body.permissions) : before.permissions,
        active: typeof body.active === 'boolean' ? body.active : before.active,
      };
      if (after.role === 'master' && admin.role !== 'master') return fail(403, 'not_allowed');
      const problem = editProblem({ actor: admin, before, after, masters: await activeMasters() });
      if (problem) return fail(400, 'not_allowed_edit', { reason: problem });
      await db.from('ops_admins').update({ role: after.role, permissions: after.role === 'master' ? [] : after.permissions, active: after.active }).eq('id', before.id);
      if (!after.active) await db.from('ops_sessions').delete().eq('admin_id', before.id);
      await audit({ actor: admin.username, ip, action: 'user.update', target: before.username, detail: { role: after.role, permissions: after.permissions, active: after.active } });
      return json({ ok: true });
    }
    return fail(404, 'not_found');
  } catch (e) {
    console.error('[ops]', path, e && (e.message || e));
    return fail(500, 'server_error');
  }
}

export const GET = (req, ctx) => route(req, ctx, 'GET');
export const POST = (req, ctx) => route(req, ctx, 'POST');
