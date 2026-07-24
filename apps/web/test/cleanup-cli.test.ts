import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, rmSync, writeFileSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const CLI_TIMEOUT = 20_000;
const DAY = 24 * 60 * 60 * 1000;

const webRoot = process.cwd();
const tsxBin = join(webRoot, 'node_modules', '.bin', 'tsx');
const scriptPath = join(webRoot, 'scripts', 'cleanup-orphans.ts');

// Base env with CDN_WRITE_PATH stripped, so the CLI's "missing env" branch is
// exercised regardless of what the host shell happens to export.
const { CDN_WRITE_PATH: _unused, ...envWithoutCdnPath } = process.env;

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-cleanup-cli-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('cleanup-orphans CLI', () => {
  it(
    'exits 1 and mentions CDN_WRITE_PATH when the env var is missing',
    async () => {
      expect.assertions(2);
      try {
        await execFileAsync(tsxBin, [scriptPath, '--dry-run'], { env: envWithoutCdnPath });
      } catch (err) {
        const e = err as { code?: number; stdout?: string; stderr?: string };
        expect(e.code).toBe(1);
        expect(`${e.stdout ?? ''}${e.stderr ?? ''}`).toContain('CDN_WRITE_PATH');
      }
    },
    CLI_TIMEOUT,
  );

  it(
    'dry-run lists an old file and leaves it on disk, exiting 0',
    async () => {
      const oldFile = join(dir, 'old.png');
      writeFileSync(oldFile, 'x');
      const oldMtime = new Date(Date.now() - 10 * DAY);
      utimesSync(oldFile, oldMtime, oldMtime);

      const { stdout } = await execFileAsync(tsxBin, [scriptPath, '--dry-run'], {
        env: { ...envWithoutCdnPath, CDN_WRITE_PATH: dir },
      });

      expect(stdout).toContain('old.png');
      expect(existsSync(oldFile)).toBe(true);
    },
    CLI_TIMEOUT,
  );
});
