import { createHash, randomBytes } from 'node:crypto';

/**
 * Oturum token'ı.
 *
 * Çerezde **opak** bir değer durur, veritabanında yalnız onun SHA-256'sı.
 * Veritabanı sızarsa oturumlar ele geçirilemez — saldırganın elindeki hash'ten
 * token üretilemez.
 *
 * Burada şifre hash'i (scrypt) değil SHA-256 kullanılıyor ve bu bilinçli: token
 * 256 bit rastgele, sözlük saldırısına konu değil. Yavaş bir hash her istekte
 * ödenecek gereksiz bir maliyet olurdu.
 */

const TOKEN_BYTES = 32;

export function newSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** 64 hex karakter — `Session.tokenHash` kolonu tam bu genişlikte. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
