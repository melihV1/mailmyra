import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface StorageAdapter {
  save(filename: string, buffer: Buffer): Promise<{ url: string }>;
}

const SAFE_FILENAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * `filename` sunucu dosya sistemine doğrudan iletilir. Bare basename dışında
 * her şey (yol ayırıcı veya üst dizin geçişi) reddedilir — CDN dizini dışına
 * yazma girişimlerine karşı.
 */
function assertSafeFilename(filename: string): void {
  if (
    !SAFE_FILENAME_RE.test(filename) ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.includes('..')
  ) {
    throw new Error(
      `Invalid CDN filename: "${filename}". Must be a bare basename matching ${SAFE_FILENAME_RE} with no path separators or "..".`,
    );
  }
}

export class FsStorageAdapter implements StorageAdapter {
  constructor(
    private readonly writePath: string,
    private readonly publicUrl: string,
  ) {}

  async save(filename: string, buffer: Buffer): Promise<{ url: string }> {
    assertSafeFilename(filename);
    await mkdir(this.writePath, { recursive: true });
    const target = join(this.writePath, filename);
    // İçerik-adresli dosyalar değişmezdir: var olanı asla yeniden yazma.
    // TOCTOU'suz atomik dışlayıcı oluşturma: 'wx' iki işlemi (kontrol + yazma)
    // tek bir atomik syscall'a indirger. EEXIST => dosya zaten var, başarı
    // say (mevcut içerik korunur); başka bir hata ise yeniden fırlat.
    try {
      await writeFile(target, buffer, { flag: 'wx' });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
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
