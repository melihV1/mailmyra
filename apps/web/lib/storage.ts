import { mkdir, readdir, stat, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

export interface StorageAdapter {
  save(filename: string, buffer: Buffer): Promise<{ url: string }>;
}

export class FsStorageAdapter implements StorageAdapter {
  constructor(
    private readonly writePath: string,
    private readonly publicUrl: string,
  ) {}

  async save(filename: string, buffer: Buffer): Promise<{ url: string }> {
    await mkdir(this.writePath, { recursive: true });
    const target = join(this.writePath, filename);
    // İçerik-adresli dosyalar değişmezdir: var olanı asla yeniden yazma.
    try {
      await access(target);
    } catch {
      await writeFile(target, buffer);
    }
    return { url: `${this.publicUrl.replace(/\/$/, '')}/${filename}` };
  }
}

export async function dirSizeBytes(dir: string): Promise<number> {
  let total = 0;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return 0;
  }
  for (const name of entries) {
    const s = await stat(join(dir, name));
    if (s.isFile()) total += s.size;
  }
  return total;
}

export function getStorageAdapter(env: NodeJS.ProcessEnv = process.env): FsStorageAdapter {
  const writePath = env.CDN_WRITE_PATH;
  const publicUrl = env.CDN_PUBLIC_URL;
  if (!writePath || !publicUrl) {
    throw new Error('CDN_WRITE_PATH and CDN_PUBLIC_URL must be set (see .env.example)');
  }
  return new FsStorageAdapter(writePath, publicUrl);
}
