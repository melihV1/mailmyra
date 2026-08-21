import { cleanupOrphans } from '../lib/cleanup';
import { envInt } from '../lib/env';

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

/**
 * Koşu defteri (JobRun) — panelin Jobs ekranının tek kaynağı. En-iyi-çaba:
 * defter yazılamıyorsa (DB'siz makine) temizlik YİNE koşar; iş gözlemden
 * önemlidir. `--dry-run` da kaydedilir — o da gerçek bir koşudur.
 */
async function withJobRun(fn: () => Promise<void>): Promise<void> {
  const startedAt = new Date();
  let runId: string | null = null;
  try {
    const { prisma } = await import('../lib/db');
    const run = await prisma.jobRun.create({
      data: { name: 'cleanup-orphans', queue: 'manual', state: 'running', startedAt },
      select: { id: true },
    });
    runId = run.id;
  } catch {
    /* defter yok — devam */
  }

  const finish = async (state: 'complete' | 'failed', error?: string) => {
    if (!runId) return;
    try {
      const { prisma } = await import('../lib/db');
      await prisma.jobRun.update({
        where: { id: runId },
        data: {
          state,
          finishedAt: new Date(),
          durationMs: Date.now() - startedAt.getTime(),
          error: error?.slice(0, 300) ?? null,
        },
      });
    } catch {
      /* gözlem katmanı işi düşüremez */
    }
  };

  try {
    await fn();
    await finish('complete');
  } catch (e) {
    await finish('failed', e instanceof Error ? e.message : String(e));
    throw e;
  }
}

withJobRun(main).catch((e) => {
  console.error(e);
  process.exit(1);
});
