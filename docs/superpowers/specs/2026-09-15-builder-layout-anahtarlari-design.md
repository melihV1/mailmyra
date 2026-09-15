# Builder'da üç yerleşim anahtarı — tasarım

**Tarih:** 2026-09-15 · **Karar veren:** Hüseyin · **Kapsam:** `apps/web` builder arayüzü + renderer'dan tek bir yetenek ihracı

## Sorun

`monogram`, `nameSpacing` ve `accentBand` renderer'da çalışıyor ve
`SignatureData['layout']` içinde tanımlı, ama **`apps/web` bu alanları hiç
tanımıyor** — arama `apps/web` genelinde sıfır sonuç veriyor.

Sonucu canlıda şu: `accentBand` tanımsızken "auto" sayıldığı için her
`card-bordered` ve `photo-first` imzası bantlı/panelli çiziliyor ve
**kullanıcı kapatamıyor**. `monogram` için de aynı — fotoğrafı olmayan
herkes baş harf diski alıyor, `off` diyemiyor. `nameSpacing` ise hiç
erişilemiyor.

Bu bir kusur değil, bilinçli bir ertelemeydi: aksan bandı spec'i
(`2026-09-15-tipografi-ve-aksan-bandi-design.md`) "Builder arayüzü. Bu spec
yalnız renderer'ı kapsar" diyerek kapsam dışı bırakmıştı. Ama aynı spec'in
Karar 1'i "aksanın YERİ şablonun kararı, **VARLIĞI kullanıcının**" diyor —
ve şu an varlığı kullanıcının değil. Bu spec o boşluğu kapatır.

## Kapsam dışı

- **Marka kilidi.** `BrandDocument` marka KİMLİĞİNİ yönetir (şablon,
  renkler, font, logo, CTA, yasal metin). `showDividers` ve `iconStyle`
  gibi sunum ayarları orada YOK; üç yeni anahtar da aynı kategoride.
  Sınır korunur.
- **Yuvarlak avatar / görsel boru hattı.** Ayrı iş.
- **Yeni şablon.** CLAUDE.md 6'da kilitli.

---

## Karar 1 — Yetenek bilgisi renderer'dan gelir, arayüzde kopyalanmaz

`accentBand` altı şablonun yalnız **ikisinde** bir şey yapar
(`card-bordered`, `photo-first`). Arayüzün bunu bilmesi gerek. İki yol
tartışıldı:

**Reddedilen:** şablon kimliklerini `StyleStep` içine gömmek. Tek satır,
ama motorun bilgisini arayüzde ikinci kez yazmak demek. Bu depo o dersi
zaten aldı — `scripts/audit.mjs` elle tutulan bir allowlist taşıyor ve
sapma riski oraya not edilmişti. Yedinci şablona aksan eklendiğinde arayüz
sessizce sunmamaya devam ederdi: **hata değil, sessizlik** — en kötü tür.

**Seçilen:** renderer, şablon başına yetenek haritası ihraç eder.

```ts
// packages/renderer/src/render.ts — TEMPLATES'in hemen altında
export const TEMPLATE_ACCENT_SURFACE = {
  'classic-horizontal': false,
  'stacked-minimal': false,
  'card-bordered': true,
  'divider-columns': false,
  'photo-first': true,
  'cta-banner': false,
} satisfies Record<keyof typeof TEMPLATES, boolean>;
```

`satisfies Record<keyof typeof TEMPLATES, boolean>` bilinçli: yeni bir
şablon eklendiğinde **derleme kırılır** ve yazan kişi o şablonun aksan
alanı olup olmadığına karar vermek zorunda kalır. Sapma tipte kapanır,
yorumla değil. `index.ts`'ten de ihraç edilir.

> **Monogram için böyle bir haritaya GEREK YOK.** `monogramCell` altı
> şablonun altısında da kullanılıyor (ölçüldü), yani koşul şablona değil
> yalnız "fotoğraf var mı"ya bağlı.

## Karar 2 — İşe yaramayan anahtar GİZLENİR

`accentBand` dört şablonda, `monogram` fotoğraf varken hiçbir şey yapmaz.
Hüseyin'in kararı: o durumda anahtar **gösterilmesin**.

