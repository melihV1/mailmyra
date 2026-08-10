import { prisma } from '../db';
import { SESSION_TTL_SECONDS } from './cookie';
import { hashToken, newSessionToken } from './token';

/**
 * Oturumlar veritabanında, bellekte değil.
 *
 * `web.config` süreç sayısını sabitlemiyor ve iisnode birden fazla süreç
 * açabilir; bellekte tutulan oturum, isteğin hangi sürece düştüğüne göre
 * bazen var bazen yok olurdu. Veritabanında olmasının ikinci faydası: kayıt
 * silinince oturum **anında** ölüyor, iptal edilebilirlik bedava geliyor.
 */

const TTL_MS = SESSION_TTL_SECONDS * 1000;

/**
 * Kayan süre için yenileme eşiği.
 *
 * Her istekte `UPDATE` atmak sayfa başına birden çok yazma demek ve kayan
 * sürenin istediği şey bu değil. Saatte bir yenilemek 30 günlük pencereyi
 * pratikte aynı şekilde kaydırıyor, yazma yükünü ise ortadan kaldırıyor.
 */
const REFRESH_AFTER_MS = 60 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
}

export interface ActiveSession {
  id: string;
  user: SessionUser;
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  meta: { userAgent?: string; ip?: string } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      // Ham token asla yazılmıyor — yalnız hash'i.
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: meta.userAgent?.slice(0, 512),
      ip: meta.ip?.slice(0, 45),
    },
  });

  return { token, expiresAt };
}

export async function readSession(token: string): Promise<ActiveSession | null> {
  const tokenHash = hashToken(token);
  const row = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, emailVerifiedAt: true } } },
  });
  if (!row) return null;

  const now = Date.now();

  if (row.expiresAt.getTime() <= now) {
    // Süresi geçmiş kayıt çürümeye bırakılmıyor. Toplu temizlik işi olmasa da
    // tablo kendi kendini süpürüyor.
    await prisma.session.deleteMany({ where: { id: row.id } });
    return null;
  }

  let expiresAt = row.expiresAt;
  if (now - row.lastSeenAt.getTime() >= REFRESH_AFTER_MS) {
    expiresAt = new Date(now + TTL_MS);
    await prisma.session.update({
      where: { id: row.id },
      data: { lastSeenAt: new Date(now), expiresAt },
    });
  }

  return { id: row.id, user: row.user, expiresAt };
}

/** Çıkış. Bilinmeyen token hata değil — çerez bayat olabilir. */
export async function revokeSession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Şifre değişiminde ve "her yerden çıkış yap"ta kullanılır. */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}
