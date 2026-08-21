import { loadEnvFiles } from '../lib/env-file';
import { withJobRun } from '../lib/job-run';
import { getMailer } from '../lib/mail';
import { runDueReports } from '../lib/reports/run';

// Plesk'in "Komut dosyası çalıştır" bağlamı Next'in gördüğü .env dosyalarını
// görmez — DATABASE_URL/MAIL_* oradan gelir. withJobRun'dan da ÖNCE yüklenir
// (koşu defteri de DB ister). npm run cwd'si apps/web'dir.
loadEnvFiles();

/**
 * Zamanlanmış rapor koşusu — Plesk Scheduled Task her sabah çağırır
 * (kurulum: docs/report-runner.md). Elle de koşturulabilir:
 *   npm run reports -w apps/web            # gerçek koşu
 *   npm run reports -w apps/web -- --dry-run  # üretir, göndermez, defter yazmaz
 *
 * Zamanlama başarısızlığı JobRun'a 'failed' düşer (özet hatası fırlatılır)
 * ama teslim/koşu defterleri o noktaya kadar yazılmıştır — panel görür.
 */
async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const { prisma } = await import('../lib/db');

  const summary = await runDueReports({
    db: prisma,
    mailer: getMailer(),
    now: new Date(),
    dryRun,
  });

  console.log(
    `${dryRun ? '[dry-run] ' : ''}${summary.processed} schedule(s): ` +
      `${summary.succeeded} ok, ${summary.failed} failed`,
  );
  if (summary.failed > 0) throw new Error(`${summary.failed} schedule(s) failed`);
}

/**
 * Süreç KENDİLİĞİNDEN bitmez: prisma'nın MariaDB havuzu event loop'u açık
 * tutar (yaşandı, canlı 2026-08-21: iş saniyede bitti, Plesk penceresi
 * süreci sonsuza dek bekledi). Bağlantıyı kapat, sonra açıkça çık.
 */
async function finish(code: number): Promise<void> {
  try {
    const { prisma } = await import('../lib/db');
    await prisma.$disconnect();
  } catch {
    /* db hiç açılmadıysa kapatılacak bir şey yok */
  }
  process.exitCode = code;
  // Emniyet: havuz dışında loop'u tutan bir şey kalırsa 2sn sonra zorla çık.
  // `unref` — zamanlayıcının kendisi süreci canlı tutmaz; stdout bu sürede
  // boşalır (process.exit'i doğrudan çağırmak çıktıyı kesebilirdi).
  setTimeout(() => process.exit(code), 2000).unref();
}

withJobRun('run-reports', 'scheduled', main)
  .then(() => finish(0))
  .catch((e) => {
    console.error(e);
    return finish(1);
  });
