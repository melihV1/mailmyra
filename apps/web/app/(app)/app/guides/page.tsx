import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { currentSession } from '../../../../lib/auth/current';
import { common } from '../../../../lib/i18n/dict/common';
import { guides as guidesDict } from '../../../../lib/i18n/dict/guides';
import { getLang } from '../../../../lib/i18n/lang.server';
import { GuidesClient } from './GuidesClient';

export async function generateMetadata() {
  return { title: guidesDict[await getLang()].pageTitle };
}

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

  const lang = await getLang();
  const t = guidesDict[lang];

  return (
    <section>
      <h4 className="mb-1">{t.page.heading}</h4>
      <p className="text-body-secondary mb-4">{t.page.subheading}</p>

      <Suspense
        fallback={<div className="card"><div className="card-body">{common[lang].loading}</div></div>}
      >
        <GuidesClient />
      </Suspense>
    </section>
  );
}
