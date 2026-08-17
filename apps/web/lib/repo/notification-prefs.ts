import { prisma } from '../db';
import type { NotificationType } from './notifications';

/**
 * Bildirim tercihleri (karar 2026-08-15, dış denetim: "Notifications sayfası
 * yalnız geçmişi açıklıyor"). Model OPT-OUT: satır yoksa her iki kanal da
 * AÇIK sayılır — yeni bir olay tipi eklendiğinde eski kullanıcılar sessizce
 * sağır kalmaz. Tabloya yalnız kullanıcı bir şeye dokununca satır düşer.
 *
 * E-posta kanalı bugün yalnız `seat_warning` için gerçek bir mail üretiyor;
 * diğer tiplerde ayar ileriye dönük durur (arayüz bunu açıkça yazar).
 */

export const NOTIFICATION_TYPES = [
  'sender_published',
  'seat_warning',
  'invitation_accepted',
] as const satisfies readonly NotificationType[];

/** Bugün gerçekten e-posta gönderen tipler — arayüz gerisini pasif gösterir. */
export const EMAIL_CAPABLE_TYPES: readonly NotificationType[] = ['seat_warning'];

export interface PreferenceRow {
  type: NotificationType;
  inApp: boolean;
  email: boolean;
}

/** Kullanıcının tam tercih tablosu — kayıt yoksa varsayılan (açık) döner. */
export async function getPreferences(userId: string): Promise<PreferenceRow[]> {
  const saved = await prisma.notificationPreference.findMany({ where: { userId } });
  const byType = new Map(saved.map((r) => [r.type, r]));
  return NOTIFICATION_TYPES.map((type) => {
    const row = byType.get(type);
    return { type, inApp: row?.inApp ?? true, email: row?.email ?? true };
  });
}

/** Tek çağrıda tüm tabloyu kaydeder (arayüz tek "Save" düğmesi kullanıyor). */
export async function savePreferences(
  userId: string,
  rows: ReadonlyArray<{ type: string; inApp: boolean; email: boolean }>,
): Promise<void> {
  const valid = rows.filter((r): r is PreferenceRow =>
    (NOTIFICATION_TYPES as readonly string[]).includes(r.type),
  );
  await prisma.$transaction(
    valid.map((r) =>
      prisma.notificationPreference.upsert({
        where: { userId_type: { userId, type: r.type } },
        create: { userId, type: r.type, inApp: r.inApp, email: r.email },
        update: { inApp: r.inApp, email: r.email },
      }),
    ),
  );
}

/**
 * Verilen kullanıcılardan, o tipte İLGİLİ KANALI kapatmamış olanlar.
 * Üreticiler (bildirim yazımı, koltuk uyarı maili) alıcı listesini bundan
 * geçirir. Satırı olmayan kullanıcı listede KALIR (opt-out modeli).
 */
export async function filterByPreference(
  userIds: readonly string[],
  type: NotificationType,
  channel: 'inApp' | 'email',
): Promise<string[]> {
  if (userIds.length === 0) return [];
  const opted = await prisma.notificationPreference.findMany({
    where: { userId: { in: [...userIds] }, type },
    select: { userId: true, inApp: true, email: true },
  });
  const off = new Set(
    opted.filter((r) => (channel === 'inApp' ? !r.inApp : !r.email)).map((r) => r.userId),
  );
  return userIds.filter((id) => !off.has(id));
}
