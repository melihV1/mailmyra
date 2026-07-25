# Week 2 Polish Implementation Plan — Renkler, Yerleşim, Sosyal İkonlar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Telefon-testi bulgularını ve renk kararlarını uygulamak: yeni renk varsayılanları + kontrast mantığı, classic-horizontal'a logo/el-imzası yerleşimi, Simple Icons tabanlı PNG sosyal ikon boru hattı (statik filled/outline + on-demand mono) ve mono-hazır-olana-kadar export kilidi. Sonuç: 4 fixture × classic-horizontal .htm çıktısı, 6-istemci testine hazır.

**Architecture:** Renderer saf fonksiyon kalır; `renderSignature(data, templateId, opts?)` geriye uyumlu genişletilir (`opts.iconBaseUrl`). İkon PNG üretimi apps/web tarafındadır: `lib/icons.ts` çekirdeği (simple-icons glif path'i → SVG string → sharp → 48×48 PNG), statik script ve `/api/icons/mono` route'u bu çekirdeği kullanır. Builder mono ikon hazırlığını debounce'lu POST ile takip eder ve hazır olmadan export'u kilitler.

**Tech Stack:** TypeScript, Next.js App Router, Vitest, sharp, simple-icons (v13 — aşağıya bak), pnpm workspace.

## Global Constraints

- Branch: `feat/week-2-builder`. **Merge YOK** — 6-istemci testi (Outlook Classic dahil) geçene kadar.
- Tüm pnpm komutları `corepack pnpm ...` ile (global pnpm yok).
- Renderer paketi framework-bağımsız kalır: React import yok, DOM yok, tarayıcı API'si yok.
- E-posta HTML kuralları: table-based, tüm CSS inline, çıktıda SVG/WebP/base64 yok, her `<table>` `border="0"` + `style` içinde `border:none`, her `<img>` `width` attribute taşır. (SVG yalnızca SUNUCU tarafında sharp'a girdi olarak kullanılabilir — çıktı daima PNG.)
- **Yeni pazarlıksız guardrail:** src'si `/icons/` içeren her `<img>` `width` VE `height` attribute taşımak ZORUNDA.
- **Export güvenliği:** kopyalanan HTML'de asla henüz-yazılmamış ikon URL'i olamaz.
- CDN dosyaları değişmezdir: var olan dosya asla yeniden yazılmaz (`wx` bayrağı, EEXIST → atla).
- `simple-icons` sürümü **`"^13.0.0"`'a SABİTLENİR** (apps/web devDependency). Sebep: v14.0.0'dan itibaren `linkedin` ikonu paketten kaldırıldı (marka talebi; jsdelivr'de doğrulandı: v13.0.0'da 200, v14/v15/v16'da 404). v13 sekiz platformun tamamını içerir. Bu pin, plan sonunda Hüseyin'e ayrıca raporlanacak bir risk notudur — asla sessizce upgrade edilmez.
- Commit mesajları İngilizce, conventional format, sonunda `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Test komutları: renderer → `corepack pnpm --filter @mailmyra/renderer test`, web → `corepack pnpm --filter web test`, typecheck → `corepack pnpm typecheck` (kökten, tüm workspace).

---

### Task 1: Renk varsayılanları (reducer + fixtures)

**Files:**
- Modify: `apps/web/app/builder/reducer.ts:9-10`
- Modify: `apps/web/test/builder-reducer.test.ts`
- Modify: `packages/renderer/src/fixtures/samples.ts:12`

**Interfaces:**
- Produces: `createEmptyData()` artık `textColor: '#333333'`, `mutedColor: '#666666'` döndürür. Fixture `baseVisuals.textColor === '#333333'` (muted `#6d6e71` KALIR — makul bant). `brandColor: '#719ad1'` değişmez.

- [ ] **Step 1: Testleri yeni varsayılanlara göre güncelle (failing)**

`apps/web/test/builder-reducer.test.ts` içinde üç değişiklik:

`createEmptyData` describe'ına yeni assertion ekle (mevcut ilk test bloğuna):

```ts
describe('createEmptyData', () => {
  it('starts with brand defaults and classic-horizontal', () => {
    const d = createEmptyData();
    expect(d.visuals.brandColor).toBe('#719ad1');
    expect(d.visuals.textColor).toBe('#333333');
    expect(d.visuals.mutedColor).toBe('#666666');
    expect(d.layout.templateId).toBe('classic-horizontal');
    expect(d.identity.fullName).toBe('');
  });
});
```

`mergeWithEmpty` testlerindeki iki eski renk assertion'ını güncelle:
- Satır 44 civarı: `expect(d.visuals.textColor).toBe('#1a1a1a');` → `toBe('#333333')`, hemen altındaki `expect(d.visuals.mutedColor).toBe('#6d6e71');` → `toBe('#666666')`.
- Satır 63 civarı ("does not let a partial section shadow..."): `expect(d.visuals.textColor).toBe('#1a1a1a');` → `toBe('#333333')`.

- [ ] **Step 2: Testin kırıldığını doğrula**

Run: `corepack pnpm --filter web test -- builder-reducer`
Expected: FAIL — `expected '#1a1a1a' to be '#333333'`

- [ ] **Step 3: reducer.ts varsayılanlarını değiştir**

`apps/web/app/builder/reducer.ts` içinde `createEmptyData()`:

```ts
    visuals: {
      brandColor: '#719ad1',
      textColor: '#333333',
      mutedColor: '#666666',
      fontFamily: 'Arial, Helvetica, sans-serif',
    },
```

- [ ] **Step 4: Fixture textColor'ını güncelle**

`packages/renderer/src/fixtures/samples.ts` içinde `baseVisuals`:

```ts
const baseVisuals = {
  brandColor: '#719ad1',
  textColor: '#333333',
  mutedColor: '#6d6e71',
  fontFamily: 'Arial, Helvetica, sans-serif',
} satisfies Pick<
  SignatureData['visuals'],
  'brandColor' | 'textColor' | 'mutedColor' | 'fontFamily'
>;
```

(Fixture muted'ı `#6d6e71` kalır — spec kararı.)

- [ ] **Step 5: Tüm testler + typecheck**

Run: `corepack pnpm test && corepack pnpm typecheck`
Expected: PASS (contrast-warnings testleri #1a1a1a'ya bağlı DEĞİL — sabit renklerle test ediyor, etkilenmez).

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/builder/reducer.ts apps/web/test/builder-reducer.test.ts packages/renderer/src/fixtures/samples.ts
git commit -m "feat(web): default text/muted colors #333333/#666666"
```

---

### Task 2: contrastWarnings yeniden yazımı (iki bağımsız kontrol)

**Files:**
- Modify: `apps/web/app/builder/steps/StyleStep.tsx:17-38` (yalnız `contrastWarnings` fonksiyonu ve sabitler)
- Modify: `apps/web/test/contrast-warnings.test.ts` (tamamen yeniden yazılır)

**Interfaces:**
- Consumes: `contrastRatio(a, b)` — `@mailmyra/renderer` (mevcut export).
- Produces: `contrastWarnings(visuals: SignatureData['visuals']): string[]` — aynı imza, yeni mantık. Mesaj formatları: `"<Ad> beyaz zeminde zor okunur."` ve `"<Ad> saf siyaha çok yakın; koyu modda sorun çıkarabilir."` (`<Ad>` = `Metin rengi` | `İkincil metin rengi`).

- [ ] **Step 1: Test dosyasını yeni mantığa göre yeniden yaz (failing)**

`apps/web/test/contrast-warnings.test.ts` dosyasının TÜM içeriğini şununla değiştir:

```ts
import { describe, it, expect } from 'vitest';
import type { SignatureData } from '@mailmyra/renderer';
import { contrastWarnings } from '../app/builder/steps/StyleStep';

function visuals(overrides: Partial<SignatureData['visuals']>): SignatureData['visuals'] {
  return {
    brandColor: '#719ad1',
    textColor: '#333333',
    mutedColor: '#666666',
    fontFamily: 'Arial, Helvetica, sans-serif',
    ...overrides,
  };
}

// Spec (2026-07-25-week-2-polish-design.md §1): iki BAĞIMSIZ kontrol.
// 1) Açık-zemin: contrastRatio(renk,#ffffff) < 4.5 (text) / < 3 (muted)
// 2) Saf-siyah tabanı: contrastRatio(renk,#000000) < 1.2 (≈ #000–#111 bandı)
// Eski "koyu zeminde (#1a1a1a) okunurluk" kontrolü KALDIRILDI — o kontrol
// hiçbir textColor seçiminin iki zeminde birden uyarısız kalamamasına yol
// açıyordu (eski test dosyasının son test bloğunda belgelenmişti).
describe('contrastWarnings — susması gerekenler', () => {
  it('is silent for the new defaults (#333333 text, #666666 muted)', () => {
    expect(contrastWarnings(visuals({}))).toEqual([]);
  });
  it('is silent for #1a1a1a as text color (dark but not near-pure-black)', () => {
    expect(contrastWarnings(visuals({ textColor: '#1a1a1a' }))).toEqual([]);
  });
  it('is silent for #666666 as text color (≈5.7 on white, well clear of black)', () => {
    // #666666 beyaza karşı ≈5.7 (≥4.5) ve siyaha karşı ≈3.7 (≥1.2) → sessiz.
    expect(contrastWarnings(visuals({ textColor: '#666666' }))).toEqual([]);
  });
});

describe('contrastWarnings — uyarması gerekenler', () => {
  it('warns near-pure-black for #000000 text color, without a white-bg warning', () => {
    expect(contrastWarnings(visuals({ textColor: '#000000' }))).toEqual([
      'Metin rengi saf siyaha çok yakın; koyu modda sorun çıkarabilir.',
    ]);
  });
  it('warns white-bg for #ffffff text color, without a near-black warning', () => {
    expect(contrastWarnings(visuals({ textColor: '#ffffff' }))).toEqual([
      'Metin rengi beyaz zeminde zor okunur.',
    ]);
  });
  it('warns white-bg for a light gray (#cccccc) text color', () => {
    expect(contrastWarnings(visuals({ textColor: '#cccccc' }))).toEqual([
      'Metin rengi beyaz zeminde zor okunur.',
    ]);
  });
  it('warns near-pure-black for #000000 muted color with the muted label', () => {
    expect(contrastWarnings(visuals({ mutedColor: '#000000' }))).toEqual([
      'İkincil metin rengi saf siyaha çok yakın; koyu modda sorun çıkarabilir.',
    ]);
  });
  it('applies the looser muted threshold: #888888 passes as muted (≈3.5 ≥ 3) but a lighter #cccccc fails', () => {
    expect(contrastWarnings(visuals({ mutedColor: '#888888' }))).toEqual([]);
    expect(contrastWarnings(visuals({ mutedColor: '#cccccc' }))).toEqual([
      'İkincil metin rengi beyaz zeminde zor okunur.',
    ]);
  });
});

describe('contrastWarnings — bozuk girdi', () => {
  it('stays silent for an invalid hex instead of throwing', () => {
    expect(contrastWarnings(visuals({ textColor: 'not-a-color' }))).toEqual([]);
  });
});
```

- [ ] **Step 2: Testin kırıldığını doğrula**

Run: `corepack pnpm --filter web test -- contrast-warnings`
Expected: FAIL (eski mantık `#000000` için "koyu zeminde" uyarısı üretmiyor, "saf siyaha çok yakın" mesajı yok vb.)

- [ ] **Step 3: contrastWarnings'i yeniden yaz**

`apps/web/app/builder/steps/StyleStep.tsx` içinde `LIGHT_BG`/`DARK_BG` sabitlerini ve `contrastWarnings`'i şununla değiştir (fonksiyonun export'u ve dosyanın kalanı aynı kalır):

```ts
const LIGHT_BG = '#ffffff';
const PURE_BLACK = '#000000';
/** Saf-siyah bandı (≈ #000–#111): bu orandan düşükse koyu modda risklidir. */
const NEAR_BLACK_MAX_RATIO = 1.2;

/**
 * Spec (§1): iki BAĞIMSIZ kontrol.
 * 1) Çok açık: beyaz zeminde okunurluk — textColor < 4.5, mutedColor < 3.
 * 2) Saf siyaha yakın: contrastRatio(renk, #000000) < 1.2 — koyu mod riski.
 * (#1a1a1a siyaha karşı ≈1.206 → bilerek bandın hemen DIŞINDA kalır.)
 */
export function contrastWarnings(visuals: SignatureData['visuals']): string[] {
  const warnings: string[] = [];
  const checks: Array<{ color: string; min: number; name: string }> = [
    { color: visuals.textColor, min: 4.5, name: 'Metin rengi' },
    { color: visuals.mutedColor, min: 3, name: 'İkincil metin rengi' },
  ];
  for (const c of checks) {
    try {
      if (contrastRatio(c.color, LIGHT_BG) < c.min)
        warnings.push(`${c.name} beyaz zeminde zor okunur.`);
      if (contrastRatio(c.color, PURE_BLACK) < NEAR_BLACK_MAX_RATIO)
        warnings.push(`${c.name} saf siyaha çok yakın; koyu modda sorun çıkarabilir.`);
    } catch {
      // geçersiz hex — renk seçici geçerli hex üretir, elle bozuk girişte sessiz kal
    }
  }
  return warnings;
}
```

- [ ] **Step 4: Testlerin geçtiğini doğrula**

Run: `corepack pnpm --filter web test -- contrast-warnings`
Expected: PASS (9 test)

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/builder/steps/StyleStep.tsx apps/web/test/contrast-warnings.test.ts
git commit -m "feat(web): rewrite contrast warnings as white-bg + near-black checks"
```

---

### Task 3: Renderer API — `RenderOptions` (geriye uyumlu) + hex util export

**Files:**
- Modify: `packages/renderer/src/types.ts` (sona `RenderOptions` eklenir)
- Modify: `packages/renderer/src/render.ts`
- Modify: `packages/renderer/src/index.ts`
- Modify: `packages/renderer/src/templates/classic-horizontal.ts:42` (yalnız fonksiyon imzası — gövde bu task'ta değişmez)
- Modify: `packages/renderer/test/render.test.ts`

**Interfaces:**
- Produces: `interface RenderOptions { iconBaseUrl?: string }` (types.ts'te — render.ts↔template dairesel importunu önler); `renderSignature(data, templateId, opts?: RenderOptions)`; şablon tipi `(data: SignatureData, opts?: RenderOptions) => string`. Index'ten yeni export'lar: `RenderOptions` (type), `isValidHex`, `normalizeHex` (Task 6/8 bunları apps/web'de kullanacak).

- [ ] **Step 1: Failing test**

`packages/renderer/test/render.test.ts` describe bloğuna ekle:

```ts
  it('accepts an optional RenderOptions argument without changing output when absent', () => {
    const plain = renderSignature(full, 'classic-horizontal');
    const withUndefined = renderSignature(full, 'classic-horizontal', undefined);
    expect(withUndefined).toBe(plain);
  });
  it('threads opts through to the template (smoke: no throw with iconBaseUrl)', () => {
    expect(() =>
      renderSignature(full, 'classic-horizontal', { iconBaseUrl: 'https://cdn.example.com' }),
    ).not.toThrow();
  });
```

Run: `corepack pnpm --filter @mailmyra/renderer test -- render`
Expected: FAIL — typecheck/derleme hatası (üçüncü argüman yok). (Vitest tip hatasında da koşabilir; en azından `corepack pnpm --filter @mailmyra/renderer typecheck` FAIL vermeli.)

- [ ] **Step 2: types.ts'e RenderOptions ekle**

`packages/renderer/src/types.ts` dosyasının sonuna:

```ts
/** renderSignature için isteğe bağlı render ayarları. */
export interface RenderOptions {
  /**
   * Sosyal ikon PNG'lerinin kök URL'i (ör. https://cdn.mailmyra.com).
   * Verilmezse sosyal satır metin-link olarak basılır (geriye uyumlu).
   */
  iconBaseUrl?: string;
}
```

- [ ] **Step 3: render.ts'i güncelle**

`packages/renderer/src/render.ts` tüm içeriği:

```ts
import type { SignatureData, RenderOptions } from './types';
import { classicHorizontal } from './templates/classic-horizontal';

const TEMPLATES: Record<string, (data: SignatureData, opts?: RenderOptions) => string> = {
  'classic-horizontal': classicHorizontal,
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export function renderSignature(
  data: SignatureData,
  templateId: string,
  opts?: RenderOptions,
): string {
  const template = TEMPLATES[templateId];
  if (!template) {
    throw new Error(
      `Unknown templateId: "${templateId}". Available: ${TEMPLATE_IDS.join(', ')}`,
    );
  }
  return template(data, opts);
}
```

- [ ] **Step 4: Şablon imzasını genişlet**

`packages/renderer/src/templates/classic-horizontal.ts`:
- Import satırına tip ekle: `import type { SignatureData, RenderOptions } from '../types';` (mevcut `import type { SignatureData } from '../types';` yerine)
- Fonksiyon imzası: `export function classicHorizontal(data: SignatureData, opts?: RenderOptions): string {`
- `opts` bu task'ta kullanılmıyor — TS6133 (unused param) hatası çıkarsa parametreyi `_opts` DEĞİL `opts` bırak; renderer tsconfig'inde `noUnusedParameters` açıksa geçici olarak gövdeye `void opts;` satırı ekle (Task 5'te gerçek kullanım gelince kaldırılır).

- [ ] **Step 5: index.ts export'ları**

`packages/renderer/src/index.ts` tüm içeriği:

```ts
export { renderSignature, TEMPLATE_IDS } from './render';
export type { SignatureData, WebSafeFont, RenderOptions } from './types';
export { fixtures } from './fixtures/samples';
export type { Fixture } from './fixtures/samples';
export { contrastRatio, isValidHex, normalizeHex } from './utils/color';
```

- [ ] **Step 6: Test + typecheck**

Run: `corepack pnpm --filter @mailmyra/renderer test && corepack pnpm typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add packages/renderer/src/types.ts packages/renderer/src/render.ts packages/renderer/src/index.ts packages/renderer/src/templates/classic-horizontal.ts packages/renderer/test/render.test.ts
git commit -m "feat(renderer): backward-compatible RenderOptions with iconBaseUrl"
```

---

### Task 4: classic-horizontal yerleşimi — logo (avatar altı) + el imzası satırı + fixture görselleri

**Files:**
- Modify: `packages/renderer/src/templates/classic-horizontal.ts` (sol sütun bloğu ~satır 256-280; disclaimer bloğu ~satır 238-253)
- Modify: `packages/renderer/src/fixtures/samples.ts` (`full` fixture'a logoUrl + handSignatureUrl)
- Modify: `packages/renderer/test/classic-horizontal.test.ts`

**Interfaces:**
- Consumes: Task 3'ün `(data, opts?)` imzası.
- Produces: `visuals.logoUrl` avatarın ALTINA ikinci `<img>` (8px boşluk, width attr + inline width, height YOK); `visuals.handSignatureUrl` içerik tablosunun en altında disclaimer'ın SAĞINDA 150px `<img>`. Yalnız bu şablona özgü kararlar (backlog notu Task 10'da).

- [ ] **Step 1: Failing testler**

`packages/renderer/test/classic-horizontal.test.ts` describe bloğuna ekle:

```ts
  it('renders avatar and logo together as two stacked images in the left column', () => {
    const both = {
      ...full,
      visuals: {
        ...full.visuals,
        avatarUrl: 'https://cdn.test/avatar.png',
        logoUrl: 'https://cdn.test/logo.png',
      },
    };
    const html = classicHorizontal(both);
    expect(html).toContain('src="https://cdn.test/avatar.png"');
    expect(html).toContain('src="https://cdn.test/logo.png"');
    // Logo avatardan SONRA gelir (altında)
    expect(html.indexOf('logo.png')).toBeGreaterThan(html.indexOf('avatar.png'));
    // Logo img'i height attribute TAŞIMAZ (oran bilinmiyor — spec kararı)
    const logoImg = html.match(/<img[^>]*logo\.png[^>]*>/i)![0];
    expect(logoImg).toMatch(/\swidth=/i);
    expect(logoImg).not.toMatch(/\sheight=/i);
  });
  it('renders logo alone when there is no avatar (no ?? fallback anymore)', () => {
    const logoOnly = {
      ...full,
      visuals: { ...full.visuals, avatarUrl: undefined, logoUrl: 'https://cdn.test/logo.png' },
    };
    const html = classicHorizontal(logoOnly);
    expect(html).toContain('src="https://cdn.test/logo.png"');
  });
  it('renders the hand signature next to the disclaimer in the bottom row', () => {
    const withSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: 'https://cdn.test/sig.png' },
    };
    const html = classicHorizontal(withSig);
    const sigImg = html.match(/<img[^>]*sig\.png[^>]*>/i)![0];
    expect(sigImg).toContain('width="150"');
    // Disclaimer da aynı çıktıda var (full fixture disclaimer içerir)
    expect(html).toContain('Bu e-posta ve ekleri gizlidir');
  });
  it('renders the hand signature row even without a disclaimer', () => {
    const noDisc = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: 'https://cdn.test/sig.png' },
      extras: { ...full.extras, disclaimer: undefined },
    };
    expect(classicHorizontal(noDisc)).toContain('sig.png');
  });
  it('keeps the plain disclaimer behavior when there is no hand signature', () => {
    const noSig = {
      ...full,
      visuals: { ...full.visuals, handSignatureUrl: undefined },
    };
    const html = classicHorizontal(noSig);
    expect(html).toContain('Bu e-posta ve ekleri gizlidir');
    expect(html).not.toContain('sig.png');
  });
```

Run: `corepack pnpm --filter @mailmyra/renderer test -- classic-horizontal`
Expected: FAIL (logo avatar varken hiç basılmıyor; handSignatureUrl hiçbir yerde geçmiyor)

- [ ] **Step 2: Sol sütunu iki bağımsız slota çevir**

`classic-horizontal.ts` içinde `const rightInner = ...` satırından fonksiyon sonuna kadarki bloğu (mevcut `const imageUrl = data.visuals.avatarUrl ?? data.visuals.logoUrl;` dahil) şununla değiştir:

```ts
  const rightInner = table(lines.join(''), { width: '100%' });

  // Sol görsel sütunu: avatar üstte, logo altta — İKİ BAĞIMSIZ SLOT
  // (eski `avatarUrl ?? logoUrl` tek-yuva davranışı kaldırıldı, spec §2).
  // Logo genişliği = kolon genişliği (s.avatar); height BİLEREK verilmez —
  // SignatureData görsel oranı saklamıyor. Outlook width-only ölçeklemeyi
  // genelde doğru yapar; 6-istemci testinde özellikle kontrol edilecek.
  const visualRows: string[] = [];
  if (data.visuals.avatarUrl) {
    visualRows.push(
      row(
        cell(
          `<img src="${sanitizeUrl(data.visuals.avatarUrl)}" width="${s.avatar}" height="${s.avatar}" alt="${htmlEscape(
            data.identity.fullName,
          )}" border="0" style="${styleToString({
            display: 'block',
            border: '0',
            'border-radius': '4px',
            width: `${s.avatar}px`,
            height: `${s.avatar}px`,
          })}" />`,
        ),
      ),
    );
  }
  if (data.visuals.logoUrl) {
    visualRows.push(
      row(
        cell(
          `<img src="${sanitizeUrl(data.visuals.logoUrl)}" width="${s.avatar}" alt="${htmlEscape(
            data.identity.company ?? 'Logo',
          )}" border="0" style="${styleToString({
            display: 'block',
            border: '0',
            width: `${s.avatar}px`,
          })}" />`,
          { style: data.visuals.avatarUrl ? { 'padding-top': '8px' } : undefined },
        ),
      ),
    );
  }
  const leftCell = visualRows.length
    ? cell(table(visualRows.join('')), {
        valign: 'top',
        width: s.avatar,
        style: { 'padding-right': `${s.gap}px` },
      })
    : '';

  const rightCell = cell(rightInner, { valign: 'top' });

  return table(row(leftCell + rightCell), { style: { 'max-width': '600px' } });
```

- [ ] **Step 3: Disclaimer bloğunu disclaimer+el-imzası alt satırıyla değiştir**

Mevcut `// Yasal metin` bloğunu (CTA bloğundan sonraki `if (data.extras?.disclaimer) { ... }`) şununla değiştir:

```ts
  // Alt satır: disclaimer (sol) + el imzası (sağ) — spec §2.
  // El imzası varken 2 hücreli nested table kullanılır (colspan'a bulaşmadan);
  // sağ kolon 150px sabittir, imza hücreyi doldurur → sağa hizalı görünür.
  const disclaimerSpan = data.extras?.disclaimer
    ? `<span style="${styleToString({
        'font-family': font,
        'font-size': `${s.small}px`,
        color: muted,
        'line-height': '1.3',
      })}">${htmlEscape(data.extras.disclaimer).replace(/\n/g, '<br>')}</span>`
    : '';
  const handSigImg = data.visuals.handSignatureUrl
    ? `<img src="${sanitizeUrl(data.visuals.handSignatureUrl)}" width="150" alt="${htmlEscape(
        data.identity.fullName,
      )}" border="0" style="${styleToString({
        display: 'block',
        border: '0',
        width: '150px',
      })}" />`
    : '';
  if (handSigImg) {
    const bottom = table(
      row(
        cell(disclaimerSpan || '&nbsp;', { valign: 'top' }) +
          cell(handSigImg, {
            valign: 'bottom',
            width: 150,
            style: { 'padding-left': '12px' },
          }),
      ),
      { width: '100%' },
    );
    lines.push(
      row(cell(bottom, { style: { 'padding-top': `${Math.round(s.gap / 2)}px` } })),
    );
  } else if (disclaimerSpan) {
    lines.push(
      row(
        cell(disclaimerSpan, { style: { 'padding-top': `${Math.round(s.gap / 2)}px` } }),
      ),
    );
  }
