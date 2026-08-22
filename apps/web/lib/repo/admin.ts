import { Prisma } from '@prisma/client';
import { renderSignature, type SignatureData } from '@mailmyra/renderer';

import { mergeWithEmpty } from '../../app/builder/reducer';
import { applyBrand } from '../brand-apply';
import { prisma } from '../db';
import { probeCdn, probeSmtp } from '../health-probes';
import { statutoryDueDate } from '../kvkk';
import { nextPlannedRun } from '../report-schedule';
import { REPORT_BUILDERS, TABLELESS_REPORTS } from '../reports/registry';
import { slaDueDate, type SupportPriority } from '../support-sla';
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

export type AccessScope =
  | 'org'
  | 'members'
  | 'senders'
  | 'signatures'
  | 'signature'
  | 'kvkk'
  | 'support';

/** Destek defterinin günlükteki sentetik kimliği — KVKK_REGISTER emsali:
 *  vakalar org'lar arası tek listede ve `requesterEmail` kişisel veri. */
export const SUPPORT_REGISTER = { id: 'support-register', name: 'Support register' } as const;

/** KVKK kayıt defterinin günlükteki sentetik kimliği: talepler tek bir
 *  müşteriye ait değil, platformun kendi yasal defteri — ama içindeki
 *  `subjectEmail` kişisel veri olduğu için OKUMASI yine loglanır. */
export const KVKK_REGISTER = { id: 'kvkk-register', name: 'KVKK register' } as const;

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
    action:
      | 'entitlement.set'
      | 'invoice.created'
      | 'invoice.status_set'
      | 'approval.created'
      | 'approval.decided'
      | 'approval.cancelled'
      | 'kvkk.created'
      | 'kvkk.identity_verified'
      | 'kvkk.owner_assigned'
      | 'kvkk.evidence_added'
      | 'kvkk.status_changed'
      | 'kvkk.completed'
      | 'support.case_created'
      | 'support.case_status_set'
      | 'support.case_owner_set'
      | 'support.case_priority_set'
      | 'error.state_set'
      | 'lead.created'
      | 'lead.updated'
      | 'report.schedule_created'
      | 'report.schedule_status_set'
      | 'staff.flag_set';
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
  priceVersion: string;
  entitlementState: string;
  entitledSeats: number;
  activeSeats: number;
  trialEndsAt: Date | null;
  memberCount: number;
  /** Ajans ağacındaki müşteri org sayısı — 0 ise düz hesap. */
  childCount: number;
  /** Org'un KENDİ aktivite akışındaki son olay (çocuk org'lar hariç) —
   *  "bu müşteri yaşıyor mu" sütunu. Olay yoksa null. */
  lastActivityAt: Date | null;
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
      priceVersion: true,
      entitlementState: true,
      entitledSeats: true,
      trialEndsAt: true,
      _count: { select: { memberships: true, children: true } },
    },
  });

  // Son aktivite tek groupBy ile: org başına ayrı sorgu açılmaz.
  const lastActivity = new Map<string, Date>();
  const grouped = await prisma.activityEvent.groupBy({
    by: ['orgId'],
    _max: { createdAt: true },
    where: { orgId: { in: orgs.map((o) => o.id) } },
  });
  for (const g of grouped) {
    if (g._max.createdAt) lastActivity.set(g.orgId, g._max.createdAt);
  }

  // Koltuk sayımı org başına bir sorgu. 10 müşteri için N+1 endişesi yok;
  // liste büyürse tek sorguluk toplu sayıma geçilir.
  return Promise.all(
    orgs.map(async (o) => ({
      id: o.id,
      name: o.name,
      createdAt: o.createdAt,
      priceVersion: o.priceVersion,
      entitlementState: o.entitlementState,
      entitledSeats: o.entitledSeats,
      activeSeats: await countActiveSeats(o.id),
      trialEndsAt: o.trialEndsAt,
      memberCount: o._count.memberships,
      childCount: o._count.children,
      lastActivityAt: lastActivity.get(o.id) ?? null,
    })),
  );
}

export interface AdminCustomerUserRow {
  id: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  emailVerifiedAt: Date | null;
  memberships: Array<{ orgId: string; orgName: string; role: string; joinedAt: Date }>;
}

/**
 * Platform genelindeki müşteri kullanıcıları. E-posta kişisel veridir; önce
 * erişilecek org kümesi kişisel veri olmadan çözülür, her org için erişim izi
 * yazılır, kullanıcı satırları ancak bundan sonra okunur.
 */
export async function listCustomerUsers(
  staffUserId: string,
  ctx?: StaffContext,
): Promise<AdminCustomerUserRow[]> {
  const staff = await requireStaff(staffUserId);
  const organizations = await prisma.organization.findMany({
    where: { memberships: { some: {} } },
    select: { id: true, name: true },
  });

  await Promise.all(organizations.map((org) => logAccess(staff, org, 'members', ctx)));

  const users = await prisma.user.findMany({
    where: { memberships: { some: {} }, isStaff: false },
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true,
      email: true,
      avatarUrl: true,
      createdAt: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
      memberships: {
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          createdAt: true,
          org: { select: { id: true, name: true } },
        },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    emailVerifiedAt: user.emailVerifiedAt,
    memberships: user.memberships.map((membership) => ({
      orgId: membership.org.id,
      orgName: membership.org.name,
      role: membership.role,
      joinedAt: membership.createdAt,
    })),
  }));
}

export interface AdminStaffAccountRow {
  id: string;
  email: string;
  avatarUrl: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}

/** Personel hesapları salt okunur; yetki hâlâ tek `isStaff` kapısıdır. */
export async function listStaffAccounts(staffUserId: string): Promise<AdminStaffAccountRow[]> {
  await requireStaff(staffUserId);
  return prisma.user.findMany({
    where: { isStaff: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true, email: true, avatarUrl: true, createdAt: true, lastLoginAt: true },
  });
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
      priceVersion: true,
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

  const lastEvent = await prisma.activityEvent.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

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
    priceVersion: full.priceVersion,
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
    lastActivityAt: lastEvent?.createdAt ?? null,
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
  ip: string | null;
  userAgent: string | null;
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
      ip: true,
      userAgent: true,
      createdAt: true,
    },
  });
}

export interface AdminActionRow {
  id: string;
  staffEmail: string;
  orgId: string;
  orgName: string;
  action: string;
  targetId: string | null;
  before: unknown;
  after: unknown;
  reason: string;
  ip: string | null;
  userAgent: string | null;
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
      orgId: true,
      orgName: true,
      action: true,
      targetId: true,
      before: true,
      after: true,
      reason: true,
      ip: true,
      userAgent: true,
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

// ─── Yönetişim yazmaları: onay talepleri ─────────────────────────────────

/** Karar anındaki politika sürümü — talep satırına damgalanır. */
export const APPROVAL_POLICY_VERSION = '2026-08-21';

export type ApprovalDomain = 'entitlement' | 'billing' | 'security' | 'platform';
export type ApprovalRisk = 'medium' | 'high' | 'critical';

/** Org'suz yönetişim kaydının denetimdeki nöbetçi kimliği. */
const PLATFORM_ORG = { id: 'platform', name: 'Mailmyra platform' } as const;

/** Org verilmişse GERÇEKTEN var olmalı (adı kopyalanır); yoksa nöbetçi. */
async function resolveGovernanceOrg(
  tx: Prisma.TransactionClient,
  orgId: string | undefined,
): Promise<{ id: string; name: string }> {
  if (!orgId) return PLATFORM_ORG;
  const org = await tx.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) throw new Error(`Organizasyon ${orgId} bulunamadı.`);
  return org;
}

