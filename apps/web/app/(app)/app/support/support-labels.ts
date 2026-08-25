import type { Lang, Mirror } from '../../../../lib/i18n/types';
import type { CustomerCaseCategory, CustomerCaseStatus } from '../../../../lib/repo/support';

/**
 * Ticket v1 etiketleri. Durumun MÜŞTERİ dili dürüst ama iç jargonsuz:
 * `escalated` müşteriye "In progress"/"İşlemde" — vaka işleniyor gerçeği
 * söylenir, iç eskalasyon mutfağı anlatılmaz (spec §2.4).
 *
 * Dil-farkında (Task 7, Dalga B): `TICKET_CATEGORIES(lang)` +
 * `CASE_STATUS_LOOKS[lang]` — `notification-looks.ts`/`activity-looks.ts`
 * ile aynı kalıp, metinler burada kendi başına yaşar, ayrı bir dict
 * modülüne devredilmez. `en` gövdeleri BİREBİR korunur; durum tablosu
 * `Mirror<typeof en>` ile aynı iskeleti zorunlu kılar.
 *
 * Savunmacı okuma (Dalga A review bulgusu): `SupportCase.status`
 * veritabanında serbest `VARCHAR`dır (Prisma şeması, gerçek enum değil) —
 * `lib/repo/support.ts` onu `as CustomerCaseStatus` ile cast eder. TS
 * derlemede güvenli görünür ama çalışma zamanında personel panelinden
 * (ya da ileride eklenecek bir durumdan) gelen beklenmedik bir değer bu
 * tabloda YOK olabilir. `statusLook()` bu yüzden `CASE_STATUS_LOOKS[lang]`e
 * doğrudan indekslemek yerine kullanılır: bulunamayan durumu çökertmek
 * yerine ham adıyla, `secondary` tonda gösterir — sayfa asla 500 olmaz.
 */

type CategoryLook = { value: CustomerCaseCategory; label: string };
type StatusLook = { label: string; tone: string };

const categoriesEn: ReadonlyArray<CategoryLook> = [
  { value: 'billing', label: 'Billing' },
  { value: 'builder', label: 'Builder' },
  { value: 'export', label: 'Export' },
  { value: 'access', label: 'Access' },
  { value: 'account', label: 'Account' },
];

const categoriesTr: ReadonlyArray<CategoryLook> = [
  { value: 'billing', label: 'Faturalama' },
  { value: 'builder', label: 'Builder' },
  { value: 'export', label: 'Dışa aktarım' },
  { value: 'access', label: 'Erişim' },
  { value: 'account', label: 'Hesap' },
];

const CATEGORIES: Record<Lang, ReadonlyArray<CategoryLook>> = {
  en: categoriesEn,
  tr: categoriesTr,
};

export function TICKET_CATEGORIES(lang: Lang): ReadonlyArray<CategoryLook> {
  return CATEGORIES[lang];
}

const statusEn: Record<CustomerCaseStatus, StatusLook> = {
  open: { label: 'Open', tone: 'info' },
  waiting_customer: { label: 'Awaiting your reply', tone: 'warning' },
  escalated: { label: 'In progress', tone: 'primary' },
  resolved: { label: 'Resolved', tone: 'success' },
};

const statusTr: Mirror<typeof statusEn> = {
  open: { label: 'Açık', tone: 'info' },
  waiting_customer: { label: 'Cevabınız bekleniyor', tone: 'warning' },
  escalated: { label: 'İşlemde', tone: 'primary' },
  resolved: { label: 'Çözüldü', tone: 'success' },
};

export const CASE_STATUS_LOOKS: Record<Lang, Record<CustomerCaseStatus, StatusLook>> = {
  en: statusEn,
  tr: statusTr,
};

/**
 * Savunmacı okuma — bkz. üstteki not. `status` parametresi tipte
 * `CustomerCaseStatus` olsa da çalışma zamanında tablo dışı bir değer
 * gelebilir; `as Record<string, ...>` yalnız bu erişim için tabloyu
 * gevşetir, `CASE_STATUS_LOOKS`in derleme-zamanı eksiksizlik garantisini
 * bozmaz.
 */
export function statusLook(lang: Lang, status: CustomerCaseStatus): StatusLook {
  const table = CASE_STATUS_LOOKS[lang] as Record<string, StatusLook>;
  return table[status] ?? { label: status, tone: 'secondary' };
}
