import type { Lang, Mirror } from '../../lib/i18n/types';
import type { ActivityType } from '../../lib/repo/activity';

/**
 * Aktivite tipi → görünüm sözlüğü. `notification-looks.ts` ile aynı kalıp:
 * metin tek yerden çıkar, ekranla filtre menüsü birbirinden kaymaz.
 *
 * Cümleler GEÇMİŞ ZAMANLI olay dilinde: günlük satırı "şu an ne durumda"
 * değil "ne oldu" anlatır (bildirim metinlerinde yaşanan karışıklığın dersi).
 * TR gövdesi de aynı kurala uyar ("Gönderici yayına alındı" gibi).
 *
 * Dil-farkında (Task 6, Dalga B): `ACTIVITY_LOOKS[lang][type]`. `icon`/`tone`
 * teknik alanlar — iki dilde de aynı değer, çevrilmez. `en` gövdeleri
 * BİREBİR korunur; `tr` `Mirror<typeof en>` ile aynı 14 anahtarı zorunlu
 * kılar (yeni bir ActivityType eklenirse iki taraf da derlemede kırılır).
 */

type Look = {
  icon: string;
  tone: string;
  title: string;
  body: (p: Record<string, unknown>) => string;
};

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

const en: Record<ActivityType, Look> = {
  'sender.created': {
    icon: 'tabler-user-plus',
    tone: 'info',
    title: 'Sender added',
    body: (p) => `${str(p.senderName, 'A sender')} was added as a draft.`,
  },
  'sender.updated': {
    icon: 'tabler-edit',
    tone: 'info',
    title: 'Sender edited',
    body: (p) =>
      str(p.previousName) && str(p.previousName) !== str(p.senderName)
        ? `${str(p.previousName)} was renamed to ${str(p.senderName)}.`
        : `${str(p.senderName, 'A sender')}'s details were updated.`,
  },
  'sender.published': {
    icon: 'tabler-send',
    tone: 'success',
    title: 'Sender published',
    body: (p) => `${str(p.senderName, 'A sender')} went live and took a seat.`,
  },
  'sender.deactivated': {
    icon: 'tabler-player-pause',
    tone: 'warning',
    title: 'Sender deactivated',
    body: (p) => `${str(p.senderName, 'A sender')} was deactivated and freed a seat.`,
  },
  'sender.deleted': {
    icon: 'tabler-trash',
    tone: 'danger',
    title: 'Sender deleted',
    body: (p) => `${str(p.senderName, 'A sender')} (${str(p.email, 'no address')}) was deleted.`,
  },
  'senders.imported': {
    icon: 'tabler-file-import',
    tone: 'info',
    title: 'Senders imported',
    body: (p) => `${num(p.count)} sender${num(p.count) === 1 ? '' : 's'} were imported from CSV.`,
  },
  'signature.renamed': {
    icon: 'tabler-cursor-text',
    tone: 'info',
    title: 'Signature renamed',
    body: (p) => `${str(p.previousName, 'A signature')} was renamed to ${str(p.name)}.`,
  },
  'signature.deleted': {
    icon: 'tabler-trash',
    tone: 'danger',
    title: 'Signature deleted',
    body: (p) => `${str(p.name, 'A signature')} was deleted.`,
  },
  'brand.saved': {
    icon: 'tabler-palette',
    tone: 'primary',
    title: 'Brand settings saved',
    body: (p) =>
      `Brand rules were updated — ${num(p.lockedFields)} field${num(p.lockedFields) === 1 ? '' : 's'} locked.`,
  },
  'member.invited': {
    icon: 'tabler-mail-forward',
    tone: 'info',
    title: 'Teammate invited',
    body: (p) => `${str(p.email, 'Someone')} was invited as ${str(p.role, 'a member')}.`,
  },
  'member.joined': {
    icon: 'tabler-user-check',
    tone: 'success',
    title: 'Invitation accepted',
    body: (p) => `${str(p.email, 'Someone')} joined as ${str(p.role, 'a member')}.`,
  },
  'member.role_changed': {
    icon: 'tabler-user-cog',
    tone: 'warning',
    title: 'Role changed',
    body: (p) =>
      `${str(p.email, 'A member')} went from ${str(p.previousRole, 'their role')} to ${str(p.role)}.`,
  },
  'member.removed': {
    icon: 'tabler-user-minus',
    tone: 'danger',
    title: 'Member removed',
    body: (p) =>
      p.self === true
        ? `${str(p.email, 'A member')} left the workspace.`
        : `${str(p.email, 'A member')} was removed from the workspace.`,
  },
  'export.zip': {
    icon: 'tabler-download',
    tone: 'primary',
    title: 'Signatures exported',
    body: (p) =>
      `${num(p.fileCount)} signature file${num(p.fileCount) === 1 ? '' : 's'} downloaded for ${num(p.senderCount)} sender${num(p.senderCount) === 1 ? '' : 's'}.`,
  },

  /* Destek tarafından yapılan düzeltmeler. Metinler "Mailmyra support" diyor,
     "Voldi" ya da personelin adı değil: müşteri satın aldığı ürünü tanıyor,
     arkasındaki şirketi ya da kimin tıkladığını değil. Kim olduğu iç
     denetimde `ActivityEvent.actorUserId`da zaten duruyor. */
  'support.entitlement_changed': {
    icon: 'tabler-lifebuoy',
    tone: 'info',
    title: 'Plan updated by support',
    body: (p) => {
      const parts: string[] = [];
      if (num(p.entitledSeats)) parts.push(`${num(p.entitledSeats)} seats`);
      if (str(p.entitlementState)) parts.push(str(p.entitlementState));
      if (str(p.trialEndsAt)) parts.push(`trial until ${str(p.trialEndsAt)}`);
      return parts.length
        ? `Mailmyra support set ${parts.join(' · ')}.`
        : 'Mailmyra support updated this workspace plan.';
    },
  },
  'support.invoice_issued': {
    icon: 'tabler-file-invoice',
    tone: 'primary',
    title: 'Invoice issued',
    body: (p) =>
      `Invoice ${str(p.number, 'a new invoice')} was issued for ${num(p.seats)} seat${num(p.seats) === 1 ? '' : 's'}.`,
  },
  'support.invoice_status_changed': {
    icon: 'tabler-receipt',
    tone: 'success',
    title: 'Invoice updated',
    body: (p) => `Invoice ${str(p.number, '')} was marked ${str(p.status, 'updated')}.`.replace('  ', ' '),
  },
  'support.case_opened': {
    icon: 'tabler-headset',
    tone: 'info',
    title: 'Support case opened',
    body: (p) => `Case ${str(p.reference, '?')} was opened — ${str(p.subject, 'no subject')}.`,
  },
};

