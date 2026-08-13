import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { canRemoveMember, type Member } from '@mailmyra/core';

import { prisma } from '../db';
import { primaryOrgId } from '../repo/senders';
import { checkPasswordPolicy, hashPassword, verifyPassword } from './password';
import { revokeAllSessionsForUser, revokeOtherSessions } from './session';

/**
 * Hesap sayfasının akışları.
 *
 * Şifre değişimi mevcut şifreyi ister: oturum çalınmış olsa bile hırsız
 * şifreyi değiştirip sahibi dışarıda bırakamasın. Değişince işlemi yapan
 * oturum DIŞINDAKİ her oturum ölür — "şifremi değiştirdim" çoğu zaman
 * "hesabımda başkası var" demek, ama kişiyi kendi işleminin ortasında
 * kapı dışarı etmek de saçma olurdu.
 */

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: 'wrong_password' | 'weak_password' };

export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
  options: { keepSessionId?: string } = {},
): Promise<ChangePasswordResult> {
  const policy = checkPasswordPolicy(input.newPassword);
  if (!policy.ok) return { ok: false, reason: 'weak_password' };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    return { ok: false, reason: 'wrong_password' };
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  if (options.keepSessionId) await revokeOtherSessions(userId, options.keepSessionId);
  else await revokeAllSessionsForUser(userId);

  return { ok: true };
}

// ─── Hesap silme ─────────────────────────────────────────────────────────

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_credentials' | 'email_mismatch' | 'workspace_has_members' };

/**
 * Hesap silme (spec §4). Karar (2026-08-13, Hüseyin): TAM temizlik — CDN
 * dosyaları dahil. Sahadaki imzalar kırılır; uyarı metni bunu açıkça söyler.
 * Kural core'daki `canRemoveMember` ile: tek üye → org da gider; ayrılabilir
 * üye → yalnız kullanıcı; son owner + üyeler → engel.
 */
export async function deleteAccount(
  userId: string,
  input: { password: string; emailConfirm: string },
  opts: { cdnWritePath?: string } = {},
): Promise<DeleteAccountResult> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!(await verifyPassword(input.password, user.passwordHash))) {
    return { ok: false, reason: 'invalid_credentials' };
  }
  if (input.emailConfirm.trim().toLowerCase() !== user.email) {
    return { ok: false, reason: 'email_mismatch' };
  }

  const orgId = await primaryOrgId(userId);
  if (!orgId) {
    await prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  const members = (await prisma.membership.findMany({
    where: { orgId },
    select: { userId: true, role: true },
  })) as Member[];

  if (members.length > 1) {
    if (!canRemoveMember(members, userId)) {
      return { ok: false, reason: 'workspace_has_members' };
    }
    // Ayrılabilir üye: org başkalarına kalır, yalnız kullanıcı gider.
    await prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  // Tek üye: çalışma alanı sahibiyle birlikte gider — CDN dosyaları dahil.
  const assets = await prisma.asset.findMany({ where: { orgId }, select: { filename: true } });
  const writePath = opts.cdnWritePath ?? process.env.CDN_WRITE_PATH;
  if (writePath) {
    for (const a of assets) {
      try {
        await unlink(join(writePath, a.filename));
      } catch (error) {
        // Tek dosya arızası silmeyi durduramaz; iz log'da kalır.
        console.error('[account] CDN dosyası silinemedi:', a.filename, error);
      }
    }
  }
  await prisma.$transaction([
    // Org silinince Asset.orgId SetNull olurdu — yetim satır bırakmıyoruz.
    prisma.asset.deleteMany({ where: { orgId } }),
    prisma.organization.delete({ where: { id: orgId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  return { ok: true };
}
