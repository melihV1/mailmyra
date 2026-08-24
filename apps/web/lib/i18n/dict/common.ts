import type { Mirror } from '../types';

const en = {
  cancel: 'Cancel',
  save: 'Save',
  close: 'Close',
  delete: 'Delete',
  edit: 'Edit',
  loading: 'Loading…',
  failedTryAgain: 'Failed — try again.',
} as const;

const tr: Mirror<typeof en> = {
  cancel: 'Vazgeç',
  save: 'Kaydet',
  close: 'Kapat',
  delete: 'Sil',
  edit: 'Düzenle',
  loading: 'Yükleniyor…',
  failedTryAgain: 'Olmadı — tekrar dene.',
};

export const common = { en, tr } as const;
