# Marka Kimliği ve İkon Renk Modeli — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Marka renklerini tek kaynaktan kilitlemek ve sosyal ikonları "stil başına tek renk seçici" modeline geçirmek — kontur artık marka rengine bağlı ve çerçeveli, degrade mantığı kalkıyor.

**Architecture:** Marka sabitleri `packages/renderer/src/brand.ts`'te tek kaynak; builder varsayılanı ve fixture'lar oradan okur. İkon üretimi `filled` (statik, platform renkleri) ile `outline-<hex6>` + `mono-<hex6>` (renge göre, on-demand) olarak ikiye ayrılır; tek uç nokta bir renk için iki seti birlikte üretir. Kontrast kuralı renk değiştirmez, yalnız uyarır.

**Tech Stack:** TypeScript, Next.js App Router, Vitest, sharp, simple-icons v13, npm workspaces.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-27-brand-identity-design.md` — çelişki olursa spec kazanır.
- Marka renkleri: `primary #7b9fd3` · `secondary #e0a66c`. Logo sabit, dokunulmaz.
- İkon rengi kaynağı **`visuals.brandColor`** — `SignatureData`'ya YENİ ALAN EKLENMEZ.
- `filled` stiline renk seçici ASLA eklenmez (platform tanınırlığı + marka hakları).
- **Renk asla değiştirilmez.** Degrade (`#666666`'ya düşürme) tamamen kaldırılır; yerine yalnız uyarı.
- Uyarı eşiği: `contrastRatio(brandColor, '#ffffff') < 3`.
- Export kilidi: `iconStyle` **outline veya mono** iken ve `social` doluyken dosyalar yazılana kadar export kapalı. Kopyalanan HTML'de asla henüz-yazılmamış ikon URL'i olamaz.
- E-posta HTML kuralları değişmez: table-based, inline CSS, çıktıda SVG yok, her `<img>` `width`; `/icons/` içeren her `<img>` `width` VE `height` taşır.
- Çerçeve PNG'ye rasterize edilir (CSS değil) — `border-radius` fallback'i GEREKMEZ.
- Komutlar npm: `npm test`, `npm run typecheck`, `npm run build`, tek workspace için `npm run <script> -w apps/web`. pnpm/corepack kullanma.
- Commit mesajları İngilizce, conventional; sonunda `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Marka sabitleri ve varsayılanlar

**Files:**
- Create: `packages/renderer/src/brand.ts`
- Modify: `packages/renderer/src/index.ts`
- Modify: `packages/renderer/src/fixtures/samples.ts` (`baseVisuals.brandColor`)
- Modify: `apps/web/app/builder/reducer.ts` (`createEmptyData`)
- Create: `apps/web/app/tokens.css`
- Modify: `apps/web/app/layout.tsx` (tokens.css import)
- Test: `apps/web/test/builder-reducer.test.ts`
- Test: `packages/renderer/test/classic-horizontal.test.ts` (yalnız renk sabitleri)

**Interfaces:**
- Produces: `BRAND` (`{ primary: '#7b9fd3'; secondary: '#e0a66c' }`) — `@mailmyra/renderer`'dan export edilir. Task 2–5 bunu kullanır.

- [ ] **Step 1: Failing test**

`apps/web/test/builder-reducer.test.ts` içinde `createEmptyData` testine ekle ve `mergeWithEmpty` testindeki `'#719ad1'` beklentilerini güncelle:

```ts
    expect(d.visuals.brandColor).toBe('#7b9fd3');
```

`mergeWithEmpty` bloğunda geçen `expect(d.visuals.brandColor).toBe('#719ad1');` satırını `toBe('#7b9fd3')` yap. (Dosyada `'#000000'` bekleyen "does not let a partial section shadow" testi DEĞİŞMEZ — o bilerek override ediyor.)

- [ ] **Step 2: Kırmızıyı doğrula**

Run: `npm run test -w apps/web -- builder-reducer`
Expected: FAIL — `expected '#719ad1' to be '#7b9fd3'`

- [ ] **Step 3: brand.ts oluştur**

`packages/renderer/src/brand.ts`:

```ts
/**
 * Marka renkleri — TEK KAYNAK (spec: 2026-07-27-brand-identity-design.md).
 *
 * Renderer paketinde durur çünkü hem apps/web hem fixture'lar bunu paylaşır
 * ve bu değerler `SignatureData`'ya giren alan verisidir. Sabittir, davranış
 * içermez — renderer saf kalır.
 *
 * Site arayüzü bunları `apps/web/app/tokens.css` üzerinden CSS değişkeni
 * olarak kullanır. E-posta HTML'inde CSS değişkeni ÇALIŞMAZ; orada daima
 * literal hex gider.
 */
export const BRAND = {
  primary: '#7b9fd3',
  secondary: '#e0a66c',
} as const;
```

- [ ] **Step 4: index.ts'ten export et**

`packages/renderer/src/index.ts` sonuna ekle:

```ts
export { BRAND } from './brand';
```

- [ ] **Step 5: Varsayılanları bağla**

`apps/web/app/builder/reducer.ts` — en üste import ekle ve `createEmptyData`'daki `brandColor` satırını değiştir:

```ts
import { BRAND, type SignatureData } from '@mailmyra/renderer';
```

```ts
      brandColor: BRAND.primary,
```

(Mevcut `import type { SignatureData } from '@mailmyra/renderer';` satırı yukarıdakiyle DEĞİŞTİRİLİR — iki ayrı import bırakma.)

`packages/renderer/src/fixtures/samples.ts` — import satırına `BRAND` ekle ve `baseVisuals.brandColor`'ı değiştir:

```ts
import { BRAND } from '../brand';
```

```ts
  brandColor: BRAND.primary,
```

- [ ] **Step 6: Site tokenları**

`apps/web/app/tokens.css` oluştur:

```css
/* Site arayüzü tasarım tokenları. YALNIZ web UI içindir —
   e-posta HTML'i CSS değişkeni kullanamaz, orada literal hex gider.
   Kaynak değerler: packages/renderer/src/brand.ts */
:root {
  --brand-primary: #7b9fd3;
  --brand-secondary: #e0a66c;

  --text: #333333;
  --text-muted: #666666;
}
```

`apps/web/app/layout.tsx` — dosyadaki mevcut importların altına ekle:

```tsx
import './tokens.css';
```

- [ ] **Step 7: Renderer testindeki renk sabitlerini güncelle**

Fixture brandColor değiştiği için `packages/renderer/test/classic-horizontal.test.ts` içinde `mono-719ad1` geçen ÜÇ satırı `mono-7b9fd3` yap. (Aynı dosyadaki `outline` varyant testi Task 2'de ele alınacak — şimdilik ona DOKUNMA; `outline` yolu henüz değişmediği için yeşil kalır.)

- [ ] **Step 8: Yeşili doğrula**

Run: `npm test && npm run typecheck`
Expected: exit 0, TÜM suite yeşil. Kırmızı kalan varsa dur ve bildir — bu task'ın kırmızı bırakması beklenmiyor.

- [ ] **Step 9: Commit**

```bash
git add packages/renderer/src/brand.ts packages/renderer/src/index.ts packages/renderer/src/fixtures/samples.ts packages/renderer/test/classic-horizontal.test.ts apps/web/app/builder/reducer.ts apps/web/app/tokens.css apps/web/app/layout.tsx apps/web/test/builder-reducer.test.ts
git commit -m "feat: lock brand colors as a single source and default brandColor"
```

---

### Task 2: Renderer — outline artık renge bağlı varyant

**Files:**
- Modify: `packages/renderer/src/templates/classic-horizontal.ts` (`variantPath`, ~satır 195)
- Modify: `packages/renderer/test/classic-horizontal.test.ts`

**Interfaces:**
- Consumes: `BRAND.primary` (Task 1) — fixture brandColor artık `#7b9fd3`.
- Produces: varyant yolu kuralı — `filled` → `filled`, `outline` → `outline-<hex6>`, `mono` → `mono-<hex6>` (hex6 = brandColor, küçük harf, `#`'siz).

- [ ] **Step 1: Failing test**

`packages/renderer/test/classic-horizontal.test.ts` içinde `maps filled/outline icon styles to their static variant paths` testinin TAMAMINI şununla değiştir. (Task 1 zaten `mono-719ad1` → `mono-7b9fd3` sabitlerini güncelledi; onlara tekrar dokunma.)

```ts
  it('maps icon styles to their variant paths (filled static, outline/mono color-keyed)', () => {
    const filled = classicHorizontal(
      { ...full, layout: { ...full.layout, iconStyle: 'filled' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(filled).toContain('/icons/filled/linkedin.png');

    const outline = classicHorizontal(
      { ...full, layout: { ...full.layout, iconStyle: 'outline' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(outline).toContain('/icons/outline-7b9fd3/linkedin.png');

    const mono = classicHorizontal(
      { ...full, layout: { ...full.layout, iconStyle: 'mono' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(mono).toContain('/icons/mono-7b9fd3/linkedin.png');
  });
  it('keys outline and mono paths off brandColor, not a fixed brand value', () => {
    const custom = {
      ...full,
      visuals: { ...full.visuals, brandColor: '#123456' },
      layout: { ...full.layout, iconStyle: 'outline' as const },
    };
    const html = classicHorizontal(custom, { iconBaseUrl: 'https://cdn.example.com' });
    expect(html).toContain('/icons/outline-123456/linkedin.png');
  });
```

- [ ] **Step 2: Kırmızıyı doğrula**

Run: `npm run test -w packages/renderer -- classic-horizontal`
Expected: FAIL — `outline` hâlâ `/icons/outline/linkedin.png` üretiyor.

- [ ] **Step 3: variantPath'i güncelle**

`packages/renderer/src/templates/classic-horizontal.ts` içindeki `const variantPath = ...` ifadesini şununla değiştir:

```ts
      // filled statiktir (platform renkleri); outline ve mono kullanıcının
      // brandColor'ına göre üretilir, bu yüzden yol renge anahtarlanır.
      const variantPath =
        data.layout.iconStyle === 'filled'
          ? 'filled'
          : `${data.layout.iconStyle}-${brand.slice(1)}`;
```

- [ ] **Step 4: Yeşili doğrula**

Run: `npm test && npm run typecheck`
Expected: exit 0, tüm suite yeşil (guardrail'ler dahil).

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/templates/classic-horizontal.ts packages/renderer/test/classic-horizontal.test.ts
git commit -m "feat(renderer): key outline and mono icon paths off brandColor"
```

---

### Task 3: İkon üretimi — çerçeveli outline, degrade kaldırıldı

**Files:**
- Modify: `apps/web/lib/icons.ts`
- Modify: `apps/web/test/icons.test.ts`

**Interfaces:**
- Consumes: `contrastRatio`, `normalizeHex` (`@mailmyra/renderer`).
- Produces (Task 4 ve 5 kullanır):
  - `generateStaticIcons(cdnWritePath: string): Promise<{ written: number; skipped: number }>` — YALNIZ `filled` (8 dosya)
  - `generateColoredIcons(cdnWritePath: string, color: string): Promise<{ lowContrast: boolean }>` — `outline-<hex6>` + `mono-<hex6>` (16 dosya)
  - `LOW_CONTRAST_ON_WHITE = 3`
  - `ICON_PLATFORMS` (değişmez)
  - `DEGRADED_GLYPH_HEX` **KALDIRILIR**

- [ ] **Step 1: Failing test**

`apps/web/test/icons.test.ts` — import satırını ve `generateStaticIcons` / `generateMonoIcons` describe bloklarının TAMAMINI şununla değiştir (dosyanın başındaki beforeEach/afterEach ve `ICON_PLATFORMS` describe'ı AYNEN KALIR):

```ts
import { ICON_PLATFORMS, generateStaticIcons, generateColoredIcons } from '../lib/icons';
```

```ts
describe('generateStaticIcons', () => {
  it('writes 48x48 PNGs for the filled variant only (outline is now color-keyed)', async () => {
    const res = await generateStaticIcons(dir);
    expect(res.written).toBe(8);
    expect(res.skipped).toBe(0);
    const files = readdirSync(join(dir, 'icons', 'filled')).sort();
    expect(files).toEqual([...ICON_PLATFORMS].sort().map((p) => `${p}.png`));
    expect(existsSync(join(dir, 'icons', 'outline'))).toBe(false);
    const meta = await sharp(join(dir, 'icons', 'filled', 'github.png')).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(48);
    expect(meta.height).toBe(48);
  });
  it('is idempotent: a second run skips every existing file untouched (immutability)', async () => {
    await generateStaticIcons(dir);
    const target = join(dir, 'icons', 'filled', 'github.png');
    const before = readFileSync(target);
    const mtimeBefore = statSync(target).mtimeMs;
    const res = await generateStaticIcons(dir);
    expect(res.written).toBe(0);
    expect(res.skipped).toBe(8);
    expect(readFileSync(target).equals(before)).toBe(true);
    expect(statSync(target).mtimeMs).toBe(mtimeBefore);
  });
});

describe('generateColoredIcons', () => {
  it('writes both outline-<hex6> and mono-<hex6> sets, lowercase and without #', async () => {
    const res = await generateColoredIcons(dir, '#3366AA');
    expect(res.lowContrast).toBe(false);
    for (const variant of ['outline-3366aa', 'mono-3366aa']) {
      const files = readdirSync(join(dir, 'icons', variant)).sort();
      expect(files).toEqual([...ICON_PLATFORMS].sort().map((p) => `${p}.png`));
    }
    const meta = await sharp(join(dir, 'icons', 'mono-3366aa', 'github.png')).metadata();
    expect(meta.width).toBe(48);
    expect(meta.hasAlpha).toBe(true);
  });
  it('renders outline and mono DIFFERENTLY for the same colour (frame vs bare glyph)', async () => {
    await generateColoredIcons(dir, '#3366aa');
    const outline = readFileSync(join(dir, 'icons', 'outline-3366aa', 'github.png'));
    const mono = readFileSync(join(dir, 'icons', 'mono-3366aa', 'github.png'));
    expect(outline.equals(mono)).toBe(false);
  });
  it('NEVER substitutes the colour: the brand default renders in its own colour', async () => {
    // Spec kararı: degrade YOK. #7b9fd3 beyaza karşı 2.71 (<3) olduğu için
    // lowContrast bayrağı kalkar ama glif YİNE #7b9fd3 basılır. Eskiden
    // #666666'ya düşerdi — bu test o davranışın geri gelmesini engeller.
    const res = await generateColoredIcons(dir, '#7b9fd3');
    expect(res.lowContrast).toBe(true);
    const brandFile = readFileSync(join(dir, 'icons', 'mono-7b9fd3', 'github.png'));
    await generateColoredIcons(dir, '#666666');
    const greyFile = readFileSync(join(dir, 'icons', 'mono-666666', 'github.png'));
    expect(brandFile.equals(greyFile)).toBe(false);
  });
  it('dedups: a second call rewrites nothing and reports the same flag', async () => {
    const first = await generateColoredIcons(dir, '#3366aa');
    const target = join(dir, 'icons', 'mono-3366aa', 'x.png');
    const mtimeBefore = statSync(target).mtimeMs;
    const second = await generateColoredIcons(dir, '#3366aa');
    expect(second).toEqual(first);
    expect(statSync(target).mtimeMs).toBe(mtimeBefore);
  });
  it('rejects an invalid hex', async () => {
    await expect(generateColoredIcons(dir, 'kırmızı')).rejects.toThrow();
  });
});
```

Dosyanın en üstündeki `node:fs` import satırına `existsSync` ekle:

```ts
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
```

- [ ] **Step 2: Kırmızıyı doğrula**

Run: `npm run test -w apps/web -- icons.test`
Expected: FAIL — `generateColoredIcons` export edilmiyor.

- [ ] **Step 3: icons.ts'i güncelle**

`apps/web/lib/icons.ts` içinde şu üç bloğu değiştir.

**(a)** `DEGRADED_GLYPH_HEX` ve `DEGRADE_MIN_CONTRAST_ON_WHITE` satırlarını şununla değiştir:

```ts
/**
 * Beyaz zeminde "açık ton" uyarı eşiği. UYARI amaçlıdır — renk ASLA
 * değiştirilmez (spec 2026-07-27: marka rengi korunur, yalnız uyarılır).
 */
export const LOW_CONTRAST_ON_WHITE = 3;
```

**(b)** `svgGlyph` fonksiyonunun ALTINA `svgOutline` ekle:

```ts
const OUTLINE_STROKE = 3;

/**
 * Kontur: seçilen renkte yuvarlatılmış kare ÇERÇEVE + şeffaf iç + aynı
 * renkte glif. Çerçeve PNG'ye rasterize edilir (CSS değil), bu yüzden
 * Outlook'ta `border-radius` desteği gerekmez — düz bir görsel olarak gelir.
 */
function svgOutline(glyphPath: string, colorHex: string): string {
  const scale = FILLED_GLYPH / 24;
  const offset = (CANVAS - FILLED_GLYPH) / 2;
  const inset = OUTLINE_STROKE / 2; // stroke kırpılmasın diye içe kaydır
  const side = CANVAS - OUTLINE_STROKE;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
    `<rect x="${inset}" y="${inset}" width="${side}" height="${side}" rx="${FILLED_RADIUS}" ` +
    `fill="none" stroke="#${colorHex}" stroke-width="${OUTLINE_STROKE}"/>` +
    `<g transform="translate(${offset} ${offset}) scale(${scale})"><path d="${glyphPath}" fill="#${colorHex}"/></g>` +
    `</svg>`
  );
}
```

**(c)** `generateStaticIcons` ve `generateMonoIcons` fonksiyonlarının İKİSİNİ birden şununla değiştir:

```ts
/** filled statik seti (platform resmi renkleri). Deploy adımı, elle koşulur. */
export async function generateStaticIcons(
  cdnWritePath: string,
): Promise<{ written: number; skipped: number }> {
  let written = 0;
  let skipped = 0;
  const dir = join(cdnWritePath, 'icons', 'filled');
  for (const platform of ICON_PLATFORMS) {
    const icon = ICONS[platform];
    if (await fileExists(join(dir, `${platform}.png`))) {
      skipped += 1;
      continue;
    }
    const wrote = await writeIconFile(
      dir,
      `${platform}.png`,
      await renderIconPng(svgFilled(icon.path, icon.hex.toLowerCase())),
    );
    if (wrote) written += 1;
    else skipped += 1;
  }
  return { written, skipped };
}

/**
 * Kullanıcının brandColor'ı için outline + mono setleri (16 dosya).
 *
 * İkisi BİRLİKTE üretilir: kullanıcı stiller arasında gezinirken yeni istek
 * atılmasın, builder'da tek "hazır mı" durumu olsun.
 *
 * Renk ASLA değiştirilmez (spec 2026-07-27). `lowContrast` yalnız bilgi
 * amaçlıdır; renkten deterministik hesaplandığı için dedup yolunda da doğrudur.
 */
export async function generateColoredIcons(
  cdnWritePath: string,
  color: string,
): Promise<{ lowContrast: boolean }> {
  const hex6 = normalizeHex(color).slice(1);
  const lowContrast = contrastRatio(`#${hex6}`, '#ffffff') < LOW_CONTRAST_ON_WHITE;

  const variants: Array<{ dir: string; svg: (p: string) => string }> = [
    { dir: join(cdnWritePath, 'icons', `outline-${hex6}`), svg: (p) => svgOutline(p, hex6) },
    { dir: join(cdnWritePath, 'icons', `mono-${hex6}`), svg: (p) => svgGlyph(p, hex6) },
  ];

  for (const variant of variants) {
    for (const platform of ICON_PLATFORMS) {
      if (await fileExists(join(variant.dir, `${platform}.png`))) continue;
      await writeIconFile(
        variant.dir,
        `${platform}.png`,
        await renderIconPng(variant.svg(ICONS[platform].path)),
      );
    }
  }
  return { lowContrast };
}
```

- [ ] **Step 4: Yeşili doğrula**

Run: `npm run test -w apps/web -- icons.test`
Expected: PASS. (Diğer web testleri Task 4'e kadar kırmızı olabilir — `icons-mono-route.test.ts` `generateMonoIcons`'a bağlı.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/icons.ts apps/web/test/icons.test.ts
git commit -m "feat(web): framed outline variant, drop colour degradation"
```

---

### Task 4: Uç nokta — tek çağrı iki set, lowContrast bayrağı

**Files:**
- Create: `apps/web/app/api/icons/route.ts`
- Delete: `apps/web/app/api/icons/mono/route.ts`
- Rename: `apps/web/test/icons-mono-route.test.ts` → `apps/web/test/icons-route.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `generateColoredIcons` (Task 3) — `lowContrast` bayrağını route hesaplamaz, doğrudan iletir; `createRateLimiter`, `clientIp`, `envInt`, `isValidHex`, `normalizeHex`.
- Produces: `POST /api/icons` — girdi `{ color: string }`; 200 → `{ ready: true }` veya `{ ready: true, lowContrast: true }`; 400 (geçersiz gövde/hex), 429 (limit), 500 (env eksik / üretim hatası), 507 (renk tavanı).

- [ ] **Step 1: Testi taşı ve güncelle**

```bash
git mv apps/web/test/icons-mono-route.test.ts apps/web/test/icons-route.test.ts
```

`apps/web/test/icons-route.test.ts` içinde:
- import satırını `('../app/api/icons/route')` yap (iki yerde: `beforeEach` ve rate-limit testi)
- `makeRequest` içindeki URL'i `http://localhost/api/icons` yap (iki yerde: `makeRequest` ve malformed-body testi)
- `process.env.ICON_MONO_DIR_CAP` geçen satırları `process.env.ICON_COLOR_CAP` yap
- Aşağıdaki üç testi mevcut karşılıklarıyla DEĞİŞTİR:

```ts
  it('generates outline and mono sets for a valid dark colour and returns ready', async () => {
    const res = await POST(makeRequest({ color: '#3366aa' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ready: true });
    expect(readdirSync(join(dir, 'icons', 'outline-3366aa'))).toHaveLength(8);
    expect(readdirSync(join(dir, 'icons', 'mono-3366aa'))).toHaveLength(8);
  });
  it('flags lowContrast for a pale colour but still writes it in that colour', async () => {
    const res = await POST(makeRequest({ color: '#ffff00' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ready: true, lowContrast: true });
    expect(readdirSync(join(dir, 'icons', 'mono-ffff00'))).toHaveLength(8);
  });
  it('counts a colour once against the cap even though it creates two directories', async () => {
    process.env.ICON_COLOR_CAP = '1';
    vi.resetModules();
    ({ POST } = await import('../app/api/icons/route'));
    expect((await POST(makeRequest({ color: '#3366aa' }))).status).toBe(200);
    // Aynı renk tekrar: dedup, tavana takılmamalı
    expect((await POST(makeRequest({ color: '#3366aa' }))).status).toBe(200);
    // Farklı renk: tavan dolu
    expect((await POST(makeRequest({ color: '#224466' }))).status).toBe(507);
  });
```

Dosyada `degraded` geçen başka bir beklenti kalmadığını doğrula.

- [ ] **Step 2: Kırmızıyı doğrula**

Run: `npm run test -w apps/web -- icons-route`
Expected: FAIL — `../app/api/icons/route` modülü yok.

- [ ] **Step 3: Yeni route**

`apps/web/app/api/icons/route.ts` oluştur:

```ts
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { isValidHex, normalizeHex } from '@mailmyra/renderer';
import { createRateLimiter } from '../../../lib/rate-limit';
import { clientIp } from '../../../lib/client-ip';
import { envInt } from '../../../lib/env';
import { generateColoredIcons } from '../../../lib/icons';

// Bir renk İKİ dizin üretir (outline-<hex6> + mono-<hex6>); tavan RENK
// sayısına uygulanır, dizin sayısına değil — bu yüzden hex'ler tekilleştirilir.
const COLOR_DIR_RE = /^(?:outline|mono)-([0-9a-f]{6})$/;

// Upload limiter'ından AYRI ve daha cömert: renk denemeleri normal
// kullanımdır; her brandColor değişikliği (debounce sonrası) bir POST.
const limiter = createRateLimiter({
  limit: envInt(process.env.ICON_RATE_LIMIT_PER_HOUR, 60),
  windowMs: 60 * 60 * 1000,
});

function jsonError(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function POST(req: Request): Promise<Response> {
  const ip = clientIp(req);
  if (!limiter.check(ip, Date.now())) {
    return jsonError(429, 'Çok fazla ikon isteği. Bir saat sonra tekrar deneyin.');
  }

  const writePath = process.env.CDN_WRITE_PATH;
  if (!writePath) {
    return jsonError(500, 'Sunucu yapılandırması eksik (CDN_WRITE_PATH).');
  }

  let color: unknown;
  try {
    ({ color } = (await req.json()) as { color?: unknown });
  } catch {
    return jsonError(400, 'Geçersiz istek gövdesi.');
  }
  if (typeof color !== 'string' || !isValidHex(color)) {
    return jsonError(400, 'Geçersiz renk. #rgb veya #rrggbb formatında hex bekleniyor.');
  }

  // Kota tavanı: spoofable IP × 16.7M olası renk, ikon dizinlerini sınırsız
  // çoğaltabilir. cleanup-orphans icons/ altını taramaz ve dirSizeBytes
  // yalnızca üst düzey dosyalara bakar — disk büyümesini başka hiçbir
  // mekanizma yakalamaz.
  const cap = envInt(process.env.ICON_COLOR_CAP, 256);
  const requestedHex = normalizeHex(color).slice(1);
  let existingDirs: string[];
  try {
    existingDirs = await readdir(join(writePath, 'icons'));
  } catch {
    existingDirs = [];
  }
  const colors = new Set<string>();
  for (const name of existingDirs) {
    const m = COLOR_DIR_RE.exec(name);
    if (m?.[1]) colors.add(m[1]);
  }
  if (colors.size >= cap && !colors.has(requestedHex)) {
    return jsonError(507, 'İkon depolama tavanına ulaşıldı. Yönetici ile iletişime geçin.');
  }

  try {
    const { lowContrast } = await generateColoredIcons(writePath, color);
    return Response.json(lowContrast ? { ready: true, lowContrast: true } : { ready: true });
  } catch {
    return jsonError(500, 'İkon üretimi başarısız oldu. Tekrar deneyin.');
  }
}
```

Eski route'u sil:

```bash
git rm apps/web/app/api/icons/mono/route.ts
```

- [ ] **Step 4: .env.example**

`.env.example` içindeki `ICON_MONO_DIR_CAP=256` satırını şununla değiştir:

```
ICON_COLOR_CAP=256
```

- [ ] **Step 5: Yeşili doğrula**

Run: `npm run test -w apps/web -- icons-route`
Expected: PASS (8 test)

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/api/icons/route.ts apps/web/test/icons-route.test.ts .env.example
git commit -m "feat(web): single icon endpoint generating outline and mono per colour"
```

---

### Task 5: Builder — outline kilidi ve düşük kontrast notu

**Files:**
- Modify: `apps/web/lib/icon-readiness.ts`
- Modify: `apps/web/test/icon-readiness.test.ts`
- Modify: `apps/web/app/builder/BuilderClient.tsx`
- Modify: `apps/web/app/builder/steps/StyleStep.tsx`

**Interfaces:**
- Consumes: `POST /api/icons` → `{ ready: true, lowContrast?: true }` (Task 4).
- Produces: `needsGeneratedIcons(data: SignatureData): boolean`; `StyleStep` prop'u `iconLowContrast?: boolean`.

- [ ] **Step 1: Failing test**

`apps/web/test/icon-readiness.test.ts` TÜM içeriğini değiştir:

```ts
import { describe, it, expect } from 'vitest';
import { createEmptyData } from '../app/builder/reducer';
import { needsGeneratedIcons } from '../lib/icon-readiness';

const social = [{ platform: 'linkedin', url: 'https://linkedin.com/in/x' }] as const;

describe('needsGeneratedIcons', () => {
  it('requires a colour-keyed style AND at least one social entry', () => {
    const base = createEmptyData(); // iconStyle: 'mono', social: []
    expect(needsGeneratedIcons(base)).toBe(false);
    expect(needsGeneratedIcons({ ...base, social: [...social] })).toBe(true);
  });
  it('is true for outline as well as mono — both are generated per colour', () => {
    const base = { ...createEmptyData(), social: [...social] };
    expect(needsGeneratedIcons({ ...base, layout: { ...base.layout, iconStyle: 'outline' } })).toBe(true);
    expect(needsGeneratedIcons({ ...base, layout: { ...base.layout, iconStyle: 'mono' } })).toBe(true);
  });
  it('is false for filled — platform colours are static, nothing to generate', () => {
    const base = { ...createEmptyData(), social: [...social] };
    expect(needsGeneratedIcons({ ...base, layout: { ...base.layout, iconStyle: 'filled' } })).toBe(false);
  });
});
```

- [ ] **Step 2: Kırmızıyı doğrula**

Run: `npm run test -w apps/web -- icon-readiness`
Expected: FAIL — `needsGeneratedIcons` export edilmiyor.

- [ ] **Step 3: icon-readiness.ts**

`apps/web/lib/icon-readiness.ts` TÜM içeriğini değiştir:

```ts
import type { SignatureData } from '@mailmyra/renderer';

/**
 * Export kilidi, ikonların brandColor'a göre ÜRETİLMESİ gereken stillerde
 * devreye girer. `filled` platform renkleriyle deploy-time statiktir;
 * sosyal listesi boşken hiç ikon basılmaz.
 */
export function needsGeneratedIcons(data: SignatureData): boolean {
  const colourKeyed = data.layout.iconStyle === 'outline' || data.layout.iconStyle === 'mono';
  return colourKeyed && data.social.length > 0;
}
```

- [ ] **Step 4: BuilderClient**

`apps/web/app/builder/BuilderClient.tsx` değişiklikleri:

Import satırını güncelle:

```tsx
import { needsGeneratedIcons } from '../../lib/icon-readiness';
```

`const monoNeeded = ...` satırını değiştir:

```tsx
  const iconsNeeded = Boolean(iconBaseUrl) && needsGeneratedIcons(data);
```

Durum değişkenlerini yeniden adlandır — `const [monoDegraded, setMonoDegraded] = useState(false);` satırını şununla değiştir:

```tsx
  const [iconLowContrast, setIconLowContrast] = useState(false);
```

Kalan `mono` önekli durum değişkenlerini de adlandırmayı tutarlı yapmak için yeniden adlandır — artık yalnız mono değil outline'ı da kapsıyorlar: `monoFailed`/`setMonoFailed` → `iconsFailed`/`setIconsFailed`, `monoSeq` → `iconsSeq`. (Dosyada geçen HER kullanımı güncelle: effect gövdesi, `disabledNote` üçlüsü ve retry butonu.)

Effect içinde geçen tüm `monoNeeded` → `iconsNeeded`, `setMonoDegraded` → `setIconLowContrast` yap; fetch URL'ini ve yanıt alanını güncelle:

```tsx
        const res = await fetch('/api/icons', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ color }),
        });
        const body = (await res.json()) as { ready?: boolean; lowContrast?: boolean };
        if (seq !== monoSeq.current) return; // eski cevap — daha yenisi yolda
        if (res.ok && body.ready) {
          setReadyColor(color);
          setIconLowContrast(Boolean(body.lowContrast));
        } else {
          setMonoFailed(true);
        }
