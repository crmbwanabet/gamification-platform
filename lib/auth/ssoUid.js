import { verifyBwanabetToken } from '@/lib/auth/bwanabetToken';

// The player's bwanabet user id from the SSO token, exactly as /api/purchase
// and /api/state derive it: the verified bwanabet JWT (or, while production
// runs with SSO_ALLOW_UNVERIFIED=true, the decoded-but-unsigned one). Never a
// client-supplied id. Returns null when there is no usable identity.
export function authedUid(token) {
  const result = verifyBwanabetToken(token);
  if (!result.valid || !result.payload?.id) return null;
  if (!result.verified && process.env.SSO_ALLOW_UNVERIFIED !== 'true') return null;
  const n = Number(result.payload.id);
  return Number.isSafeInteger(n) && n > 0 ? String(n) : null;
}

export const bearer = (req) => (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
