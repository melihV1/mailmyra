import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Yalnız `test/` — birim testleri, veritabanı gerektirmez.
  // `test-db/` çalışan bir MariaDB istiyor, ayrı komutta: npm run test:db
  test: { include: ['test/**/*.test.ts'] },
});
