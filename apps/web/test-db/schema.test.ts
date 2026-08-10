/**
 * Şemanın kendi verdiği garantiler.
 *
 * Buradaki hiçbir kural uygulama kodunda tekrarlanmıyor — hepsi veritabanı
 * seviyesinde duruyor ki yanlış bir route handler ya da elle atılan bir SQL
 * onları delemesin. Uygulama mantığı `packages/core`'un birim testlerinde.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

const newUser = (email: string) => prisma.user.create({ data: { email, passwordHash: 'x' } });
const newOrg = (name = 'Voldi') => prisma.organization.create({ data: { name } });

describe('User', () => {
  test('the same address cannot register twice', async () => {
    await newUser('ali@voldi.net');
    await expect(newUser('ali@voldi.net')).rejects.toThrow();
  });

  test('a different case is the same address', async () => {
    // Uygulama zaten küçük harfe normalize edecek; bu, o normalizasyon
    // unutulduğunda mükerrer hesabı veritabanının durdurduğunun kanıtı.
    await newUser('ali@voldi.net');
    await expect(newUser('Ali@Voldi.NET')).rejects.toThrow();
  });

  test('the dotless Turkish i is a different address', async () => {
    await newUser('ali@voldi.net');
    await expect(newUser('alı@voldi.net')).resolves.toBeTruthy();
  });
});

describe('Session', () => {
  test('deleting the user kills their sessions', async () => {
    const user = await newUser('ali@voldi.net');
    await prisma.session.create({
      data: { userId: user.id, tokenHash: 'h1', expiresAt: new Date('2030-01-01') },
    });

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.session.count()).toBe(0);
  });

  test('two sessions cannot share a token hash', async () => {
    const a = await newUser('a@voldi.net');
    const b = await newUser('b@voldi.net');
    const expiresAt = new Date('2030-01-01');
    await prisma.session.create({ data: { userId: a.id, tokenHash: 'same', expiresAt } });
    await expect(
      prisma.session.create({ data: { userId: b.id, tokenHash: 'same', expiresAt } }),
    ).rejects.toThrow();
  });
});

describe('Membership', () => {
  test('a user joins an org only once', async () => {
    const user = await newUser('ali@voldi.net');
    const org = await newOrg();
    await prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: 'owner' } });

    await expect(
      prisma.membership.create({ data: { userId: user.id, orgId: org.id, role: 'admin' } }),
    ).rejects.toThrow();
  });

  test('an unknown role is refused by the column, not by the app', async () => {
    const user = await newUser('ali@voldi.net');
    const org = await newOrg();
    await expect(
      prisma.$executeRaw`INSERT INTO Membership (userId, orgId, role, createdAt)
                         VALUES (${user.id}, ${org.id}, 'superadmin', NOW())`,
    ).rejects.toThrow();
  });
});

describe('SenderIdentity', () => {
  test('one address is one sender within an org', async () => {
    const org = await newOrg();
    await prisma.senderIdentity.create({
      data: { orgId: org.id, displayName: 'Ali', email: 'ali@voldi.net' },
    });

    await expect(
      prisma.senderIdentity.create({
        data: { orgId: org.id, displayName: 'Ali again', email: 'ali@voldi.net' },
      }),
    ).rejects.toThrow();
  });

  test('the same address may exist in a different org', async () => {
    // Ajans senaryosu: aynı kişi iki müşteri organizasyonunda görünebilir.
    const one = await newOrg('A');
    const two = await newOrg('B');
    await prisma.senderIdentity.create({
      data: { orgId: one.id, displayName: 'Ali', email: 'ali@voldi.net' },
    });

    await expect(
      prisma.senderIdentity.create({
        data: { orgId: two.id, displayName: 'Ali', email: 'ali@voldi.net' },
      }),
    ).resolves.toBeTruthy();
  });

  test('a fresh sender is a draft — it costs nothing until published', async () => {
    const org = await newOrg();
    const sender = await prisma.senderIdentity.create({
      data: { orgId: org.id, displayName: 'Ali', email: 'ali@voldi.net' },
    });

    expect(sender.publishedAt).toBeNull();
    expect(sender.deactivatedAt).toBeNull();
  });
});

describe('Signature', () => {
  test('the column refuses anything that is not JSON', async () => {
    // MariaDB'nin JSON kolonu LONGTEXT + CHECK(json_valid(...)). Prisma bunu
    // bilmiyor; garanti motorun kendisinden geliyor ve burası onun kanıtı.
    const org = await newOrg();
    await expect(
      prisma.$executeRaw`INSERT INTO Signature (id, orgId, templateId, data, name, createdAt, updatedAt)
                         VALUES ('sig1', ${org.id}, 'classic-horizontal', 'bu json degil', 'Test', NOW(), NOW())`,
    ).rejects.toThrow();
  });

  test('deleting the org takes its signatures with it', async () => {
    const org = await newOrg();
    await prisma.signature.create({
      data: { orgId: org.id, name: 'Test', data: { identity: { fullName: 'Ali' } } },
    });

    await prisma.organization.delete({ where: { id: org.id } });

    expect(await prisma.signature.count()).toBe(0);
  });

  test('deleting a sender leaves the signature behind, unassigned', async () => {
    // İmza müşterinin emeği. Gönderici pasifleştirilip silinse bile taslak
    // kaybolmamalı — yeniden atanabilsin.
    const org = await newOrg();
    const sender = await prisma.senderIdentity.create({
      data: { orgId: org.id, displayName: 'Ali', email: 'ali@voldi.net' },
    });
    await prisma.signature.create({
      data: { orgId: org.id, senderIdentityId: sender.id, name: 'Test', data: {} },
    });

    await prisma.senderIdentity.delete({ where: { id: sender.id } });

    const left = await prisma.signature.findMany();
    expect(left).toHaveLength(1);
    expect(left[0]?.senderIdentityId).toBeNull();
  });
});

describe('LegalAcceptance', () => {
  test('deleting the user does not erase what they accepted', async () => {
    // KVKK kaydı bir rıza değil, kabul kanıtı. Hesap silinince kaybolursa
    // "kabul etti" iddiasını ispatlayacak hiçbir şey kalmaz.
    const user = await newUser('ali@voldi.net');
    await prisma.legalAcceptance.create({
      data: { userId: user.id, docType: 'terms', version: '2026-08-10', ip: '127.0.0.1' },
    });

    await prisma.user.delete({ where: { id: user.id } });

    const kept = await prisma.legalAcceptance.findMany();
    expect(kept).toHaveLength(1);
    expect(kept[0]?.userId).toBeNull();
    expect(kept[0]?.version).toBe('2026-08-10');
  });
});

describe('Organization', () => {
  test('a new org starts on trial', async () => {
    const org = await newOrg();
    expect(org.entitlementState).toBe('trial');
  });

  test('an unknown entitlement state is refused by the column', async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO Organization (id, name, entitledSeats, priceVersion, entitlementState, createdAt)
                         VALUES ('o1', 'X', 1, 'v1', 'bankrupt', NOW())`,
    ).rejects.toThrow();
  });
});

describe('AuthAttempt', () => {
  test('one counter per key per window', async () => {
    const windowStart = new Date('2026-08-10T09:00:00Z');
    await prisma.authAttempt.create({ data: { key: 'ip:1.2.3.4', windowStart, count: 1 } });

    await expect(
      prisma.authAttempt.create({ data: { key: 'ip:1.2.3.4', windowStart, count: 1 } }),
    ).rejects.toThrow();
  });
});
