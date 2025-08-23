'use client';

import { useEffect, useState } from 'react';

export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const onChange = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile('matches' in e ? e.matches : (e as MediaQueryList).matches);

    // Set initial
    setIsMobile(mql.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => onChange(e);
    mql.addEventListener?.('change', handler);

    return () => {
      mql.removeEventListener?.('change', handler);
    };
  }, [breakpoint]);

  return isMobile;
}
