# İkon Rengi Ayrıştırma + Deploy Otomasyonu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Sosyal ikonların rengini marka renginden ayırıp kendi alanına almak, ve Mac'ten sunucuya tek komutla yükleme akışı kurmak.

**Architecture:** `SignatureData.visuals`'a tek yeni alan `iconColor` eklenir; `outline`/`mono` varyant yolları artık bu alandan anahtarlanır (brandColor'dan değil). Deploy tarafında `npm run deploy` temiz build alıp `.next` ağacını FTPS ile sunucuya yükler — zip açma adımı ortadan kalkar.

**Tech Stack:** TypeScript, Next.js, Vitest, sharp, basic-ftp.

## Global Constraints

- **Tek alan:** `visuals.iconColor` (zorunlu string, hex). `outlineColor`/`monoColor` diye İKİ ALAN AÇILMAZ — stil değişince renk korunmalı.
- Varsayılan `iconColor`: **`#7b9fd3`** (`BRAND.primary`).
- `filled` stili sabit platform renklerinde kalır; ona renk seçici ASLA eklenmez.
- CDN yol şeması değişmez: `filled` · `outline-<hex6>` · `mono-<hex6>`. Yalnız hex'in KAYNAĞI `brandColor` → `iconColor` olur.
- `brandColor` link ve CTA rengi olarak KALIR — kaldırılmaz, yalnız ikonlarla bağı kesilir.
- Export kilidi mantığı korunur ve `iconColor`'a döner: `exportDisabled = iconsNeeded && readyColor !== data.visuals.iconColor`. Senkron türetme (render gövdesinde) DEĞİŞMEZ.
- Düşük kontrast uyarısı `iconColor`'a göre hesaplanır.
- Eski taslaklarda `iconColor` yok → `mergeWithEmpty` varsayılanı doldurur (bölüm-bazlı spread zaten var).
- **Kimlik bilgisi sınırı:** deploy script'i sırları YALNIZ `.env.deploy`'dan okur. Bu dosya repoya GİRMEZ (`.gitignore`), içine örnek/gerçek şifre YAZILMAZ, commit'lenmez.
- npm: `npm test`, `npm run typecheck`, `npm run build` kökten. Commit mesajları İngilizce + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `iconColor` alanı ve renderer

**Files:**
- Modify: `packages/renderer/src/types.ts` (`visuals`)
- Modify: `packages/renderer/src/fixtures/samples.ts` (`baseVisuals`)
- Modify: `packages/renderer/src/templates/classic-horizontal.ts` (`variantPath`)
- Modify: `packages/renderer/test/classic-horizontal.test.ts`
- Modify: `apps/web/app/builder/reducer.ts` (`createEmptyData`)
- Modify: `apps/web/test/builder-reducer.test.ts`

**Interfaces:**
- Produces: `visuals.iconColor: string` — Task 2 builder'da bunu düzenler.

- [ ] **Step 1: Failing testler**

`packages/renderer/test/classic-horizontal.test.ts` — `keys outline and mono paths off brandColor...` testini şununla DEĞİŞTİR:

```ts
  it('keys outline and mono paths off iconColor, independently of brandColor', () => {
    const custom = {
      ...full,
      visuals: { ...full.visuals, brandColor: '#ff0000', iconColor: '#123456' },
      layout: { ...full.layout, iconStyle: 'outline' as const },
    };
    const html = classicHorizontal(custom, { iconBaseUrl: 'https://cdn.example.com' });
    expect(html).toContain('/icons/outline-123456/linkedin.png');
    expect(html).not.toContain('/icons/outline-ff0000/');
  });
```

`apps/web/test/builder-reducer.test.ts` — `createEmptyData` testine ekle:

```ts
    expect(d.visuals.iconColor).toBe('#7b9fd3');
```

ve `mergeWithEmpty`'nin "fills a partial/corrupt draft" testine ekle:

```ts
    expect(d.visuals.iconColor).toBe('#7b9fd3');
```

- [ ] **Step 2: Kırmızıyı doğrula**

Run: `npm test`
Expected: FAIL — `iconColor` tipte yok / undefined.

- [ ] **Step 3: Tipe ekle**

`packages/renderer/src/types.ts` — `visuals` içinde `brandColor` satırının ALTINA:

```ts
    /**
     * Sosyal ikonların rengi (outline + mono). brandColor'dan AYRIDIR:
     * kullanıcı ikon rengini bağımsız seçer (karar: 2026-07-27, Hüseyin).
     * `filled` stili bu alanı kullanmaz — o platform renklerinde sabittir.
     */
    iconColor: string;
```

- [ ] **Step 4: Varsayılanlar**

`apps/web/app/builder/reducer.ts` — `createEmptyData().visuals` içine `brandColor` satırının altına:

```ts
      iconColor: BRAND.primary,
```

`packages/renderer/src/fixtures/samples.ts` — `baseVisuals` içine:

```ts
  iconColor: BRAND.primary,
```

`baseVisuals`'ın `satisfies Pick<...>` listesine `'iconColor'` ekle.

- [ ] **Step 5: variantPath'i iconColor'a bağla**

`packages/renderer/src/templates/classic-horizontal.ts` — `brand` değişkeninin yanına ekle (mevcut `const brand = normalizeHex(...)` satırının altına):

```ts
  const iconHex = normalizeHex(data.visuals.iconColor);
```

ve `variantPath` ifadesindeki `brand.slice(1)` → `iconHex.slice(1)` yap.

