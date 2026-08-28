import type { Mirror } from '../types';

/**
 * Admin-geneli tekrar eden kelimeler — `common`daki (Cancel/Close/Save…)
 * müşteri paneliyle paylaşılan çekirdeğin ÜSTÜNE, personel paneline özgü
 * bir katman (spec 2026-08-27 §1). Başlangıç çekirdeği bilinen tekrarlarla
 * sınırlı; Task 3-12 süpürmeleri genişletir.
 */

const en = {
  reason: 'Reason',
  required: 'Required',
  staffCrumb: 'Staff',
  preview: 'Preview',
  live: 'Live',
  setup: 'Setup',
  never: 'Never',
  unassigned: 'Unassigned',
  notRecorded: 'Not recorded',
} as const;

const tr: Mirror<typeof en> = {
  reason: 'Sebep',
  required: 'Zorunlu',
  staffCrumb: 'Personel',
  preview: 'Önizleme',
  live: 'Canlı',
  setup: 'Kurulum',
  never: 'Hiç',
  unassigned: 'Atanmamış',
  notRecorded: 'Kayıt yok',
};

export const adminCommon = { en, tr } as const;
