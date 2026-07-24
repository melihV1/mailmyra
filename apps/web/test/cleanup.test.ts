import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  utimesSync,
  existsSync,
  mkdirSync,
  symlinkSync,
  statSync,
} from 'node:fs';
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

  it('resolves with empty candidates/deleted for a missing directory, without throwing', async () => {
    const now = Date.now();
    const missing = join(dir, 'does-not-exist');
    const res = await cleanupOrphans(missing, 7, { dryRun: false, now });
    expect(res).toEqual({ candidates: [], deleted: [] });
  });

  it('skips subdirectories: not deleted, not listed, no throw', async () => {
    const now = Date.now();
    const sub = join(dir, 'subdir');
    mkdirSync(sub);
    const oldSubMtime = new Date(now - 30 * DAY);
    utimesSync(sub, oldSubMtime, oldSubMtime);
    const res = await cleanupOrphans(dir, 7, { dryRun: false, now });
    expect(res.candidates).toEqual([]);
    expect(res.deleted).toEqual([]);
    expect(existsSync(sub)).toBe(true);
  });

  it('retains a file exactly at the ttl boundary (strict >)', async () => {
    // utimesSync round-trips a Date through nanosecond-resolution storage, so
    // reconstructing "now" independently (e.g. Date.now() - 7*DAY) can be off by
    // sub-millisecond floating point noise. Deriving `now` from the file's own
    // stat'd mtimeMs guarantees `now - mtimeMs` is exactly `ttlDays * DAY`.
    const ttlDays = 7;
    const boundary = join(dir, 'boundary.png');
    writeFileSync(boundary, 'x');
    const roughMtime = new Date(Date.now() - ttlDays * DAY);
    utimesSync(boundary, roughMtime, roughMtime);
    const actualMtimeMs = statSync(boundary).mtimeMs;
    const now = actualMtimeMs + ttlDays * DAY;
    expect(now - actualMtimeMs).toBe(ttlDays * DAY);

    const res = await cleanupOrphans(dir, ttlDays, { dryRun: false, now });
    expect(res.candidates).toEqual([]);
    expect(res.deleted).toEqual([]);
    expect(existsSync(boundary)).toBe(true);
  });

  it('isolates a per-entry stat error (dangling symlink) so the rest of the run still completes', async () => {
    const now = Date.now();
    const old = makeFile('old.png', 10, now);
    symlinkSync('/nonexistent-target-xyz', join(dir, 'dangling'));
    const res = await cleanupOrphans(dir, 7, { dryRun: false, now });
    expect(res.deleted).toEqual(['old.png']);
    expect(existsSync(old)).toBe(false);
  });
});
