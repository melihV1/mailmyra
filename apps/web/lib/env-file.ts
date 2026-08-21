import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * CLI script'leri için .env yükleyici. Next sunucusu app kökündeki
 * .env / .env.production / .env.local dosyalarını açılışta KENDİSİ okur;
 * Plesk'in "Komut dosyası çalıştır" bağlamı okumaz (yaşandı, 2026-08-21:
 * canlıda `run reports` DATABASE_URL bulamadı — değer .env.local'daydı).
 *
 * Gerçek ortam değişkeni HER ZAMAN kazanır; dosyalar yalnız boşluğu
 * doldurur. Dosya önceliği Next ile aynı: .env < .env.production < .env.local.
 * Değer ilk `=`ten sonrasının tamamıdır (bağlantı dizeleri `=` içerir).
 */
export function loadEnvFiles(dir: string = process.cwd()): void {
  const fromFiles: Record<string, string> = {};
  for (const name of ['.env', '.env.production', '.env.local']) {
    let raw: string;
    try {
      raw = readFileSync(join(dir, name), 'utf8');
    } catch {
      continue; // dosya yoksa sorun değil
    }
    for (const line of raw.split('\n')) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      let value = (m[2] ?? '').trim();
      const quote = value.charAt(0);
      if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length >= 2) {
        value = value.slice(1, -1);
      }
      fromFiles[m[1] ?? ''] = value;
    }
  }
  for (const [key, value] of Object.entries(fromFiles)) {
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
