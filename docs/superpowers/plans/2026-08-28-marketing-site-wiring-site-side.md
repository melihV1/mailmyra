# Pazarlama sitesi bağlantısı — SİTE TARAFI (Plan 2/2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `mailmyra.com`'daki 30 statik sayfayı ürünün bugünkü gerçeğine bağlamak — ölü formları çalışan uca, yanlış linkleri doğru hedefe, kurulmamış özellik iddialarını ya "Yakında"ya ya gerçeğe çekmek.

**Architecture:** Site statik HTML kalır; build adımı yok, dosyalar diske ne yazılırsa o servis edilir. Statik sitenin birim testi olmadığı için **Task 1 bir denetim script'i kurar** (`scripts/audit.mjs`) ve sonraki her görev o script'in bir kuralını kırmızıdan yeşile çevirir. Tekrarlı düzeltmeler (30 sayfada footer) elle değil script'le uygulanır ve `patch-mega-menu.py` desenini izler: beklenen sayıda eşleşme yoksa **o dosyaya hiç dokunmadan durur**, yarım yama bırakmaz.

**Tech Stack:** Düz HTML + CSS (Agntix teması), bağımlılıksız Node ESM script'leri (`node scripts/*.mjs`), IIS `web.config` rewrite.

**Depo:** `~/Desktop/mailmyra edit` → `melihV1/mailmyra-site` (private). Ürün değişiklikleri **bu plana ait değil** — onlar Plan 1'de ve monorepo'da.

## Global Constraints

