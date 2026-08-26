import { prisma } from '../db';
import { slaDueDate } from '../support-sla';
import { recordActivity } from './activity';
import { primaryOrgId } from './senders';

/**
 * MÜŞTERİ destek yazmaları (ticket v1, spec 2026-08-24). `admin.ts`e
 * bilerek girmez: oradaki numaralandırma testi her export'tan PERSONEL
 * kapısı bekler; buradaki kapı oturum + org üyeliğidir. Personel
 * sözleşmesi (AdminAction/StaffAccess) müşteri yazması için geçerli
 * değil — org'un kendi günlüğüne `ActivityEvent` düşülür.
 *
 * Panel içi yazışma YOK (v2 migration işi) — mesaj `summary`ye yazılır,
 * yanıt e-postayla döner.
 */

export const CUSTOMER_CASE_CATEGORIES = ['billing', 'builder', 'export', 'access', 'account'] as const;
export type CustomerCaseCategory = (typeof CUSTOMER_CASE_CATEGORIES)[number];

export type CustomerCaseStatus = 'open' | 'waiting_customer' | 'escalated' | 'resolved';

export type OpenCaseResult =
  | { ok: true; id: string; reference: string }
  | { ok: false; reason: 'no_org' | 'invalid_input' };

export interface CustomerCaseRow {
  id: string;
  reference: string;
  subject: string;
  category: CustomerCaseCategory;
  status: CustomerCaseStatus;
  createdAt: Date;
  updatedAt: Date;
}

const LIST_LIMIT = 50;
/** P2002 yarışında kaç sıra denenir — sonsuz döngü emniyeti. */
const REFERENCE_ATTEMPTS = 5;

export async function openSupportCase(
  userId: string,
  input: { subject: string; category: string; message: string },
): Promise<OpenCaseResult> {
  const subject = input.subject.trim().slice(0, 200);
  const message = input.message.trim().slice(0, 500);
  const category = input.category as CustomerCaseCategory;
  if (!subject || !message || !CUSTOMER_CASE_CATEGORIES.includes(category)) {
    return { ok: false, reason: 'invalid_input' };
  }

  const orgId = await primaryOrgId(userId);
  if (!orgId) return { ok: false, reason: 'no_org' };

  const [user, org] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
  ]);
  if (!user || !org) return { ok: false, reason: 'no_org' };

  const now = new Date();
  const prefix = `SUP-${now.getFullYear()}-`;
  // Staff aynı ad alanına (SUP-<yıl>-<sıra>) admin diyaloğundan elle
  // referans girebiliyor, bu yüzden count() ile "sıradaki" hesaplamak
  // yanıltıcı: yoğun elle girilmiş bir blok count'un üstündeyse
  // count+1 zaten dolu çıkar ve P2002 yeniden deneme bütçesi
  // (REFERENCE_ATTEMPTS) sona erip 500'e düşer. Bunun yerine mevcut
  // referansların EN YÜKSEK sayısal kuyruğundan devam edilir. Hacim
  // yılda yüzler mertebesinde olduğu için tüm satırları çekmek ucuz;
  // ayrıca 9999'u aşınca sıfır dolgusu uzar (`10000` > `9999` sayıca
  // ama `"10000"` < `"9999"` sözlüksel sırada) — bu yüzden metin sırasıyla
  // `orderBy reference desc` almak yerine ayrıştırılmış sayı üstünden
  // Math.max alınır.
  const existingRefs = await prisma.supportCase.findMany({
    where: { reference: { startsWith: prefix } },
    select: { reference: true },
  });
  let maxTail = 0;
  for (const row of existingRefs) {
    const tail = Number(row.reference.slice(prefix.length));
    if (Number.isInteger(tail) && tail > maxTail) maxTail = tail;
  }

  let created: { id: string; reference: string } | null = null;
  for (let attempt = 0; attempt < REFERENCE_ATTEMPTS && !created; attempt++) {
    const reference = `${prefix}${String(maxTail + 1 + attempt).padStart(4, '0')}`;
    try {
      created = await prisma.supportCase.create({
        data: {
          reference,
          subject,
          orgId,
          orgName: org.name,
          requesterEmail: user.email,
          channel: 'form',
          category,
          // Müşteriye sorulmaz — staff panelden yükseltir (onaylı kapsam).
          priority: 'normal',
          slaDueAt: slaDueDate(now, 'normal'),
          summary: message,
        },
        select: { id: true, reference: true },
      });
    } catch (err) {
      // Duck-typing (admin createSupportCase emsali): yarışta aynı sıra
      // üretilmiş olabilir — bir sonrakiyle yeniden dene.
      if ((err as { code?: string })?.code !== 'P2002') throw err;
    }
  }
  if (!created) throw new Error('Referans üretilemedi — art arda çakışma.');

  // Transaction dışı ve hata yutar — günlük yüzünden vaka açma devrilmez.
  await recordActivity({
    orgId,
    actorUserId: userId,
    type: 'support.case_opened',
    targetType: 'support',
    targetId: created.id,
    payload: { reference: created.reference, subject, category },
  });

  return { ok: true, id: created.id, reference: created.reference };
}

export async function listOwnSupportCases(userId: string): Promise<CustomerCaseRow[] | null> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return null;

  const rows = await prisma.supportCase.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: {
      id: true,
      reference: true,
      subject: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    category: r.category as CustomerCaseCategory,
    status: r.status as CustomerCaseStatus,
  }));
}
