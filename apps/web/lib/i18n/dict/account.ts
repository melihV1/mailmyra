import type { Mirror } from '../types';

/**
 * Account kümesi: /app/account (+ security, billing, billing/invoices/[id],
 * notifications) ve /app/profile — AccountTabs, DangerZone, EmailChangeForm,
 * SecurityForms, PreferencesForm, AvatarUpload dahil. Sekme başlıkları
 * (Account/Security/Billing & Plan/Notifications) burada TEKRARLANMAZ —
 * kabuk sözlüğü `nav.menu`'den okunur (AccountTabs.tsx). Rol etiketleri de
 * aynı sebeple `nav.roleLabels`'tan. Bildirim İÇERİĞİ (notification-looks.ts,
 * NOTIFICATION_LOOKS/timeAgo) burada DEĞİL — Task 6; yalnız bu ekranın KENDİ
 * metinleri (tercih tablosu başlıkları, boş durumlar) burada.
 *
 * DangerZone: silme onayı kullanıcının KENDİ e-postasını yazmasını ister —
 * sabit bir onay kelimesi ("delete" gibi) YOK, dolayısıyla "gerekli
 * literal" kuralı burada uygulanmıyor; yalnız çevredeki açıklama/etiket
 * metinleri çevrildi, eşleştirme mantığı (`emailConfirm === userEmail`)
 * dokunulmadan kaldı.
 *
 * lib/invoice-format.ts (money/invoiceDate/INVOICE_STATUS_BADGE) bu görevin
 * dosya listesinde YOK ve (admin) raporlarıyla paylaşılıyor — kasıtlı
 * dokunulmadı, bkz. görev raporu.
 */

