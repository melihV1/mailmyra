import type { NotificationType } from '../../lib/repo/notifications';

/**
 * Bildirim tipi → görünüm sözlüğü. İki tüketicisi var: navbar zili (istemci)
 * ve dashboard'daki Activity kartı (sunucu) — metinler tek yerden çıksın,
 * iki kopya birbirinden kaymasın.
 */
export const NOTIFICATION_LOOKS: Record<
  NotificationType,
  { icon: string; tone: string; title: string; body: (p: Record<string, unknown>) => string }
> = {
  sender_published: {
    icon: 'tabler-send',
    tone: 'success',
    title: 'Sender published',
    body: (p) => `${String(p.senderName ?? 'A sender')} is now live.`,
  },
  seat_warning: {
    icon: 'tabler-alert-triangle',
    tone: 'warning',
    title: 'Seats almost full',
    /* Geçmiş zamanlı OLAY dili (Codex denetimi P0, 2026-08-15): eski kayıt
       "3 of 3 seats in use" diye ŞİMDİKİ durum gibi okunuyor, kenar çubuğu
       1/3 derken çelişki sanılıyordu. Anlık durumun kaynağı rozet/dashboard;
       bildirim yalnız o anki eşiğin kaydıdır. */
    body: (p) =>
      `Seat usage reached ${String(p.activeSeats ?? '?')} of ${String(p.entitledSeats ?? '?')} at the time.`,
  },
  invitation_accepted: {
    icon: 'tabler-user-plus',
    tone: 'info',
    title: 'Invitation accepted',
    body: (p) => `${String(p.email ?? 'Someone')} joined as ${String(p.role ?? 'member')}.`,
  },
};

/** Kaba "ne kadar önce" — panel dili EN, dakika/saat/gün. */
export function timeAgo(date: Date | string, now = Date.now()): string {
  const mins = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
