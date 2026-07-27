// Tek komutla deploy: temiz build + .next ağacını FTPS ile sunucuya yükle.
//
// Sırlar YALNIZ .env.deploy'dan okunur — repoya girmez, log'a yazılmaz.
// Windows'ta uygulama çalışırken dosyalar KİLİTLİ olur: yüklemeden ÖNCE
// Plesk > Node.js > uygulamayı DURDUR, sonra BAŞLAT. Bu iki adım Plesk'in
// Node.js eklentisi REST API'sinde açık olmadığı için otomatikleştirilemedi.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ftp = require('basic-ftp');

const repoRoot = path.resolve(__dirname, '..');
const nextDir = path.join(repoRoot, 'apps', 'web', '.next');

function loadEnv() {
  const file = path.join(repoRoot, '.env.deploy');
  if (!fs.existsSync(file)) {
    console.error('\n.env.deploy bulunamadı.');
    console.error('Kopyala ve doldur:  cp .env.deploy.example .env.deploy\n');
    process.exit(1);
  }
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
    if (m) env[m[1]] = m[2];
  }
  for (const key of ['DEPLOY_FTP_HOST', 'DEPLOY_FTP_USER', 'DEPLOY_FTP_PASS', 'DEPLOY_FTP_REMOTE']) {
    if (!env[key]) {
      console.error(`\n.env.deploy içinde ${key} boş.\n`);
      process.exit(1);
    }
  }
  return env;
}

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: repoRoot });
  if (r.status !== 0) {
    console.error(`\nKomut başarısız: ${cmd} ${args.join(' ')}\n`);
    process.exit(r.status ?? 1);
  }
}

async function main() {
  const env = loadEnv();

  console.log('1/3  Temiz build...');
  run('npm', ['run', 'clean']);
  run('npm', ['run', 'build', '-w', 'apps/web']);

  const cacheDir = path.join(nextDir, 'cache');
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log('     .next/cache ayıklandı');
  }

  console.log('\n2/3  Sunucuya bağlanılıyor...');
  const client = new ftp.Client(30_000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: env.DEPLOY_FTP_HOST,
      user: env.DEPLOY_FTP_USER,
      password: env.DEPLOY_FTP_PASS,
      secure: env.DEPLOY_FTP_SECURE !== 'false',
      secureOptions: { rejectUnauthorized: false },
    });

    const remoteNext = `${env.DEPLOY_FTP_REMOTE.replace(/\/$/, '')}/.next`;
    console.log(`\n3/3  .next -> ${remoteNext}`);
    // Eski çıktıyı temizle: bayat chunk'lar "module not found" üretir.
    //
    // Hata YUTULMAZ. Uzak dizin yoksa (ilk deploy) sorun değil — FTP bunu
    // 550 ile bildirir. Başka bir hata ise neredeyse her zaman TEK bir şey
    // demektir: uygulama durdurulmadı ve Windows dosyaları kilitli. O durumda
    // devam etmek `.next`'i yarı silinmiş bırakır; sunucu eski ve yeni
    // chunk'ları karıştırıp "module not found" fırtınası verir ve sebep
    // görünmez olur (bu proje o hatayla saatler kaybetti). Yarım iş bırakmak
    // yerine hiç dokunmadan duruyoruz.
    try {
      await client.removeDir(remoteNext);
    } catch (err) {
      const code = err && err.code;
      const notFound = code === 550 || /no such file|not found|cannot find/i.test(String(err && err.message));
      if (!notFound) {
        console.error(`\nUzaktaki .next silinemedi (FTP ${code ?? '?'}): ${err && err.message}`);
        console.error(
          [
            '',
            'EN OLASI SEBEP: uygulama hâlâ ÇALIŞIYOR ve Windows dosyaları kilitli.',
            'Plesk > Node.js > uygulamayı DURDUR, sonra bu komutu tekrar çalıştır.',
            '',
            'Hiçbir dosya yüklenmedi — sunucudaki mevcut sürüm bozulmadan duruyor.',
            '',
          ].join('\n'),
        );
        process.exitCode = 1;
        return;
      }
    }
    await client.ensureDir(remoteNext);
    await client.clearWorkingDir();
    await client.uploadFromDir(nextDir, remoteNext);
    console.log('\nYükleme tamam.');
  } catch (err) {
    console.error(`\nFTP hatası: ${err && err.message ? err.message : err}`);
    console.error('Uygulama Plesk\'te DURDURULDU mu? Windows çalışırken dosyaları kilitler.');
    process.exitCode = 1;
  } finally {
    client.close();
  }

  console.log(
    [
      '',
      'Sunucuda yapılacak (elle, 2 adım):',
      '  1) Plesk > Node.js > Uygulamayı yeniden başlat',
      '  2) https://mailmyra.com/builder aç ve kontrol et',
      '',
      'Not: yüklemeden ÖNCE uygulamanın durdurulmuş olması gerekir.',
      '',
    ].join('\n'),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