Bu, dosyadaki `filledNote` deseninden (kontrolü bırak, altına "bu stilde
kullanılmıyor" notu düş) bilinçli bir sapmadır. Bedeli kayda geçsin:
**keşfedilebilirlik.** `classic-horizontal` kullanan biri aksan bandı
seçeneğinin var olduğunu hiç öğrenemez. Kabul edildi.

| Anahtar | Görünürlük koşulu |
|---|---|
| `nameSpacing` | **koşulsuz** — altı şablonda da çalışır |
| `monogram` | `!data.visuals.avatarUrl` |
| `accentBand` | `TEMPLATE_ACCENT_SURFACE[data.layout.templateId]` |

Üçü de "Tipografi ve yerleşim" (`typography`) grubunda, `showDividers`'ın
altında, dosyanın mevcut `form-check` deseniyle — kendi markup'ımız
yazılmaz (CLAUDE.md: panel Vuexy temasına bağlı, markup temadan gelir).

## Karar 3 — Varsayılan asimetrisi

🔴 **Bu işin tek gerçek tuzağı.** Üç alan da isteğe bağlı, ama tanımsız
hâlin anlamı aynı DEĞİL:

| Alan | Tanımsızken | Onay kutusu ifadesi |
|---|---|---|
| `monogram?: 'auto' \| 'off'` | **auto (açık)** | `checked={layout.monogram !== 'off'}` |
| `accentBand?: 'auto' \| 'off'` | **auto (açık)** | `checked={layout.accentBand !== 'off'}` |
| `nameSpacing?: 'normal' \| 'wide'` | **normal (kapalı)** | `checked={layout.nameSpacing === 'wide'}` |

Üçünü aynı kalıba sokmak — ör. hepsinde `=== 'auto'` demek — kayıtlı
**bütün** imzaların varsayılanını ters çevirir: `undefined` taşıyan her
eski imza monogramsız ve bantsız görünmeye başlar. Bu yüzden ifade alan
başına yazılır ve testle kilitlenir.

Yazma yönü `'auto'`/`'normal'` açıkça yazar, `undefined` bırakmaz —
kullanıcı bilinçli olarak açtığında bu kayda geçmelidir.

## Karar 4 — Kural SAF FONKSİYONDA yaşar, JSX'in içinde değil

`apps/web`'de React bileşen testi altyapısı **yok** (ölçüldü: vitest yalnız
`test/**/*.test.ts` topluyor, jsdom ve testing-library kurulu değil). JSX
içine gömülü bir `checked={...}` ifadesi bu yüzden **sınanamaz** — ve
Karar 3'teki asimetri tam da sınanması gereken şey.

Bu yüzden görünürlük ve işaretlilik kararları saf bir modüle çıkar:
`apps/web/app/builder/layout-switches.ts`. İki fonksiyon, DOM'suz, tam
test edilebilir:

```ts
export interface SwitchState { visible: boolean; checked: boolean }

/** Üç anahtarın o anki hâli — görünür mü, işaretli mi. */
export function layoutSwitches(data: SignatureData): {
  nameSpacing: SwitchState;
  monogram: SwitchState;
  accentBand: SwitchState;
};

/** Onay kutusu değişince layout'a yazılacak parça. */
export function layoutSwitchPatch(
  name: 'nameSpacing' | 'monogram' | 'accentBand',
  checked: boolean,
): Partial<SignatureData['layout']>;
```

`StyleStep` yalnız bunları çağırıp render eder; hiçbir koşul JSX'e
gömülmez. Bu, dosyanın mevcut deseniyle de tutarlı — `templateLooks` ve
`ColorField` zaten saf yardımcılar olarak ayrılmış
(`StyleStep.tsx:21`, bkz. `dict/builder.ts:379` notu).

Yan fayda: kurallar tek yerde, ileride "İmzalarım" ekranı ya da toplu
uygulama aynı fonksiyonu kullanabilir.

## Karar 5 — Kalıcılık: hiçbir şey yapmaya gerek yok

Üçü de kendiliğinden saklanır, ve bu doğrulandı:

- `Signature` modeli tüm `SignatureData`'yı JSON (LONGTEXT) tutuyor →
  **migration YOK**.
