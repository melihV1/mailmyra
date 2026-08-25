import type { Mirror } from '../types';

/** Panel genel bakış (app/(app)/app/page.tsx) + charts/ metinleri. */

const en = {
  pageTitle: 'Dashboard — Mailmyra',
  statusBadge: {
    draft: 'Draft',
    active: 'Live',
    inactive: 'Inactive',
  },
  brandFields: {
    templateId: 'Template',
    brandColor: 'Brand color',
    textColor: 'Text color',
    mutedColor: 'Muted color',
    fontFamily: 'Font',
    logoUrl: 'Logo',
    cta: 'CTA button',
    disclaimer: 'Disclaimer',
  },
  steps: {
    verifyEmail: { label: 'Verify your email', note: 'Unlocks exporting' },
    createSignature: { label: 'Create a signature', note: 'Design in the builder' },
    addSender: { label: 'Add a sender', note: 'Drafts are free' },
    assignSignature: { label: 'Assign a signature', note: 'Connect person and design' },
    publishSender: { label: 'Publish a sender', note: 'Uses a seat, enables export' },
  },
  actions: {
    builder: 'Builder',
    addSender: 'Add sender',
    importCsv: 'Import CSV',
    brand: 'Brand',
    members: 'Members',
    exportZip: 'Export zip',
  },
  stats: {
    seatsUsed: 'Seats used',
    seatsFullNote: 'All seats in use — deactivate a sender or contact us.',
    seatsOkNote: 'A seat is used only when a sender is live.',
    liveSenders: { label: 'Live senders', note: 'Using a seat right now' },
    draftSenders: { label: 'Draft senders', note: 'Free — no seat used' },
    signatures: { label: 'Signatures', note: 'In this workspace' },
  },
  welcome: {
    title: 'Welcome back 👋',
    note: (activeSenders: number, signatureCount: number) =>
      `${activeSenders} live sender${activeSenders === 1 ? '' : 's'} · ${signatureCount} signature${signatureCount === 1 ? '' : 's'} in your workspace.`,
    openBuilder: 'Open builder',
  },
  seatsCard: {
    title: 'Seats',
    subtitle: 'Used vs. available',
    inUse: 'In use',
    available: 'Available',
    centerLabel: 'Seats',
  },
  weeklyCard: {
    title: 'Weekly activity',
    subtitle: 'Signature edits, last 7 days',
    seriesName: 'Edits',
  },
  gettingStarted: {
    title: 'Getting started',
    allDone: 'All set — your workspace is fully up and running.',
    progress: (done: number, total: number) => `${done} of ${total} steps done`,
    start: 'Start',
  },
  quickActions: { title: 'Quick actions', subtitle: 'Jump right in' },
  recentSignatures: {
    title: 'Recent signatures',
    viewAll: 'View all',
    empty: 'No signatures yet.',
    openBuilder: 'Open builder',
    colSignature: 'Signature',
    colAssignedTo: 'Assigned to',
    colStatus: 'Status',
    colUpdated: 'Updated',
    notAssigned: 'Not assigned',
    unassigned: 'Unassigned',
  },
  senders: {
    title: 'Senders',
    viewAll: 'View all',
    empty: 'No senders yet — drafts are free.',
  },
  activity: {
    title: 'Activity',
    empty: 'Nothing yet — publishes, invitations and seat warnings will show up here.',
  },
  brandCard: {
    title: 'Brand',
    manage: 'Manage',
    locked: (count: number) => `${count} locked`,
    default: (count: number) => `${count} default`,
    notManaged: (count: number) => `${count} not managed`,
    lockedBadge: 'Locked',
    defaultBadge: 'Default',
  },
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'Panel — Mailmyra',
  statusBadge: {
    draft: 'Taslak',
    active: 'Yayında',
    inactive: 'Pasif',
  },
  brandFields: {
    templateId: 'Şablon',
    brandColor: 'Marka rengi',
    textColor: 'Metin rengi',
    mutedColor: 'Soluk renk',
    fontFamily: 'Yazı tipi',
    logoUrl: 'Logo',
    cta: 'CTA butonu',
    disclaimer: 'Yasal metin',
  },
  steps: {
    verifyEmail: { label: 'E-postanı doğrula', note: 'Dışa aktarımın kilidini açar' },
    createSignature: { label: 'Bir imza oluştur', note: "Builder'da tasarla" },
    addSender: { label: 'Bir gönderici ekle', note: 'Taslaklar ücretsizdir' },
    assignSignature: { label: 'Bir imza ata', note: 'Kişiyi ve tasarımı eşleştir' },
    publishSender: { label: 'Bir göndericiyi yayına al', note: 'Bir koltuk kullanır, dışa aktarımı açar' },
  },
  actions: {
    builder: 'Builder',
    addSender: 'Gönderici ekle',
    importCsv: 'CSV içe aktar',
    brand: 'Marka',
    members: 'Üyeler',
    exportZip: 'Zip dışa aktar',
  },
  stats: {
    seatsUsed: 'Kullanılan koltuklar',
    seatsFullNote: 'Tüm koltuklar dolu — bir göndericiyi pasifleştir ya da bize ulaş.',
    seatsOkNote: 'Bir koltuk yalnızca gönderici yayındayken kullanılır.',
    liveSenders: { label: 'Yayındaki göndericiler', note: 'Şu anda koltuk kullanıyor' },
    draftSenders: { label: 'Taslak göndericiler', note: 'Ücretsiz — koltuk kullanılmaz' },
    signatures: { label: 'İmzalar', note: 'Bu çalışma alanında' },
  },
  welcome: {
    title: 'Tekrar hoş geldin 👋',
    note: (activeSenders: number, signatureCount: number) =>
      `${activeSenders} yayında gönderici · ${signatureCount} imza çalışma alanında.`,
    openBuilder: "Builder'ı aç",
  },
  seatsCard: {
    title: 'Koltuklar',
    subtitle: 'Kullanılan / uygun',
    inUse: 'Kullanımda',
    available: 'Uygun',
    centerLabel: 'Koltuklar',
  },
  weeklyCard: {
    title: 'Haftalık aktivite',
    subtitle: 'İmza düzenlemeleri, son 7 gün',
    seriesName: 'Düzenleme',
  },
  gettingStarted: {
    title: 'Başlarken',
    allDone: 'Her şey hazır — çalışma alanın tam çalışır durumda.',
    progress: (done: number, total: number) => `${done}/${total} adım tamamlandı`,
    start: 'Başla',
  },
  quickActions: { title: 'Hızlı işlemler', subtitle: 'Hemen başla' },
  recentSignatures: {
    title: 'Son imzalar',
    viewAll: 'Tümünü gör',
    empty: 'Henüz imza yok.',
    openBuilder: "Builder'ı aç",
    colSignature: 'İmza',
    colAssignedTo: 'Atandığı kişi',
    colStatus: 'Durum',
    colUpdated: 'Güncellendi',
    notAssigned: 'Atanmadı',
    unassigned: 'Atanmamış',
  },
  senders: {
    title: 'Göndericiler',
    viewAll: 'Tümünü gör',
    empty: 'Henüz gönderici yok — taslaklar ücretsizdir.',
  },
  activity: {
    title: 'Aktivite',
    empty: 'Henüz bir şey yok — yayına almalar, davetler ve koltuk uyarıları burada görünecek.',
  },
  brandCard: {
    title: 'Marka',
    manage: 'Yönet',
    locked: (count: number) => `${count} kilitli`,
    default: (count: number) => `${count} varsayılan`,
    notManaged: (count: number) => `${count} yönetilmiyor`,
    lockedBadge: 'Kilitli',
    defaultBadge: 'Varsayılan',
  },
};

export const dashboard = { en, tr } as const;
