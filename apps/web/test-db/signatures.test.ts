/**
 * İmza deposu. Yetki kuralı `packages/core`'dan geliyor; burada sınanan şey
 * o kuralın veri erişiminde gerçekten uygulandığı — viewer yazamaz, başka
 * org'un üyesi dokunamaz.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import {
  deleteSignature,
  duplicateSignature,
  listSignatures,
  saveSignature,
} from '../lib/repo/signatures';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

async function member(role: 'owner' | 'editor' | 'viewer', email: string, orgName = 'Voldi') {
  const user = await prisma.user.create({ data: { email, passwordHash: 'x' } });
  const org = await prisma.organization.create({ data: { name: orgName } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role } });
  return { userId: user.id, orgId: org.id };
}

const DATA = { identity: { fullName: 'Ali Veli' }, layout: { templateId: 'classic-horizontal' } };

describe('saving', () => {
  test('an editor creates a signature in their org', async () => {
    const { userId, orgId } = await member('editor', 'ali@voldi.net');

    const result = await saveSignature(userId, { orgId, name: 'İş imzam', data: DATA });

    if (!result.ok) throw new Error(result.reason);
    const rows = await listSignatures(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('İş imzam');
  });

  test('saving again with an id updates instead of duplicating', async () => {
    const { userId, orgId } = await member('editor', 'ali@voldi.net');
    const first = await saveSignature(userId, { orgId, name: 'İlk', data: DATA });
    if (!first.ok) throw new Error('unreachable');

    const second = await saveSignature(userId, {
      id: first.id,
      orgId,
      name: 'Güncel',
      data: { ...DATA, x: 1 },
    });

    expect(second.ok).toBe(true);
    const rows = await listSignatures(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe('Güncel');
  });

  test('a viewer cannot save — the matrix is enforced here, not in the UI', async () => {
    const { userId, orgId } = await member('viewer', 'ali@voldi.net');

    const result = await saveSignature(userId, { orgId, name: 'X', data: DATA });

    expect(result).toEqual({ ok: false, reason: 'forbidden' });
    expect(await prisma.signature.count()).toBe(0);
  });

  test('a member of another org cannot write into this one', async () => {
    const home = await member('owner', 'ali@voldi.net', 'A');
    const stranger = await member('owner', 'yabanci@baska.net', 'B');

    const result = await saveSignature(stranger.userId, {
      orgId: home.orgId,
      name: 'Sızma',
      data: DATA,
    });

    expect(result).toEqual({ ok: false, reason: 'forbidden' });
  });

  test('updating a signature that lives in someone else’s org is refused', async () => {
    const home = await member('owner', 'ali@voldi.net', 'A');
    const mine = await saveSignature(home.userId, { orgId: home.orgId, name: 'Benim', data: DATA });
    if (!mine.ok) throw new Error('unreachable');
    const stranger = await member('owner', 'yabanci@baska.net', 'B');

    const result = await saveSignature(stranger.userId, {
      id: mine.id,
      orgId: stranger.orgId, // kendi org'unu söylüyor ama imza onun değil
      name: 'Çalıntı',
      data: DATA,
    });

    expect(result).toEqual({ ok: false, reason: 'not_found' });
    expect((await listSignatures(home.userId))[0]?.name).toBe('Benim');
  });
});

describe('deleting and duplicating', () => {
  test('delete removes the row; the CDN images stay by design', async () => {
    const { userId, orgId } = await member('owner', 'ali@voldi.net');
    const saved = await saveSignature(userId, { orgId, name: 'Silinecek', data: DATA });
    if (!saved.ok) throw new Error('unreachable');

    expect(await deleteSignature(userId, saved.id)).toEqual({ ok: true });
    expect(await listSignatures(userId)).toHaveLength(0);
  });

  test('a viewer cannot delete', async () => {
    const owner = await member('owner', 'sahip@voldi.net');
    const saved = await saveSignature(owner.userId, {
      orgId: owner.orgId,
      name: 'Korunan',
      data: DATA,
    });
    if (!saved.ok) throw new Error('unreachable');
    const viewer = await prisma.user.create({
      data: { email: 'izleyici@voldi.net', passwordHash: 'x' },
    });
    await prisma.membership.create({
      data: { userId: viewer.id, orgId: owner.orgId, role: 'viewer' },
    });

    expect(await deleteSignature(viewer.id, saved.id)).toEqual({ ok: false, reason: 'forbidden' });
    expect(await listSignatures(owner.userId)).toHaveLength(1);
  });

  test('duplicate copies data under a new name and never the sender link', async () => {
    const { userId, orgId } = await member('editor', 'ali@voldi.net');
    const sender = await prisma.senderIdentity.create({
      data: { orgId, displayName: 'Ali', email: 'ali@voldi.net' },
    });
    const saved = await saveSignature(userId, { orgId, name: 'Asıl', data: DATA });
    if (!saved.ok) throw new Error('unreachable');
    await prisma.signature.update({
      where: { id: saved.id },
      data: { senderIdentityId: sender.id },
    });

    const copy = await duplicateSignature(userId, saved.id);

    if (!copy.ok) throw new Error(copy.reason);
    const rows = await prisma.signature.findMany({ orderBy: { name: 'asc' } });
    expect(rows).toHaveLength(2);
    const dup = rows.find((r) => r.id === copy.id);
    expect(dup?.name).toBe('Asıl (copy)');
    // Kopya göndericiye bağlanmaz: bağlansaydı çoğaltmak koltuk davranışını
    // sessizce etkilerdi.
    expect(dup?.senderIdentityId).toBeNull();
    expect(dup?.data).toEqual(rows.find((r) => r.id === saved.id)?.data);
  });
});

describe('listing', () => {
  test('only the caller’s orgs appear', async () => {
    const a = await member('owner', 'ali@voldi.net', 'A');
    const b = await member('owner', 'baska@firma.net', 'B');
    await saveSignature(a.userId, { orgId: a.orgId, name: 'A imza', data: DATA });
    await saveSignature(b.userId, { orgId: b.orgId, name: 'B imza', data: DATA });

    const seen = await listSignatures(a.userId);

    expect(seen).toHaveLength(1);
    expect(seen[0]?.name).toBe('A imza');
  });
});
