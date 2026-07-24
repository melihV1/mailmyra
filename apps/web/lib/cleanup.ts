import { readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * TTL'den eski dosyaları bulur ve (dryRun değilse) siler.
 * Hafta 4'te DB referans kontrolü eklenecek — sahadaki URL asla silinmez.
 */
export async function cleanupOrphans(
  dir: string,
  ttlDays: number,
  opts: { dryRun: boolean; now: number },
): Promise<{ candidates: string[]; deleted: string[] }> {
  const candidates: string[] = [];
  const deleted: string[] = [];
  let entries: string[] = [];
  try {
    entries = await readdir(dir);
  } catch {
    return { candidates, deleted };
  }
  for (const name of entries) {
    const p = join(dir, name);
    try {
      const s = await stat(p);
      if (!s.isFile()) continue;
      if (opts.now - s.mtimeMs > ttlDays * DAY_MS) {
        candidates.push(name);
        if (!opts.dryRun) {
          await unlink(p);
          deleted.push(name);
        }
      }
    } catch {
      // Vanished file, broken symlink, permission error, etc. — skip this
      // entry and keep processing the rest of the directory.
      continue;
    }
  }
  return { candidates, deleted };
}
