import { Prisma } from '@prisma/client';
import { renderSignature, type SignatureData } from '@mailmyra/renderer';

import { mergeWithEmpty } from '../../app/builder/reducer';
import { applyBrand } from '../brand-apply';
import { prisma } from '../db';
import type { ActivityType } from './activity';
import { getBrand } from './brand';
import { countActiveSeats } from './senders';

/**
 * Platform personelinin (Voldi) müşteri verisine baktığı TEK yol.
 *
 * ── Neden ayrı modül ────────────────────────────────────────────────────
 * Bu kod tabanının en güçlü yapısal güvencesi, her repo fonksiyonunun bir
 * `orgId` istemesi: çapraz-org veri sızıntısı kaza eseri OLAMIYOR. Süper
 * admin bunu bozmamalı.
 *
 * Yanlış yol, mevcut fonksiyonların içine `if (isStaff) orgId filtresini
 * atla` serpiştirmek olurdu — bypass bütün kod tabanına yayılır ve bundan
 * sonra yazılan her fonksiyon potansiyel sızıntı olur. Onun yerine kilit
 * hiç açılmıyor: org'lar arası sorgu YALNIZ burada, bilerek kuruluyor.
 * `lib/repo/*` içindeki hiçbir dosyaya bu iş için dokunulmadı.
 *
 * ── Kontrol neden her fonksiyonda tekrarlanıyor ─────────────────────────
 * Ortak bir kapıya (layout, middleware) güvenilmiyor. Bu proje o dersi
 * aldı: `app/(app)/app/senders/page.tsx` "Layout korumasına GÜVENME — App
 * Router layout ile sayfayı paralel render edebiliyor" diye not düşüyor
 * (canlıda 500 olarak görüldü). Burada bedeli daha ağır olurdu: unutulan
 * bir kontrol müşteri verisini açar. O yüzden her dışa açık fonksiyon ilk
 * satırında `requireStaff` çağırır — tekrar, burada bir erdemdir.
 *
 * ── Üç güvenlik sözleşmesi (2026-08-19 denetim turu) ────────────────────
 * 1. KİŞİSEL VERİ OKUMALARI KAPALIYA DÜŞER: önce hedef org kişisel veri
 *    YÜKLENMEDEN çözülür, `StaffAccess` satırı yazılır, ANCAK ondan sonra
 *    kişisel veri döner. Günlük yazılamıyorsa ekran açılmaz — KVKK erişim
 *    izi "elimizden geleni yaptık" ile tutulamaz.
 * 2. YAZMALAR TEK TRANSACTION: iş değişikliği + değişmez iç denetim kaydı
 *    (`AdminAction`, before/after + sebep) + müşteriye görünen aktivite
 *    satırı birlikte yazılır; denetim yazılamazsa değişiklik geri alınır.
 * 3. HER YAZMA SEBEP İSTER: boş sebeple işlem yok. Üç ay sonra "neden 5
 *    koltuk verdim" sorusunun cevabı ekranda değil kayıtta durur.
 *
 * ── Kapsam ──────────────────────────────────────────────────────────────
 * İlk 10 müşteriyi ELLE faturalamak (CLAUDE.md kilitli kararı) + destek
 * için salt-okunur müşteri görünümü. Yazma yalnız fatura ve hak ediş
 * alanlarında; müşterinin imzasına, göndericisine, üyesine DOKUNULMAZ.
 *
 * Kimliğe bürünme (impersonation) BİLEREK YOK: denetim izini bulanıklaştırır
 * ve KVKK tarafında savunulması zor bir yetkidir.
 */

export class NotStaffError extends Error {
  constructor() {
    super('Bu işlem için platform personeli olmak gerekir.');
    this.name = 'NotStaffError';
  }
}

interface StaffUser {
  id: string;
  email: string;
}

/** İstek bağlamı — erişim ve denetim kayıtlarına işlenir. Sayfa/uç verir. */
export interface StaffContext {
  ip?: string;
  userAgent?: string;
}

/**
 * Personel mi? Değilse **fırlatır** — `null` dönmüyor.
 *
 * Bilerek: `null` dönen bir kapı, çağıran yerde kontrol edilmeyi unutulabilir
 * ve akış sessizce devam eder. Fırlatma unutulamaz.
 *
 * Bayrak her çağrıda veritabanından okunuyor, oturumdan değil: `isStaff`
 * `SessionUser`a KOYULMADI ki tip sistemi bu kavramı sıradan koda hiç
 * sunmasın ve `if (session.user.isStaff)` kontrolleri panele yayılmasın.
 * Yan faydası: yetki geri alındığında açık oturumlar beklemez.
 */
