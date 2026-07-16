'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

// SSO session for the gamification widget. The bwanabet parent page passes its
// logged-in `token` (JWT) into this iframe; we exchange it server-side for the
// player's profile. No separate login.
//
// Handoff channels (in priority): postMessage from an allowed parent origin, or
// a `#token=...` URL hash (signed-URL embeds). All trust is enforced server-side
// in /api/session — this component just relays the token.

const SessionContext = createContext({ status: 'idle', profile: null, verified: false, error: null, saveState: async () => null, buyItem: async () => null, listPurchases: async () => null });
export const useSession = () => useContext(SessionContext);

// The live operator site is bwanabet.co.zm (Zambia); .com kept for any legacy
// embed. Override at build time with NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS.
const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_ALLOWED_PARENT_ORIGINS ||
  'https://bwanabet.co.zm,https://www.bwanabet.co.zm,https://bwanabet.com,https://www.bwanabet.com')
  .split(',').map((s) => s.trim()).filter(Boolean);

export default function SessionProvider({ children }) {
  const [state, setState] = useState({ status: 'idle', profile: null, verified: false, error: null });
  const tokenRef = useRef(null);

  const exchangeToken = useCallback(async (token) => {
    if (!token || tokenRef.current === token) return;
    tokenRef.current = token;
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) { setState({ status: 'error', profile: null, verified: false, error: data?.error || 'session_failed' }); return; }
      setState({ status: 'ready', profile: data.profile, verified: !!data.verified, error: null });
    } catch (e) {
      setState({ status: 'error', profile: null, verified: false, error: String(e) });
    }
  }, []);

  useEffect(() => {
    const onMsg = (ev) => {
      if (!ALLOWED_ORIGINS.includes(ev.origin)) return;
      const d = ev.data || {};
      const t = d.bwanabetToken || (d.type === 'bwanabet-token' && d.token);
      if (t) exchangeToken(t);
    };
    window.addEventListener('message', onMsg);

    // Most direct path: if this widget is served same-site as bwanabet (e.g.
    // gamification.bwanabet.co.zm), the `token` cookie is readable here — no
    // parent handoff needed. Cross-origin embeds simply won't see it and fall
    // through to postMessage / hash. The token is validated server-side either way.
    try {
      const m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
      if (m && m[1]) exchangeToken(decodeURIComponent(m[1]));
    } catch { /* ignore */ }

    // Fallback: token in the URL hash (#token=...), then scrub it from the address bar.
    try {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const t = hash.get('token');
      if (t) { exchangeToken(t); window.history.replaceState(null, '', window.location.pathname + window.location.search); }
    } catch { /* ignore */ }

    // Tell the parent we're mounted and ready to receive the token.
    try {
      if (window.parent && window.parent !== window) {
        ALLOWED_ORIGINS.forEach((o) => { try { window.parent.postMessage({ type: 'gamification-ready' }, o); } catch { /* */ } });
      }
    } catch { /* not embedded */ }

    return () => window.removeEventListener('message', onMsg);
  }, [exchangeToken]);

  const saveState = useCallback(async (patch) => {
    if (!tokenRef.current) return null;
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRef.current, ...patch }),
      });
      const data = await res.json();
      if (res.ok) setState((s) => ({ ...s, profile: data.profile }));
      return data;
    } catch (e) {
      return { error: String(e) };
    }
  }, []);

  // Buy a store item as the authenticated player (identity from the token).
  const buyItem = useCallback(async (itemId) => {
    if (!tokenRef.current) return null;
    try {
      const res = await fetch('/api/purchase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenRef.current, itemId }),
      });
      return await res.json();
    } catch (e) { return { error: String(e) }; }
  }, []);

  // The player's own purchase list (refund reconciliation).
  const listPurchases = useCallback(async () => {
    if (!tokenRef.current) return null;
    try {
      const res = await fetch('/api/purchase', { headers: { Authorization: `Bearer ${tokenRef.current}` } });
      return res.ok ? await res.json() : null;
    } catch (e) { return null; }
  }, []);

  // claimVoucher (streak-voucher via /api/predictions/voucher) parked with the
  // predictions feature on 2026-07-15 — see parked/ + git history to restore.

  return (
    <SessionContext.Provider value={{ ...state, saveState, buyItem, listPurchases }}>
      {children}
    </SessionContext.Provider>
  );
}
