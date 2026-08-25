import type { Mirror } from '../types';

/**
 * Müşteri ticket v1 (app/(app)/app/support/): sayfa + NewTicketForm.
 * Durum/kategori etiketleri BURADA değil — `support-labels.ts`te
 * (`notification-looks.ts`/`activity-looks.ts` ile aynı kalıp, dosya
 * kendi başına yaşar). Panel içi yazışma YOK — yanıt e-postayla döner,
 * `page.subheading` bunu açıkça söyler (spec 2026-08-24).
 */

const en = {
  pageTitle: 'Support — Mailmyra',
  page: {
    heading: 'Support',
    subheading: 'Replies arrive by email — this page tracks case status.',
    noWorkspaceTitle: 'No workspace yet',
    noWorkspaceBody: 'Join or create a workspace to open a support case.',
    openCaseTitle: 'Open a support case',
    yourCasesTitle: 'Your cases',
    table: {
      colReference: 'Reference',
      colSubject: 'Subject',
      colCategory: 'Category',
      colStatus: 'Status',
      colOpened: 'Opened',
    },
    emptyCases: 'No support cases yet.',
  },
  form: {
    subjectLabel: 'Subject',
    categoryLabel: 'Category',
    messageLabel: 'Message',
    submit: 'Open case',
    openedToast: (reference: string) => `Case ${reference} opened. We'll reply by email.`,
    errors: {
      generic: 'Could not open the case — check the fields and try again.',
      network: 'Something went wrong — try again.',
    },
  },
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'Destek — Mailmyra',
  page: {
    heading: 'Destek',
    subheading: 'Yanıtlar e-postayla gelir — bu sayfa talebinin durumunu gösterir.',
    noWorkspaceTitle: 'Henüz çalışma alanı yok',
    noWorkspaceBody: 'Destek talebi açmak için bir çalışma alanına katıl ya da oluştur.',
    openCaseTitle: 'Destek talebi aç',
    yourCasesTitle: 'Taleplerin',
    table: {
      colReference: 'Referans',
      colSubject: 'Konu',
      colCategory: 'Kategori',
      colStatus: 'Durum',
      colOpened: 'Açıldı',
    },
    emptyCases: 'Henüz destek talebi yok.',
  },
  form: {
    subjectLabel: 'Konu',
    categoryLabel: 'Kategori',
    messageLabel: 'Mesaj',
    submit: 'Talep aç',
    openedToast: (reference: string) =>
      `${reference} numaralı talep açıldı. Yanıt e-postayla gelecek.`,
    errors: {
      generic: 'Talep açılamadı — alanları kontrol et ve tekrar dene.',
      network: 'Bir şeyler ters gitti — tekrar dene.',
    },
  },
};

export const support = { en, tr } as const;
