'use client';

import { useState, useLayoutEffect } from 'react';
import { VB_W, VB_H } from './rig';

// Fit the scene viewBox to its box: widen (more yard) or heighten (more sky).
export function useFitViewBox(ref) {
  const [vb, setVb] = useState(`0 0 ${VB_W} ${VB_H}`);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      const a = w / h;
      if (a > VB_W / VB_H) { const nw = VB_H * a; setVb(`${((VB_W - nw) / 2).toFixed(2)} 0 ${nw.toFixed(2)} ${VB_H}`); }
      else { const nh = VB_W / a; setVb(`0 ${(VB_H - nh).toFixed(2)} ${VB_W} ${nh.toFixed(2)}`); }
    };
    fit();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return vb;
}
