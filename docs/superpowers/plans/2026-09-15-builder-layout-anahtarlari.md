# Builder'da üç yerleşim anahtarı — uygulama planı

> **Ajan çalışanlar için:** ZORUNLU ALT BECERİ: bu planı görev görev uygulamak için
> `superpowers:subagent-driven-development` (önerilen) ya da `superpowers:executing-plans`
> kullan. Adımlar takip için checkbox (`- [ ]`) söz dizimi taşır.

**Amaç:** `monogram`, `nameSpacing` ve `accentBand` renderer'da çalışıyor ama builder
arayüzünde hiç yok; üçünü Stil sekmesine anahtar olarak ekle.

**Mimari:** Hangi şablonun aksan alanı olduğu bilgisi renderer'dan ihraç edilir
(arayüzde kopyalanmaz). Görünürlük ve işaretlilik kuralları saf bir modülde yaşar
(`apps/web`'de React bileşen testi altyapısı YOK, JSX'e gömülen ifade sınanamaz).
`StyleStep` yalnız o modülü çağırıp mevcut `form-check` deseniyle render eder.

**Teknoloji:** TypeScript, React (Next.js App Router), vitest, Bootstrap/Vuexy CSS sınıfları.

**Spec:** `docs/superpowers/specs/2026-09-15-builder-layout-anahtarlari-design.md`
**Dal:** `claude/builder-layout-switches` · **Taban:** `main` = `1b430b4`

## Global kısıtlar

- Renderer SAF kalır: DOM yok, React yok, tarayıcı API'si yok. Yeni bağımlılık yok.
- İmza HTML'i DEĞİŞMEZ. Bu iş yalnız arayüzü bağlar; `renderSignature` çıktısı
  aynı girdi için bayt bayt aynı kalmalıdır.
- Kendi markup'ını YAZMA. Panel Vuexy temasına bağlı (CLAUDE.md); yeni kontroller
  `StyleStep.tsx`'te ZATEN VAR OLAN `form-check` desenini birebir tekrarlar.
- Dil: kod, tanımlayıcı ve commit mesajları İngilizce; kod içi gerekçe yorumları Türkçe.
- EN/TR paritesi derleyicinin işi (`const tr: Mirror<typeof en>`), test yazma.
- 🔴 **İğne uyarısı.** Bu depo aynı tuzağa altı kez düştü: bir iddia, sınadığını
  sandığı şey olmadan da geçebiliyor. Yazdığın her testte "özellik olmasa da geçer mi?"
  sor. Kabul ölçütü **mutasyon**: özelliği boz, kırmızı gör, geri al — ve raporunda göster.
- Komutlar depo kökünden koşulur. Çıkış kodunu `| grep`/`| tail` ile MASKELEME —
  bu projede maskelenmiş bir çıkış kodu iki kez yanlış "başarılı" raporuna yol açtı.

---

## Dosya haritası

| Dosya | Sorumluluk |
|---|---|
| `packages/renderer/src/render.ts` | `TEMPLATES` bildirimi + `TEMPLATE_ACCENT_SURFACE` |
| `packages/renderer/src/index.ts` | yeni sabiti ihraç eder |
| `packages/renderer/test/template-capabilities.test.ts` | **yeni** — harita ↔ `TEMPLATE_IDS` |
| `apps/web/app/builder/layout-switches.ts` | **yeni** — görünürlük + işaretlilik kuralı (saf) |
| `apps/web/test/builder-layout-switches.test.ts` | **yeni** — asimetri, yazma yönü, görünürlük |
| `apps/web/lib/i18n/dict/builder.ts` | 3 EN + 3 TR anahtar (`steps.style.typography`) |
| `apps/web/app/builder/steps/StyleStep.tsx` | üç `form-check`, kuralı modülden okur |

---

## Task 1: Renderer şablon başına aksan yeteneğini ihraç etsin

**Dosyalar:**
- Değiştir: `packages/renderer/src/render.ts`
- Değiştir: `packages/renderer/src/index.ts:1`
- Test: `packages/renderer/test/template-capabilities.test.ts` (yeni)

**Arayüzler:**
- Tüketir: yok (ilk görev)
- Üretir: `TEMPLATE_ACCENT_SURFACE: Record<'classic-horizontal'|'stacked-minimal'|'card-bordered'|'divider-columns'|'photo-first'|'cta-banner', boolean>` — `@mailmyra/renderer`'dan ihraç. Task 2 bunu tüketir.