/**
 * Onay talebi açar. Not: onaylanan talep HİÇBİR ŞEYİ otomatik uygulamaz —
 * bu bir karar defteridir; riskli değişikliğin kendisi mevcut yazma
 * fonksiyonlarıyla yapılır. Müşteri aktivitesi BİLEREK yazılmaz: iç
 * yönetişim müşteri akışına sızdırılmaz (tasarım 2026-08-21).
 */
export async function createApprovalRequest(
  staffUserId: string,
  input: {
    title: string;
    domain: ApprovalDomain;
    riskLevel: ApprovalRisk;
    orgId?: string;
    targetType?: string;
    targetId?: string;
    requiredApprovals?: number;
  },
  reason: string,
  ctx?: StaffContext,
): Promise<{ id: string }> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  const title = input.title.trim().slice(0, 160);
  if (!title) throw new Error('Başlık zorunlu.');
  const required = input.requiredApprovals ?? 1;
  if (!Number.isInteger(required) || required < 1 || required > 3) {
    throw new Error('Gereken onay sayısı 1-3 arası olmalı.');
  }

  return prisma.$transaction(async (tx) => {
    const org = await resolveGovernanceOrg(tx, input.orgId);
    const request = await tx.approvalRequest.create({
      data: {
        title,
        domain: input.domain,
        riskLevel: input.riskLevel,
        policyVersion: APPROVAL_POLICY_VERSION,
        orgId: input.orgId ?? null,
        orgName: input.orgId ? org.name : null,
        targetType: input.targetType?.slice(0, 24) ?? null,
        targetId: input.targetId?.slice(0, 64) ?? null,
        requestedById: staff.id,
        requestedByEmail: staff.email,
        reason: cleanReason,
        requiredApprovals: required,
      },
      select: { id: true },
    });
    await tx.approvalEvent.create({
      data: {
        requestId: request.id,
        type: 'created',
        actorEmail: staff.email,
        payload: { title, domain: input.domain, riskLevel: input.riskLevel },
      },
    });
    await audit(tx, staff, {
      org,
      action: 'approval.created',
      targetId: request.id,
      before: {},
      after: { title, domain: input.domain, riskLevel: input.riskLevel, requiredApprovals: required },
      reason: cleanReason,
      ctx,
    });
    return { id: request.id };
  });
}

/**
 * Karar yazar. Tek reject talebi kapatır; approve sayısı (bu karar dahil)
 * `requiredApprovals`a ulaşınca `approved`. Aynı onaycı ikinci karar
 * yazamaz — şemadaki @@unique([requestId, decidedByEmail]) P2002 üretir.
 */
export async function decideApproval(
  staffUserId: string,
  requestId: string,
  decision: 'approve' | 'reject',
  reason: string,
  ctx?: StaffContext,
): Promise<{ status: 'pending' | 'approved' | 'rejected' }> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  try {
    return await prisma.$transaction(async (tx) => {
      const request = await tx.approvalRequest.findUnique({
        where: { id: requestId },
        select: { status: true, title: true, requiredApprovals: true, orgId: true, orgName: true },
      });
      if (!request) throw new Error(`Onay talebi ${requestId} bulunamadı.`);
      if (request.status !== 'pending') throw new Error('Bu talep artık kararda değil.');

      await tx.approvalDecision.create({
        data: {
          requestId,
          decision,
          decidedById: staff.id,
          decidedByEmail: staff.email,
          reason: cleanReason,
        },
      });
      const approvals = await tx.approvalDecision.count({
        where: { requestId, decision: 'approve' },
      });
      await tx.approvalEvent.create({
        data: {
          requestId,
          type: 'decision_recorded',
          actorEmail: staff.email,
          payload: { decision, approvals, required: request.requiredApprovals },
        },
      });

      let status: 'pending' | 'approved' | 'rejected' = 'pending';
      if (decision === 'reject') status = 'rejected';
      else if (approvals >= request.requiredApprovals) status = 'approved';

      if (status !== 'pending') {
        await tx.approvalRequest.update({
          where: { id: requestId },
          data: { status, decidedAt: new Date(), decidedByEmail: staff.email },
        });
        await tx.approvalEvent.create({
          data: {
            requestId,
            type: status,
            actorEmail: staff.email,
            payload: { approvals, required: request.requiredApprovals },
          },
        });
      }

      await audit(tx, staff, {
        org: request.orgId ? { id: request.orgId, name: request.orgName ?? '' } : PLATFORM_ORG,
        action: 'approval.decided',
        targetId: requestId,
        before: { status: 'pending' },
        after: { status, decision },
        reason: cleanReason,
        ctx,
      });
      return { status };
    });
  } catch (err) {
    // Duck-typing, instanceof değil (createInvoice emsali): sarmalayıcı
    // sınıf kimliği garanti değil, `code` alanı sabit.
    if ((err as { code?: string })?.code === 'P2002') {
      throw new Error('Bu talebe zaten karar yazdın.');
    }
    throw err;
  }
}

/** Bekleyen talebi geri çeker — defterde durur, kuyruğa listelenmez. */
export async function cancelApprovalRequest(
  staffUserId: string,
  requestId: string,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const request = await tx.approvalRequest.findUnique({
      where: { id: requestId },
      select: { status: true, orgId: true, orgName: true },
    });
    if (!request) throw new Error(`Onay talebi ${requestId} bulunamadı.`);
    if (request.status !== 'pending') throw new Error('Bu talep artık kararda değil.');

    await tx.approvalRequest.update({
      where: { id: requestId },
      data: { status: 'cancelled', decidedAt: new Date(), decidedByEmail: staff.email },
    });
    await tx.approvalEvent.create({
      data: { requestId, type: 'cancelled', actorEmail: staff.email, payload: {} },
    });
    await audit(tx, staff, {
      org: request.orgId ? { id: request.orgId, name: request.orgName ?? '' } : PLATFORM_ORG,
      action: 'approval.cancelled',
      targetId: requestId,
      before: { status: 'pending' },
      after: { status: 'cancelled' },
      reason: cleanReason,
      ctx,
    });
  });
}

// ─── Yönetişim yazmaları: KVKK yaşam döngüsü ─────────────────────────────

export type KvkkType = 'access' | 'erasure' | 'correction' | 'portability';

/**
 * İzinli durum geçişleri (hedef → izinli kaynaklar). `completed` bu haritada
 * YOK — oraya tek yol `completeKvkkRequest`. Kimlik şartları fonksiyonlarda.
 */
const KVKK_TRANSITIONS: Record<'identity_check' | 'in_progress' | 'legal_review', string[]> = {
  identity_check: ['intake'],
  in_progress: ['identity_check', 'legal_review'],
  legal_review: ['in_progress'],
};

/** Talep + audit org'unu tek yerden yükler; kapatılmış talebe yazmayı keser. */
async function loadKvkkForWrite(
  tx: Prisma.TransactionClient,
  requestId: string,
  opts: { allowCompleted?: boolean } = {},
): Promise<{
  status: string;
  identityVerifiedAt: Date | null;
  reference: string;
  auditOrg: { id: string; name: string };
}> {
  const request = await tx.kvkkRequest.findUnique({
    where: { id: requestId },
    select: { status: true, identityVerifiedAt: true, reference: true, orgId: true, orgName: true },
  });
  if (!request) throw new Error(`KVKK talebi ${requestId} bulunamadı.`);
  if (!opts.allowCompleted && request.status === 'completed') {
    throw new Error('Bu talep kapatılmış — üzerine yazılamaz.');
  }
  return {
    status: request.status,
    identityVerifiedAt: request.identityVerifiedAt,
    reference: request.reference,
    auditOrg: request.orgId ? { id: request.orgId, name: request.orgName } : PLATFORM_ORG,
  };
}

