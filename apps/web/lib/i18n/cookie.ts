import { LANG_COOKIE, type Lang } from './types';

/** Elle dil seçimi — 1 yıl, tüm site, Lax. Çağıran refresh'i kendisi yapar. */
export function setLangCookie(lang: Lang): void {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
}