🔴 **Bu görevin can alıcı noktası.** `TEMPLATES` şu an `Record<string, …>` olarak
ANOTASYONLU. O hâlde `keyof typeof TEMPLATES` literal birleşim değil düpedüz `string`
olur ve `satisfies` koruması **hiçbir şey garanti etmez** — eksik anahtarlı bir harita
hatasız derlenir (ölçüldü). Bu yüzden önce bildirim `satisfies`'e çevrilir; bunun yan
etkisi olarak literal anahtarlı nesne artık `string` ile indekslenemez, `renderSignature`
içindeki arama genişletilir.

- [ ] **Adım 1: Başarısız testi yaz**

`packages/renderer/test/template-capabilities.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TEMPLATE_IDS, TEMPLATE_ACCENT_SURFACE } from '../src/index';

describe('TEMPLATE_ACCENT_SURFACE', () => {
  it('covers exactly the templates the renderer knows about', () => {
    // `satisfies` bunu derlemede tutuyor; bu test çalışma zamanında da tutar,
    // çünkü TEMPLATE_IDS `Object.keys` ile üretiliyor ve tip bilgisi taşımıyor.
    expect(Object.keys(TEMPLATE_ACCENT_SURFACE).sort()).toEqual([...TEMPLATE_IDS].sort());
  });

  it('marks exactly the two templates that draw an accent surface', () => {
    // DİKKAT: `toBe(true)` tek başına yetmez — dördünün false olduğunu da
    // iddia etmezsek "hepsi true" diyen bir regresyon bu testi geçer.
    const accent = Object.entries(TEMPLATE_ACCENT_SURFACE)
      .filter(([, v]) => v)
      .map(([k]) => k)
      .sort();
    expect(accent).toEqual(['card-bordered', 'photo-first']);
  });
});
```

- [ ] **Adım 2: Testi koş, başarısız olduğunu gör**

```bash
npx vitest run test/template-capabilities.test.ts --root packages/renderer
```

Beklenen: FAIL — `TEMPLATE_ACCENT_SURFACE` ihraç edilmiyor.

- [ ] **Adım 3: `render.ts`'i yaz**

`packages/renderer/src/render.ts` — `TEMPLATES` bildiriminin TAMAMINI değiştir:

```ts
type TemplateFn = (data: SignatureData, opts?: RenderOptions) => string;

/**
 * 🔴 Bu nesne `Record<string, TemplateFn>` diye ANOTASYONLANMAZ — `satisfies`
 * ile bildirilir. Sebep: anotasyon anahtarları `string`e genişletir ve
 * aşağıdaki `TEMPLATE_ACCENT_SURFACE`'in `satisfies` koruması hiçbir şeyi
 * tutmaz hâle gelir (eksik anahtarlı harita hatasız derlenir — ölçüldü).
 * `satisfies` ile literal anahtarlar korunur, koruma ısırır.
 */
const TEMPLATES = {
  'classic-horizontal': classicHorizontal,
  'stacked-minimal': stackedMinimal,
  'card-bordered': cardBordered,
  'divider-columns': dividerColumns,
  'photo-first': photoFirst,
  'cta-banner': ctaBanner,
} satisfies Record<string, TemplateFn>;

export const TEMPLATE_IDS = Object.keys(TEMPLATES);

/**
 * Hangi şablonun aksan alanı (bant/panel) var. `layout.accentBand` yalnız
 * burada `true` olanlarda bir şey yapar; builder anahtarı da yalnız onlarda
 * gösterir. Arayüz bu listeyi KOPYALAMAZ, buradan okur — yoksa yedinci
 * şablona aksan eklendiğinde arayüz sessizce sunmamaya devam ederdi.
 *
 * `satisfies Record<keyof typeof TEMPLATES, boolean>` bilinçli: yeni şablon
 * eklendiğinde DERLEME KIRILIR ve yazan kişi karar vermek zorunda kalır.
 */
export const TEMPLATE_ACCENT_SURFACE = {
  'classic-horizontal': false,
  'stacked-minimal': false,
  'card-bordered': true,
  'divider-columns': false,
  'photo-first': true,
  'cta-banner': false,
} satisfies Record<keyof typeof TEMPLATES, boolean>;
```