/**
 * KVKK talebi açar. `statutoryDueAt`ı KOD hesaplar (kanuni 30 gün —
 * lib/kvkk.ts). Denetim payload'ında subjectEmail YOKTUR: denetim kaydı
 * referans taşır, kişisel veriyi değil. Müşteri aktivitesi bilerek yok.
 */
export async function createKvkkRequest(
  staffUserId: string,
  input: {
    reference: string;
    subjectEmail: string;
    type: KvkkType;
    orgId?: string;
    receivedAt: Date;
    receivedVia?: string;
  },
  reason: string,
  ctx?: StaffContext,
): Promise<{ id: string }> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  const reference = input.reference.trim().slice(0, 32);
  if (!reference) throw new Error('Referans zorunlu.');
  const subjectEmail = input.subjectEmail.trim().toLowerCase().slice(0, 255);
  if (!subjectEmail.includes('@')) throw new Error('Talep sahibi e-postası geçersiz.');

  try {
    return await prisma.$transaction(async (tx) => {
      const org = await resolveGovernanceOrg(tx, input.orgId);
      const request = await tx.kvkkRequest.create({
        data: {
          reference,
          subjectEmail,
          orgId: input.orgId ?? null,
          orgName: input.orgId ? org.name : '',
          type: input.type,
          receivedAt: input.receivedAt,
          receivedVia: input.receivedVia?.slice(0, 32) ?? null,
          statutoryDueAt: statutoryDueDate(input.receivedAt),
        },
        select: { id: true },
      });
      await tx.kvkkEvent.create({
        data: {
          requestId: request.id,
          type: 'received',
          actorEmail: staff.email,
          payload: { reference, type: input.type },
        },
      });
      await audit(tx, staff, {
        org,
        action: 'kvkk.created',
        targetId: request.id,
        before: {},
        after: { reference, type: input.type, status: 'intake' },
        reason: cleanReason,
        ctx,
      });
      return { id: request.id };
    });
  } catch (err) {
    // Duck-typing, instanceof değil (createInvoice emsali): sarmalayıcı
    // sınıf kimliği garanti değil, `code` alanı sabit.
    if ((err as { code?: string })?.code === 'P2002') {
      throw new Error('Bu referans zaten kullanılmış.');
    }
    throw err;
  }
}

export async function verifyKvkkIdentity(
  staffUserId: string,
  requestId: string,
  method: string,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);
  const cleanMethod = method.trim().slice(0, 48);
  if (!cleanMethod) throw new Error('Doğrulama yöntemi zorunlu.');

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);
    if (request.identityVerifiedAt) throw new Error('Kimlik zaten doğrulanmış.');
    if (request.status !== 'intake' && request.status !== 'identity_check') {
      throw new Error(`'${request.status}' durumunda kimlik doğrulanamaz.`);
    }

    await tx.kvkkRequest.update({
      where: { id: requestId },
      data: { identityVerifiedAt: new Date(), identityMethod: cleanMethod, status: 'in_progress' },
    });
    await tx.kvkkEvent.create({
      data: {
        requestId,
        type: 'identity_verified',
        actorEmail: staff.email,
        payload: { method: cleanMethod },
      },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.identity_verified',
      targetId: requestId,
      before: { status: request.status },
      after: { status: 'in_progress', method: cleanMethod },
      reason: cleanReason,
      ctx,
    });
  });
}

export async function assignKvkkOwner(
  staffUserId: string,
  requestId: string,
  ownerEmail: string,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);
  const email = ownerEmail.trim().toLowerCase();

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);
    const owner = await tx.user.findFirst({
      where: { email, isStaff: true },
      select: { id: true, email: true },
    });
    if (!owner) throw new Error('Sahip personel olmalı.');

    await tx.kvkkRequest.update({
      where: { id: requestId },
      data: { ownerId: owner.id, ownerEmail: owner.email },
    });
    await tx.kvkkEvent.create({
      data: {
        requestId,
        type: 'owner_assigned',
        actorEmail: staff.email,
        payload: { owner: owner.email },
      },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.owner_assigned',
      targetId: requestId,
      before: {},
      after: { owner: owner.email },
      reason: cleanReason,
      ctx,
    });
  });
}

export async function addKvkkEvidence(
  staffUserId: string,
  requestId: string,
  input: { label: string; location: string },
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);
  const label = input.label.trim().slice(0, 160);
  const location = input.location.trim().slice(0, 500);
  if (!label || !location) throw new Error('Kanıt etiketi ve konumu zorunlu.');

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);

    await tx.kvkkEvidence.create({
      data: { requestId, label, location, addedByEmail: staff.email },
    });
    // Olay payload'ında konum YOK: dosya yolu olay akışına sızmasın.
    await tx.kvkkEvent.create({
      data: { requestId, type: 'evidence_added', actorEmail: staff.email, payload: { label } },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.evidence_added',
      targetId: requestId,
      before: {},
      after: { label },
      reason: cleanReason,
      ctx,
    });
  });
}

export async function setKvkkStatus(
  staffUserId: string,
  requestId: string,
  status: 'identity_check' | 'in_progress' | 'legal_review',
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);
    const allowedFrom = KVKK_TRANSITIONS[status];
    if (!allowedFrom.includes(request.status)) {
      throw new Error(`'${request.status}' durumundan '${status}' durumuna geçilemez.`);
    }
    if (status === 'in_progress' && request.status === 'identity_check' && !request.identityVerifiedAt) {
      throw new Error('Kimlik doğrulanmadan işleme alınamaz.');
    }

    await tx.kvkkRequest.update({ where: { id: requestId }, data: { status } });
    await tx.kvkkEvent.create({
      data: {
        requestId,
        type: 'status_changed',
        actorEmail: staff.email,
        payload: { from: request.status, to: status },
      },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.status_changed',
      targetId: requestId,
      before: { status: request.status },
      after: { status },
      reason: cleanReason,
      ctx,
    });
  });
}

export async function completeKvkkRequest(
  staffUserId: string,
  requestId: string,
  responseSummary: string,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);
  const summary = responseSummary.trim().slice(0, 1000);
  if (!summary) throw new Error('Yanıt özeti zorunlu.');

  await prisma.$transaction(async (tx) => {
    const request = await loadKvkkForWrite(tx, requestId);
    if (!request.identityVerifiedAt) {
      throw new Error('Kimlik doğrulanmadan talep kapatılamaz.');
    }
    if (request.status !== 'in_progress' && request.status !== 'legal_review') {
      throw new Error(`'${request.status}' durumundan kapatılamaz.`);
    }

    await tx.kvkkRequest.update({
      where: { id: requestId },
      data: { status: 'completed', respondedAt: new Date(), responseSummary: summary },
    });
    await tx.kvkkEvent.create({
      data: { requestId, type: 'responded', actorEmail: staff.email, payload: {} },
    });
    await tx.kvkkEvent.create({
      data: { requestId, type: 'completed', actorEmail: staff.email, payload: {} },
    });
    await audit(tx, staff, {
      org: request.auditOrg,
      action: 'kvkk.completed',
      targetId: requestId,
      before: { status: request.status },
      after: { status: 'completed' },
      reason: cleanReason,
      ctx,
    });
  });
}

// ─── Yönetişim yazmaları: destek vakaları ────────────────────────────────

export type SupportChannel = 'email' | 'form' | 'staff';
export type SupportCategory = 'billing' | 'builder' | 'export' | 'access' | 'account';

