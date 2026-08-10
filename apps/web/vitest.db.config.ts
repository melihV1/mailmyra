import { existsSync } from 'node:fs';

import { defineConfig } from 'vitest/config';

// Next `.env.local`'i kendisi yüklüyor, vitest yüklemiyor. Bağlantı adresleri
// orada durduğu için burada elle okunuyor.
if (existsSync('.env.local')) process.loadEnvFile('.env.local');

/**
 * Entegrasyon testleri — çalışan bir MariaDB gerektirir (bkz.
 * `docs/local-database.md`). Varsayılan `npm test` bunları koşmaz; birim
 * testleri veritabanısız kalsın diye ayrı komut: `npm run test:db`.
 *
 * `globalSetup` migration'ları test veritabanına uygular. Bu yüzden şema
 * değişince test'i koşmak yeterli, elle `migrate` gerekmiyor.
 */
export default defineConfig({
  test: {
    include: ['test-db/**/*.test.ts'],
    globalSetup: ['./test-db/setup.ts'],
    // Aynı tablolara yazıp `deleteMany` ile temizliyorlar; paralel koşarlarsa
    // birbirlerinin satırlarını silerler.
    fileParallelism: false,
  },
});
