'use client';

import React from 'react';
import { CANDY, C } from '../redesign/tokens';
import { Card } from '../redesign/RedesignShell';

// Wheel of Fortune INSIDE the Bonus Center (2026-10-19). The wheel stays its
// own app (wheel-of-fortune repo: prizes, daily limit, kill switch, Telegram
// payouts all live there); this only hosts it, speaking the same postMessage
// protocol as the wheel's own embed.js on bwanabet.com:
//   wheel -> us : bwanabet-wheel-ready | bwanabet-wheel-available {available}
//                 | bwanabet-wheel-close | bwanabet-wheel-spun
//   us -> wheel : bwanabet-auth {token}   (only to the wheel's own origin)
// The wheel accepts the token from this app's origin (its ALLOWED_AUTH_ORIGINS).
// A hidden iframe asks "is today's spin available?"; the Home card shows only
// when it is, and opens the same iframe full screen.

export const WHEEL_URL = process.env.NEXT_PUBLIC_WHEEL_URL || 'https://wheel.bwanabet.dev';
const WHEEL_ORIGIN = (() => { try { return new URL(WHEEL_URL).origin; } catch { return null; } })();

const CSS = `
  .wh-ov { position: fixed; inset: 0; z-index: 420; background: rgba(8,4,20,.72); display: none; align-items: center; justify-content: center; }
  .wh-ov.open { display: flex; }
  .wh-ov iframe { border: 0; border-radius: 16px; width: 95vw; max-width: 420px; height: 90vh; max-height: 750px; background: transparent; }
`;

/**
 * { available, open(), layer } — `layer` must stay mounted on every tab.
 * autoOpen: open the wheel by itself the first time this load learns a spin
 *   is available (the "wheel first, then the Bonus Center" flow, 2026-10-19);
 *   onEvent('auto_open') lets the caller ask widget.js to show the popup.
 * preview: the wheel's public TEST mode (no login, test spins never pay),
 *   for /preview.html only.
 * settled: true once the wheel answered (or 8s passed, or no wheel) — see checked.
 * onEvent(name): 'available' | 'auto_open' | 'opened' | 'closed' | 'spun' (activity tracking).
 */
export function useWheel({ enabled, getToken, autoOpen = false, preview = false, onEvent }) {
  const [available, setAvailable] = React.useState(false);
  const [isOpen, setOpenState] = React.useState(false);
  // settled = the wheel has said whether a spin is available (or 8s passed):
  // the pop-ups that follow the wheel wait for it, so the wheel never opens on top of them.
  const [checked, setChecked] = React.useState(false);
  const frameRef = React.useRef(null);
  const tokenRef = React.useRef(null);
  const autoDoneRef = React.useRef(false);
  const spunRef = React.useRef(false); // the wheel can report one spin twice
  const evRef = React.useRef(onEvent);
  evRef.current = onEvent;
  const emit = (name) => { try { evRef.current && evRef.current(name); } catch { /* ignore */ } };
  const on = enabled || preview;
  const token = enabled && !preview ? getToken() : null;
  if (token !== tokenRef.current) tokenRef.current = token;
  const src = preview ? `${WHEEL_URL}/?test=1&closeAfter=1` : WHEEL_URL;

  const setOpen = setOpenState;
  const firstRef = React.useRef(true);
  React.useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return; }
    emit(isOpen ? 'opened' : 'closed');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendAuth = React.useCallback(() => {
    const w = frameRef.current?.contentWindow;
    if (!w || !tokenRef.current || !WHEEL_ORIGIN) return;
    try { w.postMessage({ type: 'bwanabet-auth', token: tokenRef.current }, WHEEL_ORIGIN); } catch { /* ignore */ }
  }, []);

  React.useEffect(() => {
    if (!on || !WHEEL_ORIGIN) return undefined;
    const onMsg = (e) => {
      if (e.origin !== WHEEL_ORIGIN || !e.data || typeof e.data.type !== 'string') return;
      if (e.source !== frameRef.current?.contentWindow) return;
      const t = e.data.type;
      if (t === 'bwanabet-wheel-ready') sendAuth();
      else if (t === 'bwanabet-wheel-available') {
        const ok = !!e.data.available;
        setAvailable(ok);
        setChecked(true);
        if (ok) emit('available');
        if (ok && autoOpen && !autoDoneRef.current) {
          autoDoneRef.current = true;
          setOpen(true);
          emit('auto_open');
        }
      } else if (t === 'bwanabet-wheel-close') setOpen(false);
      else if (t === 'bwanabet-wheel-spun') { if (!spunRef.current) { spunRef.current = true; emit('spun'); } setTimeout(() => setAvailable(false), 2000); }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [on, autoOpen, sendAuth, setOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // A new account (or log-out) re-keys the iframe so it re-checks availability.
  const frameKey = preview ? 'preview' : token ? token.slice(-16) : 'none';
  React.useEffect(() => { setAvailable(false); setOpenState(false); setChecked(false); }, [frameKey]);
  React.useEffect(() => {
    if (!on || checked) return undefined;
    const t = setTimeout(() => setChecked(true), 8000);
    return () => clearTimeout(t);
  }, [on, checked, frameKey]);

  const layer = on && (token || preview) && WHEEL_ORIGIN ? (
    <div className={`wh-ov${isOpen ? ' open' : ''}`} data-wheel-overlay onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <iframe key={frameKey} ref={frameRef} src={src} title="Wheel of Fortune" allow="autoplay" onLoad={sendAuth} />
    </div>
  ) : null;

  return { available: on && available, isOpen, settled: !on || !(token || preview) || !WHEEL_ORIGIN || checked, open: () => setOpen(true), layer };
}

/** Home card: shown only while today's free spin is available. */
export function WheelCard({ onOpen }) {
  return (
    <Card style={{ overflow: 'hidden' }}>
      <button type="button" onClick={onOpen} aria-label="Spin the Wheel of Fortune"
        style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: 14 }}>
        <img src="/images/wheel.jpg" alt="" width={72} height={72} style={{ flex: 'none', width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', boxShadow: `0 0 0 3px ${CANDY.gold}, 0 0 18px rgba(255,210,31,.5)` }} />
        <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}>
          <span style={{ fontFamily: CANDY.display, fontSize: 22, lineHeight: 1.05, color: CANDY.gold, textTransform: 'uppercase' }}>Free spin ready</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Spin the Wheel of Fortune once a day and win a prize</span>
        </span>
        <span style={{ flex: 'none', fontFamily: CANDY.display, fontSize: 18, color: '#fff', padding: '12px 16px', borderRadius: 12, background: `linear-gradient(180deg, ${CANDY.green.light}, ${CANDY.green.fill})`, boxShadow: `0 4px 0 ${CANDY.green.dark}` }}>SPIN</span>
      </button>
    </Card>
  );
}
