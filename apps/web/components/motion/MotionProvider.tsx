'use client';

import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Karar D1 (step1-manifesto.md) — Lenis YOK, yalnız Framer Motion.
 * `LazyMotion` + `domAnimation` ile animasyon motoru ayrı bir chunk olarak
 * lazy-load edilir (tam `framer-motion` paketi ilk yüklemede gitmez);
 * ağaçta yalnız `m.*` bileşenleri kullanılabilir (`strict`), `motion.*`
 * kullanımı derleme zamanında hata verir — bilerek disiplin.
 *
 * `MotionConfig reducedMotion="user"`: `prefers-reduced-motion: reduce`
 * açıkken TÜM `m.*`/`AnimatePresence` geçişlerini otomatik olarak anlık
 * hale getirir (süre 0) — görsel sonuç (panel açık/kapalı durumu) korunur,
 * yalnız hareket kaybolur. Bu, step1-manifesto.md §4'teki reduced-motion
 * sözleşmesini kod tarafında TEK yerden karşılar; ayrıca her bileşende
 * `@media (prefers-reduced-motion: no-preference)` ile CSS transition'ları
 * da aynı kurala uyar (bkz. components/nav, components/ui modülleri).
 *
 * Kök layout'ta sarmalanır (bkz. app/layout.tsx) — `domAnimation` chunk'ı
 * yalnız bir `m.*` bileşeni gerçekten render olunca indirilir, bu yüzden
 * builder/login gibi motion kullanmayan rotalarda ekstra ağırlık oluşmaz.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
