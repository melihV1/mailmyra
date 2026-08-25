'use client';

import { common } from '../../lib/i18n/dict/common';
import { useLang } from '../../lib/i18n/LangProvider';

/**
 * Sayfa yükleniyor göstergesi (karar 2026-08-17, Hüseyin: "login'den itibaren
 * sayfalara preloader"). Temanın kendi loader'ı: `spinner-border` core.css'te
 * zaten var — SpinKit (`.sk-*`) ayrı bir vendor dosyası ve recolor boru
 * hattında yok, tek bir spinner için oraya bağımlılık eklenmedi.
 *
 * Next'in `loading.tsx` sözleşmesiyle çalışır: rota geçişinde sunucu
 * bileşeni beklenirken KABUK (sidebar + navbar) ekranda kalır, yalnız içerik
 * alanı bunu gösterir — sayfa "boş beyaz"a düşmez.
 *
 * `label` varsayılanı dil-farkında (Task 7, ortak bileşen sweep): `(app)` VE
 * `(auth)` paylaşıyor, ama yalnız `(app)`te `LangProvider` var — `(auth)`ta
 * `useLang()` sessizce 'en'e düşer (kapsam dışı ekran, bilerek İngilizce
 * kalır). `common.loading` zaten aynı literal ('Loading…') — yeni sözlük
 * girdisi gerekmedi.
 */
export function PageLoader({ label }: { label?: string }) {
  const lang = useLang();
  const resolvedLabel = label ?? common[lang].loading;
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-center py-5"
      style={{ minHeight: '50vh' }}
      role="status"
      aria-live="polite"
    >
      <div
        className="spinner-border text-primary mb-3"
        style={{ width: '3rem', height: '3rem' }}
        aria-hidden="true"
      />
      <span className="text-body-secondary small">{resolvedLabel}</span>
    </div>
  );
}
