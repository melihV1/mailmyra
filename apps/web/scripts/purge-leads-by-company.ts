import { finishCli } from '../lib/cli-exit';
import { prisma } from '../lib/db';
import { loadEnvFiles } from '../lib/env-file';

// Plesk'in "Komut dosyası çalıştır" bağlamı Next'in gördüğü .env dosyalarını
// görmez — DATABASE_URL oradan gelir (cleanup-orphans.ts ile aynı sebep).
loadEnvFiles();

/**
 * Tek bir şirket adına ait `Lead` satırlarını siler.
 *
 * Neden ayrı bir script: üründe lead SİLME yok ve olmamalı — satış defteri
 * bilerek append-only (`admin.ts` yalnız `createLead`/`updateLead` sunar).
 * Ama duman testleri gerçek satır üretiyor ve onlar deftere ait değil.
 * Bu script o istisnayı, elle SQL yazmadan ve kapsamı KODDA sabitleyerek
 * karşılar.
 *
 * Güvenlik korumaları:
 * · Şirket adı argüman olarak ZORUNLU — varsayılan yok, yanlışlıkla
 *   "hepsini sil" diye koşulamaz.
 * · Eşleşme TAM: `equals`, `contains` değil. "SMOKE" yazıp gerçek bir
 *   müşteriyi süpürmek mümkün olmasın.
 * · Önce SAYAR ve eşleşenleri basar, sonra siler; çıktı ikisini de gösterir.
 * · `--dry` ile yalnız sayar.
 *
 * Kullanım (Plesk > Node.js > Komut dosyası çalıştır):
 *   exec -- tsx scripts/purge-leads-by-company.ts "SMOKE-TEST-SILINEBILIR" --dry
 *   exec -- tsx scripts/purge-leads-by-company.ts "SMOKE-TEST-SILINEBILIR"
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const company = args.find((a) => !a.startsWith('--'));

  if (!company) {
    console.error('Şirket adı zorunlu. Örnek: tsx scripts/purge-leads-by-company.ts "SMOKE-TEST-SILINEBILIR" --dry');
    process.exitCode = 1;
    return;
  }

  const matches = await prisma.lead.findMany({
    where: { company: { equals: company } },
    select: { id: true, company: true, contact: true, source: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  console.info(`Eşleşen satır: ${matches.length}  (şirket TAM eşleşme: "${company}")`);
  for (const row of matches) {
    console.info(`  ${row.createdAt.toISOString()}  ${row.source.padEnd(18)} ${row.contact}`);
  }

  const total = await prisma.lead.count();
  console.info(`Tablodaki toplam lead: ${total} — silinmeyecek: ${total - matches.length}`);

  if (dry) {
    console.info('--dry verildi, hiçbir şey silinmedi.');
    return;
  }
  if (matches.length === 0) {
    console.info('Silinecek satır yok.');
    return;
  }

  const result = await prisma.lead.deleteMany({ where: { company: { equals: company } } });
  const remaining = await prisma.lead.count();
  console.info(`Silinen: ${result.count}. Tabloda kalan: ${remaining}.`);
}

main()
  .then(() => finishCli(process.exitCode === 1 ? 1 : 0))
  .catch((e) => {
    console.error(e);
    return finishCli(1);
  });
