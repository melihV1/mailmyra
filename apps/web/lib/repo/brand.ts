import { can } from '@mailmyra/core';
import type { Prisma } from '@prisma/client';

import { parseBrandDocument, type BrandDocument } from '../brand-doc';
import { prisma } from '../db';
import { recordActivity } from './activity';
import { primaryOrgId, roleFor } from './senders';

/**
 * Marka deposu (spec §3/§6). Org başına tek satır; belge BÜTÜN olarak
 * okunur/yazılır. Okuma sınırı da bekçili: DB'ye elle yazılmış bozuk belge
 * null sayılır — tüketiciler "marka yok" gibi davranır, render çökmez.
 */

export async function getBrand(orgId: string): Promise<BrandDocument | null> {
  const row = await prisma.brandSetting.findUnique({ where: { orgId } });
  if (!row) return null;
  return parseBrandDocument(row.data);
}

export type SaveBrandResult = { ok: true } | { ok: false; reason: 'forbidden' };

export async function saveBrandAs(userId: string, doc: BrandDocument): Promise<SaveBrandResult> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return { ok: false, reason: 'forbidden' };
  const role = await roleFor(userId, orgId);
  if (!role || !can(role, 'brand:manage')) return { ok: false, reason: 'forbidden' };

  const data = doc as Prisma.InputJsonValue;
  await prisma.brandSetting.upsert({
    where: { orgId },
    create: { orgId, data },
    update: { data },
  });
  // Kilitli alan sayısı günlükte dursun: marka kuralı değişince hangi
  // alanların zorlandığı sonradan tartışılıyor (destek soruları).
  await recordActivity({
    orgId,
    actorUserId: userId,
    type: 'brand.saved',
    targetType: 'brand',
    payload: {
      lockedFields: Object.values(doc).filter(
        (f) => (f as { mode?: string } | null)?.mode === 'locked',
      ).length,
    },
  });
  return { ok: true };
}
