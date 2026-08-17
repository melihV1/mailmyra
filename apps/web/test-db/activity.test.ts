/**
 * Denetim günlüğü (2026-08-15). Sınanan kurallar: gerçek akışlar satır yazar,
 * silinen hedefin adı payload'da YAŞAR, görme hakkı member:manage, günlük
 * org kapsamlıdır ve yazıcı hata yutar (akış devrilmez).
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { MemoryMailer } from '../lib/mail';
import { listActivityAs, recordActivity } from '../lib/repo/activity';
import {
  createSender,
  deactivateSenderAs,
  deleteSenderAs,
  publishSender,
} from '../lib/repo/senders';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

async function scene(role: 'owner' | 'admin' | 'editor' = 'owner') {
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats: 3 } });
  const user = await prisma.user.create({ data: { email: `${role}@voldi.net`, passwordHash: 'x' } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role } });
  return { org, user };
}

describe('recording', () => {
  test('the sender lifecycle leaves a readable trail', async () => {
    const { user } = await scene();
    const created = await createSender(user.id, { displayName: 'Ayşe', email: 'ayse@voldi.net' });
    if (!created.ok) throw new Error(created.reason);

    const pub = await publishSender(created.id, new MemoryMailer(), user.id);
    expect(pub.allowed).toBe(true);
    expect(await deactivateSenderAs(user.id, created.id)).toEqual({ ok: true });
    expect(await deleteSenderAs(user.id, created.id)).toEqual({ ok: true });

    const rows = await listActivityAs(user.id);
    expect(rows?.map((r) => r.type)).toEqual([
      'sender.deleted',
      'sender.deactivated',
      'sender.published',
      'sender.created',
    ]);
    // Aktör e-postası çözülüyor, hedefin adı silinmeye rağmen okunabiliyor.
    expect(rows?.[0]?.actorEmail).toBe('owner@voldi.net');
    expect(rows?.[0]?.payload.senderName).toBe('Ayşe');
  });

  test('a deleted actor leaves the row standing (SetNull, not cascade)', async () => {
    const { org, user } = await scene();
    await recordActivity({
      orgId: org.id,
      actorUserId: user.id,
      type: 'brand.saved',
      payload: { lockedFields: 2 },
    });
    const other = await prisma.user.create({ data: { email: 'ikinci@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: other.id, orgId: org.id, role: 'owner' } });

    await prisma.user.delete({ where: { id: user.id } });

    const rows = await listActivityAs(other.id);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.type).toBe('brand.saved');
    expect(rows?.[0]?.actorEmail).toBeNull();
  });

  test('a bad write is swallowed — the caller is never taken down', async () => {
    // Var olmayan org: FK patlar, recordActivity yutmalı.
    await expect(
      recordActivity({ orgId: 'yok-boyle-org', type: 'brand.saved', payload: {} }),
    ).resolves.toBeUndefined();
  });
});

describe('reading', () => {
  test('an editor cannot read the log', async () => {
    const { user } = await scene('editor');
    expect(await listActivityAs(user.id)).toBeNull();
  });

  test('an admin can; the log is org-scoped', async () => {
    const mine = await scene('admin');
    await recordActivity({
      orgId: mine.org.id,
      actorUserId: mine.user.id,
      type: 'export.zip',
      payload: { fileCount: 2, senderCount: 2 },
    });

    const other = await prisma.organization.create({ data: { name: 'Rakip' } });
    await recordActivity({ orgId: other.id, type: 'export.zip', payload: { fileCount: 99 } });

    const rows = await listActivityAs(mine.user.id);
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.payload.fileCount).toBe(2);
  });

  test('the type filter narrows without hiding the rest permanently', async () => {
    const { org, user } = await scene();
    await recordActivity({ orgId: org.id, actorUserId: user.id, type: 'brand.saved', payload: {} });
    await recordActivity({
      orgId: org.id,
      actorUserId: user.id,
      type: 'export.zip',
      payload: { fileCount: 1, senderCount: 1 },
    });

    expect(await listActivityAs(user.id, { type: 'export.zip' })).toHaveLength(1);
    expect(await listActivityAs(user.id)).toHaveLength(2);
  });
});
