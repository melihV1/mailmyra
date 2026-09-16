// Pazarlama sitesini (mailmyra.com) sunucuya yükler.
//
// ⚠️ Bu script PANELİN deploy'u DEĞİL. Panel için `scripts/deploy.js` var ve
// hedefi `/app.mailmyra.com/apps/web`. Site ayrı bir depoda yaşıyor
// (`~/Desktop/mailmyra edit`, remote `mailmyra-site`) ve sunucudaki belge
// kökü `/site`. İkisi karıştırılırsa hiçbir şey yayına girmez.
//
// Neden var: 2026-09-16'da ortaya çıktı ki önceki turun dört ekran görüntüsü
// ve CSS'i commit edilmiş ama SUNUCUYA HİÇ ÇIKMAMIŞTI — canlıda üç görsel
// 404 veriyordu. Site deposunda deploy adımı yoktu, yükleme elle yapılıyordu.
// Bu script "commit ettim ama yüklemedim" tuzağını kapatır: en son neyin
// yüklendiğini sunucuda tutar ve aradaki farkı git'ten hesaplar.
//
// Sırlar YALNIZ .env.deploy'dan okunur — repoya girmez, log'a yazılmaz.

const fs = require('node:fs');
const path = require('node:path');
const posix = path.posix;
const { spawnSync } = require('node:child_process');
const ftp = require('basic-ftp');

const repoRoot = path.resolve(__dirname, '..');

// Site deposu bu monorepo'nun DIŞINDA. Yol değişirse env'den geçilebilir.
const SITE_DIR = process.env.DEPLOY_SITE_DIR
  || path.join(process.env.HOME || '', 'Desktop', 'mailmyra edit');
const SITE_REMOTE = process.env.DEPLOY_SITE_REMOTE || '/site';
const SITE_URL = process.env.DEPLOY_SITE_URL || 'https://mailmyra.com';

// Damga FTP kökünde durur, `/site`'ın DIŞINDA — belge kökünde olsaydı
// https://mailmyra.com/... adresinden herkese açık servis edilirdi.
const MARKER = process.env.DEPLOY_SITE_MARKER || '/.mailmyra-site-deploy.json';

// ─────────────────────────────────────────────────────────── saf yardımcılar
// (ağa dokunmazlar; scripts/deploy-site.test.js bunları sınar)

/** Sunucuya GİTMEYECEK izlenen dosyalar. */
function isDeployable(rel, { webConfig = false } = {}) {
  if (rel.startsWith('scripts/')) return false;      // jeneratörler sunucuda işe yaramaz
  if (rel.startsWith('.superpowers/')) return false;
  if (rel === 'README.md' || rel === '.gitignore') return false;
  if (path.basename(rel) === '.DS_Store') return false;
  // web.config sitenin tamamını 0 baytlık 500'e düşürebiliyor (2026-07-27'de
  // oldu) ve Plesk onu panel işlemlerinde kendi yeniden üretiyor — yani
  // sunucudaki hâli deponunkinden yeni olabilir. Bilerek istenmeden gitmez.
  if (rel === 'web.config') return webConfig;
  return true;
}

function remotePathFor(rel, remoteRoot = SITE_REMOTE) {
  return posix.join(remoteRoot, rel.split(path.sep).join('/'));
}

