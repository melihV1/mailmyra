# Tipografi + Aksan Bandı Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Görsel sözlüğe iki araç eklemek — isim satırında harf aralığı (altı şablonda, kullanıcı seçeneği) ve marka renginde aksan alanı (iki şablonda, yeri şablonun kararı).

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
- **Versal (büyük harf) isim YAPILMAZ.** Ölçüldü: her iki büyütme kuralı da isimlerin bir kısmını bozuyor (varsayılan `Elif`→`ELIF`, Türkçe `Smith`→`SMİTH`). `text-transform` da kullanılmaz.
- `apps/web` HİÇ DEĞİŞMEZ.
- Test: `npm test -w packages/renderer` · tek dosya: `npx vitest run test/<dosya> --root packages/renderer` · `npm run typecheck -w packages/renderer`

---

## File Structure

| dosya | sorumluluk |
|---|---|
| `packages/renderer/src/types.ts` | **değişir** — `layout.nameSpacing?`, `layout.accentBand?` |
| `packages/renderer/src/utils/typography.ts` | **sadeleşir** — yalnız `nameLetterSpacing()`; `displayName()` SİLİNİR |
| `packages/renderer/src/utils/accent.ts` | **yeni** — `shouldShowAccentBand()`, `accentBandRow()`, `accentPanelStyle()` |
| `packages/renderer/src/templates/*.ts` (6) | isim satırı; ikisinde ayrıca aksan alanı |
| `packages/renderer/test/typography.test.ts` | **yeni** |
| `packages/renderer/test/accent.test.ts` | **yeni** |
| `packages/renderer/test/*.test.ts` (6) | şablon başına kilitler |

---

### Task 1: `nameLetterSpacing()`

**Files:**
- Modify: `packages/renderer/src/types.ts` (`layout` bloğu)
- Modify: `packages/renderer/src/utils/typography.ts` (mevcut — sadeleştirilecek)
- Test: `packages/renderer/test/typography.test.ts` (mevcut — sadeleştirilecek)

**Interfaces:**
- Consumes: yok.
- Produces: `nameLetterSpacing(nameSpacing: NameSpacing | undefined): string | undefined`
  ve `type NameSpacing = 'normal' | 'wide'`.

🔴 **Bu task bir GERİ ALMA içeriyor.** Daha önceki bir turda `displayName()`
yazıldı ve ismi büyük harfe çeviriyordu. Ölçüldü ki hangi kural seçilirse
seçilsin isimlerin bir kısmı bozuluyor: varsayılan `toUpperCase()` 12 Türkçe
isimden 8'ini (`Elif`→`ELIF`, `Ali`→`ALI`), `toLocaleUpperCase('tr-TR')` ise
7 yabancı isimden 6'sını (`Smith`→`SMİTH`, `Weiß`→`WEİSS`). Bir ismi dilini
bilmeden doğru büyütmek mümkün değil.

**Karar: versal tamamen bırakıldı.** `displayName()` SİLİNİR, `nameCase` alanı
`nameSpacing` olur, geriye yalnız harf aralığı kalır.

- [ ] **Step 1: Tipi düzelt**

`packages/renderer/src/types.ts` içindeki `layout` bloğunda, önceki turda
eklenen `nameCase?: 'normal' | 'upper';` alanını (varsa docstring'iyle
birlikte) ŞUNUNLA DEĞİŞTİR:

```ts
    /**
     * İsim satırının harf aralığı açılsın mı.
     *
     * Büyük harf seçeneği YOK ve bilerek yok: Türkçe'de `i`'nin büyüğü `İ`,
     * diğer dillerde `I`. Ölçüldü — varsayılan kural 12 Türkçe isimden 8'ini
     * (`Elif` → `ELIF`), Türkçe kural 7 yabancı isimden 6'sını (`Smith` →
     * `SMİTH`) bozuyor. Bir ismi dilini bilmeden doğru büyütmek mümkün değil
     * ve imzadaki tek dokunulmaz dize insanın kendi adıdır.
     */
    nameSpacing?: 'normal' | 'wide';
```