const en = {
  pageTitles: {
    account: 'Account — Mailmyra',
    security: 'Security — Mailmyra',
    billing: 'Billing & Plan — Mailmyra',
    notifications: 'Notifications — Mailmyra',
    invoice: 'Invoice — Mailmyra',
    profile: 'My Profile — Mailmyra',
  },
  verified: 'Verified',
  notVerified: 'Not verified',
  activityEmpty: 'Nothing yet — publishes, invitations and seat warnings will show up here.',
  contactUs: 'contact us',
  perActiveSenderYear: 'per active sender / year',
  page: {
    changeEmailTitle: 'Change e-mail',
    changeEmailSubtitle:
      'We send a confirmation to the new address — the switch happens when you confirm.',
    legalTitle: 'Legal',
    legalEmpty: 'No recorded acceptances.',
    legalTable: { colDocument: 'Document', colVersion: 'Version', colAccepted: 'Accepted' },
  },
  emailChange: {
    newAddressLabel: 'New address',
    currentPasswordLabel: 'Current password',
    submit: 'Change e-mail',
    confirmationSentTitle: 'Confirmation sent',
    confirmationSentBody: (email: string) =>
      `Check ${email} — the switch happens when you confirm.`,
    errors: {
      email_taken: 'That address already has an account.',
      invalid_credentials: 'Wrong password.',
      rate_limited: 'Too many attempts — try again later.',
      generic: 'Enter a valid address (or it is already yours).',
      network: 'Something went wrong — try again.',
    },
  },
  dangerZone: {
    cardTitle: 'Delete account',
    cardBody:
      'Permanently deletes your workspace: senders, signatures and all uploaded images. Signatures already pasted into e-mail clients will show broken images.',
    deleteButton: 'Delete account',
    dialogTitle: 'Delete your account',
    confirmForever: 'Delete forever',
    bodyLead: 'This permanently deletes your workspace: senders, signatures and ',
    bodyStrongImages: 'all uploaded images',
    bodyMid: '. Signatures already pasted into e-mail clients ',
    bodyStrongBroken: 'will show broken images',
    bodyTrail: '. This cannot be undone.',
    emailConfirmLabel: 'Type your e-mail to confirm',
    passwordLabel: 'Your password',
    goToMembers: 'Go to Members',
    errors: {
      invalid_credentials: 'Wrong password.',
      email_mismatch: 'That does not match your account e-mail.',
      workspace_has_members:
        'Your workspace still has other members — remove them or transfer ownership first.',
      generic: 'Something went wrong — try again.',
    },
  },
  security: {
    changePasswordTitle: 'Change password',
    changePasswordSubtitle: 'Changing it signs out every other session automatically.',
    activeSessionsTitle: 'Active sessions',
    table: { colDevice: 'Device', colIp: 'IP', colLastSeen: 'Last seen' },
    thisDevice: 'This device',
    current: 'Current',
    unknownDevice: 'Unknown device',
    forms: {
      currentPasswordLabel: 'Current password',
      newPasswordLabel: 'New password',
      newPasswordHint: 'At least 10 characters, not a common one.',
      changePassword: 'Change password',
      signOutOthers: (n: number) => `Sign out the ${n} other session${n === 1 ? '' : 's'}`,
      passwordChangedToast: 'Password changed. Every other session was signed out.',
      othersSignedOutToast: 'Other sessions signed out.',
      errors: {
        wrong_password: 'Your current password is not right.',
        generic: 'New password needs at least 10 characters, and not a common one.',
      },
    },
  },
  billing: {
    planState: {
      active: 'Active',
      past_due: 'Past due',
      cancelled: 'Cancelled',
    },
    trial: 'Trial',
    trialEnds: (date: string) => `Trial — ends ${date}`,
    currentPlanTitle: 'Current plan',
    currentPlanSubtitle: 'One product, one price',
    bullets: [
      'Annual billing only — no monthly tiers, no feature locks',
      'Drafts are free — a seat is used only when a sender is live',
      '7-day full trial, no card required',
    ],
    seatsTitle: 'Seats',
    seatsSubtitle: 'Active senders in your workspace',
    inUse: 'in use',
    manualNote: 'Invoices are issued manually by our team.',
    manualNoteTrail: 'To add seats or update billing details,',
    manualNoteEnd: ' — changes usually land the same day.',
    invoiceHistoryTitle: 'Invoice history',
    manualBillingBadge: 'Manual billing',
    ownersOnlyNote: 'Invoices are visible to workspace owners.',
    table: {
      colInvoice: 'Invoice',
      colDate: 'Date',
      colSeats: 'Seats',
      colAmount: 'Amount',
      colStatus: 'Status',
      colActions: 'Actions',
    },
    emptyInvoices:
      'No invoices recorded yet — invoices are issued manually by our team and will appear here.',
    viewInvoiceAria: (number: string) => `View invoice ${number}`,
  },
  invoiceDetail: {
    backToBilling: 'Back to billing',
    heading: (number: string) => `Invoice ${number}`,
    invoiceTo: 'Invoice to:',
    workspaceLine: 'Mailmyra workspace',
    details: 'Details:',
    totalDue: 'Total due:',
    seats: 'Seats:',
    price: 'Price:',
    dateIssued: 'Date issued: ',
    dateDue: 'Date due: ',
    itemTable: {
      colItem: 'Item',
      colDescription: 'Description',
      colCost: 'Cost',
      colQty: 'Qty',
      colPrice: 'Price',
    },
    seatItemName: 'Mailmyra seat',
    seatItemDescription: 'Active sender · 1 year',
    issuedBy: 'Issued by:',
    thanks: 'Thanks for your business!',
    subtotal: 'Subtotal:',
    adjustment: 'Adjustment:',
    total: 'Total:',
    note: 'Note: ',
    print: 'Print',
    manualNote: 'Invoices are issued manually. For corrections or billing details,',
  },
  notifications: {
    preferencesTitle: 'Notification preferences',
    preferencesSubtitle:
      'Choose how each event reaches you. This only affects your own account — teammates keep their own settings.',
    recentTitle: 'Recent notifications',
    viewAll: 'View all',
    whatCreatesTitle: 'What creates a notification?',
    whatCreatesNote:
      'Notifications go to workspace owners and admins. Seat warnings are also sent by e-mail to owners.',
    preferencesForm: {
      table: { colType: 'Type', colInApp: 'In-app', colEmail: 'E-mail' },
      inAppOnlyNote: 'In-app only for now',
      inAppAria: (title: string) => `${title} — in-app`,
      emailAria: (title: string) => `${title} — e-mail`,
      saveChanges: 'Save changes',
      savedToast: 'Notification preferences saved.',
      saveFailed: 'Could not save your preferences. Please try again.',
    },
  },
  profile: {
    about: {
      title: 'About',
      email: 'Email',
      role: 'Role',
      workspace: 'Workspace',
      seats: 'Seats',
      memberSince: 'Member since',
      seatsValue: (active: number, entitled: number) => `${active} / ${entitled} in use`,
    },
    accountSettings: 'Account settings',
    headerLine: (roleLabel: string, workspace: string, date: string) =>
      `${roleLabel} at ${workspace} · joined ${date}`,
    yourWorkspace: 'your workspace',
    activityTitle: 'Activity timeline',
  },
  avatar: {
    photoAlt: 'Profile photo',
    uploadButton: 'Upload new photo',
    resetButton: 'Reset',
    uploadFailed: 'Upload failed — try again.',
    photoUpdated: 'Photo updated.',
    photoUpdatedWithWarning: (warning: string) => `Photo updated. ⚠️ ${warning}`,
    photoRemoved: 'Photo removed.',
  },
} as const;