/**
 * İzinli durum geçişleri (mevcut durum → izinli hedefler). `resolved`
 * yeniden açılabilir (`open`) — destek gerçeği: kapatılmış vaka geri
 * gelebilir. KVKK'nın aksine burada hedef değil KAYNAK anahtar: her
 * durumdan nereye gidilebileceği tek bakışta okunsun diye.
 */
const SUPPORT_TRANSITIONS: Record<string, string[]> = {
  open: ['waiting_customer', 'escalated', 'resolved'],
  waiting_customer: ['open', 'escalated', 'resolved'],
  escalated: ['open', 'resolved'],
  resolved: ['open'],
};

/** Vaka + audit org'unu tek yerden yükler — `loadKvkkForWrite` emsali. */
async function loadSupportCaseForWrite(
  tx: Prisma.TransactionClient,
  caseId: string,
): Promise<{
  status: string;
  priority: SupportPriority;
  slaDueAt: Date;
  createdAt: Date;
  auditOrg: { id: string; name: string };
}> {
  const row = await tx.supportCase.findUnique({
    where: { id: caseId },
    select: { status: true, priority: true, slaDueAt: true, createdAt: true, orgId: true, orgName: true },
  });
  if (!row) throw new Error(`Destek vakası ${caseId} bulunamadı.`);
  return {
    status: row.status,
    priority: row.priority as SupportPriority,
    slaDueAt: row.slaDueAt,
    createdAt: row.createdAt,
    auditOrg: row.orgId ? { id: row.orgId, name: row.orgName } : PLATFORM_ORG,
  };
}

/**
 * Destek vakası açar. `slaDueAt`ı KOD hesaplar (`slaDueDate(now, priority)`
 * — lib/support-sla.ts). Denetim payload'ında `requesterEmail` YOKTUR:
 * KVKK'daki `subjectEmail` dışlaması aynı — denetim referans taşır, kişisel
 * veriyi değil. Müşteri aktivitesi bilerek yok (yönetişim dalgası kuralı).
 */
export async function createSupportCase(
  staffUserId: string,
  input: {
    reference: string;
    subject: string;
    requesterEmail: string;
    channel: SupportChannel;
    category: SupportCategory;
    priority: SupportPriority;
    orgId?: string;
    summary?: string;
  },
  reason: string,
  ctx?: StaffContext,
): Promise<{ id: string }> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  const reference = input.reference.trim().slice(0, 32);
  if (!reference) throw new Error('Referans zorunlu.');
  const subject = input.subject.trim().slice(0, 200);
  if (!subject) throw new Error('Konu zorunlu.');
  const requesterEmail = input.requesterEmail.trim().toLowerCase().slice(0, 255);
  if (!requesterEmail.includes('@')) throw new Error('Talep sahibi e-postası geçersiz.');
  const summary = input.summary?.trim().slice(0, 500) ?? '';

  try {
    return await prisma.$transaction(async (tx) => {
      const org = await resolveGovernanceOrg(tx, input.orgId);
      const slaDueAt = slaDueDate(new Date(), input.priority);

      const created = await tx.supportCase.create({
        data: {
          reference,
          subject,
          orgId: input.orgId ?? null,
          orgName: input.orgId ? org.name : '',
          requesterEmail,
          channel: input.channel,
          category: input.category,
          priority: input.priority,
          slaDueAt,
          summary,
        },
        select: { id: true },
      });

      await audit(tx, staff, {
        org,
        action: 'support.case_created',
        targetId: created.id,
        before: {},
        after: {
          reference,
          category: input.category,
          priority: input.priority,
          slaDueAt: slaDueAt.toISOString(),
        },
        reason: cleanReason,
        ctx,
      });

      return { id: created.id };
    });
  } catch (err) {
    // Duck-typing, instanceof değil (createInvoice/createKvkkRequest emsali).
    if ((err as { code?: string })?.code === 'P2002') {
      throw new Error('Bu referans zaten kullanılmış.');
    }
    throw err;
  }
}

export async function setSupportCaseStatus(
  staffUserId: string,
  caseId: string,
  status: 'open' | 'waiting_customer' | 'escalated' | 'resolved',
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const support = await loadSupportCaseForWrite(tx, caseId);
    const allowedTo = SUPPORT_TRANSITIONS[support.status] ?? [];
    if (!allowedTo.includes(status)) {
      throw new Error(`'${support.status}' durumundan '${status}' durumuna geçilemez.`);
    }

    await tx.supportCase.update({ where: { id: caseId }, data: { status } });
    await audit(tx, staff, {
      org: support.auditOrg,
      action: 'support.case_status_set',
      targetId: caseId,
      before: { status: support.status },
      after: { status },
      reason: cleanReason,
      ctx,
    });
  });
}

/**
 * Sahip yalnız personel olabilir. `resolved` vakaya atanamaz — kapatılmış
 * dosyaya yeni sahip bağlamak anlamsız. Şemada `ownerId` yok (KVKK'nın
 * aksine), yalnız `ownerEmail` — staff kontrolü yine de yapılır, satıra
 * yazılmaz.
 */
export async function assignSupportCaseOwner(
  staffUserId: string,
  caseId: string,
  ownerEmail: string,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);
  const email = ownerEmail.trim().toLowerCase();

  await prisma.$transaction(async (tx) => {
    const support = await loadSupportCaseForWrite(tx, caseId);
    if (support.status === 'resolved') throw new Error('Kapatılmış vakaya sahip atanamaz.');

    const owner = await tx.user.findFirst({
      where: { email, isStaff: true },
      select: { id: true, email: true },
    });
    if (!owner) throw new Error('Sahip personel olmalı.');

    await tx.supportCase.update({ where: { id: caseId }, data: { ownerEmail: owner.email } });
    await audit(tx, staff, {
      org: support.auditOrg,
      action: 'support.case_owner_set',
      targetId: caseId,
      before: {},
      after: { owner: owner.email },
      reason: cleanReason,
      ctx,
    });
  });
}

/**
 * Öncelik değişince `slaDueAt` **`createdAt`ten** yeniden hesaplanır —
 * `now`dan DEĞİL: dürüst taban, vaka ne zaman açıldıysa saat oradan işler.
 * `resolved` vakada öncelik değiştirilemez (kapatılmış dosyada SLA saati
 * anlamsız).
 */
export async function setSupportCasePriority(
  staffUserId: string,
  caseId: string,
  priority: SupportPriority,
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const support = await loadSupportCaseForWrite(tx, caseId);
    if (support.status === 'resolved') throw new Error('Kapatılmış vakada öncelik değiştirilemez.');

    const slaDueAt = slaDueDate(support.createdAt, priority);
    await tx.supportCase.update({ where: { id: caseId }, data: { priority, slaDueAt } });
    await audit(tx, staff, {
      org: support.auditOrg,
      action: 'support.case_priority_set',
      targetId: caseId,
      before: { priority: support.priority, slaDueAt: support.slaDueAt.toISOString() },
      after: { priority, slaDueAt: slaDueAt.toISOString() },
      reason: cleanReason,
      ctx,
    });
  });
}

// ─── Yönetişim yazmaları: hata grupları ──────────────────────────────────

/**
 * İzinli durum geçişleri. `resolved` yeniden `open`a döner — hata geri
 * geldiyse defter bunu saklamalı (`SUPPORT_TRANSITIONS` emsali).
 */
const ERROR_TRANSITIONS: Record<string, string[]> = {
  open: ['investigating', 'resolved'],
  investigating: ['open', 'resolved'],
  resolved: ['open'],
};