Ve `renderSignature` içindeki arama satırını değiştir:

```ts
  // Literal anahtarlı nesne `string` ile indekslenemez; çalışma zamanı
  // "bilinmeyen şablon" kontrolü aşağıda KORUNUYOR.
  const template = (TEMPLATES as Record<string, TemplateFn>)[templateId];
```

- [ ] **Adım 4: İhraç et**

`packages/renderer/src/index.ts` — 1. satırı değiştir:

```ts
export { renderSignature, TEMPLATE_IDS, TEMPLATE_ACCENT_SURFACE } from './render';
```

- [ ] **Adım 5: Testleri koş**

```bash
npx vitest run test/template-capabilities.test.ts --root packages/renderer
npm test -w packages/renderer
npm run typecheck
```

Beklenen: üçü de PASS / temiz. Renderer paketi 695 testten 697'ye çıkar.

- [ ] **Adım 6: Korumanın ısırdığını MUTASYONLA kanıtla**

`TEMPLATE_ACCENT_SURFACE`'ten `'cta-banner': false,` satırını geçici olarak sil, sonra:

```bash
npm run typecheck
```

Beklenen: `error TS1360: ... Property '"cta-banner"' is missing`. Satırı geri koy,
`npm run typecheck`'in yeniden temiz geçtiğini doğrula. **Raporunda bu çıktıyı göster.**

- [ ] **Adım 7: İmza çıktısının DEĞİŞMEDİĞİNİ kanıtla**

Bu görev yalnız tip düzeyinde oynadı; `renderSignature` çıktısı aynı kalmalı.
Altı şablonu dört fixture ile render edip SHA-256'larını bu görevden ÖNCEKİ hâlle
karşılaştır (`git stash` KULLANMA — bu worktree'de yasak; `git show HEAD:<dosya>`
ile eski sürümü geçici bir dosyaya yazıp karşılaştır). Raporuna eşitlik kanıtını koy.

- [ ] **Adım 8: Commit**

```bash
git add packages/renderer/src/render.ts packages/renderer/src/index.ts packages/renderer/test/template-capabilities.test.ts
git commit -m "feat(renderer): export which templates have an accent surface

The builder needs to know which templates `layout.accentBand` actually
affects. Exporting it keeps that knowledge in the engine instead of copying
the template list into the UI, where it would silently rot the first time a
seventh template gained an accent.

The guard only works if TEMPLATES keeps its literal keys, so its type
annotation becomes a satisfies clause and renderSignature's lookup widens to
match. Verified: removing a key from the map now fails with TS1360, and it
compiled clean before the change.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 2: Görünürlük ve işaretlilik kuralı — saf modül

**Dosyalar:**
- Oluştur: `apps/web/app/builder/layout-switches.ts`
- Test: `apps/web/test/builder-layout-switches.test.ts` (yeni)

**Arayüzler:**
- Tüketir: Task 1'in `TEMPLATE_ACCENT_SURFACE`'i (`@mailmyra/renderer`'dan).
- Üretir: `layoutSwitches(data: SignatureData)` → `{ nameSpacing: SwitchState; monogram: SwitchState; accentBand: SwitchState }` ve `layoutSwitchPatch(name: SwitchName, checked: boolean)` → `Partial<SignatureData['layout']>`. Task 3 ikisini de çağırır.

🔴 **Bu görevin can alıcı noktası — VARSAYILAN ASİMETRİSİ.** Üç alan da isteğe bağlı
ama tanımsız hâlin anlamı aynı DEĞİL: `monogram` ve `accentBand` tanımsızken **AÇIK**,
`nameSpacing` tanımsızken **KAPALI**. Üçünü aynı kalıba sokmak (ör. hepsinde
`=== 'auto'`) sahada kayıtlı **bütün** imzaların varsayılanını ters çevirir.

- [ ] **Adım 1: Başarısız testi yaz**

`apps/web/test/builder-layout-switches.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { SignatureData } from '@mailmyra/renderer';
import { TEMPLATE_IDS } from '@mailmyra/renderer';
import { createEmptyData } from '../app/builder/reducer';
import { layoutSwitches, layoutSwitchPatch } from '../app/builder/layout-switches';

