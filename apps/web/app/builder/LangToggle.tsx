'use client';

import { useRouter } from 'next/navigation';

import { useLang } from '../../lib/i18n/LangProvider';
import { setLangCookie } from '../../lib/i18n/cookie';
import type { Lang } from '../../lib/i18n/types';

/**
 * Builder'ın navbar'ı yok — başlık hizasında iki harfli sade seçim
 * (spec §2; Hüseyin bayrak 2). Panel LanguageMenu'suyla aynı çerez.
 */
export function LangToggle() {
  const router = useRouter();
  const lang = useLang();

  const pick = (next: Lang) => {
    if (next === lang) return;
    setLangCookie(next);
    router.refresh();
  };

  return (
    <div className="btn-group btn-group-sm" role="group" aria-label="Language">
      {(['en', 'tr'] as const).map((l) => (
        <button
          key={l}
          type="button"
          className={`btn ${l === lang ? 'btn-primary' : 'btn-label-secondary'}`}
          onClick={() => pick(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