export async function requireStaff(userId: string): Promise<StaffUser> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isStaff: true },
  });
  if (!user?.isStaff) throw new NotStaffError();
  return { id: user.id, email: user.email };
}

/** Personel oturumdaki kullanıcı mı — arayüzün menü/link göstermesi için. */
export async function isStaff(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isStaff: true },
  });
  return user?.isStaff === true;
}

/** Boş gerekçeyle yazma yok. Kırpar, sınırlar, boşsa fırlatır. */
function requireReason(reason: string): string {
  const cleaned = reason.trim().slice(0, 500);
  if (!cleaned) throw new Error('Sebep zorunlu — sessiz değişiklik yok.');
  return cleaned;
}

export type AccessScope = 'org' | 'senders' | 'signatures' | 'signature';

/**
 * Müşterinin KİŞİSEL verisine her bakış buraya düşer — ve bu yazma
 * BAŞARISIZSA OKUMA DA BAŞARISIZDIR. Hata bilerek yutulmuyor
 * (`recordActivity`nin aksine): o, müşteriye gösterilen akış; bu, KVKK
 * erişim izi. "Günlük yazılamadı ama ekranı yine de açtık" kabul edilemez.
 *
 * Müşterinin kendi akışına (`ActivityEvent`) YAZILMIYOR: destek için
 * yapılan her bakış oraya gitseydi hem akış gürültüye boğulur hem müşteri
 * tedirgin olurdu. Personelin YAZMA işlemleri ise oraya gider.
 */
async function logAccess(
  staff: StaffUser,
  org: { id: string; name: string },
  scope: AccessScope,
  ctx?: StaffContext,
  targetId?: string,
): Promise<void> {
  await prisma.staffAccess.create({
    data: {
      staffUserId: staff.id,
      staffEmail: staff.email,
      orgId: org.id,
      orgName: org.name,
      scope,
      targetId: targetId ?? null,
      ip: ctx?.ip?.slice(0, 45) ?? null,
      userAgent: ctx?.userAgent?.slice(0, 512) ?? null,
    },
  });
}

/** Değişmez iç denetim satırı — YALNIZ transaction içinden çağrılır. */
async function audit(
  tx: Prisma.TransactionClient,
  staff: StaffUser,
  entry: {
    org: { id: string; name: string };
    action: 'entitlement.set' | 'invoice.created' | 'invoice.status_set';
    targetId?: string;
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    reason: string;
    ctx?: StaffContext;
  },
): Promise<void> {
  await tx.adminAction.create({
    data: {
      staffUserId: staff.id,
      staffEmail: staff.email,
      orgId: entry.org.id,
      orgName: entry.org.name,
      action: entry.action,
      targetId: entry.targetId ?? null,
      before: entry.before as Prisma.InputJsonValue,
      after: entry.after as Prisma.InputJsonValue,
      reason: entry.reason,
      ip: entry.ctx?.ip?.slice(0, 45) ?? null,
      userAgent: entry.ctx?.userAgent?.slice(0, 512) ?? null,
    },
  });
}

/** Müşteriye görünen aktivite satırı — YALNIZ transaction içinden. */
async function customerActivity(
  tx: Prisma.TransactionClient,
  entry: {
    orgId: string;
    actorUserId: string;
    type: ActivityType;
    targetId?: string;
    payload: Record<string, unknown>;
  },
): Promise<void> {
  await tx.activityEvent.create({
    data: {
      orgId: entry.orgId,
      actorUserId: entry.actorUserId,
      type: entry.type,
      targetId: entry.targetId ?? null,
      payload: entry.payload as Prisma.InputJsonValue,
    },
  });
}

// ─── Okuma ────────────────────────────────────────────────────────────────

export interface AdminOrgRow {
  id: string;
  name: string;
  createdAt: Date;
  entitlementState: string;
  entitledSeats: number;
  activeSeats: number;
  trialEndsAt: Date | null;
  memberCount: number;
  /** Ajans ağacındaki müşteri org sayısı — 0 ise düz hesap. */
  childCount: number;
}