function withLayout(over: Partial<SignatureData['layout']>): SignatureData {
  const d = createEmptyData();
  return { ...d, layout: { ...d.layout, ...over } };
}

describe('layoutSwitches — default asymmetry', () => {
  it('treats an untouched layout as monogram ON, accent ON, spacing OFF', () => {
    // 🔴 Bu testin varlık sebebi: üç ifadeyi tek kalıba sokan bir "temizlik"
    // refactor'ı sahada kayıtlı HER imzanın varsayılanını ters çevirir.
    const s = layoutSwitches(withLayout({ templateId: 'card-bordered' }));
    expect(s.monogram.checked).toBe(true);
    expect(s.accentBand.checked).toBe(true);
    expect(s.nameSpacing.checked).toBe(false);
  });

  it('reads an explicit off as off, and an explicit wide as on', () => {
    const s = layoutSwitches(
      withLayout({ templateId: 'card-bordered', monogram: 'off', accentBand: 'off', nameSpacing: 'wide' }),
    );
    expect(s.monogram.checked).toBe(false);
    expect(s.accentBand.checked).toBe(false);
    expect(s.nameSpacing.checked).toBe(true);
  });

  it('reads an explicit auto/normal the same as undefined', () => {
    const s = layoutSwitches(
      withLayout({ templateId: 'card-bordered', monogram: 'auto', accentBand: 'auto', nameSpacing: 'normal' }),
    );
    expect(s.monogram.checked).toBe(true);
    expect(s.accentBand.checked).toBe(true);
    expect(s.nameSpacing.checked).toBe(false);
  });
});

describe('layoutSwitches — visibility', () => {
  it('shows the spacing switch on every template', () => {
    for (const templateId of TEMPLATE_IDS) {
      expect(layoutSwitches(withLayout({ templateId })).nameSpacing.visible).toBe(true);
    }
  });

  it('shows the accent switch only where the template has an accent surface', () => {
    const visible = TEMPLATE_IDS.filter(
      (templateId) => layoutSwitches(withLayout({ templateId })).accentBand.visible,
    ).sort();
    // DİKKAT: sadece "card-bordered görünür" demek yetmez — listenin TAMAMINI
    // iddia etmezsek "hepsinde görünür" diyen bir regresyon testi geçer.
    expect(visible).toEqual(['card-bordered', 'photo-first']);
  });

  it('shows the monogram switch only when there is no photo', () => {
    const noPhoto = withLayout({ templateId: 'photo-first' });
    expect(layoutSwitches(noPhoto).monogram.visible).toBe(true);

    const withPhoto: SignatureData = {
      ...noPhoto,
      visuals: { ...noPhoto.visuals, avatarUrl: 'https://cdn.mailmyra.com/a.png' },
    };
    expect(layoutSwitches(withPhoto).monogram.visible).toBe(false);
  });
});

describe('layoutSwitchPatch — write direction', () => {
  it('writes the string the renderer expects, never a boolean', () => {
    // Boolean yazan bir regresyon renderer'da sessizce "off değil" sayılır,
    // yani özellik kapatılamaz hâle gelir ve hiçbir şey hata vermez.
    expect(layoutSwitchPatch('monogram', false)).toEqual({ monogram: 'off' });
    expect(layoutSwitchPatch('monogram', true)).toEqual({ monogram: 'auto' });
    expect(layoutSwitchPatch('accentBand', false)).toEqual({ accentBand: 'off' });
    expect(layoutSwitchPatch('accentBand', true)).toEqual({ accentBand: 'auto' });
    expect(layoutSwitchPatch('nameSpacing', false)).toEqual({ nameSpacing: 'normal' });
    expect(layoutSwitchPatch('nameSpacing', true)).toEqual({ nameSpacing: 'wide' });
  });

  it('never leaves the field undefined — a deliberate choice must be recorded', () => {
    for (const name of ['monogram', 'accentBand', 'nameSpacing'] as const) {
      for (const checked of [true, false]) {
        const patch = layoutSwitchPatch(name, checked);
        expect(Object.keys(patch)).toEqual([name]);
        expect(patch[name]).toBeTypeOf('string');
      }
    }
  });
});
```

- [ ] **Adım 2: Testi koş, başarısız olduğunu gör**

```bash
npx vitest run test/builder-layout-switches.test.ts --root apps/web
```

Beklenen: FAIL — `layout-switches` modülü yok.

- [ ] **Adım 3: Modülü yaz**

`apps/web/app/builder/layout-switches.ts`:

```ts
import type { SignatureData } from '@mailmyra/renderer';
import { TEMPLATE_ACCENT_SURFACE } from '@mailmyra/renderer';

