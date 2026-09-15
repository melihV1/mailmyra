# Tipografi + Aksan Bandı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Görsel sözlüğe iki araç eklemek — isim satırında versal + harf aralığı (altı şablonda, kullanıcı seçeneği) ve marka renginde aksan alanı (iki şablonda, yeri şablonun kararı).

**Architecture:** İki yeni saf yardımcı (`utils/typography.ts`, `utils/accent.ts`). Tipografi altı şablonda BİREBİR AYNI tek satırlık düzenleme. Aksan alanı yalnız `card-bordered` (üst bant) ve `photo-first` (avatar sütunu paneli); diğer dördü alanı sessizce yok sayar. Hepsi mevcut `table()`/`row()`/`cell()` yardımcılarıyla kurulur.

**Tech Stack:** TypeScript, vitest. `packages/renderer` — framework bağımsız, DOM yok, React yok.

## Global Constraints

- **Renderer saf fonksiyondur.** DOM'a dokunma, React import etme, tarayıcı API'si kullanma.
- **Çıktı table-based.** `<div>`, flexbox, grid, float, `position` YASAK. SVG, WebP, base64 YASAK.
- **Tüm CSS inline.** `<style>` bloğu yok.
- **Tablo ASLA elle kurulmaz** — `table()`/`row()`/`cell()` kullanılır. Elle kurulan tablo, CLAUDE.md'nin her tabloda zorunlu kıldığı Outlook 2512 kenarlık düzeltmesini (`border="0"` + `border:none` + `mso-table-lspace/rspace`) atlar. Monogram turunda tam bu hata yaşandı.
- **Renkli hücrenin içeriği ASLA boş olmaz.** `card-bordered.ts:376` yorumu: *"İçeriği `&nbsp;` çünkü Outlook boş hücreye arka plan boyamıyor."* Dekoratif bant `&nbsp;` + `font-size:1px` + `line-height:1px` taşır — şerit hücresinin birebir deseni.
- **`bgcolor` attribute'u VE `background-color` stili birlikte** verilir; Word motoru CSS zeminini her zaman uygulamıyor.
- **Aksan alanı LOGOYU ASLA İÇERMEZ** (spec Karar 4). Şeffaf PNG logo koyu zeminde kaybolur ve açık/koyu varyantımız yok. Bu makine kontrollüdür: testler alanın içinde `<img>` olmadığını doğrular.
- **`text-transform` KULLANILMAZ.** Büyük harf renderer'da üretilir.
- `apps/web` HİÇ DEĞİŞMEZ.
- Test: `npm test -w packages/renderer` · tek dosya: `npx vitest run test/<dosya> --root packages/renderer` · `npm run typecheck -w packages/renderer`

---

## File Structure

| dosya | sorumluluk |
|---|---|
| `packages/renderer/src/types.ts` | **değişir** — `layout.nameCase?`, `layout.accentBand?` |
| `packages/renderer/src/utils/typography.ts` | **yeni** — `displayName()`, `nameLetterSpacing()` |
| `packages/renderer/src/utils/accent.ts` | **yeni** — `shouldShowAccentBand()`, `accentBandRow()`, `accentPanelStyle()` |
| `packages/renderer/src/templates/*.ts` (6) | isim satırı; ikisinde ayrıca aksan alanı |
| `packages/renderer/test/typography.test.ts` | **yeni** |
| `packages/renderer/test/accent.test.ts` | **yeni** |
| `packages/renderer/test/*.test.ts` (6) | şablon başına kilitler |

---

### Task 1: `displayName()` ve `nameLetterSpacing()`

**Files:**
- Modify: `packages/renderer/src/types.ts` (`layout` bloğu)
- Create: `packages/renderer/src/utils/typography.ts`
- Test: `packages/renderer/test/typography.test.ts`

**Interfaces:**
- Consumes: yok (saf string işlemi).
- Produces:
  - `displayName(fullName: string, nameCase: NameCase | undefined): string`
  - `nameLetterSpacing(nameCase: NameCase | undefined): string | undefined`
  - `type NameCase = 'normal' | 'upper'`

- [ ] **Step 1: Tipi ekle**

`packages/renderer/src/types.ts` içindeki `layout` bloğuna, mevcut `monogram?` alanının ALTINA:

```ts
    /**
     * İsim satırı büyük harfe çevrilsin ve harf aralığı açılsın mı.
     * Alan yoksa 'normal' sayılır — kişisel stil tercihi, herkesin ismini
     * zorla versal yapmak saldırgan olurdu (uzun isimler versal hâlde sarar).
     */
    nameCase?: 'normal' | 'upper';
    /**
     * Şablonun aksan alanı çizilsin mi. YERİ şablonun kararı, VARLIĞI
     * kullanıcının. Alan yoksa 'auto' sayılır: aksan şablonun karakteridir,
     * kapalı varsayılan galeriyi bugünkü hâlinde bırakırdı.
     * Yeri tanımlı olmayan şablonlarda (classic-horizontal, divider-columns,
     * stacked-minimal) ve cta-banner'da SESSİZCE yok sayılır.
     */
    accentBand?: 'auto' | 'off';
```

