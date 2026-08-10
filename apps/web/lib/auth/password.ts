import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

// `promisify` seçenekli aşırı yüklemeyi kaybediyor; maliyet parametrelerini
// verebilmek için imzayı elle yazıyoruz.
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/**
 * Şifre saklama — Node'un yerleşik `scrypt`i.
 *
 * argon2 ve bcrypt native modül; Mac'te build alıp Windows'a zip attığımız
 * deploy akışında native ikili uyuşmazlığı en olası kırılma noktası. scrypt
 * sıfır bağımlılık ve aynı ailedeki bellek-zor algoritmalardan.
 */

/** 2^14. Yaklaşık 16 MB bellek, bu makinede ~50 ms. */
const DEFAULT_COST = 16384;
const BLOCK_SIZE = 8;
const PARALLELISM = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * `scrypt$N$r$p$tuz$özet` — hash kendi parametrelerini taşır.
 *
 * Maliyet yıllar içinde yükselecek. Parametreler kayıtta yazmasaydı, onları
 * değiştirdiğimiz gün bütün eski şifreler doğrulanamaz hâle gelirdi.
 */
export async function hashPassword(
  password: string,
  options: { cost?: number } = {},
): Promise<string> {
  const cost = options.cost ?? DEFAULT_COST;
  const salt = randomBytes(SALT_LENGTH);
  const digest = await scryptAsync(password.normalize('NFC'), salt, KEY_LENGTH, {
    N: cost,
    r: BLOCK_SIZE,
    p: PARALLELISM,
    maxmem: 256 * cost * BLOCK_SIZE,
  });

  return [
    'scrypt',
    cost,
    BLOCK_SIZE,
    PARALLELISM,
    salt.toString('base64url'),
    digest.toString('base64url'),
  ].join('$');
}

/**
 * Bozuk kayıtta **fırlatmaz, `false` döner.** Fırlatsaydı giriş ucu 500 verir
 * ve "bu hesabın kaydı bozuk" bilgisini saldırgana sızdırırdı.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6) return false;

  const [scheme, costRaw, blockRaw, parallelRaw, saltRaw, digestRaw] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (scheme !== 'scrypt') return false;

  const cost = Number(costRaw);
  const blockSize = Number(blockRaw);
  const parallelism = Number(parallelRaw);
  if (![cost, blockSize, parallelism].every((n) => Number.isInteger(n) && n > 0)) return false;
  // Bozuk ya da düşmanca bir kayıt aşırı bellek istemesin.
  if (cost > 2 ** 20) return false;

  const salt = Buffer.from(saltRaw, 'base64url');
  const expected = Buffer.from(digestRaw, 'base64url');
  if (salt.length === 0 || expected.length === 0) return false;

  let actual: Buffer;
  try {
    actual = await scryptAsync(password.normalize('NFC'), salt, expected.length, {
      N: cost,
      r: blockSize,
      p: parallelism,
      maxmem: 256 * cost * blockSize,
    });
  } catch {
    return false;
  }

  // Uzunluklar eşit olmadan `timingSafeEqual` fırlatır.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

/**
 * Sabit maliyetli bir hash. İçeriği önemsiz — var olması önemli.
 *
 * Modül yüklenirken bir kez üretiliyor; her istekte yeniden üretmek gereksiz
 * olurdu ve zaten gizli tutulacak bir şey değil.
 */
let dummyHash: Promise<string> | null = null;

/**
 * Kullanıcı bulunamadığında da **aynı işi** yapar.
 *
 * Hesap yoksa doğrudan `false` dönmek, giriş ucunu milisaniyeler içinde
 * bitirir; var olan hesapta scrypt ~50 ms sürer. Bu fark, şifreyi hiç
 * bilmeden "bu e-posta kayıtlı mı" sorusunu yanıtlar — kayıt formuna
 * gitmeden hesap avlamaya yarar.
 *
 * Giriş ucu kullanıcıyı bulamadığında da bunu çağırmalı.
 */
export async function verifyPasswordAgainstMaybeHash(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (stored) return verifyPassword(password, stored);

  dummyHash ??= hashPassword('parola bulunamadi, yine de calis');
  await verifyPassword(password, await dummyHash);
  return false;
}

// ─── Politika ────────────────────────────────────────────────────────────

/**
 * Karmaşıklık kuralı **yok**: uzunluk daha etkili ve `P@ssw0rd!` üretmiyor.
 */
const MIN_LENGTH = 10;

/**
 * Uzunluk şartını geçen ama hâlâ ilk denemede kırılan şifreler. Tam bir sızmış
 * şifre listesi değil — o iş Faz 2'de bir servise verilir; buradaki amaç en
 * bariz seçimleri kesmek.
 */
const COMMON = new Set([
  '0123456789',
  '1234567890',
  '12345678910',
  '123456789012',
  'qwertyuiop',
  'qwerty12345',
  'asdfghjkl1',
  'password12',
  'password123',
  'password1234',
  'passw0rd123',
  'letmein123',
  'welcome123',
  'admin12345',
  'administrator',
  'iloveyou123',
  'sunshine12',
  'princess12',
  'football12',
  'baseball12',
  'monkey1234',
  'dragon1234',
  'trustno1234',
  'superman123',
  'starwars123',
  'whatever123',
  'qazwsxedc123',
  '1q2w3e4r5t',
  'zaq12wsxcde3',
  'abcd1234567',
  'aaaaaaaaaa',
  '1111111111',
  '0000000000',
  // Türkçe yaygınları
  'sifre12345',
  'parola12345',
  'galatasaray',
  'fenerbahce1',
  'besiktas123',
  'trabzonspor',
  'istanbul123',
  'ankara12345',
  'merhaba1234',
  'seninle1234',
  'canimbenim1',
  'askim12345',
]);

export type PolicyResult = { ok: true } | { ok: false; reason: 'too_short' | 'too_common' };

export function checkPasswordPolicy(password: string): PolicyResult {
  // Bayt değil **karakter** sayılıyor: "şifreşifre" 10 karakter ama 14 bayt.
  if ([...password].length < MIN_LENGTH) return { ok: false, reason: 'too_short' };
  if (COMMON.has(password.toLowerCase())) return { ok: false, reason: 'too_common' };
  return { ok: true };
}
