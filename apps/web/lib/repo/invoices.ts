import { can } from '@mailmyra/core';

import { prisma } from '../db';
import { primaryOrgId, resolveBillingOrgId, roleFor } from './senders';

/**
 * Manuel fatura kayıtları (karar 2026-08-15). Panel yalnız OKUR — kesim
 * arayüzü bilinçli olarak yok (otomatik abonelik yazılmaz, CLAUDE.md).
 * Görme yetkisi `billing:manage` (yalnız owner): tutarlar org'un ticari
 * bilgisidir, plan kartı gibi herkese açık değildir.
 *
 * Kapsam kuralı: fatura ajans ağacının KÖK org'una kesilir; kullanıcının
 * birincil org'unun billing köküyle eşleşmeyen fatura yok sayılır.
 */

export type InvoiceStatus = 'due' | 'paid' | 'void';

export interface InvoiceRow {
  id: string;
  number: string;
  issuedAt: Date;
  dueAt: Date | null;
  seats: number;
  unitCents: number;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  note: string | null;
  /** Faturanın kesildiği org'un adı — "Invoice To" bloğu. */
  orgName: string;
}

function toRow(inv: {
  id: string;
  number: string;
  issuedAt: Date;
  dueAt: Date | null;
  seats: number;
  unitCents: number;
  amountCents: number;
  currency: string;
  status: string;
  note: string | null;
  org: { name: string };
}): InvoiceRow {
  return {
    id: inv.id,
    number: inv.number,
    issuedAt: inv.issuedAt,
    dueAt: inv.dueAt,
    seats: inv.seats,
    unitCents: inv.unitCents,
    amountCents: inv.amountCents,
    currency: inv.currency,
    status: (['due', 'paid', 'void'] as const).includes(inv.status as InvoiceStatus)
      ? (inv.status as InvoiceStatus)
      : 'due',
    note: inv.note,
    orgName: inv.org.name,
  };
}

/**
 * Kullanıcının billing kökü + oradaki görme hakkı. Yetki KÖKTE aranır:
 * ajans ağacında müşteri org'unun owner'ı köke kesilen ajans faturasını
 * göremez — rolü kökte yoksa kapsam da yok.
 */
async function billingScope(userId: string): Promise<string | null> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return null;
  const billingOrgId = await resolveBillingOrgId(prisma, orgId);
  const role = await roleFor(userId, billingOrgId);
  if (!role || !can(role, 'billing:manage')) return null;
  return billingOrgId;
}

export async function listInvoicesAs(userId: string): Promise<InvoiceRow[] | null> {
  const billingOrgId = await billingScope(userId);
  if (!billingOrgId) return null;
  const rows = await prisma.invoice.findMany({
    where: { orgId: billingOrgId },
    orderBy: { issuedAt: 'desc' },
    include: { org: { select: { name: true } } },
  });
  return rows.map(toRow);
}

/** Tekil fatura — kapsam dışına (yabancı, yetkisiz) null: varlık sızmaz. */
export async function getInvoiceAs(userId: string, invoiceId: string): Promise<InvoiceRow | null> {
  const billingOrgId = await billingScope(userId);
  if (!billingOrgId) return null;
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { org: { select: { name: true } } },
  });
  if (!inv || inv.orgId !== billingOrgId) return null;
  return toRow(inv);
}