- **⚠️ Plan 1 ÖNCE deploy edilmiş olmalı.** Task 5 formları `https://app.mailmyra.com/api/leads`'e bağlıyor; uç canlıda yoksa formlar 404 verir.
- **Site İngilizce kalır** (kilitli karar). Hiçbir TR metin eklenmez, `hreflang` eklenmez, `/tr/` rotası açılmaz.
- **Tailwind ve Bootstrap yok.** Yeni CSS dosyası da yok.
- **`assets/css/main.css` baştan ÜRETİLMEZ — yalnız SONUNA eklenir.** Hüseyin aynı dosyaya paralel yazıyor; yeniden üretmek onun CSS'ini siler.
- **Her CSS değişikliğinden sonra** HTML'deki `main.css?v=mailmyra-…` damgası bump edilir; sunucu agresif önbellekliyor.
- **`build-pricing-page.py` KOŞULMAZ.** `pricing.html`i Hüseyin kendi kurdu; jeneratör onunkini baştan yazar. Fiyat sayfasındaki düzeltmeler elle yapılır.
- **Bölüm kurmak Hüseyin'in işi.** Bu plan bölüm eklemiyor; var olanı ürüne bağlıyor. Görsel karar gerektiren tek şey "Yakında" rozeti ve onun kendi onay kapısı var (Task 2).
- **DOKUNULMAYACAKLAR (Hüseyin kararı):** Lorem ipsum slider ("Christian B."), "4.9 / 5" ve 5 müşteri görüşü · "Pixel-perfect in 6 clients" rozeti · "Delivering more Than Just Solutions" kartlarının ve BT-hizmetleri şeridinin **kendisi** (yalnız içlerindeki ölü `href="#"` düzeltilir) · kurulum rehberi kareleri ve `noindex` satırları · `pricing.html`in yerleşimi.
- Kullanıcı metni hiçbir zaman `innerHTML`e verilmez — `textContent` (login.html'deki mevcut desen).
- Commit mesajları İngilizce; kod yorumları Türkçe.

---

### Task 1: Denetim script'i — sitenin testi

Statik sitenin birim testi yok. Sonraki her görevin kırmızı/yeşil döngüsü buradan gelir. Bağımlılık kurulmaz (`clean-urls.mjs`/`place-shots.mjs` emsali: projede paket yöneticisi yok, sistem Node'u yeter).

**Files:**
- Create: `scripts/audit.mjs`

**Interfaces:**
- Produces: `node scripts/audit.mjs` → ihlal başına bir satır basar, ihlal varsa **çıkış kodu 1**. `--only=<kural>` ile tek kural koşulur.

- [ ] **Step 1: Script'i yaz**

Create `scripts/audit.mjs`:

```js
#!/usr/bin/env node
/**
 * Sitenin testi. Statik HTML'in birim testi olmadığı için bağlantı turunun
 * kuralları burada yaşıyor: her düzeltme görevi bir kuralı kırmızıdan yeşile
 * çevirir ve bir daha geri dönmesini bu script engeller.
 *
 * Bağımlılık kurmaz — projede paket yöneticisi yok, sistem Node'u yetiyor
 * (clean-urls.mjs / place-shots.mjs ile aynı karar).
 *
 * Kullanım:  node scripts/audit.mjs [--only=dead-links,claims]
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { basename } from 'node:path';

const pages = readdirSync('.').filter((f) => f.endsWith('.html')).sort();
const slugs = new Set(pages.map((p) => p.slice(0, -5)));
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const run = (name) => only.length === 0 || only.includes(name);

const violations = [];
const add = (rule, file, detail) => violations.push({ rule, file, detail });

const src = new Map(pages.map((p) => [p, readFileSync(p, 'utf8')]));
const lineOf = (text, index) => text.slice(0, index).split('\n').length;

/* Yorum içindeki işaretleme kasıtlı olabilir (ör. kapatılmış SSO bloğu) —
   denetim canlı işaretlemeye bakar. */
const stripComments = (html) => html.replace(/<!--[\s\S]*?-->/g, '');

/** Ölü bağlantı: href="#" ya da href="" */
if (run('dead-links')) {
  for (const [file, raw] of src) {
    const html = stripComments(raw);
    for (const m of html.matchAll(/href="(#|)"/g)) {
      add('dead-links', file, `satır ${lineOf(html, m.index)}: href="${m[1]}"`);
    }
  }
}

/** Uzantılı iç bağlantı: fragment'li olsa da temiz adres kullanılmalı. */
if (run('html-links')) {
  for (const [file, raw] of src) {
    const html = stripComments(raw);
    for (const m of html.matchAll(/href="([a-z0-9-]+)\.html(#[^"]*)?"/g)) {
      add('html-links', file, `satır ${lineOf(html, m.index)}: ${m[0]}`);
    }
  }
}

/** Var olmayan sayfaya giden iç bağlantı. */
if (run('missing-pages')) {
  for (const [file, raw] of src) {
    const html = stripComments(raw);
    for (const m of html.matchAll(/href="\/([a-z0-9-]+)(#[^"]*)?"/g)) {
      if (!slugs.has(m[1])) add('missing-pages', file, `satır ${lineOf(html, m.index)}: /${m[1]}`);
    }
  }
}

/** Hedefi olmayan çapa (fragment). Aynı sayfa ya da /sayfa#capa. */
if (run('missing-anchors')) {
  const idsOf = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const ids = new Map(pages.map((p) => [p, idsOf(src.get(p))]));
  for (const [file, raw] of src) {
    const html = stripComments(raw);
    for (const m of html.matchAll(/href="(\/([a-z0-9-]+))?#([^"]+)"/g)) {
      const target = m[2] ? `${m[2]}.html` : file;
      if (!src.has(target)) continue; // missing-pages kuralının işi
      if (!ids.get(target).has(m[3])) {
        add('missing-anchors', file, `satır ${lineOf(html, m.index)}: ${m[0]} → ${target} içinde yok`);
      }
    }
  }
}

/** Var olmayan yerel varlık (görsel/script/stil). */
if (run('missing-assets')) {
  for (const [file, raw] of src) {
    for (const m of stripComments(raw).matchAll(/(?:src|href)="(assets\/[^"?#]+)/g)) {
      if (!existsSync(m[1])) add('missing-assets', file, m[1]);
    }
  }
}

/**
 * Ürün gerçeğiyle çelişen ifadeler. Her satır bir görevle yeşile döner;
 * listede kalması, düzeltmenin geri gelmesini engeller.
 */
const FORBIDDEN = [
  ['Signal Ledger', 'yanlış marka adı (footer)'],
  // ⚠️ İşaretleme araya giriyor: `Six-client<br>preview`. Düz metin arama
  // burada boşa koşardı — kalıp HTML'in gerçek hâlinden alındı.
  ['Six-client<br>preview', 'üründe istemci-istemci önizleme yok'],
  ['Six inbox previews', 'üründe istemci-istemci önizleme yok'],
  ['Six email clients', 'üründe istemci-istemci önizleme yok'],
  ['Preview per inbox', 'üründe istemci-istemci önizleme yok'],
  ['Live inbox previews', 'üründe istemci-istemci önizleme yok'],
  ['Directory sync', 'kapsam dışı — yasak listesinde'],
  ['Directory ready', 'kapsam dışı — yasak listesinde'],
  ['Profile sync', 'kapsam dışı — directory sync ima ediyor'],
  ['employees synced', 'kapsam dışı — directory sync ima ediyor'],
  ['Free forever', 'ücretsiz plan yok'],
  ['Mailmyra Free', 'ücretsiz plan yok'],
  ['Mailmyra badge', 'üründe rozet özelliği yok'],
  ['PostgreSQL', 'veritabanı MariaDB'],
  ['Seven fonts', 'altı web-safe font var'],
  ['<i>7 /</i> web-safe fonts', 'font sayısı altı (how-it-works istatistik şeridi)'],
  ['Modern split', 'uydurma şablon adı'],
  ['Executive line', 'uydurma şablon adı'],
  ['Campaign ready', 'uydurma şablon adı'],
  ['Shared identity', 'uydurma şablon adı'],
  ['Department lead', 'uydurma şablon adı'],
  ['Launch campaign', 'uydurma şablon adı'],
  ['Modern profile', 'uydurma şablon adı'],
  ['Executive mark', 'uydurma şablon adı'],
  ['Client minimal', 'uydurma şablon adı'],
  ['Client executive', 'uydurma şablon adı'],
  ['Client campaign', 'uydurma şablon adı'],
  ['000 00 00', 'yer tutucu telefon numarası'],
];

if (run('claims')) {
  for (const [file, raw] of src) {
    const html = stripComments(raw);
    for (const [needle, why] of FORBIDDEN) {
      const i = html.indexOf(needle);
      if (i !== -1) add('claims', file, `satır ${lineOf(html, i)}: "${needle}" — ${why}`);
    }
  }
}

/** Kurulmamış özellik anlatan bölüm "Yakında" işareti taşımalı. */
if (run('coming-soon')) {
  for (const [file, raw] of src) {
    const html = stripComments(raw);
    for (const m of html.matchAll(/Scheduled banners|Trackable CTA|Click insights|White-label|Pooled seats|Pooled senders|Teams &amp; departments|Flexible signature blocks/g)) {
      // Bölümün başındaki 3000 karakterde işaret aranır; rozet bölüm
      // başlığında duruyor, iddia satırının hemen yanında değil.
      const around = html.slice(Math.max(0, m.index - 3000), m.index + 500);
      if (!around.includes('mm-soon')) {
        add('coming-soon', file, `satır ${lineOf(html, m.index)}: "${m[0]}" — bölümde mm-soon işareti yok`);
      }
    }
  }
}

/** Arama motoru dosyaları. */
if (run('seo-files')) {
  for (const f of ['robots.txt', 'sitemap.xml']) {
    if (!existsSync(f)) add('seo-files', f, 'dosya yok');
  }
}

if (violations.length === 0) {
  console.log(`✓ ${pages.length} sayfa denetlendi, ihlal yok.`);
  process.exit(0);
}

const byRule = {};
for (const v of violations) (byRule[v.rule] ??= []).push(v);
for (const [rule, list] of Object.entries(byRule)) {
  console.log(`\n■ ${rule} — ${list.length} ihlal`);
  for (const v of list) console.log(`   ${v.file}  ${v.detail}`);
}
console.log(`\n${violations.length} ihlal, ${Object.keys(byRule).length} kural.`);
process.exit(1);
```

- [ ] **Step 2: Koş — kırmızı olmalı ve envanterle örtüşmeli**

```bash
cd ~/Desktop/mailmyra\ edit && node scripts/audit.mjs
```

Beklenen: çıkış kodu 1. Rakamlar envanterle tutmalı — `html-links` **292**, `dead-links` **3**, `missing-anchors` en az 1 (`#campaigns`), `seo-files` **2**, `claims` çok sayıda. Sapma varsa script'in regex'i yanlıştır; siteyi düzeltmeden ÖNCE script düzeltilir.

- [ ] **Step 2b: Her `claims` kalıbının bugün gerçekten eşleştiğini doğrula**

⚠️ **Bu adımı atlama.** Eşleşmeyen bir kalıp kuralı sessizce **yeşil** gösterir — hata yakalanmadan "düzeldi" sanılır. Plan yazılırken tam olarak bu iki kez oldu (`7 </span>` ve `Six-client preview` düz metin sanılmıştı; gerçeği `<i>7 /</i> web-safe fonts` ve `Six-client<br>preview`).

```bash
node -e '
const {readFileSync,readdirSync}=require("node:fs");
const src=readdirSync(".").filter(f=>f.endsWith(".html")).map(f=>[f,readFileSync(f,"utf8")]);
const list=readFileSync("scripts/audit.mjs","utf8")
  .match(/const FORBIDDEN = \[([\s\S]*?)\n\];/)[1]
  .split("\n").map(l=>l.match(/^\s*\[.(.*?).,/)).filter(Boolean).map(m=>m[1]);
const dead=list.filter(n=>!src.some(([,s])=>s.includes(n)));
console.log(dead.length ? "EŞLEŞMEYEN:\n  "+dead.join("\n  ") : "✓ "+list.length+" kalıbın hepsi eşleşiyor");
process.exit(dead.length?1:0);'
```

Beklenen: `✓ 28 kalıbın hepsi eşleşiyor`. Eşleşmeyen varsa o satırın gerçek işaretlemesini `grep -n` ile bul ve kalıbı düzelt.

- [ ] **Step 3: Commit**

```bash
git add scripts/audit.mjs
git commit -m "test: add a site audit script as the connection round's red/green gate"
```

---

### Task 2: "Yakında" işareti — ÖNCE HÜSEYİN ONAYI

⚠️ **Bu görev bir onay kapısıdır.** Hüseyin'in şartı: *"küçük gri bir rozet değil, fark edilir bir işaret — ziyaretçi bunun mevcut bir özellik olmadığını tereddütsüz anlasın."* Görsel karar onun; kod önerisi çizilir, **onaylanmadan 13 bölüme yayılmaz.**

**Files:**
- Modify: `assets/css/main.css` (**yalnız sonuna eklenir**)
- Modify: `product.html` (tek bölümde örnek uygulama)

- [ ] **Step 1: CSS'i main.css'in SONUNA ekle**

⚠️ Dosyayı yeniden üretme, `>>` ile ekle:

```css
/* ── "Yakında" işareti ─────────────────────────────────────────────────
   Henüz kurulmamış özellikleri anlatan bölümler için. Hüseyin'in şartı:
   fark edilir olsun — ziyaretçi bölümün bugün çalışan bir şey olmadığını
   tereddütsüz anlasın. Bu yüzden küçük gri bir rozet değil, bölümü boydan
   boya kesen bir şerit + bölümün kendisinde hafif bir sönümleme.
   Tema değişkenlerini kullanır, yeni renk icat etmez. */
.mm-soon { position: relative; }

.mm-soon__flag {
  display: flex; align-items: center; gap: 10px;
  margin: 0 0 20px; padding: 10px 18px;
  border: 2px solid currentColor; border-radius: 999px;
  width: max-content; max-width: 100%;
  font: 700 13px/1.2 var(--tp-ff-heading, inherit);
  letter-spacing: .08em; text-transform: uppercase;
}

.mm-soon__flag::before {
  content: ""; width: 8px; height: 8px; border-radius: 50%;
  background: currentColor; flex: none;
}

/* Bölüm içeriği biraz geri çekilir — okunur kalır ama "canlı" görünmez. */
.mm-soon__body { opacity: .72; }

@media (prefers-reduced-motion: no-preference) {
  .mm-soon__flag::before { animation: mm-soon-pulse 2.4s ease-in-out infinite; }
}

@keyframes mm-soon-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
```

- [ ] **Step 2: CSS damgasını bump et**

⚠️ **Damga 30 sayfada AYNI DEĞİL** — şu an 14 farklı değer dolaşıyor
(`mailmyra-0803-5`, `mailmyra-0811-static-pages-1`, `mailmyra-0818-setup-shots-1` …).
Bu yüzden "eskiyi yenisiyle değiştir" işe yaramaz; ne olursa olsun eşleşen bir
düzenli ifade gerekir. Bu tur bütün sayfaları **tek** damgada birleştirir:

```bash
python3 - <<'PY'
import glob, pathlib, re
NEW = 'main.css?v=mailmyra-0828-wiring-1'
seen, n = set(), 0
for f in glob.glob('*.html'):
    p = pathlib.Path(f); s = p.read_text(encoding='utf-8')
    for m in re.finditer(r'main\.css\?v=[^"]*', s): seen.add(m.group(0))
    out, c = re.subn(r'main\.css\?v=[^"]*', NEW, s)
    if c: p.write_text(out, encoding='utf-8'); n += 1
print(f'{n} dosya, önceki damgalar: {len(seen)} farklı değer -> tek değere indirildi')
PY
```

Beklenen: `30 dosya, önceki damgalar: 14 farklı değer -> tek değere indirildi`.

Sonraki CSS turlarında yalnız `NEW` sonundaki sayıyı artır — artık tek değer var.

- [ ] **Step 3: TEK bölüme örnek uygula**

`product.html` içindeki **"04 / Campaigns"** kartını sarmala: kartın kök elemanına `mm-soon` sınıfı, içeriğine `mm-soon__body`, en üste de:

```html
<span class="mm-soon__flag">Coming soon</span>
```

Başka hiçbir bölüme dokunma.

- [ ] **Step 4: Hüseyin'e göster ve DUR**

```bash
open product.html
```

Hüseyin'e sor: *"Yakında işareti böyle mi olsun? Onaylarsan kalan 12 bölüme aynısını uygularım."*

**Onay gelmeden Task 7 ve Task 8'e geçme.** Değişiklik isterse CSS'i güncelle ve tekrar göster.

- [ ] **Step 5: Onay sonrası commit**

```bash
git add assets/css/main.css product.html *.html
git commit -m "feat(ui): add the coming-soon marker, approved on the Campaigns card"
```

---

### Task 3: Footer ve bağlantı düzeltmeleri

30 sayfada tekrarlı; elle yapılırsa kaçak kalır. Script `patch-mega-menu.py` desenini izler: beklenen sayıda eşleşme yoksa **o dosyaya dokunmaz.**

**Files:**
- Create: `scripts/fix-links.mjs`
- Modify: 30 × `*.html`
- Modify: `solutions.html` (`id="campaigns"` çapası)

**Interfaces:**
- Consumes: `scripts/audit.mjs` (Task 1) — `dead-links`, `html-links`, `missing-anchors` kuralları
- Produces: sıfır ölü bağlantı, sıfır `.html` bağlantısı, sıfır hedefsiz çapa

- [ ] **Step 1: Kırmızıyı ölç**

```bash
node scripts/audit.mjs --only=dead-links,html-links,missing-anchors
```

Beklenen: FAIL — `html-links` 292, `dead-links` 3, `missing-anchors` ≥1. Bu sayıları not et.

- [ ] **Step 2: Yama script'ini yaz**

Create `scripts/fix-links.mjs`:

```js
#!/usr/bin/env node
/**
 * Bağlantı turu. Her kalıp için BEKLENEN eşleşme sayısı yazılı; sapma varsa
 * o dosyaya HİÇ dokunulmaz (patch-mega-menu.py dersi: yarım yama, hiç
 * yamadan kötüdür — hangi sayfanın düzeldiğini kimse bilemez).
 *
 * `--dry` yalnız rapor verir.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const dry = process.argv.includes('--dry');
const pages = readdirSync('.').filter((f) => f.endsWith('.html')).sort();

/** [ara, koy, her dosyada beklenen adet (null = serbest)] */
const EDITS = [
  // Footer büyük CTA yanlış yere gidiyordu.
  ['<a class="crp-footer-big-text text-center" href="/contact">',
   '<a class="crp-footer-big-text text-center" href="https://app.mailmyra.com/builder">', 1],

  // "Install Guides" kurulum hub'ına gitmeli; "How It Works" aynı adresi
  // kullandığı için etiketle birlikte eşleştirilir.
  ['<a href="/how-it-works">Install Guides</a>', '<a href="/setup">Install Guides</a>', 1],

  // Anasayfa dışındaki 29 sayfada bu çapa yok — köke mutlak yol verilir.
  ['<a href="#mailmyra-demo-form">Schedule a Demo</a>',
   '<a href="/#mailmyra-demo-form">Schedule a Demo</a>', 1],

  // Uzantılı bağlantılar → temiz adres (fragment korunur).
  ['href="solutions.html#campaigns"', 'href="/solutions#campaigns"', null],
  ['href="solutions.html#agencies"', 'href="/solutions#agencies"', null],
  ['href="solutions.html#professionals"', 'href="/solutions#professionals"', null],
  ['href="solutions.html#teams"', 'href="/solutions#teams"', null],
  ['href="pricing.html#pro"', 'href="/pricing#pro"', null],
  ['href="pricing.html#team"', 'href="/pricing#team"', null],
  ['href="pricing.html#agency"', 'href="/pricing#agency"', null],
  ['href="privacy.html#ccpa"', 'href="/privacy#ccpa"', null],

  // Yanlış marka adı.
  ['<p>Signal Ledger by Mailmyra. Standardized signatures. Trusted conversations. Every time.</p>',
   '<p>Mailmyra. Standardized signatures. Trusted conversations. Every time.</p>', 1],

  // About sayfası yok; bu turda yeni sayfa da açılmıyor — satır kalkar.
  ['<li class="mb-2"><a href="/">About</a></li>', '', 1],
];

let touched = 0;
for (const file of pages) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  let ok = true;

  for (const [find, put, expected] of EDITS) {
    const count = after.split(find).length - 1;
    if (expected !== null && count !== 0 && count !== expected) {
      console.error(`✗ ${file}: "${find.slice(0, 45)}…" ${count} kez geçti, ${expected} bekleniyordu — dosyaya dokunulmadı`);
      ok = false;
      break;
    }
    if (count > 0) after = after.split(find).join(put);
  }

  if (!ok || after === before) continue;
  if (!dry) writeFileSync(file, after, 'utf8');
  touched += 1;
  console.log(`${dry ? '(kuru) ' : ''}${file}`);
}
console.log(`\n${touched} dosya${dry ? ' değişecekti' : ' güncellendi'}.`);
```

- [ ] **Step 3: Kuru koşu**

```bash
node scripts/fix-links.mjs --dry
```

Beklenen: 30 dosya listelenir, hiçbir `✗` satırı yok. `✗` varsa kalıp yanlış — düzelt, tekrar koş.

- [ ] **Step 4: Uygula**

```bash
node scripts/fix-links.mjs
```

- [ ] **Step 5: `#campaigns` çapasını ekle**

`solutions.html` içinde "Built around the work" / departman sekmelerini taşıyan bölümün kök elemanına `id="campaigns"` ekle. Footer'daki "Campaigns" bağlantısı oraya iner.

- [ ] **Step 6: `index.html`'deki 3 ölü bağlantıyı düzelt**

`index.html:1757, 1779, 1800` — bölümün kendisi **kalır** (Hüseyin kararı), yalnız `<a href="#">` sarmalayıcıları silinip başlık düz metne döner:

```bash
python3 - <<'PY'
import pathlib, re
p = pathlib.Path('index.html'); s = p.read_text(encoding='utf-8')
new, n = re.subn(r'<h4 class="it-benifit-title"><a href="#">([^<]+)</a></h4>',
                 r'<h4 class="it-benifit-title">\1</h4>', s)
assert n == 3, f'3 bekleniyordu, {n} bulundu'
p.write_text(new, encoding='utf-8'); print('3 başlık düz metne çevrildi')
PY
```

- [ ] **Step 7: Compatibility sütununu rehberlere bağla**

Footer'daki Compatibility sütununda 6 etiket de `/compatibility`ye gidiyor. Beşi kendi rehberine bağlanır, "HTML Export" `/compatibility`de kalır:

```bash
python3 - <<'PY'
import glob, pathlib
MAP = {'Outlook Classic': '/setup-outlook-classic', 'New Outlook': '/setup-new-outlook',
       'Gmail': '/setup-gmail', 'Apple Mail': '/setup-apple-mail', 'iOS Mail': '/setup-ios-mail'}
total = 0
for f in glob.glob('*.html'):
    p = pathlib.Path(f); s = p.read_text(encoding='utf-8'); before = s
    for label, href in MAP.items():
        s = s.replace(f'<a href="/compatibility">{label}</a>', f'<a href="{href}">{label}</a>')
    if s != before:
        p.write_text(s, encoding='utf-8'); total += 1
print(f'{total} dosya güncellendi')
PY
```

- [ ] **Step 8: Denetimi koş — yeşil olmalı**

```bash
node scripts/audit.mjs --only=dead-links,html-links,missing-anchors,missing-pages
```

Beklenen: bu dört kuralda **0 ihlal**.

- [ ] **Step 9: Canlı davranışı bozmadığını doğrula**

```bash
python3 -m http.server 8080 >/dev/null 2>&1 &
sleep 1 && curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/index.html && kill %1
```

Beklenen: 200. (Yerel sunucuda temiz adresler çalışmaz — o çeviriyi `web.config` yapıyor; burada bakılan tek şey sayfaların bozulmadığı.)

- [ ] **Step 10: Commit**

```bash
git add scripts/fix-links.mjs *.html
git commit -m "fix(links): point the footer at real targets and drop extension hops"
```

---

### Task 4: Formları `/api/leads`'e bağla

⚠️ **Plan 1 canlıda olmalı.** Kontrol:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://app.mailmyra.com/api/leads -d "form=demo&name=T&email=t@t.com&company=T"
```

`303` görmüyorsan bu göreve başlama.

**Files:**
- Modify: `index.html` (demo formu)
- Modify: `contact.html` (iletişim formu)
- Modify: `assets/css/main.css` (**sonuna**, geri bildirim şeridi)

**Interfaces:**
- Consumes: `POST https://app.mailmyra.com/api/leads` (Plan 1 Task 5) — alanlar: `form`, `name`, `email`, `company`, `team_size`|`seats`, `platform`, `job_title`, `company_url`, `message`, `segment`, `consent`, `website` (honeypot)

- [ ] **Step 1: Demo formunu bağla**

`index.html`, `<form id="mailmyra-demo-form" action="assets/mail.php" method="POST">` satırını değiştir:

```html
<form id="mailmyra-demo-form" action="https://app.mailmyra.com/api/leads" method="POST">
    <input type="hidden" name="form" value="demo">
    <p class="mm-form-note" data-form-note hidden role="status" aria-live="polite"></p>
    <!-- Honeypot: gerçek ziyaretçi göremez, bot doldurur. Sunucu doluysa
         talebi sessizce yok sayar. `tabindex`/`autocomplete` ekran okuyucu
         ve şifre yöneticisinin alana takılmaması için. -->
    <div class="mm-hp" aria-hidden="true">
        <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
    </div>
```

Mevcut `<p class="ajax-response mt-10"></p>` satırını **sil** (tema kalıntısı, karşılığı yok).

- [ ] **Step 2: İletişim formunu bağla**

`contact.html`, `<form class="mm-ct-form__body" id="mm-contact-form" novalidate>` satırını değiştir:

```html
<form class="mm-ct-form__body" id="mm-contact-form" action="https://app.mailmyra.com/api/leads" method="POST">
    <input type="hidden" name="form" value="contact">
    <p class="mm-form-note" data-form-note hidden role="status" aria-live="polite"></p>
    <div class="mm-hp" aria-hidden="true">
        <label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
    </div>
```

`novalidate` **kaldırıldı**: tarayıcı doğrulaması artık işe yarıyor, çünkü form gerçekten gönderiliyor.

- [ ] **Step 3: `preventDefault()` çağrısını kaldır**

`contact.html:1499` civarındaki sayfa script'inde şu iki satırı **sil** — formu ölü tutan tek şey buydu:

```js
        var form = document.getElementById('mm-contact-form');
        if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });
```

- [ ] **Step 4: Geri bildirim script'ini ekle**

Her iki sayfada, formun bulunduğu bölümün sonundaki `<script>` bloğuna ekle. Desen `login.html`'deki mevcut `?error=` okuyucusunun aynısı — kod makine tarafı, metin sitenin tarafı, `textContent` (asla `innerHTML`):

```js
/* Uç, form gönderimini 303 ile buraya geri yollar: başarıda `?sent=1`,
   hatada `?error=<kod>`. Metin burada seçilir (login.html'deki aynı desen).
   `textContent`: kod query'den geliyor, asla innerHTML'e verilmez. */
(function () {
    var note = document.querySelector('[data-form-note]');
    if (!note) return;

    var MESSAGES = {
        missing_fields: 'Please fill in your name, work email and company.',
        consent_required: 'Please tick the box so we may reply to you.',
        rate_limited: 'Too many messages from this connection. Please try again later.',
        server_error: 'Something went wrong on our side. Please try again, or email hello@mailmyra.com.'
    };

    var params = new URLSearchParams(window.location.search);

    if (params.get('sent') === '1') {
        note.textContent = 'Thanks — your message is on its way. We reply on weekdays, Konya time (GMT+3).';
        note.className = 'mm-form-note is-ok';
        note.hidden = false;
    } else {
        var code = params.get('error');
        if (!code) return;
        note.textContent = MESSAGES[code] || 'Something went wrong. Please try again.';
        note.className = 'mm-form-note is-error';
        note.hidden = false;
    }
})();
```

- [ ] **Step 5: CSS'i main.css'in SONUNA ekle**

```css
/* ── Form geri bildirimi ve honeypot ───────────────────────────────────
   Şerit, uçtan 303 ile dönen `?sent=1` / `?error=` durumunu gösterir.
   Honeypot ekranda görünmez ama `display:none` DEĞİL — bazı botlar gizli
   alanları atlar; ekran dışına alınıp erişilebilirlik ağacından çıkarılır. */
.mm-form-note { margin: 0 0 18px; padding: 12px 18px; border-radius: 10px; font: 500 15px/1.5 inherit; }
.mm-form-note.is-ok { border: 1px solid currentColor; }
.mm-form-note.is-error { border: 1px solid currentColor; opacity: .95; }

.mm-hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
```

Damgayı yine bump et (Task 2 Step 2'deki komut).

- [ ] **Step 6: `mail.php`'yi sil**

Artık kullanılmıyor ve alıcısı tema yazarının Gmail adresi (`assets/mail.php:76` → `mdsalim400@gmail.com`).

```bash
git rm assets/mail.php
grep -rn "mail\.php" *.html || echo "referans kalmadı"
```

- [ ] **Step 7: Uçtan uca doğrula**

`index.html`'i tarayıcıda aç, demo formunu doldur, gönder. Beklenen: `https://mailmyra.com/index.html?sent=1#mailmyra-demo-form` adresine dönülür ve yeşil şerit görünür. Sonra `/admin/growth/leads` ekranında satırın düştüğünü doğrula.

Aynısını `contact.html` için tekrarla; onay kutusunu **işaretlemeden** gönderip `?error=consent_required` şeridini de gör.

- [ ] **Step 8: Commit**

```bash
git add index.html contact.html assets/css/main.css *.html
git rm --cached assets/mail.php 2>/dev/null; git add -A
git commit -m "feat(forms): send demo and contact enquiries to the product"
```

---

### Task 5: Ücretsiz plan kartı → deneme kartı

**Files:**
- Modify: `index.html` (~satır 2005-2060)

- [ ] **Step 1: Kırmızıyı gör**

```bash
node scripts/audit.mjs --only=claims | grep -E "Free forever|Mailmyra Free|Mailmyra badge"
```

Beklenen: 3 ihlal.

- [ ] **Step 2: Kart içeriğini gerçeğe çevir**

`index.html`'deki "Mailmyra Free" kartında **yalnız metin ve rakam** değişir; yerleşim, sınıflar ve kartın kendisi **korunur** (bölüm kurmak Hüseyin'in işi):

| Şu an | Olacak |
|---|---|
| `Mailmyra Free` | `Free trial` |
| `Email signature essentials` | `The full product for 7 days` |
| `Free forever` (rozet) | `No card required` |
| `Build your first<br>polished signature.` | `Try everything<br>before you pay.` |
| `Design, preview and export a professional signature without entering payment details.` | `The builder and the live preview are open to everyone. Exporting needs an account — and the trial gives you the full product for seven days, with no card.` |
| `$0` / `forever` | `7` / `days free` |
| `Build for free` (düğme ×2) | `Start the 7-day trial` |
| `1 active sender` | `Full product access` |
| `1 active signature` | `Unlimited drafts` |
| `Basic builder and export` | `Rich HTML and .htm export` |
| `Mailmyra badge included` | `No card required` |
| `Community support` | `Cancel by doing nothing` |
| Düğme hedefi `…/builder` | `https://app.mailmyra.com/register` |

`aria-label="Select Mailmyra Free"` → `aria-label="Select the free trial"`.

- [ ] **Step 3: Bölümün üst metnini hizala**

Aynı sayfada `Start free, then move to one clear annual price when you are ready to manage more senders.` → `Try the full product for seven days, then move to one clear annual price of $1 per active sender.`

- [ ] **Step 4: Denetimi koş**

```bash
node scripts/audit.mjs --only=claims | grep -E "Free forever|Mailmyra Free|Mailmyra badge" || echo "temiz"
```

Beklenen: `temiz`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "fix(pricing): replace the invented free plan with the real trial"
```

---

### Task 6: Directory sync bölümlerini kaldır → CSV

Kapsam dışı ve yasak listesinde kalıyor; "Yakında" bile denmez (Hüseyin kararı). Yerine gerçek olan CSV içe aktarma anlatılır.

**Files:**
- Modify: `index.html`, `how-it-works.html`, `product.html`, `solutions.html`, `features.html`

- [ ] **Step 1: Kırmızıyı ölç**

```bash
node scripts/audit.mjs --only=claims | grep -E "Directory|Profile sync|employees synced"
```

- [ ] **Step 2: Rozet ve etiketleri değiştir**

| Dosya | Şu an | Olacak |
|---|---|---|
| `index.html` | IT & Admin sekmesi: `Directory sync` | `CSV import` |
| `index.html` | `People & HR — Details stay current.` / `Sync every role and profile automatically.` | `People & HR — Details stay current.` / `Bring every role and profile in from one CSV file.` |
| `solutions.html` | `Directory ready` | `CSV import` |
| `solutions.html` | `Profile sync` | `CSV import` |
| `features.html` | "Connect" akışındaki `Microsoft 365` / `Google Workspace` kutuları | `CSV file` / `Seat list` |

- [ ] **Step 3: "01. Connect your team" adımını gerçeğe çek**

`how-it-works.html` ve `product.html`'de **aynı blok** var. İkisinde de:

- `128 employees synced` → `Seats imported from CSV`
- Microsoft 365 / Google Workspace logolarının bulunduğu görsel kutu → CSV kutusu (görsel yoksa metin kutusuna indirgenir; **yeni görsel üretilmez**)
- Madde listesi `Central employee list · CSV import · Seat management` **doğru, aynen kalır**

⚠️ İki dosyada da aynı düzeltme yapılmalı — biri atlanırsa denetim yakalar.

- [ ] **Step 4: Denetimi koş**

```bash
node scripts/audit.mjs --only=claims | grep -E "Directory|Profile sync|employees synced" || echo "temiz"
```

Beklenen: `temiz`.

- [ ] **Step 5: Commit**

```bash
git add index.html how-it-works.html product.html solutions.html features.html
git commit -m "fix(copy): replace directory-sync claims with the CSV import we actually ship"
```

---

### Task 7: Kampanya ve ölçüm bölümlerine "Yakında"

⚠️ **Task 2 onaylanmadan başlama.**

**Files:**
- Modify: `index.html`, `product.html`, `solutions.html`

- [ ] **Step 1: Kırmızıyı ölç**

```bash
node scripts/audit.mjs --only=coming-soon
```

- [ ] **Step 2: İşareti uygula**

Her bölümün kök elemanına `mm-soon`, içerik sarmalayıcısına `mm-soon__body`, en üste `<span class="mm-soon__flag">Coming soon</span>`:

| Dosya | Bölüm |
|---|---|
| `index.html` | "Built for every team" → Marketing sekmesi (Scheduled banners · Trackable CTA · Live updates) |
| `index.html` | "Built for every team" → Sales sekmesindeki `Click insights` |
| `index.html` | "Performance — Measure banner clicks, CTA performance and active campaigns" |
| `index.html` | "Designed to travel" → `Campaign banners — Turn email into a channel` |
| `product.html` | `04 / Campaigns` (Task 2'de zaten uygulandı — doğrula) |
| `product.html` | `06 / Insights` |
| `product.html` | `Reporting live` ve `Schedule once. Publish together.` |
| `solutions.html` | Marketing sekmesi (Campaign control) |
| `solutions.html` | Sales sekmesindeki `Click insights` |

- [ ] **Step 3: SSS maddesini dürüstleştir**

`index.html`, `product.html` ve `how-it-works.html`'de **aynı** SSS maddesi var:

> **Can campaign banners be updated centrally?**
> Campaign content can be prepared once and kept consistent across selected senders…

Cevabı bugünkü gerçekle değiştir (üçünde de aynı metin):

> Today you can put one call to action in your brand settings and it applies to every signature that uses it. Scheduled campaign banners are on the roadmap, not in the product yet.

- [ ] **Step 4: Footer "Campaigns" başlığını işaretle**

`fix-links.mjs`'in hedefi düzelttiği bağlantının etiketi `Campaigns` → `Campaigns (soon)`.

- [ ] **Step 5: Denetimi koş**

```bash
node scripts/audit.mjs --only=coming-soon
```

Beklenen: kampanya/ölçüm satırlarında **0 ihlal** (white-label ve teams satırları Task 8'de kapanır).

- [ ] **Step 6: Commit**

```bash
git add index.html product.html solutions.html how-it-works.html
git commit -m "feat(copy): mark campaign and CTA-measurement sections as coming soon"
```

---

### Task 8: Agency, white-label ve takım/departman → "Yakında" + fiyat tablosu

⚠️ Fiyat tablosunda **"Included" YAZILMAZ** (Hüseyin kararı: *"orası pazarlama değil, satın alma vaadidir"*).

**Files:**
- Modify: `solutions-agencies.html`, `solutions.html`, `how-it-works.html`, `product.html`, `pricing.html`

- [ ] **Step 1: Kırmızıyı ölç**

```bash
node scripts/audit.mjs --only=coming-soon | grep -E "White-label|Pooled|departments|blocks"
```

- [ ] **Step 2: Bölümleri işaretle**

| Dosya | Bölüm |
|---|---|
| `solutions-agencies.html` | "Complete Agency toolkit" · "Everything included" · "Three delivery layers" — izole çalışma alanı, pooled senders, white-label, Campaign control, Approval flow |
| `solutions.html` | `[ 03 ] For multiple clients` bloğu |
| `how-it-works.html` + `product.html` | `03. Assign & organise` → `Teams & departments` · `Multiple designs` |
| `how-it-works.html` + `product.html` | `Smart assignments` (departman bazlı kısım) · `Flexible signature blocks` |

- [ ] **Step 3: Fiyat tablosunu düzelt — `pricing.html`**

⚠️ **`build-pricing-page.py` KOŞMA.** Elle düzenle.

Agency sütununda `Included` yazan **üç satır**:

| Satır | Şu an | Olacak |
|---|---|---|
| `Isolated client organisations` | `Included` | `Coming soon` |
| `White-label the workspace` | `Included` | `Coming soon` |
| `Seats pooled across clients` | `Included` | `Coming soon` |

Hücreye `mm-soon__flag` sınıfı verilir ki tabloda da fark edilsin.

- [ ] **Step 4: Karşılaştırma tablosundaki önizleme satırı**

`Preview per inbox` satırı Task 9'da ele alınıyor — burada dokunma.

- [ ] **Step 5: Denetimi koş**

```bash
node scripts/audit.mjs --only=coming-soon
```

Beklenen: **0 ihlal**.

- [ ] **Step 6: Fiyat tablosunda kalan "Included" satırlarının hepsinin gerçek olduğunu doğrula**

```bash
grep -c "Included" pricing.html
```

Kalan her satırı tek tek gözden geçir: `Unlimited`, `Brand controls`, `Legal disclaimer line`, `Copy as rich HTML`, `.htm` indirme, kurulum rehberleri — hepsi üründe **var**. Olmayan bir satır kalırsa düzelt.

- [ ] **Step 7: Commit**

```bash
git add solutions-agencies.html solutions.html how-it-works.html product.html pricing.html
git commit -m "feat(copy): mark agency and team-structure features as coming soon"
```

---

### Task 9: Six-client preview → "6 istemcide test edilmiş"

Özellik iddiası kalite iddiasına döner (Hüseyin kararı). 10 yer.

**Files:**
- Modify: `features.html`, `product.html`, `pricing.html`, `index.html`, `solutions.html`, `login.html`, `register.html`, `templates.html`

- [ ] **Step 1: Kırmızıyı ölç**

```bash
node scripts/audit.mjs --only=claims | grep -i preview
```

- [ ] **Step 2: Metinleri değiştir**

| Dosya | Şu an | Olacak |
|---|---|---|
| `features.html` | `05 Six-client preview` / `Outlook Classic, New Outlook, Gmail web, Gmail mobile, Apple Mail and iOS Mail, side by side.` | `05 Tested in six clients` / `Every template is checked in Outlook Classic, New Outlook, Gmail web, Gmail mobile, Apple Mail and iOS Mail before it ships.` |
| `pricing.html` | `Preview per inbox` / `See the signature as Outlook, Gmail and Apple Mail will render it before you send it.` | `Tested in six clients` / `Every template is checked in the six major clients before it ships, so the layout holds where your recipients read it.` |
| `pricing.html` | `Inbox previews` / `Check the major email clients.` | `Tested in six clients` / `Checked before it ships.` |
| `product.html` | `Preview` / `Inspect the same signature inside the inboxes your recipients actually use before anything is exported.` | `Verified` / `Every template is checked in the six major clients before it ships — the live preview in the builder shows you the result as you type.` |
| `product.html` | `03 / Inbox proof` / `6 checked` / `Preview where people read it.` | `03 / Inbox proof` / `6 tested` / `Checked where people read it.` |
| `index.html` | `STEP 03 · PREVIEW` / `Preview everywhere` / `One signature, six major clients — Outlook, Gmail, Apple Mail and more, checked pixel for pixel.` | `STEP 03 · PREVIEW` / `Watch it as you type` / `The live preview shows the finished signature while you build — and every template is tested in six major clients before it ships.` |
| `solutions.html` | `Six inbox previews` | `Tested in six clients` |
| `login.html` | `Live inbox previews` | `Live preview` |
| `register.html` | `Preview` / `Six email clients` | `Preview` / `Live, as you type` |
| `templates.html` | `06 clients` | `06 clients tested` |

⚠️ **`Pixel-perfect in 6 clients` rozetine DOKUNMA** — Hüseyin kararı.

- [ ] **Step 3: Denetimi koş**

```bash
node scripts/audit.mjs --only=claims | grep -i preview || echo "temiz"
```

Beklenen: `temiz`.

- [ ] **Step 4: Commit**

```bash
git add features.html product.html pricing.html index.html solutions.html login.html register.html templates.html
git commit -m "fix(copy): sell the six-client test matrix, not a preview screen we do not have"
```

---

### Task 10: "No tracking" sözünün kapsamı

Söz **kalır**, kapsamı netleşir (Hüseyin kararı). CLAUDE.md'ye işlenen kalıcı söz: *"gönderdiğin imzanın içine gizli piksel veya sayacı BİZ koymayız"*; gelecekteki CTA ölçümü ancak **açık opt-in** ve görünür bir özellik olarak gelebilir.

**Files:**
- Modify: `features.html`, `pricing.html`, `faq.html`

- [ ] **Step 1: `features.html` — "What Mailmyra will not do"**

`No tracking` / `No open pixels, no click tracking hidden inside the signatures you send.`
→
`No hidden tracking` / `We never put an invisible pixel or counter inside the signature you send. If we ever measure a call to action, it will be something you switch on and can see — never something added behind your back.`

- [ ] **Step 2: `pricing.html` — 12 maddelik liste**

`No tracking` / `No pixels, no click counters, no analytics quietly added to what you export.`
→
`No hidden tracking` / `Nothing invisible is added to what you export. Any future measurement will be opt-in and visible to you.`

- [ ] **Step 3: `faq.html` — SSS cevabı**

`Do you track who opens or clicks my signature?` cevabı:
→
`No. There are no tracking pixels, no click counters and no analytics injected into what you export today, and nothing is ever added without you switching it on. Measuring a call to action is on the roadmap — as a feature you turn on and can see, not as something hidden in the signature.`

- [ ] **Step 4: Tutarlılığı gözle doğrula**

Task 7'nin "Yakında" işaretli kampanya bölümleriyle bu üç metin çelişmemeli: biri "asla" demiyor, diğeri "yakında" diyor — ikisi de "gizli asla, açık belki" diyor.

- [ ] **Step 5: Commit**

```bash
git add features.html pricing.html faq.html
git commit -m "fix(copy): narrow the tracking promise instead of dropping it"
```

---

### Task 11: Şablon galerisi

**Files:**
- Modify: `templates.html`, `templates-teams.html`, `templates-professionals.html`, `templates-agencies.html`
- Modify: `faq.html`
- Add: `assets/img/mailmyra/templates/*.png` (renderer çıktısından)
- Delete: eski 3 mockup PNG

**Interfaces:**
- Consumes: `packages/renderer/out/*.htm` (monorepo, `emit-htm` üretiyor) ve `/builder?template=<id>` (Plan 1 Task 6)

- [ ] **Step 1: Kırmızıyı ölç**

```bash
node scripts/audit.mjs --only=claims | grep -iE "split|executive|campaign ready|identity|minimal|profile|mark"
```

Beklenen: 12 uydurma ad.

- [ ] **Step 2: Gerçek çıktıdan görsel üret**

Önce `.htm` dosyalarını üret (script adı `emit`, `emit-htm` değil):

```bash
cd ~/Desktop/mailmyra-work && npm run emit -w packages/renderer && ls packages/renderer/out/*.htm
```

Beklenen: 24 dosya (6 şablon × 4 varyant). Her şablonun **medium** varyantı kullanılır.

Ekran görüntüsü için bağımlılık kurma — sistem Chrome'u başsız kipte doğrudan PNG yazabilir (`shoot-builder.mjs`in "150MB tarayıcı indirme" kararının aynı gerekçesi):

```bash
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT=~/Desktop/mailmyra\ edit/assets/img/mailmyra/templates
cd ~/Desktop/mailmyra-work/packages/renderer/out

for id in classic-horizontal stacked-minimal card-bordered divider-columns photo-first cta-banner; do
  src=$(ls | grep "^${id}" | grep -i medium | head -1)
  [ -z "$src" ] && { echo "✗ $id için .htm bulunamadı"; continue; }
  "$CHROME" --headless --disable-gpu --hide-scrollbars \
    --default-background-color=ffffff --window-size=640,420 \
    --screenshot="$OUT/$id.png" "file://$PWD/$src"
  echo "✓ $id.png  <- $src"
done
```

Sonra boyutları politikaya indir (uzun kenar max **600px**, PNG):

```bash
cd ~/Desktop/mailmyra\ edit/assets/img/mailmyra/templates
for f in *.png; do sips --resampleHeightWidthMax 600 "$f" >/dev/null; done
ls -la *.png
```

Altı dosya olmalı: `classic-horizontal.png` · `stacked-minimal.png` · `card-bordered.png` · `divider-columns.png` · `photo-first.png` · `cta-banner.png`. Her birini gözle aç ve gerçekten imzayı gösterdiğini doğrula — boş ya da yarım kare varsa `--window-size` değerini büyüt ve o şablonu tekrar çek.

- [ ] **Step 3: `templates.html`'i gerçek şablonlara çevir**

Üç slayt yerine altı şablon. Her slaytta:
- Başlık = builder sözlüğündeki İngilizce ad: `Classic horizontal` · `Stacked minimal` · `Card bordered` · `Divider columns` · `Photo first` · `CTA banner`
- Görsel = Step 2'de üretilen PNG
- Bağlantı = `https://app.mailmyra.com/builder?template=<id>`
- Sayaç `/ 03` → `/ 06`, nokta (dot) düğmeleri 3 → 6

Açıklama metinleri, gerçek şablonların yaptığı işi anlatmalı (uydurma değil):

| id | Ad | Açıklama |
|---|---|---|
| `classic-horizontal` | Classic horizontal | An identity column beside the contact details. The safest structure in Outlook, and the one most people start from. |
| `stacked-minimal` | Stacked minimal | A single column that never has to reflow. Built for recipients who read on a phone. |
| `card-bordered` | Card bordered | A bordered card that holds its shape against the surrounding message, with room for a call to action. |
| `divider-columns` | Divider columns | Logo and photo on the left, a 2px brand rule separating the contact block. Made for companies with a strict identity. |
| `photo-first` | Photo first | A large round portrait leads, the name sits a step bigger, the logo closes it. Outlook squares the circle — that is expected. |
| `cta-banner` | CTA banner | A compact identity above a full-width brand band, for the one link every message should carry. |

- [ ] **Step 4: "Gerçek çıktı" iddiasını doğru hâle getir**

`templates.html`'deki *"REAL OUTPUT, NOT SCREENSHOTS … rendered live in its own frame"* cümlesi artık **kısmen** doğru: görseller gerçek çıktıdan üretiliyor ama canlı iframe değil. Metni buna göre düzelt:

> Every template on this page is rendered by the same engine that writes the signature you copy — the same table-based HTML, not a designer's mockup.

- [ ] **Step 5: Üç hedef kitle sayfasını düzelt**

`templates-teams.html`, `templates-professionals.html`, `templates-agencies.html` — her birindeki 3 uydurma ad, gerçek altı şablondan seçilen üçüyle değiştirilir (sayfanın kitlesine uygun olan). *"These are working structures, not screenshots."* cümlesi Step 4'teki ifadeyle aynı şekilde düzeltilir.

- [ ] **Step 6: Mega menüdeki aynı iddiayı düzelt — 30 sayfa**

`Real renders, not screenshots.` cümlesi **her sayfanın mega menüsünde ikişer kez** geçiyor (masaüstü + mobil), yalnız `templates.html`de değil. Step 4'teki ifadeyle hizalanır:

```bash
python3 - <<'PY'
import glob, pathlib
OLD = 'Real renders, not screenshots.'
NEW = 'Rendered by the engine that writes your signature.'
n = t = 0
for f in glob.glob('*.html'):
    p = pathlib.Path(f); s = p.read_text(encoding='utf-8')
    c = s.count(OLD)
    if c == 0: continue
    if c != 2:
        print(f'✗ {f}: {c} kez geçti, 2 bekleniyordu — dokunulmadı'); continue
    p.write_text(s.replace(OLD, NEW), encoding='utf-8'); n += 1; t += c
print(f'{n} dosya, {t} yer güncellendi')
PY
```

Beklenen: `30 dosya, 60 yer güncellendi`, hiç `✗` yok.

⚠️ **Aynı cümle panelin nav'ında da var** (`apps/web/components/nav/menu-data.ts:87`) — o monorepo'da ve **Plan 1 Task 7**'de düzeltiliyor. İkisi birlikte gitmezse panel ile site çelişir.

- [ ] **Step 7: `faq.html`'deki şablon sayısını düzelt**

- `How many templates are there?` → `Three: …` yerine altı şablon, gerçek adlarıyla
- `Does it work on phones?` → `One of the three is single-column by design` → `One of the six is single-column by design`

- [ ] **Step 8: Eski mockup'ları sil**

```bash
git rm assets/img/mailmyra/templates/template-modern.png \
       assets/img/mailmyra/templates/template-executive.png \
       assets/img/mailmyra/templates/template-campaign.png
```

- [ ] **Step 9: Denetimi koş**

```bash
node scripts/audit.mjs --only=claims,missing-assets
```

Beklenen: uydurma şablon adı ve eksik görsel **0**.

- [ ] **Step 10: Bağlantıların çalıştığını doğrula**

Altı `?template=` bağlantısını tek tek aç; her biri builder'da doğru şablonla gelmeli (Plan 1 Task 6 canlıda olmalı).

- [ ] **Step 11: Commit**

```bash
git add templates*.html faq.html assets/img/mailmyra/templates
git commit -m "fix(templates): show the six real templates instead of three invented ones"
```

---

### Task 12: Sayı ve metin düzeltmeleri

**Files:**
- Modify: `faq.html`, `features.html`, `how-it-works.html`, `solutions-agencies.html`, `contact.html`, `security.html`

- [ ] **Step 1: Kırmızıyı ölç**

```bash
node scripts/audit.mjs --only=claims | grep -E "PostgreSQL|Seven fonts|000 00 00|font"
```

- [ ] **Step 2: Düzelt**

| Dosya | Şu an | Olacak |
|---|---|---|
| `faq.html` | `in our own PostgreSQL database` | `in our own MariaDB database` |
| `features.html` | `Seven fonts that render identically in every client.` | `Six font families that render identically in every client.` |
| `how-it-works.html` | istatistik şeridinde `7` / `web-safe fonts` | `6` / `web-safe fonts` |
| `faq.html` | `Arial, Helvetica, Georgia, Times New Roman, Verdana, Tahoma and Trebuchet MS` | `Arial, Georgia, Times New Roman, Verdana, Tahoma and Trebuchet MS` |
| `solutions-agencies.html` | mock kartta `3 templates` | `6 templates` |
| `security.html` | `Konya, Türkiye` | `Konya, Turkiye` (diğer legal sayfalarla aynı yazım) |

- [ ] **Step 3: Yer tutucu telefonu ele al**

`contact.html`'deki `+90 332 000 00 00`. **Hüseyin gerçek numarayı verdiyse** onu yaz; vermediyse satırı **kaldır** (varsayılan karar — yer tutucu numara canlıda kalmaz).

- [ ] **Step 4: Denetimi koş**

```bash
node scripts/audit.mjs --only=claims
```

Beklenen: **0 ihlal**.

- [ ] **Step 5: Commit**

```bash
git add faq.html features.html how-it-works.html solutions-agencies.html contact.html security.html
git commit -m "fix(copy): correct the template, font, database and contact facts"
```

---

### Task 13: `/works-with` yinelenen sayfasını kapat

`works-with.html` ve `compatibility.html` **birebir aynı dosya** (aynı md5, ikisinin de başlığı "Works with"). `/compatibility`ye 436, `/works-with`e 8 iç bağlantı var.

⚠️ **`web.config` tek başına ve ÖNCE denenir.** 2026-07-27'de yanlış bir config bu siteyi 0 baytlık 500'e düşürdü. Plesk bazı işlemlerde bu dosyayı yeniden üretip bloğu siliyor.

**Files:**
- Modify: `web.config`
- Delete: `works-with.html`
- Modify: 8 iç bağlantı taşıyan sayfalar

- [ ] **Step 1: Kuralı ekle**

`web.config` içindeki `<rewrite><rules>` bloğunda, **`^(.+)\.html$` kuralından ÖNCE**:

```xml
        <rule name="works-with-to-compatibility" stopProcessing="true">
          <match url="^works-with(\.html)?$" />
          <action type="Redirect" url="/compatibility" redirectType="Permanent" />
        </rule>
```

- [ ] **Step 2: YALNIZ web.config'i yükle ve canlıda doğrula**

İçeriği henüz yükleme. Yükledikten sonra:

```bash
curl -s -o /dev/null -w "kök %{http_code}\n" https://mailmyra.com/
curl -s -o /dev/null -w "works-with %{http_code} -> %{redirect_url}\n" https://mailmyra.com/works-with
curl -s -o /dev/null -w "compatibility %{http_code}\n" https://mailmyra.com/compatibility
curl -s -o /dev/null -w "pricing %{http_code}\n" https://mailmyra.com/pricing
```

Beklenen: kök **200** · works-with **301 → /compatibility** · compatibility **200** · pricing **200**.

⚠️ Kök **500** dönerse (özellikle gövdesi 0 bayt): bölüm kilitli. `web.config`i **hemen geri al**, bu görevi durdur, Hüseyin'e bildir. Kalan görevler bundan bağımsız ilerler.

- [ ] **Step 3: 8 iç bağlantıyı çevir**

```bash
python3 - <<'PY'
import glob, pathlib
n = 0
for f in glob.glob('*.html'):
    p = pathlib.Path(f); s = p.read_text(encoding='utf-8'); before = s
    s = s.replace('href="/works-with"', 'href="/compatibility"')
    if s != before: p.write_text(s, encoding='utf-8'); n += 1
print(f'{n} dosya')
PY
grep -rn 'works-with' *.html || echo "referans kalmadı"
```

- [ ] **Step 4: Dosyayı sil**

```bash
git rm works-with.html
```

- [ ] **Step 5: Denetimi koş**

```bash
node scripts/audit.mjs
```

Beklenen: `missing-pages` **0** (silinen sayfaya bağlantı kalmamalı).

- [ ] **Step 6: Commit**

```bash
git add web.config *.html
git commit -m "fix(seo): fold /works-with into /compatibility with a permanent redirect"
```

---

### Task 14: `robots.txt` ve `sitemap.xml`

İkisi de şu an **404**.

**Files:**
- Create: `robots.txt`, `sitemap.xml`
- Create: `scripts/build-sitemap.mjs`

- [ ] **Step 1: Sitemap üreticisini yaz**

Create `scripts/build-sitemap.mjs`:

```js
#!/usr/bin/env node
/**
 * Sitemap'i diskteki sayfalardan üretir — elle bakım yapılmaz, sayfa
 * eklendiğinde tekrar koşulur.
 *
 * `noindex` taşıyan sayfalar DIŞARIDA kalır: kurulum rehberlerinin 26
 * karesi hâlâ yer tutucu ve boş kutuların indekslenmesi istenmiyor
 * (kareler gelince `noindex` kalkar, script tekrar koşar ve kendiliğinden
 * girerler). Silinen `works-with` da doğal olarak listede olmaz.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const ORIGIN = 'https://mailmyra.com';
const pages = readdirSync('.').filter((f) => f.endsWith('.html')).sort();

const urls = [];
for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  if (/<meta\s+name="robots"[^>]*noindex/i.test(html)) continue;
  const slug = file === 'index.html' ? '' : `/${file.slice(0, -5)}`;
  urls.push(`${ORIGIN}${slug || '/'}`);
}

const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
writeFileSync(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`,
  'utf8',
);
console.log(`${urls.length} adres yazıldı (${pages.length - urls.length} sayfa noindex olduğu için atlandı).`);
```

- [ ] **Step 2: Koş**

```bash
node scripts/build-sitemap.mjs
```

Beklenen: `24 adres yazıldı (5 sayfa noindex olduğu için atlandı).` (Task 13 sonrası 29 sayfa, 5'i `noindex`.)

- [ ] **Step 3: `robots.txt` yaz**

```
User-agent: *
Allow: /

Sitemap: https://mailmyra.com/sitemap.xml
```

- [ ] **Step 4: Denetimi koş — tam yeşil**

```bash
node scripts/audit.mjs
```

Beklenen: `✓ 29 sayfa denetlendi, ihlal yok.`

- [ ] **Step 5: Commit**

```bash
git add robots.txt sitemap.xml scripts/build-sitemap.mjs
git commit -m "feat(seo): add robots.txt and a generated sitemap"
```

---

## Plan sonu: yayına alma

⚠️ **Sıra keyfi değil** — `web.config` içerikten ÖNCE ve TEK BAŞINA denenir (Task 13 Step 2). O adım geçtiyse:

1. 29 sayfa + `assets/` + `robots.txt` + `sitemap.xml` yüklenir. **`scripts/`, `.git/` ve `.DS_Store` GİRMEZ.**
2. `assets/mail.php` sunucudan da **silinir** (Task 4'te repodan silindi).
3. `works-with.html` sunucudan **silinir**.

Yayın sonrası dış duman:

```bash
for p in / /pricing /templates /contact /setup /faq /compatibility; do
  echo -n "$p -> "; curl -s -o /dev/null -w "%{http_code}\n" "https://mailmyra.com$p"
done
curl -s -o /dev/null -w "works-with %{http_code} -> %{redirect_url}\n" https://mailmyra.com/works-with
curl -s -o /dev/null -w "robots %{http_code}\n" https://mailmyra.com/robots.txt
curl -s -o /dev/null -w "sitemap %{http_code}\n" https://mailmyra.com/sitemap.xml
curl -s -o /dev/null -w "mail.php %{http_code}\n" https://mailmyra.com/assets/mail.php
```

Beklenen: sayfalar 200 · works-with 301 · robots ve sitemap 200 · `mail.php` **404**.

Sonra elle: anasayfadaki demo formunu gerçekten doldur, `?sent=1` şeridini gör, `/admin/growth/leads` ekranında satırın düştüğünü doğrula. Aynısını `/contact` için tekrarla.

**Envanterde kapanmayanlar** (bilinçli, Hüseyin kararı): uydurma referanslar ve 4.9/5 · "Pixel-perfect in 6 clients" rozeti · kurulum rehberi kareleri ve `noindex` · şablon başına ayrı URL (SEO maddesi, sonraki tur) · About sayfası.
