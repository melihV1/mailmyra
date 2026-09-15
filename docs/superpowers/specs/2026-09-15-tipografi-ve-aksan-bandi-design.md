# Görsel sözlük, Aşama 1 — versal tipografi + aksan bandı

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
- **`text-transform` CSS özelliği.** Gerekçe Karar 2'de.

---

## Karar 1 — İki yeni `layout` alanı, kullanıcı kontrollü

```ts
/** İsim satırı büyük harfe çevrilsin ve harf aralığı açılsın mı. */
nameCase?: 'normal' | 'upper';
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

## Karar 2 — Büyük harf CSS ile değil, renderer'da üretilir

`text-transform`, Outlook'un Word render motorunda güvenilmez. Ama biz çıktıyı
üreten tarafız: renderer doğrudan `ELİF KAYA` basabilir.

```ts
displayName(fullName, 'upper')  →  'ELİF KAYA'   (+ letter-spacing stili)
```

Büyütme **varsayılan `toUpperCase()`** ile yapılır — `initialsFrom`'un
kullandığı `toLocaleUpperCase('tr-TR')` ile KASITLI OLARAK FARKLI.

🔴 **Bu, ilk taslağın düzeltilmesidir.** Önce `initialsFrom` ile aynı kuralı
yazmıştım. Ölçtüğümde gerekçenin tam tersine döndüğü görüldü: Türkçe kural
isimdeki HER `i`'yi noktalıya çevirir, yalnız ilk harfi değil.

| girdi | `tr-TR` | varsayılan |
|---|---|---|
| `İlker Yılmaz` | İLKER YILMAZ ✓ | **İLKER YILMAZ ✓** |
| `Smith` | SMİTH ✗ | **SMITH ✓** |
| `Martin` | MARTİN ✗ | **MARTIN ✓** |
| `Weiß` | WEİSS ✗ | **WEISS ✓** |
| `ilker yılmaz` | İLKER YILMAZ ✓ | ILKER YILMAZ ✗ |

Düzgün yazılmış Türkçe isim varsayılanla da DOĞRU çıkar (`İ` zaten büyüktür,
`ı` → `I` doğrudur). Tek bozulan, tamamen küçük harfle yazılmış Türkçe isim —
`initialsFrom`'un kabul ettiği sınırın aynısı, ama orada bedel tek harfti.

**İki fonksiyon bilerek ayrışır, birleştirilmemeli:** `initialsFrom` tek harf
üretir ve o harf çoğunlukla Türkçe bir adın baş harfidir → `tr-TR` doğru.
`displayName` tam ismi basar → varsayılan doğru. Biri diğerine uydurulursa
karşı taraf bozulur.

`ß` → `SS` katlaması iki kuralda da olur ve burada DOĞRUDUR: `initialsFrom`'da
sorundu çünkü orada iki karakter garantisi vardı; tam isimde `SS` zaten doğru
Almanca büyük harftir.

Harf aralığı `em` cinsinden verilir (px değil — 15px ve 23px isimde aynı oranı
tutsun). `0.04em` önerilir; monogramın `0.02em`'inden geniş çünkü tam bir isim,
iki harf değil.

## Karar 3 — Aksan bandının yeri: şablon başına, hepsinde değil

Altı kompozisyon okundu. Hepsine koymak, çözmeye çalıştığımız "hepsi aynı
görünüyor" sorununu renkli hâliyle yeniden üretirdi.

| şablon | karar | gerekçe |
|---|---|---|
| **card-bordered** | ✅ kartın ÜSTÜNE tam genişlik marka renginde bant | Zaten kart yapısı var (beyaz gövde + sol aksan şeridi); bant oturacağı yeri hazır buluyor. Şeridin rengiyle aynı, kimlik güçlenir. |
| **photo-first** | ✅ avatar SÜTUNUNUN arkasına renk paneli | "Yaratıcı vurgu" şablonu, en büyük avatar kutusu (88/104/120) onda; monogram zaten oraya renk koyuyor, panel onu çerçeveler. **Sol hücre BOŞKEN panel de çizilmez** — ne avatar ne monogram varsa (adı boş bir imza) `leftCell` `''` olur ve renkli boş bir sütun saçma durur. Koşul: `hasAvatar \|\| shouldShowMonogram(data)`, yani `colspan` kararıyla AYNI koşul. |
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
| `nameCase` | `'normal'` | Kişisel stil tercihi. Herkesin ismini zorla büyük harfe çevirmek saldırgan; uzun isimler versal hâlde sarar. |
| `accentBand` | `'auto'` (açık) | Şablonun KARAKTERİ, kişisel tercih değil. Kapalı olsaydı galeri bugünkü basic hâlinde kalırdı — şikâyetin kendisi buydu. |

Monogramla tutarlı: alan yoksa `'auto'` sayılır, yani kayıtlı eski imzalar da
bandı kazanır. Kurulmuş imzalar etkilenmez (HTML kopyalanıp gitmiş); yalnız
yeniden export edenler.

⚠️ **Bu, `card-bordered` ve `photo-first` kullanan mevcut imzaların çıktısını
değiştirir.** Müşteri sayısı tek haneli olduğu için kabul edildi.

---

## Üretilecek HTML

Metin rengi her iki bantta da `readableTextOn(brand)` ile seçilir — 2026-09-14'te
düzeltilen hâliyle, yani iki kontrastı karşılaştırıp büyüğünü alan sürüm
(her zaman ≥ 4.58 kontrast).

**Bant/panel `table()`/`cell()` yardımcılarıyla kurulur**, elle `<table>` yazılmaz.
Monogram turunun dersi: elle kurulan tablo, CLAUDE.md'nin her tabloda zorunlu
kıldığı Outlook 2512 kenarlık düzeltmesini (`border="0"` + `border:none` +
`mso-table-lspace/rspace`) atlar. `cell()` artık `bgcolor` ve `height`
parametrelerini destekliyor (monogram turunda eklendi).

`bgcolor` attribute'u **ve** `background-color` stili birlikte verilir — Word
motoru CSS zeminini her zaman uygulamıyor.

İsim satırı, `nameCase === 'upper'` iken:
```
font-size:<mevcut>px; font-weight:<mevcut>; letter-spacing:0.04em;
```
metin zaten büyük harf olarak basılır. `text-transform` KULLANILMAZ.

## Bilinen risk — dark mode

Bazı istemciler (Outlook.com, bazı Gmail yapılandırmaları) zemini zorla ters
çevirir. Açık `background-color` vermek çoğunda yeterli ama **garanti değil**.
Bunu ancak 6-istemci matrisinde göreceğiz. Matriste bandın dark mode
davranışı ayrıca kaydedilir; ters çevrilen bir istemci çıkarsa kontrast
hesabımız o istemcide geçersiz olur ve karar yeniden düşünülür.

## Değişecek dosyalar

| dosya | ne |
|---|---|
| `packages/renderer/src/types.ts` | `layout.nameCase?`, `layout.accentBand?` |
| `packages/renderer/src/utils/typography.ts` | **yeni** — `displayName()` + `nameLetterSpacing()` |
| `packages/renderer/src/utils/accent.ts` | **yeni** — `shouldShowAccentBand()` + `accentBandRow()` / `accentPanelCell()` |
| `packages/renderer/src/templates/card-bordered.ts` | üst bant |
| `packages/renderer/src/templates/photo-first.ts` | avatar sütunu paneli |
| diğer 4 şablon | yalnız `displayName()` çağrısı (isim satırı) |

`apps/web` HİÇ DEĞİŞMEZ.

## Test planı

Birim:
- `displayName()` — `'normal'` aynen geçer; `'upper'` Türkçe kuralıyla büyütür
  (`ilker` → `İLKER`), `ß` → `SS` doğru kabul edilir, boş ad boş döner.
- `shouldShowAccentBand()` — `'off'` kapatır, alan yokken `'auto'` sayılır,
  yeri tanımsız şablonda her hâlükârda false.
- `accentBandRow()` / `accentPanelCell()` — `bgcolor` + `background-color`
  birlikte, metin rengi `readableTextOn`, yasak yapı yok, **`<img>` içermiyor**
  (Karar 4'ün makine kontrolü).

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
- Altısında: `nameCase: 'upper'` isim satırını büyütür ve `letter-spacing`
  ekler; `'normal'` bugünkü çıktıyı korur.

Çapraz:
- Guardrail: yeni kod yolları da `ALL_FORBIDDEN_CONSTRUCTS`'tan geçer
  (monogram turunda kurulan paylaşılan liste).
- `nameCase: 'upper'` + monogram birlikte: baş harfler ZATEN büyük, çift
  büyütme bozulma yapmamalı.

6-istemci matrisi (YAYIN ŞARTI):
1. **Bandın dark mode davranışı** — en riskli, ilk bakılacak.
2. `card-bordered` bandı Outlook Classic'te tam genişlik mi, kartın kenarlığıyla
   hizalı mı.
3. `photo-first` paneli avatar sütunuyla aynı yükseklikte mi (Word'de hücre
   yüksekliği tuzağı).
4. Versal isim uzun adlarda sarıyor mu (600px sınırında).

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
