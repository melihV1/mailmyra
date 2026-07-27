// Build öncesi kontrol: React TEK ÖRNEK mi?
//
// İki farklı React kopyası yüklenirse (biri kök node_modules'ten, biri
// apps/web/node_modules'ten) react-dom'un dispatcher'ı null kalır ve `next
// build` şu hatayla patlar:
//
//   TypeError: Cannot read properties of null (reading 'useContext')
//   Error occurred prerendering page "/404"
//
// Kopyalar AYNI sürüm olsa bile patlar — sorun sürüm farkı değil, iki ayrı
// modül örneği. Hata mesajı sebebi hiç ima etmediği için (2026-07-25'te
// Windows sunucuda tam olarak bu yaşandı) burada ERKEN ve AÇIK hata veriyoruz.
//
// Not: bu bir webpack alias ile ÇÖZÜLEMEZ — Next, react/react-dom'u sunucu
// build'inde external bırakır ve prerender worker'ı onları çalışma anında
// node_modules'ten require eder. Tek gerçek çözüm kurulum şeklini düzeltmek.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');

const webRoot = path.resolve(__dirname, '..');

/** Bir paketin gerçek (symlink çözülmüş) dizinini, verilen bağlamdan çözer. */
function resolveDir(fromDir, pkg) {
  const req = createRequire(path.join(fromDir, 'package.json'));
  return fs.realpathSync(path.dirname(req.resolve(`${pkg}/package.json`)));
}

function version(dir) {
  return require(path.join(dir, 'package.json')).version;
}

function fail(lines) {
  console.error('\n\x1b[31mBUILD DURDURULDU — React tek örnek değil\x1b[0m\n');
  for (const l of lines) console.error(l);
  console.error(
    [
      '',
      'Çözüm (monorepo KÖKÜNDE, apps/web içinde DEĞİL):',
      '  rm -rf node_modules apps/web/node_modules packages/renderer/node_modules',
      '  npm ci',
      '',
      'Windows PowerShell:',
      '  Remove-Item -Recurse -Force node_modules, apps\\web\\node_modules, packages\\renderer\\node_modules',
      '  npm ci',
      '',
      'Sebep: `npm install` apps/web İÇİNDE çalıştırılırsa react oraya ikinci',
      'kez iner. Kurulum her zaman kökten yapılır; npm bağımlılıkları kök',
      'node_modules\'e hoist eder.',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

// Uygulamanın gördüğü React ile react-dom'un gördüğü React aynı dosya mı?
const appReact = resolveDir(webRoot, 'react');
const reactDomDir = resolveDir(webRoot, 'react-dom');
const reactSeenByDom = resolveDir(reactDomDir, 'react');

if (appReact !== reactSeenByDom) {
  fail([
    'İki ayrı React kopyası bulundu:',
    `  apps/web  -> ${appReact}  (v${version(appReact)})`,
    `  react-dom -> ${reactSeenByDom}  (v${version(reactSeenByDom)})`,
  ]);
}

// Sürüm sapması da ayrı bir kırılma sebebi (react ile react-dom aynı sürüm olmalı).
if (version(appReact) !== version(reactDomDir)) {
  fail([
    'react ile react-dom sürümleri uyuşmuyor:',
    `  react     ${version(appReact)}`,
    `  react-dom ${version(reactDomDir)}`,
  ]);
}
