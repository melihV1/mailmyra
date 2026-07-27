// React TEK ÖRNEK mi? — build'in İLK adımı olarak çalışır.
//
// İki farklı React kopyası yüklenirse react-dom'un dispatcher'ı null kalır ve
// `next build` şununla ölür:
//
//   TypeError: Cannot read properties of null (reading 'useContext')
//   Error occurred prerendering page "/404"
//
// Kopyalar AYNI sürüm olsa bile olur — sorun sürüm farkı değil, iki ayrı modül
// örneği. Hata mesajı sebebi hiç ima etmez, bu yüzden burada erkenden durup
// TÜM kopyaların yolunu yazıyoruz.
//
// ÖNEMLİ: bu dosya `build` script'inin İÇİNDEN çağrılır (`prebuild` olarak
// DEĞİL). Sebep: Plesk gibi paneller npm'i `--ignore-scripts` ile çalıştırır ve
// o modda pre/post lifecycle script'leri SESSİZCE atlanır — koruma tam ihtiyaç
// duyulduğu anda devre dışı kalırdı (2026-07-25'te tam olarak bu oldu).
//
// Ayrıca bir webpack `resolve.alias` ile ÇÖZÜLEMEZ: Next, react/react-dom'u
// sunucu build'inde external bırakır, prerender worker'ı onları çalışma anında
// node_modules'ten require eder ve alias o yolu etkilemez (denendi, işe yaramadı).
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');

const webRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(webRoot, '..', '..');

function realDirOf(fromDir, pkg) {
  const req = createRequire(path.join(fromDir, 'package.json'));
  return fs.realpathSync(path.dirname(req.resolve(`${pkg}/package.json`)));
}

function versionAt(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  } catch {
    return '?';
  }
}

/**
 * Ağaçtaki TÜM react / react-dom kopyalarını bulur — iç içe olanlar dahil
 * (ör. node_modules/react-dom/node_modules/react). Yalnızca node_modules
 * dizinlerine iner, makul bir derinlikle sınırlıdır.
 */
function findCopies(root, depth = 0, found = []) {
  if (depth > 6) return found;
  const nm = path.join(root, 'node_modules');
  let entries;
  try {
    entries = fs.readdirSync(nm, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    if (e.name === '.bin' || e.name === '.cache') continue;
    const full = path.join(nm, e.name);
    if (e.name === 'react' || e.name === 'react-dom') {
      try {
        found.push({ pkg: e.name, dir: fs.realpathSync(full), version: versionAt(full) });
      } catch {
        /* kırık link — atla */
      }
    }
    if (e.name.startsWith('@')) {
      try {
        for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
          if (sub.isDirectory() || sub.isSymbolicLink()) {
            findCopies(path.join(full, sub.name), depth + 1, found);
          }
        }
      } catch {
        /* atla */
      }
      continue;
    }
    findCopies(full, depth + 1, found);
  }
  return found;
}

function report() {
  const copies = findCopies(repoRoot).concat(findCopies(webRoot));
  const uniq = new Map();
  for (const c of copies) uniq.set(`${c.pkg}|${c.dir}`, c);
  const list = [...uniq.values()].sort((a, b) => a.pkg.localeCompare(b.pkg) || a.dir.localeCompare(b.dir));
  const lines = ['', 'Ağaçta bulunan tüm kopyalar:'];
  for (const c of list) lines.push(`  ${c.pkg} v${c.version}  ${c.dir}`);
  return lines;
}

function fail(headline, detail) {
  console.error(`\n\x1b[31mBUILD DURDURULDU — ${headline}\x1b[0m\n`);
  for (const l of detail) console.error(l);
  for (const l of report()) console.error(l);
  console.error(
    [
      '',
      'Çözüm — repo KÖKÜNDE (apps/web içinde DEĞİL):',
      '  npm run clean:all      # .next ve tüm node_modules klasörlerini siler',
      '  npm ci',
      '  npm run build -w apps/web',
      '',
      'Kurulum her zaman kökten yapılır; `apps/web` içinde `npm install`',
      'çalıştırmak oraya ikinci bir React kopyası indirir.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

const appReact = realDirOf(webRoot, 'react');
const reactDomDir = realDirOf(webRoot, 'react-dom');
const reactSeenByDom = realDirOf(reactDomDir, 'react');

if (appReact !== reactSeenByDom) {
  fail('React tek örnek değil', [
    'Uygulama ile react-dom FARKLI React kopyaları görüyor:',
    `  apps/web  -> ${appReact}  (v${versionAt(appReact)})`,
    `  react-dom -> ${reactSeenByDom}  (v${versionAt(reactSeenByDom)})`,
  ]);
}

if (versionAt(appReact) !== versionAt(reactDomDir)) {
  fail('react ile react-dom sürümleri uyuşmuyor', [
    `  react     ${versionAt(appReact)}  ${appReact}`,
    `  react-dom ${versionAt(reactDomDir)}  ${reactDomDir}`,
  ]);
}

// Başarı: sessiz kalma — sunucuda kontrolün GERÇEKTEN koştuğu görülebilsin.
console.log(
  `react tek örnek ✓  v${versionAt(appReact)}  ${path.relative(repoRoot, appReact) || appReact}`,
);
