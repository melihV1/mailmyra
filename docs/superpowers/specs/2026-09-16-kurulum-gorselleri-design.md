# Kurulum rehberi ekran görüntüleri — tasarım

**Tarih:** 2026-09-16 · **Karar veren:** Hüseyin
**Uygulama yeri:** ⚠️ Pazarlama sitesi deposu — `~/Desktop/mailmyra edit`
(remote `mailmyra-site`), bu depo DEĞİL.

> **Spec neden burada?** Site deposunda `docs/` yok ve orada deploy script'i de
> yok — yükleme elle/aynalama yapılıyor, yani oraya konan bir klasör halka açık
> sunucuya kopyalanabilir. Bütün spec'ler zaten burada; kayıt tek yerde kalsın.

## Durum

Beş kurulum rehberi (`setup-apple-mail`, `setup-gmail`, `setup-ios-mail`,
`setup-new-outlook`, `setup-outlook-classic`) her biri **6 ekran görüntüsü**
bekliyor: `*-step-01..05` + `*-result`. Toplam **30**.

Diskte 4 dosya var ve **dördü de birebir aynı** (sha256 `47aa8c36…`, 246017
bayt): builder'ın "Copy signature" ekranı, dört rehbere kopyalanmış. Geri
kalan 26 figür `hidden` — yani **canlıda kırık görsel yok**, daha önceki
"yer tutucuları gizle" kararıyla tutarlı.

Mevcut 4 dosya yer tutucu değil, gerçek ve iyi bir çekim — ama **bayat**:
üstünde EN/TR dil anahtarı yok, yani 2026-08-24 i18n çalışmasından önce
alınmış.

## Kapsam

**Bu spec yalnız Apple Mail rehberini kapsar — 6 görsel.** Biçim orada
otursun; kalan dört rehber (24 görsel) aynı kalıba göre ayrı bir turda
üretilir.

Gerekçe: 30 görselin yaklaşık %60'ı üçüncü parti istemci arayüzü ve
bunların bir kısmı yalnız Hüseyin'in makinesinden/telefonundan çekilebilir
(Outlook Classic → Windows sunucu, iOS Mail → telefon). Yanlış bir biçim
kararını 30 kez tekrarlamaktansa 6'da görüp düzeltmek ucuz.

### Kapsam dışı
- Diğer dört rehber.
- Rehber METİNLERİ — adım başlıkları ve açıklamalar değişmiyor.
- TR rehber sürümü. (Pazarlama sitesi İngilizce kalıyor, CLAUDE.md.)

---

## Karar 1 — Altı görselin içeriği

| Dosya | Ne gösterir | Vurgulanan kontrol |
|---|---|---|
| `apple-mail-step-01.png` | Mailmyra builder, dolu bir imza | "Copy signature" düğmesi |
| `apple-mail-step-02.png` | Mail > Ayarlar > İmzalar | İmzalar sekmesi |
| `apple-mail-step-03.png` | İmzalar panosu, hesap listesi | `+` düğmesi |
| `apple-mail-step-04.png` | İmza düzenleyici, yapıştırılmış imza | — |
| `apple-mail-step-05.png` | "İmza Seç" açılır menüsü | Açılır menü |
| `apple-mail-result.png` | Yeni ileti, altında imza | — |

Son iki sütundaki "—" bilinçli: `step-04` ve `result` bir SONUCU gösteriyor,
tıklanacak bir kontrolü değil; vurgu çerçevesi orada yanıltıcı olurdu.

**`step-01` YENİDEN ÇEKİLİR.** Mevcut dosya ürünün bugünkü hâlini
göstermiyor (dil anahtarı eksik).

## Karar 2 — Gerçek hesaplar çekilir, sonra ÜZERİ KAPATILIR

Mail'in imza ayarları hesap listesini gösteriyor; oradaki adresler gerçek
(`okutan1290@gmail.com`, `melih@voldi.net`, `mail@voldi.net`) ve bu görseller
halka açık bir sayfaya gidiyor.

Çekim gerçek Mail'den yapılır, sonra adresler **düz renk blokla** örtülür.

🔴 **Bulanıklaştırma KULLANILMAZ.** Bulanık metin, özellikle bilinen bir font
ve dar bir karakter kümesiyle, geri çözülebiliyor. Blok geri çözülemez.

Reddedilen alternatif: çekim için temiz bir demo hesabı kurmak. Görseller
daha temiz çıkardı ve mevcut kurgusal kimlikle (Alex Morgan / Northwind
Studio) birebir uyardı, ama hesap kurmak parola girmeyi gerektiriyor — bu
benim yapamayacağım bir şey.

## Karar 3 — Tek bir vurgu çerçevesi

Adımın bahsettiği **tek** kontrolün çevresine marka renginde, yuvarlak köşeli
bir çerçeve. **Ok yok, numara yok, görselin içinde metin yok.**

Metin olmaması bilinçli: rehber ileride Türkçeye çevrilirse görseller
DEĞİŞMEZ. Numaralı balonlar daha açıklayıcı olurdu ama bir sistem kurmayı
gerektirir (numara stili, yerleşim kuralları) ve her adım zaten tek bir iş
tarif ediyor.