```

- [ ] **Step 4: `full` fixture'a görselleri ekle**

`packages/renderer/src/fixtures/samples.ts` içinde `full.visuals`:

```ts
  visuals: {
    ...baseVisuals,
    avatarUrl: 'https://placehold.co/240x240/719ad1/ffffff/png',
    logoUrl: 'https://placehold.co/360x120/1a1a1a/ffffff/png',
    handSignatureUrl: 'https://placehold.co/300x100/333333/ffffff/png',
  },
```

(`noLogo` fixture `visuals: { ...baseVisuals }` ile zaten görselsüz kalır; `longContent` full'u spread'lediği için üç görseli de alır — taşma testi için istenen davranış.)

- [ ] **Step 5: Testler + typecheck**

Run: `corepack pnpm --filter @mailmyra/renderer test && corepack pnpm typecheck`
Expected: PASS. Dikkat: mevcut `omits the image column when no avatar or logo is set` testi geçmeye devam etmeli (iki slot da boşsa sütun yok). Guardrails de geçmeli (yeni img'ler width taşıyor).

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/templates/classic-horizontal.ts packages/renderer/src/fixtures/samples.ts packages/renderer/test/classic-horizontal.test.ts
git commit -m "feat(renderer): logo slot below avatar and hand-signature bottom row in classic-horizontal"
```

