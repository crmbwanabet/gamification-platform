import crypto from 'crypto';

// Shared-secret check for the CRM feeds (casino rounds, player activity).
// Compare SHA-256 digests so the lengths always match and nothing about the
// secret's length leaks through timing.
export function secretMatches(given, expected) {
  const a = crypto.createHash('sha256').update(String(given)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

/** True when the request carries `Authorization: Bearer <secret>`. */
export function bearerMatches(req, secret) {
  const auth = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return !!m && secretMatches(m[1].trim(), secret);
}