- [ ] **Step 2: Failing test yaz**

`packages/renderer/test/typography.test.ts` oluştur:

```ts
import { describe, it, expect } from 'vitest';
import { displayName, nameLetterSpacing } from '../src/utils/typography';

describe('displayName', () => {
  it('passes the name through unchanged by default', () => {
    expect(displayName('Elif Kaya', undefined)).toBe('Elif Kaya');
  });
  it('passes the name through unchanged when normal', () => {
    expect(displayName('Elif Kaya', 'normal')).toBe('Elif Kaya');
  });
  it('uppercases when upper', () => {
    expect(displayName('Elif Kaya', 'upper')).toBe('ELİF KAYA');
  });
  it('keeps a properly written Turkish name correct', () => {
    // Turkish users write their own name with the dotted capital already
    // there, and the dotless i uppercases to I under the default locale too —
    // so the default rule gets this right without Turkish casing.
    expect(displayName('İlker Yılmaz', 'upper')).toBe('İLKER YILMAZ');
  });
  it('does NOT dot the i of a non-Turkish name', () => {
    // This is why the default locale is used here and tr-TR is not: Turkish
    // casing dots EVERY i, so Smith becomes SMİTH and Martin MARTİN.
    expect(displayName('Ian Smith', 'upper')).toBe('IAN SMITH');
    expect(displayName('Christina Martin', 'upper')).toBe('CHRISTINA MARTIN');
  });
  it('accepts the known limit: an all-lowercase Turkish name loses its dot', () => {
    // The same limit initialsFrom accepts, in the opposite direction. Costed
    // and chosen: tr-TR would fix this one name and break every name with an i.
    expect(displayName('ilker yılmaz', 'upper')).toBe('ILKER YILMAZ');
  });
  it('expands the German sharp s, which is correct here', () => {
    // initialsFrom had to guard against this because it promises at most two
    // characters; a full name has no such limit and SS is the right capital.
    expect(displayName('Weiß', 'upper')).toBe('WEISS');
  });
  it('returns empty for an empty name', () => {
    expect(displayName('', 'upper')).toBe('');
  });
});

describe('nameLetterSpacing', () => {
  it('is undefined by default', () => {
    expect(nameLetterSpacing(undefined)).toBeUndefined();
  });
  it('is undefined when normal', () => {
    expect(nameLetterSpacing('normal')).toBeUndefined();
  });
  it('opens the tracking when upper', () => {
    expect(nameLetterSpacing('upper')).toBe('0.04em');
  });
});
```

- [ ] **Step 3: Testin başarısız olduğunu gör**

Run: `npx vitest run test/typography.test.ts --root packages/renderer`
Expected: FAIL — "Failed to resolve import '../src/utils/typography'"

- [ ] **Step 4: Implementasyonu yaz**

`packages/renderer/src/utils/typography.ts` oluştur:

```ts
import type { SignatureData } from '../types';

type NameCase = NonNullable<SignatureData['layout']['nameCase']>;

/**
 * İsim satırının basılacak hâli.
 *
 * Büyük harf CSS ile DEĞİL burada üretilir: `text-transform` Outlook'un
 * masaüstü Word render motorunda güvenilmez, ama biz zaten çıktıyı üreten
 * tarafız — güvenilmez bir CSS özelliğine bulaşmak için sebep yok.
 *
 * VARSAYILAN `toUpperCase()` kullanılır — komşu `initialsFrom`'un
 * `toLocaleUpperCase('tr-TR')`'ından KASITLI OLARAK FARKLI. Birleştirmeyin.
 *
 * Sebep ölçüldü: Türkçe kural isimdeki HER `i`'yi noktalıya çevirir, yalnız
 * ilk harfi değil. `Smith` → `SMİTH`, `Martin` → `MARTİN`, `Weiß` → `WEİSS`.
 * Varsayılan kuralda düzgün yazılmış Türkçe isim de doğru çıkar (`İ` zaten
 * büyüktür, `ı` → `I` doğrudur): `İlker Yılmaz` → `İLKER YILMAZ`.
 *
 * Kabul edilen tek sınır: tamamen küçük harfle yazılmış Türkçe isim
 * (`ilker yılmaz` → `ILKER YILMAZ`, noktası düşer). `initialsFrom`'un kabul
 * ettiği sınırın aynısı ama ters yönde — orada bedel tek harf, burada bir
 * harf; `tr-TR` seçseydik bedel `i` içeren HER isim olurdu.
 *
 * `ß` → `SS` katlaması iki kuralda da olur ve burada DOĞRUDUR: tam isimde SS
 * doğru Almanca büyük harftir.
 */
export function displayName(fullName: string, nameCase: NameCase | undefined): string {
  if (nameCase !== 'upper') return fullName;
  return fullName.toUpperCase();
}

/**
 * Versal isimde harf aralığı. `em` cinsinden — px verseydik 15px ve 23px
 * isimde aynı oranı tutmazdı. Monogramın `0.02em`'inden geniş, çünkü orada
 * iki harf var, burada tam bir isim.
 *
 * `undefined` dönmesi kasıtlı: çağıran bunu doğrudan `styleToString`'e
 * verebilsin, `normal` hâlde stile hiçbir şey eklenmesin.
 */
export function nameLetterSpacing(nameCase: NameCase | undefined): string | undefined {
  return nameCase === 'upper' ? '0.04em' : undefined;
}
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npx vitest run test/typography.test.ts --root packages/renderer`
Expected: PASS (12 test)

