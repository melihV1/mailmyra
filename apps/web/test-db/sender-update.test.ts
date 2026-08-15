/**
 * Gönderici düzenleme (2026-08-14). Sınanan kurallar: ad/ünvan her durumda
 * değişir; canlı göndericide e-posta KİLİTLİ (koltuk kimliği), pasifte
 * serbest; org içi UNIQUE e-posta email_taken; yetki sender:manage;
 * yabancıya not_found.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { MemoryMailer } from '../lib/mail';
import { deactivateSender, publishSender, updateSenderAs } from '../lib/repo/senders';
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
    data: { orgId: org.id, displayName: 'Ayşe', email: 'ayse@voldi.net', jobTitle: 'Designer' },
  });
  return { org, user, sender };
}

describe('updateSenderAs', () => {
  test('updates name, e-mail and job title on a draft; e-mail is normalised', async () => {
    const { user, sender } = await scene();

    const r = await updateSenderAs(user.id, sender.id, {
      displayName: '  Ayşe Yılmaz ',
      email: ' AYSE.YILMAZ@Voldi.NET ',
      jobTitle: '  Art Director ',
    });

    expect(r).toEqual({ ok: true });
    const fresh = await prisma.senderIdentity.findUniqueOrThrow({ where: { id: sender.id } });
    expect(fresh.displayName).toBe('Ayşe Yılmaz');
    expect(fresh.email).toBe('ayse.yilmaz@voldi.net');
    expect(fresh.jobTitle).toBe('Art Director');
  });

  test('empty job title clears the column', async () => {
    const { user, sender } = await scene();
    const r = await updateSenderAs(user.id, sender.id, {
      displayName: 'Ayşe',
      email: 'ayse@voldi.net',
      jobTitle: '   ',
    });
    expect(r).toEqual({ ok: true });
    const fresh = await prisma.senderIdentity.findUniqueOrThrow({ where: { id: sender.id } });
    expect(fresh.jobTitle).toBeNull();
  });

  test('a live sender may change name but not e-mail (email_locked)', async () => {
    const { user, sender } = await scene();
    const pub = await publishSender(sender.id, new MemoryMailer(), user.id);
    expect(pub.allowed).toBe(true);

    const renamed = await updateSenderAs(user.id, sender.id, {
      displayName: 'Ayşe Yılmaz',
      email: 'ayse@voldi.net', // aynı adres — serbest
    });
    expect(renamed).toEqual({ ok: true });

    const swapped = await updateSenderAs(user.id, sender.id, {
      displayName: 'Ayşe Yılmaz',
      email: 'baskasi@voldi.net',
    });
    expect(swapped).toEqual({ ok: false, reason: 'email_locked' });
    const fresh = await prisma.senderIdentity.findUniqueOrThrow({ where: { id: sender.id } });
    expect(fresh.email).toBe('ayse@voldi.net');
  });

  test('after deactivation the e-mail may change again', async () => {
    const { user, sender } = await scene();
    const pub = await publishSender(sender.id, new MemoryMailer(), user.id);
    expect(pub.allowed).toBe(true);
    await deactivateSender(sender.id);

    const r = await updateSenderAs(user.id, sender.id, {
      displayName: 'Ayşe',
      email: 'yeni@voldi.net',
    });
    expect(r).toEqual({ ok: true });
  });

  test("another sender's address in the same org is email_taken", async () => {
    const { org, user, sender } = await scene();
    await prisma.senderIdentity.create({
      data: { orgId: org.id, displayName: 'Mehmet', email: 'mehmet@voldi.net' },
    });

    const r = await updateSenderAs(user.id, sender.id, {
      displayName: 'Ayşe',
      email: 'mehmet@voldi.net',
    });
    expect(r).toEqual({ ok: false, reason: 'email_taken' });
  });

  test('editor lacks sender:manage', async () => {
    const { user, sender } = await scene('editor');
    expect(
      await updateSenderAs(user.id, sender.id, { displayName: 'X', email: 'x@voldi.net' }),
    ).toEqual({ ok: false, reason: 'forbidden' });
  });

  test('a stranger sees not_found — no existence leak', async () => {
    const { sender } = await scene();
    const outsider = await prisma.user.create({
      data: { email: 'yabanci@voldi.net', passwordHash: 'x' },
    });
    expect(
      await updateSenderAs(outsider.id, sender.id, { displayName: 'X', email: 'x@voldi.net' }),
    ).toEqual({ ok: false, reason: 'not_found' });
  });
});