/**
 * Faturalanabilir müşteri listesi.
 *
 * Yalnız KÖK org'lar: fatura ajans ağacının köküne kesiliyor
 * (`repo/invoices.ts` aynı kural), müşteri org'ları kökün detayında
 * görünür. Aktif koltuk `countActiveSeats` ile ağacın tamamından sayılır.
 *
 * Bu liste `StaffAccess`e YAZMIYOR: içinde müşteri çalışanlarının kişisel
 * verisi yok — org adı, koltuk sayısı ve plan durumu Voldi'nin kendi ticari
 * kaydı. Günlük, kişisel veriye inildiğinde tutuluyor.
 */
export async function listOrganizations(staffUserId: string): Promise<AdminOrgRow[]> {
  await requireStaff(staffUserId);

  const orgs = await prisma.organization.findMany({
    where: { parentOrgId: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      createdAt: true,
      entitlementState: true,
      entitledSeats: true,
      trialEndsAt: true,
      _count: { select: { memberships: true, children: true } },
    },
  });

  // Koltuk sayımı org başına bir sorgu. 10 müşteri için N+1 endişesi yok;
  // liste büyürse tek sorguluk toplu sayıma geçilir.
  return Promise.all(
    orgs.map(async (o) => ({
      id: o.id,
      name: o.name,
      createdAt: o.createdAt,
      entitlementState: o.entitlementState,
      entitledSeats: o.entitledSeats,
      activeSeats: await countActiveSeats(o.id),
      trialEndsAt: o.trialEndsAt,
      memberCount: o._count.memberships,
      childCount: o._count.children,
    })),
  );
}

/**
 * Aktivasyon kontrol listesi — "müşteri nerede takıldı" sorusunun tek
 * bakışlık cevabı. İlk 10 müşteri elle büyütülecek; bu beş adım, destek
 * aramasından ÖNCE neyin eksik olduğunu söyler. Brief'teki "health score"un
 * şişirilmemiş hâli: skor yok, ağırlık yok, beş çıplak gerçek var.
 */
export interface ActivationChecklist {
  emailVerified: boolean;
  signatureCreated: boolean;
  senderCreated: boolean;
  senderPublished: boolean;
  exported: boolean;
}

export interface AdminOrgDetail extends AdminOrgRow {
  members: Array<{ email: string; role: string; joinedAt: Date }>;
  children: Array<{ id: string; name: string; createdAt: Date }>;
  activation: ActivationChecklist;
}

/**
 * Tek müşterinin künyesi + üyeleri. Üye e-postaları kişisel veri; sıra bu
 * yüzden katı: önce org KİŞİSEL VERİSİZ çözülür, günlük yazılır, kişisel
 * veri EN SON yüklenir. Günlük yazılamazsa fırlatır ve veri hiç yüklenmez.
 */
