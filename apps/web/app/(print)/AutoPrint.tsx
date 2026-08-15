'use client';

import { useEffect } from 'react';

/** Temanın `app-invoice-print.js`i: sayfa açılınca yazdırma diyaloğu. */
export function AutoPrint() {
  useEffect(() => {
    window.print();
  }, []);
  return null;
}