`accentBand?` alanı önceki turda eklendiyse OLDUĞU GİBİ KALIR.

- [ ] **Step 2: Testi yeniden yaz**

`packages/renderer/test/typography.test.ts` dosyasının TAMAMINI şununla değiştir:

```ts
import { describe, it, expect } from 'vitest';
import { nameLetterSpacing } from '../src/utils/typography';

describe('nameLetterSpacing', () => {
  it('is undefined by default', () => {
    expect(nameLetterSpacing(undefined)).toBeUndefined();
  });
  it('is undefined when normal', () => {
    expect(nameLetterSpacing('normal')).toBeUndefined();
  });
  it('opens the tracking when wide', () => {
    expect(nameLetterSpacing('wide')).toBe('0.04em');
  });
});
```

- [ ] **Step 3: Testin başarısız olduğunu gör**

Run: `npx vitest run test/typography.test.ts --root packages/renderer`
Expected: FAIL — `displayName` importu kalktığı için eski testler yok; yeni
testler `nameSpacing` tipini tanımayan imza yüzünden kırmızı.

- [ ] **Step 4: Implementasyonu sadeleştir**

`packages/renderer/src/utils/typography.ts` dosyasının TAMAMINI şununla değiştir:

```ts
import type { SignatureData } from '../types';

type NameSpacing = NonNullable<SignatureData['layout']['nameSpacing']>;

/**
 * Geniş aralıklı isimde harf aralığı.
 *
 * Bu dosya bir zamanlar `displayName()` de içeriyordu ve ismi büyük harfe
 * çeviriyordu. KALDIRILDI (2026-09-15) çünkü ölçüldü: hangi büyütme kuralı
 * seçilirse seçilsin isimlerin bir kısmı bozuluyor — varsayılan kural
 * `Elif` → `ELIF`, Türkçe kural `Smith` → `SMİTH`. Bir ismi dilini bilmeden
 * doğru büyütmek mümkün değil. **Geri eklemeyin**; ancak `SignatureData`
 * kişi başına bir dil sinyali taşırsa mümkün olur.
 *
 * `em` cinsinden — px verseydik 15px ve 23px isimde aynı oranı tutmazdı.
 * Monogramın `0.02em`'inden geniş, çünkü orada iki harf var, burada tam bir
 * isim.
 *
 * `undefined` dönmesi kasıtlı: `utils/inline-style.ts` içindeki
 * `styleToString` `undefined` ve `''` değerleri filtreliyor, yani çağıran
 * bunu doğrudan stil nesnesine koyabilir ve `normal` hâlde anahtar hiç
 * basılmaz — bugünkü çıktı bayt bayt korunur.
 */
export function nameLetterSpacing(nameSpacing: NameSpacing | undefined): string | undefined {
  return nameSpacing === 'wide' ? '0.04em' : undefined;
}
```

- [ ] **Step 5: Testlerin geçtiğini gör**

Run: `npx vitest run test/typography.test.ts --root packages/renderer`
Expected: PASS (3 test)

- [ ] **Step 6: Tüm paket + typecheck**

Run: `npm test -w packages/renderer`
Run: `npm run typecheck -w packages/renderer`
Expected: ikisi de temiz. `displayName`'e başka bir yerden atıf kalmışsa
typecheck yakalar — kalmamalı, çünkü şablonlara henüz uygulanmadı.

- [ ] **Step 7: Commit**

```bash
git add packages/renderer/src/types.ts packages/renderer/src/utils/typography.ts packages/renderer/test/typography.test.ts
git commit -m "fix(renderer): drop uppercase names — no rule gets both languages right"
```

---

### Task 2: Harf aralığını altı şablona uygula

**Files:**
- Modify: `packages/renderer/src/templates/card-bordered.ts`
- Modify: `packages/renderer/src/templates/classic-horizontal.ts`
- Modify: `packages/renderer/src/templates/cta-banner.ts`
- Modify: `packages/renderer/src/templates/divider-columns.ts`
- Modify: `packages/renderer/src/templates/photo-first.ts`
- Modify: `packages/renderer/src/templates/stacked-minimal.ts`
- Test: her şablonun kendi `test/<ad>.test.ts`

