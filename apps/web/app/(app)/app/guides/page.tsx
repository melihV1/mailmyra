import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { currentSession } from '../../../../lib/auth/current';
import { GuidesClient } from './GuidesClient';

export const metadata = { title: 'Setup guides — Mailmyra' };

/**
 * E-posta istemcisi kurulum rehberleri (CLAUDE.md §Test matrisi'ndeki 6
 * istemci). Sayfa veri çekmez — içerik `guides.data.ts` içinde sabit; asıl
 * iş sekme durumunda, o yüzden gövde istemci bileşeni.
 *
 * `useSearchParams()` bir Suspense sınırı ister (aksi hâlde `next build`
 * prerender uyarısı verir); sınır burada, sunucu tarafında kuruluyor.
 */
export default async function GuidesPage() {
  // Layout korumasına GÜVENME — paralel render (bkz. diğer panel sayfaları).
  const session = await currentSession();
  if (!session) redirect('/login?next=/app/guides');

  return (
    <section>
      <h4 className="mb-1">Setup guides</h4>
      <p className="text-body-secondary mb-4">
        How a finished signature gets installed in each mail client we test against.
      </p>

      <Suspense fallback={<div className="card"><div className="card-body">Loading…</div></div>}>
        <GuidesClient />
      </Suspense>
    </section>
  );
}