- [ ] **Step 6: Commit**

```bash
git add packages/renderer/src/types.ts packages/renderer/src/utils/typography.ts packages/renderer/test/typography.test.ts
git commit -m "feat(renderer): emit the name in caps ourselves instead of asking text-transform"
```

---

### Task 2: Tipografiyi altı şablona uygula

**Files:**
- Modify: `packages/renderer/src/templates/card-bordered.ts:141-146`
- Modify: `packages/renderer/src/templates/classic-horizontal.ts:54-60`
- Modify: `packages/renderer/src/templates/cta-banner.ts:111-117`
- Modify: `packages/renderer/src/templates/divider-columns.ts:91-97`
- Modify: `packages/renderer/src/templates/photo-first.ts:111-117`
- Modify: `packages/renderer/src/templates/stacked-minimal.ts:139-145`
- Test: her şablonun kendi `test/<ad>.test.ts`

**Interfaces:**
- Consumes: `displayName()`, `nameLetterSpacing()` (Task 1).
- Produces: yok.

**Bu görev BİREBİR TEKDÜZE.** Altı şablonun isim satırı karakter karakter aynı; doğrulandı (her dosyada tam 1 eşleşme):

```ts
        `<span style="${styleToString({
          'font-family': font,
          'font-size': `${s.name}px`,
          'font-weight': 'bold',
          color: text,
          'line-height': '1.2',
        })}">${htmlEscape(data.identity.fullName)}</span>`,
