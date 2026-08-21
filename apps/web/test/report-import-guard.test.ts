import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Devir sözleşmesi: rapor veri katmanı (`lib/reports/`) personel kapısız —
 * bilinçli olarak yalnız CLI/çalıştırıcı kullanır (scripts/run-reports.ts).
 * Bu test o cümleyi kalıcı kılar — `app/` altındaki HİÇBİR rota dosyası
 * `lib/reports`'tan import edemez. Yarın biri "panelde göstereyim" diye
 * bir route'a bağlarsa kapı bypass olur ve burada kırılır.
 */
const APP_ROOT = join(__dirname, '..', 'app');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('app/ rotaları lib/reports import etmez', () => {
  const files = walk(APP_ROOT);

  it('taranan dosya listesi boş değil (test kendini kandırmasın)', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  for (const file of files) {
    it(`lib/reports importu yok: ${file.split('/app')[1]}`, () => {
      const src = readFileSync(file, 'utf8');
      expect(src).not.toMatch(/from\s+['"](?:[^'"]*\/)?lib\/reports(?:\/[^'"]*)?['"]/);
    });
  }
});
