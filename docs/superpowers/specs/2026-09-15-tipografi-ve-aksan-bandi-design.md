# Görsel sözlük, Aşama 1 — harf aralığı + aksan bandı

<!-- final review ⑦: başlık "versal tipografi" diyordu ama versal Karar 2'de
     tamamen bırakıldı (bkz. aşağıda) — başlık kendi kararıyla çelişiyordu,
     düzeltildi. -->

**Tarih:** 2026-09-15 · **Onay:** Hüseyin (sözlü) · **Kapsam:** `packages/renderer`
**Önceki adım:** monogram (`2026-09-14-monogram-design.md`) · **Sonraki adım:** yuvarlak avatar (ayrı spec)

---

## Neden

Monogramdan sonra sözlüğü yeniden ölçtüm — **tam bir araç** büyümüş:

```
bgcolor          2 dosya   (table.ts + monogram.ts — yalnız monogramın içinde)
letter-spacing   1 dosya   (yalnız monogram)
text-transform   0 dosya
```

Yani fotoğrafı OLAN kullanıcı için hiçbir şey değişmedi. "Şablonlarımız çok
basic duruyor" şikâyetinin yarısı olduğu gibi duruyor: altı şablon hâlâ
**yerleşimle** ayrışıyor, görsel karakterle değil.

Bu spec iki araç ekler. Üçüncüsü (yuvarlak avatar) `apps/web` görsel yükleme
hattına girdiği için **ayrı bir spec**; burada kapsam dışı.

## Ne YAPILMAYACAK

- **Yuvarlak avatar.** `border-radius`ı Outlook yok saydığı için PNG'nin
  yükleme anında yuvarlanması gerekir → `apps/web/lib/image-pipeline.ts`.
  Aşama 2.
- **Builder arayüzü.** Bu spec yalnız renderer'ı kapsar. Yeni iki seçeneğin
  kullanıcıya nasıl gösterileceği ayrı iş (bkz. Açık sorular 1).
- **Şablon sayısını artırmak.** CLAUDE.md 6'da kilitli; bu tur mevcut altısına
  uygulanır.
- **Versal (büyük harf) isim.** Ölçüldü, her iki kural da isimlerin bir kısmını bozuyor — gerekçe Karar 2'de. `text-transform` de kullanılmaz.

---

## Karar 1 — İki yeni `layout` alanı, kullanıcı kontrollü

```ts
/** İsim satırının harf aralığı açılsın mı. Büyük harf YOK — bkz. Karar 2. */
nameSpacing?: 'normal' | 'wide';
/** Şablonun aksan bandı çizilsin mi. Yeri şablonun kararı, varlığı kullanıcının. */
accentBand?: 'auto' | 'off';
```

Hüseyin'in kararı (2026-09-15): bunlar **şablon başına tasarım kararı değil,
kullanıcı seçeneği.** Ben şablon kararını önermiştim — gerekçem, herkese aynı
ayar verilirse şablonların yine birbirine benzeyeceğiydi. Karar verildi, kayda
geçti; uygulama seçenek yolunu izler.

Uzlaştırma: **şablon nerede olacağına, kullanıcı açık mı kapalı mı olacağına
karar verir.** Aksan bandının YERİ kompozisyonun parçasıdır (Karar 3), VARLIĞI
kullanıcınındır.

## Karar 2 — Versal YOK. Yalnız harf aralığı.

🔴 **Bu, iki turda düzeltilen bir tasarım hatasıdır. Gerekçesi kayda geçsin,
çünkü ileride "büyük harf ekleyelim" önerisi kaçınılmaz olarak gelecek.**

İlk taslak ismi büyük harfe çeviriyordu. Hangi kuralı seçersek seçelim
isimlerin bir kısmını bozduğu ölçüldü:

```
varsayılan toUpperCase()   →  12 Türkçe isimden 8'ini bozuyor
                              Elif→ELIF · Ali→ALI · Emine→EMINE · Halil
                              Cemil → Fatih → Kerim → Sibel

toLocaleUpperCase('tr-TR') →  7 yabancı isimden 6'sını bozuyor
                              Smith→SMİTH · Martin→MARTİN · Christina
                              Philip → Weiß→WEİSS · David
```

Sebep: Türkçe'de `i`'nin büyüğü `İ`, diğer dillerde `I`. Bir ismi **dilini
bilmeden** doğru büyütmek mümkün değil. Ve imzadaki tek dokunulmaz dize
insanın kendi adıdır.

