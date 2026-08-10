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

  return { ok: true };
}