const tr: Mirror<typeof en> = {
  'sender.created': {
    icon: 'tabler-user-plus',
    tone: 'info',
    title: 'Gönderici eklendi',
    body: (p) => `${str(p.senderName, 'Bir gönderici')} taslak olarak eklendi.`,
  },
  'sender.updated': {
    icon: 'tabler-edit',
    tone: 'info',
    title: 'Gönderici düzenlendi',
    body: (p) =>
      str(p.previousName) && str(p.previousName) !== str(p.senderName)
        ? `${str(p.previousName)}, ${str(p.senderName)} olarak yeniden adlandırıldı.`
        : `${str(p.senderName, 'Bir gönderici')} için bilgiler güncellendi.`,
  },
  'sender.published': {
    icon: 'tabler-send',
    tone: 'success',
    title: 'Gönderici yayına alındı',
    body: (p) => `${str(p.senderName, 'Bir gönderici')} yayına alındı ve bir koltuk kullandı.`,
  },
  'sender.deactivated': {
    icon: 'tabler-player-pause',
    tone: 'warning',
    title: 'Gönderici pasifleştirildi',
    body: (p) => `${str(p.senderName, 'Bir gönderici')} pasifleştirildi ve bir koltuk boşaldı.`,
  },
  'sender.deleted': {
    icon: 'tabler-trash',
    tone: 'danger',
    title: 'Gönderici silindi',
    body: (p) => `${str(p.senderName, 'Bir gönderici')} (${str(p.email, 'adres yok')}) silindi.`,
  },
  'senders.imported': {
    icon: 'tabler-file-import',
    tone: 'info',
    title: 'Göndericiler içe aktarıldı',
    body: (p) => `${num(p.count)} gönderici CSV'den içe aktarıldı.`,
  },
  'signature.renamed': {
    icon: 'tabler-cursor-text',
    tone: 'info',
    title: 'İmza yeniden adlandırıldı',
    body: (p) => `${str(p.previousName, 'Bir imza')}, ${str(p.name)} olarak yeniden adlandırıldı.`,
  },
  'signature.deleted': {
    icon: 'tabler-trash',
    tone: 'danger',
    title: 'İmza silindi',
    body: (p) => `${str(p.name, 'Bir imza')} silindi.`,
  },
  'brand.saved': {
    icon: 'tabler-palette',
    tone: 'primary',
    title: 'Marka ayarları kaydedildi',
    body: (p) => `Marka kuralları güncellendi — ${num(p.lockedFields)} alan kilitlendi.`,
  },
  'member.invited': {
    icon: 'tabler-mail-forward',
    tone: 'info',
    title: 'Ekip arkadaşı davet edildi',
    body: (p) => `${str(p.email, 'Biri')}, ${str(p.role, 'üye')} olarak davet edildi.`,
  },
  'member.joined': {
    icon: 'tabler-user-check',
    tone: 'success',
    title: 'Davet kabul edildi',
    body: (p) => `${str(p.email, 'Biri')}, ${str(p.role, 'üye')} olarak katıldı.`,
  },
  'member.role_changed': {
    icon: 'tabler-user-cog',
    tone: 'warning',
    title: 'Rol değiştirildi',
    body: (p) =>
      `${str(p.email, 'Bir üye')}, ${str(p.previousRole, 'önceki')} rolünden ${str(p.role)} rolüne geçti.`,
  },
  'member.removed': {
    icon: 'tabler-user-minus',
    tone: 'danger',
    title: 'Üye çıkarıldı',
    body: (p) =>
      p.self === true
        ? `${str(p.email, 'Bir üye')} çalışma alanından ayrıldı.`
        : `${str(p.email, 'Bir üye')} çalışma alanından çıkarıldı.`,
  },
  'export.zip': {
    icon: 'tabler-download',
    tone: 'primary',
    title: 'İmzalar dışa aktarıldı',
    body: (p) =>
      `${num(p.senderCount)} gönderici için ${num(p.fileCount)} imza dosyası indirildi.`,
  },

  'support.entitlement_changed': {
    icon: 'tabler-lifebuoy',
    tone: 'info',
    title: 'Plan destek tarafından güncellendi',
    body: (p) => {
      const parts: string[] = [];
      if (num(p.entitledSeats)) parts.push(`${num(p.entitledSeats)} koltuk`);
      if (str(p.entitlementState)) parts.push(str(p.entitlementState));
      if (str(p.trialEndsAt)) parts.push(`${str(p.trialEndsAt)} tarihine kadar deneme`);
      return parts.length
        ? `Mailmyra destek ${parts.join(' · ')} olarak ayarladı.`
        : 'Mailmyra destek bu çalışma alanının planını güncelledi.';
    },
  },
  'support.invoice_issued': {
    icon: 'tabler-file-invoice',
    tone: 'primary',
    title: 'Fatura kesildi',
    body: (p) => `${num(p.seats)} koltuk için ${str(p.number, 'yeni bir fatura')} kesildi.`,
  },
  'support.invoice_status_changed': {
    icon: 'tabler-receipt',
    tone: 'success',
    title: 'Fatura güncellendi',
    body: (p) =>
      `Fatura ${str(p.number, '')} ${str(p.status, 'güncellendi')} olarak işaretlendi.`.replace(
        '  ',
        ' ',
      ),
  },
  'support.case_opened': {
    icon: 'tabler-headset',
    tone: 'info',
    title: 'Destek talebi açıldı',
    body: (p) => `${str(p.reference, '?')} numaralı destek talebi açıldı — ${str(p.subject, 'konu yok')}.`,
  },
};

