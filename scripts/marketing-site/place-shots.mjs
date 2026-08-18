/**
 * Kurulum rehberlerindeki `<figure class="mm-sg-shot" data-shot="X.png">`
 * yer tutucularını gerçek `<img>` ile değiştirir.
 *
 * Eşleştirme TAHMİN DEĞİL: `data-shot` hangi dosyanın oraya geleceğini
 * zaten söylüyor. Dosya yoksa o figure'a DOKUNULMAZ — kalan kareler
 * geldikçe script tekrar koşulur, yerleşenler olduğu gibi kalır.
 *
 * `width`/`height` dosyanın GERÇEK piksel boyutundan okunur (PNG başlığı).
 * Tarayıcı bu ikisinden en-boy oranını hesaplayıp yer ayırıyor; yazılmazsa
 * görseller yüklendikçe sayfa zıplar.
 *
 * Kullanım: node place-shots.mjs [--dry]
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const SITE = '/Users/mmacstudio/Desktop/mailmyra edit';
const SHOTS_DIR = path.join(SITE, 'assets/img/setup');
const SHOTS_HREF = 'assets/img/setup';
const DRY = process.argv.includes('--dry');

const PAGES = [
  'setup-outlook-classic.html',
  'setup-new-outlook.html',
  'setup-gmail.html',
  'setup-apple-mail.html',
  'setup-ios-mail.html',
];

/** Adım adına göre alt metni. "Screenshot" DEMEZ — ekran okuyucuya ve
 *  arama motoruna ne gösterdiğini anlatır. */
const ALT = {
  'step-01': 'The Mailmyra builder with a finished signature and the Copy signature button',
  'step-02': 'The signature settings screen of the mail client',
  'step-03': 'Creating a new signature and pasting it in',
  'step-04': 'Choosing the signature as the default for new messages',
  'step-05': 'A new message showing the signature before sending',
  'result': 'A received message with the signature rendered correctly',
};

function altFor(shot) {
  const key = Object.keys(ALT).find((k) => shot.includes(k));
  return ALT[key] ?? 'Setup step screenshot';
}

/** PNG başlığından genişlik/yükseklik. IHDR her zaman ilk chunk. */
function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const available = new Set(
  (await readdir(SHOTS_DIR).catch(() => [])).filter((f) => f.endsWith('.png')),
);

let placed = 0;
let waiting = 0;
const missingReport = [];

for (const page of PAGES) {
  const file = path.join(SITE, page);
  let html = await readFile(file, 'utf8');
  let touched = 0;

  const figure = /<figure class="mm-sg-shot([^"]*)" data-shot="([^"]+)">[\s\S]*?<\/figure>/g;
  const next = [];
  let m;
  while ((m = figure.exec(html)) !== null) next.push(m);

  // Sondan başa: replace ederken önceki eşleşmelerin indeksleri kaymasın.
  for (const match of next.reverse()) {
    const [whole, extraClass, shot] = match;
    if (!available.has(shot)) {
      waiting++;
      missingReport.push(`${page}: ${shot}`);
      continue;
    }
    const buf = await readFile(path.join(SHOTS_DIR, shot));
    const size = pngSize(buf);
    if (!size) throw new Error(`PNG okunamadı: ${shot}`);

    const img =
      `<figure class="mm-sg-shot${extraClass}" data-shot="${shot}">` +
      `<img src="${SHOTS_HREF}/${shot}" alt="${altFor(shot)}"` +
      ` width="${size.width}" height="${size.height}" loading="lazy" decoding="async">` +
      `</figure>`;

    html = html.slice(0, match.index) + img + html.slice(match.index + whole.length);
    touched++;
    placed++;
  }

  if (touched && !DRY) await writeFile(file, html);
  if (touched) console.log(`${page}: ${touched} görsel yerleşti`);
}

console.log(`\nyerleşen: ${placed} · bekleyen: ${waiting}${DRY ? '  (KURU KOŞU)' : ''}`);
if (missingReport.length) {
  console.log('\nHenüz gelmeyen kareler:');
  for (const line of missingReport) console.log('  ' + line);
}
