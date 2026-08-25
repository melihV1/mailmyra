import type { Mirror } from '../types';

/**
 * Göndericiler ekranı (app/(app)/app/senders/): sayfa, SenderTable,
 * AddSenderForm, EditSenderDialog, ImportCsv, SenderActions, `[id]` detayı
 * + SenderDetailActions. `actions` alt nesnesi SenderActions VE
 * SenderDetailActions arasında paylaşılır (metinler birebir aynı); yalnız
 * detayda ek bulunan metinler `detailActions`'ta. Ortak "Cancel"/"Delete"
 * metinleri `common`'dan gelir — burada tekrar tanımlanmaz. CSV BAŞLIK
 * adları (dosya biçimi) burada YOK — o `lib/csv.ts`'in sözleşmesi, çevrilmez.
 */

const en = {
  pageTitle: 'Senders — Mailmyra',
  detailPageTitle: 'Sender — Mailmyra',
  statusBadge: {
    draft: 'Draft',
    active: 'Live',
    inactive: 'Inactive',
  },
  page: {
    heading: 'Senders',
    seatsUsed: 'Seats used',
    seatsFullNote: 'All seats are in use — deactivate a sender or contact us for more.',
    liveSenders: { label: 'Live senders', note: 'Using a seat right now' },
    drafts: { label: 'Drafts', note: 'Free — no seat used' },
    inactiveStat: { label: 'Inactive', note: 'Seat freed, signature kept' },
    addSenderTitle: 'Add sender',
    addSenderSubtitle: 'Drafts are free — a seat is only used when you publish.',
    emptyTitle: 'No senders yet',
    emptyBody:
      'A sender is one person whose signature goes live. Drafts are free — a seat is only used when you publish.',
  },
  table: {
    allSenders: 'All senders',
    exportCsv: 'Export CSV',
    exportZip: 'Export zip',
    exportZipSelectedSuffix: (n: number) => ` (${n} selected)`,
    selectAllAria: 'Select all',
    selectRowAria: (name: string) => `Select ${name}`,
    colSender: 'Sender',
    colJobTitle: 'Job title',
    colSignatures: 'Signatures',
    colStatus: 'Status',
    colActions: 'Actions',
    exportDialogTitle: 'Export zip',
    preparing: 'Preparing…',
    download: 'Download',
    fileSummaryBold: (fileCount: number) =>
      `${fileCount} signature file${fileCount === 1 ? '' : 's'}`,
    fileSummaryTrail: (senderCount: number) =>
      ` will be generated (${senderCount} sender${senderCount === 1 ? '' : 's'}).`,
    skippedPrefix: 'Skipped: ',
    skipUnassigned: (n: number) => `${n} sender${n === 1 ? ' has' : 's have'} no assigned signature`,
    skipUnpublished: (n: number) => `${n} selected sender${n === 1 ? ' is' : 's are'} not live`,
    noneExportable:
      'No live senders with an assigned signature yet — assign a signature and publish first.',
    downloadedToast: (fileCount: number) =>
      `Zip downloaded — ${fileCount} signature file${fileCount === 1 ? '' : 's'}.`,
    errors: {
      too_many: 'Up to 200 senders per export — contact us for larger runs.',
      not_found: 'The list changed under you — reload the page and try again.',
      no_exportable: 'No live senders with an assigned signature yet.',
      forbidden: 'You do not have permission to export.',
      generic: 'Export failed — try again.',
    },
  },
  addForm: {
    namePlaceholder: 'Full name',
    nameAria: 'Full name',
    emailPlaceholder: 'email@company.com',
    emailAria: 'Email',
    jobTitlePlaceholder: 'Job title (optional)',
    jobTitleAria: 'Job title (optional)',
    adding: 'Adding…',
    submit: 'Add sender',
    addedToast: 'Sender added as a draft — no seat used yet.',
    errors: {
      email_taken:
        'This address is already a sender in your workspace. If they were deactivated, publish them again instead.',
      forbidden: 'Only owners and admins can add senders.',
      generic: 'Could not add — check the fields and try again.',
    },
  },
  editDialog: {
    ariaLabel: (name: string) => `Edit ${name}`,
    title: 'Edit sender',
    note: 'Signatures and assignments stay put — only the details change.',
    fullNameLabel: 'Full name',
    jobTitleLabel: 'Job title',
    jobTitlePlaceholder: 'Optional',
    emailLabel: 'E-mail',
    liveEmailNote: 'Live senders keep their address — deactivate first to change it.',
    validationError: 'Enter a name and a valid e-mail address.',
    savedToast: (name: string) => `Saved ${name}.`,
    save: 'Save changes',
    errors: {
      email_taken: 'Another sender in this workspace already uses this address.',
      email_locked: 'Live senders keep their address — deactivate first to change it.',
      forbidden: 'Only owners and admins can manage senders.',
      generic: 'Something went wrong. Please try again.',
    },
  },
  importCsv: {
    hide: 'Hide CSV import',
    show: 'Import from CSV',
    stepUpload: 'Upload file',
    stepMap: 'Map columns',
    stepPreview: 'Preview & import',
    fileLabel: 'CSV file',
    fileHint: 'Semicolon or comma separated — Turkish and English headers are recognized.',
    nameLabel: 'Full name',
    emailLabel: 'Email',
    jobTitleLabel: 'Job title (optional)',
    columnFallback: (n: number) => `Column ${n}`,
    moreRows: (n: number) => `…and ${n} more rows`,
    reason: {
      missing_name: 'name is missing',
      invalid_email: 'email does not look right',
      duplicate_in_file: 'duplicate of an earlier row',
    },
    summarySenderWord: (n: number) => ` sender${n === 1 ? '' : 's'} will be added — all as `,
    summaryDraftsWord: 'drafts',
    summaryTrail: ', using no seats.',
    skippedLead: (n: number) => `${n} row${n === 1 ? '' : 's'} will be skipped (`,
    lineReason: (line: number, reason: string) => `line ${line}: ${reason}`,
    importing: 'Importing…',
    importLabel: (n: number) => `Import ${n} sender${n === 1 ? '' : 's'}`,
    mapFirst: 'Map the name and email columns first.',
    failed: 'Import failed — try again.',
    importedToastTitle: 'CSV imported',
    importedToast: (created: number, skipped: number) =>
      `Added ${created} sender${created === 1 ? '' : 's'} as drafts` +
      (skipped > 0 ? ` — ${skipped} already existed and were skipped.` : '.'),
  },
  actions: {
    publish: 'Publish',
    deactivate: 'Deactivate',
    editAria: (name: string) => `Edit ${name}`,
    deleteAria: (name: string) => `Delete ${name}`,
    seatsFullTip: (entitled: number) => `All ${entitled} seats are in use.`,
    liveHoldsSeatTip: 'Live senders hold a seat — deactivate first.',
    publishedToast: (name: string) => `Published ${name} — a seat is now in use.`,
    deactivatedToast: (name: string) => `Deactivated ${name} — the seat is free again.`,
    deletedToast: (name: string) => `Deleted ${name}.`,
    publishConfirmTitle: (name: string) => `Publish ${name}?`,
    deactivateConfirmTitle: (name: string) => `Deactivate ${name}?`,
    deleteConfirmTitle: (name: string) => `Delete ${name}?`,
    seatNote: (active: number, entitled: number) =>
      `They become active, using ${active} of your ${entitled} seat${entitled === 1 ? '' : 's'}. Their signature can then be exported.`,
    deactivateBody:
      'Their seat is freed for someone else this period. Signatures already installed in mail clients keep working.',
    deleteBodyLead: 'Their signatures are ',
    deleteBodyKept: 'kept',
    deleteBodyTrail:
      ' (just unassigned) and uploaded images stay on the CDN. The sender identity itself cannot be recovered.',
    errors: {
      seat_limit: (entitled: number) =>
        `All ${entitled} seats are in use. Deactivate a sender or contact us for more.`,
      not_entitled: 'Your workspace cannot publish right now — contact us.',
      forbidden: 'Only owners and admins can manage senders.',
      generic: 'Something went wrong. Please try again.',
    },
  },
  detailActions: {
    editDetails: 'Edit details',
    downloadSignature: 'Download signature',
    onlyLiveExportableTip: 'Only live senders can be exported.',
    assignFirstTip: 'Assign a signature first.',
    setupGuides: 'Setup guides',
    deleteSender: 'Delete sender',
    exportFailed: 'Export failed — try again.',
    downloadedToast: (name: string, count: number) =>
      `Downloaded ${name}'s signature file${count === 1 ? '' : 's'}.`,
    errors: {
      is_live: 'Live senders cannot be deleted — deactivate first.',
    },
  },
  detailPage: {
    heading: 'Sender',
    detailsHeading: 'Details',
    emailLabel: 'Email:',
    jobTitleLabel: 'Job title:',
    addedLabel: 'Added:',
    firstPublishedLabel: 'First published:',
    lastExportedLabel: 'Last exported:',
    never: 'Never',
    actionsHeading: 'Actions',
    assignedSignatures: 'Assigned signatures',
    manage: 'Manage',
    emptySignatures:
      'No signature assigned yet — assign one from the Signatures screen so this sender can go live with it.',
    colSignature: 'Signature',
    colTemplate: 'Template',
    colUpdated: 'Updated',
    edit: 'Edit',
  },
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'Göndericiler — Mailmyra',
  detailPageTitle: 'Gönderici — Mailmyra',
  statusBadge: {
    draft: 'Taslak',
    active: 'Yayında',
    inactive: 'Pasif',
  },
  page: {
    heading: 'Göndericiler',
    seatsUsed: 'Kullanılan koltuklar',
    seatsFullNote: 'Tüm koltuklar dolu — bir göndericiyi pasifleştir ya da daha fazlası için bize ulaş.',
    liveSenders: { label: 'Yayındaki göndericiler', note: 'Şu anda bir koltuk kullanıyor' },
    drafts: { label: 'Taslaklar', note: 'Ücretsiz — koltuk kullanılmaz' },
    inactiveStat: { label: 'Pasif', note: 'Koltuk boşaldı, imza korunuyor' },
    addSenderTitle: 'Gönderici ekle',
    addSenderSubtitle: 'Taslaklar ücretsizdir — koltuk yalnızca yayına aldığında kullanılır.',
    emptyTitle: 'Henüz gönderici yok',
    emptyBody:
      'Bir gönderici, imzası yayında olan bir kişidir. Taslaklar ücretsizdir — koltuk yalnızca yayına aldığında kullanılır.',
  },
  table: {
    allSenders: 'Tüm göndericiler',
    exportCsv: "CSV dışa aktar",
    exportZip: 'Zip dışa aktar',
    exportZipSelectedSuffix: (n: number) => ` (${n} seçili)`,
    selectAllAria: 'Tümünü seç',
    selectRowAria: (name: string) => `${name} seç`,
    colSender: 'Gönderici',
    colJobTitle: 'Ünvan',
    colSignatures: 'İmzalar',
    colStatus: 'Durum',
    colActions: 'İşlemler',
    exportDialogTitle: 'Zip dışa aktar',
    preparing: 'Hazırlanıyor…',
    download: 'İndir',
    fileSummaryBold: (fileCount: number) => `${fileCount} imza dosyası`,
    fileSummaryTrail: (senderCount: number) =>
      ` üretilecek (${senderCount} gönderici).`,
    skippedPrefix: 'Atlanan: ',
    skipUnassigned: (n: number) => `${n} göndericinin ataması yok`,
    skipUnpublished: (n: number) => `${n} seçili gönderici yayında değil`,
    noneExportable:
      'Henüz atanmış imzası olan yayında bir gönderici yok — önce bir imza ata ve yayına al.',
    downloadedToast: (fileCount: number) =>
      `Zip indirildi — ${fileCount} imza dosyası.`,
    errors: {
      too_many: 'Dışa aktarımda en fazla 200 gönderici — daha büyük hacimler için bize ulaş.',
      not_found: 'Liste sen bakarken değişti — sayfayı yenile ve tekrar dene.',
      no_exportable: 'Henüz atanmış imzası olan yayında bir gönderici yok.',
      forbidden: 'Dışa aktarma iznin yok.',
      generic: 'Dışa aktarma başarısız — tekrar dene.',
    },
  },
  addForm: {
    namePlaceholder: 'Ad soyad',
    nameAria: 'Ad soyad',
    emailPlaceholder: 'eposta@sirket.com',
    emailAria: 'E-posta',
    jobTitlePlaceholder: 'Ünvan (opsiyonel)',
    jobTitleAria: 'Ünvan (opsiyonel)',
    adding: 'Ekleniyor…',
    submit: 'Gönderici ekle',
    addedToast: 'Gönderici taslak olarak eklendi — henüz koltuk kullanılmadı.',
    errors: {
      email_taken:
        'Bu adres çalışma alanında zaten bir gönderici. Pasifleştirildiyse, tekrar yayına al.',
      forbidden: 'Yalnızca sahipler ve yöneticiler gönderici ekleyebilir.',
      generic: 'Eklenemedi — alanları kontrol et ve tekrar dene.',
    },
  },
  editDialog: {
    ariaLabel: (name: string) => `${name} düzenle`,
    title: 'Göndericiyi düzenle',
    note: 'İmzalar ve atamalar yerinde kalır — yalnızca bilgiler değişir.',
    fullNameLabel: 'Ad soyad',
    jobTitleLabel: 'Ünvan',
    jobTitlePlaceholder: 'Opsiyonel',
    emailLabel: 'E-posta',
    liveEmailNote: 'Yayındaki göndericiler adresini korur — değiştirmek için önce pasifleştir.',
    validationError: 'Bir ad ve geçerli bir e-posta adresi gir.',
    savedToast: (name: string) => `${name} kaydedildi.`,
    save: 'Değişiklikleri kaydet',
    errors: {
      email_taken: 'Bu çalışma alanında başka bir gönderici zaten bu adresi kullanıyor.',
      email_locked: 'Yayındaki göndericiler adresini korur — değiştirmek için önce pasifleştir.',
      forbidden: 'Yalnızca sahipler ve yöneticiler göndericileri yönetebilir.',
      generic: 'Bir şeyler ters gitti. Lütfen tekrar dene.',
    },
  },
  importCsv: {
    hide: 'CSV içe aktarımı gizle',
    show: "CSV'den içe aktar",
    stepUpload: 'Dosya yükle',
    stepMap: 'Sütunları eşle',
    stepPreview: 'Önizle ve içe aktar',
    fileLabel: 'CSV dosyası',
    fileHint: 'Noktalı virgül ya da virgülle ayrılmış — Türkçe ve İngilizce başlıklar tanınır.',
    nameLabel: 'Ad soyad',
    emailLabel: 'E-posta',
    jobTitleLabel: 'Ünvan (opsiyonel)',
    columnFallback: (n: number) => `Sütun ${n}`,
    moreRows: (n: number) => `…ve ${n} satır daha`,
    reason: {
      missing_name: 'ad eksik',
      invalid_email: 'e-posta doğru görünmüyor',
      duplicate_in_file: 'önceki bir satırın tekrarı',
    },
    summarySenderWord: (n: number) => ` gönderici eklenecek — hepsi `,
    summaryDraftsWord: 'taslak',
    summaryTrail: ' olarak, koltuk kullanılmadan.',
    skippedLead: (n: number) => `${n} satır atlanacak (`,
    lineReason: (line: number, reason: string) => `satır ${line}: ${reason}`,
    importing: 'İçe aktarılıyor…',
    importLabel: (n: number) => `${n} gönderici içe aktar`,
    mapFirst: 'Önce ad ve e-posta sütunlarını eşle.',
    failed: 'İçe aktarma başarısız — tekrar dene.',
    importedToastTitle: 'CSV içe aktarıldı',
    importedToast: (created: number, skipped: number) =>
      `${created} gönderici taslak olarak eklendi` +
      (skipped > 0 ? ` — ${skipped} tanesi zaten vardı ve atlandı.` : '.'),
  },
  actions: {
    publish: 'Yayına al',
    deactivate: 'Pasifleştir',
    editAria: (name: string) => `${name} düzenle`,
    deleteAria: (name: string) => `${name} sil`,
    seatsFullTip: (entitled: number) => `${entitled} koltuğun tamamı dolu.`,
    liveHoldsSeatTip: 'Yayındaki göndericiler bir koltuk tutar — önce pasifleştir.',
    publishedToast: (name: string) => `${name} yayına alındı — bir koltuk artık kullanımda.`,
    deactivatedToast: (name: string) => `${name} pasifleştirildi — koltuk tekrar boşta.`,
    deletedToast: (name: string) => `${name} silindi.`,
    publishConfirmTitle: (name: string) => `${name} yayına alınsın mı?`,
    deactivateConfirmTitle: (name: string) => `${name} pasifleştirilsin mi?`,
    deleteConfirmTitle: (name: string) => `${name} silinsin mi?`,
    seatNote: (active: number, entitled: number) =>
      `Aktif olur, ${entitled} koltuğunun ${active} tanesini kullanır. İmzası artık dışa aktarılabilir.`,
    deactivateBody:
      'Koltuğu bu dönem başkası için boşalır. Posta istemcilerine zaten kurulmuş imzalar çalışmaya devam eder.',
    deleteBodyLead: 'İmzaları ',
    deleteBodyKept: 'korunur',
    deleteBodyTrail:
      " (yalnızca ataması kaldırılır) ve yüklenen görseller CDN'de kalır. Gönderici kimliğinin kendisi geri getirilemez.",
    errors: {
      seat_limit: (entitled: number) =>
        `${entitled} koltuğun tamamı dolu. Bir göndericiyi pasifleştir ya da daha fazlası için bize ulaş.`,
      not_entitled: 'Çalışma alanın şu an yayına alamıyor — bize ulaş.',
      forbidden: 'Yalnızca sahipler ve yöneticiler göndericileri yönetebilir.',
      generic: 'Bir şeyler ters gitti. Lütfen tekrar dene.',
    },
  },
  detailActions: {
    editDetails: 'Bilgileri düzenle',
    downloadSignature: 'İmzayı indir',
    onlyLiveExportableTip: 'Yalnızca yayındaki göndericiler dışa aktarılabilir.',
    assignFirstTip: 'Önce bir imza ata.',
    setupGuides: 'Kurulum rehberleri',
    deleteSender: 'Göndericiyi sil',
    exportFailed: 'Dışa aktarma başarısız — tekrar dene.',
    downloadedToast: (name: string, count: number) =>
      count === 1
        ? `${name} adlı göndericinin imza dosyası indirildi.`
        : `${name} adlı göndericinin imza dosyaları indirildi.`,
    errors: {
      is_live: 'Yayındaki göndericiler silinemez — önce pasifleştir.',
    },
  },
  detailPage: {
    heading: 'Gönderici',
    detailsHeading: 'Bilgiler',
    emailLabel: 'E-posta:',
    jobTitleLabel: 'Ünvan:',
    addedLabel: 'Eklendi:',
    firstPublishedLabel: 'İlk yayın:',
    lastExportedLabel: 'Son dışa aktarım:',
    never: 'Hiç',
    actionsHeading: 'İşlemler',
    assignedSignatures: 'Atanmış imzalar',
    manage: 'Yönet',
    emptySignatures:
      'Henüz atanmış imza yok — bu gönderici yayına girebilsin diye İmzalar ekranından bir tane ata.',
    colSignature: 'İmza',
    colTemplate: 'Şablon',
    colUpdated: 'Güncellendi',
    edit: 'Düzenle',
  },
};

export const senders = { en, tr } as const;
