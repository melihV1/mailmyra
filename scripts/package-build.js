// Build'i BU makinede al, sunucuya hazır çıktı gönder — `npm run package`
//
// Windows sunucuda `next build` patlıyorsa (Plesk + panel-only ortamda teşhisi
// pahalı bir prerender sorunu) build'i burada alıp yalnızca çıktıyı taşımak
// işi açar. Sunucuda derleme YAPILMAZ, sadece çalıştırılır.
//
// Üretilen dosya: deploy-next.zip  (içinde apps/web/.next)
//
// Sunucuda:
//   1) Plesk > Node.js > uygulamayı DURDUR
//   2) apps/web/.next klasörünü SİL (npm run clean)
//   3) deploy-next.zip'i apps/web içine yükle ve AÇ (.next oluşmalı)
//   4) npm ci        (Windows'a ait node_modules — sharp binary'si için şart)
//   5) uygulamayı BAŞLAT
//
// UYARI: Next derleme çıktısının platformlar arası taşınabilirliği resmî
// olarak garanti edilmez. Saf JS kısmı taşınır (yerelde doğrulandı), native
// bağımlılık olan `sharp` ise sunucuda `npm ci` ile Windows sürümünden kurulur
// — bu yüzden node_modules ASLA taşınmaz, yalnızca .next taşınır.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const webRoot = path.join(repoRoot, 'apps', 'web');
const nextDir = path.join(webRoot, '.next');
const zipPath = path.join(repoRoot, 'deploy-next.zip');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: repoRoot, ...opts });
  if (r.status !== 0) {
    console.error(`\nKomut başarısız: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

console.log('1/3  Build alınıyor...');
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build', '-w', 'apps/web']);

if (!fs.existsSync(nextDir)) {
  console.error('\n.next bulunamadı — build çıktı üretmemiş.');
  process.exit(1);
}

console.log('\n2/3  Gereksiz dosyalar ayıklanıyor...');
// `cache` yalnızca artımlı build içindir, sunucuda çalışması için gerekmez ve
// arşivi gereksiz büyütür.
const cacheDir = path.join(nextDir, 'cache');
if (fs.existsSync(cacheDir)) {
  fs.rmSync(cacheDir, { recursive: true, force: true });
  console.log('     .next/cache silindi');
}

console.log('\n3/3  Arşiv oluşturuluyor...');
fs.rmSync(zipPath, { force: true });
if (process.platform === 'win32') {
  run('powershell', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${nextDir}' -DestinationPath '${zipPath}'`,
  ]);
} else {
  // -r özyineli, -q sessiz; .next'i apps/web köküne göreli tutar
  run('zip', ['-rq', zipPath, '.next'], { cwd: webRoot });
}

const sizeMb = (fs.statSync(zipPath).size / (1024 * 1024)).toFixed(1);
console.log(
  [
    '',
    `HAZIR: ${zipPath}  (${sizeMb} MB)`,
    '',
    'Sunucuda sırayla:',
    '  1) Plesk > Node.js > uygulamayı DURDUR',
    '  2) npm run clean            (eski .next silinir)',
    '  3) deploy-next.zip -> apps/web içine yükle ve AÇ',
    '  4) npm ci                   (Windows node_modules; sharp için şart)',
    '  5) uygulamayı BAŞLAT',
    '',
    'Not: sunucuda `npm run build` ÇALIŞTIRMA — çıktı zaten hazır.',
    '',
  ].join('\n'),
);
