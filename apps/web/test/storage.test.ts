import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FsStorageAdapter, dirSizeBytes, getStorageAdapter } from '../lib/storage';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-storage-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('FsStorageAdapter', () => {
  it('writes the file and returns the public url', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    const res = await adapter.save('a3f9c2e1.png', Buffer.from('img'));
    expect(res.url).toBe('https://cdn.mailmyra.com/a3f9c2e1.png');
    expect(readFileSync(join(dir, 'a3f9c2e1.png'), 'utf8')).toBe('img');
  });
  it('never overwrites an existing file with different content (immutability) — rejects instead of silently keeping the old content', async () => {
    // Semantik değişikliği (bu review dalgasında karara bağlandı): önceden bu
    // durum sessizce başarıyla dönüp eski içeriği koruyordu. Artık içerik
    // adresli (content-addressed) bir dosya adında FARKLI içerik görülmesi
    // bir çakışma (collision) sinyalidir ve reddedilir — sessizce yutulmaz.
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    writeFileSync(join(dir, 'x.png'), 'original');
    await expect(adapter.save('x.png', Buffer.from('new-content'))).rejects.toThrow(
      /Content collision for immutable file: x\.png/,
    );
    expect(readFileSync(join(dir, 'x.png'), 'utf8')).toBe('original');
  });
  it('resolves without rewriting when an existing file has identical content', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    writeFileSync(join(dir, 'same.png'), 'same-content');
    const res = await adapter.save('same.png', Buffer.from('same-content'));
    expect(res.url).toBe('https://cdn.mailmyra.com/same.png');
    expect(readFileSync(join(dir, 'same.png'), 'utf8')).toBe('same-content');
  });
  it('creates the write path if missing', async () => {
    const nested = join(dir, 'deep/cdn');
    const adapter = new FsStorageAdapter(nested, 'https://cdn.mailmyra.com');
    await adapter.save('y.png', Buffer.from('z'));
    expect(existsSync(join(nested, 'y.png'))).toBe(true);
  });
});

describe('FsStorageAdapter — path traversal', () => {
  it('rejects a filename with a parent-directory segment', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    await expect(adapter.save('../evil.png', Buffer.from('x'))).rejects.toThrow();
    expect(existsSync(join(dir, '..', 'evil.png'))).toBe(false);
  });
  it('rejects a filename containing a path separator', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    await expect(adapter.save('a/b.png', Buffer.from('x'))).rejects.toThrow();
    expect(existsSync(join(dir, 'a', 'b.png'))).toBe(false);
  });
  it('rejects a filename that looks like an absolute path', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    await expect(adapter.save('/abs.png', Buffer.from('x'))).rejects.toThrow();
    expect(existsSync(join(dir, 'abs.png'))).toBe(false);
  });
});

describe('FsStorageAdapter — atomic exclusive write (TOCTOU)', () => {
  it('resolves and keeps the content when the same content already exists (race)', async () => {
    // Gerçek çağıranlar dosya adını içeriğin hash'inden türetir, bu yüzden
    // "aynı dosya adına eşzamanlı yazma" senaryosunda içerik de her zaman
    // aynıdır. `wx` ile oluşturma yarışını kaybeden taraf EEXIST alır, sonra
    // diskteki içerikle kendi buffer'ını karşılaştırır — eşleştiği için
    // başarıyla döner.
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    writeFileSync(join(dir, 'atomic.png'), 'same-content');
    const res = await adapter.save('atomic.png', Buffer.from('same-content'));
    expect(res.url).toBe('https://cdn.mailmyra.com/atomic.png');
    expect(readFileSync(join(dir, 'atomic.png'), 'utf8')).toBe('same-content');
  });
  it('handles concurrent saves of identical content to the same new filename without interleaving corruption', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    const content = 'identical-content';
    const results = await Promise.all(
      Array.from({ length: 5 }, () => adapter.save('concurrent.png', Buffer.from(content))),
    );
    for (const r of results) {
      expect(r.url).toBe('https://cdn.mailmyra.com/concurrent.png');
    }
    expect(existsSync(join(dir, 'concurrent.png'))).toBe(true);
    expect(readFileSync(join(dir, 'concurrent.png'), 'utf8')).toBe(content);
  });
});

describe('dirSizeBytes', () => {
  it('sums file sizes, 0 for missing dir', async () => {
    writeFileSync(join(dir, 'a.bin'), Buffer.alloc(10));
    writeFileSync(join(dir, 'b.bin'), Buffer.alloc(5));
    expect(await dirSizeBytes(dir)).toBe(15);
    expect(await dirSizeBytes(join(dir, 'yok'))).toBe(0);
  });
  it('skips an entry that vanishes or is a broken symlink instead of throwing', async () => {
    writeFileSync(join(dir, 'a.bin'), Buffer.alloc(10));
    symlinkSync(join(dir, 'nonexistent-target-xyz'), join(dir, 'broken-link'));
    await expect(dirSizeBytes(dir)).resolves.toBe(10);
  });
});

describe('getStorageAdapter', () => {
  it('throws a clear error when env is missing', () => {
    expect(() => getStorageAdapter({} as NodeJS.ProcessEnv)).toThrow(/CDN_WRITE_PATH/);
  });
});
