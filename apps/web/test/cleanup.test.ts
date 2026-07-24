import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cleanupOrphans } from '../lib/cleanup';

const DAY = 24 * 60 * 60 * 1000;
let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-cleanup-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeFile(name: string, ageDays: number, now: number): string {
  const p = join(dir, name);
  writeFileSync(p, 'x');
  const mtime = new Date(now - ageDays * DAY);
  utimesSync(p, mtime, mtime);
  return p;
}

describe('cleanupOrphans', () => {
  it('deletes files older than ttl, keeps newer ones', async () => {
    const now = Date.now();
    const old = makeFile('old.png', 10, now);
    const fresh = makeFile('fresh.png', 2, now);
    const res = await cleanupOrphans(dir, 7, { dryRun: false, now });
    expect(res.deleted).toEqual(['old.png']);
    expect(existsSync(old)).toBe(false);
    expect(existsSync(fresh)).toBe(true);
  });
  it('dry-run lists candidates but deletes nothing', async () => {
    const now = Date.now();
    const old = makeFile('old.png', 10, now);
    const res = await cleanupOrphans(dir, 7, { dryRun: true, now });
    expect(res.candidates).toEqual(['old.png']);
    expect(res.deleted).toEqual([]);
    expect(existsSync(old)).toBe(true);
  });
});