---

### Task 5: Renderer sosyal ikonları + iki-modlu guardrail

**Files:**
- Modify: `packages/renderer/src/templates/classic-horizontal.ts` (sosyal blok ~satır 186-205)
- Modify: `packages/renderer/test/classic-horizontal.test.ts`
- Modify: `packages/renderer/test/guardrails.test.ts`

**Interfaces:**
- Consumes: `opts?: RenderOptions` (Task 3), `brand` = normalize edilmiş 6-hex (template'te mevcut).
- Produces: `opts.iconBaseUrl` verilince sosyal satır `<a><img src="<base>/icons/<varyant>/<platform>.png" width="24" height="24" ...></a>` hücreleri olur; varyant yolu `filled` | `outline` | `mono-<hex6>` (küçük harf, #'siz brandColor). Verilmezse mevcut metin-link davranışı bire bir korunur.

- [ ] **Step 1: Failing şablon testleri**

`packages/renderer/test/classic-horizontal.test.ts` describe bloğuna ekle:

```ts
  it('renders text links (no /icons/ img) when iconBaseUrl is absent', () => {
    const html = classicHorizontal(full);
    expect(html).toContain('>LinkedIn</a>');
    expect(html).not.toContain('/icons/');
  });
  it('renders one 24x24 icon img per social entry when iconBaseUrl is given', () => {
    const html = classicHorizontal(full, { iconBaseUrl: 'https://cdn.example.com' });
    // full fixture: linkedin + instagram + behance, iconStyle 'mono', brand #719ad1
    expect(html).toContain('src="https://cdn.example.com/icons/mono-719ad1/linkedin.png"');
    expect(html).toContain('src="https://cdn.example.com/icons/mono-719ad1/instagram.png"');
    expect(html).toContain('src="https://cdn.example.com/icons/mono-719ad1/behance.png"');
    const iconImgs = html.match(/<img[^>]*\/icons\/[^>]*>/gi) ?? [];
    expect(iconImgs).toHaveLength(3);
    for (const img of iconImgs) {
      expect(img).toContain('width="24"');
      expect(img).toContain('height="24"');
      expect(img).toContain('border="0"');
    }
    // Metin-link etiketleri artık yok
    expect(html).not.toContain('>LinkedIn</a>');
  });
  it('maps filled/outline icon styles to their static variant paths', () => {
    const filled = classicHorizontal(
      { ...full, layout: { ...full.layout, iconStyle: 'filled' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(filled).toContain('/icons/filled/linkedin.png');
    const outline = classicHorizontal(
      { ...full, layout: { ...full.layout, iconStyle: 'outline' } },
      { iconBaseUrl: 'https://cdn.example.com' },
    );
    expect(outline).toContain('/icons/outline/linkedin.png');
  });
  it('strips a trailing slash from iconBaseUrl', () => {
    const html = classicHorizontal(full, { iconBaseUrl: 'https://cdn.example.com/' });
    expect(html).toContain('src="https://cdn.example.com/icons/');
    expect(html).not.toContain('.com//icons/');
  });
```

Run: `corepack pnpm --filter @mailmyra/renderer test -- classic-horizontal`
Expected: FAIL

- [ ] **Step 2: Sosyal bloğu iki dallı yaz**

`classic-horizontal.ts` içindeki mevcut sosyal bloğu (`// Sosyal (metin-link ...)` ile başlayan `if (data.social.length) { ... }`) şununla değiştir:

```ts
  // Sosyal: iconBaseUrl verilirse CDN PNG ikonları, verilmezse metin-link
  // (geriye uyumlu — eski çağrılar ve testler aynen çalışır).
  if (data.social.length) {
    const socialCellStyle = {
      'padding-top': `${Math.round(s.gap / 2)}px`,
      'padding-bottom': '2px',
    };
    if (opts?.iconBaseUrl) {
      const base = opts.iconBaseUrl.replace(/\/$/, '');
      const variantPath =
        data.layout.iconStyle === 'mono'
          ? `mono-${brand.slice(1)}`
          : data.layout.iconStyle;
      const iconCells = data.social
        .map((soc, i) =>
          cell(
            `<a href="${sanitizeUrl(soc.url)}" style="text-decoration:none"><img src="${base}/icons/${variantPath}/${soc.platform}.png" width="24" height="24" alt="${PLATFORM_LABELS[soc.platform]}" border="0" style="${styleToString(
              {
                border: 'none',
                display: 'inline-block',
              },
            )}" /></a>`,
            {
              style:
                i < data.social.length - 1 ? { 'padding-right': '8px' } : undefined,
            },
          ),
        )
        .join('');
      lines.push(row(cell(table(row(iconCells)), { style: socialCellStyle })));
    } else {
      const sep = `<span style="color:${muted}">&nbsp;·&nbsp;</span>`;
      const socialHtml = data.social
        .map(
          (soc) =>
            `<a href="${sanitizeUrl(soc.url)}" style="${linkStyle}">${PLATFORM_LABELS[soc.platform]}</a>`,
        )
        .join(sep);
      lines.push(row(cell(socialHtml, { style: socialCellStyle })));
    }
  }
