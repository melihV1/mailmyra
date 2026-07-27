// Panel dostu teşhis — `npm run doctor`
//
// Yalnızca npm komutu çalıştırılabilen ortamlarda (Plesk paneli, SSH yok)
// build'i patlatmadan ortamın fotoğrafını çeker. Çıktıyı olduğu gibi paylaş.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const repoRoot = path.resolve(__dirname, '..');
const webRoot = path.join(repoRoot, 'apps', 'web');

function line(k, v) {
  console.log(`${k.padEnd(26)} ${v}`);
}

function versionAt(dir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  } catch {
    return '?';
  }
}

console.log('=== ortam ===');
line('node', process.version);
line('platform', `${process.platform} ${process.arch}`);
line('repo kökü', repoRoot);
line('cwd', process.cwd());

console.log('\n=== kritik dosyalar ===');
for (const rel of [
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'apps/web/.env.local',
  'apps/web/.next',
  'node_modules',
  'apps/web/node_modules',
  'packages/renderer/node_modules',
]) {
  line(rel, fs.existsSync(path.join(repoRoot, rel)) ? 'VAR' : 'yok');
}

console.log('\n=== react çözümlemesi ===');
function realDirOf(fromDir, pkg) {
  const req = createRequire(path.join(fromDir, 'package.json'));
  return fs.realpathSync(path.dirname(req.resolve(`${pkg}/package.json`)));
}
try {
  const appReact = realDirOf(webRoot, 'react');
  const domDir = realDirOf(webRoot, 'react-dom');
  const domReact = realDirOf(domDir, 'react');
  line('apps/web -> react', `v${versionAt(appReact)}  ${appReact}`);
  line('apps/web -> react-dom', `v${versionAt(domDir)}  ${domDir}`);
  line('react-dom -> react', `v${versionAt(domReact)}  ${domReact}`);
  line('TEK ÖRNEK Mİ?', appReact === domReact ? 'EVET ✓' : 'HAYIR ✗  <-- build bu yüzden patlar');
} catch (err) {
  line('çözümleme HATASI', err.message);
}

console.log('\n=== ağaçtaki tüm react kopyaları ===');
function findCopies(root, depth = 0, found = []) {
  if (depth > 6) return found;
  let entries;
  try {
    entries = fs.readdirSync(path.join(root, 'node_modules'), { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    if (!e.isDirectory() && !e.isSymbolicLink()) continue;
    if (e.name === '.bin' || e.name === '.cache') continue;
    const full = path.join(root, 'node_modules', e.name);
    if (e.name === 'react' || e.name === 'react-dom') {
      try {
        found.push({ pkg: e.name, dir: fs.realpathSync(full), v: versionAt(full) });
      } catch {
        /* kırık link */
      }
    }
    if (e.name.startsWith('@')) {
      try {
        for (const sub of fs.readdirSync(full, { withFileTypes: true })) {
          findCopies(path.join(full, sub.name), depth + 1, found);
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
const uniq = new Map();
for (const c of findCopies(repoRoot).concat(findCopies(webRoot))) uniq.set(`${c.pkg}|${c.dir}`, c);
const all = [...uniq.values()].sort((a, b) => a.pkg.localeCompare(b.pkg) || a.dir.localeCompare(b.dir));
if (all.length === 0) console.log('  (hiç bulunamadı — kurulum yapılmamış olabilir)');
for (const c of all) console.log(`  ${c.pkg.padEnd(10)} v${c.v.padEnd(10)} ${c.dir}`);

const reactDirs = new Set(all.filter((c) => c.pkg === 'react').map((c) => c.dir));
console.log(
  `\nkopya sayısı: ${reactDirs.size} farklı react. ` +
    (reactDirs.size <= 1 ? 'Sağlıklı ✓' : 'BİRDEN FAZLA — build patlar ✗'),
);

// ── React SSR izolasyon testi ────────────────────────────────────────────
// Next'i DEVRE DIŞI bırakıp React'in kendisini sınar: createContext +
// useContext ile bir bileşeni sunucuda render eder. `next build` tam olarak
// burada ("Cannot read properties of null (reading 'useContext')") ölüyor.
//
//   Bu test PATLARSA  -> sorun React/react-dom kurulumunda (Next masum).
//                        En olası sebep: eksik/bozuk kurulum (Windows'ta uzun
//                        yol sınırı, antivirüs karantinası, yarım npm ci).
//   Bu test GEÇERSE   -> React sağlam, sorun Next'in prerender katmanında.
console.log('\n=== React SSR izolasyon testi (Next olmadan) ===');
(async () => {
  try {
    const req = createRequire(path.join(webRoot, 'package.json'));
    const React = req('react');
    const { renderToStaticMarkup } = req('react-dom/server');

    line('react sürümü', React.version ?? '?');
    line('react-dom/server', 'yüklendi ✓');

    const Ctx = React.createContext('varsayılan');
    function Child() {
      const v = React.useContext(Ctx);
      return React.createElement('span', null, v);
    }
    const html = renderToStaticMarkup(
      React.createElement(Ctx.Provider, { value: 'merhaba' }, React.createElement(Child)),
    );

    const ok = html === '<span>merhaba</span>';
    line('useContext SSR', ok ? `GEÇTİ ✓  (${html})` : `BEKLENMEYEN ÇIKTI: ${html}`);
    console.log(
      ok
        ? '\nSONUÇ: React sağlam. Build hâlâ patlıyorsa sorun Next prerender katmanında.'
        : '\nSONUÇ: React beklenmedik çıktı üretti — kurulum şüpheli.',
    );
  } catch (err) {
    line('useContext SSR', 'PATLADI ✗');
    console.error(`\n  ${err && err.stack ? err.stack : err}`);
    console.log(
      '\nSONUÇ: React/react-dom kurulumu BOZUK — Next ile ilgisi yok.\n' +
        'Yapılacak: npm run clean:all && npm ci  (kökte).\n' +
        'Windows ise ayrıca kontrol et: uzun yol sınırı (MAX_PATH 260) ve\n' +
        'antivirüsün node_modules altındaki dosyaları karantinaya alması.',
    );
    process.exitCode = 1;
  }
})();