export type SwitchName = 'nameSpacing' | 'monogram' | 'accentBand';

export interface SwitchState {
  /** Anahtar hiç gösterilsin mi — işe yaramayacağı yerde GİZLENİR (spec Karar 2). */
  visible: boolean;
  /** Onay kutusu işaretli mi. */
  checked: boolean;
}

/**
 * Üç yerleşim anahtarının o anki hâli.
 *
 * Bu kural BİLEREK JSX'in dışında: `apps/web`'de React bileşen testi
 * altyapısı yok (vitest yalnız `test/**\/*.test.ts` topluyor), yani
 * `checked={...}` diye gömülen bir ifade hiç sınanamazdı — ve sınanması
 * gereken şey tam da aşağıdaki asimetri.
 *
 * ÇAĞIRAN `applied`'ı (marka bindirilmiş veriyi) vermeli, ham `data`'yı
 * değil: `templateId` marka ayarlarından KİLİTLENEBİLİR, ve aksan
 * anahtarının görünürlüğü gerçekten render edilecek şablona bağlıdır.
 * Üç alanın kendisi marka belgesinde olmadığı için `checked` iki veride de
 * aynıdır.
 */
export function layoutSwitches(data: SignatureData): Record<SwitchName, SwitchState> {
  const { layout, visuals } = data;
  const accentTemplate: boolean =
    (TEMPLATE_ACCENT_SURFACE as Record<string, boolean>)[layout.templateId] ?? false;

  return {
    // Harf aralığı altı şablonda da çalışır — koşulsuz görünür.
    nameSpacing: {
      visible: true,
      // 🔴 `=== 'wide'` — tanımsızken KAPALI. Diğer ikisiyle aynı kalıba SOKMA.
      checked: layout.nameSpacing === 'wide',
    },
    // Monogram altı şablonda da var; koşul yalnız "fotoğraf yok".
    monogram: {
      visible: !visuals.avatarUrl,
      // 🔴 `!== 'off'` — tanımsızken AÇIK.
      checked: layout.monogram !== 'off',
    },
    accentBand: {
      visible: accentTemplate,
      // 🔴 `!== 'off'` — tanımsızken AÇIK.
      checked: layout.accentBand !== 'off',
    },
  };
}

/**
 * Onay kutusu değişince `patchLayout`'a verilecek parça.
 *
 * `'auto'`/`'normal'` AÇIKÇA yazılır, alan `undefined` bırakılmaz: kullanıcı
 * bilinçli olarak açtıysa bu kayda geçmelidir. Ayrıca boolean yazmak
 * renderer'da sessizce "off değil" sayılır — hata vermez, özellik
 * kapatılamaz hâle gelir.
 */
export function layoutSwitchPatch(
  name: SwitchName,
  checked: boolean,
): Partial<SignatureData['layout']> {
  switch (name) {
    case 'nameSpacing':
      return { nameSpacing: checked ? 'wide' : 'normal' };
    case 'monogram':
      return { monogram: checked ? 'auto' : 'off' };
    case 'accentBand':
      return { accentBand: checked ? 'auto' : 'off' };
  }
}
```

- [ ] **Adım 4: Testleri koş**

```bash
npx vitest run test/builder-layout-switches.test.ts --root apps/web
npm test -w apps/web
npm run typecheck
```

Beklenen: hepsi PASS / temiz.

- [ ] **Adım 5: İğnelerin ısırdığını MUTASYONLA kanıtla**

Sırayla uygula, her birinde `npx vitest run test/builder-layout-switches.test.ts --root apps/web`
koş, KIRMIZI gördüğünü doğrula, sonra GERİ AL:

1. `checked: layout.nameSpacing === 'wide'` → `layout.nameSpacing !== 'off'`
   (asimetriyi yok eder — varsayılanı ters çevirir)
2. `checked: layout.monogram !== 'off'` → `layout.monogram === 'auto'`
   (tanımsız hâli KAPALI yapar — sahadaki her imzayı etkiler)
3. `visible: accentTemplate` → `visible: true` (dört şablonda boş anahtar gösterir)
4. `return { monogram: checked ? 'auto' : 'off' }` → `return { monogram: checked }`
   — bunun **derlemede** kırılması beklenir, `npm run typecheck` ile göster

🔴 Bir mutasyon YEŞİL kalırsa iki ihtimal var: kilit yok, YA DA mutasyon hiç
uygulanmadı. Önce uygulandığını doğrula (bu projede `replace` deseni benzersiz
olmadığı için sessizce atlandı ve "kilit yok" gibi okundu). **Raporunda dördünün
de çıktısını göster.**

- [ ] **Adım 6: Commit**

```bash
git add apps/web/app/builder/layout-switches.ts apps/web/test/builder-layout-switches.test.ts
git commit -m "feat(web): add the pure rule module behind the three layout switches

