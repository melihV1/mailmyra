/**
 * Sayfa içi linkleri uzantısız adrese çevirir: `href="pricing.html"` ->
 * `href="/pricing"`, `href="index.html"` -> `href="/"`.
 *
 * ⚠️ ÖNCE `web.config`in CANLIDA YÜKLENDİĞİNİ DOĞRULA, sonra koştur.
 *
 * Sebep: `.html` linkler her iki durumda da çalışır — web.config yüklenirse
 * 301 ile temiz adrese giderler, Plesk config'i reddederse dosya doğrudan
 * servis edilir. Temiz adres ise YALNIZ config yüklüyse çalışır. Yani bu
 * script çalıştırıldıktan sonra config reddedilirse sitenin her linki 404
 * olur. Doğrulama sırası: web.config'i tek başına yükle -> `/pricing` 200
 * dönüyor mu bak -> bu script -> içerik yükle.
 *
 * Geri almak: `--revert` ile ters çevirir.
 *
 * Kullanım:
 *   node clean-urls.mjs --dry        # ne değişecek, yazmadan
 *   node clean-urls.mjs
 *   node clean-urls.mjs --revert
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const SITE = '/Users/mmacstudio/Desktop/mailmyra edit';
const DRY = process.argv.includes('--dry');
const REVERT = process.argv.includes('--revert');

const pages = (await readdir(SITE)).filter((f) => f.endsWith('.html'));

let total = 0;
for (const page of pages) {
  const file = path.join(SITE, page);
  let html = await readFile(file, 'utf8');
  const before = html;

  if (REVERT) {
    html = html.replace(/href="\/"/g, 'href="index.html"');
    // `/pricing` -> `pricing.html`. Mutlak adreslere (//, http) dokunma.
    html = html.replace(/href="\/([a-z0-9][a-z0-9-]*)"/g, 'href="$1.html"');
  } else {
    html = html.replace(/href="index\.html"/g, 'href="/"');
    /* Yalnız aynı klasördeki sayfalar: `href="pricing.html"`.
       `https://…` ve `assets/…` kalıba uymuyor, dokunulmuyor. */
    html = html.replace(/href="([a-z0-9][a-z0-9-]*)\.html"/g, 'href="/$1"');
  }

  if (html !== before) {
    const changed = before.split('href="').length - 1 - (html.split('href="').length - 1) === 0
      ? countDiff(before, html)
      : countDiff(before, html);
    total += changed;
    console.log(`  ${page}: ${changed} link`);
    if (!DRY) await writeFile(file, html);
  }
}

function countDiff(a, b) {
  const ra = a.match(/href="[^"]*"/g) ?? [];
  const rb = b.match(/href="[^"]*"/g) ?? [];
  let n = 0;
  for (let i = 0; i < Math.min(ra.length, rb.length); i++) if (ra[i] !== rb[i]) n++;
  return n;
}

console.log(
  `\ntoplam ${total} link ${REVERT ? 'uzantılıya geri çevrildi' : 'temiz adrese çevrildi'}` +
  `${DRY ? '  (KURU KOŞU — yazılmadı)' : ''}`,
);
