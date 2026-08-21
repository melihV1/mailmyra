import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync, utimesSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);

const CLI_TIMEOUT = 20_000;
const DAY = 24 * 60 * 60 * 1000;

const webRoot = process.cwd();
// tsx'in CLI girişi Node'un modül çözümlemesiyle bulunur, sabit bir
// `node_modules/.bin` YOLU VARSAYILMAZ: npm workspaces bin'leri KÖK
// node_modules'e hoist eder, pnpm ise her workspace'e kendi .bin'ini verirdi.
// Yola bağlanmak, paket yöneticisi değişince testi ENOENT ile kırar (2026-07-25
// npm göçünde bu gerçekten oldu). `tsx/cli` her iki yerleşimde de çözümlenir.
const require = createRequire(import.meta.url);
const tsxCli = require.resolve('tsx/cli');
const scriptPath = join(webRoot, 'scripts', 'cleanup-orphans.ts');

/**
 * CLI'yı çalışan Node ile başlat (tsx CLI'sı argüman olarak geçilir).
 * `cwd` boş bir temp dizin OLMALI: script artık cwd'deki .env dosyalarını
 * kendisi yükler (loadEnvFiles, 2026-08-21) — app kökünden koşturulsa
 * .env.local eksik-değişken dalını gölgeler.
 */
function runCli(args: string[], env: NodeJS.ProcessEnv, cwd: string) {
  return execFileAsync(process.execPath, [tsxCli, ...args], { env, cwd });
}

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
        await runCli([scriptPath, '--dry-run'], envWithoutCdnPath, dir);
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

      const { stdout } = await runCli(
        [scriptPath, '--dry-run'],
        { ...envWithoutCdnPath, CDN_WRITE_PATH: dir },
        dir,
      );

      expect(stdout).toContain('old.png');
      expect(existsSync(oldFile)).toBe(true);
    },
    CLI_TIMEOUT,
  );
});
