import type { Lang, Mirror } from '../../lib/i18n/types';
import type { NotificationType } from '../../lib/repo/notifications';
import type { Look } from './activity-looks';

/**
 * Bildirim tipi → görünüm sözlüğü. İki tüketicisi var: navbar zili (istemci)
 * ve dashboard'daki Activity kartı (sunucu) — metinler tek yerden çıksın,
 * iki kopya birbirinden kaymasın.
 *
 * Dil-farkında (Task 6, Dalga B): `NOTIFICATION_LOOKS[lang][type]`. `icon`/
 * `tone` teknik alanlar — iki dilde de aynı, çevrilmez. `en` gövdeleri
 * BİREBİR korunur; `tr` `Mirror<typeof en>` ile aynı 3 anahtarı zorunlu
 * kılar (yeni bir NotificationType eklenirse iki taraf da derlemede kırılır).
 *
 * `Look` tipi `activity-looks.ts`ten alınır — iki dosya aynı şekli birebir
 * kopyalamasın diye tek yerde tanımlı (polish review notu).
 */

const en: Record<NotificationType, Look> = {
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
  support_reply: {
    icon: 'tabler-headset',
    tone: 'info',
    title: 'Support replied',
    body: (p) => `Case ${String(p.reference ?? '?')} has a new reply.`,
  },
};

const tr: Mirror<typeof en> = {
  sender_published: {
    icon: 'tabler-send',
    tone: 'success',
    title: 'Gönderici yayına alındı',
    body: (p) => `${String(p.senderName ?? 'Bir gönderici')} artık yayında.`,
  },
  seat_warning: {
    icon: 'tabler-alert-triangle',
    tone: 'warning',
    title: 'Koltuklar dolmak üzere',
    // Geçmiş zamanlı OLAY dili — EN taraftaki notla aynı sebep: bu kayıt o
    // anki eşiği anlatır, şu anki durumu değil ("-mıştı" kipi bilinçli).
    body: (p) =>
      `Koltuk kullanımı o sırada ${String(p.entitledSeats ?? '?')} koltuğun ${String(p.activeSeats ?? '?')} tanesine ulaşmıştı.`,
  },
  invitation_accepted: {
    icon: 'tabler-user-plus',
    tone: 'info',
    title: 'Davet kabul edildi',
    body: (p) => `${String(p.email ?? 'Biri')}, ${String(p.role ?? 'üye')} olarak katıldı.`,
  },
  support_reply: {
    icon: 'tabler-headset',
    tone: 'info',
    title: 'Talebine cevap geldi',
    body: (p) => `${String(p.reference ?? '?')} numaralı talebine yeni bir cevap geldi.`,
  },
};

export const NOTIFICATION_LOOKS: Record<Lang, Record<NotificationType, Look>> = { en, tr };

const TIME_AGO_TR = {
  now: 'şimdi',
  minutes: (m: number) => `${m} dk önce`,
  hours: (h: number) => `${h} sa önce`,
  days: (d: number) => `${d} gün önce`,
};

const TIME_AGO_EN = {
  now: 'just now',
  minutes: (m: number) => `${m}m ago`,
  hours: (h: number) => `${h}h ago`,
  days: (d: number) => `${d}d ago`,
};

/** Kaba "ne kadar önce" — dile göre dakika/saat/gün. */
export function timeAgo(lang: Lang, date: Date | string, now = Date.now()): string {
  const t = lang === 'tr' ? TIME_AGO_TR : TIME_AGO_EN;
  const mins = Math.max(0, Math.floor((now - new Date(date).getTime()) / 60_000));
  if (mins < 1) return t.now;
  if (mins < 60) return t.minutes(mins);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.hours(hours);
  return t.days(Math.floor(hours / 24));
}