## Karar 4 — Oran kuralı SİLİNMEZ, geçersiz kılınır

`.mm-sg-shot` şu an `aspect-ratio: 16 / 10` taşıyor ve mevcut çekim tam olarak
2880×1800 (1440×900'ün 2x'i). Ama Mail'in ayar penceresi 16:10 değil, iOS
ekranı ise dikey.

Hüseyin'in kararı: oran serbest bırakılsın. Uygulaması:

```css
/* main.css'in SONUNA */
.mm-sg-shot--img { aspect-ratio: auto; }
```

ve görsel taşıyan her `<figure>` `mm-sg-shot--img` sınıfını alır.

🔴 **`aspect-ratio` satırı YERİNDE SİLİNMEZ.** İki sebep:

1. O kural henüz görseli olmayan **yer tutucu kutularının** tek yükseklik
   kaynağı. Global olarak silmek, ileride bir yer tutucu yeniden görünür
   yapıldığında onu yüksekliksiz bırakır.
2. Bu temada `main.css` baştan üretilmez, **yalnız sonuna eklenir**. Dosyanın
   son bloğu zaten tam olarak bu desende: gerekçesi yorumda yazılı bir
   geçersiz kılma (`.mm-soon-inline`). Satır numarası bilerek yazılmadı —
   85 bin satırlık bir dosyada çürür; sınıf adıyla ara.

Reddedilen alternatif: `.mm-sg-shot:has(img)`. Modifier sınıfı kadar iş ve
yeni bir CSS özelliğine bağımlılık getiriyor; figürü zaten düzenliyoruz.

## Karar 5 — Üretim hattı

1. **Yakala** — `screencapture -o -l<windowID>`; pencere kimliği
   `app_list_windows`'tan gelir. `-o` gölgeyi atar, `-l` tek pencereyi alır:
   masaüstü kalabalığı ve duvar kâğıdı kadraja girmez, çözünürlük Retina kalır.
2. **Kapat** (Karar 2) · 3. **Vurgula** (Karar 3) · 4. **Yeniden kodla**, zlib 9.

Adım 2–4 tek bir **saf Python** modülünde: `pngquant`, `optipng` ve
ImageMagick bu makinede KURULU DEĞİL (ölçüldü), yeni bağımlılık da
kurulmayacak. PNG çözme/kodlama `zlib` + `struct` ile yapılır.

Modül site deposuna değil, **scratchpad'e** yazılır — üretim aracıdır,
sitenin yayın setine girmez.

## Karar 6 — HTML değişikliği

Her figür, mevcut `step-01` markup'ının birebir aynısı olur (artı modifier):

```html
<figure class="mm-sg-shot mm-sg-shot--img" data-shot="apple-mail-step-02.png"><img
  src="assets/img/setup/apple-mail-step-02.png"
  alt="<gerçekten görselde olan şey>"
  width="<W>" height="<H>" loading="lazy" decoding="async"></figure>
```

`hidden` kaldırılır, yer tutucu `<span>`'ler silinir. Mevcut `step-01`
figürü de modifier sınıfını alır.

🔴 **`alt` metni görselin GERÇEKTEN gösterdiği şeyi anlatır.** Bu sitenin
`scripts/audit.mjs`'i doğruluk kapısıdır ve bu depo bir kez "ürünün
yapmadığı şeyi iddia eden metin" yüzünden 7 sayfa temizledi.

---

## Doğrulama

- `node scripts/audit.mjs` → temiz. Dokuz kuralından ikisi doğrudan bu işe
  bakıyor: **`missing-assets`** (HTML'den referans verilen her dosya diskte
  var mı) ve **`claims`** (metin, ürünün yapmadığı bir şeyi iddia ediyor mu —
  `alt` metinleri de metindir).
- Altı görselin altısı da tarayıcıda yüklenir; `width`/`height` attribute'ları
  dosyanın GERÇEK boyutlarıyla eşleşir (yanlış oran, düzen zıplatır).
- Kapatılan bölgelerde okunabilir hiçbir adres kalmaz — görseli gözle denetle.
- Sayfa canlıda açılır ve altı görselin yan yana nasıl durduğu görülür.

## Riskler

- **Düzen zıplaması.** Oran serbestleşince altı görsel altı farklı yükseklikte
  olur. Tek rehberi önce bitirmemizin sebebi bu; canlıda görüp karar verilir.
- **Ağırlık.** Mevcut çekim 2880×1800'de 246KB; altı görsel ≈ 1.5MB. Görseller
  `loading="lazy"`. **Görsel başına 300KB tavan** konur ve ölçülür; aşılırsa o
  zaman konuşulur — şimdiden niceleyici yazmak YAGNI.
- **Ürün değişirse görsel bayatlar.** Mevcut `step-01` tam olarak böyle
  bayatladı. Bu turda çözülmüyor, ama `data-shot` attribute'u hangi dosyanın
  nereye ait olduğunu zaten söylüyor — ileride bir tazelik denetimi
  yazılabilir.
