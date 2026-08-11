import { can, seatStatus, type Role, type SeatStatus } from '@mailmyra/core';
import type { Prisma } from '@prisma/client';

import { prisma } from '../db';

/**
 * İmza deposu.
 *
 * Yetki kuralı `packages/core`'daki matristen okunur ve BURADA uygulanır —
 * arayüz düğme gizler, kapı budur. Her fonksiyon önce çağıranın ilgili org'da
 * ne olduğuna bakar; org dışından biri için imza mevcut bile değildir
 * (`not_found`), yetkisi yetmeyen üye içinse `forbidden`.
 */

export type RepoError = { ok: false; reason: 'forbidden' | 'not_found' };

async function roleIn(userId: string, orgId: string): Promise<Role | null> {
  const membership = await prisma.membership.findUnique({
    where: { userId_orgId: { userId, orgId } },
  });
  return membership?.role ?? null;
}

export interface SaveInput {
  /** Doluysa güncelleme, boşsa yeni kayıt. */
  id?: string;
  orgId: string;
  name: string;
  /** Renderer'ın `SignatureData`'sı — burada şekline bakılmaz, bütün saklanır. */
  data: unknown;
}

export type SaveResult = { ok: true; id: string } | RepoError;

export async function saveSignature(userId: string, input: SaveInput): Promise<SaveResult> {
  const role = await roleIn(userId, input.orgId);
  if (!role) return { ok: false, reason: 'forbidden' };
  if (!can(role, 'signature:edit')) return { ok: false, reason: 'forbidden' };

  const data = input.data as Prisma.InputJsonValue;

  if (input.id) {
    // Güncellenecek satır ÇAĞIRANIN org'unda olmalı. `updateMany` + orgId
    // şartı: başka org'un imzasına kendi org kimliğiyle uzanmak 0 satır
    // günceller ve not_found döner — kimlik doğrulanmış sızma yolu kalmaz.
    const updated = await prisma.signature.updateMany({
      where: { id: input.id, orgId: input.orgId },
      data: { name: input.name, data },
    });
    if (updated.count === 0) return { ok: false, reason: 'not_found' };
    return { ok: true, id: input.id };
  }

  const created = await prisma.signature.create({
    data: { orgId: input.orgId, name: input.name, data },
  });
  return { ok: true, id: created.id };
}

export type MutateResult = { ok: true } | RepoError;

export async function deleteSignature(userId: string, signatureId: string): Promise<MutateResult> {
  const signature = await prisma.signature.findUnique({ where: { id: signatureId } });
  if (!signature) return { ok: false, reason: 'not_found' };

  const role = await roleIn(userId, signature.orgId);
  if (!role) return { ok: false, reason: 'not_found' }; // org dışına varlık sızdırma
  if (!can(role, 'signature:edit')) return { ok: false, reason: 'forbidden' };

  await prisma.signature.delete({ where: { id: signatureId } });
  return { ok: true };
}

export type DuplicateResult = { ok: true; id: string } | RepoError;

export async function duplicateSignature(
  userId: string,
  signatureId: string,
): Promise<DuplicateResult> {
  const signature = await prisma.signature.findUnique({ where: { id: signatureId } });
  if (!signature) return { ok: false, reason: 'not_found' };

  const role = await roleIn(userId, signature.orgId);
  if (!role) return { ok: false, reason: 'not_found' };
  if (!can(role, 'signature:edit')) return { ok: false, reason: 'forbidden' };

  const copy = await prisma.signature.create({
    data: {
      orgId: signature.orgId,
      name: `${signature.name} (copy)`,
      templateId: signature.templateId,
      data: signature.data as Prisma.InputJsonValue,
      // Gönderici bağı bilerek kopyalanmıyor: kopyalansaydı çoğaltma işlemi
      // koltuk davranışını sessizce etkilerdi.
      senderIdentityId: null,
    },
  });
  return { ok: true, id: copy.id };
}

export interface FullSignature {
  id: string;
  orgId: string;
  name: string;
  templateId: string;
  data: unknown;
  updatedAt: Date;
}

export type GetResult = { ok: true; signature: FullSignature } | RepoError;

/** Builder'ın düzenleme için yüklediği tam kayıt. Okuma her role açık. */
export async function getSignature(userId: string, signatureId: string): Promise<GetResult> {
  const signature = await prisma.signature.findUnique({ where: { id: signatureId } });
  if (!signature) return { ok: false, reason: 'not_found' };

  const role = await roleIn(userId, signature.orgId);
  if (!role || !can(role, 'signature:view')) return { ok: false, reason: 'not_found' };

  return {
    ok: true,
    signature: {
      id: signature.id,
      orgId: signature.orgId,
      name: signature.name,
      templateId: signature.templateId,
      data: signature.data,
      updatedAt: signature.updatedAt,
    },
  };
}

export interface SignatureRow {
  id: string;
  name: string;
  templateId: string;
  updatedAt: Date;
  senderId: string | null;
  senderName: string | null;
  senderStatus: SeatStatus | null;
}

export type AssignResult = { ok: true } | RepoError;

/**
 * İmzayı bir göndericiye bağlar (ya da null ile çözer).
 *
 * İki taraf da AYNI org'da olmalı: çapraz atama, imzası A org'unda duran ama
 * koltuğu B org'unda tüketen bir kimlik yaratır ve muhasebeyi kirletirdi.
 * Yabancı gönderici için cevap `not_found` — varlığı bile söylenmez.
 */
export async function assignSignature(
  userId: string,
  signatureId: string,
  senderIdentityId: string | null,
): Promise<AssignResult> {
  const signature = await prisma.signature.findUnique({ where: { id: signatureId } });
  if (!signature) return { ok: false, reason: 'not_found' };

  const role = await roleIn(userId, signature.orgId);
  if (!role) return { ok: false, reason: 'not_found' };
  if (!can(role, 'signature:edit')) return { ok: false, reason: 'forbidden' };

  if (senderIdentityId !== null) {
    const sender = await prisma.senderIdentity.findUnique({ where: { id: senderIdentityId } });
    if (!sender || sender.orgId !== signature.orgId) return { ok: false, reason: 'not_found' };
  }

  await prisma.signature.update({ where: { id: signatureId }, data: { senderIdentityId } });
  return { ok: true };
}

/** Çağıranın üye olduğu org'lardaki imzalar — panel listesi buradan okur. */
export async function listSignatures(userId: string): Promise<SignatureRow[]> {
  const rows = await prisma.signature.findMany({
    where: { org: { memberships: { some: { userId } } } },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      templateId: true,
      updatedAt: true,
      senderIdentityId: true,
      sender: { select: { displayName: true, publishedAt: true, deactivatedAt: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    templateId: r.templateId,
    updatedAt: r.updatedAt,
    senderId: r.senderIdentityId,
    senderName: r.sender?.displayName ?? null,
    senderStatus: r.sender ? seatStatus(r.sender) : null,
  }));
}