```

- [ ] **Step 1: Failing test yaz (altı dosyaya)**

Her şablonun test dosyasına aşağıdaki bloğu ekle. `TID` yerine o dosyanın şablon kimliğini yaz (`'card-bordered'`, `'classic-horizontal'`, `'cta-banner'`, `'divider-columns'`, `'photo-first'`, `'stacked-minimal'`).

Dosyanın import bloğunda `import type { SignatureData } from '../src/types';` yoksa ekle.

```ts
describe('TID name case', () => {
  const base: SignatureData = {
    identity: { fullName: 'Elif Kaya' },
    contact: {},
    visuals: {
      brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
      mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
    },
    social: [],
    layout: { templateId: TID, size: 'medium', iconStyle: 'mono', showDividers: false },
  };

  it('prints the name as typed by default', () => {
    const html = renderSignature(base, TID);
    expect(html).toContain('>Elif Kaya<');
    expect(html).not.toContain('>ELİF KAYA<');
  });
  it('prints the name in caps when asked', () => {
    const html = renderSignature({ ...base, layout: { ...base.layout, nameCase: 'upper' } }, TID);
    expect(html).toContain('>ELİF KAYA<');
  });
  it('opens the tracking only in caps', () => {
    expect(renderSignature(base, TID)).not.toContain('letter-spacing:0.04em');
    expect(
      renderSignature({ ...base, layout: { ...base.layout, nameCase: 'upper' } }, TID),
    ).toContain('letter-spacing:0.04em');
  });
  it('never uses text-transform', () => {
    expect(
      renderSignature({ ...base, layout: { ...base.layout, nameCase: 'upper' } }, TID),
    ).not.toMatch(/text-transform/i);
  });
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npm test -w packages/renderer`
Expected: FAIL — altı dosyada "prints the name in caps when asked" kırmızı.

- [ ] **Step 3: Altı şablonda isim satırını değiştir**

Her dosyanın başına import ekle:

```ts
import { displayName, nameLetterSpacing } from '../utils/typography';
```

Ve o dosyadaki TEK eşleşmeyi şununla değiştir:

```ts
        `<span style="${styleToString({
          'font-family': font,
          'font-size': `${s.name}px`,
          'font-weight': 'bold',
          color: text,
          'line-height': '1.2',
          // `undefined` ise styleToString bu anahtarı hiç basmaz — normal
          // hâlde bugünkü çıktı bayt bayt korunur.
          'letter-spacing': nameLetterSpacing(data.layout.nameCase),
        })}">${htmlEscape(displayName(data.identity.fullName, data.layout.nameCase))}</span>`,
```

ℹ️ Bu güvenli, doğrulandı: `utils/inline-style.ts` içindeki `styleToString`
`undefined` ve `''` değerleri `.filter()` ile atıyor. Yani `nameCase` normalken
`letter-spacing` anahtarı stile HİÇ basılmaz ve bugünkü çıktı bayt bayt korunur.
Koşullu yayma (`...(x ? {} : {})`) biçimine gerek yok.

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npm test -w packages/renderer`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/templates packages/renderer/test
git commit -m "feat(renderer): let every template print its name in caps on request"
```

---

### Task 3: `utils/accent.ts`

**Files:**
- Create: `packages/renderer/src/utils/accent.ts`
- Test: `packages/renderer/test/accent.test.ts`

**Interfaces:**
- Consumes: `normalizeHex()`, `readableTextOn()` (`./color`); `row()`, `cell()` (`./table`).
- Produces:
  - `shouldShowAccentBand(data: SignatureData): boolean`
  - `accentBandRow(opts: { brandHex: string; height: number; colspan?: number }): string` — dekoratif tam genişlik satır
  - `accentPanelStyle(brandHex: string): { bgcolor: string; style: Record<string, string> }` — bir hücreye renk paneli vermek için

- [ ] **Step 1: Failing test yaz**

`packages/renderer/test/accent.test.ts` oluştur:

```ts
import { describe, it, expect } from 'vitest';
import { shouldShowAccentBand, accentBandRow, accentPanelStyle } from '../src/utils/accent';
import { contrastRatio } from '../src/utils/color';
import type { SignatureData } from '../src/types';

const base: SignatureData = {
  identity: { fullName: 'Elif Kaya' },
  contact: {},
  visuals: {
    brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
    mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
  },
  social: [],
  layout: { templateId: 'card-bordered', size: 'medium', iconStyle: 'mono', showDividers: false },
};

describe('shouldShowAccentBand', () => {
  it('is true when the field is absent', () => {
    expect(shouldShowAccentBand(base)).toBe(true);
  });
  it('is true when explicitly auto', () => {
    expect(shouldShowAccentBand({ ...base, layout: { ...base.layout, accentBand: 'auto' } })).toBe(true);
  });
  it('is false when turned off', () => {
    expect(shouldShowAccentBand({ ...base, layout: { ...base.layout, accentBand: 'off' } })).toBe(false);
  });
});

describe('accentBandRow', () => {
  const html = accentBandRow({ brandHex: '#7b9fd3', height: 8 });

  it('sets the colour with BOTH the attribute and the style', () => {
    expect(html).toContain('bgcolor="#7b9fd3"');
    expect(html).toContain('background-color:#7b9fd3');
  });
  it('is never empty, because Outlook will not paint an empty cell', () => {
    expect(html).toContain('&nbsp;');
  });
  it('collapses its own line box so the height is the height asked for', () => {
    expect(html).toContain('height:8px');
    expect(html).toContain('font-size:1px');
    expect(html).toContain('line-height:1px');
  });
  it('carries no image — a logo would vanish on a dark field', () => {
    expect(html).not.toMatch(/<img/i);
  });
  it('spans the columns it is told to', () => {
    expect(accentBandRow({ brandHex: '#7b9fd3', height: 8, colspan: 2 })).toContain('colspan="2"');
    expect(html).not.toContain('colspan');
  });
  it('emits no forbidden constructs', () => {
    expect(html).not.toMatch(/<div|<style|<svg|position\s*:|display:\s*flex|display:\s*grid|float:|webp|base64/i);
  });
});

describe('accentPanelStyle', () => {
  const panel = accentPanelStyle('#7b9fd3');

  it('gives both the attribute and the style value', () => {
    expect(panel.bgcolor).toBe('#7b9fd3');
    expect(panel.style['background-color']).toBe('#7b9fd3');
  });
  it('picks a readable text colour for the panel', () => {
    expect(contrastRatio('#7b9fd3', panel.style.color!)).toBeGreaterThanOrEqual(4.5);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run test/accent.test.ts --root packages/renderer`
Expected: FAIL — "Failed to resolve import '../src/utils/accent'"

- [ ] **Step 3: Implementasyonu yaz**

`packages/renderer/src/utils/accent.ts` oluştur:

```ts
import type { SignatureData } from '../types';
import { normalizeHex, readableTextOn } from './color';
import { cell, row } from './table';

/**
 * Aksan alanı çizilsin mi.
 *
 * Alan YOKSA 'auto' sayılır: aksan, şablonun KARAKTERİDİR, kişisel tercih
 * değil. Kapalı varsayılan galeriyi bugünkü basic hâlinde bırakırdı — ki
 * bu işin çıkış noktası tam olarak oydu.
 *
 * Bu fonksiyon yalnız KULLANICI tercihini söyler. Şablonun aksan alanı
 * olup olmadığı ayrı bir sorudur ve şablonun kendi kararıdır; yeri
 * tanımsız şablonlar bu fonksiyonu hiç çağırmaz.
 */
export function shouldShowAccentBand(data: SignatureData): boolean {
  return (data.layout.accentBand ?? 'auto') === 'auto';
}

/**
 * Dekoratif tam genişlik renk bandı — tek hücrelik bir satır.
 *
 * İçeriği `&nbsp;` ve satır kutusu 1px'e çökertilir. Sebep card-bordered'ın
 * kendi şerit hücresinde yazılı: *"Outlook boş hücreye arka plan
 * boyamıyor."* İçeriksiz bir hücre bazı istemcilerde hiç görünmez.
 *
 * `bgcolor` attribute'u VE `background-color` stili birlikte verilir —
 * Word motoru CSS zeminini her zaman uygulamıyor.
 *
 * GÖRSEL İÇERMEZ ve içermemeli: şeffaf PNG logo koyu zeminde kaybolur
 * (CLAUDE.md) ve elimizde açık/koyu logo varyantı yok.
 */
export function accentBandRow(opts: {
  brandHex: string;
  height: number;
  /**
   * Bandın kaç sütun kaplayacağı. Bant TEK hücreli bir satır; eğer aynı
   * tablodaki diğer satır çok hücreliyse (card-bordered'da şerit + gövde)
   * bunu vermezsek Word'de sütunlar hizasız çizilir.
   */
  colspan?: number;
}): string {
  const bg = normalizeHex(opts.brandHex);
  return row(
    cell('&nbsp;', {
      bgcolor: bg,
      height: opts.height,
      ...(opts.colspan ? { colspan: opts.colspan } : {}),
      style: {
        'background-color': bg,
        height: `${opts.height}px`,
        'font-size': '1px',
        'line-height': '1px',
      },
    }),
  );
}

/**
 * Bir hücreyi renk paneline çeviren attribute + stil parçası.
 *
 * Bant gibi kendi satırını kurmaz; çağıran bunu mevcut bir `cell()`
 * çağrısına yayar (`...accentPanelStyle(brand)`). Böylece panel, içindeki
 * avatar/monogram ile AYNI hücrede kalır ve Word'de hücre yüksekliği
 * uyuşmazlığı riski doğmaz.
 *
 * Metin rengi `readableTextOn` ile seçilir — 2026-09-14'te düzeltilen
 * hâliyle iki kontrastı karşılaştırır, sonuç her zaman ≥ 4.58.
 */
export function accentPanelStyle(brandHex: string): {
  bgcolor: string;
  style: Record<string, string>;
} {
  const bg = normalizeHex(brandHex);
  return {
    bgcolor: bg,
    style: { 'background-color': bg, color: readableTextOn(bg) },
  };
}
```

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npx vitest run test/accent.test.ts --root packages/renderer`
Expected: PASS (11 test)

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/utils/accent.ts packages/renderer/test/accent.test.ts
git commit -m "feat(renderer): build the accent band on the shared table helpers"
```

---

### Task 4: `card-bordered` — kartın üstüne bant

**Files:**
- Modify: `packages/renderer/src/templates/card-bordered.ts` (`SizeScale`, `SIZES`, kart kurulumu ~satır 389-399)
- Test: `packages/renderer/test/card-bordered.test.ts`

**Interfaces:**
- Consumes: `shouldShowAccentBand()`, `accentBandRow()` (Task 3).
- Produces: yok.

Mevcut yapı (satır 389-399):
```ts
  const cardBodyCell = cell(table(bodyRows.join(''), { width: '100%' }), {
    valign: 'top',
    style: {
      'background-color': '#ffffff',
      'border-top': `1px solid ${borderColor}`,
      ...
    },
  });
  const card = table(row(stripeCell + cardBodyCell), { width: '100%' });
```

- [ ] **Step 1: Failing test yaz**

`test/card-bordered.test.ts` sonuna ekle (`SignatureData` importu yoksa ekle):

```ts
describe('card-bordered accent band', () => {
  const base: SignatureData = {
    identity: { fullName: 'Elif Kaya' },
    contact: {},
    visuals: {
      brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
      mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
    },
    social: [],
    layout: { templateId: 'card-bordered', size: 'medium', iconStyle: 'mono', showDividers: false },
  };

  // DIKKAT: `bgcolor="#7b9fd3"` bandin imzasi DEGILDIR — bu fixture'da avatar
  // yok, dolayisiyla monogram tetikleniyor ve AYNI bgcolor'u basiyor. Bandi
  // ondan ayiran sey cokertilmis satir kutusu (`font-size:1px` +
  // `line-height:1px`), ki monogram onu hicbir zaman uretmez.
  it('draws the band by default', () => {
    const html = renderSignature(base, 'card-bordered');
    expect(html).toContain('font-size:1px');
    expect(html).toContain('line-height:1px');
    expect(html).toContain('height:8px');
  });
  it('drops the band when turned off', () => {
    const html = renderSignature({ ...base, layout: { ...base.layout, accentBand: 'off' } }, 'card-bordered');
    expect(html).not.toContain('font-size:1px');
    expect(html).not.toContain('height:8px');
  });
  it('drops the card top border when the band replaces it', () => {
    const withBand = renderSignature(base, 'card-bordered');
    const without = renderSignature({ ...base, layout: { ...base.layout, accentBand: 'off' } }, 'card-bordered');
    expect(without).toContain('border-top:1px solid');
    expect(withBand).not.toContain('border-top:1px solid');
  });
  it('keeps the logo out of the band', () => {
    const html = renderSignature(
      { ...base, visuals: { ...base.visuals, logoUrl: 'https://cdn.mailmyra.com/l.png' } },
      'card-bordered',
    );
    const band = html.slice(html.indexOf('font-size:1px'));
    const bandEnd = band.indexOf('</tr>');
    expect(band.slice(0, bandEnd)).not.toMatch(/<img/i);
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run test/card-bordered.test.ts -t "accent band" --root packages/renderer`
Expected: FAIL — `height:8px` bulunamıyor.

- [ ] **Step 3: Bandı ekle**

Dosya başına import:
```ts
import { accentBandRow, shouldShowAccentBand } from '../utils/accent';
```

`SizeScale` arayüzüne alan ekle (`stripe`'ın hemen altına):
```ts
  /** Kartın üstündeki yatay aksan bandının kalınlığı. Şeridin yaklaşık iki
   *  katı: dikey şerit ince bir aksan, yatay bant ise kartın üst kenarı. */
  band: number;
```

`SIZES` üç satırına sırasıyla `band: 6`, `band: 8`, `band: 10` ekle.

Kart kurulumunu değiştir:
```ts
  const bandOn = shouldShowAccentBand(data);
  // Kartın arka planı açıkça beyaz: koyu mod uygulayan istemcilerde şeffaf
  // gövde metni okunamaz hale getiriyor.
  const cardBodyCell = cell(table(bodyRows.join(''), { width: '100%' }), {
    valign: 'top',
    style: {
      'background-color': '#ffffff',
      // Bant AÇIKKEN üst kenarlık çizilmez: bandın kendisi kartın üst
      // kenarıdır, ikisi üst üste gelirse 1px'lik gri bir çizgi bandın
      // altında kalır ve kirli görünür.
      ...(bandOn ? {} : { 'border-top': `1px solid ${borderColor}` }),
      'border-right': `1px solid ${borderColor}`,
      'border-bottom': `1px solid ${borderColor}`,
      padding: `${s.pad}px`,
    },
  });
  const cardRows = row(stripeCell + cardBodyCell);
  // Bant kartın TAMAMININ üstünde (şerit dahil) — kartın üst kenarı olur.
  const card = table(
    (bandOn ? accentBandRow({ brandHex: data.visuals.brandColor, height: s.band, colspan: 2 }) : '') + cardRows,
    { width: '100%' },
  );
```

⚠️ Bant satırı TEK hücreli, kart satırı İKİ hücreli (şerit + gövde). Aynı tabloda farklı sütun sayısı Word'de hizasızlık üretir, bu yüzden banda **`colspan: 2` verilmesi ŞARTTIR**:

```ts
accentBandRow({ brandHex: data.visuals.brandColor, height: s.band, colspan: 2 })
```

`accentBandRow` bu parametreyi Task 3'te destekliyor; yeni bir şey eklemen gerekmiyor.

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npm test -w packages/renderer`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/templates/card-bordered.ts packages/renderer/src/utils/accent.ts packages/renderer/test
git commit -m "feat(renderer): give card-bordered a brand band as its top edge"
```

---

### Task 5: `photo-first` — avatar sütununa renk paneli

**Files:**
- Modify: `packages/renderer/src/templates/photo-first.ts:339-364` (sol hücre)
- Test: `packages/renderer/test/photo-first.test.ts`

**Interfaces:**
- Consumes: `shouldShowAccentBand()`, `accentPanelStyle()` (Task 3); `shouldShowMonogram()` (mevcut).
- Produces: yok.

Mevcut yapı: `const leftCell = hasAvatar ? cell(<img…>, {valign:'top', width:s.avatar, style:{'padding-right':`${s.gap}px`}}) : shouldShowMonogram(data) ? cell(monogramCell({…}), {…}) : '';`

- [ ] **Step 1: Failing test yaz**

`test/photo-first.test.ts` sonuna ekle:

```ts
describe('photo-first accent panel', () => {
  const base: SignatureData = {
    identity: { fullName: 'Elif Kaya' },
    contact: {},
    visuals: {
      brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
      mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
      avatarUrl: 'https://cdn.mailmyra.com/a.png',
    },
    social: [],
    layout: { templateId: 'photo-first', size: 'medium', iconStyle: 'mono', showDividers: false },
  };

  it('paints the avatar column by default', () => {
    expect(renderSignature(base, 'photo-first')).toContain('bgcolor="#7b9fd3"');
  });
  it('leaves the column unpainted when turned off', () => {
    const html = renderSignature({ ...base, layout: { ...base.layout, accentBand: 'off' } }, 'photo-first');
    expect(html).not.toContain('bgcolor="#7b9fd3"');
  });
  it('paints the column when a monogram stands in for the photo', () => {
    // DIKKAT: monogramin KENDISI de `bgcolor="#7b9fd3"` basiyor, yani varligi
    // olcmek paneli hic eklemesek bile yesil verirdi. Panel AYRI bir hucreye
    // uygulandigi icin dogru olcum SAYIMDIR: panelliyken iki, panelsizken bir.
    const { avatarUrl: _drop, ...noAvatar } = base.visuals;
    const say = (h: string) => (h.match(/bgcolor="#7b9fd3"/g) ?? []).length;
    const on = renderSignature({ ...base, visuals: noAvatar }, 'photo-first');
    const off = renderSignature(
      { ...base, visuals: noAvatar, layout: { ...base.layout, accentBand: 'off' } },
      'photo-first',
    );
    expect(say(off)).toBe(1);
    expect(say(on)).toBe(2);
  });
  // Bu vakada monogram da kapali, yani `bgcolor` hicbir kaynaktan gelmemeli —
  // varligi olcmek burada guvenli.
  it('paints nothing when the column is empty', () => {
    const { avatarUrl: _drop, ...noAvatar } = base.visuals;
    const html = renderSignature(
      { ...base, visuals: noAvatar, identity: { fullName: '   ' }, layout: { ...base.layout, monogram: 'off' } },
      'photo-first',
    );
    expect(html).not.toContain('bgcolor="#7b9fd3"');
  });
  it('keeps the logo out of the painted column', () => {
    const html = renderSignature(
      { ...base, visuals: { ...base.visuals, logoUrl: 'https://cdn.mailmyra.com/l.png' } },
      'photo-first',
    );
    const i = html.indexOf('bgcolor="#7b9fd3"');
    const cellEnd = html.indexOf('</td>', i);
    expect(html.slice(i, cellEnd)).not.toContain('l.png');
  });
});
```

- [ ] **Step 2: Testin başarısız olduğunu gör**

Run: `npx vitest run test/photo-first.test.ts -t "accent panel" --root packages/renderer`
Expected: FAIL

- [ ] **Step 3: Paneli ekle**

Dosya başına import:
```ts
import { accentPanelStyle, shouldShowAccentBand } from '../utils/accent';
```

Sol hücrenin iki `cell()` çağrısına paneli yay. Panel YALNIZ hücre doluysa uygulanır — boş sütunu renge boyamak saçma olur, ve koşul `colspan` kararıyla AYNI olmalı:

```ts
  const columnFilled = hasAvatar || shouldShowMonogram(data);
  // Panel, avatar/monogram ile AYNI hücrede durur: ayrı bir hücre açsaydık
  // Word'de iki hücrenin yüksekliği ayrışabilirdi.
  const panel = columnFilled && shouldShowAccentBand(data)
    ? accentPanelStyle(data.visuals.brandColor)
    : null;
```

Sonra her iki `cell()` çağrısının options nesnesine:
```ts
          ...(panel ? { bgcolor: panel.bgcolor } : {}),
          style: {
            'padding-right': `${s.gap}px`,
            ...(panel ? panel.style : {}),
          },
```
⚠️ Mevcut `style` içeriğini KORU, üstüne yay. `valign` ve `width` değişmez.

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npm test -w packages/renderer`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/templates/photo-first.ts packages/renderer/test/photo-first.test.ts
git commit -m "feat(renderer): paint photo-first's portrait column in the brand colour"
```

---

### Task 6: Diğer dördünde sessizlik + çapraz güvence

**Files:**
- Test: `packages/renderer/test/accent-coverage.test.ts` (**yeni**)
- Modify: `packages/renderer/test/guardrails.test.ts`

**Interfaces:**
- Consumes: `TEMPLATE_IDS` (`../src/render`); önceki tüm tasklar.
- Produces: yok.

- [ ] **Step 1: Testi yaz**

`packages/renderer/test/accent-coverage.test.ts` oluştur:

```ts
import { describe, it, expect } from 'vitest';
import { renderSignature } from '../src/render';
import type { SignatureData } from '../src/types';

const base: SignatureData = {
  identity: { fullName: 'Elif Kaya' },
  contact: { email: 'elif@voldi.net' },
  visuals: {
    brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
    mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
    avatarUrl: 'https://cdn.mailmyra.com/a.png',
  },
  social: [],
  layout: { templateId: '', size: 'medium', iconStyle: 'mono', showDividers: false },
};

// Aksan alanının YERİ sablonun karari (spec Karar 3). Bu ucunde yeri YOK,
// dolayisiyla anahtar sessizce yok sayilmali — cikti iki ayarda da AYNI.
const IGNORES_THE_SWITCH = ['classic-horizontal', 'divider-columns', 'stacked-minimal'] as const;

for (const templateId of IGNORES_THE_SWITCH) {
  it(`${templateId} renders identically whichever way the accent switch is set`, () => {
    const on = renderSignature({ ...base, layout: { ...base.layout, templateId, accentBand: 'auto' } }, templateId);
    const off = renderSignature({ ...base, layout: { ...base.layout, templateId, accentBand: 'off' } }, templateId);
    expect(on).toBe(off);
  });
}

describe('cta-banner', () => {
  // Bu sablonun CTA bandi `extras.ctaLabel`a baglidir, aksan bandina DEGIL.
  // Ikisini karistirmak kullanicinin CTA'sini sessizce yok ederdi.
  const withCta: SignatureData = {
    ...base,
    extras: { ctaLabel: 'Book a meeting', ctaUrl: 'https://mailmyra.com/demo' },
    layout: { ...base.layout, templateId: 'cta-banner' },
  };

  it('still draws its CTA band when the accent switch is off', () => {
    const html = renderSignature({ ...withCta, layout: { ...withCta.layout, accentBand: 'off' } }, 'cta-banner');
    expect(html).toContain('Book a meeting');
    expect(html).toContain('bgcolor="#7b9fd3"');
  });
});
```

- [ ] **Step 2: Koş**

Run: `npx vitest run test/accent-coverage.test.ts --root packages/renderer`
Expected: PASS. **Başarısız olursa üretim kodunda gerçek bir kusur buldun** — kodu düzeltme, testi gevşetme, BLOCKED bildir.

- [ ] **Step 3: Guardrail'e yeni kod yollarını ekle**

`test/guardrails.test.ts` içindeki mevcut `ALL_FORBIDDEN_CONSTRUCTS` dizisini KULLANARAK, dosyanın sonuna ekle:

```ts
// Aksan alani ve versal isim, fixture'larla tetiklenmeyen kod yollari:
// fixture'larda `accentBand`/`nameCase` alanlari yok, dolayisiyla varsayilan
// disi kombinasyonlar MODES dongusunden gecmiyor.
describe('guardrails: accent + name case', () => {
  for (const templateId of TEMPLATE_IDS) {
    it(`${templateId} stays clean with the accent on and the name in caps`, () => {
      const html = renderSignature(
        {
          identity: { fullName: 'Elif Kaya' },
          contact: { email: 'elif@voldi.net' },
          visuals: {
            brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
            mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
          },
          social: [],
          layout: { templateId, size: 'medium', iconStyle: 'mono', showDividers: false, accentBand: 'auto', nameCase: 'upper' },
        },
        templateId,
      );
      for (const pattern of ALL_FORBIDDEN_CONSTRUCTS) {
        expect(html).not.toMatch(pattern);
      }
    });
  }
});
```

- [ ] **Step 4: Tüm testler + typecheck**

Run: `npm test -w packages/renderer`
Run: `npm run typecheck -w packages/renderer`
Expected: ikisi de temiz

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/test
git commit -m "test(renderer): lock the four templates that ignore the accent switch"
```

---

## Yayın şartı (kod bittikten SONRA, ayrı iş)

CLAUDE.md: şablon başına 6-istemci test matrisi yayın şartıdır. Öncelik sırası:

1. **Bandın ve panelin DARK MODE davranışı** — en riskli, ilk bakılacak. Bazı istemciler (Outlook.com) zemini zorla ters çevirir; ters çevrilirse kontrast hesabımız o istemcide geçersizdir ve karar yeniden düşünülür.
2. `card-bordered` bandı Outlook Classic'te tam genişlik mi, şeridin üstünü de kaplıyor mu, altında gri çizgi kalmış mı.
3. `photo-first` paneli avatar sütunuyla aynı yükseklikte mi (Word hücre yüksekliği tuzağı).
4. Versal isim uzun adlarda 600px sınırında sarıyor mu.

⚠️ `divider-columns`, `photo-first`, `cta-banner` matristen HİÇ geçmedi; monogram borcu büyüttü, bu tur `photo-first`'ü yeniden değiştirdiği için daha da büyütüyor.
