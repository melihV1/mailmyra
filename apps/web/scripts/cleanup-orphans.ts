import { cleanupOrphans } from '../lib/cleanup';

const dir = process.env.CDN_WRITE_PATH;
if (!dir) {
  console.error('CDN_WRITE_PATH tanımlı değil.');
  process.exit(1);
}
const ttlDays = Number(process.env.ORPHAN_TTL_DAYS ?? 7);
const dryRun = process.argv.includes('--dry-run');

const res = await cleanupOrphans(dir, ttlDays, { dryRun, now: Date.now() });
if (dryRun) {
  console.log(`[dry-run] ${res.candidates.length} dosya silinecekti:`);
  for (const f of res.candidates) console.log('  -', f);
} else {
  console.log(`${res.deleted.length} dosya silindi:`);
  for (const f of res.deleted) console.log('  -', f);
}