**Karar (Hüseyin, 2026-09-15): versal tamamen bırakıldı.** İsim yazıldığı gibi
basılır; tipografik araç olarak yalnız **harf aralığı** eklenir. Tek yanlış
cevabı olmayan seçenek buydu: hiçbir ismi bozmaz, yine de "tasarlanmış" hissi
verir.

Reddedilen alternatif: `identity.nameLocale` gibi bir dil sinyali eklemek.
Daha doğru sonuç verirdi ama yeni alan + builder arayüzü işi demek, ve sinyal
KİŞİ başına olmalı (Türkçe arayüz kullanan birinin yabancı ismi olabilir).
İleride o sinyal gelirse versal bu kararın üstüne eklenebilir.

Alan bu yüzden `nameCase` değil **`nameSpacing`**:

```ts
nameSpacing?: 'normal' | 'wide';
```

`'wide'` → isim satırına `letter-spacing: 0.04em`. `em` cinsinden, px değil —
15px ve 23px isimde aynı oranı tutsun. Monogramın `0.02em`'inden geniş çünkü
orada iki harf var, burada tam bir isim.

`text-transform` da kullanılmaz — zaten büyütme yapmıyoruz, ve o özellik
Word motorunda güvenilmez.

## Karar 3 — Aksan bandının yeri: şablon başına, hepsinde değil

Altı kompozisyon okundu. Hepsine koymak, çözmeye çalıştığımız "hepsi aynı
görünüyor" sorununu renkli hâliyle yeniden üretirdi.

| şablon | karar | gerekçe |
|---|---|---|
| **card-bordered** | ✅ kartın ÜSTÜNE tam genişlik marka renginde bant | Zaten kart yapısı var (beyaz gövde + sol aksan şeridi); bant oturacağı yeri hazır buluyor. Şeridin rengiyle aynı, kimlik güçlenir. |
| **photo-first** | ✅ avatar SÜTUNUNUN arkasına renk paneli, **YALNIZ gerçek fotoğraf varken** | "Yaratıcı vurgu" şablonu, en büyük avatar kutusu (88/104/120) onda. Koşul BİLEREK yalnız `hasAvatar` — `colspan` kararından (`hasAvatar \|\| shouldShowMonogram(data)`) FARKLI. ⚠️ **Revizyon (final review ①, kod bittikten sonra):** ilk sürümde koşul `colspan` ile AYNIYDI ("monogram zaten oraya renk koyuyor, panel onu çerçeveler" deniyordu) — YANLIŞ çıktı. Panel ile monogram AYNI `brand` hex'ini basıyordu; fotoğrafsız imzada monogramın disk silueti düz bir renk dikdörtgeninde kayboluyordu, ve Outlook Classic `border-radius`'ı da yok saydığı için orada hiç sınır kalmıyordu — bu, fotoğrafsız HER photo-first imzasının varsayılan hâliydi. Sahibinin kararı: monogram zaten bir renk bloğu, ikinci bir renk bloğu gereksiz — panel artık monogram varken ÇİZİLMEZ. **Sol hücre BOŞKEN de panel çizilmez** — ne avatar ne monogram varsa (adı boş bir imza) `leftCell` `''` olur ve renkli boş bir sütun saçma durur. |
| **cta-banner** | ⏸️ ZATEN VAR | CTA bandı zaten `background-color: brand` ve şablonun kimliği. İkinci renk alanı ikisini yarıştırır. `accentBand` bu şablonda **tamamen yok sayılır** — `'off'` bile CTA bandını KAPATMAZ. O bant `extras.ctaLabel`'a bağlıdır, aksan bandı değildir; karıştırmak kullanıcının CTA'sını sessizce yok ederdi. |
| **divider-columns** | ❌ | Kimliği 2px'lik dikey ayraç; renk alanı onu boğar. Kurumsal ölçülülük amacın kendisi. |
| **stacked-minimal** | ❌ | "Minimal" brief'in kendisi. |
| **classic-horizontal** | ❌ | Muhafazakâr temel şablon. Birinin renk alanı olmaması da bir ayrışmadır. |

**Sonuç: 2 yeni + 1 mevcut + 3 bilerek dışarıda.**

## Karar 4 — Aksan bandı LOGOYU ASLA İÇERMEZ

CLAUDE.md §E-posta HTML Kısıtları: *"Dark mode: şeffaf PNG'de logo kaybolur.
Kontur/padding stratejisi gerekir."* Elimizde açık/koyu logo varyantı YOK.