- `patchLayout` zaten `Partial<SignatureData['layout']>` alıyor → **reducer
  değişikliği YOK**.
- `mergeWithEmpty` bölüm bazlı object-spread yapıyor
  (`{ ...empty.layout, ...partial.layout }`), beyaz liste yok → eski
  taslaklar bozulmaz, yeni alanlar düşmez.
- `createEmptyData()` üç alanı **set ETMEZ**; tanımsız kalırlar ve renderer
  sözleşmesinde bu zaten doğru varsayılandır.

## Karar 6 — Dil

Anahtar başına bir EN + bir TR metni, `dict/builder.ts` içindeki
`typography` grubuna.

| Anahtar | EN | TR |
|---|---|---|
| `nameSpacing` | Wide letter spacing on the name | İsimde geniş harf aralığı |
| `monogram` | Show initials when there is no photo | Fotoğraf yokken baş harfleri göster |
| `accentBand` | Show the template's accent band | Şablonun aksan alanını göster |

Parite testi **gerekmez**: `const tr: Mirror<typeof en>` olduğu için eksik
bir TR anahtarı derlemeyi kırar ("bekçi test değil derleyicidir",
`lib/i18n/types.ts`).

---

## Dokunulan dosyalar

| Dosya | Değişiklik |
|---|---|
| `packages/renderer/src/render.ts` | **yeni** `TEMPLATE_ACCENT_SURFACE` |
| `packages/renderer/src/index.ts` | onu ihraç et |
| `apps/web/app/builder/layout-switches.ts` | **yeni** — saf kural modülü (Karar 4) |
| `apps/web/app/builder/steps/StyleStep.tsx` | üç `form-check`, kuralı modülden okur |
| `apps/web/lib/i18n/dict/builder.ts` | 3 EN + 3 TR anahtar |
| `apps/web/test/builder-layout-switches.test.ts` | **yeni** — Karar 3 ve 4'ün kilitleri |
| `packages/renderer/test/` | harita ↔ `TEMPLATE_IDS` örtüşmesi |

## Test

Hepsi saf fonksiyon testi — DOM gerekmez (Karar 4).

1. **Asimetri kilidi.** `layout` tanımsızken `monogram.checked` ve
   `accentBand.checked` **true**, `nameSpacing.checked` **false** gelir.
   Bu test, üç ifadeyi aynı kalıba sokan bir refactor'ı kırmızıya çevirir
   — sahadaki her kayıtlı imzayı etkileyecek olan hata budur.
2. **Yazma yönü.** `layoutSwitchPatch` boolean değil **string** yazar:
   `('monogram', false)` → `{ monogram: 'off' }`, `('nameSpacing', true)`
   → `{ nameSpacing: 'wide' }`. `true` yazan bir regresyon renderer'da
   sessizce "off değil" sayılır, yani özellik kapatılamaz hâle gelirdi.
3. **Görünürlük.** `accentBand.visible` yalnız haritada `true` olan iki
   şablonda; `monogram.visible` yalnız `avatarUrl` yokken. Altı şablon ×
   (avatarlı / avatarsız) tablo hâlinde sınanır.
4. **Harita bütünlüğü.** `Object.keys(TEMPLATE_ACCENT_SURFACE)` ile
   `TEMPLATE_IDS` birebir aynı kümedir — `satisfies` zaten derlemede
   tutuyor, bu test çalışma zamanında da tutar (renderer testinde).

🔴 **İğne uyarısı.** Bu depo aynı tuzağa altı kez düştü: bir iddia,
sınadığını sandığı şey olmadan da geçebiliyor (`toContain('color:#ffffff')`
`background-color:#ffffff`'e takılmıştı). Yazılan her testte "özellik olmasa
da geçer mi?" sorulur; geçiyorsa test işe yaramaz. Kabul ölçütü
**mutasyon**: özelliği boz, kırmızı gör, geri al.

## Riskler

- **Keşfedilebilirlik** (Karar 2'nin bilinçli bedeli): anahtarlar
  gizlendiği için özellik görünmez kalabilir. Kullanım verisi çıkınca
  yeniden değerlendirilir.
- **Varsayılan çevirme** (Karar 3): yanlış ifade sahadaki her imzayı
  etkiler. Testle kilitli.