export async function getOrganization(
  staffUserId: string,
  orgId: string,
  ctx?: StaffContext,
): Promise<AdminOrgDetail | null> {
  const staff = await requireStaff(staffUserId);

  // 1) Kişisel veri içermeyen çözümleme — yoksa günlüğe de gerek yok.
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return null;

  // 2) Erişim kaydı. Fırlatırsa okuma burada biter — kapalıya düşme.
  await logAccess(staff, org, 'org', ctx);

  // 3) Ancak şimdi kişisel veri.
  const full = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      entitlementState: true,
      entitledSeats: true,
      trialEndsAt: true,
      memberships: {
        select: {
          role: true,
          createdAt: true,
          user: { select: { email: true, emailVerifiedAt: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      children: {
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!full) return null;

  // Aktivasyon: üç sayım tek round-trip'te. Org'un KENDİ kayıtları —
  // ajans ağacı değil; onboarding çalışma alanı bazında takılır.
  const [signatureCount, senderCount, publishedCount, exportedCount] = await Promise.all([
    prisma.signature.count({ where: { orgId } }),
    prisma.senderIdentity.count({ where: { orgId } }),
    prisma.senderIdentity.count({ where: { orgId, publishedAt: { not: null } } }),
    prisma.senderIdentity.count({ where: { orgId, lastExportedAt: { not: null } } }),
  ]);

  return {
    id: full.id,
    name: full.name,
    createdAt: full.createdAt,
    entitlementState: full.entitlementState,
    entitledSeats: full.entitledSeats,
    activeSeats: await countActiveSeats(full.id),
    trialEndsAt: full.trialEndsAt,
    memberCount: full.memberships.length,
    childCount: full.children.length,
    members: full.memberships.map((m) => ({
      email: m.user.email,
      role: m.role,
      joinedAt: m.createdAt,
    })),
    children: full.children,
    activation: {
      emailVerified: full.memberships.some((m) => m.user.emailVerifiedAt !== null),
      signatureCreated: signatureCount > 0,
      senderCreated: senderCount > 0,
      senderPublished: publishedCount > 0,
      exported: exportedCount > 0,
    },
  };
}

export interface AdminSenderRow {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  publishedAt: Date | null;
  deactivatedAt: Date | null;
  lastExportedAt: Date | null;
  signatureCount: number;
}

/** Müşterinin göndericileri — SALT OKUNUR. Günlük yazılamazsa açılmaz. */
export async function listOrgSenders(
  staffUserId: string,
  orgId: string,
  ctx?: StaffContext,
): Promise<AdminSenderRow[]> {
  const staff = await requireStaff(staffUserId);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return [];

  await logAccess(staff, org, 'senders', ctx);

  const rows = await prisma.senderIdentity.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      displayName: true,
      email: true,
      jobTitle: true,
      publishedAt: true,
      deactivatedAt: true,
      lastExportedAt: true,
      _count: { select: { signatures: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    displayName: r.displayName,
    email: r.email,
    jobTitle: r.jobTitle,
    publishedAt: r.publishedAt,
    deactivatedAt: r.deactivatedAt,
    lastExportedAt: r.lastExportedAt,
    signatureCount: r._count.signatures,
  }));
}

// ─── Yazma ────────────────────────────────────────────────────────────────

/**
 * Hak ediş düzeltmesi: koltuk, plan durumu, deneme bitişi.
 *
 * Tek transaction: güncelleme + `AdminAction` (before/after + sebep) +
 * müşteriye görünen aktivite. Denetim yazılamazsa değişiklik geri alınır.
 */
export async function setEntitlement(
  staffUserId: string,
  orgId: string,
  patch: {
    entitledSeats?: number;
    entitlementState?: 'trial' | 'active' | 'past_due' | 'cancelled';
    trialEndsAt?: Date | null;
  },
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  if (patch.entitledSeats !== undefined && patch.entitledSeats < 1) {
    throw new Error('entitledSeats en az 1 olmalı.');
  }

  await prisma.$transaction(async (tx) => {
    const before = await tx.organization.findUnique({
      where: { id: orgId },
      select: { name: true, entitledSeats: true, entitlementState: true, trialEndsAt: true },
    });
    if (!before) throw new Error(`Organization ${orgId} bulunamadı.`);

    const org = await tx.organization.update({
      where: { id: orgId },
      data: {
        ...(patch.entitledSeats !== undefined ? { entitledSeats: patch.entitledSeats } : {}),
        ...(patch.entitlementState ? { entitlementState: patch.entitlementState } : {}),
        ...(patch.trialEndsAt !== undefined ? { trialEndsAt: patch.trialEndsAt } : {}),
      },
      select: { id: true, name: true, entitledSeats: true, entitlementState: true, trialEndsAt: true },
    });

    await audit(tx, staff, {
      org: { id: org.id, name: org.name },
      action: 'entitlement.set',
      before: {
        entitledSeats: before.entitledSeats,
        entitlementState: before.entitlementState,
        trialEndsAt: before.trialEndsAt?.toISOString() ?? null,
      },
      after: {
        entitledSeats: org.entitledSeats,
        entitlementState: org.entitlementState,
        trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
      },
      reason: cleanReason,
      ctx,
    });

    await customerActivity(tx, {
      orgId: org.id,
      actorUserId: staff.id,
      type: 'support.entitlement_changed',
      payload: {
        entitledSeats: org.entitledSeats,
        entitlementState: org.entitlementState,
        trialEndsAt: org.trialEndsAt ? org.trialEndsAt.toISOString().slice(0, 10) : '',
      },
    });
  });
}

export interface NewInvoice {
  orgId: string;
  number: string;
  issuedAt: Date;
  dueAt?: Date | null;
  seats: number;
  unitCents?: number;
  amountCents: number;
  currency?: string;
  note?: string | null;
}

/**
 * Fatura kaydı açar. Tutar HESAPLANMIYOR, veriliyor: `amountCents` gerçeğin
 * kaynağı (`repo/invoices.ts` aynı kural) — indirim, kur farkı ve elle
 * düzeltme seats×unit'e sığmıyor.
 *
 * Numara benzersizliği `@unique` kısıtına emanet: iki personel aynı anda
 * aynı numarayı önerirse İKİNCİSİ burada net bir hatayla döner — "önerilen
 * sıradaki numara" tek başına eşzamanlılığa karşı güvenli değildir.
 */
export async function createInvoice(
  staffUserId: string,
  input: NewInvoice,
  reason: string,
  ctx?: StaffContext,
): Promise<string> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  if (input.seats < 1) throw new Error('seats en az 1 olmalı.');
  if (input.amountCents < 0) throw new Error('amountCents negatif olamaz.');

  try {
    return await prisma.$transaction(async (tx) => {
      const org = await tx.organization.findUnique({
        where: { id: input.orgId },
        select: { id: true, name: true },
      });
      if (!org) throw new Error(`Organization ${input.orgId} bulunamadı.`);

      const inv = await tx.invoice.create({
        data: {
          orgId: input.orgId,
          number: input.number.trim(),
          issuedAt: input.issuedAt,
          dueAt: input.dueAt ?? null,
          seats: input.seats,
          unitCents: input.unitCents ?? 100,
          amountCents: input.amountCents,
          currency: input.currency ?? 'USD',
          note: input.note ?? null,
        },
        select: { id: true, number: true, seats: true, amountCents: true, currency: true },
      });

      await audit(tx, staff, {
        org,
        action: 'invoice.created',
        targetId: inv.id,
        before: {},
        after: {
          number: inv.number,
          seats: inv.seats,
          amountCents: inv.amountCents,
          currency: inv.currency,
        },
        reason: cleanReason,
        ctx,
      });

      await customerActivity(tx, {
        orgId: input.orgId,
        actorUserId: staff.id,
        type: 'support.invoice_issued',
        targetId: inv.id,
        payload: { number: inv.number, seats: inv.seats },
      });

      return inv.id;
    });
  } catch (err) {
    // Duck-typing, instanceof değil: hata Prisma'nın sarmalayıcılarından
    // hangisiyle gelirse gelsin `code` alanı sabit.
    if ((err as { code?: string })?.code === 'P2002') {
      throw new Error(
        `Fatura numarası zaten kullanılmış: ${input.number.trim()}. Sıradaki numarayı yeniden kontrol et.`,
      );
    }
    throw err;
  }
}

/**
 * Geri-açma / iptal. Fatura SİLİNMEZ — `void` ile iptal edilir.
 *
 * `paid` bu fonksiyondan BİLEREK geçmez: ödendi işareti muhasebe kaydıdır
 * (tarih + yöntem + dekont) ve o alanlar olmadan atılamamalı —
 * `markInvoicePaid` kullanılır. Buradan yalnız `due`ya geri açılır ya da
 * `void`a çekilir; iki geçişte de ödeme alanları temizlenir ki "void ama
 * ödeme kaydı duruyor" gibi çelişkili satır oluşmasın.
 */
export async function setInvoiceStatus(
  staffUserId: string,
  invoiceId: string,
  status: 'due' | 'void',
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const before = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true, number: true, org: { select: { id: true, name: true } } },
    });
    if (!before) throw new Error(`Invoice ${invoiceId} bulunamadı.`);

    const inv = await tx.invoice.update({
      where: { id: invoiceId },
      data: { status, paidAt: null, paymentMethod: null, paymentReference: null },
      select: { orgId: true, number: true, status: true },
    });

    await audit(tx, staff, {
      org: before.org,
      action: 'invoice.status_set',
      targetId: invoiceId,
      before: { status: before.status },
      after: { status: inv.status },
      reason: cleanReason,
      ctx,
    });

    await customerActivity(tx, {
      orgId: inv.orgId,
      actorUserId: staff.id,
      type: 'support.invoice_status_changed',
      targetId: invoiceId,
      payload: { number: inv.number, status: inv.status },
    });
  });
}

