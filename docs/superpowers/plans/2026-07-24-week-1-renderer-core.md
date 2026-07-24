# Hafta 1 — Renderer Çekirdeği Implementasyon Planı

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Framework'süz imza render motorunun çekirdeğini, `classic-horizontal` şablonunu ve `/dev/render` fixture harness'ını TDD ile kurmak.

**Architecture:** pnpm monorepo. `packages/renderer` saf TypeScript (React yok, DOM yok) — küçük saf util'ler (escape, color, inline-style, table) üstüne bir şablon fonksiyonu ve tek giriş noktası `renderSignature`. `apps/web` (Next.js App Router) yalnızca renderer'ı tüketen ince bir dev harness barındırır. Motor imza fragment'i döndürür; `.htm` doküman sarmalama harness/script katmanının işidir.

**Tech Stack:** TypeScript (strict), pnpm workspaces, Vitest, Next.js 15 + React 19, tsx.

## Global Constraints

Aşağıdakiler her görev için geçerlidir (CLAUDE.md'den birebir):

- **TypeScript her yerde, strict mode.**
- **Renderer saf fonksiyon:** DOM'a dokunmaz, React import etmez, tarayıcı API'si kullanmaz.
- **Table-based layout zorunlu.** `<div>`, flexbox, grid, float, position **YASAK**.
- **Tüm CSS inline.** `<style>` bloğu ve layout için `class=` **YASAK**.
- **Web-safe font zorunlu.** Yalnızca `WebSafeFont` union değerleri.
- **Görseller PNG/JPG.** SVG, WebP, `data:` gömülü görsel, `<script>` **YASAK**.
- **Retina:** her `<img>` bir `width` attribute'u taşır (2x kaynak, HTML'de küçültme).
- **Outlook 2512 bug'ı:** her `<table>` açıkça `border="0"` **ve** `border:none` içerir.
- **Export:** `ClipboardItem` ile `text/html` (asla `clipboard.writeText()`), ayrıca `.htm` indirme.
- **Max genişlik ~600px.**
- **CDN ertelendi:** Hafta 1 fixture'ları geçici placeholder görsel URL'i kullanır; `cdn.mailmyra.com` Hafta 2.
- **Sosyal ikonlar Hafta 1'de metin-link.** Gerçek PNG ikonlar CDN ile Hafta 2.
- Marka renkleri (logo SVG'den): brand `#719ad1`, muted/gri `#6d6e71`, tan `#dca16f`.
- Dil: kod/commit İngilizce, kullanıcıyla Türkçe.

**Spec realizasyon notu:** Spec'teki "dark fixture", tek bir veri fixture'ı yerine harness'ta **her fixture'ın koyu zeminde de önizlenmesi** olarak gerçeklenir (dark-mode istemci riskini tüm varyasyonlarda yakalar). Veri fixture'ları: `full`, `minimal`, `noLogo`, `longContent`.

---

### Task 1: Monorepo bootstrap + `escape` util

Kök workspace ve renderer paketini kurar, ilk saf util'i (HTML escape + URL sanitizasyonu) TDD ile ekler.

**Files:**
- Create: `package.json` (kök)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/renderer/package.json`
- Create: `packages/renderer/tsconfig.json`
- Create: `packages/renderer/vitest.config.ts`
- Create: `packages/renderer/src/utils/escape.ts`
- Test: `packages/renderer/test/escape.test.ts`

**Interfaces:**
- Produces: `htmlEscape(value: string): string`, `sanitizeUrl(url: string): string` — sonraki tüm görevler kullanıcı metnini/URL'lerini bunlarla güvene alır.

- [ ] **Step 1: Kök workspace dosyalarını oluştur**

`package.json`:
```json
{
  "name": "mailmyra",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "dev:web": "pnpm --filter web dev"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
  - "apps/*"
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  }
}
```

- [ ] **Step 2: Renderer paket dosyalarını oluştur**

`packages/renderer/package.json`:
```json
{
  "name": "@mailmyra/renderer",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "emit": "tsx scripts/emit-htm.ts"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^3.0.0"
  }
}
```

`packages/renderer/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src", "test", "scripts"]
}
```

`packages/renderer/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
```

- [ ] **Step 3: Bağımlılıkları kur**

Run:
```bash
corepack enable
pnpm install
```
Expected: pnpm workspace çözümlenir, `packages/renderer` bağımlılıkları kurulur, hata yok.

- [ ] **Step 4: Başarısız testi yaz**

`packages/renderer/test/escape.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { htmlEscape, sanitizeUrl } from '../src/utils/escape';