const tr: Mirror<typeof en> = {
  pageTitles: {
    account: 'Hesap — Mailmyra',
    security: 'Güvenlik — Mailmyra',
    billing: 'Fatura ve Plan — Mailmyra',
    notifications: 'Bildirimler — Mailmyra',
    invoice: 'Fatura — Mailmyra',
    profile: 'Profilim — Mailmyra',
  },
  verified: 'Doğrulandı',
  notVerified: 'Doğrulanmadı',
  activityEmpty: 'Henüz bir şey yok — yayına almalar, davetler ve koltuk uyarıları burada görünecek.',
  contactUs: 'bize ulaş',
  perActiveSenderYear: 'aktif gönderici / yıl',
  page: {
    changeEmailTitle: 'E-postayı değiştir',
    changeEmailSubtitle:
      'Yeni adrese bir onay gönderiyoruz — geçiş onayladığında gerçekleşir.',
    legalTitle: 'Hukuki',
    legalEmpty: 'Kayıtlı kabul yok.',
    legalTable: { colDocument: 'Belge', colVersion: 'Sürüm', colAccepted: 'Kabul edildi' },
  },
  emailChange: {
    newAddressLabel: 'Yeni adres',
    currentPasswordLabel: 'Mevcut şifre',
    submit: 'E-postayı değiştir',
    confirmationSentTitle: 'Onay gönderildi',
    confirmationSentBody: (email: string) =>
      `${email} adresine bak — geçiş onayladığında gerçekleşir.`,
    errors: {
      email_taken: 'Bu adresin zaten bir hesabı var.',
      invalid_credentials: 'Yanlış şifre.',
      rate_limited: 'Çok fazla deneme — daha sonra tekrar dene.',
      generic: 'Geçerli bir adres gir (ya da zaten sana ait).',
      network: 'Bir şeyler ters gitti — tekrar dene.',
    },
  },
  dangerZone: {
    cardTitle: 'Hesabı sil',
    cardBody:
      'Çalışma alanını kalıcı olarak siler: göndericiler, imzalar ve tüm yüklenen görseller. E-posta istemcilerine zaten yapıştırılmış imzalarda görseller kırık görünecek.',
    deleteButton: 'Hesabı sil',
    dialogTitle: 'Hesabını sil',
    confirmForever: 'Sonsuza dek sil',
    bodyLead: 'Bu, çalışma alanını kalıcı olarak siler: göndericiler, imzalar ve ',
    bodyStrongImages: 'tüm yüklenen görseller',
    bodyMid: '. E-posta istemcilerine zaten yapıştırılmış imzalarda ',
    bodyStrongBroken: 'görseller kırık görünecek',
    bodyTrail: '. Bu geri alınamaz.',
    emailConfirmLabel: 'Onaylamak için e-postanı yaz',
    passwordLabel: 'Şifren',
    goToMembers: "Üyeler'e git",
    errors: {
      invalid_credentials: 'Yanlış şifre.',
      email_mismatch: 'Bu, hesap e-postanla eşleşmiyor.',
      workspace_has_members:
        'Çalışma alanında hâlâ başka üyeler var — önce onları çıkar ya da sahipliği devret.',
      generic: 'Bir şeyler ters gitti — tekrar dene.',
    },
  },
  security: {
    changePasswordTitle: 'Şifreyi değiştir',
    changePasswordSubtitle: 'Değiştirmek diğer tüm oturumları otomatik olarak kapatır.',
    activeSessionsTitle: 'Aktif oturumlar',
    table: { colDevice: 'Cihaz', colIp: 'IP', colLastSeen: 'Son görülme' },
    thisDevice: 'Bu cihaz',
    current: 'Şu anki',
    unknownDevice: 'Bilinmeyen cihaz',
    forms: {
      currentPasswordLabel: 'Mevcut şifre',
      newPasswordLabel: 'Yeni şifre',
      newPasswordHint: 'En az 10 karakter, yaygın bir şifre olmasın.',
      changePassword: 'Şifreyi değiştir',
      signOutOthers: (n: number) => `Diğer ${n} oturumu kapat`,
      passwordChangedToast: 'Şifre değiştirildi. Diğer tüm oturumlar kapatıldı.',
      othersSignedOutToast: 'Diğer oturumlar kapatıldı.',
      errors: {
        wrong_password: 'Mevcut şifren doğru değil.',
        generic: 'Yeni şifre en az 10 karakter olmalı ve yaygın bir şifre olmamalı.',
      },
    },
  },
  billing: {
    planState: {
      active: 'Aktif',
      past_due: 'Vadesi geçti',
      cancelled: 'İptal edildi',
    },
    trial: 'Deneme',
    trialEnds: (date: string) => `Deneme — ${date} tarihinde bitiyor`,
    currentPlanTitle: 'Mevcut plan',
    currentPlanSubtitle: 'Tek ürün, tek fiyat',
    bullets: [
      'Yalnızca yıllık faturalama — aylık kademe yok, özellik kilidi yok',
      'Taslaklar ücretsizdir — koltuk yalnızca gönderici yayındayken kullanılır',
      '7 gün tam deneme, kart gerekmez',
    ],
    seatsTitle: 'Koltuklar',
    seatsSubtitle: 'Çalışma alanındaki aktif göndericiler',
    inUse: 'kullanımda',
    manualNote: 'Faturalar ekibimiz tarafından elle kesilir.',
    manualNoteTrail: 'Koltuk eklemek ya da fatura bilgilerini güncellemek için',
    manualNoteEnd: ' — değişiklikler genelde aynı gün yansır.',
    invoiceHistoryTitle: 'Fatura geçmişi',
    manualBillingBadge: 'Elle faturalama',
    ownersOnlyNote: 'Faturalar çalışma alanı sahiplerine görünür.',
    table: {
      colInvoice: 'Fatura',
      colDate: 'Tarih',
      colSeats: 'Koltuklar',
      colAmount: 'Tutar',
      colStatus: 'Durum',
      colActions: 'İşlemler',
    },
    emptyInvoices:
      'Henüz kayıtlı fatura yok — faturalar ekibimiz tarafından elle kesilir ve burada görünür.',
    viewInvoiceAria: (number: string) => `${number} numaralı faturayı görüntüle`,
  },
  invoiceDetail: {
    backToBilling: 'Faturalamaya dön',
    heading: (number: string) => `${number} numaralı fatura`,
    invoiceTo: 'Fatura kesilen:',
    workspaceLine: 'Mailmyra çalışma alanı',
    details: 'Detaylar:',
    totalDue: 'Toplam tutar:',
    seats: 'Koltuklar:',
    price: 'Fiyat:',
    dateIssued: 'Düzenlenme tarihi: ',
    dateDue: 'Vade tarihi: ',
    itemTable: {
      colItem: 'Kalem',
      colDescription: 'Açıklama',
      colCost: 'Birim fiyat',
      colQty: 'Adet',
      colPrice: 'Fiyat',
    },
    seatItemName: 'Mailmyra koltuğu',
    seatItemDescription: 'Aktif gönderici · 1 yıl',
    issuedBy: 'Düzenleyen:',
    thanks: 'Bizimle çalıştığın için teşekkürler!',
    subtotal: 'Ara toplam:',
    adjustment: 'Düzeltme:',
    total: 'Toplam:',
    note: 'Not: ',
    print: 'Yazdır',
    manualNote: 'Faturalar elle düzenlenir. Düzeltmeler ya da fatura bilgileri için',
  },
  notifications: {
    preferencesTitle: 'Bildirim tercihleri',
    preferencesSubtitle:
      'Her olayın sana nasıl ulaşacağını seç. Bu yalnızca kendi hesabını etkiler — ekip arkadaşların kendi ayarlarını korur.',
    recentTitle: 'Son bildirimler',
    viewAll: 'Tümünü gör',
    whatCreatesTitle: 'Neler bildirim oluşturur?',
    whatCreatesNote:
      'Bildirimler çalışma alanı sahiplerine ve yöneticilerine gider. Koltuk uyarıları sahiplere e-posta ile de gönderilir.',
    preferencesForm: {
      table: { colType: 'Tür', colInApp: 'Uygulama içi', colEmail: 'E-posta' },
      inAppOnlyNote: 'Şimdilik yalnızca uygulama içi',
      inAppAria: (title: string) => `${title} — uygulama içi`,
      emailAria: (title: string) => `${title} — e-posta`,
      saveChanges: 'Değişiklikleri kaydet',
      savedToast: 'Bildirim tercihleri kaydedildi.',
      saveFailed: 'Tercihlerin kaydedilemedi. Lütfen tekrar dene.',
    },
  },
  profile: {
    about: {
      title: 'Hakkında',
      email: 'E-posta',
      role: 'Rol',
      workspace: 'Çalışma alanı',
      seats: 'Koltuklar',
      memberSince: 'Katılım',
      seatsValue: (active: number, entitled: number) => `${active} / ${entitled} kullanımda`,
    },
    accountSettings: 'Hesap ayarları',
    headerLine: (roleLabel: string, workspace: string, date: string) =>
      `${workspace} çalışma alanında ${roleLabel} · katılım ${date}`,
    yourWorkspace: 'çalışma alanın',
    activityTitle: 'Aktivite zaman çizelgesi',
  },
  avatar: {
    photoAlt: 'Profil fotoğrafı',
    uploadButton: 'Yeni fotoğraf yükle',
    resetButton: 'Sıfırla',
    uploadFailed: 'Yükleme başarısız — tekrar dene.',
    photoUpdated: 'Fotoğraf güncellendi.',
    photoUpdatedWithWarning: (warning: string) => `Fotoğraf güncellendi. ⚠️ ${warning}`,
    photoRemoved: 'Fotoğraf kaldırıldı.',
  },
};

export const account = { en, tr } as const;