// ─── Denetim ──────────────────────────────────────────────────────────────

export interface StaffAccessRow {
  id: string;
  staffEmail: string;
  orgId: string;
  orgName: string;
  scope: string;
  targetId: string | null;
  createdAt: Date;
}

/**
 * Erişim günlüğü. "Bu müşteriye kim baktı" sorusunun cevabı — KVKK talebi
 * geldiğinde sorulacak soru bu.
 */
export async function listStaffAccess(
  staffUserId: string,
  filter?: { orgId?: string },
): Promise<StaffAccessRow[]> {
  await requireStaff(staffUserId);

  return prisma.staffAccess.findMany({
    where: filter?.orgId ? { orgId: filter.orgId } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      staffEmail: true,
      orgId: true,
      orgName: true,
      scope: true,
      targetId: true,
      createdAt: true,
    },
  });
}

export interface AdminActionRow {
  id: string;
  staffEmail: string;
  orgName: string;
  action: string;
  targetId: string | null;
  before: unknown;
  after: unknown;
  reason: string;
  createdAt: Date;
}

/** Yazma denetimi. "Kim, neyi, neden değiştirdi" — iç defter. */
export async function listAdminActions(
  staffUserId: string,
  filter?: { orgId?: string },
): Promise<AdminActionRow[]> {
  await requireStaff(staffUserId);

  return prisma.adminAction.findMany({
    where: filter?.orgId ? { orgId: filter.orgId } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      staffEmail: true,
      orgName: true,
      action: true,
      targetId: true,
      before: true,
      after: true,
      reason: true,
      createdAt: true,
    },
  });
}