describe('htmlEscape', () => {
  it('escapes &, <, >, ", and \'', () => {
    expect(htmlEscape(`<a href="x">Tom & "Jerry" 'go'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; &quot;Jerry&quot; &#39;go&#39;&lt;/a&gt;',
    );
  });
  it('leaves plain unicode text unchanged', () => {
    expect(htmlEscape('Hüseyin Yıldız')).toBe('Hüseyin Yıldız');
  });
});

describe('sanitizeUrl', () => {
  it('allows https, mailto, tel', () => {
    expect(sanitizeUrl('https://voldi.net')).toBe('https://voldi.net');
    expect(sanitizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(sanitizeUrl('tel:+90123')).toBe('tel:+90123');
  });
  it('blocks javascript: scheme', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
  });
  it('upgrades protocol-relative to https', () => {
    expect(sanitizeUrl('//cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });
});
```

- [ ] **Step 5: Testi çalıştır, başarısız olduğunu doğrula**

Run: `pnpm --filter @mailmyra/renderer test`
Expected: FAIL — `Cannot find module '../src/utils/escape'`.

- [ ] **Step 6: Minimal implementasyonu yaz**

`packages/renderer/src/utils/escape.ts`:
```ts
export function htmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Yalnızca güvenli şemalara izin verir (http/https/mailto/tel). Protokol-göreli
 * URL'leri https'e yükseltir. Bilinmeyen şema (ör. javascript:) '#' döner.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return htmlEscape(trimmed);
  if (/^\/\//.test(trimmed)) return htmlEscape(`https:${trimmed}`);
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return '#';
  return htmlEscape(trimmed);
}
```

- [ ] **Step 7: Testi çalıştır, geçtiğini doğrula**

Run: `pnpm --filter @mailmyra/renderer test`
Expected: PASS (escape.test.ts tüm case'ler yeşil).

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json pnpm-lock.yaml packages/renderer
git commit -m "feat(renderer): bootstrap workspace and html escape/url util"
```

---

### Task 2: `color` util

Hex doğrulama/normalizasyon ve arka plana göre okunabilir metin rengi seçimi (CTA butonu ve dark-mode için).

**Files:**
- Create: `packages/renderer/src/utils/color.ts`
- Test: `packages/renderer/test/color.test.ts`

**Interfaces:**
- Produces: `isValidHex(value: string): boolean`, `normalizeHex(value: string): string` (#abc → #aabbcc, lowercase, geçersizde throw), `readableTextOn(hexBackground: string): '#ffffff' | '#000000'`.

- [ ] **Step 1: Başarısız testi yaz**

`packages/renderer/test/color.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { isValidHex, normalizeHex, readableTextOn } from '../src/utils/color';

describe('isValidHex', () => {
  it('accepts #abc and #aabbcc', () => {
    expect(isValidHex('#abc')).toBe(true);
    expect(isValidHex('#719ad1')).toBe(true);
  });
  it('rejects missing hash or bad chars', () => {
    expect(isValidHex('719ad1')).toBe(false);
    expect(isValidHex('#12g')).toBe(false);
  });
});

describe('normalizeHex', () => {
  it('expands shorthand', () => {
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });
  it('lowercases', () => {
    expect(normalizeHex('#719AD1')).toBe('#719ad1');
  });
  it('throws on invalid input', () => {
    expect(() => normalizeHex('nope')).toThrow();
  });
});

describe('readableTextOn', () => {
  it('returns white text on a dark background', () => {
    expect(readableTextOn('#1a1a1a')).toBe('#ffffff');
  });
  it('returns black text on a light background', () => {
    expect(readableTextOn('#ffffff')).toBe('#000000');
  });
  it('returns white text on the brand blue', () => {
    expect(readableTextOn('#719ad1')).toBe('#ffffff');
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `pnpm --filter @mailmyra/renderer test color`
Expected: FAIL — `Cannot find module '../src/utils/color'`.

- [ ] **Step 3: Implementasyonu yaz**

`packages/renderer/src/utils/color.ts`:
```ts
export function isValidHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function normalizeHex(value: string): string {
  const v = value.trim().toLowerCase();
  if (!isValidHex(v)) throw new Error(`Invalid hex color: ${value}`);
  if (v.length === 4) {
    return `#${v
      .slice(1)
      .split('')
      .map((c) => c + c)
      .join('')}`;
  }
  return v;
}

function relativeLuminance(hex: string): number {
  const n = normalizeHex(hex).slice(1);
  const channel = (start: number) => parseInt(n.slice(start, start + 2), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * lin(channel(0)) + 0.7152 * lin(channel(2)) + 0.0722 * lin(channel(4));
}

/** Verilen arka plan üstünde en okunur metin rengini (siyah/beyaz) döndürür. */
export function readableTextOn(hexBackground: string): '#ffffff' | '#000000' {
  return relativeLuminance(hexBackground) > 0.5 ? '#000000' : '#ffffff';
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `pnpm --filter @mailmyra/renderer test color`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/utils/color.ts packages/renderer/test/color.test.ts
git commit -m "feat(renderer): add hex color util and readable-text picker"
```

---

### Task 3: `inline-style` util

Stil objesini inline CSS string'ine çevirir (undefined/boş değerleri atlar).

**Files:**
- Create: `packages/renderer/src/utils/inline-style.ts`
- Test: `packages/renderer/test/inline-style.test.ts`

**Interfaces:**
- Produces: `type StyleMap = Record<string, string | number | undefined>`, `styleToString(style: StyleMap): string`. Anahtarlar zaten CSS property adıdır (kebab-case, ör. `'font-size'`).

- [ ] **Step 1: Başarısız testi yaz**

`packages/renderer/test/inline-style.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { styleToString } from '../src/utils/inline-style';

describe('styleToString', () => {
  it('joins properties with semicolons', () => {
    expect(styleToString({ color: 'red', 'font-size': '12px' })).toBe(
      'color:red;font-size:12px',
    );
  });
  it('skips undefined and empty values', () => {
    expect(
      styleToString({ color: 'red', 'font-weight': undefined, margin: '' }),
    ).toBe('color:red');
  });
  it('accepts numeric values', () => {
    expect(styleToString({ opacity: 1 })).toBe('opacity:1');
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `pnpm --filter @mailmyra/renderer test inline-style`
Expected: FAIL — module bulunamadı.

- [ ] **Step 3: Implementasyonu yaz**

`packages/renderer/src/utils/inline-style.ts`:
```ts
export type StyleMap = Record<string, string | number | undefined>;

export function styleToString(style: StyleMap): string {
  return Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `pnpm --filter @mailmyra/renderer test inline-style`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/utils/inline-style.ts packages/renderer/test/inline-style.test.ts
git commit -m "feat(renderer): add inline style serializer"
```

---

### Task 4: `table` util

E-posta-güvenli tablo kurucuları. Her tablo `border="0" cellpadding="0" cellspacing="0" role="presentation"` ve stilinde `border-collapse:collapse;border:none` (Outlook 2512) içerir.

**Files:**
- Create: `packages/renderer/src/utils/table.ts`
- Test: `packages/renderer/test/table.test.ts`

**Interfaces:**
- Consumes: `styleToString`, `StyleMap` (Task 3).
- Produces:
  - `cell(content: string, opts?: CellOptions): string` — `CellOptions = { style?: StyleMap; align?: 'left'|'center'|'right'; valign?: 'top'|'middle'|'bottom'; width?: number|string; colspan?: number }`
  - `row(cells: string, opts?: { style?: StyleMap }): string`
  - `table(rows: string, opts?: TableOptions): string` — `TableOptions = { style?: StyleMap; width?: number|string; align?: 'left'|'center'|'right' }`

- [ ] **Step 1: Başarısız testi yaz**

`packages/renderer/test/table.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { table, row, cell } from '../src/utils/table';

describe('table', () => {
  it('always includes border="0" and border:none (Outlook 2512)', () => {
    const html = table(row(cell('x')));
    expect(html).toContain('border="0"');
    expect(html).toContain('border:none');
    expect(html).toContain('cellpadding="0"');
    expect(html).toContain('cellspacing="0"');
    expect(html).toContain('role="presentation"');
  });
  it('merges user style onto the base style', () => {
    expect(table('', { style: { 'background-color': '#fff' } })).toContain(
      'background-color:#fff',
    );
  });
});

describe('cell', () => {
  it('renders content with align', () => {
    expect(cell('hi', { align: 'center' })).toBe('<td align="center">hi</td>');
  });
  it('renders width and style', () => {
    expect(cell('x', { width: 90, style: { color: 'red' } })).toBe(
      '<td width="90" style="color:red">x</td>',
    );
  });
  it('renders bare content when no options', () => {
    expect(cell('a')).toBe('<td>a</td>');
  });
});

describe('row', () => {
  it('wraps cells in a tr', () => {
    expect(row('<td>a</td>')).toBe('<tr><td>a</td></tr>');
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `pnpm --filter @mailmyra/renderer test table`
Expected: FAIL — module bulunamadı.

- [ ] **Step 3: Implementasyonu yaz**

`packages/renderer/src/utils/table.ts`:
```ts
import { styleToString, type StyleMap } from './inline-style';

export interface CellOptions {
  style?: StyleMap;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
  width?: number | string;
  colspan?: number;
}

export function cell(content: string, opts: CellOptions = {}): string {
  const attrs: string[] = [];
  if (opts.align) attrs.push(`align="${opts.align}"`);
  if (opts.valign) attrs.push(`valign="${opts.valign}"`);
  if (opts.width !== undefined) attrs.push(`width="${opts.width}"`);
  if (opts.colspan) attrs.push(`colspan="${opts.colspan}"`);
  const style = opts.style ? styleToString(opts.style) : '';
  if (style) attrs.push(`style="${style}"`);
  const attrStr = attrs.length ? ` ${attrs.join(' ')}` : '';
  return `<td${attrStr}>${content}</td>`;
}

export function row(cells: string, opts: { style?: StyleMap } = {}): string {
  const style = opts.style ? styleToString(opts.style) : '';
  const styleAttr = style ? ` style="${style}"` : '';
  return `<tr${styleAttr}>${cells}</tr>`;
}

export interface TableOptions {
  style?: StyleMap;
  width?: number | string;
  align?: 'left' | 'center' | 'right';
}

export function table(rows: string, opts: TableOptions = {}): string {
  const attrs = ['border="0"', 'cellpadding="0"', 'cellspacing="0"', 'role="presentation"'];
  if (opts.width !== undefined) attrs.push(`width="${opts.width}"`);
  if (opts.align) attrs.push(`align="${opts.align}"`);
  // Outlook 2512: kenarlığı hem attribute hem style ile açıkça sıfırla.
  const style = styleToString({
    'border-collapse': 'collapse',
    border: 'none',
    'mso-table-lspace': '0pt',
    'mso-table-rspace': '0pt',
    ...opts.style,
  });
  attrs.push(`style="${style}"`);
  return `<table ${attrs.join(' ')}>${rows}</table>`;
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `pnpm --filter @mailmyra/renderer test table`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/utils/table.ts packages/renderer/test/table.test.ts
git commit -m "feat(renderer): add email-safe table builders"
```

---

### Task 5: `types` + `fixtures`

`SignatureData` tipini (CLAUDE.md'den birebir) ve dev fixture veri setlerini ekler.

**Files:**
- Create: `packages/renderer/src/types.ts`
- Create: `packages/renderer/src/fixtures/samples.ts`
- Test: `packages/renderer/test/fixtures.test.ts`

**Interfaces:**
- Produces: `SignatureData`, `WebSafeFont` (tip); `Fixture = { id: string; title: string; data: SignatureData }`; `fixtures: Fixture[]` (id'ler: `full`, `minimal`, `noLogo`, `longContent`).

- [ ] **Step 1: `types.ts`'i oluştur (CLAUDE.md'den birebir)**

`packages/renderer/src/types.ts`:
```ts
export interface SignatureData {
  identity: {
    fullName: string;
    jobTitle?: string;
    department?: string;
    company?: string;
  };

  contact: {
    email?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    address?: string;
  };

  visuals: {
    avatarUrl?: string;
    logoUrl?: string;
    handSignatureUrl?: string;
    brandColor: string;
    textColor: string;
    mutedColor: string;
    fontFamily: WebSafeFont;
  };

  social: Array<{
    platform:
      | 'linkedin'
      | 'x'
      | 'instagram'
      | 'facebook'
      | 'youtube'
      | 'github'
      | 'behance'
      | 'dribbble';
    url: string;
  }>;

  extras?: {
    ctaLabel?: string;
    ctaUrl?: string;
    disclaimer?: string;
    customFields?: Array<{ label: string; value: string; url?: string }>;
  };

  layout: {
    templateId: string;
    size: 'small' | 'medium' | 'large';
    iconStyle: 'filled' | 'outline' | 'mono';
    showDividers: boolean;
  };
}

export type WebSafeFont =
  | 'Arial, Helvetica, sans-serif'
  | 'Georgia, serif'
  | 'Times New Roman, serif'
  | 'Verdana, Geneva, sans-serif'
  | 'Tahoma, Geneva, sans-serif'
  | 'Trebuchet MS, sans-serif';
```

- [ ] **Step 2: Başarısız testi yaz**

`packages/renderer/test/fixtures.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { fixtures } from '../src/fixtures/samples';

describe('fixtures', () => {
  it('exposes the full and minimal presets', () => {
    const ids = fixtures.map((f) => f.id);
    expect(ids).toContain('full');
    expect(ids).toContain('minimal');
  });
  it('every fixture has a non-empty name and a unique id', () => {
    const ids = new Set<string>();
    for (const f of fixtures) {
      expect(f.data.identity.fullName.length).toBeGreaterThan(0);
      expect(ids.has(f.id)).toBe(false);
      ids.add(f.id);
    }
  });
});
```

- [ ] **Step 3: Testi çalıştır, başarısız olduğunu doğrula**

Run: `pnpm --filter @mailmyra/renderer test fixtures`
Expected: FAIL — `../src/fixtures/samples` bulunamadı.

- [ ] **Step 4: `fixtures/samples.ts`'i yaz**

`packages/renderer/src/fixtures/samples.ts`:
```ts
import type { SignatureData } from '../types';

export interface Fixture {
  id: string;
  title: string;
  data: SignatureData;
}

const baseVisuals = {
  brandColor: '#719ad1',
  textColor: '#1a1a1a',
  mutedColor: '#6d6e71',
  fontFamily: 'Arial, Helvetica, sans-serif',
} satisfies Pick<
  SignatureData['visuals'],
  'brandColor' | 'textColor' | 'mutedColor' | 'fontFamily'
>;

const full: SignatureData = {
  identity: {
    fullName: 'Hüseyin Yıldız',
    jobTitle: 'Kurucu & Kreatif Direktör',
    department: 'Tasarım',
    company: 'Voldi Creative',
  },
  contact: {
    email: 'huseyin@voldi.net',
    phone: '+90 332 000 00 00',
    mobile: '+90 555 000 00 00',
    website: 'https://voldi.net',
    address: 'Selçuklu, Konya, Türkiye',
  },
  visuals: {
    ...baseVisuals,
    avatarUrl: 'https://placehold.co/240x240/719ad1/ffffff/png',
  },
  social: [
    { platform: 'linkedin', url: 'https://linkedin.com/company/voldi' },
    { platform: 'instagram', url: 'https://instagram.com/voldi' },
    { platform: 'behance', url: 'https://behance.net/voldi' },
  ],
  extras: {
    ctaLabel: 'Görüşme Ayarla',
    ctaUrl: 'https://voldi.net/randevu',
    disclaimer:
      'Bu e-posta ve ekleri gizlidir. Yanlışlıkla ulaştıysa lütfen siliniz.',
    customFields: [
      { label: 'Portföy', value: 'voldi.net/isler', url: 'https://voldi.net/isler' },
    ],
  },
  layout: {
    templateId: 'classic-horizontal',
    size: 'medium',
    iconStyle: 'mono',
    showDividers: true,
  },
};

const minimal: SignatureData = {
  identity: { fullName: 'Ayşe Demir' },
  contact: { email: 'ayse@voldi.net' },
  visuals: { ...baseVisuals },
  social: [],
  layout: {
    templateId: 'classic-horizontal',
    size: 'medium',
    iconStyle: 'mono',
    showDividers: false,
  },
};

const noLogo: SignatureData = {
  ...full,
  visuals: { ...baseVisuals },
};

const longContent: SignatureData = {
  ...full,
  identity: {
    fullName: 'Mehmet Abdullah Karahanoğlu-Süleymanoğlu',
    jobTitle: 'Kıdemli Marka Stratejisti ve Yaratıcı İçerik Yönetmeni',
    department: 'Pazarlama & Kurumsal İletişim',
    company: 'Voldi Creative Reklam ve Tanıtım Hizmetleri A.Ş.',
  },
  extras: {
    ...full.extras,
    disclaimer:
      'Bu elektronik posta mesajı ve ekleri yalnızca gönderildiği kişi veya kuruluşa özeldir ve gizli bilgiler içerebilir. Mesajın gönderildiği kişi değilseniz lütfen göndericiyi bilgilendirip mesajı sisteminizden siliniz.',
  },
};

export const fixtures: Fixture[] = [
  { id: 'full', title: 'Dolu (tüm alanlar)', data: full },
  { id: 'minimal', title: 'Minimal (ad + e-posta)', data: minimal },
  { id: 'noLogo', title: 'Logosuz / avatarsız', data: noLogo },
  { id: 'longContent', title: 'Uzun içerik (taşma testi)', data: longContent },
];
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `pnpm --filter @mailmyra/renderer test fixtures`
Expected: PASS.

- [ ] **Step 6: Tip kontrolü**

Run: `pnpm --filter @mailmyra/renderer typecheck`
Expected: hata yok.

- [ ] **Step 7: Commit**

```bash
git add packages/renderer/src/types.ts packages/renderer/src/fixtures packages/renderer/test/fixtures.test.ts
git commit -m "feat(renderer): add SignatureData types and dev fixtures"
```

---

### Task 6: `classic-horizontal` şablonu

Logo/avatar solda, bilgi sağda 2 sütunlu table-based imza. İçerik testleri önce yazılır.

**Files:**
- Create: `packages/renderer/src/templates/classic-horizontal.ts`
- Test: `packages/renderer/test/classic-horizontal.test.ts`

**Interfaces:**
- Consumes: `SignatureData` (Task 5), `table/row/cell` (Task 4), `styleToString` (Task 3), `htmlEscape/sanitizeUrl` (Task 1), `normalizeHex/readableTextOn` (Task 2), `fixtures` (Task 5).
- Produces: `classicHorizontal(data: SignatureData): string` — imza fragment'i döndürür.

- [ ] **Step 1: Başarısız testi yaz**

`packages/renderer/test/classic-horizontal.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { classicHorizontal } from '../src/templates/classic-horizontal';
import { fixtures } from '../src/fixtures/samples';

const full = fixtures.find((f) => f.id === 'full')!.data;

describe('classicHorizontal', () => {
  it('renders the full name', () => {
    expect(classicHorizontal(full)).toContain('Hüseyin Yıldız');
  });
  it('renders the email as a mailto link', () => {
    expect(classicHorizontal(full)).toContain('href="mailto:huseyin@voldi.net"');
  });
  it('renders the website as an https link', () => {
    expect(classicHorizontal(full)).toContain('href="https://voldi.net"');
  });
  it('omits the image column when no avatar or logo is set', () => {
    const noImg = {
      ...full,
      visuals: { ...full.visuals, avatarUrl: undefined, logoUrl: undefined },
    };
    expect(classicHorizontal(noImg)).not.toContain('<img');
  });
  it('includes a 1px divider only when showDividers is true', () => {
    const on = classicHorizontal({
      ...full,
      layout: { ...full.layout, showDividers: true },
    });
    const off = classicHorizontal({
      ...full,
      layout: { ...full.layout, showDividers: false },
    });
    expect(on).toContain('line-height:1px');
    expect(off).not.toContain('line-height:1px');
  });
  it('escapes HTML in user-provided fields', () => {
    const evil = {
      ...full,
      identity: { ...full.identity, fullName: '<script>x</script>' },
    };
    const html = classicHorizontal(evil);
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });
  it('scales the name font size with layout.size', () => {
    const small = classicHorizontal({
      ...full,
      layout: { ...full.layout, size: 'small' },
    });
    const large = classicHorizontal({
      ...full,
      layout: { ...full.layout, size: 'large' },
    });
    expect(small).toContain('font-size:15px');
    expect(large).toContain('font-size:22px');
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `pnpm --filter @mailmyra/renderer test classic-horizontal`
Expected: FAIL — `../src/templates/classic-horizontal` bulunamadı.

- [ ] **Step 3: Şablonu yaz**

`packages/renderer/src/templates/classic-horizontal.ts`:
```ts
import type { SignatureData } from '../types';
import { table, row, cell } from '../utils/table';
import { styleToString } from '../utils/inline-style';
import { htmlEscape, sanitizeUrl } from '../utils/escape';
import { normalizeHex, readableTextOn } from '../utils/color';

type Size = SignatureData['layout']['size'];

interface SizeScale {
  name: number;
  title: number;
  body: number;
  small: number;
  avatar: number;
  gap: number;
}

const SIZES: Record<Size, SizeScale> = {
  small: { name: 15, title: 12, body: 12, small: 11, avatar: 64, gap: 12 },
  medium: { name: 18, title: 13, body: 13, small: 11, avatar: 90, gap: 16 },
  large: { name: 22, title: 15, body: 14, small: 12, avatar: 110, gap: 20 },
};

const PLATFORM_LABELS: Record<
  SignatureData['social'][number]['platform'],
  string
> = {
  linkedin: 'LinkedIn',
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  github: 'GitHub',
  behance: 'Behance',
  dribbble: 'Dribbble',
};

function ensureHttp(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function classicHorizontal(data: SignatureData): string {
  const s = SIZES[data.layout.size] ?? SIZES.medium;
  const font = data.visuals.fontFamily;
  const text = normalizeHex(data.visuals.textColor);
  const muted = normalizeHex(data.visuals.mutedColor);
  const brand = normalizeHex(data.visuals.brandColor);

  const linkStyle = styleToString({
    'font-family': font,
    'font-size': `${s.body}px`,
    color: brand,
    'text-decoration': 'none',
  });
  const bodyStyle = styleToString({
    'font-family': font,
    'font-size': `${s.body}px`,
    color: text,
    'line-height': '1.4',
  });

  const lines: string[] = [];

  // Ad
  lines.push(
    row(
      cell(
        `<span style="${styleToString({
          'font-family': font,
          'font-size': `${s.name}px`,
          'font-weight': 'bold',
          color: text,
          'line-height': '1.2',
        })}">${htmlEscape(data.identity.fullName)}</span>`,
        { style: { 'padding-bottom': '2px' } },
      ),
    ),
  );

  // Ünvan + departman
  const titleParts = [data.identity.jobTitle, data.identity.department].filter(
    (v): v is string => Boolean(v),
  );
  if (titleParts.length) {
    lines.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.title}px`,
            color: muted,
          })}">${titleParts.map((v) => htmlEscape(v)).join(' · ')}</span>`,
          { style: { 'padding-bottom': '2px' } },
        ),
      ),
    );
  }

  // Şirket
  if (data.identity.company) {
    lines.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.title}px`,
            'font-weight': 'bold',
            color: text,
          })}">${htmlEscape(data.identity.company)}</span>`,
          { style: { 'padding-bottom': `${Math.round(s.gap / 2)}px` } },
        ),
      ),
    );
  }

  // Ayraç (1px arka plan çizgisi — div yok)
  if (data.layout.showDividers) {
    const line = table(
      row(
        cell('&nbsp;', {
          style: {
            height: '1px',
            'line-height': '1px',
            'font-size': '1px',
            'background-color': muted,
          },
        }),
      ),
      { width: '100%' },
    );
    lines.push(
      row(
        cell(line, {
          style: {
            'padding-top': '2px',
            'padding-bottom': `${Math.round(s.gap / 2)}px`,
          },
        }),
      ),
    );
  }

  // İletişim satırları
  const contact = data.contact;
  const pushLine = (inner: string) =>
    lines.push(row(cell(inner, { style: { 'padding-bottom': '2px' } })));

  if (contact.phone) {
    const tel = sanitizeUrl(`tel:${contact.phone.replace(/[^\d+]/g, '')}`);
    pushLine(`<a href="${tel}" style="${bodyStyle}">${htmlEscape(contact.phone)}</a>`);
  }
  if (contact.mobile) {
    const tel = sanitizeUrl(`tel:${contact.mobile.replace(/[^\d+]/g, '')}`);
    pushLine(`<a href="${tel}" style="${bodyStyle}">${htmlEscape(contact.mobile)}</a>`);
  }
  if (contact.email) {
    const mail = sanitizeUrl(`mailto:${contact.email}`);
    pushLine(`<a href="${mail}" style="${linkStyle}">${htmlEscape(contact.email)}</a>`);
  }
  if (contact.website) {
    const href = sanitizeUrl(ensureHttp(contact.website));
    const label = contact.website.replace(/^https?:\/\//i, '');
    pushLine(`<a href="${href}" style="${linkStyle}">${htmlEscape(label)}</a>`);
  }
  if (contact.address) {
    pushLine(
      `<span style="${bodyStyle}">${htmlEscape(contact.address).replace(/\n/g, '<br>')}</span>`,
    );
  }

  // Özel alanlar
  for (const field of data.extras?.customFields ?? []) {
    const value = field.url
      ? `<a href="${sanitizeUrl(ensureHttp(field.url))}" style="${linkStyle}">${htmlEscape(field.value)}</a>`
      : `<span style="${bodyStyle}">${htmlEscape(field.value)}</span>`;
    pushLine(
      `<span style="${styleToString({
        'font-family': font,
        'font-size': `${s.body}px`,
        color: muted,
      })}">${htmlEscape(field.label)}: </span>${value}`,
    );
  }

  // Sosyal (metin-link — ikonlar Hafta 2'de CDN ile)
  if (data.social.length) {
    const sep = `<span style="color:${muted}">&nbsp;·&nbsp;</span>`;
    const socialHtml = data.social
      .map(
        (soc) =>
          `<a href="${sanitizeUrl(soc.url)}" style="${linkStyle}">${PLATFORM_LABELS[soc.platform]}</a>`,
      )
      .join(sep);
    lines.push(
      row(
        cell(socialHtml, {
          style: {
            'padding-top': `${Math.round(s.gap / 2)}px`,
            'padding-bottom': '2px',
          },
        }),
      ),
    );
  }

  // CTA butonu (bulletproof)
  if (data.extras?.ctaLabel && data.extras?.ctaUrl) {
    const ctaText = readableTextOn(brand);
    const btn = table(
      row(
        cell(
          `<a href="${sanitizeUrl(ensureHttp(data.extras.ctaUrl))}" style="${styleToString({
            'font-family': font,
            'font-size': `${s.body}px`,
            'font-weight': 'bold',
            color: ctaText,
            'text-decoration': 'none',
            display: 'inline-block',
          })}">${htmlEscape(data.extras.ctaLabel)}</a>`,
          {
            align: 'center',
            style: {
              'background-color': brand,
              'border-radius': '4px',
              padding: '8px 16px',
            },
          },
        ),
      ),
      { align: 'left' },
    );
    lines.push(
      row(cell(btn, { style: { 'padding-top': `${Math.round(s.gap / 2)}px` } })),
    );
  }

  // Yasal metin
  if (data.extras?.disclaimer) {
    lines.push(
      row(
        cell(
          `<span style="${styleToString({
            'font-family': font,
            'font-size': `${s.small}px`,
            color: muted,
            'line-height': '1.3',
          })}">${htmlEscape(data.extras.disclaimer).replace(/\n/g, '<br>')}</span>`,
          { style: { 'padding-top': `${Math.round(s.gap / 2)}px` } },
        ),
      ),
    );
  }

  const rightInner = table(lines.join(''), { width: '100%' });

  // Sol görsel sütunu (önce avatar, yoksa logo)
  const imageUrl = data.visuals.avatarUrl ?? data.visuals.logoUrl;
  const leftCell = imageUrl
    ? cell(
        `<img src="${sanitizeUrl(imageUrl)}" width="${s.avatar}" height="${s.avatar}" alt="${htmlEscape(
          data.identity.fullName,
        )}" border="0" style="${styleToString({
          display: 'block',
          border: '0',
          'border-radius': '4px',
          width: `${s.avatar}px`,
          height: `${s.avatar}px`,
        })}" />`,
        {
          valign: 'top',
          width: s.avatar,
          style: { 'padding-right': `${s.gap}px` },
        },
      )
    : '';

  const rightCell = cell(rightInner, { valign: 'top' });

  return table(row(leftCell + rightCell), { style: { 'max-width': '600px' } });
}
```

- [ ] **Step 4: Testi çalıştır, geçtiğini doğrula**

Run: `pnpm --filter @mailmyra/renderer test classic-horizontal`
Expected: PASS (tüm içerik case'leri yeşil).

- [ ] **Step 5: Tip kontrolü**

Run: `pnpm --filter @mailmyra/renderer typecheck`
Expected: hata yok.

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/templates/classic-horizontal.ts packages/renderer/test/classic-horizontal.test.ts
git commit -m "feat(renderer): add classic-horizontal template"
```

---

### Task 7: `render` dispatch + `index` exports

Tek giriş noktası ve paket public API'si.

**Files:**
- Create: `packages/renderer/src/render.ts`
- Create: `packages/renderer/src/index.ts`
- Test: `packages/renderer/test/render.test.ts`

**Interfaces:**
- Consumes: `classicHorizontal` (Task 6), `SignatureData` (Task 5), `fixtures` (Task 5).
- Produces: `renderSignature(data: SignatureData, templateId: string): string` (bilinmeyen id'de throw), `TEMPLATE_IDS: string[]`. `index.ts` bunları + `SignatureData`/`WebSafeFont` tiplerini + `fixtures`/`Fixture`'ı re-export eder.

- [ ] **Step 1: Başarısız testi yaz**

`packages/renderer/test/render.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderSignature, TEMPLATE_IDS } from '../src/render';
import { fixtures } from '../src/fixtures/samples';

const full = fixtures.find((f) => f.id === 'full')!.data;

describe('renderSignature', () => {
  it('lists classic-horizontal as an available template', () => {
    expect(TEMPLATE_IDS).toContain('classic-horizontal');
  });
  it('renders through a known template id', () => {
    expect(renderSignature(full, 'classic-horizontal')).toContain('<table');
  });
  it('throws on an unknown template id', () => {
    expect(() => renderSignature(full, 'nope')).toThrow(/Unknown templateId/);
  });
});
```

- [ ] **Step 2: Testi çalıştır, başarısız olduğunu doğrula**

Run: `pnpm --filter @mailmyra/renderer test render`
Expected: FAIL — `../src/render` bulunamadı.

- [ ] **Step 3: `render.ts`'i yaz**

`packages/renderer/src/render.ts`:
```ts
import type { SignatureData } from './types';
import { classicHorizontal } from './templates/classic-horizontal';

const TEMPLATES: Record<string, (data: SignatureData) => string> = {
  'classic-horizontal': classicHorizontal,
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

export function renderSignature(data: SignatureData, templateId: string): string {
  const template = TEMPLATES[templateId];
  if (!template) {
    throw new Error(
      `Unknown templateId: "${templateId}". Available: ${TEMPLATE_IDS.join(', ')}`,
    );
  }
  return template(data);
}
```

- [ ] **Step 4: `index.ts`'i yaz**

`packages/renderer/src/index.ts`:
```ts
export { renderSignature, TEMPLATE_IDS } from './render';
export type { SignatureData, WebSafeFont } from './types';
export { fixtures } from './fixtures/samples';
export type { Fixture } from './fixtures/samples';
```

- [ ] **Step 5: Testi çalıştır, geçtiğini doğrula**

Run: `pnpm --filter @mailmyra/renderer test render`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/render.ts packages/renderer/src/index.ts packages/renderer/test/render.test.ts
git commit -m "feat(renderer): add renderSignature dispatch and public exports"
```

---

### Task 8: Guardrail testleri (e-posta HTML kısıtları)

Tüm şablon × fixture kombinasyonlarının e-posta HTML kurallarına uyduğunu kilitler.

**Files:**
- Test: `packages/renderer/test/guardrails.test.ts`

**Interfaces:**
- Consumes: `renderSignature`, `TEMPLATE_IDS`, `fixtures` (Task 7 & 5).

- [ ] **Step 1: Guardrail testini yaz**

`packages/renderer/test/guardrails.test.ts`:
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

for (const templateId of TEMPLATE_IDS) {
  for (const fx of fixtures) {
    describe(`guardrails: ${templateId} / ${fx.id}`, () => {
      const html = renderSignature(fx.data, templateId);

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
```

- [ ] **Step 2: Testi çalıştır, geçtiğini doğrula**

Run: `pnpm --filter @mailmyra/renderer test guardrails`
Expected: PASS. (Başarısız olursa şablonu düzelt — testi gevşetme; guardrail'ler pazarlıksız.)

- [ ] **Step 3: Tüm suite'i çalıştır**

Run: `pnpm --filter @mailmyra/renderer test`
Expected: TÜM testler yeşil (escape, color, inline-style, table, fixtures, classic-horizontal, render, guardrails).

- [ ] **Step 4: Commit**

```bash
git add packages/renderer/test/guardrails.test.ts
git commit -m "test(renderer): lock in email-HTML guardrails across all fixtures"
```

---

### Task 9: `.htm` üretim script'i (RDP 6-istemci testi için)

Her fixture'ın imzasını tam `.htm` dokümanı olarak diske yazar — Hüseyin bunları RDP + M365 ile 6 istemcide test edecek.

**Files:**
- Create: `packages/renderer/scripts/emit-htm.ts`
- Modify: `.gitignore` (kök) — `packages/renderer/out/` eklenir

**Interfaces:**
- Consumes: `fixtures`, `renderSignature` (`../src/index`).

- [ ] **Step 1: Script'i yaz**

`packages/renderer/scripts/emit-htm.ts`:
```ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtures, renderSignature } from '../src/index';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../out');
mkdirSync(outDir, { recursive: true });

function wrapDoc(fragment: string): string {
  return `<!doctype html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n${fragment}\n</body>\n</html>\n`;
}

for (const fx of fixtures) {
  const html = renderSignature(fx.data, 'classic-horizontal');
  const file = resolve(outDir, `classic-horizontal--${fx.id}.htm`);
  writeFileSync(file, wrapDoc(html), 'utf8');
  console.log('wrote', file);
}
```

- [ ] **Step 2: `.gitignore`'a çıktı klasörünü ekle**

Kök `.gitignore` dosyasına şu satırı ekle:
```
packages/renderer/out/
```

- [ ] **Step 3: Script'i çalıştır**

Run: `pnpm --filter @mailmyra/renderer emit`
Expected: 4 dosya yazıldı (`classic-horizontal--full.htm`, `--minimal.htm`, `--noLogo.htm`, `--longContent.htm`).

- [ ] **Step 4: Çıktıyı doğrula**

Run: `ls -1 packages/renderer/out`
Expected: 4 `.htm` dosyası listelenir.

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/scripts/emit-htm.ts .gitignore
git commit -m "feat(renderer): add .htm emit script for client testing"
```

---

### Task 10: `apps/web` Next.js + `/dev/render` harness

Renderer'ı tüketen ince dev sayfası: her fixture için açık + koyu zemin iframe önizleme ve export butonları (Kopyala / .htm indir).

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/dev/render/page.tsx`
- Create: `apps/web/app/dev/render/ExportButtons.tsx`

**Interfaces:**
- Consumes: `fixtures`, `renderSignature` (`@mailmyra/renderer`).

- [ ] **Step 1: Paket ve config dosyalarını oluştur**

`apps/web/package.json`:
```json
{
  "name": "web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@mailmyra/renderer": "workspace:*",
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.7.2"
  }
}
```

`apps/web/next.config.js` (renderer'ın TS kaynağını Next transpile eder):
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mailmyra/renderer'],
};

module.exports = nextConfig;
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve",
    "plugins": [{ "name": "next" }],
    "types": ["node", "react", "react-dom"],
    "incremental": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: Kök layout'u oluştur**

`apps/web/app/layout.tsx`:
```tsx
import type { ReactNode } from 'react';

export const metadata = { title: 'Mailmyra Dev' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Export butonlarını (client) oluştur**

`apps/web/app/dev/render/ExportButtons.tsx`:
```tsx
'use client';

export function ExportButtons({
  html,
  filename,
}: {
  html: string;
  filename: string;
}) {
  async function copyHtml() {
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
    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
      <button type="button" onClick={copyHtml}>
        HTML olarak kopyala
      </button>
      <button type="button" onClick={downloadHtm}>
        .htm indir
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Dev render sayfasını (server) oluştur**

`apps/web/app/dev/render/page.tsx`:
```tsx
import { fixtures, renderSignature } from '@mailmyra/renderer';
import { ExportButtons } from './ExportButtons';

function wrapDoc(fragment: string, bg: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:16px;background:${bg};">${fragment}</body></html>`;
}

export default function DevRenderPage() {
  return (
    <main
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: 24,
        maxWidth: 1000,
        margin: '0 auto',
      }}
    >
      <h1>/dev/render — classic-horizontal</h1>
      <p style={{ color: '#666' }}>
        Her fixture açık ve koyu zeminde önizlenir. Kopyala / .htm indir ile 6
        istemcide test et.
      </p>
      {fixtures.map((fx) => {
        const html = renderSignature(fx.data, 'classic-horizontal');
        return (
          <section
            key={fx.id}
            style={{
              marginBottom: 40,
              borderBottom: '1px solid #eee',
              paddingBottom: 24,
            }}
          >
            <h2>{fx.title}</h2>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <iframe
                title={`${fx.id}-light`}
                srcDoc={wrapDoc(html, '#ffffff')}
                style={{ width: 620, height: 280, border: '1px solid #ddd' }}
              />
              <iframe
                title={`${fx.id}-dark`}
                srcDoc={wrapDoc(html, '#1a1a1a')}
                style={{ width: 620, height: 280, border: '1px solid #ddd' }}
              />
            </div>
            <ExportButtons html={html} filename={`classic-horizontal--${fx.id}`} />
          </section>
        );
      })}
    </main>
  );
}
```

- [ ] **Step 5: Bağımlılıkları kur**

Run: `pnpm install`
Expected: `next`, `react`, `react-dom` kurulur; `@mailmyra/renderer` workspace linki çözülür.

- [ ] **Step 6: Build ile doğrula**

Run: `pnpm --filter web build`
Expected: Build başarılı; `/dev/render` route'u derlenir, tip hatası yok.

> Not: Next `@mailmyra/renderer`'ın `.ts` kaynağını `transpilePackages` ile derler. Eğer modül çözümleme hatası çıkarsa, `next.config.js`'te paket adının listede olduğunu doğrula; sorun sürerse renderer'a bir `tsup` build adımı eklenmesi (dist üretimi) yedek çözümdür — ama önce transpilePackages yolunu tüket.

- [ ] **Step 7: Tarayıcıda görsel doğrulama**

Run: `pnpm --filter web dev`
Aç: `http://localhost:3000/dev/render`
Expected: 4 fixture, her biri açık + koyu iframe'de imza olarak görünür; Kopyala/İndir butonları çalışır. (Bu, RDP öncesi ilk göz kontrolüdür — asıl 6-istemci testi manuel.)

- [ ] **Step 8: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "feat(web): add /dev/render fixture harness with copy/download export"
```

---

## Hafta 1 Bitiş Kontrolü

Tümü tamamlandığında:
- `pnpm -r test` → tüm renderer testleri yeşil (guardrail'ler dahil)
- `pnpm -r typecheck` → hata yok
- `pnpm --filter web build` → başarılı
- `packages/renderer/out/*.htm` → 4 dosya hazır (RDP testi için)

**Manuel kontrol noktası (Hüseyin):** `.htm` çıktıları Outlook Classic, Yeni Outlook, Gmail web, Gmail mobil, Apple Mail, iOS Mail'de doğrulanır. **Kusursuz değilse Hafta 2'ye geçilmez** (CLAUDE.md kuralı). Outlook'ta genişlik/wrapping sorunu çıkarsa dış tabloya sabit `width` ve gerekirse CTA'ya VML fallback eklenir.
