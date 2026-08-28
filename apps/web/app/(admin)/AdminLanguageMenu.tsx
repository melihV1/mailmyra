'use client';

import { useRouter } from 'next/navigation';

import { useLang } from '../../lib/i18n/LangProvider';
import { setLangCookie } from '../../lib/i18n/cookie';
import { LANGS, type Lang } from '../../lib/i18n/types';
import { useDropdown } from '../(app)/navbar/useDropdown';

/** Dil adı KENDİ dilinde yazılır — evrensel menü kuralı, çevrilmez. */
const LABELS: Record<Lang, string> = { en: 'English', tr: 'Türkçe' };

/**
 * Personel navbar'ının dil seçici — `(app)/navbar/LanguageMenu`in admin
 * sürümü (spec §1, 2026-08-27): aynı `mm-lang` çerezi (paylaşımlı, cihaz
 * başına) + `router.refresh()`. Buton sınıfları admin navbar'ının diğer
 * ikon düğmeleriyle (ThemeMenu, WorkspaceSwitcher, AdminNotifications)
 * birebir aynı — yeni bir görsel dil icat edilmedi.
 */
export function AdminLanguageMenu() {
  const router = useRouter();
  const lang = useLang();
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  const pick = (next: Lang) => {
    setOpen(false);
    if (next === lang) return;
    setLangCookie(next);
    router.refresh();
  };

  return (
    <li className="nav-item dropdown me-2 me-xl-0" ref={ref}>
      <button
        type="button"
        className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
        aria-label="Language"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-language icon-22px text-heading" aria-hidden="true" />
      </button>
      <ul className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}>
        {LANGS.map((l) => (
          <li key={l}>
            <button
              type="button"
              className={`dropdown-item${l === lang ? ' active' : ''}`}
              onClick={() => pick(l)}
            >
              {LABELS[l]}
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}