// ─── İmzalar (salt okunur, tıkla-aç önizleme) ─────────────────────────────

export interface AdminSignatureRow {
  id: string;
  name: string;
  templateId: string | null;
  senderName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Müşterinin imza listesi — YALNIZ üstveri. İçerik (ad-soyad, telefon,
 * adres) burada dönmez; onun için tekil önizleme var. Liste bu yüzden
 * `scope='signatures'` ile loglanır, içerik `scope='signature'` +
 * `targetId` ile — "listeye baktı" ile "şu imzayı açtı" ayrı kayıtlardır.
 */
export async function listOrgSignatures(
  staffUserId: string,
  orgId: string,
  ctx?: StaffContext,
): Promise<AdminSignatureRow[]> {
  const staff = await requireStaff(staffUserId);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) return [];

  await logAccess(staff, org, 'signatures', ctx);

  const rows = await prisma.signature.findMany({
    where: { orgId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      data: true,
      createdAt: true,
      updatedAt: true,
      sender: { select: { displayName: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    templateId:
      ((r.data as Partial<SignatureData>)?.layout?.templateId as string | undefined) ?? null,
    senderName: r.sender?.displayName ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export type PreviewResult =
  | { ok: true; html: string; name: string; orgName: string }
  | { ok: false; reason: 'not_found' | 'render_failed' };

/**
 * Tek imzanın gerçek render çıktısı — tıkla-aç, otomatik değil.
 *
 * Listedeki her imzayı kendiliğinden render etmek, tek sayfa açılışında
 * onlarca kişinin iletişim bilgisini yüklemek demek olurdu; önizleme bu
 * yüzden istek üzerine ve TEKİL loglanır (`scope='signature'` + targetId).
 *
 * Render müşterinin gördüğüyle AYNI yoldan: marka bindirmesi çıkışta
 * uygulanır (`renderSavedSignature` emsali), kayıt yeniden yazılmaz.
 * Çıktı arayüzde sandboxed iframe'de gösterilmeli; düzenleme yolu yok.
 */
export async function getSignaturePreview(
  staffUserId: string,
  signatureId: string,
  ctx?: StaffContext,
): Promise<PreviewResult> {
  const staff = await requireStaff(staffUserId);

  // Kişisel veri İÇERMEYEN çözümleme: yalnız ad ve org.
  const sig = await prisma.signature.findUnique({
    where: { id: signatureId },
    select: { id: true, name: true, org: { select: { id: true, name: true } } },
  });
  if (!sig) return { ok: false, reason: 'not_found' };

  // Erişim kaydı İÇERİKTEN önce — yazılamazsa fırlatır, veri hiç yüklenmez.
  await logAccess(staff, sig.org, 'signature', ctx, sig.id);

  const full = await prisma.signature.findUnique({
    where: { id: signatureId },
    select: { data: true },
  });
  if (!full) return { ok: false, reason: 'not_found' };

  const brand = await getBrand(sig.org.id);
  const data = applyBrand(mergeWithEmpty(full.data as Partial<SignatureData>), brand);

  try {
    return {
      ok: true,
      html: renderSignature(
        data,
        data.layout.templateId,
        process.env.CDN_PUBLIC_URL ? { iconBaseUrl: process.env.CDN_PUBLIC_URL } : undefined,
      ),
      name: sig.name,
      orgName: sig.org.name,
    };
  } catch {
    return { ok: false, reason: 'render_failed' };
  }
}

// ─── Ödeme kaydı ──────────────────────────────────────────────────────────

export type PaymentMethod = 'bank_transfer' | 'cash' | 'other';

/**
 * Ödendi işareti = muhasebe kaydı. `status`u elle 'paid' yapmak yasak
 * (setInvoiceStatus kabul etmiyor); tarih + yöntem + dekont buradan girer.
 * Aynı transaction sözleşmesi: iş + AdminAction + müşteri aktivitesi.
 */
export async function markInvoicePaid(
  staffUserId: string,
  invoiceId: string,
  payment: { paidAt: Date; method: PaymentMethod; reference?: string | null },
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const before = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true, number: true, org: { select: { id: true, name: true } } },
    });
    if (!before) throw new Error(`Invoice ${invoiceId} bulunamadı.`);
    if (before.status === 'void') {
      // Void'e ödeme almak muhasebe çelişkisi — önce due'ya geri açılır.
      throw new Error('İptal edilmiş faturaya ödeme kaydedilemez.');
    }

    const inv = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: payment.paidAt,
        paymentMethod: payment.method,
        paymentReference: payment.reference?.trim().slice(0, 128) || null,
      },
      select: { orgId: true, number: true, status: true },
    });

