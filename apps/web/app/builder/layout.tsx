import type { ReactNode } from 'react';

import '../(app)/panel-overrides.css';

/**
 * Builder kabuğu — Vuexy (karar 2026-08-17, Hüseyin onayı). Builder halka
 * açık ama "uygulama"dır: kullanıcı panelden `Open builder` ile gelir, iki
 * ayrı tasarım dili arasında zıplamamalı. Bu, CLAUDE.md'deki Bootstrap
 * yasağının panel istisnasını buraya genişletir.
 *
 * Panelin `(app)/layout.tsx`iyle AYNI yalıtım: tema CSS'i `<link>`le gelir,
 * bundle'a girmez; bütün Vuexy sınıfları `.mm-panel` sarmalayıcısında yaşar
 * (core.css'te `html.` önekli seçici yok, ölçüldü). İmza önizlemesi zaten
 * iframe'in içinde — tema kuralları oraya sızamaz.
 *
 * Panel gibi tema anahtarı YOK: builder'ın kendi navbar'ı olmadığı için
 * kullanıcı koyu moda geçiremez; önizlemenin Light/Dark düğmeleri
 * imzanın zeminini değiştirir, arayüzün temasını değil.
 */
export default function BuilderLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <link rel="stylesheet" href="/vuexy/icons.css" />
      <div className="mm-panel" data-skin="default" data-bs-theme="light">
        {children}
      </div>
    </>
  );
}
