import { prisma } from '../db';

/**
 * Auth uçlarının deneme sayacı — veritabanında, bellekte değil.
 *
 * `web.config` süreç sayısını sabitlemiyor; iisnode birden fazla süreç açarsa
 * bellekteki sayaç bölünür ve saldırgan süreç sayısı kadar fazla hak kazanır.
 * Mevcut `lib/rate-limit.ts` bunu açıkça "tek Node süreci varsayımı" diye
 * belgeliyor — auth için o varsayım geçerli değil, sayaç buraya taşındı.
 *
 * Artırma atomik: `INSERT ... ON DUPLICATE KEY UPDATE count = count + 1`.
 * Önce okuyup sonra yazan hâli denendi ve yarış testinde çöktü — paralel
 * istekler ya unique kısıtına çarpıyor ya da aynı sayıyı okuyup limitin
 * üstünde hak dağıtıyordu. Sayının okunması da aynı transaction'da: artırma
 * satır kilidini commit'e kadar tuttuğu için okunan değer *bizim* artışımız,
 * araya kimse giremiyor.
 */

/** 15 dakikalık sabit pencere (spec §5: 5 deneme / 15 dk). */
const WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LIMIT = 5;

export interface AttemptResult {
  allowed: boolean;
  /** Bu pencerede kalan hak. */
  remaining: number;
  /** Yalnız reddedilince dolu: pencerenin kapanmasına kalan süre. */
  retryAfterSeconds: number;
}

function windowStartFor(now: number): Date {
  return new Date(now - (now % WINDOW_MS));
}

/**
 * Bir deneme harcar ve karar döner.
 *
 * Başarısız *ve* başarılı her giriş denemesinden önce çağrılır; sayaç kabul
 * edilen istekleri de sayar (`count` sınırın üstüne çıkmaya devam eder ki
 * saldırının boyutu log'dan okunabilsin).
 */
export async function consumeAttempt(
  key: string,
  options: { limit?: number } = {},
): Promise<AttemptResult> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const now = Date.now();
  const windowStart = windowStartFor(now);

  const count = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO AuthAttempt (\`key\`, windowStart, count)
      VALUES (${key}, ${windowStart}, 1)
      ON DUPLICATE KEY UPDATE count = count + 1
    `;
    const rows = await tx.$queryRaw<Array<{ count: number }>>`
      SELECT count FROM AuthAttempt
      WHERE \`key\` = ${key} AND windowStart = ${windowStart}
    `;
    return Number(rows[0]?.count ?? 0);
  });

  const allowed = count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: allowed ? 0 : Math.ceil((windowStart.getTime() + WINDOW_MS - now) / 1000),
  };
}

/**
 * Doğru şifreyle giriş sayacı temizler — şifresini üçüncü denemede hatırlayan
 * kullanıcı bir sonraki girişe iki hakla başlamasın.
 */
export async function clearAttempts(key: string): Promise<void> {
  await prisma.authAttempt.deleteMany({ where: { key } });
}

/** Eski pencereleri süpürür; oturum temizliğiyle aynı yerden çağrılır. */
export async function sweepOldWindows(): Promise<number> {
  const cutoff = new Date(Date.now() - 2 * WINDOW_MS);
  const result = await prisma.authAttempt.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
  return result.count;
}
