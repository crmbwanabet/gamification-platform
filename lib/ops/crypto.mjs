// Bonus Center OPS CONSOLE: password hashing, session tokens and the audit
// hash chain. Node crypto only, so node --test loads it.
import crypto from 'node:crypto';

export const PW_ITER = 600000; // PBKDF2-SHA256, like the USSD console
export const SESSION_HOURS = 12;

export function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex'), iter = PW_ITER) {
  const hash = crypto.pbkdf2Sync(String(pw), salt, iter, 32, 'sha256').toString('hex');
  return { hash, salt, iter };
}

/** Constant-time check of a password against a stored { hash, salt, iter }. */
export function verifyPassword(pw, stored) {
  if (!stored || !stored.hash || !stored.salt || !stored.iter) return false;
  const got = crypto.pbkdf2Sync(String(pw), stored.salt, Number(stored.iter), 32, 'sha256');
  const want = Buffer.from(stored.hash, 'hex');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/** A new session token (given to the browser) + its sha256 (the only thing stored). */
export function newToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, tokenHash: sha256(token) };
}

export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

/** Constant-time string compare (setup code). */
export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? '')), y = Buffer.from(String(b ?? ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export const GENESIS = '0'.repeat(64);

/** The hash of an audit entry, chained to the previous entry's hash. */
export function auditHash(prevHash, { at, actor, ip, action, target, detail }) {
  return sha256([prevHash, at, actor ?? '', ip ?? '', action ?? '', target ?? '', JSON.stringify(detail ?? null)].join('|'));
}

/** Checks a list of audit rows (oldest first): { ok, checked, brokenAt }. */
export function verifyChain(rows, startPrev = GENESIS) {
  let prev = startPrev;
  for (const r of rows) {
    const at = new Date(r.at).toISOString();
    if (r.prev_hash !== prev || auditHash(prev, { at, actor: r.actor, ip: r.ip, action: r.action, target: r.target, detail: r.detail }) !== r.hash) {
      return { ok: false, checked: rows.length, brokenAt: r.id };
    }
    prev = r.hash;
  }
  return { ok: true, checked: rows.length, brokenAt: null };
}
