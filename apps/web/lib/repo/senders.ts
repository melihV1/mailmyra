import {
  can,
  canPublish,
  seatStatus,
  seatWarningDue,
  type Decision,
  type Role,
  type SeatStatus,
} from '@mailmyra/core';
import type { Prisma } from '@prisma/client';

import { prisma } from '../db';
import { seatWarningEmail, type Mailer } from '../mail';
import { notifyOrgManagers } from './notifications';

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
export async function resolveBillingOrgId(db: Db, orgId: string): Promise<string> {
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

/** Linklerin tabanı — auth/flows ile aynı kural. */
function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';
}

/**
 * %80 uyarısını fatura org'unun owner'larına dağıtır (spec §6). Owner'lara,
 * çünkü faturayla muhatap onlar; admin gündelik işletmendir.
 *
 * Publish bu noktada commit'li — mail arızası onu geri alamaz, o yüzden her
 * gönderim kendi başına yutulur ama log'a düşer.
 */
async function sendSeatWarning(
  billingOrgId: string,
  usage: { orgName: string; activeSeats: number; entitledSeats: number },
  mailer: Mailer,
): Promise<void> {
  const owners = await prisma.membership.findMany({
    where: { orgId: billingOrgId, role: 'owner' },
    include: { user: { select: { email: true } } },
  });
  const body = seatWarningEmail({ actionUrl: `${appUrl()}/app/senders`, ...usage });
  for (const owner of owners) {
    try {
      await mailer.send({ to: owner.user.email, ...body });
    } catch (error) {
      console.error('[mail] koltuk uyarısı gönderilemedi:', error);
    }
  }
}

export async function publishSender(
  senderId: string,
  mailer: Mailer,
  /** Eylemi yapan — kendi publish'ini zilinde görmesin diye dışlanır. */
  actorUserId?: string,
): Promise<Decision> {
  // Kilitlenecek satırı bilmek için önce hangi ağaçta olduğumuzu öğreniyoruz.
  // Bir göndericinin org'u değişmiyor, bu okuma kilidin dışında güvenli.
  const known = await prisma.senderIdentity.findUniqueOrThrow({
    where: { id: senderId },
    select: { orgId: true },
  });
  const billingOrgId = await resolveBillingOrgId(prisma, known.orgId);

  const { decision, crossed, published } = await prisma.$transaction(async (tx) => {
    // Fatura org'u satırına özel kilit. Aynı ağaç için ikinci bir publish
    // burada bekler; bu satır olmadan ikisi de "yer var" okur ve tavan aşılır.
    await tx.$queryRaw`SELECT id FROM Organization WHERE id = ${billingOrgId} FOR UPDATE`;

    // Kilidin ardından **taze** okuma: bizden önce commit'lenmiş bir publish'i
    // görmemiz gerekiyor.
    const sender = await tx.senderIdentity.findUniqueOrThrow({ where: { id: senderId } });

    // Zaten aktifse koltuk sayısı değişmiyor; `publishedAt`e dokunulmuyor ki
    // ilk yayın tarihi korunsun.
    if (seatStatus(sender) === 'active')
      return { decision: { allowed: true } as const, crossed: null, published: null };

    const org = await tx.organization.findUniqueOrThrow({ where: { id: billingOrgId } });
    const activeSeats = await countActiveSeatsInTree(tx, billingOrgId);

    const decision = canPublish({
      entitlement: { entitledSeats: org.entitledSeats, state: org.entitlementState },
      activeSeats,
      target: sender,
    });
    if (!decision.allowed) return { decision, crossed: null, published: null };

    await tx.senderIdentity.update({
      where: { id: senderId },
      data: { publishedAt: new Date(), deactivatedAt: null },
    });

    // Eşik kararı kilidin ALTINDA veriliyor: publish'ler sıralandığı için
    // geçişi tam olarak bir transaction görür — aynı anda iki uyarı çıkmaz.
    const nowActive = activeSeats + 1;
    return {
      decision: { allowed: true } as const,
      published: { senderName: sender.displayName },
      crossed: seatWarningDue({ activeSeats: nowActive, entitledSeats: org.entitledSeats })
        ? { orgName: org.name, activeSeats: nowActive, entitledSeats: org.entitledSeats }
        : null,
    };
  });

  // Gönderim ve bildirimler bilerek transaction DIŞINDA: kilit SMTP'yi/DB'yi
  // beklememeli ve arızaları commit'lenmiş bir publish'i geri alamamalı
  // (notifyOrgManagers zaten hata yutar).
  if (crossed) await sendSeatWarning(billingOrgId, crossed, mailer);
  if (published) {
    await notifyOrgManagers({
      orgId: known.orgId,
      type: 'sender_published',
      payload: { senderName: published.senderName },
      excludeUserId: actorUserId,
    });
  }
  if (crossed) {
    await notifyOrgManagers({
      orgId: billingOrgId,
      type: 'seat_warning',
      payload: crossed,
    });
  }
  return decision;
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

// ─── Ekran katmanı: rol sargısı ──────────────────────────────────────────
// Koltuk mekaniği yukarıda ve kilit altında; buradaki fonksiyonlar "kim"
// sorusunu cevaplar. Ekleme/yayına alma/pasifleştirme `sender:manage` ister
// (owner+admin). Org dışına varlık sızdırılmaz: yabancıya `not_found`.

export async function roleFor(userId: string, orgId: string): Promise<Role | null> {
  const m = await prisma.membership.findUnique({ where: { userId_orgId: { userId, orgId } } });
  return m?.role ?? null;
}

/** Faz 1-2: kullanıcı tek org'lu; ilk üyelik esas alınır. */
export async function primaryOrgId(userId: string): Promise<string | null> {
  const m = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  return m?.orgId ?? null;
}

export type CreateSenderResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'forbidden' | 'email_taken' };

