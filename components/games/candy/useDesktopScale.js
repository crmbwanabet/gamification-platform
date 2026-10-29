'use client';

import { useEffect, useState } from 'react';
import { desktopScale } from '@/lib/ui/desktopScale.mjs';

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