/**
 * Hata grubunun durumunu değiştirir. `ErrorGroup` org'a bağlı değil — olaylar
 * (`ErrorEvent`) birden çok org'tan gelebilir — bu yüzden denetim platform
 * nöbetçisiyle (`PLATFORM_ORG`) yazılır (`resolveGovernanceOrg` emsali).
 */
export async function setErrorGroupState(
  staffUserId: string,
  groupId: string,
  state: 'open' | 'investigating' | 'resolved',
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const group = await tx.errorGroup.findUnique({
      where: { id: groupId },
      select: { state: true },
    });
    if (!group) throw new Error(`Hata grubu ${groupId} bulunamadı.`);

    const allowedTo = ERROR_TRANSITIONS[group.state] ?? [];
    if (!allowedTo.includes(state)) {
      throw new Error(`'${group.state}' durumundan '${state}' durumuna geçilemez.`);
    }

    await tx.errorGroup.update({ where: { id: groupId }, data: { state } });
    await audit(tx, staff, {
      org: PLATFORM_ORG,
      action: 'error.state_set',
      targetId: groupId,
      before: { state: group.state },
      after: { state },
      reason: cleanReason,
      ctx,
    });
  });
}

// ─── Yönetişim yazmaları: lead'ler ───────────────────────────────────────

export type LeadStage = 'new' | 'qualified' | 'scheduled' | 'won' | 'lost';

/**
 * Lead açar. `seats`/`stage`/`nextStep` varsayılanlarını KOD verir (şemadaki
 * `@default`lerin aynısı — tek kaynak burada, iki yerde bakım gerekmesin).
 * Denetim payload'ı `company` + değişen alanları taşır, `contact`'ı ASLA:
 * Voldi'nin kendi ticari kaydı olsa da iç defterde kişi bilgisi birikmesin
 * (governance dalgası ortak sözleşmesi).
 */
export async function createLead(
  staffUserId: string,
  input: {
    company: string;
    contact: string;
    source: string;
    seats?: number;
    stage?: LeadStage;
    nextStep?: string;
  },
  reason: string,
  ctx?: StaffContext,
): Promise<{ id: string }> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  const company = input.company.trim().slice(0, 160);
  if (!company) throw new Error('Şirket adı zorunlu.');
  const contact = input.contact.trim().slice(0, 255);
  if (!contact) throw new Error('İletişim kişisi zorunlu.');
  const source = input.source.trim().slice(0, 48);
  if (!source) throw new Error('Kaynak zorunlu.');
  const seats = input.seats ?? 1;
  if (!Number.isInteger(seats) || seats < 1) {
    throw new Error("Koltuk sayısı 1'den küçük olamaz.");
  }
  const stage = input.stage ?? 'new';
  const nextStep = (input.nextStep ?? '').trim().slice(0, 200);

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: { company, contact, source, seats, stage, nextStep },
      select: { id: true },
    });

    await audit(tx, staff, {
      org: PLATFORM_ORG,
      action: 'lead.created',
      targetId: lead.id,
      before: {},
      after: { company, source, seats, stage, nextStep },
      reason: cleanReason,
      ctx,
    });

    return { id: lead.id };
  });
}

/**
 * Lead'i günceller — en az bir alan verilmeli. Denetim yalnız `company` +
 * gerçekten DEĞİŞEN alanları taşır (`contact` hiç dokunulmasa da payload'a
 * girmez — patch tipinde zaten yok).
 */
export async function updateLead(
  staffUserId: string,
  leadId: string,
  patch: { stage?: LeadStage; nextStep?: string; seats?: number },
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  if (patch.stage === undefined && patch.nextStep === undefined && patch.seats === undefined) {
    throw new Error('Değiştirilecek alan yok.');
  }
  if (patch.seats !== undefined && (!Number.isInteger(patch.seats) || patch.seats < 1)) {
    throw new Error("Koltuk sayısı 1'den küçük olamaz.");
  }
  const nextStep = patch.nextStep !== undefined ? patch.nextStep.trim().slice(0, 200) : undefined;

  await prisma.$transaction(async (tx) => {
    const before = await tx.lead.findUnique({
      where: { id: leadId },
      select: { company: true, stage: true, nextStep: true, seats: true },
    });
    if (!before) throw new Error(`Lead ${leadId} bulunamadı.`);

    await tx.lead.update({
      where: { id: leadId },
      data: {
        ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
        ...(nextStep !== undefined ? { nextStep } : {}),
        ...(patch.seats !== undefined ? { seats: patch.seats } : {}),
      },
    });

    await audit(tx, staff, {
      org: PLATFORM_ORG,
      action: 'lead.updated',
      targetId: leadId,
      before: {
        company: before.company,
        ...(patch.stage !== undefined ? { stage: before.stage } : {}),
        ...(nextStep !== undefined ? { nextStep: before.nextStep } : {}),
        ...(patch.seats !== undefined ? { seats: before.seats } : {}),
      },
      after: {
        company: before.company,
        ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
        ...(nextStep !== undefined ? { nextStep } : {}),
        ...(patch.seats !== undefined ? { seats: patch.seats } : {}),
      },
      reason: cleanReason,
      ctx,
    });
  });
}

// ─── Yönetişim yazmaları: rapor zamanlamaları ────────────────────────────

export type ReportCadence = 'daily' | 'weekly' | 'monthly';
export type ReportScheduleFormat = 'digest' | 'csv';

const REPORT_CADENCES: readonly ReportCadence[] = ['daily', 'weekly', 'monthly'];
const REPORT_SCHEDULE_FORMATS: readonly ReportScheduleFormat[] = ['digest', 'csv'];

/** active ↔ paused — yalnız DİĞER durumdan geçilir, aynı duruma tekrar yazılamaz. */
const REPORT_SCHEDULE_OTHER_STATUS: Record<'active' | 'paused', 'active' | 'paused'> = {
  active: 'paused',
  paused: 'active',
};

/**
 * Rapor zamanlaması açar. `reportId` registry'de KOŞTURULABİLİR olmalı —
 * `REPORT_BUILDERS`/`TABLELESS_REPORTS` `../reports/registry`dan içe
 * aktarılır (import kapısı yalnız `app/` altını tarar; `lib/repo` serbest —
 * çalıştırıcının kendisi `lib/reports`'u zaten kullanıyor).
 *
 * `cadence`/`format` tip düzeyinde birlik olsa da BURADA yeniden doğrulanır:
 * girdi API ucundan ham JSON gövdesiyle gelir, tip anotasyonu çalışma
 * zamanında hiçbir şey garanti etmez (governance dalgasının "field() yalnız
 * string döndürür" dersiyle aynı temkin). `nextRunAt` BİLEREK null: ertesi
 * sabah 10:15 koşusu vadesiz kabul eder (`nextPlannedRun` emsali). Alıcılar
 * AYNI transaction'da yazılır; denetim payload'ı alıcı SAYISINI taşır,
 * e-postaların kendisini değil (staff'ın zaten göreceği liste kişisel veri
 * sayılmasa da defteri şişirmesin).
 */
