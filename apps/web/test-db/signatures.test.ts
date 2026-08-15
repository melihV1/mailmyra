/**
 * İmza deposu. Yetki kuralı `packages/core`'dan geliyor; burada sınanan şey
 * o kuralın veri erişiminde gerçekten uygulandığı — viewer yazamaz, başka
 * org'un üyesi dokunamaz.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import {
  assignSignature,
  deleteSignature,
  duplicateSignature,
  getSignature,
  listSignatures,
  renameSignature,
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

  test('saveSignature mirrors data.layout.templateId into the column', async () => {
    // Backlog borcu: kolon hiç yazılmıyordu; ikinci şablon gelince liste
    // ekranı bayat gösterecekti. Kolon HAM veriyi yansıtır (bindirme değil).
    // Kolonun `@default("classic-horizontal")` olması create yolunda testi
    // sahte biçimde geçirirdi (kolon zaten o değere doğar) — bu yüzden kolon
    // elle boşaltılıp update yolu koşulur; asıl sınanan şey update'in
    // kolonu data.layout.templateId'den YENİDEN yazdığıdır.
    const { userId, orgId } = await member('owner', 'sahip-tid@voldi.net');
    const created = await saveSignature(userId, { orgId, name: 'X', data: DATA });
    if (!created.ok) throw new Error('unreachable');
    await prisma.signature.update({ where: { id: created.id }, data: { templateId: '' } });

    const result = await saveSignature(userId, {
      id: created.id,
      orgId,
      name: 'X',
      data: { layout: { templateId: 'classic-horizontal' } },
    });

    if (!result.ok) throw new Error('unreachable');
    const row = await prisma.signature.findUniqueOrThrow({ where: { id: result.id } });
    expect(row.templateId).toBe('classic-horizontal');
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

describe('renaming', () => {
  test('an editor renames; data and template stay put', async () => {
    const { userId, orgId } = await member('editor', 'ali@voldi.net');
    const saved = await saveSignature(userId, { orgId, name: 'Eski ad', data: DATA });
    if (!saved.ok) throw new Error(saved.reason);

    expect(await renameSignature(userId, saved.id, 'Yeni ad')).toEqual({ ok: true });

    const fresh = await prisma.signature.findUniqueOrThrow({ where: { id: saved.id } });
    expect(fresh.name).toBe('Yeni ad');
    expect(fresh.templateId).toBe('classic-horizontal');
  });

  test('a viewer cannot rename; a stranger sees not_found', async () => {
    const owner = await member('owner', 'sahip@voldi.net');
    const saved = await saveSignature(owner.userId, {
      orgId: owner.orgId,
      name: 'İmza',
      data: DATA,
    });
    if (!saved.ok) throw new Error(saved.reason);

    const viewer = await prisma.user.create({
      data: { email: 'v@voldi.net', passwordHash: 'x' },
    });
    await prisma.membership.create({
      data: { userId: viewer.id, orgId: owner.orgId, role: 'viewer' },
    });
    expect(await renameSignature(viewer.id, saved.id, 'X')).toEqual({
      ok: false,
      reason: 'forbidden',
    });

    const stranger = await member('owner', 'yabanci@voldi.net', 'Rakip');
    expect(await renameSignature(stranger.userId, saved.id, 'X')).toEqual({
      ok: false,
      reason: 'not_found',
    });
  });
});

describe('reading one', () => {
  test('a member reads their signature with its data', async () => {
    const { userId, orgId } = await member('viewer', 'ali@voldi.net');
    const owner = await prisma.user.create({ data: { email: 's@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: owner.id, orgId, role: 'owner' } });
    const saved = await saveSignature(owner.id, { orgId, name: 'Okunan', data: DATA });
    if (!saved.ok) throw new Error('unreachable');

    // viewer OKUYABİLİR (signature:view herkese açık), yazamaz.
    const got = await getSignature(userId, saved.id);

    if (!got.ok) throw new Error(got.reason);
    expect(got.signature.name).toBe('Okunan');
    expect(got.signature.data).toEqual(DATA);
  });

  test('an outsider gets not_found, not forbidden', async () => {
    const home = await member('owner', 'ali@voldi.net', 'A');
    const saved = await saveSignature(home.userId, { orgId: home.orgId, name: 'Gizli', data: DATA });
    if (!saved.ok) throw new Error('unreachable');
    const stranger = await member('owner', 'y@baska.net', 'B');

    expect(await getSignature(stranger.userId, saved.id)).toEqual({
      ok: false,
      reason: 'not_found',
    });
  });
});

describe('assignment', () => {
  const sender = (orgId: string, email = 'kisi@voldi.net') =>
    prisma.senderIdentity.create({ data: { orgId, displayName: 'Kişi', email } });

  test('an editor ties a signature to a sender and both screens see it', async () => {
    const { userId, orgId } = await member('editor', 'ali@voldi.net');
    const saved = await saveSignature(userId, { orgId, name: 'İş imzam', data: DATA });
    if (!saved.ok) throw new Error('unreachable');
    const s = await sender(orgId);

    expect(await assignSignature(userId, saved.id, s.id)).toEqual({ ok: true });

    const row = (await listSignatures(userId))[0];
    expect(row?.senderName).toBe('Kişi');
    expect(row?.senderStatus).toBe('draft');
  });

  test('unassigning with null clears the tie', async () => {
    const { userId, orgId } = await member('editor', 'ali@voldi.net');
    const saved = await saveSignature(userId, { orgId, name: 'X', data: DATA });
    if (!saved.ok) throw new Error('unreachable');
    const s = await sender(orgId);
    await assignSignature(userId, saved.id, s.id);

    expect(await assignSignature(userId, saved.id, null)).toEqual({ ok: true });
    expect((await listSignatures(userId))[0]?.senderName).toBeNull();
  });

  test("a sender from ANOTHER org cannot be spliced in", async () => {
    // Çapraz org ataması koltuk muhasebesini karıştırırdı: imza A org'unda,
    // koltuğu B org'unda tüketen bir kimlik. Var olduğu bile söylenmez.
    const home = await member('editor', 'ali@voldi.net', 'A');
    const other = await member('owner', 'y@baska.net', 'B');
    const saved = await saveSignature(home.userId, { orgId: home.orgId, name: 'X', data: DATA });
    if (!saved.ok) throw new Error('unreachable');
    const foreign = await sender(other.orgId, 'dis@baska.net');

    expect(await assignSignature(home.userId, saved.id, foreign.id)).toEqual({
      ok: false,
      reason: 'not_found',
    });
    expect((await listSignatures(home.userId))[0]?.senderName).toBeNull();
  });

  test('a viewer cannot assign', async () => {
    const owner = await member('owner', 's@voldi.net');
    const saved = await saveSignature(owner.userId, { orgId: owner.orgId, name: 'X', data: DATA });
    if (!saved.ok) throw new Error('unreachable');
    const s = await sender(owner.orgId);
    const viewer = await prisma.user.create({ data: { email: 'v@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: viewer.id, orgId: owner.orgId, role: 'viewer' } });

    expect(await assignSignature(viewer.id, saved.id, s.id)).toEqual({
      ok: false,
      reason: 'forbidden',
    });
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
