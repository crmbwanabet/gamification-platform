// Tiny in-memory rate limiter (per serverless instance). Not durable across
// cold starts — acceptable: it exists to blunt bursts, not to be a wall.
const hits = new Map();

export function rateLimit(key, max = 5, windowMs = 60000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear(); // crude memory cap
  return true;
}