Bu yüzden bağlayıcı kural: **bandın içine logo girmez.** İki yerleşim de buna
uyar — `card-bordered`'da bant kartın üstünde, logo kart gövdesinde; `photo-first`'te
panel avatar sütununda, logo alt satırda.

Uygulayan, bandın içine logo koyan bir yerleşim üretirse bu bir spec ihlalidir.

## Karar 5 — Varsayılanlar

| alan | varsayılan | gerekçe |
|---|---|---|
| `nameSpacing` | `'normal'` | Kişisel stil tercihi; geniş aralık her isme yakışmaz ve uzun isimler 600px sınırında daha erken sarar. |
| `accentBand` | `'auto'` (açık) | Şablonun KARAKTERİ, kişisel tercih değil. Kapalı olsaydı galeri bugünkü basic hâlinde kalırdı — şikâyetin kendisi buydu. |

Monogramla tutarlı: alan yoksa `'auto'` sayılır, yani kayıtlı eski imzalar da
bandı kazanır. Kurulmuş imzalar etkilenmez (HTML kopyalanıp gitmiş); yalnız
yeniden export edenler.

⚠️ **Bu, `card-bordered` ve `photo-first` kullanan mevcut imzaların çıktısını
değiştirir.** Müşteri sayısı tek haneli olduğu için kabul edildi.

---

## Üretilecek HTML

Metin rengi **hiçbir bantta seçilmez** — ikisi de metin taşımaz, yalnız zemin
basar. (Bu satır önce "her iki bantta da `readableTextOn(brand)` ile seçilir"
diyordu; yanlıştı. `accentBandRow()` hiçbir zaman `color` basmadı, panelin
`color`'ı ise uygulamada ölüydü — tek tüketicisi bir `<img>` hücresi ve `<img>`
CSS `color`'dan etkilenmez — ve final review ⑤'te kaldırıldı.) İleride panele
metin girerse `readableTextOn(brand)` o an eklenir: 2026-09-14'te düzeltilen
hâliyle, yani iki kontrastı karşılaştırıp büyüğünü alan sürüm (her zaman
≥ 4.58 kontrast).

**Bant/panel `table()`/`cell()` yardımcılarıyla kurulur**, elle `<table>` yazılmaz.
Monogram turunun dersi: elle kurulan tablo, CLAUDE.md'nin her tabloda zorunlu
kıldığı Outlook 2512 kenarlık düzeltmesini (`border="0"` + `border:none` +
`mso-table-lspace/rspace`) atlar. `cell()` artık `bgcolor` ve `height`
parametrelerini destekliyor (monogram turunda eklendi).

`bgcolor` attribute'u **ve** `background-color` stili birlikte verilir — Word
motoru CSS zeminini her zaman uygulamıyor.

İsim satırı, `nameSpacing === 'wide'` iken stile YALNIZ bir anahtar ekler:
```
letter-spacing:0.04em
```
Metnin kendisine dokunulmaz — isim `htmlEscape(data.identity.fullName)` olarak,
kullanıcının yazdığı gibi basılır. `text-transform` KULLANILMAZ.

## Bilinen risk — dark mode

Bazı istemciler (Outlook.com, bazı Gmail yapılandırmaları) zemini zorla ters
çevirir. Açık `background-color` vermek çoğunda yeterli ama **garanti değil**.
Bunu ancak 6-istemci matrisinde göreceğiz. Matriste bandın dark mode
davranışı ayrıca kaydedilir; ters çevrilen bir istemci çıkarsa kontrast
hesabımız o istemcide geçersiz olur ve karar yeniden düşünülür.

## Değişecek dosyalar

| dosya | ne |
|---|---|
| `packages/renderer/src/types.ts` | `layout.nameSpacing?`, `layout.accentBand?` |
| `packages/renderer/src/utils/typography.ts` | **yeni** — `nameLetterSpacing()` (tek fonksiyon; `displayName` GEREKMİYOR, isim yazıldığı gibi basılıyor) |
| `packages/renderer/src/utils/accent.ts` | **yeni** — `shouldShowAccentBand()` + `accentBandRow()` / `accentPanelStyle()` |
| `packages/renderer/src/templates/card-bordered.ts` | üst bant |
| `packages/renderer/src/templates/photo-first.ts` | avatar sütunu paneli |
| diğer 4 şablon | yalnız `nameLetterSpacing()` çağrısı (isim satırının stili) |

`apps/web` HİÇ DEĞİŞMEZ.

## Test planı