export async function createReportSchedule(
  staffUserId: string,
  input: {
    reportId: string;
    cadence: ReportCadence;
    format: ReportScheduleFormat;
    recipients: string[];
  },
  reason: string,
  ctx?: StaffContext,
): Promise<{ id: string }> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  if (!REPORT_CADENCES.includes(input.cadence)) {
    throw new Error("Kadans 'daily', 'weekly' veya 'monthly' olmalı.");
  }
  if (!REPORT_SCHEDULE_FORMATS.includes(input.format)) {
    throw new Error("Format 'digest' veya 'csv' olmalı.");
  }
  if (!Object.keys(REPORT_BUILDERS).includes(input.reportId)) {
    throw new Error('Bu rapor koşturulamıyor.');
  }
  if (input.format === 'csv' && TABLELESS_REPORTS.includes(input.reportId)) {
    throw new Error('Bu raporun tablo çıktısı yok.');
  }
  // Normalize + TEKİLLEŞTİR (sayım sınırından ÖNCE): yapıştırma sırasında aynı
  // adres birden fazla girilebilir — `ReportRecipient` `@@unique([scheduleId,
  // email])` taşıyor, tekilleştirmeden geçersek ham P2002 kullanıcıya sızar.
  // Dedupe sayım sınırından önce çalıştığı için 11 ham adresten 9 tekil kalan
  // istek dürüstçe geçer (11 tekil kalan yine reddedilir).
  const recipients = [...new Set(input.recipients.map((r) => r.trim().toLowerCase().slice(0, 255)))];
  if (recipients.length < 1 || recipients.length > 10) {
    throw new Error('Alıcı sayısı 1-10 arası olmalı.');
  }
  for (const email of recipients) {
    if (!email.includes('@')) throw new Error('Alıcı e-postası geçersiz.');
  }

  return prisma.$transaction(async (tx) => {
    const schedule = await tx.reportSchedule.create({
      data: {
        reportId: input.reportId,
        cadence: input.cadence,
        timezone: 'Europe/Istanbul',
        format: input.format,
        status: 'active',
        nextRunAt: null,
        ownerEmail: staff.email,
        createdById: staff.id,
        createdByEmail: staff.email,
      },
      select: { id: true },
    });

    for (const email of recipients) {
      await tx.reportRecipient.create({ data: { scheduleId: schedule.id, email } });
    }

    await audit(tx, staff, {
      org: PLATFORM_ORG,
      action: 'report.schedule_created',
      targetId: schedule.id,
      before: {},
      after: {
        reportId: input.reportId,
        cadence: input.cadence,
        format: input.format,
        recipients: recipients.length,
      },
      reason: cleanReason,
      ctx,
    });

    return { id: schedule.id };
  });
}

/** Duraklat/sürdür — yalnız diğer durumdan (SUPPORT_TRANSITIONS emsali, ikili). */
export async function setReportScheduleStatus(
  staffUserId: string,
  scheduleId: string,
  status: 'active' | 'paused',
  reason: string,
  ctx?: StaffContext,
): Promise<void> {
  const staff = await requireStaff(staffUserId);
  const cleanReason = requireReason(reason);

  await prisma.$transaction(async (tx) => {
    const before = await tx.reportSchedule.findUnique({
      where: { id: scheduleId },
      select: { status: true },
    });
    if (!before) throw new Error(`Rapor zamanlaması ${scheduleId} bulunamadı.`);
    if (before.status !== REPORT_SCHEDULE_OTHER_STATUS[status]) {
      throw new Error(`'${before.status}' durumundan '${status}' durumuna geçilemez.`);
    }

    await tx.reportSchedule.update({ where: { id: scheduleId }, data: { status } });
    await audit(tx, staff, {
      org: PLATFORM_ORG,
      action: 'report.schedule_status_set',
      targetId: scheduleId,
      before: { status: before.status },
      after: { status },
      reason: cleanReason,
      ctx,
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

// ─── Product analytics ──────────────────────────────────────────────────

/**
 * Cross-organization product snapshot. Only operational metadata leaves the
 * repository: signature identity/contact fields are deliberately discarded.
 * Activity is bounded to twelve months so the control-plane query cannot grow
 * without limit.
 */
export async function getProductAnalyticsAdmin(staffUserId: string) {
  await requireStaff(staffUserId);
  const since = new Date();
  since.setUTCFullYear(since.getUTCFullYear() - 1);

  const [organizations, signatures, senders, events] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        entitlementState: true,
        createdAt: true,
        _count: { select: { memberships: true, signatures: true, senderIdentities: true } },
        senderIdentities: {
          select: { publishedAt: true, deactivatedAt: true, lastExportedAt: true },
        },
        activityEvents: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
    prisma.signature.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        orgId: true,
        templateId: true,
        senderIdentityId: true,
        data: true,
        createdAt: true,
        updatedAt: true,
        org: { select: { name: true } },
      },
    }),
    prisma.senderIdentity.findMany({
      select: {
        id: true,
        orgId: true,
        createdAt: true,
        publishedAt: true,
        deactivatedAt: true,
        lastExportedAt: true,
      },
    }),
    prisma.activityEvent.findMany({
      where: {
        createdAt: { gte: since },
        type: { in: ['sender.published', 'sender.deactivated', 'export.zip', 'brand.saved'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: {
        id: true,
        orgId: true,
        type: true,
        payload: true,
        createdAt: true,
        org: { select: { name: true } },
      },
    }),
  ]);

  const objectValue = (value: Prisma.JsonValue): Record<string, unknown> =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
  const stringChoice = <T extends string>(value: unknown, choices: readonly T[], fallback: T): T =>
    typeof value === 'string' && choices.includes(value as T) ? value as T : fallback;
  const numberValue = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;

  return {
    organizations: organizations.map((org) => {
      const active = org.senderIdentities.filter((sender) => sender.publishedAt && !sender.deactivatedAt);
      return {
        id: org.id,
        name: org.name,
        entitlementState: org.entitlementState,
        createdAt: org.createdAt.toISOString(),
        memberCount: org._count.memberships,
        signatureCount: org._count.signatures,
        senderCount: org._count.senderIdentities,
        activeSenderCount: active.length,
        exportedSenderCount: active.filter((sender) => sender.lastExportedAt).length,
        lastActivityAt: org.activityEvents[0]?.createdAt.toISOString() ?? null,
      };
    }),
    signatures: signatures.map((signature) => {
      const data = objectValue(signature.data);
      const layout = objectValue((data.layout ?? {}) as Prisma.JsonValue);
      const visuals = objectValue((data.visuals ?? {}) as Prisma.JsonValue);
      const extras = objectValue((data.extras ?? {}) as Prisma.JsonValue);
      return {
        id: signature.id,
        orgId: signature.orgId,
        orgName: signature.org.name,
        templateId: signature.templateId,
        createdAt: signature.createdAt.toISOString(),
        updatedAt: signature.updatedAt.toISOString(),
        assigned: Boolean(signature.senderIdentityId),
        size: stringChoice(layout.size, ['small', 'medium', 'large'] as const, 'medium'),
        iconStyle: stringChoice(layout.iconStyle, ['filled', 'outline', 'mono'] as const, 'mono'),
        hasCta: Boolean(extras.ctaLabel && extras.ctaUrl),
        hasLogo: Boolean(visuals.logoUrl),
        hasAvatar: Boolean(visuals.avatarUrl),
      };
    }),
    senders: senders.map((sender) => ({
      id: sender.id,
      orgId: sender.orgId,
      createdAt: sender.createdAt.toISOString(),
      publishedAt: sender.publishedAt?.toISOString() ?? null,
      deactivatedAt: sender.deactivatedAt?.toISOString() ?? null,
      lastExportedAt: sender.lastExportedAt?.toISOString() ?? null,
    })),
    events: events.map((event) => {
      const payload = objectValue(event.payload);
      return {
        id: event.id,
        orgId: event.orgId,
        orgName: event.org.name,
        type: event.type,
        createdAt: event.createdAt.toISOString(),
        fileCount: numberValue(payload.fileCount),
        senderCount: numberValue(payload.senderCount),
      };
    }),
  };
}

// ─── Governance: onaylar ─────────────────────────────────────────────────

export interface AdminApprovalRow {
  id: string;
  title: string;
  domain: string;
  requester: string;
  customer: string | null;
  risk: string;
  status: string;
  requestedAt: Date;
  requiredApprovals: number;
  approvals: number;
}

/**
 * Onay kuyruğu. Kişisel müşteri verisi İÇERMEZ (talep eden personel, hedef
 * org adı ticari kayıt) → erişim günlüğüne yazılmaz (listOrganizations
 * gerekçesi). Karar/onay DÜĞMELERİ bilinçli yok — devir sözleşmesi §7:
 * yetki + kalıcılık + denetim + hata yolu birlikte gelmeden kontrol
 * açılmaz. Satırlar şimdilik SQL ile açılır (isStaff emsali).
 */
export async function listApprovals(staffUserId: string): Promise<AdminApprovalRow[]> {
  await requireStaff(staffUserId);

  const rows = await prisma.approvalRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      title: true,
      domain: true,
      requestedByEmail: true,
      orgName: true,
      riskLevel: true,
      status: true,
      createdAt: true,
      requiredApprovals: true,
      _count: { select: { decisions: { where: { decision: 'approve' } } } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    domain: r.domain,
    requester: r.requestedByEmail,
    customer: r.orgName,
    risk: r.riskLevel,
    status: r.status,
    requestedAt: r.createdAt,
    requiredApprovals: r.requiredApprovals,
    approvals: r._count.decisions,
  }));
}

// ─── Governance: KVKK talepleri ──────────────────────────────────────────

export interface AdminKvkkRow {
  id: string;
  reference: string;
  subjectEmail: string;
  customer: string;
  type: string;
  status: string;
  receivedAt: Date;
  dueAt: Date;
  owner: string | null;
  evidenceCount: number;
  /** Gerçek alan — `identityVerifiedAt !== null`. Status'ten türetilmez. */
  identityVerified: boolean;
}

/**
 * KVKK defteri. `subjectEmail` KİŞİSEL VERİ — bu listeyi açmak bile
 * `StaffAccess`e düşer ve günlük yazılamazsa liste DÖNMEZ (kapalıya düşme,
 * getOrganization ile aynı sözleşme). Kayıt tek müşteriye bağlı olmadığı
 * için günlük satırı sentetik `KVKK_REGISTER` kimliğini taşır.
 */
export async function listKvkkRequests(
  staffUserId: string,
  ctx?: StaffContext,
): Promise<AdminKvkkRow[]> {
  const staff = await requireStaff(staffUserId);

  await logAccess(staff, KVKK_REGISTER, 'kvkk', ctx);

  const rows = await prisma.kvkkRequest.findMany({
    orderBy: { statutoryDueAt: 'asc' },
    take: 200,
    select: {
      id: true,
      reference: true,
      subjectEmail: true,
      orgName: true,
      type: true,
      status: true,
      receivedAt: true,
      statutoryDueAt: true,
      ownerEmail: true,
      identityVerifiedAt: true,
      _count: { select: { evidence: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    subjectEmail: r.subjectEmail,
    customer: r.orgName,
    type: r.type,
    status: r.status,
    receivedAt: r.receivedAt,
    dueAt: r.statutoryDueAt,
    owner: r.ownerEmail,
    evidenceCount: r._count.evidence,
    identityVerified: r.identityVerifiedAt !== null,
  }));
}

// ─── Raporlar: zamanlamalar ──────────────────────────────────────────────

export interface AdminReportScheduleRow {
  id: string;
  reportId: string;
  cadence: string;
  timezone: string;
  format: string;
  status: string;
  nextRunAt: Date;
  ownerEmail: string;
  recipients: string[];
  lastRunAt: Date | null;
  lastRunStatus: string | null;
}

/** Zamanlama listesi — yapılandırma, kişisel veri değil; günlüğe yazılmaz. */
export async function listReportSchedules(
  staffUserId: string,
): Promise<AdminReportScheduleRow[]> {
  await requireStaff(staffUserId);

  const rows = await prisma.reportSchedule.findMany({
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      reportId: true,
      cadence: true,
      timezone: true,
      format: true,
      status: true,
      nextRunAt: true,
      ownerEmail: true,
      recipients: { select: { email: true } },
      executions: {
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: { startedAt: true, status: true },
      },
    },
  });

  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    reportId: r.reportId,
    cadence: r.cadence,
    timezone: r.timezone,
    format: r.format,
    status: r.status,
    nextRunAt: r.nextRunAt ?? nextPlannedRun(r.cadence, now),
    ownerEmail: r.ownerEmail,
    recipients: r.recipients.map((x) => x.email),
    lastRunAt: r.executions[0]?.startedAt ?? null,
    lastRunStatus: r.executions[0]?.status ?? null,
  }));
}