- [ ] **Step 6: Yeşil + commit**

Run: `npm test && npm run typecheck`

```bash
git add -A && git commit -m "feat: give social icons their own colour field, split from brandColor"
```

---

### Task 2: Builder'da İkon rengi seçici

**Files:**
- Modify: `apps/web/app/builder/BuilderClient.tsx`
- Modify: `apps/web/app/builder/steps/StyleStep.tsx`

**Interfaces:**
- Consumes: `visuals.iconColor` (Task 1).

- [ ] **Step 1: BuilderClient'ı iconColor'a çevir**

`apps/web/app/builder/BuilderClient.tsx` içinde `data.visuals.brandColor` geçen **ikon hazırlığıyla ilgili TÜM** yerleri `data.visuals.iconColor` yap:
- effect içindeki skip karşılaştırması
- `const color = ...`
- effect bağımlılık dizisi
- `exportDisabled` karşılaştırması
- `iconLowContrast` türetmesi

`brandColor` bu dosyada başka bir yerde kullanılmıyorsa başka değişiklik gerekmez.

- [ ] **Step 2: StyleStep — seçiciyi ekle, ipucunu kaldır**

`apps/web/app/builder/steps/StyleStep.tsx`:

Renkler grubuna, `Marka rengi` seçicisinin ALTINA yeni bir alan ekle:

```tsx
        <ColorField
          label="İkon rengi"
          value={data.visuals.iconColor}
          onChange={(v) => dispatch({ type: 'patchVisuals', value: { iconColor: v } })}
        />
```

"İkon rengi yukarıdaki Marka rengi'nden gelir" ipucu bloğunun TAMAMINI SİL (artık yanlış — renk ayrı alandan geliyor). Yerine, İkon stili seçicisinin altına yalnız `filled` seçiliyken görünen bir not koy:

```tsx
        {data.layout.iconStyle === 'filled' && (
          <p style={{ fontSize: 13, color: '#666666', marginTop: 8 }}>
            Dolu stilde ikonlar platformların kendi renkleriyle basılır — İkon
            rengi bu stilde kullanılmaz.
          </p>
        )}
```

Düşük kontrast notunun koşulu aynı kalır (outline/mono + `iconLowContrast`).

- [ ] **Step 3: Yeşil + commit**

Run: `npm test && npm run typecheck && npm run build`

```bash
git add -A && git commit -m "feat(web): add a dedicated icon colour picker to the style step"
```

---

### Task 3: `npm run deploy` — build + FTPS yükleme

**Files:**
- Create: `scripts/deploy.js`
- Create: `.env.deploy.example`
- Modify: `package.json` (script + `basic-ftp` devDependency)
- Modify: `.gitignore` (`.env.deploy`)
- Modify: `docs/deploy-plesk-iisnode.md`

**Interfaces:**
- Produces: `npm run deploy` komutu.

- [ ] **Step 1: Bağımlılık**

```bash
npm i -D basic-ftp
```

- [ ] **Step 2: `.env.deploy.example`**

```
# Bu dosyayı .env.deploy olarak kopyala ve doldur. .env.deploy ASLA
# commit'lenmez (.gitignore'da). Şifreni kimseyle paylaşma.
DEPLOY_FTP_HOST=ftp.mailmyra.com
DEPLOY_FTP_USER=
DEPLOY_FTP_PASS=
# Sunucudaki hedef: apps/web klasörünün FTP yolu
DEPLOY_FTP_REMOTE=/httpdocs/apps/web
# FTPS zorunlu (düz FTP şifreyi ağda açık gönderir). Sunucu desteklemiyorsa
# false yapılabilir ama ÖNERİLMEZ.
DEPLOY_FTP_SECURE=true
```

`.gitignore`'a `.env.deploy` ekle.

- [ ] **Step 3: `scripts/deploy.js`**

```js
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
    try {
      await client.removeDir(remoteNext);
    } catch {
      // yoksa sorun değil
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
```

- [ ] **Step 4: package.json**

Kök `scripts`'e ekle:

```json
    "deploy": "node scripts/deploy.js",
```

- [ ] **Step 5: Doğrula (sırsız)**

Run: `npm run deploy`
Expected: `.env.deploy` yoksa açık mesajla exit 1 — sır gerektirmeden bu yol test edilebilir.

Run: `npm test && npm run typecheck`

- [ ] **Step 6: Rehber**

`docs/deploy-plesk-iisnode.md` — "B Planı" bölümünün başına ekle:

```markdown
**Otomatik yol (önerilen):** Mac'te `npm run deploy` — temiz build alır ve
`.next` ağacını FTPS ile sunucuya yükler; zip açma adımı YOKTUR. Öncesinde
Plesk'te uygulamayı DURDUR, sonrasında BAŞLAT (Windows çalışırken dosyaları
kilitler; bu iki adım Plesk Node.js eklentisi REST API'de açık olmadığı için
otomatikleştirilemedi). Sırlar `.env.deploy`'dan okunur — repoya girmez.
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: one-command build and FTPS deploy"
```

---

## Kontrol Noktası

1. Builder'da Marka rengi ve İkon rengi BAĞIMSIZ çalışmalı: marka kırmızı, ikon mavi olabilmeli.
2. `filled` seçiliyken ikon rengi notu çıkmalı, ikonlar platform renklerinde kalmalı.
3. `npm run deploy` sırsız çalıştırıldığında açık hata vermeli.
4. Gerçek deploy: durdur → `npm run deploy` → başlat → `/builder` kontrol.
