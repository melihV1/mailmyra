import type { Lang } from './types';

const DATE_LOCALE: Record<Lang, string> = { en: 'en-GB', tr: 'tr-TR' };

/** Panel genelinde kısa tarih: "24 Aug 2026" / "24 Ağu 2026". */
export function formatDate(lang: Lang, date: Date): string {
  return date.toLocaleDateString(DATE_LOCALE[lang], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
