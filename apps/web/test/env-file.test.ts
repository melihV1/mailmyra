import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { loadEnvFiles } from '../lib/env-file';

/**
 * CLI env yükleyicisinin sözleşmesi: gerçek ortam değişkeni her zaman
 * kazanır, dosya önceliği Next sırasıdır, değer ilk `=`ten sonrasının
 * tamamıdır (DATABASE_URL gibi bağlantı dizeleri `=` içerir).
 */

const KEYS = ['MM_TEST_A', 'MM_TEST_B', 'MM_TEST_URL'] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
});

function dirWith(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'mm-envfile-'));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

describe('loadEnvFiles', () => {
  it('loads values and keeps everything after the first equals sign', () => {
    const dir = dirWith({ '.env': 'MM_TEST_URL=mysql://u:p@h:3306/db?ssl=true&x=1\n' });
    loadEnvFiles(dir);
    expect(process.env.MM_TEST_URL).toBe('mysql://u:p@h:3306/db?ssl=true&x=1');
  });

  it('later files win: .env.local overrides .env', () => {
    const dir = dirWith({ '.env': 'MM_TEST_A=base\n', '.env.local': 'MM_TEST_A=local\n' });
    loadEnvFiles(dir);
    expect(process.env.MM_TEST_A).toBe('local');
  });

  it('a real environment variable is never overridden', () => {
    process.env.MM_TEST_B = 'gercek';
    const dir = dirWith({ '.env.local': 'MM_TEST_B=dosya\n' });
    loadEnvFiles(dir);
    expect(process.env.MM_TEST_B).toBe('gercek');
  });

  it('strips matching surrounding quotes', () => {
    const dir = dirWith({ '.env': 'MM_TEST_A="hello world"\n' });
    loadEnvFiles(dir);
    expect(process.env.MM_TEST_A).toBe('hello world');
  });

  it('ignores comments and blank lines, tolerates missing files', () => {
    const dir = dirWith({ '.env.local': '# yorum\n\nMM_TEST_A=ok\n' });
    loadEnvFiles(dir); // .env ve .env.production yok — sorun değil
    expect(process.env.MM_TEST_A).toBe('ok');
  });
});
