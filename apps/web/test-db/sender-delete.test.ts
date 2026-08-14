/**
 * Gönderici silme (2026-08-15). Sınanan kurallar: canlı silinemez (koltuk
 * muhasebesi silmeyle pas geçilmez), imzalar SetNull'la hayatta kalır,
 * yetki sender:manage, yabancı org'a not_found.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { MemoryMailer } from '../lib/mail';
import { deleteSenderAs, getSenderAs, publishSender } from '../lib/repo/senders';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

async function scene(role: 'owner' | 'editor' = 'owner') {
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats: 3 } });
  const user = await prisma.user.create({ data: { email: `${role}@voldi.net`, passwordHash: 'x' } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role } });
  const sender = await prisma.senderIdentity.create({
    data: { orgId: org.id, displayName: 'Ayşe', email: 'ayse@voldi.net' },
  });
  return { org, user, sender };
}

describe('deleteSenderAs', () => {
  test('deletes a draft; assigned signatures survive unassigned', async () => {
    const { org, user, sender } = await scene();
    const sig = await prisma.signature.create({
      data: { orgId: org.id, senderIdentityId: sender.id, name: 'İmza', data: {} },
    });

    const r = await deleteSenderAs(user.id, sender.id);

    expect(r).toEqual({ ok: true });
    expect(await prisma.senderIdentity.findUnique({ where: { id: sender.id } })).toBeNull();
    const fresh = await prisma.signature.findUniqueOrThrow({ where: { id: sig.id } });
    expect(fresh.senderIdentityId).toBeNull(); // SetNull: emek göndericiyle gitmedi
  });

  test('a live sender is refused with is_live', async () => {
    const { user, sender } = await scene();
    const pub = await publishSender(sender.id, new MemoryMailer(), user.id);
    expect(pub.allowed).toBe(true);

    const r = await deleteSenderAs(user.id, sender.id);

    expect(r).toEqual({ ok: false, reason: 'is_live' });
    expect(await prisma.senderIdentity.findUnique({ where: { id: sender.id } })).not.toBeNull();
  });

  test('editor lacks sender:manage', async () => {
    const { user, sender } = await scene('editor');
    expect(await deleteSenderAs(user.id, sender.id)).toEqual({
      ok: false,
      reason: 'forbidden',
    });
  });

  test('a stranger sees not_found — no existence leak (getSenderAs matches)', async () => {
    const { sender } = await scene();
    const outsider = await prisma.user.create({
      data: { email: 'yabanci@voldi.net', passwordHash: 'x' },
    });
    expect(await deleteSenderAs(outsider.id, sender.id)).toEqual({
      ok: false,
      reason: 'not_found',
    });
    expect(await getSenderAs(outsider.id, sender.id)).toBeNull();
  });
});
