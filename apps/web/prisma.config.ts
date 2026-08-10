import { existsSync } from 'node:fs';

import { defineConfig } from 'prisma/config';

// Prisma 7 `.env.local`'i kendiliğinden okumuyor.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

/**
 * Prisma 7'de bağlantı adresleri şemadan çıkıp buraya taşındı.
 *
 * Yalnız `DATABASE_URL` okunuyor — CLI ne derse ona gider. Entegrasyon
 * testleri migration'ı test veritabanına uygularken `DATABASE_URL`i kendi
 * ortamında `TEST_DATABASE_URL` ile değiştiriyor (`test-db/setup.ts`).
 * Burada `TEST_DATABASE_URL`e öncelik vermek `migrate dev`i yanlış
 * veritabanına yönlendirirdi.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