// ─── Growth: lead defteri ────────────────────────────────────────────────

export interface AdminLeadRow {
  id: string;
  company: string;
  contact: string;
  source: string;
  seats: number;
  stage: string;
  nextStep: string;
  createdAt: Date;
}

/**
 * Satış hattı. Potansiyel müşteri bilgisi Voldi'nin KENDİ ticari kaydı
 * (müşteri çalışanı verisi değil) → erişim günlüğüne yazılmaz. Otomatik
 * kaynak yok; satırlar SQL ile açılır.
 */
export async function listLeads(staffUserId: string): Promise<AdminLeadRow[]> {
  await requireStaff(staffUserId);
  return prisma.lead.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      company: true,
      contact: true,
      source: true,
      seats: true,
      stage: true,
      nextStep: true,
      createdAt: true,
    },
  });
}

// ─── Support: vaka defteri ───────────────────────────────────────────────

export interface AdminSupportCaseRow {
  id: string;
  reference: string;
  subject: string;
  customer: string;
  requesterEmail: string;
  channel: string;
  category: string;
  priority: string;
  status: string;
  owner: string | null;
  createdAt: Date;
  updatedAt: Date;
  slaDueAt: Date;
  summary: string;
}

/**
 * Destek vakaları. `requesterEmail` müşteri kişisel verisi — listeyi açmak
 * `StaffAccess`e düşer, günlük yazılamazsa liste DÖNMEZ (KVKK emsali).
 */
export async function listSupportCases(
  staffUserId: string,
  ctx?: StaffContext,
): Promise<AdminSupportCaseRow[]> {
  const staff = await requireStaff(staffUserId);

  await logAccess(staff, SUPPORT_REGISTER, 'support', ctx);

  const rows = await prisma.supportCase.findMany({
    orderBy: { slaDueAt: 'asc' },
    take: 200,
  });

  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    subject: r.subject,
    customer: r.orgName || '—',
    requesterEmail: r.requesterEmail,
    channel: r.channel,
    category: r.category,
    priority: r.priority,
    status: r.status,
    owner: r.ownerEmail,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    slaDueAt: r.slaDueAt,
    summary: r.summary,
  }));
}

// ─── Platform telemetrisi ────────────────────────────────────────────────

export interface AdminTelemetry {
  services: Array<{
    id: string;
    name: string;
    group: string;
    state: 'operational' | 'degraded' | 'outage' | 'unknown';
    latencyMs: number | null;
    uptime: number | null;
    checkedAt: string | null;
  }>;
  mail: Array<{
    id: string;
    kind: string;
    provider: string;
    recipientDomain: string;
    state: string;
    attempts: number;
    createdAt: string;
  }>;
  exports: Array<{
    id: string;
    orgName: string;
    format: 'zip';
    state: 'complete';
    files: number;
    durationMs: null;
    createdAt: string;
  }>;
  jobs: Array<{
    id: string;
    name: string;
    queue: string;
    state: string;
    attempts: number;
    durationMs: number | null;
    scheduledAt: string;
    startedAt: string | null;
  }>;
  errors: Array<{
    id: string;
    fingerprint: string;
    title: string;
    surface: string;
    severity: string;
    events: number;
    affectedOrgs: number;
    firstSeenAt: string;
    lastSeenAt: string;
    state: string;
  }>;
  releases: Array<{
    id: string;
    version: string;
    environment: 'production' | 'staging';
    state: 'deployed';
    commit: string;
    owner: string;
    createdAt: string;
    checks: Array<{ label: string; passed: boolean }>;
  }>;
  flags: Array<{
    id: string;
    key: string;
    label: string;
    description: string;
    owner: string;
    state: 'on' | 'off';
    rollout: number;
    environments: Array<'production' | 'staging' | 'development'>;
    updatedAt: string;
  }>;
}

