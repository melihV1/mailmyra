import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

import { pickDatabaseUrl } from './db-url';

/**
 * Tekil Prisma istemcisi.
 *
 * Prisma 7'de bağlantı artık şemadan değil bir **driver adapter**'dan geliyor;
 * MariaDB'ninki `@prisma/adapter-mariadb`. Bunun bizim için pratik bir yan
 * faydası var: bağlantı, motorun kendi ikili dosyası yerine saf JS sürücüsü
 * üzerinden kuruluyor — Mac'te build alıp Windows'a zip atan deploy
 * hikâyemizde native ikili uyuşmazlığı bir kırılma noktası daha az.
 *
 * `next dev` her sıcak yeniden yüklemede modülleri baştan değerlendiriyor;
 * istemci modül kapsamında tutulursa her seferinde yeni bir bağlantı havuzu
 * açılır ve geliştirme birkaç dakika içinde MariaDB'nin bağlantı sınırına
 * çarpar. `globalThis` sıcak yeniden yüklemeden sağ çıkar, üretimde ise modül
 * zaten bir kez değerlendirildiği için dal hiç işlemez.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  // Test adresi yalnız test koşusunda geçerli — seçim kuralı ve yaşanmış
  // kaza için bkz. `db-url.ts`.
  const url = pickDatabaseUrl(process.env);
  if (!url) {
    throw new Error(
      'DATABASE_URL tanımlı değil. apps/web/.env.local dosyasını .env.example' +
        "'den kur — kurulum adımları docs/local-database.md içinde.",
    );
  }
  return new PrismaClient({ adapter: new PrismaMariaDb(url) });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
