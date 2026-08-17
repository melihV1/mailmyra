/**
 * Bildirim tercihleri (2026-08-15). Sınanan kurallar: satır yoksa varsayılan
 * AÇIK (opt-out), kapatınca zile satır YAZILMAZ, e-posta kanalı ayrı çalışır
 * (biri kapalıyken diğeri sürer), tercih kullanıcıya özeldir.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { MemoryMailer } from '../lib/mail';
import {
  filterByPreference,
  getPreferences,
  savePreferences,
} from '../lib/repo/notification-prefs';
import { listNotifications } from '../lib/repo/notifications';
import { publishSender } from '../lib/repo/senders';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

/** Yayınlayan + izleyen iki owner: bildirim eylemi yapana gitmez. */
async function scene() {
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats: 2 } });
  const actor = await prisma.user.create({ data: { email: 'actor@voldi.net', passwordHash: 'x' } });
  const watcher = await prisma.user.create({
    data: { email: 'watcher@voldi.net', passwordHash: 'x' },
  });
  await prisma.membership.createMany({
    data: [
      { userId: actor.id, orgId: org.id, role: 'owner' },
      { userId: watcher.id, orgId: org.id, role: 'owner' },
    ],
  });
  const sender = await prisma.senderIdentity.create({
    data: { orgId: org.id, displayName: 'Ayşe', email: 'ayse@voldi.net' },
  });
  return { org, actor, watcher, sender };
}

describe('preferences', () => {
  test('defaults are on when no row exists', async () => {
    const { watcher } = await scene();
    const prefs = await getPreferences(watcher.id);
    expect(prefs).toHaveLength(3);
    expect(prefs.every((p) => p.inApp && p.email)).toBe(true);
  });

  test('saving keeps unknown types out of the table', async () => {
    const { watcher } = await scene();
    await savePreferences(watcher.id, [
      { type: 'sender_published', inApp: false, email: true },
      { type: 'not_a_real_type', inApp: false, email: false },
    ]);
    const rows = await prisma.notificationPreference.findMany({ where: { userId: watcher.id } });
    expect(rows.map((r) => r.type)).toEqual(['sender_published']);
  });

  test('saving twice updates in place (no duplicate rows)', async () => {
    const { watcher } = await scene();
    await savePreferences(watcher.id, [{ type: 'seat_warning', inApp: false, email: false }]);
    await savePreferences(watcher.id, [{ type: 'seat_warning', inApp: true, email: false }]);
    const rows = await prisma.notificationPreference.findMany({ where: { userId: watcher.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ inApp: true, email: false });
  });

  test('filterByPreference keeps users without a row, drops those who opted out', async () => {
    const { actor, watcher } = await scene();
    await savePreferences(watcher.id, [
      { type: 'sender_published', inApp: false, email: true },
    ]);

    expect(await filterByPreference([actor.id, watcher.id], 'sender_published', 'inApp')).toEqual([
      actor.id,
    ]);
    // E-posta kanalı ayrı: zili kapatmak maili kapatmaz.
    expect(
      (await filterByPreference([actor.id, watcher.id], 'sender_published', 'email')).sort(),
    ).toEqual([actor.id, watcher.id].sort());
  });
});

describe('enforcement', () => {
  test('a muted watcher gets no notification row when a sender is published', async () => {
    const { actor, watcher, sender } = await scene();
    await savePreferences(watcher.id, [{ type: 'sender_published', inApp: false, email: true }]);

    const decision = await publishSender(sender.id, new MemoryMailer(), actor.id);
    expect(decision.allowed).toBe(true);

    expect(await listNotifications(watcher.id)).toHaveLength(0);
    // Eylemi yapan zaten dışlanıyor — kural değişmedi.
    expect(await listNotifications(actor.id)).toHaveLength(0);
  });

  test('an un-muted watcher still gets the row (preferences are per user)', async () => {
    const { actor, watcher, sender } = await scene();
    const decision = await publishSender(sender.id, new MemoryMailer(), actor.id);
    expect(decision.allowed).toBe(true);

    const rows = await listNotifications(watcher.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.type).toBe('sender_published');
  });

  test('seat-warning e-mail respects the e-mail switch', async () => {
    const { org, actor, watcher } = await scene();
    // Tek koltuk: ilk publish %80 çizgisini aşar ve uyarı üretir.
    await prisma.organization.update({ where: { id: org.id }, data: { entitledSeats: 1 } });
    await savePreferences(watcher.id, [{ type: 'seat_warning', inApp: true, email: false }]);
    const solo = await prisma.senderIdentity.create({
      data: { orgId: org.id, displayName: 'Tek', email: 'tek@voldi.net' },
    });

    const mailer = new MemoryMailer();
    const decision = await publishSender(solo.id, mailer, actor.id);
    expect(decision.allowed).toBe(true);

    // Kapatan owner'a mail YOK, kapatmayan owner'a VAR.
    const recipients = mailer.sent.map((m) => m.to);
    expect(recipients).toContain(actor.email);
    expect(recipients).not.toContain(watcher.email);
  });
});
