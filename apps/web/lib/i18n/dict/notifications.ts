import type { Mirror } from '../types';

/**
 * Bildirim kutusu ekranı (app/(app)/app/notifications/) KABUĞU: üst sayfa
 * (page.tsx) + InboxClient (liste, filtre, toplu işlemler, onay diyalogları,
 * toast metinleri). Bildirim İÇERİĞİ (satır başlığı/gövdesi, `timeAgo`)
 * burada DEĞİL — `app/(app)/notification-looks.ts` (`NOTIFICATION_LOOKS`,
 * Task 6) sözleşmesi. Zilin (`navbar/NotificationsBell.tsx`) KABUK metinleri
 * de burada DEĞİL — o `dict/nav.ts`'te (Task 3), ayrı bir sözleşme.
 *
 * "Delete"/"Cancel" gibi tek-kelime jenerik eylemler `common`'dan gelir —
 * burada tekrarlanmaz (çağıranlar `common[lang]` ile birlikte import eder).
 */

const en = {
  pageTitle: 'Notifications — Mailmyra',
  page: {
    heading: 'Notifications',
    subtitleLead: 'Everything sent to you. Choose what reaches you in ',
    prefsLink: 'notification preferences',
  },
  inbox: {
    unreadHeading: 'Unread',
    allHeading: 'All notifications',
    selectedBadge: (n: number) => `${n} selected`,
    filterAria: 'Filter',
    filterAll: 'All',
    unread: 'Unread',
    markRead: 'Mark read',
    markUnread: 'Mark unread',
    markAllRead: 'Mark all read',
    clearRead: 'Clear read',
    genericError: 'Something went wrong. Please try again.',
    noUnreadTitle: 'Nothing unread',
    noneTitle: 'No notifications yet',
    allCaughtUp: 'You are all caught up.',
    emptyBody: 'Publishes, invitations and seat warnings will show up here.',
    selectAllAria: 'Select all',
    colNotification: 'Notification',
    colDetails: 'Details',
    colReceived: 'Received',
    colActions: 'Actions',
    selectRowAria: (name: string) => `Select ${name}`,
    markAsReadAria: 'Mark as read',
    markAsUnreadAria: 'Mark as unread',
    deleteNotificationAria: 'Delete notification',
    markedAsRead: 'Marked as read.',
    markedAsUnread: 'Marked as unread.',
    notificationDeleted: 'Notification deleted.',
    markedReadPlural: (n: number) => `${n} notification${n === 1 ? '' : 's'} marked as read.`,
    markedUnreadPlural: (n: number) => `${n} notification${n === 1 ? '' : 's'} marked as unread.`,
    deletedPlural: (n: number) => (n === 1 ? 'Notification deleted.' : `${n} notifications deleted.`),
    clearedReadPlural: (n: number) =>
      n === 1 ? '1 read notification cleared.' : `${n} read notifications cleared.`,
    allMarkedRead: 'All notifications marked as read.',
    deleteSelectedTitle: (n: number) => `Delete ${n} notification${n === 1 ? '' : 's'}?`,
    deleteSelectedBodyLead: 'This clears them from your own list. The workspace ',
    activityLogLink: 'activity log',
    deleteSelectedBodyTrail: ' keeps the record of what happened.',
    clearReadTitle: 'Clear read notifications?',
    clearReadBodyLead: (n: number) =>
      `${n} read notification${n === 1 ? '' : 's'} will be removed from your list. Unread ones stay, and the `,
    clearReadBodyTrail: ' is untouched.',
    clear: 'Clear',
  },
} as const;

const tr: Mirror<typeof en> = {
  pageTitle: 'Bildirimler — Mailmyra',
  page: {
    heading: 'Bildirimler',
    subtitleLead: 'Sana gönderilen her şey. Sana neyin ulaşacağını ',
    prefsLink: 'bildirim tercihlerinden',
  },
  inbox: {
    unreadHeading: 'Okunmamış',
    allHeading: 'Tüm bildirimler',
    selectedBadge: (n: number) => `${n} seçili`,
    filterAria: 'Filtre',
    filterAll: 'Tümü',
    unread: 'Okunmamış',
    markRead: 'Okundu işaretle',
    markUnread: 'Okunmadı işaretle',
    markAllRead: 'Tümünü okundu işaretle',
    clearRead: 'Okunanları temizle',
    genericError: 'Bir şeyler ters gitti. Lütfen tekrar dene.',
    noUnreadTitle: 'Okunmamış yok',
    noneTitle: 'Henüz bildirim yok',
    allCaughtUp: 'Her şeyi yakaladın.',
    emptyBody: 'Yayına almalar, davetler ve koltuk uyarıları burada görünecek.',
    selectAllAria: 'Tümünü seç',
    colNotification: 'Bildirim',
    colDetails: 'Ayrıntılar',
    colReceived: 'Alındı',
    colActions: 'İşlemler',
    selectRowAria: (name: string) => `${name} seç`,
    markAsReadAria: 'Okundu işaretle',
    markAsUnreadAria: 'Okunmadı işaretle',
    deleteNotificationAria: 'Bildirimi sil',
    markedAsRead: 'Okundu olarak işaretlendi.',
    markedAsUnread: 'Okunmadı olarak işaretlendi.',
    notificationDeleted: 'Bildirim silindi.',
    markedReadPlural: (n: number) => `${n} bildirim okundu olarak işaretlendi.`,
    markedUnreadPlural: (n: number) => `${n} bildirim okunmadı olarak işaretlendi.`,
    deletedPlural: (n: number) => (n === 1 ? 'Bildirim silindi.' : `${n} bildirim silindi.`),
    clearedReadPlural: (n: number) => `${n} okunan bildirim temizlendi.`,
    allMarkedRead: 'Tüm bildirimler okundu olarak işaretlendi.',
    deleteSelectedTitle: (n: number) => `${n} bildirim silinsin mi?`,
    deleteSelectedBodyLead: 'Bu, onları yalnızca kendi listenden temizler. Çalışma alanının ',
    activityLogLink: 'aktivite günlüğü',
    deleteSelectedBodyTrail: ' ne olduğunun kaydını tutmaya devam eder.',
    clearReadTitle: 'Okunan bildirimler temizlensin mi?',
    clearReadBodyLead: (n: number) =>
      `${n} okunan bildirim listenden kaldırılacak. Okunmamışlar kalır ve `,
    clearReadBodyTrail: ' dokunulmadan kalır.',
    clear: 'Temizle',
  },
};

export const notifications = { en, tr } as const;
