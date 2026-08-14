/**
 * Vuexy core.css'ini Mailmyra paletine boyar ve panelin beklediği yere yazar.
 *
 * Neden script: tema dosyası REPODA DURMAZ (lisans — CLAUDE.md §Stack "PANEL
 * TEMASI"). Kaynak CSS Hüseyin'in makinesindeki kopyadan (şimdilik demo
 * aynası, satın alınınca lisanslı paket) okunur, renkleri değiştirilir,
 * `apps/web/public/vuexy/` altına (gitignore'lu) yazılır. Aynı script iki
 * kaynakta da çalışır — satın alma sonrası tek fark --src yolu.
 *
 * Kullanım:
 *   node scripts/vuexy-recolor.mjs
 *   node scripts/vuexy-recolor.mjs --src /yol/vuexy-html/assets
 *
 * `--src` temanın `assets` KÖKÜNÜ ister (altında vendor/css/core.css ve
 * vendor/fonts/iconify-icons.css arar).
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SRC = join(
  process.env.HOME ?? '',
  'Desktop/demos.pixinvent.com/vuexy-html-admin-template/assets',
);
const OUT_DIR = join(ROOT, 'apps/web/public/vuexy');

const srcFlag = process.argv.indexOf('--src');
const SRC = srcFlag !== -1 ? process.argv[srcFlag + 1] : DEFAULT_SRC;
if (!SRC) {
  console.error('--src bir yol istiyor');
  process.exit(1);
}

/**
 * Vuexy moru → Mailmyra mavisi. Sol sütun temanın v3.0.0 core.css'indeki
 * literal; sağ sütun bizim palet (packages/renderer/src/brand.ts +
 * apps/web/app/tokens.css). Tema sürümü değişir de eşleşme bulunamazsa
 * script HATA verir — sessizce mor bir panel üretmez.
 */
const MAP = [
  // ana renk (#7367f0) ve rgb üçlüsü → brand.strong (beyaz metin AA taşır)
  [/#7367f0/gi, '#2f66c8'],
  [/115, 103, 240/g, '47, 102, 200'],
  [/115,103,240/g, '47,102,200'],
  // hover/active koyu tonu
  [/#685dd8/gi, '#295ab0'],
  // açık tema pastel yüzeyleri (bg-subtle / border-subtle / text-emphasis)
  [/#e9e7fd/gi, '#e6edf8'],
  [/#c8c4f9/gi, '#c1d1ef'],
  [/#2e2960/gi, '#132950'],
  // koyu tema karşılıkları — text-emphasis brand.primary'nin kendisi
  [/#aba4f6/gi, '#7b9fd3'],
  [/#3a3b64/gi, '#283b66'],
  [/#4a478a/gi, '#2a467f'],
];

const coreSrc = join(SRC, 'vendor/css/core.css');
let css = readFileSync(coreSrc, 'utf8');

if (!/--bs-primary:\s*#7367f0/i.test(css)) {
  console.error(
    `Beklenen '--bs-primary: #7367f0' bulunamadı: ${coreSrc}\n` +
      'Tema sürümü değişmiş olabilir — MAP tablosu yeni literallere göre güncellenmeli.',
  );
  process.exit(1);
}

let total = 0;
for (const [re, to] of MAP) {
  const n = (css.match(re) ?? []).length;
  total += n;
  css = css.replace(re, to);
}

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, 'core.css'),
  `/* Vuexy core.css — Mailmyra paletine boyanmış kopya (scripts/vuexy-recolor.mjs).\n` +
    `   ELLE DÜZENLEME — kaynaktan yeniden üret. Lisans: Pixinvent/ThemeForest;\n` +
    `   bu dosya repoya girmez, canlıya satın alınmış paketten üretilen gider. */\n` +
    css,
);
// İkon CSS'i self-contained (SVG data-URI) — olduğu gibi kopyalanır.
copyFileSync(join(SRC, 'vendor/fonts/iconify-icons.css'), join(OUT_DIR, 'icons.css'));
// demo.css temanın yerleşim tutkalı (sabit navbar boşlukları) — ufak, aynen.
copyFileSync(join(SRC, 'css/demo.css'), join(OUT_DIR, 'layout.css'));
// Auth kart sayfalarının düzeni (authentication-wrapper vb.) — boyanarak.
let authCss = readFileSync(join(SRC, 'vendor/css/pages/page-auth.css'), 'utf8');
for (const [re, to] of MAP) authCss = authCss.replace(re, to);
writeFileSync(join(OUT_DIR, 'page-auth.css'), authCss);

console.log(`core.css boyandı (${total} renk değişimi) + icons.css ve layout.css kopyalandı → ${OUT_DIR}`);