```

Effect'in bağımlılık dizisindeki `monoNeeded` → `iconsNeeded`.

`exportDisabled` satırını değiştir:

```tsx
  const exportDisabled = iconsNeeded && readyColor !== data.visuals.brandColor;
```

`StyleStep` çağrısını ve retry butonunun koşulundaki `monoNeeded`'ı güncelle:

```tsx
      {step === 'style' && <StyleStep data={data} dispatch={dispatch} iconLowContrast={iconLowContrast} />}
```

```tsx
      {iconsNeeded && monoFailed && (
```

- [ ] **Step 5: StyleStep**

`apps/web/app/builder/steps/StyleStep.tsx` — bileşen imzasındaki `monoDegraded` prop'unu `iconLowContrast` yap (varsayılan `false`, tip `boolean | undefined`), ve not bloğunu şununla değiştir:

```tsx
        {(data.layout.iconStyle === 'outline' || data.layout.iconStyle === 'mono') &&
          iconLowContrast && (
            <p style={{ fontSize: 13, color: '#666666', marginTop: 8 }}>
              ℹ️ Marka rengin açık tonda — beyaz zeminde ikonlar soluk görünebilir.
            </p>
          )}
```

- [ ] **Step 6: Yeşili doğrula**

Run: `npm test && npm run typecheck && npm run build`
Expected: hepsi exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/icon-readiness.ts apps/web/test/icon-readiness.test.ts apps/web/app/builder/BuilderClient.tsx apps/web/app/builder/steps/StyleStep.tsx
git commit -m "feat(web): lock export for outline too, warn instead of degrading"
```

---

### Task 6: Çıktılar, dokümantasyon ve deploy notu

**Files:**
- Modify: `docs/deploy-plesk-iisnode.md`
- Modify: `docs/backlog.md`
- Modify: `apps/web/scripts/generate-icons.ts` (çıktı metni)

**Interfaces:**
- Consumes: her şey.
- Produces: güncel `.htm` çıktıları, deploy adımları, backlog kayıtları.

- [ ] **Step 1: generate-icons çıktı metni**

`apps/web/scripts/generate-icons.ts` içindeki `console.log` satırını değiştir (artık yalnız filled üretiliyor):

```ts
  console.log(`icons: ${res.written} yazıldı, ${res.skipped} atlandı (filled seti, 8 dosya).`);
```

- [ ] **Step 2: Dev ikonlarını yeniden üret ve doğrula**

```bash
cd apps/web && CDN_WRITE_PATH=./public/cdn-dev npm run icons
```

Expected: `icons: 0 yazıldı, 8 atlandı (filled seti, 8 dosya).` (filled zaten var).
Doğrula: `ls apps/web/public/cdn-dev/icons/` → `filled`, eski `outline`, ve `mono-*` klasörleri görünür. Eski `outline/` artık kullanılmıyor; **silme** — dev CDN'de zararsız, prod notu Step 4'te.

- [ ] **Step 3: .htm çıktılarını üret**

```bash
npm run emit -w packages/renderer
```

Doğrula:

```bash
grep -c 'cdn.mailmyra.com/icons/mono-7b9fd3' packages/renderer/out/classic-horizontal--full.htm
```

Expected: `1` (HTML tek satır olduğu için `grep -c` satır sayar; gerçek eşleşme sayısı için `grep -o ... | wc -l` → `3`).

- [ ] **Step 4: Deploy rehberi**

`docs/deploy-plesk-iisnode.md` içinde "İlk çalıştırma" bölümündeki `npm run icons` maddesinin ALTINA ekle:

```markdown
    > **2026-07-27 sonrası:** `npm run icons` artık YALNIZ `filled` setini
    > üretir (8 dosya). Kontur ve tek-renk ikonları `POST /api/icons` ile
    > kullanıcının marka rengine göre çalışma anında üretilir.
    > Eski `icons/outline/` klasörü artık kullanılmıyor — CDN docroot'undan
    > silinebilir (zararsız, yalnız yer kaplar).
```

- [ ] **Step 5: Backlog**

`docs/backlog.md` içindeki "npm Göçü Notları" bölümünün ÜSTÜNE ekle:

```markdown
## Marka Kimliği — 2026-07-27

Spec: `docs/superpowers/specs/2026-07-27-brand-identity-design.md`

- Marka renkleri kilitli: `#7b9fd3` (mavi) · `#e0a66c` (turuncu). Tek kaynak
  `packages/renderer/src/brand.ts`; site UI `apps/web/app/tokens.css`.
- İkon renk modeli: `filled` sabit (platform renkleri) · `outline` çerçeveli
  ve brandColor'a bağlı · `mono` çerçevesiz ve brandColor'a bağlı.
- **Degrade kaldırıldı.** Renk asla değiştirilmez; düşük kontrastta yalnız
  bilgi notu çıkar. Bu, açık bekleyen "#719ad1 degrade kararı" maddesini
  KAPATIR — o madde artık geçersizdir.
- [ ] Üç ikon stili de 6 istemcide doğrulanacak (Outlook Classic dahil):
  kontur çerçevesinin köşe yuvarlaklığı ve şeffaf PNG'nin koyu modda hali.
- [ ] Prod CDN'de eski `icons/outline/` klasörü silinebilir.
```

Ayrıca aynı dosyada `#719ad1` degrade kararından bahseden satır varsa yanına `(2026-07-27'de kapandı — degrade kaldırıldı)` notu ekle.

- [ ] **Step 6: Son doğrulama**

Run: `npm test && npm run typecheck && npm run build`
Expected: hepsi exit 0.

- [ ] **Step 7: Commit**

```bash
git add apps/web/scripts/generate-icons.ts docs/deploy-plesk-iisnode.md docs/backlog.md
git commit -m "docs: record the brand identity change and its deploy impact"
```

---

## Kontrol Noktası (plan sonrası, insan işi)

1. Tarayıcıda `/builder`: üç stil de denenir; kontur çerçeveli, mono çerçevesiz görünmeli. Marka rengi değişince ikonlar o renge gelmeli — **griye düşmemeli**.
2. Açık bir renk (`#ffff00`) seçilince Stil adımında "açık tonda" notu çıkmalı, ikonlar yine sarı basılmalı.
3. Prod deploy: `npm run package` → `deploy-next.zip` → sunucuda aç → `npm ci`. `npm run icons` prod'da tekrar koşulmalı (filled zaten var, atlanacak).
4. 6-istemci testi: üç stil × Outlook Classic dahil.