    await audit(tx, staff, {
      org: before.org,
      action: 'invoice.status_set',
      targetId: invoiceId,
      before: { status: before.status },
      after: {
        status: 'paid',
        paidAt: payment.paidAt.toISOString(),
        method: payment.method,
        reference: payment.reference ?? null,
      },
      reason: cleanReason,
      ctx,
    });

    await customerActivity(tx, {
      orgId: inv.orgId,
      actorUserId: staff.id,
      type: 'support.invoice_status_changed',
      targetId: invoiceId,
      payload: { number: inv.number, status: 'paid' },
    });
  });
}

// ─── Komuta merkezi kuyrukları ────────────────────────────────────────────

export interface AdminQueues {
  /** 7 gün içinde denemesi bitenler. */
  trialsEnding: AdminOrgRow[];
  /** Aktif koltuğu hak edileni aşanlar. */
  overEntitlement: AdminOrgRow[];
  /** Deneme süresi GEÇMİŞ ama hâlâ `trial` görünenler — veri tutarsızlığı. */
  expiredTrials: AdminOrgRow[];
  /** Vadesi geçmiş açık faturalar. */
  overdueInvoices: Array<{
    id: string;
    number: string;
    orgName: string;
    orgId: string;
    amountCents: number;
    currency: string;
    dueAt: Date;
    overdueDays: number;
  }>;
}

/**
 * "Bugün ne yapmalıyım" — süs grafiği yok, her kuyruk eyleme açılır.
 * Org kuyrukları `listOrganizations`ın tek geçişinden türetilir; 10 müşteri
 * ölçeğinde ayrı sorgu kurmaya değmez.
 */
export async function listAdminQueues(staffUserId: string): Promise<AdminQueues> {
  const orgs = await listOrganizations(staffUserId); // kapı burada

  const now = Date.now();
  const in7d = now + 7 * 24 * 60 * 60 * 1000;

  const overdueRows = await prisma.invoice.findMany({
    where: { status: 'due', dueAt: { lt: new Date(now) } },
    orderBy: { dueAt: 'asc' },
    select: {
      id: true,
      number: true,
      orgId: true,
      amountCents: true,
      currency: true,
      dueAt: true,
      org: { select: { name: true } },
    },
  });

  return {
    trialsEnding: orgs.filter(
      (o) =>
        o.entitlementState === 'trial' &&
        o.trialEndsAt !== null &&
        o.trialEndsAt.getTime() > now &&
        o.trialEndsAt.getTime() <= in7d,
    ),
    overEntitlement: orgs.filter((o) => o.activeSeats > o.entitledSeats),
    expiredTrials: orgs.filter(
      (o) =>
        o.entitlementState === 'trial' &&
        o.trialEndsAt !== null &&
        o.trialEndsAt.getTime() <= now,
    ),
    overdueInvoices: overdueRows.map((r) => ({
      id: r.id,
      number: r.number,
      orgId: r.orgId,
      orgName: r.org.name,
      amountCents: r.amountCents,
      currency: r.currency,
      dueAt: r.dueAt as Date,
      overdueDays: Math.floor((now - (r.dueAt as Date).getTime()) / (24 * 60 * 60 * 1000)),
    })),
  };
}