**Interfaces:**
- Consumes: `nameLetterSpacing()` (Task 1).
- Produces: yok.

**Bu görev BİREBİR TEKDÜZE.** Altı şablonun isim satırı karakter karakter aynı;
doğrulandı (her dosyada tam 1 eşleşme):

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

Her şablonun test dosyasına aşağıdaki bloğu ekle. `TID` yerine o dosyanın
şablon kimliğini yaz. Dosyanın import bloğunda
`import type { SignatureData } from '../src/types';` yoksa ekle.

```ts
describe('TID name spacing', () => {
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

  it('adds no tracking by default', () => {
    expect(renderSignature(base, TID)).not.toContain('letter-spacing:0.04em');
  });
  it('opens the tracking when asked', () => {
    expect(
      renderSignature({ ...base, layout: { ...base.layout, nameSpacing: 'wide' } }, TID),
    ).toContain('letter-spacing:0.04em');
  });
  // Versal BIRAKILDI: hicbir ayar ismin harflerine dokunmaz. Bu testin
  // kirmizi olmasi, birinin buyuk harfi geri getirdigi anlamina gelir.
  it('never changes the letters of the name', () => {
    for (const ns of [undefined, 'normal', 'wide'] as const) {
      const html = renderSignature({ ...base, layout: { ...base.layout, nameSpacing: ns } }, TID);
      expect(html).toContain('>Elif Kaya<');
      expect(html).not.toContain('ELIF');
      expect(html).not.toContain('ELİF');
    }
  });
  it('never uses text-transform', () => {
    expect(
      renderSignature({ ...base, layout: { ...base.layout, nameSpacing: 'wide' } }, TID),
    ).not.toMatch(/text-transform/i);
  });
});
```

- [ ] **Step 2: Testlerin başarısız olduğunu gör**

Run: `npm test -w packages/renderer`
Expected: FAIL — altı dosyada "opens the tracking when asked" kırmızı.

- [ ] **Step 3: Altı şablonda isim satırını değiştir**

Her dosyanın başına import ekle:

```ts
import { nameLetterSpacing } from '../utils/typography';
```

Ve o dosyadaki TEK eşleşmeyi şununla değiştir — **`htmlEscape(data.identity.fullName)`
kısmına DOKUNMA**, yalnız stile bir anahtar eklenir:

```ts
        `<span style="${styleToString({
          'font-family': font,
          'font-size': `${s.name}px`,
          'font-weight': 'bold',
          color: text,
          'line-height': '1.2',
          // `undefined` ise styleToString bu anahtarı hiç basmaz — normal
          // hâlde bugünkü çıktı bayt bayt korunur.
          'letter-spacing': nameLetterSpacing(data.layout.nameSpacing),
        })}">${htmlEscape(data.identity.fullName)}</span>`,
```

ℹ️ Bu güvenli, doğrulandı: `utils/inline-style.ts` içindeki `styleToString`
`undefined` ve `''` değerleri `.filter()` ile atıyor.

- [ ] **Step 4: Testlerin geçtiğini gör**

Run: `npm test -w packages/renderer`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/renderer/src/templates packages/renderer/test
git commit -m "feat(renderer): let every template open the tracking on its name line"
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
// fixture'larda `accentBand`/`nameSpacing` alanlari yok, dolayisiyla varsayilan
// disi kombinasyonlar MODES dongusunden gecmiyor.
describe('guardrails: accent + name case', () => {
  for (const templateId of TEMPLATE_IDS) {
    it(`${templateId} stays clean with the accent on and the tracking open`, () => {
      const html = renderSignature(
        {
          identity: { fullName: 'Elif Kaya' },
          contact: { email: 'elif@voldi.net' },
          visuals: {
            brandColor: '#7b9fd3', iconColor: '#7b9fd3', textColor: '#111827',
            mutedColor: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif',
          },
          social: [],
          layout: { templateId, size: 'medium', iconStyle: 'mono', showDividers: false, accentBand: 'auto', nameSpacing: 'wide' },
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