Visibility and checked-state live here rather than inline in JSX because
apps/web has no React component test setup, so an inline expression could not
be tested at all — and the thing most needing a test is that the three fields
do not share a default. monogram and accentBand are on when undefined while
nameSpacing is off, so collapsing the three expressions into one shape would
flip the default for every signature already saved.

The write direction always records an explicit string. Writing a boolean
would read as 'not off' in the renderer: no error, and the feature simply
could not be turned off.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Task 3: Stil sekmesine üç anahtarı bağla

**Dosyalar:**
- Değiştir: `apps/web/lib/i18n/dict/builder.ts` (EN `steps.style.typography` ≈ satır 175; TR ≈ satır 350)
- Değiştir: `apps/web/app/builder/steps/StyleStep.tsx` (import bloğu + `showDividers` bloğu ≈ satır 285-295)

**Arayüzler:**
- Tüketir: Task 2'nin `layoutSwitches(data)` ve `layoutSwitchPatch(name, checked)`'i.
- Üretir: kullanıcıya dönük üç onay kutusu. Sonraki görev yok.

- [ ] **Adım 1: Sözlük anahtarlarını ekle**

`apps/web/lib/i18n/dict/builder.ts`, EN bloğunda `showDividers: 'Show divider lines',`
satırının HEMEN ALTINA:

```ts
        nameSpacingWide: 'Wide letter spacing on the name',
        monogramFallback: 'Show initials when there is no photo',
        accentBandOn: "Show the template's accent band",
```

TR bloğunda `showDividers: 'Ayraç çizgilerini göster',` satırının HEMEN ALTINA:

```ts
        nameSpacingWide: 'İsimde geniş harf aralığı',
        monogramFallback: 'Fotoğraf yokken baş harfleri göster',
        accentBandOn: 'Şablonun aksan alanını göster',
```

- [ ] **Adım 2: Paritenin derleyici tarafından tutulduğunu gör**

TR bloğuna eklemeyi geçici olarak GERİ AL ve koş:

```bash
npm run typecheck
```

Beklenen: `Mirror<typeof en>` yüzünden HATA (eksik TR anahtarı). Sonra TR
anahtarlarını geri koy, `npm run typecheck`'in temiz geçtiğini doğrula.
**Raporunda bu çıktıyı göster** — parite testi yazmamamızın gerekçesi budur.

- [ ] **Adım 3: `StyleStep.tsx`'e import ekle**

`import { FieldGroup, LockHint } from '../fields';` satırının ALTINA:

```ts
import { layoutSwitches, layoutSwitchPatch, type SwitchName } from '../layout-switches';
```

- [ ] **Adım 4: Anahtarları render et**

`StyleStep` gövdesinde, `const TEMPLATE_LOOKS = templateLooks(builderDict[lang]);`
satırının ALTINA:

```ts
  // Marka bindirilmiş veriden okunur, ham `data`'dan DEĞİL: `templateId`
  // kilitlenebilir ve aksan anahtarının görünürlüğü gerçekten render
  // edilecek şablona bağlıdır (bkz. layout-switches.ts).
  const switches = layoutSwitches(applied);
```

Ve `showDividers` etiketini saran `<div className="col-12 col-md-6 d-flex align-items-end">`
bloğunun KAPANIŞ `</div>`'inden sonra, `iconStyle` bloğundan ÖNCE:

