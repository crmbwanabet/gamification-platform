'use client';
// Batched activity beacon (2026-10-19: every player action). Never throws,
// never blocks gameplay. Each batch carries the bwanabet token so the SERVER
// decides who the player is (the token is only checked there, never stored or
// logged); without a login the events are kept as 'anon' with the session id.
// sid = one id per widget load, so a visit can be followed step by step.
let queue = [];
let uid = 'anon';
let tokenGetter = null;
let timer = null;
const sid = (() => {
  try { return (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).slice(0, 36); }
  catch { return String(Date.now()); }
})();

function flush() {
  if (!queue.length) return;
  let token = null;
  try { token = tokenGetter ? tokenGetter() : null; } catch { /* ignore */ }
  const payload = JSON.stringify({ uid, sid, token, events: queue.splice(0, 25) });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
  } catch (e) { /* drop */ }
  if (queue.length) setTimeout(flush, 500);
}

export function setTrackUid(id) { if (id) uid = String(id); }
/** Where the beacon gets the current login token (SessionProvider's getToken). */
export function setTrackToken(getter) { tokenGetter = typeof getter === 'function' ? getter : null; }
/** Send now (e.g. right after a reward claim, or when the widget closes). */
export const flushTrack = () => { try { flush(); } catch { /* ignore */ } };

export function track(type, data = {}) {
  if (typeof window === 'undefined') return;
  queue.push({ type, at: new Date().toISOString(), ...data });
  if (queue.length >= 25) flush();
  if (!timer) {
    timer = setInterval(flush, 10000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
    window.addEventListener('pagehide', flush);
  }
}