Birim:
- `nameLetterSpacing()` — `'wide'` iken `0.04em`, aksi hâlde `undefined`.
- **Altı şablonda: isim HİÇBİR ayarda değişmez.** `Elif Kaya` her zaman
  `Elif Kaya` basılır — versalin bırakıldığının makine kontrolü.
- `shouldShowAccentBand()` — `'off'` kapatır, alan yokken `'auto'` sayılır,
  yeri tanımsız şablonda her hâlükârda false.
- `accentBandRow()` / `accentPanelStyle()` — `bgcolor` + `background-color`
  birlikte, yasak yapı yok, **`<img>` içermiyor** (Karar 4'ün makine kontrolü).
  Metin rengi basılmaz; `accentPanelStyle`'ın dönüş tipi bunu derleyici
  seviyesinde tutar (`style: { 'background-color': string }`).

Şablon başına:
- `card-bordered`: `accentBand` açıkken bant VAR, `'off'` iken YOK, bandın
  içinde `<img>` YOK.
- `photo-first`: aynı üçlü, artı panelin avatar/monogram ile aynı sütunda olduğu.
- Diğer dördü: `accentBand: 'auto'` iken çıktı DEĞİŞMEZ (yok sayılır) —
  regresyon kilidi.
- `cta-banner`: `accentBand: 'off'` iken CTA bandı HÂLÂ ÇİZİLİR (o bant
  `extras.ctaLabel`'a bağlı, aksan bandına değil) — kullanıcının CTA'sını
  sessizce yok etmediğimizin kilidi.
- `photo-first`: ne avatar ne monogram varken (boş ad) panel ÇİZİLMEZ —
  renkli boş sütun regresyonunun kilidi.
- Altısında: `nameSpacing: 'wide'` yalnız `letter-spacing` ekler, ismin
  KENDİSİNE dokunmaz; `'normal'` bugünkü çıktıyı bayt bayt korur.

Çapraz:
- Guardrail: yeni kod yolları da `ALL_FORBIDDEN_CONSTRUCTS`'tan geçer
  (monogram turunda kurulan paylaşılan liste).
- **Altı şablonda: isim hiçbir ayarda DEĞİŞMEZ.** `Elif Kaya` her zaman
  `Elif Kaya` basılır (`ELIF` de `ELİF` de çıkmaz) — versalin bırakıldığının
  makine kontrolü. Bu test kırmızıya dönerse biri büyük harfi geri getirmiş
  demektir.

6-istemci matrisi (YAYIN ŞARTI):
1. **Bandın dark mode davranışı** — en riskli, ilk bakılacak.
2. `card-bordered` bandı Outlook Classic'te tam genişlik mi, kartın kenarlığıyla
   hizalı mı.
3. `photo-first` paneli avatar sütunuyla aynı yükseklikte mi (Word'de hücre
   yüksekliği tuzağı).
4. `letter-spacing`'in `em` biriminde Outlook Classic'te uygulanıp
   uygulanmadığı (kimse doğrulamadı; monogram da `0.02em` ile aynı varsayım
   altında shiplendi) ve geniş aralıklı uzun bir ismin 600px sınırında sarıp
   sarmadığı. (final review ⑦: madde eskiden "Versal isim uzun adlarda
   sarıyor mu" diyordu — Karar 2'de silinen bir özelliği sınıyordu.)

## Açık sorular (kapsam dışı)

1. **Builder arayüzü.** `accentBand` anahtarı DÖRT şablonda hiçbir şey yapmaz
   (`classic-horizontal`, `divider-columns`, `stacked-minimal` — yeri yok;
   `cta-banner` — zaten bandı var). Kullanıcı düğmeyi çevirip hiçbir şey
   olmadığını görürse bu bir arayüz hatası gibi okunur. Panel tarafı bu
   anahtarı yalnız destekleyen şablonlarda göstermeli. Ayrı iş.
2. **Yuvarlak avatar** — Aşama 2, ayrı spec. `sharp` zaten bağımlılıkta ve
   `processImage()` hattı hazır; yükleme anında kare VE yuvarlak sürümü
   birlikte üretmek, CLAUDE.md'nin "bir kez üretilen URL asla değişmez"
   kuralını korurken geçişi anında yapar.
3. **Test borcu.** `divider-columns`, `photo-first`, `cta-banner` 6-istemci
   matrisinden hiç geçmedi; monogram borcu büyüttü, bu tur daha da büyütüyor.
   `photo-first` bu spec'te de değişiyor — matris koşulduğunda üçü birlikte
   kapatılmalı.
