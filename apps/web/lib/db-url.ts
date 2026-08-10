/**
 * Hangi veritabanı?
 *
 * `TEST_DATABASE_URL` YALNIZ test koşusunda (vitest `NODE_ENV=test` atar)
 * dikkate alınır. Koşulsuz öncelik verildiğinde ne olduğu yaşandı: Next
 * `.env.local`'i geliştirmede de yükler, dev sunucusu test veritabanına
 * bağlandı ve her `npm run test:db` koşusu dev'de açılmış hesapları sildi.
 */
export function pickDatabaseUrl(env: {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
}): string | undefined {
  if (env.NODE_ENV === 'test' && env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
  return env.DATABASE_URL;
}