/** HTML'deki `main.css?v=<damga>` değerlerini toplar. */
function stampsIn(html) {
  return [...html.matchAll(/main\.css\?v=([^"']+)/g)].map((m) => m[1]);
}

/**
 * main.css değiştiyse EN AZ BİR sayfanın damgası da değişmeli.
 *
 * main.css `Cache-Control` taşımıyor (yalnız Last-Modified/ETag): sunucu yeni
 * dosyayı servis etse bile tarayıcı sezgisel önbellekle eskisini kullanmaya
 * devam ediyor. 2026-09-16'da ölçüldü — kurallar sunucudaydı, sayfa yine de
 * eski CSS ile çiziliyordu.
 */
function cssStampGuard({ cssChanged, stampsBefore, stampsAfter }) {
  if (!cssChanged) return { ok: true };
  const before = new Set(stampsBefore);
  const after = new Set(stampsAfter);
  const added = [...after].filter((s) => !before.has(s));
  if (added.length > 0) return { ok: true, added };
  return {
    ok: false,
    reason: 'assets/css/main.css değişti ama hiçbir sayfanın main.css?v= damgası '
      + 'değişmedi. Damga bump edilmezse dönen ziyaretçi eski CSS ile kalır.',
  };
}

/** git'ten gelen ham yol listesini yüklenecek/atlanacak diye ayırır. */
function buildPlan(changed, { webConfig = false, exists = () => true } = {}) {
  const upload = [];
  const skipped = [];
  const deleted = [];
  for (const rel of changed) {
    if (!isDeployable(rel, { webConfig })) { skipped.push(rel); continue; }
    if (!exists(rel)) { deleted.push(rel); continue; }
    upload.push(rel);
  }
  return { upload, skipped, deleted };
}

// ───────────────────────────────────────────────────────────────── git / env

function git(args, cwd = SITE_DIR) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(' ')} başarısız: ${(r.stderr || '').trim()}`);
  }
  return r.stdout;
}

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
  for (const key of ['DEPLOY_FTP_HOST', 'DEPLOY_FTP_USER', 'DEPLOY_FTP_PASS']) {
    if (!env[key]) {
      console.error(`\n.env.deploy içinde ${key} boş.\n`);
      process.exit(1);
    }
  }
  return env;
}

async function connect(env) {
  const client = new ftp.Client(30000);
  client.ftp.verbose = false;
  await client.access({
    host: env.DEPLOY_FTP_HOST,
    user: env.DEPLOY_FTP_USER,
    password: env.DEPLOY_FTP_PASS,
    secure: env.DEPLOY_FTP_SECURE !== 'false',
    secureOptions: { rejectUnauthorized: false },
  });
  return client;
}

async function readMarker(client) {
  const tmp = path.join(require('node:os').tmpdir(), `mm-marker-${process.pid}.json`);
  try {
    await client.downloadTo(tmp, MARKER);
    const parsed = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    return parsed && typeof parsed.sha === 'string' ? parsed : null;
  } catch {
    return null;
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

async function writeMarker(client, sha, count) {
  const tmp = path.join(require('node:os').tmpdir(), `mm-marker-${process.pid}.json`);
  // Saat sunucudan değil bizden: tek yazar var, karşılaştırma için yeterli.
  const body = JSON.stringify({ sha, at: new Date().toISOString(), files: count }, null, 2);
  fs.writeFileSync(tmp, body);
  try {
    await client.uploadFrom(tmp, MARKER);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// ────────────────────────────────────────────────────────────────── kipler

async function remoteSizes(client, rels) {
  const out = new Map();
  for (const rel of rels) {
    try {
      out.set(rel, await client.size(remotePathFor(rel)));
    } catch {
      out.set(rel, null); // sunucuda yok
    }
  }
  return out;
}

async function audit(client, { webConfig }) {
  const tracked = git(['ls-files']).split('\n').filter(Boolean)
    .filter((r) => isDeployable(r, { webConfig }));
  console.log(`${tracked.length} dosya denetleniyor (boyut karşılaştırması)…\n`);
  const sizes = await remoteSizes(client, tracked);
  const missing = [];
  const differing = [];
  for (const rel of tracked) {
    const local = fs.statSync(path.join(SITE_DIR, rel)).size;
    const remote = sizes.get(rel);
    if (remote === null) missing.push(rel);
    else if (remote !== local) differing.push({ rel, local, remote });
  }
  if (missing.length) {
    console.log(`SUNUCUDA YOK (${missing.length}):`);
    for (const r of missing) console.log(`  ${r}`);
  }
  if (differing.length) {
    console.log(`\nBOYUT FARKLI (${differing.length}):`);
    for (const d of differing) console.log(`  ${d.rel}  yerel=${d.local}  sunucu=${d.remote}`);
  }
  if (!missing.length && !differing.length) {
    console.log('Fark yok — izlenen her dosya sunucuda ve boyutları eşleşiyor.');
  } else {
    console.log('\n⚠️ Boyut eşitliği içerik eşitliği DEĞİLDİR; eşit boyutlu fark');
    console.log('   yakalanmaz. Kesin olan yön şu: yukarıdakiler kesinlikle farklı.');
  }
  return { missing, differing };
}

/**
 * FTP'de dosya doğru görünüp HTTP'de görünmemesi mümkün (yanlış klasör, yanlış
 * belge kökü, rewrite kuralı). Asıl kanıt bu adım: dosyayı ziyaretçinin
 * istediği adresten iste.
 *
 * Önce HEAD denenir — sunucu content-length veriyor, yani 2.8MB'lık main.css'i
 * doğrulamak için indirmeye gerek yok.
 *
 * 🔴 `accept-encoding: identity` ŞART. Varsayılan başlıkla IIS brotli ile
 * sıkıştırıyor ve content-length SIKIŞTIRILMIŞ boyutu bildiriyor: ölçüldü,
 * setup-apple-mail.html için 98324 yerine 15487. Üstelik her dosyada olmuyor
 * (sıkıştırma önbelleği soğuksa ham boyut dönüyor) — yani sessizce bazen
 * doğru bazen yanlış olan, en kötü cinsten bir kontrol olurdu. Sunucu yine
 * de sıkıştırırsa GET'e düşülür; orada fetch gövdeyi kendisi açıyor.
 */
async function verifyOverHttp(rels) {
  const problems = [];
  for (const rel of rels) {
    const url = `${SITE_URL}/${rel.split(path.sep).join('/')}`;
    const localSize = fs.statSync(path.join(SITE_DIR, rel)).size;
    let res;
    try {
      res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'accept-encoding': 'identity' },
      });
    } catch (e) {
      problems.push(`${rel}: istek başarısız (${e.message})`);
      continue;
    }
    if (!res.ok) { problems.push(`${rel}: HTTP ${res.status}`); continue; }
    const encoded = (res.headers.get('content-encoding') || 'identity') !== 'identity';
    const header = res.headers.get('content-length');
    let liveSize = encoded || header === null ? null : Number(header);
    if (liveSize === null || Number.isNaN(liveSize)) {
      const get = await fetch(url, { redirect: 'follow' });
      if (!get.ok) { problems.push(`${rel}: HTTP ${get.status}`); continue; }
      liveSize = Buffer.from(await get.arrayBuffer()).length;
    }
    if (liveSize !== localSize) {
      problems.push(`${rel}: canlı ${liveSize} bayt, yerel ${localSize} bayt`);
    }
  }
  return problems;
}

async function upload(client, rels, { dryRun }) {
  if (dryRun) {
    for (const rel of rels) console.log(`  [kuru] ${rel}`);
    return;
  }
  const dirs = [...new Set(rels.map((r) => posix.dirname(remotePathFor(r))))];
  for (const dir of dirs) {
    await client.ensureDir(dir);
    await client.cd('/');
  }
  for (const rel of rels) {
    const local = path.join(SITE_DIR, rel);
    const remote = remotePathFor(rel);
    const localSize = fs.statSync(local).size;
    await client.uploadFrom(local, remote);
    const after = await client.size(remote);
    if (after !== localSize) {
      throw new Error(`${rel}: yükleme sonrası boyut ${after}, beklenen ${localSize}`);
    }
    console.log(`  OK  ${rel}  (${localSize} bayt)`);
  }
}

// ───────────────────────────────────────────────────────────────────── main

function parseArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const fileIdx = argv.indexOf('--files');
  const files = fileIdx === -1 ? null
    : argv.slice(fileIdx + 1).filter((a) => !a.startsWith('--'));
  const seedIdx = argv.indexOf('--seed-marker');
  const seed = seedIdx === -1 ? null : argv[seedIdx + 1];
  return {
    audit: flags.has('--audit'),
    all: flags.has('--all'),
    dryRun: flags.has('--dry-run'),
    allowDirty: flags.has('--allow-dirty'),
    webConfig: flags.has('--with-web-config'),
    skipStampCheck: flags.has('--skip-stamp-check'),
    noVerify: flags.has('--no-verify'),
    files,
    seed,
  };
}

const USAGE = `
Pazarlama sitesini (${SITE_URL}) sunucudaki ${SITE_REMOTE} köküne yükler.

  npm run deploy:site                    damgadan HEAD'e olan farkı yükle
  npm run deploy:site -- --audit         hiçbir şey yükleme, sapmayı ölç
  npm run deploy:site -- --all           izlenen her dosyayı yükle
  npm run deploy:site -- --files a b     yalnız bu dosyaları yükle
  npm run deploy:site -- --seed-marker <sha>   damgayı elle kur

Bayraklar:
  --dry-run            planı yaz, hiçbir şey yazma
  --allow-dirty        commit edilmemiş değişiklikle de yükle
  --with-web-config    web.config'i de gönder (VARSAYILAN: gönderilmez)
  --skip-stamp-check   main.css damga bekçisini atla
  --no-verify          yükleme sonrası canlı kontrolünü atla

Damga sunucuda ${MARKER} dosyasında durur — belge kökünün DIŞINDA, yani
kimse HTTP ile okuyamaz. Damga yalnız bu script'in yaptığı yüklemeleri
bilir; elle FTP yapıldıysa yalan söyler. Şüphelendiğinde --audit koş,
o damgaya hiç bakmaz.
`;

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(USAGE);
    return;
  }

  if (!fs.existsSync(path.join(SITE_DIR, '.git'))) {
    console.error(`\nSite deposu bulunamadı: ${SITE_DIR}`);
    console.error('DEPLOY_SITE_DIR ile başka bir yol verebilirsin.\n');
    process.exit(1);
  }

  const head = git(['rev-parse', 'HEAD']).trim();
  const dirty = git(['status', '--porcelain']).trim();
  if (dirty && !opts.allowDirty && !opts.audit) {
    console.error('\nSite deposunda commit edilmemiş değişiklik var:\n');
    console.error(dirty);
    console.error('\nÖnce commit et (damga HEAD\'i işaret eder, yoksa yalan söyler),');
    console.error('ya da bilerek yüklüyorsan --allow-dirty geç.\n');
    process.exit(1);
  }

  const env = loadEnv();
  const client = await connect(env);
  try {
    console.log(`site   : ${SITE_DIR}`);
    console.log(`hedef  : ${env.DEPLOY_FTP_HOST}${SITE_REMOTE}`);
    console.log(`HEAD   : ${head.slice(0, 7)}\n`);

    if (opts.audit) { await audit(client, opts); return; }

    if (opts.seed) {
      const sha = git(['rev-parse', opts.seed]).trim();
      await writeMarker(client, sha, 0);
      console.log(`Damga ${sha.slice(0, 7)} olarak yazıldı. Bundan sonraki fark buradan hesaplanır.`);
      return;
    }

    const marker = await readMarker(client);
    let changed;
    if (opts.files) {
      changed = opts.files;
    } else if (opts.all) {
      changed = git(['ls-files']).split('\n').filter(Boolean);
    } else if (!marker) {
      console.error('Sunucuda deploy damgası yok — neyin yüklü olduğu bilinmiyor.');
      console.error('Önce  --audit  ile farkı gör, sonra  --all  ile hepsini yükle');
      console.error('veya  --seed-marker <sha>  ile damgayı elle kur.\n');
      process.exit(1);
    } else {
      // git, damgadaki commit'i tanımıyorsa (rebase, başka makine) diff yalan olur.
      const known = spawnSync('git', ['cat-file', '-e', `${marker.sha}^{commit}`],
        { cwd: SITE_DIR }).status === 0;
      if (!known) {
        console.error(`Damgadaki commit bu depoda yok: ${marker.sha.slice(0, 7)}`);
        console.error('--audit ile bak, sonra --all veya --seed-marker kullan.\n');
        process.exit(1);
      }
      console.log(`damga  : ${marker.sha.slice(0, 7)}  (${marker.at || 'tarihsiz'})`);
      if (marker.sha === head) {
        console.log('\nDeğişiklik yok — sunucu HEAD ile aynı commit\'te.');
        return;
      }
      changed = git(['diff', '--name-only', marker.sha, head]).split('\n').filter(Boolean);
    }

    const plan = buildPlan(changed, {
      webConfig: opts.webConfig,
      exists: (rel) => fs.existsSync(path.join(SITE_DIR, rel)),
    });

    if (plan.skipped.length) {
      console.log(`\nAtlandı (sunucuya gitmez): ${plan.skipped.join(', ')}`);
    }
    if (plan.deleted.length) {
      console.log(`\n⚠️ Depodan SİLİNMİŞ ama sunucuda duruyor olabilir:`);
      for (const r of plan.deleted) console.log(`   ${r}`);
      console.log('   Bu script uzaktan dosya SİLMEZ — gerekiyorsa elle temizle.');
    }
    if (!plan.upload.length) {
      console.log('\nYüklenecek dosya yok.');
      return;
    }

    if (!opts.skipStampCheck && marker) {
      const cssChanged = plan.upload.includes('assets/css/main.css');
      const htmls = git(['ls-files', '*.html']).split('\n').filter(Boolean);
      const collect = (ref) => htmls.flatMap((f) => {
        const r = spawnSync('git', ['show', `${ref}:${f}`], { cwd: SITE_DIR, encoding: 'utf8', maxBuffer: 1 << 28 });
        return r.status === 0 ? stampsIn(r.stdout) : [];
      });
      const guard = cssStampGuard({
        cssChanged,
        stampsBefore: cssChanged ? collect(marker.sha) : [],
        stampsAfter: cssChanged ? collect(head) : [],
      });
      if (!guard.ok) {
        console.error(`\n${guard.reason}`);
        console.error('Bilerek yapıyorsan --skip-stamp-check geç.\n');
        process.exit(1);
      }
      if (guard.added) console.log(`\nyeni CSS damgası: ${guard.added.join(', ')}`);
    }

    console.log(`\nYüklenecek ${plan.upload.length} dosya:`);
    await upload(client, plan.upload, opts);

    if (opts.dryRun) { console.log('\nKuru koşu — hiçbir şey yazılmadı.'); return; }

    if (!opts.noVerify) {
      console.log('\nCanlıdan doğrulanıyor…');
      const problems = await verifyOverHttp(plan.upload);
      if (problems.length) {
        console.error('\n⚠️ CANLI DOĞRULAMA BAŞARISIZ:');
        for (const p of problems) console.error(`   ${p}`);
        console.error('\nDamga GÜNCELLENMEDİ — sorun çözülünce yeniden koştur.\n');
        process.exit(1);
      }
      console.log(`  ${plan.upload.length} dosyanın ${plan.upload.length}'i canlıda ve boyutu eşleşiyor.`);
    }

    await writeMarker(client, head, plan.upload.length);
    console.log(`\nTAMAM — damga ${head.slice(0, 7)}.`);
  } finally {
    client.close();
  }
}

module.exports = { isDeployable, remotePathFor, stampsIn, cssStampGuard, buildPlan, parseArgs };

if (require.main === module) {
  main().catch((e) => { console.error(`\nHATA: ${e.message}\n`); process.exit(1); });
}
