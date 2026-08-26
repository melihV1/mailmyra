import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtures, renderSignature, TEMPLATE_IDS } from '../src/index';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../out');
mkdirSync(outDir, { recursive: true });

function wrapDoc(fragment: string): string {
  return `<!doctype html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${fragment}\n</body>\n</html>\n`;
}

// Kayıtlı her şablon için her fixture'dan bir .htm üretilir — sabit
// 'classic-horizontal' YERİNE motor kayıt defterinden (TEMPLATE_IDS) döner,
// yeni şablon eklendiğinde bu script değişmeden kapsar.
for (const templateId of TEMPLATE_IDS) {
  for (const fx of fixtures) {
    // .htm çıktıları GERÇEK CDN ikon URL'leriyle üretilir (spec §4) — test
    // öncesi ikonların cdn.mailmyra.com'a yüklenmesi deploy adımıdır (aşağıda).
    const html = renderSignature(fx.data, templateId, {
      iconBaseUrl: 'https://cdn.mailmyra.com',
    });
    const file = resolve(outDir, `${templateId}--${fx.id}.htm`);
    writeFileSync(file, wrapDoc(html), 'utf8');
    console.log('wrote', file);
  }
}
