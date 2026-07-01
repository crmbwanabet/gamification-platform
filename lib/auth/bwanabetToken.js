import crypto from 'crypto';

// Verify + decode the bwanabet `token` JWT (dependency-free, Node crypto).
// bwanabet stores this JWT in a cookie named `token`; its payload carries the
// full user profile (id, username, phone, f_name, currency, exp, ...).

const b64urlBuf = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const b64urlJson = (s) => JSON.parse(b64urlBuf(s).toString('utf8'));

/**
 * Returns { valid, verified, payload, reason }.
 *  - verified === true ONLY when the signature was checked against a configured key.
 *  - With no key configured, it decodes + checks `exp` but verified === false
 *    (INSECURE — dev/scaffold only; set BWANABET_JWT_SECRET or _PUBLIC_KEY for prod).
 */
export function verifyBwanabetToken(token) {
  if (!token || typeof token !== 'string') return { valid: false, reason: 'no_token' };
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'malformed' };
  const [h, p, sig] = parts;

  let header, payload;
  try { header = b64urlJson(h); payload = b64urlJson(p); }
  catch { return { valid: false, reason: 'decode_error' }; }

  if (payload.exp && Date.now() / 1000 > payload.exp) return { valid: false, reason: 'expired', payload };

  const alg = header.alg;
  const secret = process.env.BWANABET_JWT_SECRET;
  const pubkey = (process.env.BWANABET_JWT_PUBLIC_KEY || '').replace(/\\n/g, '\n');
  const signingInput = `${h}.${p}`;
  const sigBuf = b64urlBuf(sig);

  try {
    if (alg === 'HS256' && secret) {
      const expected = crypto.createHmac('sha256', secret).update(signingInput).digest();
      const ok = expected.length === sigBuf.length && crypto.timingSafeEqual(expected, sigBuf);
      return ok ? { valid: true, verified: true, payload } : { valid: false, reason: 'bad_signature' };
    }
    if ((alg === 'RS256' || alg === 'RS512') && pubkey) {
      const ok = crypto.createVerify(alg === 'RS512' ? 'RSA-SHA512' : 'RSA-SHA256').update(signingInput).verify(pubkey, sigBuf);
      return ok ? { valid: true, verified: true, payload } : { valid: false, reason: 'bad_signature' };
    }
  } catch {
    return { valid: false, reason: 'verify_error' };
  }

  // No usable key configured -> decode-only. NOT trusted; must set a key before production.
  return { valid: true, verified: false, payload, reason: 'unverified_no_key' };
}

// Map JWT claims -> profiles columns.
export function profileFromClaims(payload) {
  return {
    bwanabet_user_id: Number(payload.id),
    username: payload.username ?? null,
    phone: payload.phone ?? null,
    first_name: payload.f_name ?? null,
    last_name: payload.l_name ?? null,
    email: payload.e_mail ?? null,
    currency: payload.currency ?? null,
    country: payload.country ?? null,
    avatar: payload.avatar ?? null,
  };
}
