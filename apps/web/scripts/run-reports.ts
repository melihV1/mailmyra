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

withJobRun('run-reports', 'scheduled', main).catch((e) => {
  console.error(e);
  process.exit(1);
});