```tsx
        {(['nameSpacing', 'monogram', 'accentBand'] as const).map((name: SwitchName) =>
          switches[name].visible ? (
            <div key={name} className="col-12 col-md-6 d-flex align-items-end">
              <label className="form-check mb-2">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={switches[name].checked}
                  onChange={(e) =>
                    dispatch({ type: 'patchLayout', value: layoutSwitchPatch(name, e.target.checked) })
                  }
                />{' '}
                <span className="form-check-label">
                  {name === 'nameSpacing'
                    ? t.typography.nameSpacingWide
                    : name === 'monogram'
                      ? t.typography.monogramFallback
                      : t.typography.accentBandOn}
                </span>
              </label>
            </div>
          ) : null,
        )}
```

- [ ] **Adım 5: Doğrula**

```bash
npm test
npm run typecheck
```

Beklenen: ikisi de çıkış kodu 0. Çıkış kodunu ayrıca yazdır, boru hattıyla maskeleme:

```bash
npm test > /tmp/t.log 2>&1; echo "TEST EXIT=$?"
npm run typecheck > /tmp/tc.log 2>&1; echo "TYPECHECK EXIT=$?"
```

- [ ] **Adım 6: Tarayıcıda gözle doğrula**

`.claude/launch.json` yoksa oluştur (`apps/web` için `npm run dev`, port 3000), sonra
Browser pane ile `http://localhost:3000/builder` aç ve ŞUNLARI doğrula:

1. Stil sekmesi → şablon **Klasik** iken: "İsimde geniş harf aralığı" **var**,
   "Şablonun aksan alanını göster" **YOK**.
2. Şablon **Kart**'a geçince aksan anahtarı **belirir** ve **işaretli** gelir.
3. Aksan anahtarını kapat → önizlemedeki kartın üstündeki renkli bant **kaybolur**,
   kartın kendi üst kenarlığı **geri gelir**.
4. Ad alanını doldur, fotoğraf yokken monogram anahtarı **görünür** ve işaretli;
   kapatınca önizlemede baş harf diski **kaybolur**.
5. Harf aralığını aç → isimdeki harfler görünür biçimde açılır.

Her biri için önizleme iframe'inden kanıt al (`document.querySelector('iframe').contentDocument`),
ekran görüntüsü değil DOM iddiası: ör. aksan kapalıyken `height:8px` taşıyan hücrenin
**olmadığını**, açıkken olduğunu göster.

- [ ] **Adım 7: Commit**

```bash
git add apps/web/lib/i18n/dict/builder.ts apps/web/app/builder/steps/StyleStep.tsx
git commit -m "feat(web): surface the three layout switches in the Style tab

accentBand has been on by default since it shipped, with no way for a user to
turn it off, which contradicts the accent-band spec's own rule that the
accent's placement is the template's call and its presence is the user's. The
monogram was in the same position. This closes that.

A switch that would do nothing is hidden rather than shown and disabled, so
the accent switch appears only on the two templates that draw one and the
monogram switch only when there is no photo. That departs from the filledNote
pattern in this file and costs discoverability; the spec records why.

Visibility reads the brand-applied data rather than the raw draft, because
templateId can be locked by the org and the switch has to follow the template
that will actually render.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Öz-denetim notları (plan yazarından)

- **Spec kapsamı:** Karar 1 → Task 1. Karar 2 ve 3 → Task 2 (+ Task 3'ün görünürlük
  render'ı). Karar 4 → Task 2'nin modül yapısı. Karar 5 → görev YOK, bilinçli:
  spec'te "hiçbir şey yapmaya gerek yok" diye ölçülerek kanıtlandı (JSON kalıcılık,
  spread reducer). Task 3 Adım 5'teki tam suite bunu regresyona karşı korur.
  Karar 6 → Task 3 Adım 1-2.
- **Tip tutarlılığı:** `SwitchName` ve `SwitchState` Task 2'de tanımlanır, Task 3'te
  aynı adlarla kullanılır. `TEMPLATE_ACCENT_SURFACE` Task 1'de üretilir, Task 2'de
  tüketilir — ad her iki yerde birebir aynı.
- **Bilinçli boşluk:** JSX render'ının kendisi otomatik testle kapatılmıyor (altyapı
  yok). Task 3 Adım 6 bunu tarayıcıda DOM iddiasıyla kapatır — ekran görüntüsüyle
  değil, çünkü ekran görüntüsü "bant kayboldu" iddiasını kanıtlamaz.
