import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(here, '..');

/**
 * Test veritabanını şemanın son hâline getirir.
 *
 * Sessiz atlama yok: veritabanı ayakta değilse testler *başarısız* olur,
 * "0 test koştu, her şey yolunda" demez.
 */
export async function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL tanımlı değil. apps/web/.env.local dosyasını .env.example' +
        "'den kur — kurulum adımları docs/local-database.md içinde.",
    );
  }

  if (!existsSync(resolve(appRoot, 'prisma/migrations'))) {
    throw new Error('prisma/migrations yok — önce `npm run db:migrate -w apps/web` koştur.');
  }

  try {
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: appRoot,
      // Migration test veritabanına uygulanmalı, geliştirme veritabanına değil.
      env: { ...process.env, DATABASE_URL: url },
      stdio: 'pipe',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Test veritabanına migration uygulanamadı. MariaDB çalışıyor mu?\n` +
        `  brew services start mariadb@11.8\n\n${detail}`,
    );
  }
}
