'use client';
// Batched activity beacon. Never throws, never blocks gameplay.
let queue = [];
let uid = 'anon';
let timer = null;

function flush() {
  if (!queue.length) return;
  const payload = JSON.stringify({ uid, events: queue.splice(0, 25) });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
  } catch (e) { /* drop */ }
}

export function setTrackUid(id) { if (id) uid = String(id); }

export function track(type, data = {}) {
  if (typeof window === 'undefined') return;
  queue.push({ type, ...data });
  if (!timer) {
    timer = setInterval(flush, 10000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }
}
