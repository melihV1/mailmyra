/**
 * Marka deposu: rol kapısı + org başına tek satır. Bindirmenin uçtan uca
 * kanıtı Task 4'ün export testinde.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { getBrand, saveBrandAs } from '../lib/repo/brand';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

let n = 0;
async function member(role: 'owner' | 'admin' | 'editor' | 'viewer') {
  const user = await prisma.user.create({
    data: { email: `uye${++n}@voldi.net`, passwordHash: 'x' },
  });
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats: 5 } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role } });
  return { userId: user.id, orgId: org.id };
}

const DOC = { brandColor: { value: '#7b9fd3', mode: 'locked' as const } };

describe('saveBrandAs', () => {
  test('an owner saves; getBrand reads the same document back', async () => {
    const { userId, orgId } = await member('owner');
    expect(await saveBrandAs(userId, DOC)).toEqual({ ok: true });
    expect(await getBrand(orgId)).toEqual(DOC);
  });

  test('an admin passes, editor and viewer are refused — the matrix line', async () => {
    const admin = await member('admin');
    expect(await saveBrandAs(admin.userId, DOC)).toEqual({ ok: true });
    const editor = await member('editor');
    expect(await saveBrandAs(editor.userId, DOC)).toEqual({ ok: false, reason: 'forbidden' });
    const viewer = await member('viewer');
    expect(await saveBrandAs(viewer.userId, DOC)).toEqual({ ok: false, reason: 'forbidden' });
  });

  test('a second save updates the single row instead of adding one', async () => {
    const { userId, orgId } = await member('owner');
    await saveBrandAs(userId, DOC);
    await saveBrandAs(userId, { textColor: { value: '#333333', mode: 'default' } });

    expect(await prisma.brandSetting.count({ where: { orgId } })).toBe(1);
    const doc = await getBrand(orgId);
    expect(doc?.textColor?.value).toBe('#333333');
    expect(doc?.brandColor).toBeUndefined(); // belge BÜTÜN olarak değişir
  });
});

describe('getBrand', () => {
  test('returns null when the org has no brand record', async () => {
    const { orgId } = await member('owner');
    expect(await getBrand(orgId)).toBeNull();
  });

  test('returns null instead of a corrupt document — okuma sınırı da bekçili', async () => {
    const { orgId } = await member('owner');
    await prisma.brandSetting.create({
      data: { orgId, data: { evil: { value: 'x', mode: 'locked' } } },
    });
    expect(await getBrand(orgId)).toBeNull();
  });
});
