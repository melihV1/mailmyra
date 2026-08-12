import { can, canExport } from '@mailmyra/core';
import { renderSignature, type SignatureData } from '@mailmyra/renderer';

import { mergeWithEmpty } from '../../app/builder/reducer';
import { applyBrand } from '../brand-apply';
import { prisma } from '../db';
import { nameExportFiles, type ExportNameInput } from '../export-filename';
import { wrapExportDoc } from '../export-htm';
import { getBrand } from './brand';
import { primaryOrgId, resolveBillingOrgId, roleFor } from './senders';

/**
 * Toplu zip'in veri ucu (spec §5). Süzgeç sırası: üyelik + izin → kapsam
 * (yabancı id → not_found, kısmi zip yok) → tavan → gönderici başına
 * `canExport` (taslak/pasif/entitlement core'da elenir) → saf renderer.
 * Render arızasında kısmi-sessiz başarı YOK: fırlatır, route 500 döner —
 * dağıtılan zipte bir kişinin sessizce eksik olması en pahalı hata.
 */

export type ExportBundleResult =
  | {
      ok: true;
      files: Array<{ filename: string; html: string }>;
      skipped: { unassigned: number; unpublished: number };
    }
  | { ok: false; reason: 'forbidden' | 'not_found' | 'no_exportable' | 'too_many' };

export async function collectExportBundle(
  userId: string,
  senderIds?: string[],
  cap = 200,
  iconBaseUrl?: string,
): Promise<ExportBundleResult> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };
  const role = await roleFor(userId, orgId);
  if (!role || !can(role, 'signature:export')) return { ok: false, reason: 'forbidden' };

  const selected = senderIds && senderIds.length > 0 ? [...new Set(senderIds)] : null;
  const senders = await prisma.senderIdentity.findMany({
    where: selected ? { orgId, id: { in: selected } } : { orgId },
    orderBy: { createdAt: 'asc' },
  });
  if (selected && senders.length !== selected.length) {
    return { ok: false, reason: 'not_found' };
  }

  // Entitlement fatura org'undan okunur — ajans ağacında iptal, müşteriyi
  // de kapatır (core'daki kilitli yetenek tablosu).
  const billingOrgId = await resolveBillingOrgId(prisma, orgId);
  const billing = await prisma.organization.findUniqueOrThrow({ where: { id: billingOrgId } });
  const entitlement = { entitledSeats: billing.entitledSeats, state: billing.entitlementState };

  // Marka bir kez okunur; bindirme render ÇIKIŞINDA (spec §4 — zorlamanın yeri).
  const brand = await getBrand(orgId);

  const exportable = senders.filter((s) => canExport({ entitlement, target: s }).allowed);
  const unpublished = senders.length - exportable.length;

  if (exportable.length > cap) return { ok: false, reason: 'too_many' };

  const signatures = await prisma.signature.findMany({
    where: { senderIdentityId: { in: exportable.map((s) => s.id) } },
    orderBy: { createdAt: 'asc' },
  });
  const bySender = new Map<string, typeof signatures>();
  for (const sig of signatures) {
    const key = sig.senderIdentityId!;
    const list = bySender.get(key);
    if (list) list.push(sig);
    else bySender.set(key, [sig]);
  }

  const names: ExportNameInput[] = [];
  const htmls: string[] = [];
  let unassigned = 0;
  for (const s of exportable) {
    const sigs = bySender.get(s.id) ?? [];
    if (sigs.length === 0) {
      unassigned += 1;
      continue;
    }
    for (const sig of sigs) {
      // Kayıt gevşek doğrulanır; render öncesi builder'la aynı savunma.
      // Json kolonunda şema-doğrulaması yok; okuma sınırında tip iddiası bizde.
      const data = applyBrand(mergeWithEmpty(sig.data as Partial<SignatureData>), brand);
      const fragment = renderSignature(
        data,
        data.layout.templateId,
        iconBaseUrl ? { iconBaseUrl } : undefined,
      );
      names.push({
        senderName: s.displayName,
        senderEmail: s.email,
        signatureName: sig.name,
        senderSignatureCount: sigs.length,
      });
      htmls.push(wrapExportDoc(fragment));
    }
  }

  if (htmls.length === 0) return { ok: false, reason: 'no_exportable' };

  const filenames = nameExportFiles(names);
  return {
    ok: true,
    files: htmls.map((html, i) => ({ filename: filenames[i]!, html })),
    skipped: { unassigned, unpublished },
  };
}
