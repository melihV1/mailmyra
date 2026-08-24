import { can } from '@mailmyra/core';
import type { Prisma } from '@prisma/client';

import { prisma } from '../db';
import { primaryOrgId, roleFor } from './senders';

/**
 * Denetim günlüğü (karar 2026-08-15, dış denetim P2: "değişiklik ve yayın
 * audit log'u"). Bildirimden farkı tek cümlede: bildirim KİŞİYE gider,
 * okunur ve tercihle susturulabilir; günlük ORG'un kaydıdır, susturulamaz.
 *
 * Yazıcı hata YUTAR ve transaction DIŞINDA çağrılır — günlük yazılamadı
 * diye publish/export/davet akışı devrilmez (koltuk uyarı maili emsali).
 */

export type ActivityType =
  | 'sender.created'
  | 'sender.updated'
  | 'sender.published'
  | 'sender.deactivated'
  | 'sender.deleted'
  | 'senders.imported'
  | 'signature.renamed'
  | 'signature.deleted'
  | 'brand.saved'
  | 'member.invited'
  | 'member.joined'
  | 'member.role_changed'
  | 'member.removed'
  | 'export.zip'
  /* Voldi personelinin müşteri adına yaptığı düzeltmeler. Müşterinin
     akışına BİLEREK yazılıyor: hesabında bizim elimizle bir şey değiştiyse
     bunu görmeli. Personelin yalnız BAKMASI ise buraya yazılmaz — o
     `StaffAccess` tablosunda durur, müşteriye gürültü olmasın. */
  | 'support.entitlement_changed'
  | 'support.invoice_issued'
  | 'support.invoice_status_changed'
  /* Müşterinin kendi açtığı destek vakası (ticket v1) — kanal 'form'. */
  | 'support.case_opened';

export interface ActivityRow {
  id: string;
  type: ActivityType;
  /** Eylemi yapan; hesabı silinmişse null (satır yaşamaya devam eder). */
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  payload: Record<string, unknown>;
  createdAt: Date;
}

const LIST_LIMIT = 100;

export async function recordActivity(input: {
  orgId: string;
  actorUserId?: string | null;
  type: ActivityType;
  targetType?: 'sender' | 'signature' | 'member' | 'invitation' | 'brand' | 'export' | 'support';
  targetId?: string | null;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        orgId: input.orgId,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error('[activity] yazılamadı:', err);
  }
}

/**
 * Günlük listesi. Görme hakkı `member:manage` (owner + admin): kimin neyi
 * değiştirdiği yönetim bilgisidir, editor/viewer'a açılmaz. Yetkisize
 * `null` döner — arayüz "yetkiniz yok" kartını buna bakarak gösterir.
 */
export async function listActivityAs(
  userId: string,
  filter?: { type?: string },
): Promise<ActivityRow[] | null> {
  const orgId = await primaryOrgId(userId);
  if (!orgId) return null;
  const role = await roleFor(userId, orgId);
  if (!role || !can(role, 'member:manage')) return null;

  const rows = await prisma.activityEvent.findMany({
    where: {
      orgId,
      // Boş/bilinmeyen filtre tümünü getirir — sorgu dizesi kullanıcıdan gelir.
      // NOKTA İLE BİTEN değer bir GRUPtur (`support.` → bütün destek
      // olayları). Menüde tek tek tip yerine anlamlı kümeler duruyor ve
      // birden çok tipi kapsayan bir küme ancak ön ekle ifade edilebilir;
      // tam eşleşmede o filtre sessizce sıfır satır döndürürdü.
      ...(filter?.type
        ? filter.type.endsWith('.')
          ? { type: { startsWith: filter.type } }
          : { type: filter.type }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    include: { actor: { select: { email: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    type: r.type as ActivityType,
    actorEmail: r.actor?.email ?? null,
    targetType: r.targetType,
    targetId: r.targetId,
    payload: (r.payload ?? {}) as Record<string, unknown>,
    createdAt: r.createdAt,
  }));
}