export const ACTIVITY_LOOKS: Record<Lang, Record<ActivityType, Look>> = { en, tr };

/** Filtre kimliği — sıralamayı burada tutar, etiketleri dilden ayırır. */
type FilterId =
  | 'all'
  | 'publishes'
  | 'deactivations'
  | 'deletions'
  | 'exports'
  | 'brand'
  | 'invitations'
  | 'roleChanges'
  | 'support';

const FILTER_ORDER: readonly FilterId[] = [
  'all',
  'publishes',
  'deactivations',
  'deletions',
  'exports',
  'brand',
  'invitations',
  'roleChanges',
  'support',
];

/** Filtrenin `?type=` değeri — dilden bağımsız, veri sözleşmesi. */
const FILTER_VALUES: Record<FilterId, string> = {
  all: '',
  publishes: 'sender.published',
  deactivations: 'sender.deactivated',
  deletions: 'sender.deleted',
  exports: 'export.zip',
  brand: 'brand.saved',
  invitations: 'member.invited',
  roleChanges: 'member.role_changed',
  support: 'support.',
};

const filterLabelsEn: Record<FilterId, string> = {
  all: 'All activity',
  publishes: 'Publishes',
  deactivations: 'Deactivations',
  deletions: 'Deletions',
  exports: 'Exports',
  brand: 'Brand changes',
  invitations: 'Invitations',
  roleChanges: 'Role changes',
  support: 'Support actions',
};

const filterLabelsTr: Mirror<typeof filterLabelsEn> = {
  all: 'Tüm aktivite',
  publishes: 'Yayına almalar',
  deactivations: 'Pasifleştirmeler',
  deletions: 'Silmeler',
  exports: 'Dışa aktarımlar',
  brand: 'Marka değişiklikleri',
  invitations: 'Davetler',
  roleChanges: 'Rol değişiklikleri',
  support: 'Destek işlemleri',
};

const FILTER_LABELS: Record<Lang, Record<FilterId, string>> = { en: filterLabelsEn, tr: filterLabelsTr };

/** Filtre menüsündeki gruplar — tek tek 14 tip yerine anlamlı kümeler. */
export function activityFilters(lang: Lang): ReadonlyArray<{ label: string; value: string }> {
  const labels = FILTER_LABELS[lang];
  return FILTER_ORDER.map((id) => ({ label: labels[id], value: FILTER_VALUES[id] }));
}