// ─── Global arama ─────────────────────────────────────────────────────────

export interface AdminSearchResult {
  orgs: Array<{ id: string; name: string; entitlementState: string }>;
  invoices: Array<{ id: string; number: string; orgId: string; orgName: string; status: string }>;
  /** YALNIZ birebir e-posta eşleşmesi — aşağıdaki gerekçeye bak. */
  users: Array<{ email: string; orgs: Array<{ id: string; name: string; role: string }> }>;
}

/**
 * Tek kutu: org adı (parça), fatura numarası (parça), üye e-postası
 * (YALNIZ birebir). E-postada parça araması bilerek yok: "@gmail" yazıp
 * bütün müşteri çalışanlarını dökmek, erişim günlüğünün etrafından dolanan
 * bir kişisel veri taraması olurdu. Personelin zaten bildiği adresi tam
 * yazması gerekir; sonuç da yalnız o kişinin hangi org'da olduğunu söyler —
 * detayına inince org okuma günlüğü devreye girer.
 */
export async function searchAdmin(
  staffUserId: string,
  query: string,
): Promise<AdminSearchResult> {
  await requireStaff(staffUserId);

  const q = query.trim();
  if (q.length < 2) return { orgs: [], invoices: [], users: [] };

  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q);

  const [orgs, invoices, user] = await Promise.all([
    prisma.organization.findMany({
      where: { name: { contains: q } },
      take: 10,
      select: { id: true, name: true, entitlementState: true },
    }),
    prisma.invoice.findMany({
      where: { number: { contains: q } },
      take: 10,
      select: {
        id: true,
        number: true,
        orgId: true,
        status: true,
        org: { select: { name: true } },
      },
    }),
    looksLikeEmail
      ? prisma.user.findUnique({
          where: { email: q.toLowerCase() },
          select: {
            email: true,
            memberships: {
              select: { role: true, org: { select: { id: true, name: true } } },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  return {
    orgs,
    invoices: invoices.map((i) => ({
      id: i.id,
      number: i.number,
      orgId: i.orgId,
      orgName: i.org.name,
      status: i.status,
    })),
    users: user
      ? [
          {
            email: user.email,
            orgs: user.memberships.map((m) => ({
              id: m.org.id,
              name: m.org.name,
              role: m.role,
            })),
          },
        ]
      : [],
  };
}

// ─── Org faturaları ───────────────────────────────────────────────────────

export interface AdminInvoiceRow {
  id: string;
  number: string;
  orgId: string;
  orgName: string;
  issuedAt: Date;
  dueAt: Date | null;
  seats: number;
  amountCents: number;
  currency: string;
  status: string;
  paidAt: Date | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  note: string | null;
}

/**
 * Fatura listesi — org verilirse onunki, verilmezse hepsi. Ticari kayıt,
 * kişisel veri değil (`listOrganizations` gerekçesi): erişim günlüğüne
 * yazılmaz.
 */
export async function listInvoicesAdmin(
  staffUserId: string,
  filter?: { orgId?: string },
): Promise<AdminInvoiceRow[]> {
  await requireStaff(staffUserId);

  const rows = await prisma.invoice.findMany({
    where: filter?.orgId ? { orgId: filter.orgId } : {},
    orderBy: { issuedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      number: true,
      orgId: true,
      issuedAt: true,
      dueAt: true,
      seats: true,
      amountCents: true,
      currency: true,
      status: true,
      paidAt: true,
      paymentMethod: true,
      paymentReference: true,
      note: true,
      org: { select: { name: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    number: r.number,
    orgId: r.orgId,
    orgName: r.org.name,
    issuedAt: r.issuedAt,
    dueAt: r.dueAt,
    seats: r.seats,
    amountCents: r.amountCents,
    currency: r.currency,
    status: r.status,
    paidAt: r.paidAt,
    paymentMethod: r.paymentMethod,
    paymentReference: r.paymentReference,
    note: r.note,
  }));
}
