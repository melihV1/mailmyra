import type { Prisma } from '@prisma/client';

import { prisma } from '../db';
import { filterByPreference } from './notification-prefs';

/**
 * Panel bildirimleri (karar 2026-08-13: kalıcı tablo, türetilmiş besleme
 * değil). Zil menüsü buradan okur; üreticiler `notifyOrgManagers` ile yazar.
 *
 * Üretici hata YUTAR: bildirim, taşıdığı akıştan (publish, davet) daha az
 * önemlidir — koltuk uyarı mailinin kuralıyla aynı (senders.ts emsali).
 */

export type NotificationType = 'sender_published' | 'seat_warning' | 'invitation_accepted';

export interface NotificationRow {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: Date | null;
  createdAt: Date;
}

const LIST_LIMIT = 20;

export async function listNotifications(userId: string): Promise<NotificationRow[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type as NotificationType,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    readAt: r.readAt,
    createdAt: r.createdAt,
  }));
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/**
 * Org'un yöneticilerine (owner + admin) bildirim yazar; `excludeUserId`
 * eylemi yapanın kendisidir — kendi eylemini zilinde görmesin.
 *
 * Hata yutar ve loglar; transaction'ların DIŞINDA çağrılmalıdır.
 */
export async function notifyOrgManagers(input: {
  orgId: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  excludeUserId?: string;
}): Promise<void> {
  try {
    const managers = await prisma.membership.findMany({
      where: { orgId: input.orgId, role: { in: ['owner', 'admin'] } },
      select: { userId: true },
    });
    const candidates = managers
      .map((m) => m.userId)
      .filter((id) => id !== input.excludeUserId);
    // Kullanıcı bu tipte zili kapattıysa satır hiç YAZILMAZ (tercih ekranı,
    // 2026-08-15) — sonradan gizlemek okunmamış rozetini yine şişirirdi.
    const targets = await filterByPreference(candidates, input.type, 'inApp');
    if (targets.length === 0) return;
    await prisma.notification.createMany({
      data: targets.map((userId) => ({
        userId,
        orgId: input.orgId,
        type: input.type,
        payload: input.payload as Prisma.InputJsonValue,
      })),
    });
  } catch (err) {
    console.error('[notifications] yazılamadı:', err);
  }
}
