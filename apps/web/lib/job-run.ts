/**
 * Koşu defteri (JobRun) sarmalı — panelin Jobs ekranının tek kaynağı.
 * EN-İYİ-ÇABA: defter yazılamıyorsa (DB'siz makine) iş YİNE koşar; iş
 * gözlemden önemlidir. `import('./db')` DİNAMİK: script'ler DATABASE_URL
 * olmayan makinede de yüklenebilsin (lib/mail/index.ts emsali).
 */
export async function withJobRun(
  name: string,
  queue: string,
  fn: () => Promise<void>,
): Promise<void> {
  const startedAt = new Date();
  let runId: string | null = null;
  try {
    const { prisma } = await import('./db');
    const run = await prisma.jobRun.create({
      data: { name, queue, state: 'running', startedAt },
      select: { id: true },
    });
    runId = run.id;
  } catch {
    /* defter yok — devam */
  }

  const finish = async (state: 'complete' | 'failed', error?: string) => {
    if (!runId) return;
    try {
      const { prisma } = await import('./db');
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
