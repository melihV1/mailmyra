import { cleanupOrphans } from '../lib/cleanup';
import { finishCli } from '../lib/cli-exit';
import { envInt } from '../lib/env';
import { loadEnvFiles } from '../lib/env-file';
import { withJobRun } from '../lib/job-run';

// Plesk'in "Komut dosyası çalıştır" bağlamı Next'in gördüğü .env dosyalarını
// görmez (CDN_WRITE_PATH ve JobRun defteri için DATABASE_URL oradan gelir).
loadEnvFiles();

async function main(): Promise<void> {
  const dir = process.env.CDN_WRITE_PATH;
  if (!dir) {
    console.error('CDN_WRITE_PATH tanımlı değil.');
    process.exit(1);
  }
  const ttlDays = envInt(process.env.ORPHAN_TTL_DAYS, 7);
  const dryRun = process.argv.includes('--dry-run');

  const res = await cleanupOrphans(dir, ttlDays, { dryRun, now: Date.now() });
  if (dryRun) {
    console.log(`[dry-run] ${res.candidates.length} dosya silinecekti:`);
    for (const f of res.candidates) console.log('  -', f);
  } else {
    console.log(`${res.deleted.length} dosya silindi:`);
    for (const f of res.deleted) console.log('  -', f);
  }
}

withJobRun('cleanup-orphans', 'manual', main)
  .then(() => finishCli(0))
  .catch((e) => {
    console.error(e);
    return finishCli(1);
  });