```

Task 3'te `void opts;` eklendiyse kaldır.

- [ ] **Step 3: Guardrail suite'ini iki moda çıkar + ikon kuralı**

`packages/renderer/test/guardrails.test.ts` tüm içeriğini şununla değiştir:

```ts
import { describe, it, expect } from 'vitest';
import { renderSignature, TEMPLATE_IDS } from '../src/render';
import { fixtures } from '../src/fixtures/samples';

const WEB_SAFE_FONTS = [
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Verdana, Geneva, sans-serif',
  'Tahoma, Geneva, sans-serif',
  'Trebuchet MS, sans-serif',
];

// Spec (§3c): guardrail suite'i her şablon×fixture için İKİ modda koşar —
// metin-link (iconBaseUrl'süz) ve ikonlu. İkon <img> kuralları ancak ikinci
// modda tetiklenir.
const MODES = [
  { name: 'text-link', opts: undefined },
  { name: 'icons', opts: { iconBaseUrl: 'https://cdn.example.com' } },
] as const;

for (const mode of MODES) {
  for (const templateId of TEMPLATE_IDS) {
    for (const fx of fixtures) {
      describe(`guardrails: ${templateId} / ${fx.id} / ${mode.name}`, () => {
        const html = renderSignature(fx.data, templateId, mode.opts);

        it('uses no <div>, flexbox, grid, float, or position', () => {
          expect(html).not.toMatch(/<div[\s/>]/i);
          expect(html).not.toMatch(/display\s*:\s*flex/i);
          expect(html).not.toMatch(/display\s*:\s*grid/i);
          expect(html).not.toMatch(/float\s*:/i);
          expect(html).not.toMatch(/position\s*:/i);
        });

        it('has no <style> block and no class attributes', () => {
          expect(html).not.toMatch(/<style/i);
          expect(html).not.toMatch(/\sclass=/i);
        });

        it('every <table> declares border="0" and border:none', () => {
          const tables = html.match(/<table[^>]*>/gi) ?? [];
          expect(tables.length).toBeGreaterThan(0);
          for (const t of tables) {
            expect(t).toContain('border="0"');
            expect(t).toContain('border:none');
          }
        });

        it('uses no svg, webp, data-uri images, or scripts', () => {
          expect(html).not.toMatch(/<svg/i);
          expect(html).not.toMatch(/\.webp/i);
          expect(html).not.toMatch(/src\s*=\s*["']data:/i);
          expect(html).not.toMatch(/<script/i);
        });

        it('every <img> carries a width attribute', () => {
          const imgs = html.match(/<img[^>]*>/gi) ?? [];
          for (const img of imgs) {
            expect(img).toMatch(/\swidth=/i);
          }
        });

        // PAZARLIKSIZ (spec §3c): ikon img'leri width VE height taşır —
        // Outlook height'sız dış boyutu tanımaz.
        it('every icon <img> (src containing /icons/) carries width AND height', () => {
          const imgs = html.match(/<img[^>]*>/gi) ?? [];
          for (const img of imgs) {
            if (/src="[^"]*\/icons\//i.test(img)) {
              expect(img).toMatch(/\swidth=/i);
              expect(img).toMatch(/\sheight=/i);
            }
          }
        });

        if (mode.name === 'icons' && fx.data.social.length > 0) {
          it('actually renders icon imgs in icons mode (rule above is not vacuous)', () => {
            expect(html).toMatch(/<img[^>]*src="[^"]*\/icons\//i);
          });
        }

        it('uses only web-safe font families', () => {
          const fonts = [...html.matchAll(/font-family:([^;"']+)/gi)].map((m) =>
            (m[1] ?? '').trim(),
          );
          for (const f of fonts) {
            expect(WEB_SAFE_FONTS).toContain(f);
          }
        });
      });
    }
  }
}
```

- [ ] **Step 4: Testler + typecheck**

Run: `corepack pnpm --filter @mailmyra/renderer test && corepack pnpm typecheck`
Expected: PASS (guardrail sayısı ~iki katına çıkar)

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/templates/classic-horizontal.ts packages/renderer/test/classic-horizontal.test.ts packages/renderer/test/guardrails.test.ts
git commit -m "feat(renderer): social icon imgs via iconBaseUrl with dual-mode guardrails"
```

---

### Task 6: İkon üretim çekirdeği — `apps/web/lib/icons.ts`

**Files:**
- Modify: `apps/web/package.json` (devDependencies'e `"simple-icons": "^13.0.0"`; scripts'e `"icons": "tsx scripts/generate-icons.ts"` — script dosyası Task 7'de gelir, script girdisini şimdi eklemek zararsız)
- Create: `apps/web/lib/icons.ts`
- Test: `apps/web/test/icons.test.ts`

**Interfaces:**
- Consumes: `contrastRatio`, `normalizeHex` — `@mailmyra/renderer` (Task 3 export'ları); `simple-icons` named exports (`siLinkedin`, `siX`, `siInstagram`, `siFacebook`, `siYoutube`, `siGithub`, `siBehance`, `siDribbble` — her biri `{ title, slug, hex, path }`, path 24×24 viewBox).
- Produces (Task 7 ve 8 bunları kullanır):
  - `ICON_PLATFORMS: SocialPlatform[]` (8 platform)
  - `generateStaticIcons(cdnWritePath: string): Promise<{ written: number; skipped: number }>`
  - `generateMonoIcons(cdnWritePath: string, color: string): Promise<{ degraded: boolean }>`
  - `DEGRADED_GLYPH_HEX = '666666'` (bilgi notu eşiği ile aynı karar)

- [ ] **Step 1: Bağımlılığı ekle**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && corepack pnpm --filter web add -D simple-icons@^13.0.0
```

Sonra `apps/web/package.json` scripts'e ekle: `"icons": "tsx scripts/generate-icons.ts"`.
Doğrula: `corepack pnpm --filter web exec node -e "import('simple-icons').then(m => console.log(Boolean(m.siLinkedin && m.siX && m.siBehance)))"` → `true`

- [ ] **Step 2: Failing test**

`apps/web/test/icons.test.ts` oluştur:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { ICON_PLATFORMS, generateStaticIcons, generateMonoIcons } from '../lib/icons';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-icons-'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('ICON_PLATFORMS', () => {
  it('contains exactly the 8 supported platforms', () => {
    expect([...ICON_PLATFORMS].sort()).toEqual([
      'behance', 'dribbble', 'facebook', 'github',
      'instagram', 'linkedin', 'x', 'youtube',
    ]);
  });
});

describe('generateStaticIcons', () => {
  it('writes 48x48 PNGs for filled and outline variants of all platforms', async () => {
    const res = await generateStaticIcons(dir);
    expect(res.written).toBe(16);
    expect(res.skipped).toBe(0);
    for (const variant of ['filled', 'outline'] as const) {
      const files = readdirSync(join(dir, 'icons', variant)).sort();
      expect(files).toEqual([...ICON_PLATFORMS].sort().map((p) => `${p}.png`));
    }
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
    expect(res.skipped).toBe(16);
    expect(readFileSync(target).equals(before)).toBe(true);
    expect(statSync(target).mtimeMs).toBe(mtimeBefore);
  });
});

describe('generateMonoIcons', () => {
  it('writes 8 PNGs under icons/mono-<hex6> (lowercase, no #) and reports degraded=false for a dark color', async () => {
    const res = await generateMonoIcons(dir, '#3366AA');
    expect(res.degraded).toBe(false);
    const files = readdirSync(join(dir, 'icons', 'mono-3366aa')).sort();
    expect(files).toEqual([...ICON_PLATFORMS].sort().map((p) => `${p}.png`));
    const meta = await sharp(join(dir, 'icons', 'mono-3366aa', 'github.png')).metadata();
    expect(meta.width).toBe(48);
    expect(meta.hasAlpha).toBe(true);
  });
  it('degrades the DEFAULT brand color #719ad1 (contrast vs white ≈2.90 < 3) — documents product-visible behavior', async () => {
    // Bilinçli belgeleme: varsayılan marka rengiyle mono ikonlar #666666
    // glifle basılır ve builder Stil adımında bilgi notu görünür. Ürün
    // kararı değişirse (eşik veya varsayılan renk) bu test onu yakalar.
    const res = await generateMonoIcons(dir, '#719ad1');
    expect(res.degraded).toBe(true);
  });
  it('degrades a near-white color to the #666666 glyph but keeps the ORIGINAL hex in the path', async () => {
    const res = await generateMonoIcons(dir, '#ffffff');
    expect(res.degraded).toBe(true);
    // Yol orijinal hex ile — URL deterministik kalır (spec §3b)
    const degradedFile = join(dir, 'icons', 'mono-ffffff', 'github.png');
    // Glif gerçekten #666666 ile basılmış olmalı: doğrudan #666666 üretimiyle bayt-eş
    await generateMonoIcons(dir, '#666666');
    const reference = join(dir, 'icons', 'mono-666666', 'github.png');
    expect(readFileSync(degradedFile).equals(readFileSync(reference))).toBe(true);
  });
  it('dedups: when all files exist the second call still succeeds and reports the same degraded flag', async () => {
    const first = await generateMonoIcons(dir, '#3366aa');
    const target = join(dir, 'icons', 'mono-3366aa', 'x.png');
    const mtimeBefore = statSync(target).mtimeMs;
    const second = await generateMonoIcons(dir, '#3366aa');
    expect(second).toEqual(first);
    expect(statSync(target).mtimeMs).toBe(mtimeBefore);
  });
  it('rejects an invalid hex', async () => {
    await expect(generateMonoIcons(dir, 'kırmızı')).rejects.toThrow();
  });
});
```

Run: `corepack pnpm --filter web test -- icons.test`
Expected: FAIL — `Cannot find module '../lib/icons'`

- [ ] **Step 3: lib/icons.ts implementasyonu**

`apps/web/lib/icons.ts` oluştur:

```ts
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import {
  siBehance,
  siDribbble,
  siFacebook,
  siGithub,
  siInstagram,
  siLinkedin,
  siX,
  siYoutube,
} from 'simple-icons';
import { contrastRatio, normalizeHex, type SignatureData } from '@mailmyra/renderer';

type SocialPlatform = SignatureData['social'][number]['platform'];

// simple-icons ^13'e SABİT: v14.0.0 linkedin ikonunu kaldırdı (marka talebi).
// Upgrade etmeden önce 8 platformun tamamının pakette olduğunu doğrula.
const ICONS: Record<SocialPlatform, { hex: string; path: string }> = {
  linkedin: siLinkedin,
  x: siX,
  instagram: siInstagram,
  facebook: siFacebook,
  youtube: siYoutube,
  github: siGithub,
  behance: siBehance,
  dribbble: siDribbble,
};

export const ICON_PLATFORMS = Object.keys(ICONS) as SocialPlatform[];

/** Açık marka renginde mono glifin düşürüldüğü koyu gri (spec §3b). */
export const DEGRADED_GLYPH_HEX = '666666';
const DEGRADE_MIN_CONTRAST_ON_WHITE = 3;

const CANVAS = 48; // 2x retina; HTML'de 24x24 kullanılır
const FILLED_GLYPH = 30; // yuvarlatılmış kare içinde glif boyutu
const FILLED_RADIUS = 10;

// SVG yalnızca sharp'a SUNUCU tarafı girdidir — çıktı daima PNG
// (e-posta HTML kısıtı: çıktıda SVG olamaz). simple-icons path'leri 24x24.
function svgFilled(glyphPath: string, brandHex: string): string {
  const scale = FILLED_GLYPH / 24;
  const offset = (CANVAS - FILLED_GLYPH) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
    `<rect width="${CANVAS}" height="${CANVAS}" rx="${FILLED_RADIUS}" fill="#${brandHex}"/>` +
    `<g transform="translate(${offset} ${offset}) scale(${scale})"><path d="${glyphPath}" fill="#ffffff"/></g>` +
    `</svg>`
  );
}

function svgGlyph(glyphPath: string, colorHex: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
    `<g transform="scale(${CANVAS / 24})"><path d="${glyphPath}" fill="#${colorHex}"/></g>` +
    `</svg>`
  );
}

async function renderIconPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

/**
 * Değişmezlik: var olan dosya asla yeniden yazılmaz. 'wx' + EEXIST-atla,
 * storage.ts'teki content-hash dosyalarıyla aynı disiplin — ama ikonlar
 * deterministik üretildiği için EEXIST çakışma değil dedup'tır.
 * Dönüş: dosya gerçekten yazıldı mı.
 */
async function writeIconFile(dir: string, filename: string, buf: Buffer): Promise<boolean> {
  await mkdir(dir, { recursive: true });
  try {
    await writeFile(join(dir, filename), buf, { flag: 'wx' });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    return false;
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/** filled + outline statik setleri. Deploy prosedürünün parçası (elle koşulur). */
export async function generateStaticIcons(
  cdnWritePath: string,
): Promise<{ written: number; skipped: number }> {
  let written = 0;
  let skipped = 0;
  for (const platform of ICON_PLATFORMS) {
    const icon = ICONS[platform];
    const brandHex = icon.hex.toLowerCase();
    const jobs: Array<{ dir: string; svg: string }> = [
      { dir: join(cdnWritePath, 'icons', 'filled'), svg: svgFilled(icon.path, brandHex) },
      { dir: join(cdnWritePath, 'icons', 'outline'), svg: svgGlyph(icon.path, brandHex) },
    ];
    for (const job of jobs) {
      const target = join(job.dir, `${platform}.png`);
      if (await fileExists(target)) {
        skipped += 1;
        continue;
      }
      const wrote = await writeIconFile(job.dir, `${platform}.png`, await renderIconPng(job.svg));
      if (wrote) written += 1;
      else skipped += 1;
    }
  }
  return { written, skipped };
}

/**
 * Kullanıcı brandColor'ı ile 8 mono ikon. Beyaza karşı kontrast < 3 ise glif
 * #666666'ya düşürülür ama YOL orijinal hex'te kalır (URL deterministik).
 * Tüm dosyalar zaten varsa üretim atlanır (dedup) — degraded bayrağı renkten
 * deterministik hesaplandığı için dedup yolunda da doğru döner.
 */
export async function generateMonoIcons(
  cdnWritePath: string,
  color: string,
): Promise<{ degraded: boolean }> {
  const hex6 = normalizeHex(color).slice(1);
  const degraded = contrastRatio(`#${hex6}`, '#ffffff') < DEGRADE_MIN_CONTRAST_ON_WHITE;
  const glyphHex = degraded ? DEGRADED_GLYPH_HEX : hex6;
  const dir = join(cdnWritePath, 'icons', `mono-${hex6}`);

  const allExist = (
    await Promise.all(ICON_PLATFORMS.map((p) => fileExists(join(dir, `${p}.png`))))
  ).every(Boolean);
  if (allExist) return { degraded };

  for (const platform of ICON_PLATFORMS) {
    if (await fileExists(join(dir, `${platform}.png`))) continue;
    await writeIconFile(
      dir,
      `${platform}.png`,
      await renderIconPng(svgGlyph(ICONS[platform].path, glyphHex)),
    );
  }
  return { degraded };
}
```

- [ ] **Step 4: Testler + typecheck**

Run: `corepack pnpm --filter web test -- icons.test && corepack pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/lib/icons.ts apps/web/test/icons.test.ts
git commit -m "feat(web): icon generation core with simple-icons pinned to v13"
```

---

### Task 7: Statik ikon CLI — `scripts/generate-icons.ts` + dev kurulumu

**Files:**
- Create: `apps/web/scripts/generate-icons.ts`
- Modify: `.env.example` (ICON_RATE_LIMIT_PER_HOUR satırı — Task 8'in env'i, burada birlikte belgelenir)

**Interfaces:**
- Consumes: `generateStaticIcons` (Task 6).
- Produces: `corepack pnpm --filter web icons` komutu; dev CDN'de (`apps/web/public/cdn-dev/icons/{filled,outline}/*.png`) 16 dosya.

- [ ] **Step 1: CLI script (cleanup-orphans.ts kalıbında)**

`apps/web/scripts/generate-icons.ts` oluştur:

```ts
import { generateStaticIcons } from '../lib/icons';

async function main(): Promise<void> {
  const dir = process.env.CDN_WRITE_PATH;
  if (!dir) {
    console.error('CDN_WRITE_PATH tanımlı değil.');
    process.exit(1);
  }
  const res = await generateStaticIcons(dir);
  console.log(`icons: ${res.written} yazıldı, ${res.skipped} atlandı (mevcut).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 2: .env.example'ı güncelle**

`.env.example` sonuna ekle:

```
ICON_RATE_LIMIT_PER_HOUR=60
```

- [ ] **Step 3: Dev CDN'e statik ikonları üret ve doğrula**

(tsx `.env.local` YÜKLEMEZ — env inline verilir; cleanup script'iyle aynı kalıp.)

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work/apps/web && CDN_WRITE_PATH=./public/cdn-dev corepack pnpm icons
```

Expected: `icons: 16 yazıldı, 0 atlandı (mevcut).`
Doğrula: `ls apps/web/public/cdn-dev/icons/filled apps/web/public/cdn-dev/icons/outline` → her birinde 8 png.
İkinci koşum: `icons: 0 yazıldı, 16 atlandı (mevcut).`

- [ ] **Step 4: Commit**

```bash
git add apps/web/scripts/generate-icons.ts .env.example
git commit -m "feat(web): static icon generation CLI (filled/outline)"
```

(`public/cdn-dev` git'e dahilse üretilen png'leri COMMIT'LEME — `git status` ile kontrol et; izleniyorsa `.gitignore`'a `apps/web/public/cdn-dev/` ekle ve bunu commit'e dahil et.)

---

### Task 8: `POST /api/icons/mono` + `clientIp` çıkarımı

**Files:**
- Create: `apps/web/lib/client-ip.ts`
- Modify: `apps/web/app/api/upload/route.ts` (yerel `clientIp` silinir, import edilir)
- Create: `apps/web/app/api/icons/mono/route.ts`
- Test: `apps/web/test/icons-mono-route.test.ts`

**Interfaces:**
- Consumes: `generateMonoIcons` (Task 6), `createRateLimiter` (`lib/rate-limit.ts`), `envInt` (`lib/env.ts`), `isValidHex` (`@mailmyra/renderer`, Task 3).
- Produces: `clientIp(req: Request): string` (`lib/client-ip.ts`); `POST /api/icons/mono` — girdi `{ color: string }`, 200 → `{ ready: true, degraded?: true }`, 400 (geçersiz hex/gövde), 429 (limit, default 60/saat/IP, env `ICON_RATE_LIMIT_PER_HOUR`), 500 (CDN env eksik).

- [ ] **Step 1: clientIp'yi lib'e taşı**

`apps/web/lib/client-ip.ts` oluştur (upload route'taki yorumla birlikte taşınır):

```ts
/**
 * `X-Forwarded-For` zincirinde SOL taraf istemcinin kendisidir ve serbestçe
 * sahtelenebilir (spoofable) — arkadaki proxy zincirine ekleme yapan (append
 * eden) bir kurulumda güvenilecek tek girdi SAĞ uçtaki (en son eklenen)
 * girdidir. Boş/whitespace-only değer veya header'ın kendisi yoksa 'local'.
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (!xff) return 'local';
  const last = xff.split(',').pop()?.trim();
  return last ? last : 'local';
}
```

`apps/web/app/api/upload/route.ts`: yerel `clientIp` fonksiyonunu ve üstündeki JSDoc yorumunu sil, en üste `import { clientIp } from '../../../lib/client-ip';` ekle.

Run: `corepack pnpm --filter web test -- upload-route`
Expected: PASS (davranış değişmedi — mevcut x-forwarded-for testleri kanıt)

- [ ] **Step 2: Failing route testleri**

`apps/web/test/icons-mono-route.test.ts` oluştur:

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type PostFn = (req: Request) => Promise<Response>;
let POST: PostFn;
let dir: string;
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'mailmyra-mono-'));
  process.env.CDN_WRITE_PATH = dir;
  process.env.CDN_PUBLIC_URL = 'http://cdn.test';
  process.env.ICON_RATE_LIMIT_PER_HOUR = '30';
  vi.resetModules();
  ({ POST } = await import('../app/api/icons/mono/route'));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function makeRequest(body: unknown, ip = '9.9.9.9'): Request {
  return new Request('http://localhost/api/icons/mono', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
  });
}

describe('POST /api/icons/mono', () => {
  it('generates 8 mono icons for a valid dark color and returns ready without degraded', async () => {
    const res = await POST(makeRequest({ color: '#3366aa' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ready).toBe(true);
    expect(body.degraded).toBeUndefined();
    expect(readdirSync(join(dir, 'icons', 'mono-3366aa'))).toHaveLength(8);
  });
  it('returns degraded: true for a near-white color, path still under the original hex', async () => {
    const res = await POST(makeRequest({ color: '#ffff00' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ready: true, degraded: true });
    expect(readdirSync(join(dir, 'icons', 'mono-ffff00'))).toHaveLength(8);
  });
  it('rejects an invalid hex with 400', async () => {
    const res = await POST(makeRequest({ color: 'kırmızı' }));
    expect(res.status).toBe(400);
  });
  it('rejects a missing/malformed body with 400', async () => {
    const res = await POST(
      new Request('http://localhost/api/icons/mono', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9' },
      }),
    );
    expect(res.status).toBe(400);
  });
  it('returns 500 when CDN env config is missing', async () => {
    delete process.env.CDN_WRITE_PATH;
    const res = await POST(makeRequest({ color: '#719ad1' }));
    expect(res.status).toBe(500);
  });
  it('enforces the per-ip rate limit with 429 (separate, more generous limiter than upload)', async () => {
    process.env.ICON_RATE_LIMIT_PER_HOUR = '2';
    vi.resetModules();
    ({ POST } = await import('../app/api/icons/mono/route'));
    // Aynı renk → ikinci istek dedup hızlı yolundan döner ama limiti YİNE tüketir
    expect((await POST(makeRequest({ color: '#719ad1' }, '5.5.5.5'))).status).toBe(200);
    expect((await POST(makeRequest({ color: '#719ad1' }, '5.5.5.5'))).status).toBe(200);
    expect((await POST(makeRequest({ color: '#719ad1' }, '5.5.5.5'))).status).toBe(429);
  });
});
```

Run: `corepack pnpm --filter web test -- icons-mono-route`
Expected: FAIL — modül yok

- [ ] **Step 3: Route implementasyonu**

`apps/web/app/api/icons/mono/route.ts` oluştur:

```ts
import { isValidHex } from '@mailmyra/renderer';
import { createRateLimiter } from '../../../../lib/rate-limit';
import { clientIp } from '../../../../lib/client-ip';
import { envInt } from '../../../../lib/env';
import { generateMonoIcons } from '../../../../lib/icons';

// Upload limiter'ından AYRI ve daha cömert (spec §3b): renk denemeleri
// normal kullanımdır; her brandColor değişikliği (debounce sonrası) bir POST.
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
    return jsonError(400, 'Geçersiz renk. #rrggbb formatında hex bekleniyor.');
  }

  const { degraded } = await generateMonoIcons(writePath, color);
  return Response.json(degraded ? { ready: true, degraded: true } : { ready: true });
}
```

- [ ] **Step 4: Testler + typecheck**

Run: `corepack pnpm --filter web test && corepack pnpm typecheck`
Expected: PASS (upload-route dahil tüm suite)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/client-ip.ts apps/web/app/api/upload/route.ts apps/web/app/api/icons/mono/route.ts apps/web/test/icons-mono-route.test.ts
git commit -m "feat(web): on-demand mono icon endpoint with contrast degrade and dedup"
```

---

### Task 9: Builder entegrasyonu + export güvenliği

**Files:**
- Create: `apps/web/lib/icon-readiness.ts`
- Test: `apps/web/test/icon-readiness.test.ts`
- Modify: `apps/web/app/builder/page.tsx`
- Modify: `apps/web/app/builder/BuilderClient.tsx`
- Modify: `apps/web/components/ExportButtons.tsx`
- Modify: `apps/web/app/builder/steps/StyleStep.tsx` (degraded notu + eski etiket temizliği)

**Interfaces:**
- Consumes: `renderSignature(data, id, opts?)` (Task 3/5), `POST /api/icons/mono` (Task 8).
- Produces: `needsMonoIcons(data: SignatureData): boolean` (`lib/icon-readiness.ts`); `BuilderClient({ gated, iconBaseUrl }: { gated: boolean; iconBaseUrl: string })`; `ExportButtons` yeni prop'lar `disabled?: boolean`, `disabledNote?: string` (vermeyen çağıranlar — dev/render — değişmeden çalışır); `StyleStep({ data, dispatch, monoDegraded }: {...; monoDegraded?: boolean })`.

- [ ] **Step 1: needsMonoIcons + failing test**

`apps/web/test/icon-readiness.test.ts` oluştur:

```ts
import { describe, it, expect } from 'vitest';
import { createEmptyData } from '../app/builder/reducer';
import { needsMonoIcons } from '../lib/icon-readiness';

const social = [{ platform: 'linkedin', url: 'https://linkedin.com/in/x' }] as const;

describe('needsMonoIcons', () => {
  it('requires mono icon style AND at least one social entry', () => {
    const base = createEmptyData(); // iconStyle: 'mono', social: []
    expect(needsMonoIcons(base)).toBe(false);
    expect(needsMonoIcons({ ...base, social: [...social] })).toBe(true);
  });
  it('is false for filled/outline regardless of social entries (static, deploy-time)', () => {
    const base = { ...createEmptyData(), social: [...social] };
    expect(needsMonoIcons({ ...base, layout: { ...base.layout, iconStyle: 'filled' } })).toBe(false);
    expect(needsMonoIcons({ ...base, layout: { ...base.layout, iconStyle: 'outline' } })).toBe(false);
  });
});
```

Run: `corepack pnpm --filter web test -- icon-readiness` → FAIL (modül yok)

`apps/web/lib/icon-readiness.ts` oluştur:

```ts
import type { SignatureData } from '@mailmyra/renderer';

/**
 * Export kilidi yalnız mono gerektiğinde devreye girer (spec §3d):
 * filled/outline deploy-time statiktir, sosyal boşken ikon hiç basılmaz.
 */
export function needsMonoIcons(data: SignatureData): boolean {
  return data.layout.iconStyle === 'mono' && data.social.length > 0;
}
```

Run: `corepack pnpm --filter web test -- icon-readiness` → PASS

- [ ] **Step 2: ExportButtons'a disabled/disabledNote ekle**

`apps/web/components/ExportButtons.tsx` tüm içeriği:

```tsx
'use client';

import { useRouter } from 'next/navigation';

export function ExportButtons({
  html,
  filename,
  gated,
  disabled = false,
  disabledNote,
}: {
  html: string;
  filename: string;
  gated: boolean;
  disabled?: boolean;
  disabledNote?: string;
}) {
  const router = useRouter();

  async function copyHtml() {
    if (gated) {
      router.push('/login');
      return;
    }
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ]);
      alert('Kopyalandı (text/html)');
    } catch (e) {
      alert(`Kopyalama başarısız: ${(e as Error).message}`);
    }
  }

  function downloadHtm() {
    if (gated) {
      router.push('/login');
      return;
    }
    const doc = `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
    const blob = new Blob([doc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.htm`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" onClick={copyHtml} disabled={disabled}>
        HTML olarak kopyala
      </button>
      <button type="button" onClick={downloadHtm} disabled={disabled}>
        .htm indir
      </button>
      {disabled && disabledNote ? (
        <span style={{ fontSize: 13, color: '#a05a2c' }}>{disabledNote}</span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: page.tsx iconBaseUrl'i indirir**

`apps/web/app/builder/page.tsx` — default export:

```tsx
export default function BuilderPage() {
  // iconBaseUrl export-gate ile aynı desen: her istekte sunucudan okunur
  // (dosyadaki mevcut force-dynamic yorumu ve export'u aynen kalır).
  return <BuilderClient gated={isExportGated()} iconBaseUrl={process.env.CDN_PUBLIC_URL ?? ''} />;
}
```

- [ ] **Step 4: BuilderClient — opts ile render + mono hazırlık durumu + export kilidi**

`apps/web/app/builder/BuilderClient.tsx` değişiklikleri:

İmza ve import'lar:

```tsx
import { needsMonoIcons } from '../../lib/icon-readiness';
// ...
export function BuilderClient({ gated, iconBaseUrl }: { gated: boolean; iconBaseUrl: string }) {
```

`html` memo'sunu değiştir:

```tsx
  const html = useMemo(
    () =>
      renderSignature(
        data,
        data.layout.templateId,
        iconBaseUrl ? { iconBaseUrl } : undefined,
      ),
    [data, iconBaseUrl],
  );
```

Draft-kaydetme effect'inin ALTINA mono hazırlık bloğunu ekle:

```tsx
  // Mono ikon hazırlığı (spec §3d): mono + sosyal varken brandColor/iconStyle
  // değişimlerinde 500ms debounce ile /api/icons/mono çağrılır. Dönene kadar
  // export kilitli — kopyalanan HTML'de asla henüz-yazılmamış ikon URL'i olamaz.
  const monoNeeded = Boolean(iconBaseUrl) && needsMonoIcons(data);
  const [iconState, setIconState] = useState<'ready' | 'pending' | 'error'>('ready');
  const [monoDegraded, setMonoDegraded] = useState(false);
  const [retryTick, setRetryTick] = useState(0);
  const monoSeq = useRef(0);

  useEffect(() => {
    if (!monoNeeded) {
      setIconState('ready');
      setMonoDegraded(false);
      return;
    }
    const seq = ++monoSeq.current;
    setIconState('pending');
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/icons/mono', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ color: data.visuals.brandColor }),
        });
        const body = (await res.json()) as { ready?: boolean; degraded?: boolean };
        if (seq !== monoSeq.current) return; // eski cevap — daha yenisi yolda
        if (res.ok && body.ready) {
          setIconState('ready');
          setMonoDegraded(Boolean(body.degraded));
        } else {
          setIconState('error');
        }
      } catch {
        if (seq === monoSeq.current) setIconState('error');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [monoNeeded, data.visuals.brandColor, retryTick]);

  const exportDisabled = monoNeeded && iconState !== 'ready';
```

`StyleStep` çağrısını güncelle:

```tsx
      {step === 'style' && <StyleStep data={data} dispatch={dispatch} monoDegraded={monoDegraded} />}
```

`previewPane`'i güncelle:

```tsx
  const previewPane = (
    <div className={styles.previewPane}>
      <Preview html={html} />
      <ExportButtons
        html={html}
        filename="mailmyra-imza"
        gated={gated}
        disabled={exportDisabled}
        disabledNote={
          exportDisabled
            ? iconState === 'error'
              ? 'İkonlar üretilemedi — tekrar deneyin'
              : 'İkonlar hazırlanıyor…'
            : undefined
        }
      />
      {monoNeeded && iconState === 'error' && (
        <button type="button" onClick={() => setRetryTick((n) => n + 1)}>
          Yeniden dene
        </button>
      )}
    </div>
  );
```

- [ ] **Step 5: StyleStep — degraded bilgi notu + eski etiket temizliği**

`apps/web/app/builder/steps/StyleStep.tsx`:

Bileşen imzası:

```tsx
export function StyleStep({
  data,
  dispatch,
  monoDegraded = false,
}: {
  data: SignatureData;
  dispatch: (a: BuilderAction) => void;
  monoDegraded?: boolean;
}) {
```

İkon stili `<select>`'inin etiketini güncelle (ikonlar artık geliyor):
`<span style={labelStyle}>İkon stili (sosyal ikonlar CDN ikonlarıyla gelecek)</span>` → `<span style={labelStyle}>İkon stili</span>`

İkon stili `<label>` bloğunun hemen ALTINA bilgi notu ekle:

```tsx
        {data.layout.iconStyle === 'mono' && monoDegraded && (
          <p style={{ fontSize: 13, color: '#666666', marginTop: 8 }}>
            ℹ️ Marka rengin açık olduğu için mono ikonlar koyu gri basıldı.
          </p>
        )}
```

- [ ] **Step 6: Tüm testler + typecheck**

Run: `corepack pnpm test && corepack pnpm typecheck`
Expected: PASS

- [ ] **Step 7: Tarayıcıda uçtan uca doğrula (dev server)**

Dev server'ı başlat (apps/web/.env.local mevcut olmalı — `.env.example` kopyası) ve `/builder`'da doğrula:
1. Sosyal adımda LinkedIn ekle, Stil'de ikon stili "Tek renk" → önizlemede `cdn-dev/icons/mono-719ad1/linkedin.png` görünür (network sekmesi 200; ilk istekte `/api/icons/mono` POST'u atılır ve dosya `public/cdn-dev/icons/mono-719ad1/` altında oluşur).
2. Marka rengini değiştir → ~500ms sonra yeni POST; dönene kadar export butonları disabled + "İkonlar hazırlanıyor…".
3. Çok açık renk seç (ör. #ffff00) → Stil adımında "Marka rengin açık olduğu için mono ikonlar koyu gri basıldı." notu.
4. İkon stili "Dolu" → export kilidi yok, ikonlar `icons/filled/` yolundan gelir (Task 7'de üretildi).
5. Sosyal listesi boşken hiçbir kilit/istek yok.

- [ ] **Step 8: Commit**

```bash
git add apps/web/lib/icon-readiness.ts apps/web/test/icon-readiness.test.ts apps/web/app/builder/page.tsx apps/web/app/builder/BuilderClient.tsx apps/web/components/ExportButtons.tsx apps/web/app/builder/steps/StyleStep.tsx
git commit -m "feat(web): builder icon preview with mono readiness export lock"
```

---

### Task 10: Harness'lar, .htm çıktıları, backlog notu — kontrol noktası hazırlığı

**Files:**
- Modify: `apps/web/app/dev/render/page.tsx`
- Modify: `packages/renderer/scripts/emit-htm.ts`
- Modify: `docs/backlog.md`

**Interfaces:**
- Consumes: her şey.
- Produces: `packages/renderer/out/classic-horizontal--{full,minimal,noLogo,longContent}.htm` — GERÇEK CDN ikon URL'leriyle (`https://cdn.mailmyra.com`); 6-istemci test paketi.

- [ ] **Step 1: dev/render harness'ı iconBaseUrl ile render etsin**

`apps/web/app/dev/render/page.tsx` içinde `fixtures.map` öncesine:

```tsx
  // Dev'de yerel cdn-dev/icons kullanılır (spec §4). Prod'da sayfa zaten 404.
  const iconBaseUrl = process.env.CDN_PUBLIC_URL;
```

ve render çağrısı:

```tsx
        const html = renderSignature(
          fx.data,
          'classic-horizontal',
          iconBaseUrl ? { iconBaseUrl } : undefined,
        );
```

- [ ] **Step 2: emit-htm gerçek CDN köküyle üretsin**

`packages/renderer/scripts/emit-htm.ts` render satırı:

```ts
// .htm çıktıları GERÇEK CDN ikon URL'leriyle üretilir (spec §4) — test
// öncesi ikonların cdn.mailmyra.com'a yüklenmesi deploy adımıdır (aşağıda).
const html = renderSignature(fx.data, 'classic-horizontal', {
  iconBaseUrl: 'https://cdn.mailmyra.com',
});
```

- [ ] **Step 3: .htm çıktılarını üret ve doğrula**

```bash
cd /Users/mmacstudio/Desktop/mailmyra-work && corepack pnpm --filter @mailmyra/renderer emit
```

Expected: 4 dosya `packages/renderer/out/` altına yazılır.
Doğrula: `grep -c 'cdn.mailmyra.com/icons/mono-719ad1' packages/renderer/out/classic-horizontal--full.htm` → `3` (linkedin+instagram+behance); `full.htm` içinde `logo` placeholder'ı ve el imzası `<img ... width="150"` var; `minimal.htm` içinde `/icons/` YOK (sosyal boş).

- [ ] **Step 4: Backlog notu — şablona özgü kararlar + deploy adımları**

`docs/backlog.md` "Hafta 2'ye devredilen işler" bölümünün ALTINA yeni bölüm ekle:

```markdown
## Hafta 2 Polish Notları — 2026-07-25

- **classic-horizontal'a ÖZGÜ yerleşim kararları** (gelecek şablonlar kendi
  yerleşimini seçer, bunlar sözleşme değildir): logo sol sütunda avatarın
  altında (8px boşluk, genişlik=kolon genişliği, height attribute YOK);
  el imzası en alt satırda disclaimer'ın sağında (150px görünüm / 300px 2x).
- [ ] **Logo width-only ölçekleme riski:** logo `<img>` height taşımıyor
  (SignatureData görsel oranı saklamıyor). Outlook genelde doğru ölçekler;
  6-istemci testinde ÖZELLİKLE kontrol edilecek. Sorun çıkarsa Hafta 4'te
  `visuals`'a boyut alanı (tip değişikliği + draft migrasyonu).
- [ ] **Deploy adımı — ikonlar gerçek CDN'e:** 6-istemci testinden ÖNCE
  `CDN_WRITE_PATH=<prod-cdn-yolu> corepack pnpm --filter web icons`
  prod'da koşulmalı; mono-719ad1 seti de ilk builder kullanımında oluşur
  (test .htm'leri için elle: `POST /api/icons/mono {"color":"#719ad1"}`).
- **simple-icons `^13.0.0`'a sabit:** v14.0.0 linkedin ikonunu kaldırdı
  (marka talebi). Upgrade öncesi 8 platformun varlığı doğrulanmalı; linkedin
  için kalıcı çözüm gerekirse glif path'i repoya vendor'lanır.
- [ ] **Hafta 4'e:** builder'da `filled`/`outline` seçiliyken statik ikonlar
  henüz deploy edilmemişse önizlemede kırık görsel görünür — dev kurulumunda
  script koşuldu; prod deploy checklist'ine eklendi (yukarıdaki madde).
```

- [ ] **Step 5: Son tur — tüm testler + typecheck**

Run: `corepack pnpm test && corepack pnpm typecheck`
Expected: PASS (renderer + web tüm suite)

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/dev/render/page.tsx packages/renderer/scripts/emit-htm.ts docs/backlog.md
git commit -m "feat: icon-aware dev harness and emit-htm with real CDN icon urls"
```

---

## Kontrol Noktası (plan sonrası, insan işi)

1. İkonlar gerçek CDN'e yüklenir (backlog'daki deploy adımı).
2. `packages/renderer/out/*.htm` (4 dosya) Hüseyin'e teslim edilir.
3. Hüseyin 6 istemcide test eder — **Outlook Classic DAHİL** (Windows Plesk RDP).
4. Test geçmeden `feat/week-2-builder` **merge EDİLMEZ**.
