/**
 * %80 koltuk uyarı maili — spec §6 "tavana yaklaşınca / bilgilendirme".
 *
 * Eşik kararı core'da saf ve kanıtlı (packages/core/test/seat-warning.test.ts);
 * burada sınanan şey gönderimin publish akışına dikişi: kime gider, ne zaman
 * gider, kaç kez gider ve mail arızası koltuk mekaniğini bozamaz.
 */
import { afterAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { prisma } from '../lib/db';
import { MemoryMailer, type Mailer } from '../lib/mail';
import { deactivateSender, publishSender } from '../lib/repo/senders';
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

async function ownerOf(orgId: string, email: string) {
  const user = await prisma.user.create({ data: { email, passwordHash: 'x' } });
  await prisma.membership.create({ data: { userId: user.id, orgId, role: 'owner' } });
  return user;
}

/** Sırayla `count` taslak açıp yayına alır; reddedilirse test kurgusu yanlıştır. */
async function publishN(orgId: string, count: number, mailer: Mailer) {
  for (let i = 0; i < count; i++) {
    const s = await senderIn(orgId);
    const r = await publishSender(s.id, mailer);
    if (!r.allowed) throw new Error(`kurgu hatası: ${i + 1}. publish reddedildi`);
  }
}

describe('when the warning goes out', () => {
  test('nothing is sent while usage is below the line', async () => {
    const org = await orgWithSeats(5);
    await ownerOf(org.id, 'sahip@voldi.net');
    const mailer = new MemoryMailer();

    await publishN(org.id, 3, mailer);

    expect(mailer.sent).toHaveLength(0);
  });

  test('the crossing publish mails the owner, with the numbers', async () => {
    const org = await orgWithSeats(5);
    await ownerOf(org.id, 'sahip@voldi.net');
    const mailer = new MemoryMailer();

    await publishN(org.id, 4, mailer);

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('sahip@voldi.net');
    expect(mailer.sent[0]?.text).toContain('4 of 5');
    expect(mailer.sent[0]?.text).toContain('Voldi');
  });

  test('the seats after the line add no second mail', async () => {
    const org = await orgWithSeats(5);
    await ownerOf(org.id, 'sahip@voldi.net');
    const mailer = new MemoryMailer();

    await publishN(org.id, 5, mailer);

    expect(mailer.sent).toHaveLength(1);
  });

  test('a refused publish sends nothing', async () => {
    const org = await orgWithSeats(1);
    await ownerOf(org.id, 'sahip@voldi.net');
    const mailer = new MemoryMailer();
    await publishN(org.id, 1, mailer); // 1/1 — uyarı burada düştü
    const extra = await senderIn(org.id);

    expect(await publishSender(extra.id, mailer)).toEqual({
      allowed: false,
      reason: 'seat_limit',
    });

    expect(mailer.sent).toHaveLength(1);
  });

  test('freeing the seat and crossing again warns again', async () => {
    // Durum tutulmuyor; uyarı GEÇİŞİN kendisine bağlı. Koltuk boşalıp tavan
    // yeniden zorlanıyorsa bu yeni bir olaydır ve sahibi yeniden duymalı.
    const org = await orgWithSeats(1);
    await ownerOf(org.id, 'sahip@voldi.net');
    const mailer = new MemoryMailer();
    const s = await senderIn(org.id);

    await publishSender(s.id, mailer);
    await deactivateSender(s.id);
    await publishSender(s.id, mailer);

    expect(mailer.sent).toHaveLength(2);
  });
});

describe('who receives it', () => {
  test('every owner of the billing org — and only the owners', async () => {
    // Faturayla owner muhatap; admin gündelik işletmen. Uyarı para demek.
    const org = await orgWithSeats(1);
    await ownerOf(org.id, 'sahip1@voldi.net');
    await ownerOf(org.id, 'sahip2@voldi.net');
    const admin = await prisma.user.create({
      data: { email: 'yonetici@voldi.net', passwordHash: 'x' },
    });
    await prisma.membership.create({
      data: { userId: admin.id, orgId: org.id, role: 'admin' },
    });
    const mailer = new MemoryMailer();

    await publishN(org.id, 1, mailer);

    expect(mailer.sent.map((m) => m.to).sort()).toEqual([
      'sahip1@voldi.net',
      'sahip2@voldi.net',
    ]);
  });

  test("a client org's publish warns the agency owner with the agency's numbers", async () => {
    // Tavan fatura org'unda yaşıyor; uyarı da oraya gider. Müşteri org'unun
    // kendi (anlamsız) tavanı maile sızmamalı.
    const agency = await orgWithSeats(1);
    await ownerOf(agency.id, 'ajans@voldi.net');
    const client = await prisma.organization.create({
      data: { name: 'Musteri', parentOrgId: agency.id, entitledSeats: 0 },
    });
    const mailer = new MemoryMailer();
    const s = await senderIn(client.id);

    expect(await publishSender(s.id, mailer)).toEqual({ allowed: true });

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe('ajans@voldi.net');
    expect(mailer.sent[0]?.text).toContain('1 of 1');
    expect(mailer.sent[0]?.text).toContain('Voldi');
  });
});

describe('the mail is a side effect, not a gate', () => {
  test('a broken mailer neither undoes the publish nor stays silent', async () => {
    const org = await orgWithSeats(1);
    await ownerOf(org.id, 'sahip@voldi.net');
    const broken: Mailer = {
      kind: 'memory',
      send: async () => {
        throw new Error('SMTP down');
      },
    };
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(await publishSender((await senderIn(org.id)).id, broken)).toEqual({
        allowed: true,
      });
      // Koltuk gitti, imza export edilebilir — mail arızası bunu geri alamaz.
      const rows = await prisma.senderIdentity.findMany({ where: { orgId: org.id } });
      expect(rows[0]?.publishedAt).not.toBeNull();
      // Ama sessiz de kalınmaz: arıza log'a düşer.
      expect(logged).toHaveBeenCalled();
    } finally {
      logged.mockRestore();
    }
  });
});
