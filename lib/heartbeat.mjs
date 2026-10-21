// Heartbeat (2026-10-21): exact visit length + who is online now.
// While the Bonus Center is OPEN (widget shown) AND its tab is visible, the
// client pings POST /api/track/ping every 30 s; when either stops it sends one
// final ping. The server keeps ONE play_sessions row per session (sid) and
// moves profiles.last_seen_at. Pure logic here (tests/heartbeat.test.mjs);
// the browser glue is lib/track.js (sendPing) + GamificationPlatform.

export const HEARTBEAT_MS = 30000;   // client ping interval
export const MIN_PING_GAP_MS = 20000; // server: at most one regular ping per sid per 20 s
export const ONLINE_WINDOW_S = 90;    // "online now" = a ping in the last 90 s

/** Should pings run? Only while the Bonus Center is shown and the tab is visible. */
export function shouldBeat({ open, visible }) {
  return open === true && visible === true;
}

/**
 * Ping scheduler. `send(final)` posts one ping; timers are injectable for
 * tests. update({ open, visible }) starts pings (one at once, then every
 * intervalMs) or stops them with one final ping. stop() = page going away.
 */
export function createHeartbeat({ send, intervalMs = HEARTBEAT_MS, setTimer = setInterval, clearTimer = clearInterval } = {}) {
  let timer = null;
  let state = { open: false, visible: false };
  const beating = () => timer !== null;
  const start = () => {
    if (beating()) return;
    send(false);
    timer = setTimer(() => send(false), intervalMs);
  };
  const halt = () => {
    if (!beating()) return;
    clearTimer(timer);
    timer = null;
    send(true);
  };
  return {
    update(next = {}) {
      state = { ...state, ...next };
      if (shouldBeat(state)) start(); else halt();
    },
    stop: halt,
    get beating() { return beating(); },
    get state() { return { ...state }; },
  };
}

const SID_RE = /^[A-Za-z0-9-]{8,40}$/;

/** Validate a ping body: { sid, final, token? }. Returns { sid, final } or null. */
export function cleanPing(body) {
  if (!body || typeof body !== 'object') return null;
  const sid = typeof body.sid === 'string' ? body.sid : '';
  if (!SID_RE.test(sid)) return null;
  return { sid, final: body.final === true };
}