/**
 * Platform telemetrisi — yedi defterin TAMAMI gerçek kaynaktan:
 *
 *   · services: DB ping ÖLÇÜLÜR (SELECT 1 süresi); SMTP verify + CDN GET
 *     canlı problanır (lib/health-probes.ts, 3sn tavan). Uptime yine null —
 *     tarihçe defteri olmadan yüzde uydurulmaz.
 *   · mail: `MailDelivery` (getMailer her gönderimde yazıyor; "delivered" =
 *     röle kabul etti, uç teslim garantisi DEĞİL).
 *   · exports: `ActivityEvent type='export.zip'` — zaten var olan gerçek olay.
 *   · jobs: `JobRun` (cleanup-orphans koşularını yazıyor).
 *   · errors: `ErrorGroup`+`ErrorEvent` (Next onRequestError yazıyor);
 *     sayılar gerçek olay/org sayısı.
 *   · releases: `_prisma_migrations` — sahici dağıtım defteri; git commit'i
 *     çalışma zamanında bilinmez, '—' gösterilir.
 *   · flags: env'den türeyen TEK gerçek bayrak (EXPORT_REQUIRES_AUTH),
 *     salt-okunur.
 *
 * Tarihler ISO string döner: yedi defterin tek tüketicisi var (PlatformPage)
 * ve Date→string eşleme vergisini sayfaya taşımanın getirisi yok.
 * Kişisel veri yok (posta alıcısı yalnız ALAN ADI) → erişim günlüğüne
 * yazılmaz; kapı `requireStaff`.
 */
export async function getPlatformTelemetry(staffUserId: string): Promise<AdminTelemetry> {
  await requireStaff(staffUserId);

  const nowIso = new Date().toISOString();

  // DB sağlığı: gerçek ölçüm. SMTP/CDN probları paralel koşar ama her
  // metrik KENDİ süresini ölçer; sayfa en fazla prob zaman aşımı (3sn)
  // kadar bekler (health-probes.ts sözleşmesi).
  const dbStart = Date.now();
  const [dbLatency, smtpProbe, cdnProbe] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => Date.now() - dbStart),
    probeSmtp(),
    probeCdn(),
  ]);

  const [mailRows, exportRows, jobRows, errorGroups, errorCounts, migrations] = await Promise.all([
    prisma.mailDelivery.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.activityEvent.findMany({
      where: { type: 'export.zip' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: { id: true, createdAt: true, payload: true, org: { select: { name: true } } },
    }),
    prisma.jobRun.findMany({ orderBy: { scheduledAt: 'desc' }, take: 100 }),
    prisma.errorGroup.findMany({ orderBy: { lastSeenAt: 'desc' }, take: 100 }),
    prisma.errorEvent.groupBy({ by: ['fingerprint'], _count: { _all: true } }),
    prisma.$queryRaw<Array<{ migration_name: string; finished_at: Date | null }>>`
      SELECT migration_name, finished_at FROM _prisma_migrations
      ORDER BY finished_at DESC LIMIT 20`,
  ]);

  // Hata grubu başına etkilenen org sayısı (distinct orgId).
  const orgCounts = await prisma.errorEvent.groupBy({
    by: ['fingerprint', 'orgId'],
    _count: { _all: true },
  });
  const affected = new Map<string, number>();
  for (const g of orgCounts) {
    if (g.orgId) affected.set(g.fingerprint, (affected.get(g.fingerprint) ?? 0) + 1);
  }
  const eventCount = new Map(errorCounts.map((g) => [g.fingerprint, g._count._all]));

  const smtpConfigured = Boolean(process.env.MAIL_HOST);
  const isProd = process.env.NODE_ENV === 'production';

  return {
    services: [
      {
        id: 'db',
        name: 'MariaDB',
        group: 'Data',
        state: 'operational',
        latencyMs: dbLatency,
        uptime: null,
        checkedAt: nowIso,
      },
      {
        id: 'smtp',
        name: smtpConfigured ? 'SMTP relay (configured)' : 'SMTP relay (not configured)',
        group: 'Mail',
        state: smtpProbe.state,
        latencyMs: smtpProbe.latencyMs,
        uptime: null, // tarihçe defteri yok — yüzde uydurulmaz
        checkedAt: smtpProbe.state === 'unknown' ? null : nowIso,
      },
      {
        id: 'cdn',
        name: 'cdn.mailmyra.com',
        group: 'Assets',
        state: cdnProbe.state,
        latencyMs: cdnProbe.latencyMs,
        uptime: null,
        checkedAt: cdnProbe.state === 'unknown' ? null : nowIso,
      },
    ],
    mail: mailRows.map((r) => ({
      id: r.id,
      kind: r.kind,
      provider: r.provider,
      recipientDomain: r.recipientDomain,
      state: r.state,
      attempts: r.attempts,
      createdAt: r.createdAt.toISOString(),
    })),
    exports: exportRows.map((r) => {
      const payload = (r.payload ?? {}) as { fileCount?: number };
      return {
        id: r.id,
        orgName: r.org.name,
        format: 'zip' as const,
        state: 'complete' as const,
        files: typeof payload.fileCount === 'number' ? payload.fileCount : 0,
        durationMs: null,
        createdAt: r.createdAt.toISOString(),
      };
    }),
    jobs: jobRows.map((r) => ({
      id: r.id,
      name: r.name,
      queue: r.queue,
      state: r.state,
      attempts: r.attempts,
      durationMs: r.durationMs,
      scheduledAt: r.scheduledAt.toISOString(),
      startedAt: r.startedAt?.toISOString() ?? null,
    })),
    errors: errorGroups.map((g) => ({
      id: g.id,
      fingerprint: g.fingerprint,
      title: g.title,
      surface: g.surface,
      severity: g.severity,
      events: eventCount.get(g.fingerprint) ?? 0,
      affectedOrgs: affected.get(g.fingerprint) ?? 0,
      firstSeenAt: g.firstSeenAt.toISOString(),
      lastSeenAt: g.lastSeenAt.toISOString(),
      state: g.state,
    })),
    releases: migrations.map((m) => ({
      id: m.migration_name,
      version: m.migration_name,
      environment: isProd ? ('production' as const) : ('staging' as const),
      state: 'deployed' as const,
      commit: '—',
      owner: 'prisma migrate',
      createdAt: m.finished_at?.toISOString() ?? nowIso,
      checks: [],
    })),
    flags: [
      {
        id: 'export-requires-auth',
        key: 'EXPORT_REQUIRES_AUTH',
        label: 'Export requires auth',
        description:
          'Business-model gate: copy/download need a signed-in, paid account. Env-managed, read-only here.',
        owner: 'env',
        state: process.env.EXPORT_REQUIRES_AUTH === 'false' ? 'off' : 'on',
        rollout: 100,
        environments: ['production'],
        updatedAt: nowIso,
      },
    ],
  };
}
