/**
 * Toplu zip'in veri ucu (spec §5). Zip'leme route'ta; burada sınanan şey
 * kapsam, kapı, izolasyon ve dosya listesi — zip açmadan.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { mergeWithEmpty } from '../app/builder/reducer';
import { prisma } from '../lib/db';
import { MemoryMailer } from '../lib/mail';
import { collectExportBundle } from '../lib/repo/export';
import { publishSender } from '../lib/repo/senders';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

const mail = new MemoryMailer();

let ownerN = 0;
async function orgWithOwner(entitledSeats = 10) {
  const user = await prisma.user.create({
    data: { email: `sahip${++ownerN}@voldi.net`, passwordHash: 'x' },
  });
  const org = await prisma.organization.create({ data: { name: 'Voldi', entitledSeats } });
  await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: 'owner' } });
  return { userId: user.id, orgId: org.id };
}

let n = 0;
// `displayName` verilse bile sayaç ilerlemeli — aksi halde varsayılan
// parametre ifadesi hiç çalışmaz ve aynı org'da açık isimle yapılan iki
// çağrı aynı e-postayı üretip UNIQUE(orgId, email)'e çarpar.
async function liveSender(orgId: string, displayName?: string) {
  const id = ++n;
  const s = await prisma.senderIdentity.create({
    data: { orgId, displayName: displayName ?? `Kisi ${id}`, email: `kisi${id}@voldi.net` },
  });
  const r = await publishSender(s.id, mail);
  if (!r.allowed) throw new Error('kurgu: publish reddedildi');
  return s;
}

async function assign(orgId: string, senderIdentityId: string, name = 'Default') {
  return prisma.signature.create({
    data: {
      orgId,
      senderIdentityId,
      name,
      data: mergeWithEmpty({ identity: { fullName: 'Ali Yılmaz' } }) as object,
    },
  });
}

describe('what goes into the bundle', () => {
  test('a live sender with an assigned signature produces a rendered file', async () => {
    const { userId, orgId } = await orgWithOwner();
    const s = await liveSender(orgId, 'Ali Yılmaz');
    await assign(orgId, s.id);

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files).toHaveLength(1);
    expect(r.files[0]?.filename).toBe('ali-yilmaz.htm');
    expect(r.files[0]?.html).toContain('<table');
    expect(r.files[0]?.html).toContain('Ali Yılmaz');
    expect(r.files[0]?.html).toContain('<!doctype html>');
  });

  test('drafts and deactivated senders are skipped and counted', async () => {
    const { userId, orgId } = await orgWithOwner();
    const live = await liveSender(orgId);
    await assign(orgId, live.id);
    const draft = await prisma.senderIdentity.create({
      data: { orgId, displayName: 'Taslak', email: 'taslak@voldi.net' },
    });
    await assign(orgId, draft.id);
    const gone = await liveSender(orgId);
    await assign(orgId, gone.id);
    await prisma.senderIdentity.update({ where: { id: gone.id }, data: { deactivatedAt: new Date() } });

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files).toHaveLength(1);
    expect(r.skipped.unpublished).toBe(2);
  });

  test('a live sender without a signature is skipped as unassigned', async () => {
    const { userId, orgId } = await orgWithOwner();
    const a = await liveSender(orgId);
    await assign(orgId, a.id);
    await liveSender(orgId); // imzasız

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files).toHaveLength(1);
    expect(r.skipped.unassigned).toBe(1);
  });

  test('several signatures on one sender become several files', async () => {
    const { userId, orgId } = await orgWithOwner();
    const s = await liveSender(orgId, 'Ali Yılmaz');
    await assign(orgId, s.id, 'Satış');
    await assign(orgId, s.id, 'Destek');

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files.map((f) => f.filename).sort()).toEqual([
      'ali-yilmaz--destek.htm',
      'ali-yilmaz--satis.htm',
    ]);
  });
});

describe('scope and isolation', () => {
  test('a selection exports only the selected senders', async () => {
    const { userId, orgId } = await orgWithOwner();
    const a = await liveSender(orgId, 'Secilen');
    await assign(orgId, a.id);
    const b = await liveSender(orgId, 'Disarida');
    await assign(orgId, b.id);

    const r = await collectExportBundle(userId, [a.id]);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files.map((f) => f.filename)).toEqual(['secilen.htm']);
  });

  test("a foreign or unknown id fails the whole request with not_found", async () => {
    const { userId, orgId } = await orgWithOwner();
    const mine = await liveSender(orgId);
    await assign(orgId, mine.id);
    const other = await orgWithOwner();
    const theirs = await liveSender(other.orgId);

    expect(await collectExportBundle(userId, [mine.id, theirs.id])).toEqual({
      ok: false,
      reason: 'not_found',
    });
  });

  test("another org's senders never leak into the default scope", async () => {
    const { userId, orgId } = await orgWithOwner();
    const mine = await liveSender(orgId, 'Bizim');
    await assign(orgId, mine.id);
    const other = await orgWithOwner();
    const theirs = await liveSender(other.orgId, 'Onlarin');
    await assign(other.orgId, theirs.id);

    const r = await collectExportBundle(userId);

    if (!r.ok) throw new Error(r.reason);
    expect(r.files.map((f) => f.filename)).toEqual(['bizim.htm']);
  });
});

describe('gates', () => {
  test('a viewer is refused, an editor passes — the matrix line', async () => {
    const { orgId } = await orgWithOwner();
    const s = await liveSender(orgId);
    await assign(orgId, s.id);
    const viewer = await prisma.user.create({ data: { email: 'v@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: viewer.id, orgId, role: 'viewer' } });
    const editor = await prisma.user.create({ data: { email: 'e@voldi.net', passwordHash: 'x' } });
    await prisma.membership.create({ data: { userId: editor.id, orgId, role: 'editor' } });

    expect(await collectExportBundle(viewer.id)).toEqual({ ok: false, reason: 'forbidden' });
    expect((await collectExportBundle(editor.id)).ok).toBe(true);
  });

  test('a cancelled workspace exports nothing', async () => {
    const { userId, orgId } = await orgWithOwner();
    const s = await liveSender(orgId);
    await assign(orgId, s.id);
    await prisma.organization.update({
      where: { id: orgId },
      data: { entitlementState: 'cancelled' },
    });

    expect(await collectExportBundle(userId)).toEqual({ ok: false, reason: 'no_exportable' });
  });

  test('an org with nothing exportable is told so', async () => {
    const { userId, orgId } = await orgWithOwner();
    await prisma.senderIdentity.create({
      data: { orgId, displayName: 'Taslak', email: 'taslak@voldi.net' },
    });

    expect(await collectExportBundle(userId)).toEqual({ ok: false, reason: 'no_exportable' });
  });

  test('the cap refuses before rendering anything', async () => {
    const { userId, orgId } = await orgWithOwner();
    for (let i = 0; i < 3; i++) {
      const s = await liveSender(orgId);
      await assign(orgId, s.id);
    }

    expect(await collectExportBundle(userId, undefined, 2)).toEqual({
      ok: false,
      reason: 'too_many',
    });
  });
});
