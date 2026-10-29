'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { desktopScale, cardFit } from '@/lib/ui/desktopScale.mjs';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** The desktop scale for a baseW x baseH card (lib/ui/desktopScale.mjs), kept current on resize. */
export default function useDesktopScale(baseW, baseH, max) {
  const [s, setS] = useState(1);
  useEffect(() => {
    const on = () => setS(desktopScale(window.innerWidth, window.innerHeight, baseW, baseH, max));
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, [baseW, baseH, max]);
  return s;
}

/**
 * { scale, width } for a baseW x baseH card (cardFit in lib/ui/desktopScale.mjs):
 * scaled up on desktop, scaled DOWN on screens too short for it (landscape and
 * short phones), with the layout width that still fits once scaled. Kept current
 * on resize / rotation; measured before paint so the card never flashes oversized.
 */
export function useCardFit(baseW, baseH, max, padY) {
  const [fit, setFit] = useState({ scale: 1, width: baseW, vw: 0, vh: 0 });
  useIsoLayoutEffect(() => {
    const on = () => {
      const vw = window.innerWidth, vh = window.innerHeight;
      const next = { ...cardFit(vw, vh, baseW, baseH, max, undefined, padY), vw, vh };
      setFit((f) => (f.scale === next.scale && f.width === next.width && f.vw === vw && f.vh === vh ? f : next));
    };
    on();
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => { window.removeEventListener('resize', on); window.removeEventListener('orientationchange', on); };
  }, [baseW, baseH, max, padY]);
  return fit;
}
