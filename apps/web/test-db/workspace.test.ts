/**
 * Çalışma alanı yeniden adlandırma (2026-08-14). Sınanan: yetki sınırı
 * (owner/admin evet, editor hayır), ad doğrulama (boş/uzun), kırpma.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { getWorkspace, renameWorkspaceAs } from '../lib/repo/members';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

async function orgWith(role: 'owner' | 'admin' | 'editor') {
  const org = await prisma.organization.create({ data: { name: 'Workspace', entitledSeats: 3 } });
  const user = await prisma.user.create({
    data: { email: `${role}@voldi.net`, passwordHash: 'x' },
  });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role } });
  return { org, user };
}

describe('renameWorkspaceAs', () => {
  test('owner renames; the new name is trimmed and visible via getWorkspace', async () => {
    const { org, user } = await orgWith('owner');

    const r = await renameWorkspaceAs(user.id, '  Voldi Creative  ');

    expect(r).toEqual({ ok: true });
    const fresh = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(fresh.name).toBe('Voldi Creative');
    expect(await getWorkspace(user.id)).toEqual({ id: org.id, name: 'Voldi Creative' });
  });

  test('admin can rename too', async () => {
    const { user } = await orgWith('admin');
    expect(await renameWorkspaceAs(user.id, 'Yeni Ad')).toEqual({ ok: true });
  });

  test('editor is refused and nothing changes', async () => {
    const { org, user } = await orgWith('editor');

    const r = await renameWorkspaceAs(user.id, 'Korsan Ad');

    expect(r).toEqual({ ok: false, reason: 'forbidden' });
    const fresh = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(fresh.name).toBe('Workspace');
  });

  test('empty and oversize names are rejected before touching the database', async () => {
    const { user } = await orgWith('owner');
    expect(await renameWorkspaceAs(user.id, '   ')).toEqual({
      ok: false,
      reason: 'invalid_name',
    });
    expect(await renameWorkspaceAs(user.id, 'a'.repeat(256))).toEqual({
      ok: false,
      reason: 'invalid_name',
    });
  });
});
