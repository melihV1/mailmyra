/**
 * Panel bildirimleri — zilin arkasındaki tablo (karar 2026-08-13).
 *
 * Sınanan dikişler: kime yazılır (owner+admin, eylemci hariç), publish ve
 * davet kabulü hangi kayıtları düşürür, okundu işaretleme rozeti sıfırlar.
 * Eşik/koltuk mekaniği burada SINANMAZ (publish.test.ts / seat-warning.test.ts).
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { MemoryMailer } from '../lib/mail';
import { hashToken } from '../lib/auth/token';
import { acceptInvitation } from '../lib/repo/members';
import {
  listNotifications,
  markAllRead,
  notifyOrgManagers,
  unreadCount,
} from '../lib/repo/notifications';
import { publishSender } from '../lib/repo/senders';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

const org = (name = 'Voldi', entitledSeats = 5) =>
  prisma.organization.create({ data: { name, entitledSeats } });

async function memberOf(orgId: string, email: string, role: 'owner' | 'admin' | 'editor') {
  const user = await prisma.user.create({ data: { email, passwordHash: 'x' } });
  await prisma.membership.create({ data: { userId: user.id, orgId, role } });
  return user;
}

describe('notifyOrgManagers', () => {
  test('writes to owners and admins, skips members and the actor', async () => {
    const o = await org();
    const owner = await memberOf(o.id, 'sahip@voldi.net', 'owner');
    const admin = await memberOf(o.id, 'yonetici@voldi.net', 'admin');
    const member = await memberOf(o.id, 'uye@voldi.net', 'editor');

    await notifyOrgManagers({
      orgId: o.id,
      type: 'sender_published',
      payload: { senderName: 'Ayşe' },
      excludeUserId: admin.id, // eylemi yapan
    });

    expect(await unreadCount(owner.id)).toBe(1);
    expect(await unreadCount(admin.id)).toBe(0);
    expect(await unreadCount(member.id)).toBe(0);

    const rows = await listNotifications(owner.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.type).toBe('sender_published');
    expect(rows[0]!.payload).toEqual({ senderName: 'Ayşe' });
    expect(rows[0]!.readAt).toBeNull();
  });
});

describe('producers', () => {
  test('publish drops sender_published for other managers, not the actor', async () => {
    const o = await org();
    const owner = await memberOf(o.id, 'sahip@voldi.net', 'owner');
    const admin = await memberOf(o.id, 'yonetici@voldi.net', 'admin');
    const s = await prisma.senderIdentity.create({
      data: { orgId: o.id, displayName: 'Ayşe Yılmaz', email: 'ayse@voldi.net' },
    });

    const r = await publishSender(s.id, new MemoryMailer(), admin.id);
    expect(r.allowed).toBe(true);

    expect(await unreadCount(admin.id)).toBe(0);
    const rows = await listNotifications(owner.id);
    expect(rows.map((n) => n.type)).toEqual(['sender_published']);
    expect(rows[0]!.payload.senderName).toBe('Ayşe Yılmaz');
  });

  test('crossing the 80% line also drops seat_warning', async () => {
    const o = await org('Voldi', 2); // 2 koltukta 2. publish çizgiyi geçer
    const owner = await memberOf(o.id, 'sahip@voldi.net', 'owner');
    for (const email of ['a@voldi.net', 'b@voldi.net']) {
      const s = await prisma.senderIdentity.create({
        data: { orgId: o.id, displayName: email, email },
      });
      const r = await publishSender(s.id, new MemoryMailer());
      if (!r.allowed) throw new Error('kurgu hatası: publish reddedildi');
    }

    const types = (await listNotifications(owner.id)).map((n) => n.type);
    expect(types.filter((t) => t === 'sender_published')).toHaveLength(2);
    expect(types.filter((t) => t === 'seat_warning')).toHaveLength(1);
  });

  test('accepting an invitation notifies managers, not the acceptor', async () => {
    const o = await org();
    const owner = await memberOf(o.id, 'sahip@voldi.net', 'owner');
    const invitee = await prisma.user.create({
      data: { email: 'davetli@voldi.net', passwordHash: 'x' },
    });
    await prisma.invitation.create({
      data: {
        orgId: o.id,
        email: 'davetli@voldi.net',
        role: 'editor',
        tokenHash: hashToken('davet-tokeni'),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const r = await acceptInvitation('davet-tokeni', invitee.id);
    expect(r.ok).toBe(true);

    expect(await unreadCount(invitee.id)).toBe(0);
    const rows = await listNotifications(owner.id);
    expect(rows.map((n) => n.type)).toEqual(['invitation_accepted']);
    expect(rows[0]!.payload).toEqual({ email: 'davetli@voldi.net', role: 'editor' });
  });
});

describe('read state', () => {
  test('markAllRead zeroes the badge but keeps the rows', async () => {
    const o = await org();
    const owner = await memberOf(o.id, 'sahip@voldi.net', 'owner');
    await notifyOrgManagers({ orgId: o.id, type: 'seat_warning', payload: {} });
    await notifyOrgManagers({ orgId: o.id, type: 'seat_warning', payload: {} });
    expect(await unreadCount(owner.id)).toBe(2);

    await markAllRead(owner.id);

    expect(await unreadCount(owner.id)).toBe(0);
    const rows = await listNotifications(owner.id);
    expect(rows).toHaveLength(2);
    expect(rows.every((n) => n.readAt !== null)).toBe(true);
  });
});
