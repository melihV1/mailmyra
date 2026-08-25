import type { Mirror } from '../types';

/**
 * İmzalar ekranı (app/(app)/app/signatures/): sayfa, SignatureTable,
 * RowActions (Rename/Preview dahil), AssignSelect, NewSignatureButton,
 * PreviewDialog. Ortak "Cancel/Delete/Edit/Close" metinleri `common`'dan
 * gelir — burada YALNIZ birebir eşleşenler onu kullanır, ifade farklıysa
 * (ör. "Export failed — try again." ≠ "Failed — try again.") kendi anahtarı
 * kalır (EN UX bire bir korunmalı).
 */

const en = {
  pageTitle: 'Signatures — Mailmyra',
  heading: 'Signatures',
  statusBadge: {
    draft: 'Draft',
    active: 'Live',
    inactive: 'Inactive',
  },
  emptyState: {
    title: 'No signatures yet',
    body: 'Build your first signature in a few minutes — pick a template, fill in your details, watch the live preview.',
  },
  table: {
    allSignatures: 'All signatures',
    ofPrefix: 'of ',
    selectedCount: (n: number) => `${n} selected`,
    deleteSelected: 'Delete selected',
    searchPlaceholder: 'Search signatures',
    searchAria: 'Search signatures by name or template',
    filterAssignmentAria: 'Filter by assignment',
    allAssignments: 'All assignments',
    assigned: 'Assigned',
    unassigned: 'Unassigned',
    filterTemplateAria: 'Filter by template',
    allTemplates: 'All templates',
    sortAria: 'Sort signatures',
    sortRecent: 'Recently updated',
    sortOldest: 'Oldest first',
    sortName: 'Name A–Z',
    deleteFailedError: (n: number) =>
      `${n} signature${n === 1 ? '' : 's'} could not be deleted — reload the page and try again.`,
    noMatchTitle: 'No signatures match these filters',
    noMatchBody: 'Try a different search, or widen the assignment and template filters.',
    clearFilters: 'Clear filters',
    selectAllMatchingAria: 'Select all matching signatures',
    selectAllAria: 'Select all',
    colSignature: 'Signature',
    colAssignedTo: 'Assigned to',
    colStatus: 'Status',
    colUpdated: 'Updated',
    colActions: 'Actions',
    selectRowAria: (name: string) => `Select ${name}`,
    unassignedBadge: 'Unassigned',
    deletedToast: (n: number) =>
      `Deleted ${n} signature${n === 1 ? '' : 's'}. Uploaded images stay on the CDN.`,
    deleteConfirmTitle: (n: number) => `Delete ${n} signature${n === 1 ? '' : 's'}?`,
    deleteConfirmBody:
      'Uploaded images stay on the CDN, so copies of these signatures already in use keep working. The signatures themselves cannot be recovered.',
    andMore: (n: number) => `and ${n} more`,
    deleting: 'Deleting…',
  },
  newButton: {
    creating: 'Creating…',
    label: 'New signature',
    failedError: 'Could not create — try again.',
    untitledName: 'Untitled signature',
  },
  rowActions: {
    actionsAria: (name: string) => `Actions for ${name}`,
    preview: 'Preview',
    editInBuilder: 'Edit in builder',
    rename: 'Rename',
    duplicate: 'Duplicate',
    howToInstall: 'How to install',
    duplicatedToast: (name: string) => `Duplicated “${name}”.`,
    deletedToast: (name: string) => `Deleted “${name}”. Uploaded images stay on the CDN.`,
    deleteConfirmTitle: (name: string) => `Delete “${name}”?`,
    deleteConfirmBody:
      'Uploaded images stay on the CDN, so copies of this signature already in use keep working. The signature itself cannot be recovered.',
  },
  renameDialog: {
    ariaLabel: (name: string) => `Rename ${name}`,
    title: 'Rename signature',
    note: 'The name is only for your team — it never shows in the signature.',
    nameLabel: 'Name',
    emptyError: 'Enter a name.',
    genericError: 'Could not rename. Please try again.',
    renamedToast: (name: string) => `Renamed to “${name}”.`,
    rename: 'Rename',
  },
  assignSelect: {
    ariaLabel: 'Assign to sender',
    unassignedOption: 'Unassigned',
    removedToast: 'Assignment removed.',
    assignedToast: 'Signature assigned.',
    failedError: 'Could not assign.',
  },
  previewDialog: {
    renderFailedError:
      'This signature uses a template we can no longer render. Open it in the builder and pick a template.',
    genericError: 'Could not load the preview. Please try again.',
    ariaLabel: (name: string) => `Preview ${name}`,
    rendering: 'Rendering…',
    brandNote:
      'Brand settings are applied here exactly as they are on export — this is what the downloaded file contains.',
    editInBuilder: 'Edit in builder',
    iframeTitle: (name: string) => `Preview of ${name}`,
  },
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'İmzalar — Mailmyra',
  heading: 'İmzalar',
  statusBadge: {
    draft: 'Taslak',
    active: 'Yayında',
    inactive: 'Pasif',
  },
  emptyState: {
    title: 'Henüz imza yok',
    body: 'İlk imzanı birkaç dakikada oluştur — bir şablon seç, bilgilerini gir, canlı önizlemeyi izle.',
  },
  table: {
    allSignatures: 'Tüm imzalar',
    ofPrefix: '/ ',
    selectedCount: (n: number) => `${n} seçildi`,
    deleteSelected: 'Seçilenleri sil',
    searchPlaceholder: 'İmza ara',
    searchAria: 'Ad veya şablona göre imza ara',
    filterAssignmentAria: 'Atamaya göre süz',
    allAssignments: 'Tüm atamalar',
    assigned: 'Atanmış',
    unassigned: 'Atanmamış',
    filterTemplateAria: 'Şablona göre süz',
    allTemplates: 'Tüm şablonlar',
    sortAria: 'İmzaları sırala',
    sortRecent: 'Son güncellenen',
    sortOldest: 'En eski',
    sortName: 'Ada göre A–Z',
    deleteFailedError: (n: number) =>
      `${n} imza silinemedi — sayfayı yenile ve tekrar dene.`,
    noMatchTitle: 'Bu süzgeçlere uyan imza yok',
    noMatchBody: 'Farklı bir arama dene ya da atama ve şablon süzgeçlerini genişlet.',
    clearFilters: 'Süzgeçleri temizle',
    selectAllMatchingAria: 'Eşleşen tüm imzaları seç',
    selectAllAria: 'Tümünü seç',
    colSignature: 'İmza',
    colAssignedTo: 'Atandığı kişi',
    colStatus: 'Durum',
    colUpdated: 'Güncellendi',
    colActions: 'İşlemler',
    selectRowAria: (name: string) => `${name} imzasını seç`,
    unassignedBadge: 'Atanmamış',
    deletedToast: (n: number) => `${n} imza silindi. Yüklenen görseller CDN'de kalır.`,
    deleteConfirmTitle: (n: number) => `${n} imza silinsin mi?`,
    deleteConfirmBody:
      "Yüklenen görseller CDN'de kalır, bu yüzden bu imzaların kullanımdaki kopyaları çalışmaya devam eder. İmzaların kendisi geri getirilemez.",
    andMore: (n: number) => `ve ${n} tane daha`,
    deleting: 'Siliniyor…',
  },
  newButton: {
    creating: 'Oluşturuluyor…',
    label: 'Yeni imza',
    failedError: 'Oluşturulamadı — tekrar dene.',
    untitledName: 'İsimsiz imza',
  },
  rowActions: {
    actionsAria: (name: string) => `${name} için işlemler`,
    preview: 'Önizle',
    editInBuilder: "Builder'da düzenle",
    rename: 'Yeniden adlandır',
    duplicate: 'Çoğalt',
    howToInstall: 'Nasıl kurulur',
    duplicatedToast: (name: string) => `“${name}” çoğaltıldı.`,
    deletedToast: (name: string) => `“${name}” silindi. Yüklenen görseller CDN'de kalır.`,
    deleteConfirmTitle: (name: string) => `“${name}” silinsin mi?`,
    deleteConfirmBody:
      "Yüklenen görseller CDN'de kalır, bu yüzden bu imzanın kullanımdaki kopyaları çalışmaya devam eder. İmzanın kendisi geri getirilemez.",
  },
  renameDialog: {
    ariaLabel: (name: string) => `${name} yeniden adlandır`,
    title: 'İmzayı yeniden adlandır',
    note: 'Bu ad yalnızca takımın için — imzada hiç görünmez.',
    nameLabel: 'Ad',
    emptyError: 'Bir ad gir.',
    genericError: 'Yeniden adlandırılamadı. Lütfen tekrar dene.',
    renamedToast: (name: string) => `“${name}” olarak yeniden adlandırıldı.`,
    rename: 'Yeniden adlandır',
  },
  assignSelect: {
    ariaLabel: 'Göndericiye ata',
    unassignedOption: 'Atanmamış',
    removedToast: 'Atama kaldırıldı.',
    assignedToast: 'İmza atandı.',
    failedError: 'Atanamadı.',
  },
  previewDialog: {
    renderFailedError:
      'Bu imza artık render edemediğimiz bir şablon kullanıyor. Builder\'da aç ve bir şablon seç.',
    genericError: 'Önizleme yüklenemedi. Lütfen tekrar dene.',
    ariaLabel: (name: string) => `${name} önizleme`,
    rendering: 'Render ediliyor…',
    brandNote:
      'Marka ayarları burada tam olarak export\'takiyle aynı şekilde uygulanır — indirilen dosya bunu içerir.',
    editInBuilder: "Builder'da düzenle",
    iframeTitle: (name: string) => `${name} önizlemesi`,
  },
};

export const signatures = { en, tr } as const;
