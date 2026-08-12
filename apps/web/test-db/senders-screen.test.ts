/**
 * Göndericiler ekranının veri katmanı. Koltuk mekaniği publish.test.ts'te
 * kanıtlı; burada sınanan şey ROL sargısı — kim ekleyebilir, kim yayına
 * alabilir — ve ekranın okuduğu özet.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { MemoryMailer } from '../lib/mail';
import {
  bulkCreateSenders,
  createSender,
  deactivateSenderAs,
  listSenders,
  publishSenderAs,
  seatSummary,
} from '../lib/repo/senders';
import { truncateAll } from './helpers';

/** Bu dosyanın konusu rol sargısı; mailin kendisi seat-warning.test.ts'te sınanır. */
const mail = new MemoryMailer();

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

async function member(role: 'owner' | 'admin' | 'editor' | 'viewer', seats = 3) {
  const user = await prisma.user.create({
    data: { email: `${role}@voldi.net`, passwordHash: 'x' },
  });
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats: seats } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role } });
  return { userId: user.id, orgId: org.id };
}

describe('creating a sender', () => {
  test('an admin creates a draft that costs nothing', async () => {
    const { userId } = await member('admin');

    const result = await createSender(userId, { displayName: 'Ali', email: 'ali@voldi.net' });

    if (!result.ok) throw new Error(result.reason);
    const rows = await listSenders(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ displayName: 'Ali', status: 'draft' });
    expect((await seatSummary(userId)).active).toBe(0);
  });

  test('an editor cannot — the matrix draws the line at sender:manage', async () => {
    const { userId } = await member('editor');
    expect(await createSender(userId, { displayName: 'X', email: 'x@voldi.net' })).toEqual({
      ok: false,
      reason: 'forbidden',
    });
  });

  test('the same address twice in one org is refused by name', async () => {
    const { userId } = await member('owner');
    await createSender(userId, { displayName: 'Ali', email: 'ali@voldi.net' });

    expect(
      await createSender(userId, { displayName: 'Ali 2', email: 'Ali@VOLDI.net' }),
    ).toEqual({ ok: false, reason: 'email_taken' });
  });
});

describe('publish and deactivate through the role wrapper', () => {
  test('the full loop: publish consumes, deactivate frees, summary tracks', async () => {
    const { userId } = await member('owner', 1);
    const s = await createSender(userId, { displayName: 'Ali', email: 'ali@voldi.net' });
    if (!s.ok) throw new Error('unreachable');

    expect(await publishSenderAs(userId, s.id, mail)).toEqual({ allowed: true });
    expect(await seatSummary(userId)).toEqual({ active: 1, entitled: 1 });
    expect((await listSenders(userId))[0]?.status).toBe('active');

    expect(await deactivateSenderAs(userId, s.id)).toEqual({ ok: true });
    expect((await seatSummary(userId)).active).toBe(0);
    expect((await listSenders(userId))[0]?.status).toBe('inactive');
  });

  test('a viewer can neither publish nor deactivate', async () => {
    const owner = await member('owner');
    const s = await createSender(owner.userId, { displayName: 'Ali', email: 'a@voldi.net' });
    if (!s.ok) throw new Error('unreachable');
    const viewer = await prisma.user.create({ data: { email: 'v@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({
      data: { userId: viewer.id, orgId: owner.orgId, role: 'viewer' },
    });

    expect(await publishSenderAs(viewer.id, s.id, mail)).toEqual({
      allowed: false,
      reason: 'forbidden',
    });
    expect(await deactivateSenderAs(viewer.id, s.id)).toEqual({ ok: false, reason: 'forbidden' });
  });

  test("an outsider gets not_found — the sender's existence is not admitted", async () => {
    const home = await member('owner');
    const s = await createSender(home.userId, { displayName: 'Ali', email: 'a@voldi.net' });
    if (!s.ok) throw new Error('unreachable');
    const stranger = await member('admin');

    expect(await publishSenderAs(stranger.userId, s.id, mail)).toEqual({
      allowed: false,
      reason: 'not_found',
    });
  });

  test('the cap still bites through the wrapper', async () => {
    const { userId } = await member('owner', 1);
    const a = await createSender(userId, { displayName: 'A', email: 'a@voldi.net' });
    const b = await createSender(userId, { displayName: 'B', email: 'b@voldi.net' });
    if (!a.ok || !b.ok) throw new Error('unreachable');
    await publishSenderAs(userId, a.id, mail);

    expect(await publishSenderAs(userId, b.id, mail)).toEqual({
      allowed: false,
      reason: 'seat_limit',
    });
  });
});

describe('bulk import', () => {
  test('rows land as drafts; the seat counter does not move', async () => {
    const { userId } = await member('admin', 1); // tavan 1 — umursamamalı
    const rows = Array.from({ length: 8 }, (_, i) => ({
      displayName: `Kişi ${i}`,
      email: `kisi${i}@voldi.net`,
    }));

    const result = await bulkCreateSenders(userId, rows);

    if (!result.ok) throw new Error(result.reason);
    expect(result.created).toBe(8);
    expect(result.skipped).toEqual([]);
    expect((await seatSummary(userId)).active).toBe(0); // taslak koltuk yemez
    expect(await listSenders(userId)).toHaveLength(8);
  });

  test('existing addresses are skipped by name, the rest still land', async () => {
    const { userId } = await member('owner');
    await createSender(userId, { displayName: 'Var Olan', email: 'mevcut@voldi.net' });

    const result = await bulkCreateSenders(userId, [
      { displayName: 'Mevcut Tekrar', email: 'MEVCUT@voldi.net' },
      { displayName: 'Yeni', email: 'yeni@voldi.net' },
    ]);

    if (!result.ok) throw new Error(result.reason);
    expect(result.created).toBe(1);
    expect(result.skipped).toEqual(['mevcut@voldi.net']);
    expect(await listSenders(userId)).toHaveLength(2);
  });

  test('an editor cannot bulk import — same line as single add', async () => {
    const { orgId } = await member('owner');
    const editor = await prisma.user.create({ data: { email: 'ed@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: editor.id, orgId, role: 'editor' } });

    expect(await bulkCreateSenders(editor.id, [{ displayName: 'X', email: 'x@voldi.net' }])).toEqual(
      { ok: false, reason: 'forbidden' },
    );
  });
});
