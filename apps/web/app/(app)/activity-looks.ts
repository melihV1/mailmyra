import type { ActivityType } from '../../lib/repo/activity';

/**
 * Aktivite tipi → görünüm sözlüğü. `notification-looks.ts` ile aynı kalıp:
 * metin tek yerden çıkar, ekranla filtre menüsü birbirinden kaymaz.
 *
 * Cümleler GEÇMİŞ ZAMANLI olay dilinde: günlük satırı "şu an ne durumda"
 * değil "ne oldu" anlatır (bildirim metinlerinde yaşanan karışıklığın dersi).
 */

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

export const ACTIVITY_LOOKS: Record<
  ActivityType,
  { icon: string; tone: string; title: string; body: (p: Record<string, unknown>) => string }
> = {
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

/** Filtre menüsündeki gruplar — tek tek 14 tip yerine anlamlı kümeler. */
export const ACTIVITY_FILTERS: ReadonlyArray<{ label: string; value: string }> = [
  { label: 'All activity', value: '' },
  { label: 'Publishes', value: 'sender.published' },
  { label: 'Deactivations', value: 'sender.deactivated' },
  { label: 'Deletions', value: 'sender.deleted' },
  { label: 'Exports', value: 'export.zip' },
  { label: 'Brand changes', value: 'brand.saved' },
  { label: 'Invitations', value: 'member.invited' },
  { label: 'Role changes', value: 'member.role_changed' },
  { label: 'Support actions', value: 'support.' },
];
