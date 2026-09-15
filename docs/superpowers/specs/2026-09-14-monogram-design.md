# Monogram — fotoğrafı olmayan kullanıcıya görsel çıpa

**Tarih:** 2026-09-14 · **Onay:** Hüseyin (sözlü) · **Kapsam:** `packages/renderer`

---

## Neden

Ölçüldü: fotoğraf, logo ve el imzası olmadan **altı şablon da sıfır `<img>`
üretiyor.**

```
şablon               görselli  görselsiz   <img> sayısı
classic-horizontal       4885       3910     3 → 0
stacked-minimal          4236       3684     3 → 0
card-bordered            5378       4782     3 → 0
divider-columns          4953       3978     3 → 0
photo-first              4714       3904     3 → 0
cta-banner               4917       4304     3 → 0
```

Yani vesikalık fotoğrafı olmayan kullanıcı — ki çoğunluk odur — hangi
şablonu seçerse seçsin **düz metin bloğu** alıyor; `photo-first` bile.
Şablonlar birbirinden yalnızca fotoğrafın yerleşimiyle ayrıştığı için,
fotoğraf yokken seçim neredeyse anlamsızlaşıyor.

Bu, "şablonlarımız çok basic duruyor" şikâyetinin tek en büyük sebebi.
Monogram, sözlüğü büyütme işinin ilk adımı ve en yüksek etkili olanı.

## Ne YAPILMAYACAK

- **Daire şekli.** `border-radius` Outlook'un Word motorunda yok sayılır;
  diğer istemcilerde daire, Outlook'ta kare çıkar. Tutarsızlık üretmektense
  kare kalır. Yuvarlak avatar AYRI bir iş (bkz. Açık sorular).
- **PNG monogram.** Gerekçe aşağıda, Karar 1.
- Şablon sayısını artırmak. Bu tur yalnız sözlük.

---

## Karar 1 — Monogram HTML'dir, görsel değil

Bir `<td>`: `bgcolor` = marka rengi, içinde baş harfler metin olarak.

**Gerekçe (kozmetik değil):** kurumsal Outlook kurulumları dış görselleri
varsayılan olarak engeller. Görsel engelliyken fotoğraflı imza kırık kutu
gösterir. Monogramı PNG yaparsak, tam da *"fotoğrafı olmayan kullanıcı bir
şey görsün"* diye eklediğimiz şey engellendiğinde **hiçbir şey** gösterir —
fallback'in kendisi fallback'e muhtaç olur. HTML monogram metin olduğu için
her koşulda görünür.

