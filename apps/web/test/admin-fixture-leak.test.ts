import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Devir sözleşmesi: "Preview fixture'lar hiçbir production rotasında
 * görünmez." Bu test o cümleyi kalıcı kılar — `app/(admin)` altındaki
 * HİÇBİR kaynak dosya dev önizleme ağacından ya da bir fixtures
 * modülünden import edemez. Yarın biri "hızlıca fixture'ı bağlayayım"
 * derse burada kırılır.
 */
const ADMIN_ROOT = join(__dirname, '..', 'app', '(admin)');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('üretim admin rotaları fixture içermez', () => {
  const files = walk(ADMIN_ROOT);

  it('taranan dosya listesi boş değil (test kendini kandırmasın)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    it(`fixture importu yok: ${file.split('(admin)')[1]}`, () => {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/from\s+['"][^'"]*admin-preview/);
      expect(src).not.toMatch(/from\s+['"][^'"]*-fixtures['"]/);
    });
  }
});
