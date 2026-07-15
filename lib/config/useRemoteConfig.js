'use client';
import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';

// Fetch /api/config once on mount. Until it resolves — or forever, if it
// fails — the app runs on DEFAULT_CONFIG (+ empty store). `ready` flips true
// after the first settle either way so callers can sequence on it.
export function useRemoteConfig() {
  const [state, setState] = useState({ ...DEFAULT_CONFIG, storeItems: [], ready: false });
  useEffect(() => {
    let alive = true;
    // Bound the request: a hung connection must not delay the first daily-plays
    // refresh indefinitely — on timeout the catch path below sets ready with defaults.
    // Guarded: AbortSignal.timeout is missing on older browsers (Safari/iOS <16, Chrome <103).
    const signal = typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(8000) : undefined;
    fetch('/api/config', { signal })
      .then(r => (r.ok ? r.json() : null))
      .then(cfg => { if (alive) setState(cfg && cfg.games && cfg.economy ? { storeItems: [], ...cfg, ready: true } : s => ({ ...s, ready: true })); })
      .catch(() => { if (alive) setState(s => ({ ...s, ready: true })); });
    return () => { alive = false; };
  }, []);
  return state;
}