Yan faydalar: CDN yok, üretim hattı yok, değişmez dosya adı sorunu yok
(CLAUDE.md §Görsel Boyut Politikası'ndaki "bir kez üretilen URL asla
değişmez" kuralı devreye hiç girmiyor); isim veya marka rengi değişince
yeniden üretilecek dosya yok.

Bedeli kare şekil ve web-safe font — ikisi de zaten mevcut kısıtlarımız
(CLAUDE.md §E-posta HTML Kısıtları).

## Karar 2 — Fotoğraf yoksa OTOMATİK çıkar

`SignatureData['layout']`'a yeni alan:

```ts
/** Fotoğraf yokken baş harf bloğu. Alan yoksa 'auto' sayılır. */
monogram?: 'auto' | 'off';
```

`'auto'` (varsayılan) → `visuals.avatarUrl` yoksa monogram basılır.
`'off'` → hiçbir zaman basılmaz (saf metin görünümü isteyenler için).
`avatarUrl` VARSA monogram hiçbir koşulda basılmaz — fotoğrafın yerini almaz.

**Neden seçenek değil varsayılan:** opt-in yapılsaydı kimse bulmazdı —
fotoğrafı olmayan kullanıcı "bir şey eksik" olduğunu bilmiyor ki arasın.
Otomatik olması düzeltmenin kendisi.

**Çıktı değişikliği riski kabul edildi:** kurulmuş imzalar etkilenmez (HTML
kopyalanıp gitmiş), yalnız yeniden export edenler monogram kazanır. Müşteri
sayısı şu an tek haneli (ilk 10 müşteri elle faturalanıyor).

## Karar 3 — Baş harfler: yazıldığı gibi al, yalnız küçükse büyüt

`identity.fullName`'den en fazla 2 karakter.

Türetme:
1. Kırp, ardışık boşlukları teke indir, boşluktan böl.
2. 0 kelime → monogram BASILMAZ (türetilecek harf yok).
3. 1 kelime → o kelimenin ilk karakteri (tek harf).
4. 2+ kelime → ilk kelimenin ilk karakteri + SON kelimenin ilk karakteri.

Büyütme: karakter **zaten büyükse dokunulmaz**; küçükse
`toLocaleUpperCase('tr-TR')` uygulanır.

| girdi | sonuç | doğru mu |
|---|---|---|
| `İlker Yılmaz` | `İY` | ✓ zaten büyük, dokunulmadı |
| `ilker yılmaz` | `İY` | ✓ Türkçe kural |
| `Ian Smith` | `IS` | ✓ zaten büyük, dokunulmadı |
| `ian smith` | `İS` | ✗ bilinen sınır |
| `Cher` | `C` | ✓ tek kelime |
| `van der Berg` | `VB` | ✓ ilk+son |
| `J. Smith` | `JS` | ✓ |

**Bilinen sınır kabul edildi:** yanlış olan tek satır, İngilizce bir ismin
TAMAMEN küçük harfle yazılması. İnsanlar kendi adını böyle yazmaz; düz
`toUpperCase()` seçseydik 2. satır `IY` çıkardı, yani **gerçek müşteri
kitlesinde** bozulurdu. Yanlış olacaksa nadir tarafta olsun.

Büyük/küçük harfi olmayan yazılar (Arapça, CJK) için `toLocaleUpperCase`
kimlik fonksiyonudur — karakter olduğu gibi geçer, sorun yok.

## Karar 4 — Altı şablonun hepsinde, avatarın kutusunda

Bulgu "altısı da sıfır görsele düşüyor"du; bir kısmını dışarıda bırakmak
sorunu yarım çözer.

Monogram, her şablonun **mevcut avatar yuvasına ve boyut ölçeğine** girer;
kompozisyona dokunulmaz, şablon başına yerleşim işi çıkmaz:

| şablon | avatar px (small/medium/large) |
|---|---|
| cta-banner | 40 / 48 / 56 |
| card-bordered | 48 / 60 / 72 |
| stacked-minimal | 56 / 72 / 88 |
| classic-horizontal | 64 / 90 / 110 |
| divider-columns | 64 / 90 / 110 |
| photo-first | 88 / 104 / 120 |

Punto = `Math.round(kutu * 0.4)` → 16px (en küçük) … 48px (en büyük).

Sığma kontrolü: Arial bold büyük harf ≈ 0.72em genişlik, iki harf ≈ 1.44em.
`1.44 × 0.4 = 0.576`, yani baş harfler kutunun ~%58'ini kaplar — her boyutta
rahat sığar. Oran bu yüzden 0.4; yükseltmek en küçük kutuda taşma riski
doğurur.

## Karar 5 — `readableTextOn()` DÜZELTİLİR (monogram buna mecbur)

Mevcut hâli luminans eşiği olarak `0.5` kullanıyor. Siyah/beyaz geçiş
noktası aslında **0.179** (iki seçeneğin kontrastının eşitlendiği nokta).
Sonuç: orta tonlu marka renklerinde kötü olan seçiliyor.

```
marka rengi   mevcut   kontrast | doğru   kontrast
#F26B21       beyaz      3.04   | siyah     6.90   ← BİZİM marka rengimiz
#7A8B3C       beyaz      3.76   | siyah     5.59
#6B8E9F       beyaz      3.50   | siyah     6.00
#5C9E5C       beyaz      3.23   | siyah     6.50
#8A8A8A       beyaz      3.45   | siyah     6.08
```

7 örnek renkten 5'inde kötü olan seçiliyor ve **Mailmyra'nın kendi turuncusu
3.04** — AA-large eşiğinin (3.0) kıl payı üstünde, AA normal (4.5) altında.

Düzeltme eşiği ayarlamak değil, **iki kontrastı ölçüp büyüğünü seçmek**:

```ts
export function readableTextOn(hexBackground: string): '#ffffff' | '#000000' {
  return contrastRatio(hexBackground, '#ffffff') >= contrastRatio(hexBackground, '#000000')
    ? '#ffffff'
    : '#000000';
}
```

Bu, matematiksel olarak her zaman **≥ 4.58** kontrast verir (en kötü hâl
geçiş noktasıdır), yani AA normal metni de geçer.

⚠️ **Bu, mevcut çıktıyı değiştirir.** `readableTextOn` bugün altı şablonun
da CTA buton metninde kullanılıyor (`ctaText`). Marka rengi `#F26B21` olan
imzalarda buton yazısı **beyazdan siyaha** döner. Bu bir düzeltmedir —
bugünkü hâl okunabilirlik eşiğinin altındaydı — ama görünür bir değişiklik
olduğu için burada açıkça kayda geçiyor.

---

## Üretilecek HTML

Word motorunda dikey ortalama için `valign` + `mso-line-height-rule: exactly`
birlikte kullanılır (tek satırlık metin için bilinen yöntem):

```html
<table role="presentation" border="0" cellpadding="0" cellspacing="0"
       width="90" style="width:90px;border-collapse:collapse;">
  <tr>
    <td align="center" valign="middle" bgcolor="#f26b21" width="90" height="90"
        style="width:90px;height:90px;background-color:#f26b21;color:#000000;
               font-family:Arial,Helvetica,sans-serif;font-size:36px;
               font-weight:bold;letter-spacing:0.02em;text-align:center;
               mso-line-height-rule:exactly;line-height:90px;
               border-radius:4px;">İY</td>
  </tr>
</table>
```

Notlar:
- `bgcolor` attribute'u **ve** `background-color` stili birlikte verilir —
  Word motoru CSS zeminini her zaman uygulamıyor.
- `border-radius` **sabit değil, şablonun kendi avatar yarıçapını aynalar.**
  Ölçüldü: beş şablon `4px`, `photo-first` `50%` kullanıyor. Sabit 4px
  verseydik `photo-first`'te yuvarlak fotoğrafın yanında kare monogram
  çıkardı. Bu yüzden `monogramCell()` yarıçapı PARAMETRE alır ve her şablon
  kendi avatarındaki değeri geçer. Outlook ikisini de yok sayar; yani
  monogram, o şablondaki avatarın bugünkü davranışını birebir tekrarlar.
- `letter-spacing` **em cinsinden** verilir (px değil): 40px'lik kutuda 1px
  belirgin, 120px'likte görünmez olurdu; `em` her boyutta aynı oranı tutar.
- `font-family` **imzanın kendi** `visuals.fontFamily` değeridir, sabit değil.
- Baş harfler `htmlEscape`'ten geçer (kullanıcı girdisi).

## Değişecek dosyalar

| dosya | ne |
|---|---|
| `packages/renderer/src/types.ts` | `layout.monogram?: 'auto' \| 'off'` |
| `packages/renderer/src/utils/color.ts` | `readableTextOn` düzeltilir (Karar 5) |
| `packages/renderer/src/utils/monogram.ts` | **yeni** — `initialsFrom()` + `monogramCell()` |
| `packages/renderer/src/templates/*.ts` (6 dosya) | avatar yuvasına monogram dalı |

**Kapsam dışı:** `apps/web` hiç değişmez. `'off'` anahtarının builder
arayüzü ayrı bir iştir (bkz. Açık sorular 1); o gelene kadar alan yalnız
kayıtlı JSON'da elle ayarlanabilir ve varsayılan `'auto'` herkese uygulanır.

## Test planı

Birim (`packages/renderer/test/`):
- `initialsFrom()` — yukarıdaki 7 satırlık tablonun tamamı, artı boş ad,
  yalnız boşluk, tek harf, Arapça/CJK ad.
- `readableTextOn()` — spec'teki 5 marka rengi için doğru seçim, ve
  **her seçimde kontrastın ≥ 4.5 olduğu**.
- Her şablon için: `avatarUrl` yokken monogram VAR, varken YOK,
  `monogram: 'off'` iken YOK.
- Guardrail: monogram çıktısında `<div>`, `<style>`, SVG, `position`,
  `flex` geçmemeli (mevcut `guardrails.test.ts` desenine eklenir). Bu dalı
  fixture bileşimine güvenerek DEĞİL, fotoğrafsız bir `SignatureData` ile
  açıkça çağırarak sabitle — mevcut fixture'ların avatarsız olması (bkz.
  `minimal`/`noLogo`) bir tesadüf, garanti değil; MODES döngüsünün fixture
  listesi değişirse bu kapsam sessizce daralabilir (final review'da
  `guardrails.test.ts`'teki bu blokta bulunan yanlış "fixture'larda hiç
  tetiklenmiyor" öncülü, bkz. o dosyadaki düzeltilmiş yorum).
- Regresyon: bu spec'in çıkış noktası olan "fotoğrafsızken sıfır görsel"
  ölçümü, monogramdan SONRA da `<img>` sayısını 0 gösterir — çünkü monogram
  bilerek görsel değil. Testin ölçeceği şey `<img>` sayısı DEĞİL, fotoğrafsız
  çıktıda `bgcolor` taşıyan bir monogram hücresinin varlığıdır.

6-istemci matrisi (YAYIN ŞARTI, CLAUDE.md):
- Monogram, altı şablonda ve üç boyutta Outlook Classic'te **kare, ortalanmış
  ve tam boyutta** mı.
- `photo-first`'te 120px'lik renk bloğu kabul edilebilir görünüyor mu
  (en riskli vaka, ilk bakılacak yer).
- Görsel engelli Outlook'ta monogram görünüyor mu — **bu özelliğin varlık
  sebebi, ayrıca doğrulanır.**

## Açık sorular (bu spec'in kapsamı dışında)

1. **Builder arayüzü.** `monogram: 'off'` anahtarını kullanıcı nereden
   görecek? Renderer tarafı bu spec'te; panel tarafı ayrı iş.
2. **Yuvarlak avatar.** HTML'de Outlook yüzünden güvenilmez, PNG'ye geçmek
   Karar 1'in gerekçesini bozar. Ayrı iş olarak durur.
3. **Test borcu.** `divider-columns`, `photo-first`, `cta-banner` 6-istemci
   matrisinden hiç geçmedi. Monogram bu üçünü de etkiliyor; matris koşulurken
   ikisi birlikte kapatılabilir.
