/**
 * Koltuk zorlamasının tek noktası.
 *
 * `packages/core` "bu koltuk verilebilir mi" sorusunu saf olarak yanıtlıyor;
 * burası o kararın **eşzamanlılık altında** da tutup tutmadığını sınıyor.
 * Kilitsiz bir uygulama bu dosyadaki testlerin çoğunu geçer, yarış testini
 * geçemez — o test bu dosyanın varlık sebebi.
 */
import { afterAll, beforeEach, describe, expect, test } from 'vitest';

import { prisma } from '../lib/db';
import { countActiveSeats, deactivateSender, publishSender } from '../lib/repo/senders';
import { truncateAll } from './helpers';

beforeEach(truncateAll);
afterAll(async () => {
  await truncateAll();
  await prisma.$disconnect();
});

const orgWithSeats = (entitledSeats: number, extra: Record<string, unknown> = {}) =>
  prisma.organization.create({ data: { name: 'Voldi', entitledSeats, ...extra } });

let n = 0;
const senderIn = (orgId: string) =>
  prisma.senderIdentity.create({
    data: { orgId, displayName: `Kisi ${++n}`, email: `kisi${n}@voldi.net` },
  });

describe('publishing consumes a seat', () => {
  test('a draft becomes active and the seat is counted', async () => {
    const org = await orgWithSeats(2);
    const sender = await senderIn(org.id);

    const result = await publishSender(sender.id);

    expect(result).toEqual({ allowed: true });
    const after = await prisma.senderIdentity.findUniqueOrThrow({ where: { id: sender.id } });
    expect(after.publishedAt).not.toBeNull();
    expect(await countActiveSeats(org.id)).toBe(1);
  });

  test('the sender past the cap is refused and stays a draft', async () => {
    const org = await orgWithSeats(1);
    const first = await senderIn(org.id);
    const second = await senderIn(org.id);
    await publishSender(first.id);

    const result = await publishSender(second.id);

    expect(result).toEqual({ allowed: false, reason: 'seat_limit' });
    const after = await prisma.senderIdentity.findUniqueOrThrow({ where: { id: second.id } });
    expect(after.publishedAt).toBeNull();
    expect(await countActiveSeats(org.id)).toBe(1);
  });

  test('re-publishing an active sender changes nothing', async () => {
    const org = await orgWithSeats(1);
    const sender = await senderIn(org.id);
    await publishSender(sender.id);
    const first = await prisma.senderIdentity.findUniqueOrThrow({ where: { id: sender.id } });

    const result = await publishSender(sender.id);

    expect(result).toEqual({ allowed: true });
    const second = await prisma.senderIdentity.findUniqueOrThrow({ where: { id: sender.id } });
    expect(second.publishedAt).toEqual(first.publishedAt);
    expect(await countActiveSeats(org.id)).toBe(1);
  });

  test('a cancelled workspace publishes nothing', async () => {
    const org = await orgWithSeats(10, { entitlementState: 'cancelled' });
    const sender = await senderIn(org.id);

    expect(await publishSender(sender.id)).toEqual({ allowed: false, reason: 'not_entitled' });
  });
});

describe('deactivating frees the seat', () => {
  test('the freed seat can be given to someone else in the same period', async () => {
    const org = await orgWithSeats(1);
    const leaver = await senderIn(org.id);
    const joiner = await senderIn(org.id);
    await publishSender(leaver.id);
    expect(await publishSender(joiner.id)).toEqual({ allowed: false, reason: 'seat_limit' });

    await deactivateSender(leaver.id);

    expect(await countActiveSeats(org.id)).toBe(0);
    expect(await publishSender(joiner.id)).toEqual({ allowed: true });
  });

  test('reactivating clears the deactivation instead of creating a second row', async () => {
    // Kısmi indeks yok; kimlik silinip yeniden yaratılsaydı UNIQUE(orgId,email)
    // çarpardı. Bu yüzden aynı satır yeniden aktifleşmeli.
    const org = await orgWithSeats(1);
    const sender = await senderIn(org.id);
    await publishSender(sender.id);
    await deactivateSender(sender.id);

    expect(await publishSender(sender.id)).toEqual({ allowed: true });

    const rows = await prisma.senderIdentity.findMany({ where: { orgId: org.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deactivatedAt).toBeNull();
    expect(await countActiveSeats(org.id)).toBe(1);
  });
});

describe('the agency tree shares one pool', () => {
  test("a client org's sender counts against the parent's cap", async () => {
    // "Ajans tek koltukla sınırsız müşteri yönetememeli" şartı burada duruyor.
    const agency = await orgWithSeats(1);
    const client = await prisma.organization.create({
      data: { name: 'Musteri', parentOrgId: agency.id, entitledSeats: 0 },
    });
    const inClient = await senderIn(client.id);
    const inAgency = await senderIn(agency.id);

    expect(await publishSender(inClient.id)).toEqual({ allowed: true });

    expect(await publishSender(inAgency.id)).toEqual({ allowed: false, reason: 'seat_limit' });
    expect(await countActiveSeats(agency.id)).toBe(1);
  });

  test('the cap is read from the billing org, not the client org', async () => {
    // Müşteri org'unun `entitledSeats`'i 0; yine de yayına alınabiliyor,
    // çünkü sayılan tavan ajansınki.
    const agency = await orgWithSeats(3);
    const client = await prisma.organization.create({
      data: { name: 'Musteri', parentOrgId: agency.id, entitledSeats: 0 },
    });

    expect(await publishSender((await senderIn(client.id)).id)).toEqual({ allowed: true });
  });
});

describe('two publishes at the same instant', () => {
  test('a single seat is given to exactly one of them', async () => {
    // Kilit olmadan ikisi de "0 aktif var, yer var" okur ve tavan aşılır.
    const org = await orgWithSeats(1);
    const a = await senderIn(org.id);
    const b = await senderIn(org.id);

    const results = await Promise.all([publishSender(a.id), publishSender(b.id)]);

    const allowed = results.filter((r) => r.allowed);
    expect(allowed).toHaveLength(1);
    expect(await countActiveSeats(org.id)).toBe(1);
  });

  test('ten at once against three seats hand out exactly three', async () => {
    const org = await orgWithSeats(3);
    const senders = [];
    for (let i = 0; i < 10; i++) senders.push(await senderIn(org.id));

    const results = await Promise.all(senders.map((s) => publishSender(s.id)));

    expect(results.filter((r) => r.allowed)).toHaveLength(3);
    expect(await countActiveSeats(org.id)).toBe(3);
  });
});
