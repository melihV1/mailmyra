import type { Lang } from './types';

/**
 * Accept-Language'tan panel dili. Yalnız tr/en tanınır; en yüksek q
 * kazanır, eşitlikte listede önce gelen. Boş/bozuk başlık → en.
 * SAF fonksiyon — Next başlık API'sine dokunmaz, birim testte koşar.
 */
export function preferredLang(acceptLanguage: string): Lang {
  let best: { lang: Lang; q: number } | null = null;
  for (const part of acceptLanguage.split(',')) {
    const [tagRaw, ...params] = part.trim().split(';');
    const tag = (tagRaw ?? '').trim().toLowerCase();
    let lang: Lang | null = null;
    if (tag === 'tr' || tag.startsWith('tr-')) lang = 'tr';
    else if (tag === 'en' || tag.startsWith('en-')) lang = 'en';
    if (!lang) continue;

    let q = 1;
    let rejected = false;
    for (const param of params) {
      const [key, value] = param.trim().split('=');
      if (key === 'q' && value !== undefined) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) {
          // RFC 9110 §12.4.2: q=0 (veya altı) "kabul edilemez" demektir —
          // sayı olarak en düşük olsa da aday listeye girmez, tamamen elenir.
          if (parsed <= 0) {
            rejected = true;
            break;
          }
          q = parsed;
        }
      }
    }
    if (rejected) continue;
    if (!best || q > best.q) best = { lang, q };
  }
  return best?.lang ?? 'en';
}
