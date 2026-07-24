import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
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
  it('never overwrites an existing file (immutability)', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    writeFileSync(join(dir, 'x.png'), 'original');
    await adapter.save('x.png', Buffer.from('new-content'));
    expect(readFileSync(join(dir, 'x.png'), 'utf8')).toBe('original');
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
  it('resolves successfully and keeps the original content when the file already exists', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    writeFileSync(join(dir, 'atomic.png'), 'original');
    const res = await adapter.save('atomic.png', Buffer.from('different-content'));
    expect(res.url).toBe('https://cdn.mailmyra.com/atomic.png');
    expect(readFileSync(join(dir, 'atomic.png'), 'utf8')).toBe('original');
  });
  it('handles concurrent saves to the same new filename without interleaving corruption', async () => {
    const adapter = new FsStorageAdapter(dir, 'https://cdn.mailmyra.com');
    const contents = ['one', 'two', 'three', 'four', 'five'];
    const results = await Promise.all(
      contents.map((c) => adapter.save('concurrent.png', Buffer.from(c))),
    );
    for (const r of results) {
      expect(r.url).toBe('https://cdn.mailmyra.com/concurrent.png');
    }
    expect(existsSync(join(dir, 'concurrent.png'))).toBe(true);
    const final = readFileSync(join(dir, 'concurrent.png'), 'utf8');
    expect(contents).toContain(final);
  });
});

describe('dirSizeBytes', () => {
  it('sums file sizes, 0 for missing dir', async () => {
    writeFileSync(join(dir, 'a.bin'), Buffer.alloc(10));
    writeFileSync(join(dir, 'b.bin'), Buffer.alloc(5));
    expect(await dirSizeBytes(dir)).toBe(15);
    expect(await dirSizeBytes(join(dir, 'yok'))).toBe(0);
  });
});

describe('getStorageAdapter', () => {
  it('throws a clear error when env is missing', () => {
    expect(() => getStorageAdapter({} as NodeJS.ProcessEnv)).toThrow(/CDN_WRITE_PATH/);
  });
});