export async function createSender(
  userId: string,
  input: { displayName: string; email: string; jobTitle?: string },
): Promise<CreateSenderResult> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };
  const role = await roleFor(userId, orgId);
  if (!role || !can(role, 'sender:manage')) return { ok: false, reason: 'forbidden' };

  try {
    const sender = await prisma.senderIdentity.create({
      data: {
        orgId,
        displayName: input.displayName.trim(),
        email: input.email.trim().toLowerCase(),
        jobTitle: input.jobTitle?.trim() || null,
      },
    });
    return { ok: true, id: sender.id };
  } catch (error) {
    // UNIQUE(orgId, email) — aynı adres ikinci kez eklenmez; pasifse
    // silinmez, yeniden yayına alınır (kısmi indeks yok kuralı).
    if ((error as { code?: string }).code === 'P2002') {
      return { ok: false, reason: 'email_taken' };
    }
    throw error;
  }
}

export type WrappedDecision = Decision | { allowed: false; reason: 'forbidden' | 'not_found' };

export async function publishSenderAs(
  userId: string,
  senderId: string,
  mailer: Mailer,
): Promise<WrappedDecision> {
  const sender = await prisma.senderIdentity.findUnique({ where: { id: senderId } });
  if (!sender) return { allowed: false, reason: 'not_found' };
  const role = await roleFor(userId, sender.orgId);
  if (!role) return { allowed: false, reason: 'not_found' };
  if (!can(role, 'sender:manage')) return { allowed: false, reason: 'forbidden' };
  return publishSender(senderId, mailer, userId);
}

export type DeactivateResult =
  | { ok: true }
  | { ok: false; reason: 'forbidden' | 'not_found' };

export async function deactivateSenderAs(
  userId: string,
  senderId: string,
): Promise<DeactivateResult> {
  const sender = await prisma.senderIdentity.findUnique({ where: { id: senderId } });
  if (!sender) return { ok: false, reason: 'not_found' };
  const role = await roleFor(userId, sender.orgId);
  if (!role) return { ok: false, reason: 'not_found' };
  if (!can(role, 'sender:manage')) return { ok: false, reason: 'forbidden' };
  await deactivateSender(senderId);
  return { ok: true };
}

export type DeleteSenderResult =
  | { ok: true }
  | { ok: false; reason: 'forbidden' | 'not_found' | 'is_live' };

/**
 * Göndericiyi SİLER (Hüseyin, 2026-08-15 — pasifleştirme tek başına
 * "listem şişiyor" derdini çözmüyordu). İki kural:
 * · CANLI gönderici silinemez — önce pasifleştirilir; koltuk muhasebesi
 *   silme üzerinden pas geçilmez (`is_live`).
 * · Atanmış imzalar SİLİNMEZ — şemadaki `SetNull` bağı atamayı düşürür,
 *   müşterinin emeği göndericiyle birlikte gitmez (schema yorumu bunu
 *   baştan öngörmüştü). CDN görselleri de yerinde kalır (mimari kural).
 */
export async function deleteSenderAs(
  userId: string,
  senderId: string,
): Promise<DeleteSenderResult> {
  const sender = await prisma.senderIdentity.findUnique({ where: { id: senderId } });
  if (!sender) return { ok: false, reason: 'not_found' };
  const role = await roleFor(userId, sender.orgId);
  if (!role) return { ok: false, reason: 'not_found' };
  if (!can(role, 'sender:manage')) return { ok: false, reason: 'forbidden' };
  if (seatStatus(sender) === 'active') return { ok: false, reason: 'is_live' };
  await prisma.senderIdentity.delete({ where: { id: senderId } });
  return { ok: true };
}

export type UpdateSenderResult =
  | { ok: true }
  | { ok: false; reason: 'forbidden' | 'not_found' | 'email_taken' | 'email_locked' };

/**
 * Gönderici düzenleme (Hüseyin, 2026-08-14). Ad ve ünvan her durumda
 * değişir; E-POSTA canlı göndericide KİLİTLİ (`email_locked`) — koltuk
 * "aktif gönderici kimliği"dir, canlıyken adres değiştirmek koltuk
 * muhasebesini silmedeki `is_live` kuralıyla aynı sebepten pas geçerdi.
 * Önce pasifleştir, sonra adresi değiştir.
 */
