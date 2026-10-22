// Bonus Center OPS CONSOLE, server side (2026-10-22): sessions, the failed-login
// counter and the hash-chained audit log, on the Gamification Supabase
// (service role). Pure rules live in perms.mjs / crypto.mjs.
import { supabaseAdmin as db } from '@/lib/supabase/admin';
import { newToken, sha256, auditHash, GENESIS, SESSION_HOURS } from './crypto.mjs';

export const LOGIN_WINDOW_MIN = 15;
export const LOGIN_MAX_FAILS = 10;

export function clientIp(req) {
  const xf = req.headers.get('x-forwarded-for');
  return (xf ? xf.split(',')[0] : req.headers.get('x-real-ip') || '').trim() || null;
}

/** The signed-in login for this request (X-Admin-Session), or null. */
export async function sessionAdmin(req) {
  const token = req.headers.get('x-admin-session');
  if (!token || token.length < 32 || !db) return null;
  const { data, error } = await db.from('ops_sessions')
    .select('token_hash, expires_at, admin:ops_admins(id, username, role, permissions, active)')
    .eq('token_hash', sha256(token)).maybeSingle();
  if (error || !data || !data.admin) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) {
    await db.from('ops_sessions').delete().eq('token_hash', data.token_hash);
    return null;
  }
  if (data.admin.active === false) return null;
  return { ...data.admin, tokenHash: data.token_hash };
}

export async function startSession(adminId, ip) {
  const { token, tokenHash } = newToken();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600e3).toISOString();
  const { error } = await db.from('ops_sessions').insert({ token_hash: tokenHash, admin_id: adminId, expires_at: expires, ip });
  if (error) throw new Error(error.message);
  await db.from('ops_admins').update({ last_login_at: new Date().toISOString() }).eq('id', adminId);
  return { token, expires_at: expires };
}

export async function tooManyFailures(ip) {
  if (!ip) return false;
  const since = new Date(Date.now() - LOGIN_WINDOW_MIN * 60e3).toISOString();
  const { count } = await db.from('ops_login_failures').select('id', { count: 'exact', head: true }).eq('ip', ip).gte('at', since);
  return (count || 0) >= LOGIN_MAX_FAILS;
}
export async function noteFailure(ip) {
  if (ip) await db.from('ops_login_failures').insert({ ip });
}

/** Appends one audit entry, chained to the last one. Never throws. */
export async function audit({ actor, ip, action, target = null, detail = null }) {
  try {
    const { data: last } = await db.from('ops_audit').select('hash').order('id', { ascending: false }).limit(1).maybeSingle();
    const prev = last?.hash || GENESIS;
    const at = new Date().toISOString();
    const entry = { at, actor: actor || 'unknown', ip, action, target: target == null ? null : String(target), detail };
    await db.from('ops_audit').insert({ ...entry, prev_hash: prev, hash: auditHash(prev, entry) });
  } catch (e) { console.error('[ops] audit write failed', e && e.message); }
}
