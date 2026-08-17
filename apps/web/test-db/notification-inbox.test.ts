/**
 * Bildirim kutusu işlemleri (2026-08-15). Sınanan kurallar: sahiplik
 * `where`in içinde (başkasının bildirimi okunamaz/silinemez), okundu geri
 * alınabilir, "okunmuşları temizle" okunmamışa dokunmaz, unread filtresi.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import {
  listInbox,
  removeNotifications,
  removeReadNotifications,
  setRead,
  unreadCount,
} from '../lib/repo/notifications';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

async function scene() {
  const org = await prisma.organization.create({ data: { name: 'Voldi' } });
  const mine = await prisma.user.create({ data: { email: 'ben@voldi.net', passwordHash: 'x' } });
  const other = await prisma.user.create({ data: { email: 'baska@voldi.net', passwordHash: 'x' } });
  await prisma.notification.createMany({
    data: [
      { userId: mine.id, orgId: org.id, type: 'sender_published', payload: { senderName: 'A' } },
      { userId: mine.id, orgId: org.id, type: 'seat_warning', payload: { activeSeats: 3 } },
      { userId: other.id, orgId: org.id, type: 'sender_published', payload: { senderName: 'B' } },
    ],
  });
  const rows = await listInbox(mine.id);
  return { mine, other, rows };
}

describe('inbox actions', () => {
  test('marking read and unread round-trips', async () => {
    const { mine, rows } = await scene();
    expect(await unreadCount(mine.id)).toBe(2);

    expect(await setRead(mine.id, [rows[0]!.id], true)).toBe(1);
    expect(await unreadCount(mine.id)).toBe(1);

    expect(await setRead(mine.id, [rows[0]!.id], false)).toBe(1);
    expect(await unreadCount(mine.id)).toBe(2);
  });

  test("another user's notification cannot be marked or deleted", async () => {
    const { mine, other } = await scene();
    const theirs = await listInbox(other.id);
    expect(theirs).toHaveLength(1);

    // Sahiplik where'in içinde: 0 satır etkilenir, hata da fırlamaz.
    expect(await setRead(mine.id, [theirs[0]!.id], true)).toBe(0);
    expect(await removeNotifications(mine.id, [theirs[0]!.id])).toBe(0);
    expect(await listInbox(other.id)).toHaveLength(1);
    expect((await listInbox(other.id))[0]?.readAt).toBeNull();
  });

  test('deleting removes only the selected rows', async () => {
    const { mine, rows } = await scene();
    expect(await removeNotifications(mine.id, [rows[0]!.id])).toBe(1);
    const left = await listInbox(mine.id);
    expect(left).toHaveLength(1);
    expect(left[0]?.id).toBe(rows[1]!.id);
  });

  test('clearing read keeps the unread ones', async () => {
    const { mine, rows } = await scene();
    await setRead(mine.id, [rows[0]!.id], true);

    expect(await removeReadNotifications(mine.id)).toBe(1);

    const left = await listInbox(mine.id);
    expect(left).toHaveLength(1);
    expect(left[0]?.readAt).toBeNull();
  });

  test('the unread filter narrows the list', async () => {
    const { mine, rows } = await scene();
    await setRead(mine.id, [rows[0]!.id], true);

    expect(await listInbox(mine.id, { unreadOnly: true })).toHaveLength(1);
    expect(await listInbox(mine.id)).toHaveLength(2);
  });

  test('an empty id list is a no-op, not a mass update', async () => {
    const { mine } = await scene();
    expect(await setRead(mine.id, [], true)).toBe(0);
    expect(await removeNotifications(mine.id, [])).toBe(0);
    expect(await unreadCount(mine.id)).toBe(2);
    expect(await listInbox(mine.id)).toHaveLength(2);
  });
});
