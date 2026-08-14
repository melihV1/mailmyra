'use client';

import { useLayoutEffect, useState } from 'react';

/**
 * Bootstrap'ın giriş/çıkış geçişlerinin React karşılığı. Tema (Bootstrap)
 * bir elemanı gösterirken önce `show`SUZ ekler, reflow'la ilk stili
 * hesaplatır, sonra `show` basar — geçiş ancak böyle tetiklenir. React'te
 * eleman doğrudan `show` ile mount edilirse modal/offcanvas/toast geçişleri
 * hiç oynamaz (panelde yaşandı). Kapanışta da tersi: önce `show` düşer,
 * geçiş bitince eleman DOM'dan kalkar.
 *
 * Kullanım: `mounted` render kapısı, `shown` ise `show` sınıfının anahtarı.
 */
export function useBsPresence(open: boolean, exitMs = 300): { mounted: boolean; shown: boolean } {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useLayoutEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(t);
  }, [open, exitMs]);

  useLayoutEffect(() => {
    if (!open || !mounted || shown) return;
    // Bootstrap'ın reflow numarası: `show`suz kare boyanmadan önce stil
    // hesaplansın ki sınıf değişimi geçiş olarak algılansın.
    void document.body.offsetHeight;
    setShown(true);
  }, [open, mounted, shown]);

  return { mounted, shown };
}