export async function updateSenderAs(
  userId: string,
  senderId: string,
  input: { displayName: string; email: string; jobTitle?: string },
): Promise<UpdateSenderResult> {
  const sender = await prisma.senderIdentity.findUnique({ where: { id: senderId } });
  if (!sender) return { ok: false, reason: 'not_found' };
  const role = await roleFor(userId, sender.orgId);
  if (!role) return { ok: false, reason: 'not_found' };
  if (!can(role, 'sender:manage')) return { ok: false, reason: 'forbidden' };

  const email = input.email.trim().toLowerCase();
  if (email !== sender.email && seatStatus(sender) === 'active') {
    return { ok: false, reason: 'email_locked' };
  }

  try {
    await prisma.senderIdentity.update({
      where: { id: senderId },
      data: {
        displayName: input.displayName.trim(),
        email,
        jobTitle: input.jobTitle?.trim() || null,
      },
    });
    return { ok: true };
  } catch (error) {
    // UNIQUE(orgId, email) — org içinde başka göndericinin adresi alınamaz.
    if ((error as { code?: string }).code === 'P2002') {
      return { ok: false, reason: 'email_taken' };
    }
    throw error;
  }
}

export interface SenderDetail {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  status: SeatStatus;
  createdAt: Date;
  publishedAt: Date | null;
  deactivatedAt: Date | null;
  signatures: Array<{ id: string; name: string; templateId: string; updatedAt: Date }>;
}

/** Gönderici detay sayfası — org kapsamı roleFor'la, yabancıya null. */
export async function getSenderAs(userId: string, senderId: string): Promise<SenderDetail | null> {
  const sender = await prisma.senderIdentity.findUnique({
    where: { id: senderId },
    include: {
      signatures: {
        select: { id: true, name: true, templateId: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });
  if (!sender) return null;
  const role = await roleFor(userId, sender.orgId);
  if (!role) return null;
  return {
    id: sender.id,
    displayName: sender.displayName,
    email: sender.email,
    jobTitle: sender.jobTitle,
    status: seatStatus(sender),
    createdAt: sender.createdAt,
    publishedAt: sender.publishedAt,
    deactivatedAt: sender.deactivatedAt,
    signatures: sender.signatures,
  };
}

export interface SenderRowData {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  status: SeatStatus;
  /** Atanmış imzaların adları — ekrandaki "atanmış imza" sütunu. */
  signatureNames: string[];
}

export async function listSenders(userId: string): Promise<SenderRowData[]> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return [];
  const rows = await prisma.senderIdentity.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
    include: { signatures: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    email: r.email,
    jobTitle: r.jobTitle,
    status: seatStatus(r),
    signatureNames: r.signatures.map((sig) => sig.name),
  }));
}

/** Koltuk göstergesinin tek kaynağı: fatura ağacındaki aktif / satın alınmış. */
export async function seatSummary(
  userId: string,
): Promise<{ active: number; entitled: number }> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return { active: 0, entitled: 0 };
  const billingOrgId = await resolveBillingOrgId(prisma, orgId);
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: billingOrgId } });
  return { active: await countActiveSeatsInTree(prisma, billingOrgId), entitled: org.entitledSeats };
}

export type BulkResult =
  | { ok: true; created: number; skipped: string[] }
  | { ok: false; reason: 'forbidden' };

/**
 * CSV içe aktarmanın veri ucu. HEPSİ TASLAK girer — koltuk sayacı kıpırdamaz
 * (brief §2.10: "CSV yüklemek koltuk harcamamalı"); bu yüzden tavana hiç
 * bakılmaz, tavan doluyken bile içe aktarma çalışır. Mevcut adresler adıyla
 * atlanır ki kullanıcı "kaç kişi zaten vardı" sorusunun cevabını görsün.
 */
export async function bulkCreateSenders(
  userId: string,
  rows: Array<{ displayName: string; email: string; jobTitle?: string }>,
): Promise<BulkResult> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };
  const role = await roleFor(userId, orgId);
  if (!role || !can(role, 'sender:manage')) return { ok: false, reason: 'forbidden' };

  const wanted = rows.map((r) => ({
    displayName: r.displayName.trim(),
    email: r.email.trim().toLowerCase(),
    jobTitle: r.jobTitle?.trim() || null,
  }));

  const existing = await prisma.senderIdentity.findMany({
    where: { orgId, email: { in: wanted.map((r) => r.email) } },
    select: { email: true },
  });
  const skippedSet = new Set(existing.map((e) => e.email));
  const fresh = wanted.filter((r) => !skippedSet.has(r.email));

  if (fresh.length > 0) {
    await prisma.senderIdentity.createMany({
      data: fresh.map((r) => ({ orgId, ...r })),
      // Yarış payı: sorgu ile ekleme arasında biri aynı adresi elle eklerse
      // toplu iş patlamasın, o satır sessizce düşsün.
      skipDuplicates: true,
    });
  }

  return { ok: true, created: fresh.length, skipped: [...skippedSet] };
}
