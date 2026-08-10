import { canPublish, seatStatus, type Decision } from '@mailmyra/core';
import type { Prisma } from '@prisma/client';

import { prisma } from '../db';

/**
 * Koltuk zorlamasının tek noktası.
 *
 * Karar `packages/core`'da ve saf; burada yalnız o kararın **eşzamanlılık
 * altında** da geçerli kalmasını sağlıyoruz. Kilitsiz bir uygulama tek koltuğu
 * iki kişiye birden verir — ölçüldü, `test-db/publish.test.ts`.
 */

/** Hem normal istemci hem transaction istemcisi bu arayüzü karşılıyor. */
type Db = Pick<Prisma.TransactionClient, '$queryRaw' | 'senderIdentity' | 'organization'>;

/**
 * Fatura sahibi org — ağacın kökü. Ajans kurulumunda `entitledSeats` orada
 * durur, müşteri org'larınınki anlamsızdır.
 */
async function resolveBillingOrgId(db: Db, orgId: string): Promise<string> {
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    WITH RECURSIVE up AS (
      SELECT id, parentOrgId FROM Organization WHERE id = ${orgId}
      UNION ALL
      SELECT o.id, o.parentOrgId FROM Organization o JOIN up ON up.parentOrgId = o.id
    )
    SELECT id FROM up WHERE parentOrgId IS NULL
  `;
  const root = rows[0]?.id;
  if (!root) throw new Error(`Organization ${orgId} bulunamadı`);
  return root;
}

async function countActiveSeatsInTree(db: Db, billingOrgId: string): Promise<number> {
  const rows = await db.$queryRaw<Array<{ n: bigint }>>`
    WITH RECURSIVE tree AS (
      SELECT id FROM Organization WHERE id = ${billingOrgId}
      UNION ALL
      SELECT o.id FROM Organization o JOIN tree ON o.parentOrgId = tree.id
    )
    SELECT COUNT(*) AS n FROM SenderIdentity s
    JOIN tree ON s.orgId = tree.id
    WHERE s.publishedAt IS NOT NULL AND s.deactivatedAt IS NULL
  `;
  return Number(rows[0]?.n ?? 0);
}

/**
 * Verilen org'un fatura ağacındaki aktif koltuk sayısı.
 *
 * Ağacın tamamı sayılıyor — "ajans tek koltukla sınırsız müşteri
 * yönetememeli" şartı buradan doğal olarak çıkıyor, ayrı bir kural olarak
 * değil.
 */
export async function countActiveSeats(orgId: string): Promise<number> {
  const billingOrgId = await resolveBillingOrgId(prisma, orgId);
  return countActiveSeatsInTree(prisma, billingOrgId);
}

export async function publishSender(senderId: string): Promise<Decision> {
  // Kilitlenecek satırı bilmek için önce hangi ağaçta olduğumuzu öğreniyoruz.
  // Bir göndericinin org'u değişmiyor, bu okuma kilidin dışında güvenli.
  const known = await prisma.senderIdentity.findUniqueOrThrow({
    where: { id: senderId },
    select: { orgId: true },
  });
  const billingOrgId = await resolveBillingOrgId(prisma, known.orgId);

  return prisma.$transaction(async (tx) => {
    // Fatura org'u satırına özel kilit. Aynı ağaç için ikinci bir publish
    // burada bekler; bu satır olmadan ikisi de "yer var" okur ve tavan aşılır.
    await tx.$queryRaw`SELECT id FROM Organization WHERE id = ${billingOrgId} FOR UPDATE`;

    // Kilidin ardından **taze** okuma: bizden önce commit'lenmiş bir publish'i
    // görmemiz gerekiyor.
    const sender = await tx.senderIdentity.findUniqueOrThrow({ where: { id: senderId } });

    // Zaten aktifse koltuk sayısı değişmiyor; `publishedAt`e dokunulmuyor ki
    // ilk yayın tarihi korunsun.
    if (seatStatus(sender) === 'active') return { allowed: true } as const;

    const org = await tx.organization.findUniqueOrThrow({ where: { id: billingOrgId } });
    const activeSeats = await countActiveSeatsInTree(tx, billingOrgId);

    const decision = canPublish({
      entitlement: { entitledSeats: org.entitledSeats, state: org.entitlementState },
      activeSeats,
      target: sender,
    });
    if (!decision.allowed) return decision;

    await tx.senderIdentity.update({
      where: { id: senderId },
      data: { publishedAt: new Date(), deactivatedAt: null },
    });
    return { allowed: true } as const;
  });
}

/**
 * Koltuğu dönem içinde serbest bırakır. Kimlik **silinmez** — kısmi indeks
 * olmadığı için aynı adres yeniden eklendiğinde `UNIQUE(orgId, email)`
 * çarpardı; bunun yerine bu satır yeniden aktifleştiriliyor.
 */
export async function deactivateSender(senderId: string): Promise<void> {
  await prisma.senderIdentity.update({
    where: { id: senderId },
    data: { deactivatedAt: new Date() },
  });
}
