import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

import { canRemoveMember, type Member } from '@mailmyra/core';

import { prisma } from '../db';
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

  // Parola değiştiren kullanıcı "hesabımda biri var" diyordur; bekleyen adres
  // değişikliği o birinin kaçış kapısı olamaz.
  await prisma.emailToken.deleteMany({
    where: { userId, type: 'email_change', usedAt: null },
  });

  return { ok: true };
}

// ─── Hesap silme ─────────────────────────────────────────────────────────

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_credentials' | 'email_mismatch' | 'workspace_has_members' };

/**
 * Hesap silme (spec §4). Karar (2026-08-13, Hüseyin): TAM temizlik — CDN
 * dosyaları dahil. Sahadaki imzalar kırılır; uyarı metni bunu açıkça söyler.
 *
 * Kural core'daki `canRemoveMember` ile, kullanıcının TÜM üyelikleri
 * üzerinden değerlendirilir — davetle katıldığı ikinci (üçüncü...) bir org'u
 * da olabilir, yalnız `primaryOrgId`'ye bakmak o org'ları sessizce yetim
 * bırakırdı: bir org'da tek üye → o org da gider; ayrılabilir üye → yalnız
 * o org'daki üyelik; herhangi bir org'da son owner + başka üyeler → bütün
 * işlem engellenir (kısmi silme yok).
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

  const myMemberships = await prisma.membership.findMany({ where: { userId } });

  // Kullanıcının tek üye olduğu org'lar — bunlar kullanıcıyla birlikte gider.
  const soleOrgIds: string[] = [];
  for (const m of myMemberships) {
    const members = (await prisma.membership.findMany({
      where: { orgId: m.orgId },
      select: { userId: true, role: true },
    })) as Member[];

    if (members.length > 1) {
      if (!canRemoveMember(members, userId)) {
        // Herhangi bir org'da engelleniyorsa hiçbir şey silinmedi — buraya
        // kadar sadece okuma yaptık, geri almaya gerek yok.
        return { ok: false, reason: 'workspace_has_members' };
      }
      // Ayrılabilir üye: bu org başkalarına kalır, dokunulmaz. Kullanıcı
      // silinince Membership.userId cascade zaten bu satırı da götürecek.
      continue;
    }
    soleOrgIds.push(m.orgId);
  }

  if (soleOrgIds.length === 0) {
    await prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }

  // Silinecek her satır DB'den gitmeden önce dosya adlarını topluyoruz —
  // transaction'dan sonra Asset satırları artık okunamaz.
  const assets = await prisma.asset.findMany({
    where: { orgId: { in: soleOrgIds } },
    select: { filename: true },
  });
  const writePath = opts.cdnWritePath ?? process.env.CDN_WRITE_PATH;
  if (assets.length > 0 && !writePath) {
    // Kod tabanının genel kuralı (bkz. storage.ts, upload route): eksik
    // CDN_WRITE_PATH sessizce yutulmaz, sert konfigürasyon hatasıdır. Silmeden
    // ÖNCE fırlatılır — hiçbir şey silinmemişken konfigürasyon düzeltilebilir.
    throw new Error('CDN_WRITE_PATH must be set to delete an account with CDN assets');
  }

  // Transaction ÖNCE, unlink SONRA — bilinçli sıra. DB işlemi yarıda kesilirse
  // (bağlantı kopması, kısıt hatası) satırlar diskte hâlâ duran dosyalara
  // işaret etmemeli; bu, kırık bir referanstan çok daha kötü bir durumdur.
  // Sıra tersine çevrilirse en kötü ihtimalle diskte sahipsiz ama zararsız bir
  // dosya kalır — zaten kabul edilen, log'lanan arıza modeli (aşağıdaki
  // best-effort `unlink` bloğu) ve `cleanup-orphans` script'i bunun için var.
  await prisma.$transaction([
    // Org silinince Asset.orgId SetNull olurdu — yetim satır bırakmıyoruz.
    prisma.asset.deleteMany({ where: { orgId: { in: soleOrgIds } } }),
    prisma.organization.deleteMany({ where: { id: { in: soleOrgIds } } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

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
  return { ok: true };
}
