// Panel dostu temizlik — shell komutu (rm/del) GEREKTİRMEZ.
// Plesk gibi yalnızca "npm run <script>" çalıştırılabilen ortamlar için.
//
//   npm run clean       -> yalnız build çıktıları (.next, tsbuildinfo)
//   npm run clean:all    -> yukarıdakiler + TÜM node_modules klasörleri
//
// clean:all sonrası mutlaka `npm ci` çalıştır.
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const withModules = process.argv.includes('--all');

const targets = [
  'apps/web/.next',
  'apps/web/tsconfig.tsbuildinfo',
  'packages/renderer/tsconfig.tsbuildinfo',
];

if (withModules) {
  // Kök EN SONA: önce workspace kopyaları silinsin, yoksa kök silinince
  // bu script'in kendi require'ları etkilenmez ama sıra yine de anlaşılır olsun.
  targets.push('apps/web/node_modules', 'packages/renderer/node_modules', 'node_modules');
}

let removed = 0;
for (const rel of targets) {
  const full = path.join(repoRoot, rel);
  if (!fs.existsSync(full)) {
    console.log(`atlandı (yok)   ${rel}`);
    continue;
  }
  try {
    fs.rmSync(full, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
    console.log(`silindi         ${rel}`);
    removed += 1;
  } catch (err) {
    // Windows'ta dosya kilidi en sık sebep: çalışan bir node/next süreci.
    console.error(`SİLİNEMEDİ      ${rel}`);
    console.error(`  ${err.code ?? ''} ${err.message}`);
    console.error('  Windows ise: uygulamayı (Plesk > Node.js > Restart/Stop) durdurup tekrar dene.');
    process.exitCode = 1;
  }
}

console.log(`\n${removed} hedef silindi.`);
if (withModules) console.log('Sıradaki adım: npm ci');
