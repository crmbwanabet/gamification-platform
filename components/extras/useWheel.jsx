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

export const WHEEL_URL = process.env.NEXT_PUBLIC_WHEEL_URL || 'https://wheel-of-fortune-roan.vercel.app';
const WHEEL_ORIGIN = (() => { try { return new URL(WHEEL_URL).origin; } catch { return null; } })();

const CSS = `
  .wh-ov { position: fixed; inset: 0; z-index: 420; background: rgba(8,4,20,.72); display: none; align-items: center; justify-content: center; }
  .wh-ov.open { display: flex; }
  .wh-ov iframe { border: 0; border-radius: 16px; width: 95vw; max-width: 420px; height: 90vh; max-height: 750px; background: transparent; }
`;

/** { available, open(), layer } — `layer` must stay mounted on every tab. */
export function useWheel({ enabled, getToken }) {
  const [available, setAvailable] = React.useState(false);
  const [isOpen, setOpen] = React.useState(false);
  const frameRef = React.useRef(null);
  const tokenRef = React.useRef(null);
  const token = enabled ? getToken() : null;
  if (token !== tokenRef.current) tokenRef.current = token;

  const sendAuth = React.useCallback(() => {
    const w = frameRef.current?.contentWindow;
    if (!w || !tokenRef.current || !WHEEL_ORIGIN) return;
    try { w.postMessage({ type: 'bwanabet-auth', token: tokenRef.current }, WHEEL_ORIGIN); } catch { /* ignore */ }
  }, []);

  React.useEffect(() => {
    if (!enabled || !WHEEL_ORIGIN) return undefined;
    const onMsg = (e) => {
      if (e.origin !== WHEEL_ORIGIN || !e.data || typeof e.data.type !== 'string') return;
      if (e.source !== frameRef.current?.contentWindow) return;
      const t = e.data.type;
      if (t === 'bwanabet-wheel-ready') sendAuth();
      else if (t === 'bwanabet-wheel-available') setAvailable(!!e.data.available);
      else if (t === 'bwanabet-wheel-close') setOpen(false);
      else if (t === 'bwanabet-wheel-spun') setTimeout(() => setAvailable(false), 2000);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [enabled, sendAuth]);

  // A new account (or log-out) re-keys the iframe so it re-checks availability.
  const frameKey = token ? token.slice(-16) : 'none';
  React.useEffect(() => { setAvailable(false); setOpen(false); }, [frameKey]);

  const layer = enabled && token && WHEEL_ORIGIN ? (
    <div className={`wh-ov${isOpen ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <iframe key={frameKey} ref={frameRef} src={WHEEL_URL} title="Wheel of Fortune" allow="autoplay" onLoad={sendAuth} />
    </div>
  ) : null;

  return { available: enabled && available, open: () => setOpen(true), layer };
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
