// node --test scripts/deploy-site.test.js
//
// Yalnız SAF yardımcılar sınanır — FTP/HTTP tarafı ağ ister, orası elle
// (`--dry-run`, `--audit`) doğrulanıyor. Sınananlar, canlıda gerçekten
// yaşanmış iki hatanın bekçileri: sunucuya gitmemesi gereken dosyalar ve
// bump edilmeyen CSS damgası.

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  isDeployable, remotePathFor, stampsIn, cssStampGuard, buildPlan, parseArgs,
} = require('./deploy-site.js');

test('isDeployable: jeneratörler ve depo çöpü sunucuya gitmez', () => {
  assert.equal(isDeployable('scripts/audit.mjs'), false);
  assert.equal(isDeployable('.superpowers/skills/x.md'), false);
  assert.equal(isDeployable('README.md'), false);
  assert.equal(isDeployable('.gitignore'), false);
  assert.equal(isDeployable('assets/img/.DS_Store'), false);
});

test('isDeployable: gerçek sayfa ve varlıklar gider', () => {
  assert.equal(isDeployable('index.html'), true);
  assert.equal(isDeployable('setup-apple-mail.html'), true);
  assert.equal(isDeployable('assets/css/main.css'), true);
  assert.equal(isDeployable('assets/img/setup/apple-mail-step-05.png'), true);
  assert.equal(isDeployable('robots.txt'), true);
});

test('isDeployable: web.config yalnız açıkça istenince gider', () => {
  assert.equal(isDeployable('web.config'), false);
  assert.equal(isDeployable('web.config', { webConfig: true }), true);
  // "scripts" ADIYLA BAŞLAYAN bir sayfa yanlışlıkla elenmesin.
  assert.equal(isDeployable('scripts-for-agencies.html'), true);
});

test('remotePathFor: belge köküne göre POSIX yolu üretir', () => {
  assert.equal(remotePathFor('index.html', '/site'), '/site/index.html');
  assert.equal(
    remotePathFor('assets/img/setup/apple-mail-result.png', '/site'),
    '/site/assets/img/setup/apple-mail-result.png',
  );
});

test('stampsIn: sayfadaki main.css damgalarını okur', () => {
  const html = '<link rel="stylesheet" href="assets/css/main.css?v=mailmyra-0916-setup-shots">';
  assert.deepEqual(stampsIn(html), ['mailmyra-0916-setup-shots']);
  assert.deepEqual(stampsIn('<link href="assets/css/other.css?v=x">'), []);
  assert.deepEqual(stampsIn('hiç link yok'), []);
});

test('cssStampGuard: CSS değişip damga değişmezse DURDURUR', () => {
  // db2cf9d'de tam olarak bu oldu: kurallar eklendi, damga öylece kaldı.
  const r = cssStampGuard({
    cssChanged: true,
    stampsBefore: ['mailmyra-0828-wiring-10', 'mailmyra-0828-wiring-10'],
    stampsAfter: ['mailmyra-0828-wiring-10', 'mailmyra-0828-wiring-10'],
  });
  assert.equal(r.ok, false);
  assert.match(r.reason, /main\.css\?v=/);
});

test('cssStampGuard: tek sayfanın damgası bile bump edilse geçer', () => {
  // f02beb7 böyleydi: yalnız setup-apple-mail.html bump edildi, 29 sayfa
  // eski damgada bırakıldı — çünkü yeni kuralı yalnız o sayfa kullanıyor.
  const r = cssStampGuard({
    cssChanged: true,
    stampsBefore: ['mailmyra-0828-wiring-10', 'mailmyra-0828-wiring-10'],
    stampsAfter: ['mailmyra-0828-wiring-10', 'mailmyra-0916-setup-shots'],
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.added, ['mailmyra-0916-setup-shots']);
});

test('cssStampGuard: CSS değişmediyse damgaya karışmaz', () => {
  const r = cssStampGuard({ cssChanged: false, stampsBefore: ['a'], stampsAfter: ['a'] });
  assert.equal(r.ok, true);
});

test('buildPlan: yüklenecek / atlanacak / silinmiş olarak ayırır', () => {
  const plan = buildPlan(
    ['index.html', 'scripts/audit.mjs', 'assets/css/main.css', 'eski-sayfa.html'],
    { exists: (rel) => rel !== 'eski-sayfa.html' },
  );
  assert.deepEqual(plan.upload, ['index.html', 'assets/css/main.css']);
  assert.deepEqual(plan.skipped, ['scripts/audit.mjs']);
  assert.deepEqual(plan.deleted, ['eski-sayfa.html']);
});

test('buildPlan: silinen dosya YÜKLEME listesine düşmez', () => {
  // fs.statSync yükleme sırasında patlamasın diye: plan aşamasında elenir.
  const plan = buildPlan(['gone.png'], { exists: () => false });
  assert.deepEqual(plan.upload, []);
  assert.deepEqual(plan.deleted, ['gone.png']);
});

test('parseArgs: bayraklar ve --files listesi', () => {
  const o = parseArgs(['--dry-run', '--files', 'a.html', 'assets/b.png']);
  assert.equal(o.dryRun, true);
  assert.equal(o.all, false);
  assert.deepEqual(o.files, ['a.html', 'assets/b.png']);
});

test('parseArgs: --files sonrası gelen bayrak dosya sanılmaz', () => {
  const o = parseArgs(['--files', 'a.html', '--no-verify']);
  assert.deepEqual(o.files, ['a.html']);
  assert.equal(o.noVerify, true);
});

test('parseArgs: --seed-marker değerini alır', () => {
  assert.equal(parseArgs(['--seed-marker', 'f02beb7']).seed, 'f02beb7');
  assert.equal(parseArgs(['--audit']).seed, null);
  assert.equal(parseArgs([]).files, null);
});
