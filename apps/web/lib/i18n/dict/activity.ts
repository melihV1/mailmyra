import type { Mirror } from '../types';

/**
 * Aktivite ekranı (app/(app)/app/activity/page.tsx) KABUĞU: başlık, üst
 * bilgi, tablo başlıkları, boş durumlar. Olay İÇERİĞİ (satır başlığı/gövdesi)
 * ve filtre etiketleri burada DEĞİL — `app/(app)/activity-looks.ts`
 * (`ACTIVITY_LOOKS`, `activityFilters`, Task 6) sözleşmesi.
 */

const en = {
  pageTitle: 'Activity — Mailmyra',
  heading: 'Activity',
  guard: {
    title: 'Owners and admins only',
    body: 'The activity log shows who changed what across the workspace.',
  },
  subtitle:
    'Who changed what in this workspace. Kept for the record — it cannot be edited or silenced.',
  recentEvents: 'Recent events',
  colEvent: 'Event',
  colDetails: 'Details',
  colWho: 'Who',
  colWhen: 'When',
  emptyFiltered: 'No events of this kind yet.',
  emptyAll: 'Nothing recorded yet — publishes, exports and member changes will show up here.',
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'Aktivite — Mailmyra',
  heading: 'Aktivite',
  guard: {
    title: 'Yalnızca sahipler ve yöneticiler',
    body: 'Aktivite günlüğü, çalışma alanında kimin ne değiştirdiğini gösterir.',
  },
  subtitle:
    'Bu çalışma alanında kimin ne değiştirdiği. Kayıt için tutulur — düzenlenemez ya da susturulamaz.',
  recentEvents: 'Son olaylar',
  colEvent: 'Olay',
  colDetails: 'Ayrıntılar',
  colWho: 'Kim',
  colWhen: 'Ne zaman',
  emptyFiltered: 'Bu türde henüz olay yok.',
  emptyAll:
    'Henüz bir şey kaydedilmedi — yayına almalar, dışa aktarımlar ve üye değişiklikleri burada görünecek.',
};

export const activity = { en, tr } as const;
