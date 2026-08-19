# Pazarlama sitesi üreticileri

Pazarlama sitesi (`~/Desktop/mailmyra ham`) git altında **değil** — statik tema
klasörü. Bu dizin, o klasörde üretilen sayfaların **kaynağını** repoda tutar ki
üretici script'ler kaybolmasın.

## `build-faq-page.py` — `/faq` sayfası

```bash
python3 scripts/marketing-site/build-faq-page.py
```

`works-with.html`'i satır aralığı + assert ile dilimleyip `faq.html` üretir:

- `head = 1..622` — head + header + hero + `.pp-top-wrap` kapanışı
- `tail = 1128..son` — `</main>` + footer + ortak scriptler

Aradaki içerik (6 kategori, 29 soru), sayfa sürücüsü ve FAQPage JSON-LD
script tarafından yazılır. **Sorunun metnini `faq.html` içinde elle düzenleme**
— `CATEGORIES` sabitini düzenleyip script'i yeniden koştur.

`works-with.html` değişirse assert'ler patlar (satır sayısı ve iki sınır satırı
kontrol ediliyor). Patladığında sınırları yeniden bul, sabitleri güncelle.

## ⚠️ ÖNCE BUNU OKU — pricing sayfası artık ELLE düzenleniyor

`build-pricing-page.py`'ı **koşma.** Sayfayı jeneratörle kurmuştuk; Hüseyin
sonra **kendi kurdu** (kendi sekmeleri, kendi 3B görselleri, kendi intro CSS'i).
Jeneratör onunkini baştan yazar. Script tarih olarak duruyor, çalıştırma.

`main.css` de **baştan üretilmez, yalnız sonuna eklenir** — Hüseyin aynı
dosyaya paralel yazıyor, yeniden üretmek onun CSS'ini siler.

Canlı durumun kopyaları:
- `pricing.html.snapshot` — sayfanın o günkü hâli (ham klasörü git altında değil)
- `pricing-blocks.css` — `main.css`'in sonundaki el yazısı blok (tema
  dosyasının tamamı commit'lenmiyor, değerli olan bu kuyruk)

## `build-pricing-page.py` — `/pricing` sayfası (ARŞİV, koşma)

```bash
python3 scripts/marketing-site/build-pricing-page.py
```

Aynı kabuk dilimleme yöntemi. **Fiyatla ilgili her sayı bu dosyanın başındaki
sabitlerden gelir** — `pricing.html`'e elle rakam yazma:

```python
PRICE_PER_SEAT_YEAR_CENTS = 100   # $1
MIN_SEATS = 1 ; MAX_SEATS_UI = 1000 ; CONTACT_ABOVE = 500 ; TRIAL_DAYS = 7
LAUNCH_OFFER = {"active": False, "seats": 10, ...}
```

Script bu sabitleri **iki yere birden** yazar: HTML'e (JS kapalıyken de fiyat
görünsün — SEO ve erişilebilirlik için şart) ve sayfa sonundaki `MM_PRICING`
objesine (hesaplayıcı oradan okur). `LAUNCH_OFFER["active"] = True` yapınca
kampanya kutusu HTML'e eklenir; `False` iken hiç yazılmaz.

## ⚠️ KAYNAK KLASÖR DEĞİŞTİ — `~/Desktop/mailmyra edit`

Yayına girecek site artık `~/Desktop/mailmyra ham` DEĞİL, **`~/Desktop/mailmyra
edit`** (Hüseyin temizledi, 2026-08-14). Fark büyük: ham klasörde 191 HTML'in
153'ü Agntix demo sayfasıydı ve `index.html` temanın kendi anasayfasıydı;
edit klasöründe 30 gerçek sayfa var ve `index.html` Mailmyra'nın anasayfası.
251MB → 41MB.

**Bu dizindeki snapshot'lar artık `edit` klasörünü izliyor.** Bir düzeltme
yaparken önce hangi klasörde olduğunu doğrula — 2026-08-18'de metin turu
yanlışlıkla `ham`a yapıldı ve `edit`e taşınması gerekti.

`edit` klasörü de git altında DEĞİL. Tek geri dönüş noktası bu snapshot'lar.

## ✅ YAYINDA — 2026-08-18

`mailmyra.com` ilk kez yayına alındı. 30 sayfa, uzantısız adresler, bütün
sayfalar 200.

**Sunucu düzeni (Plesk):** alan adının belge kökü **`/site`**, Node.js
**devre dışı**. Monorepo hâlâ `/httpdocs`'ta duruyor ama belge kökünün
DIŞINDA — `CLAUDE.md` ve `docs/` erişilemiyor (doğrulandı). Eski Next
derlemesi `/httpdocs/apps/web`'de ölü hâlde duruyor; silinmedi.
⚠️ **`.env.deploy`'daki `DEPLOY_FTP_REMOTE` bu yüzden değişti** →
`/app.mailmyra.com/apps/web`. Panel oraya deploy edilir; `/httpdocs/apps/web`
artık hiçbir şey servis etmiyor.

**`web.config` — kopyası burada: `site-web.config`.** Plesk'in kendi
ürettiği dosyanın (hata sayfaları + temp dizini) içine rewrite kurallarımız
eklendi; üstüne YAZILMADI. ⚠️ Plesk bazı panel işlemlerinde bu dosyayı
yeniden üretir ve blok silinir — site uzantısız adreslerde aniden 404
vermeye başlarsa ilk bakılacak yer orasıdır.

⚠️ **CANLIDA ÖĞRENİLDİ: `{REQUEST_FILENAME}` uzantısız adreste BOŞ dönüyor.**
İlk denemede `/pricing.html` 301 veriyor ama `/pricing` 404 kalıyordu —
yani yönlendirme boşluğa çıkıyordu, hiç kural olmamasından kötü.
`{DOCUMENT_ROOT}/{R:1}.html` ile çözüldü.

**Kurulum rehberleri `noindex, follow` ile açıldı** — 30 karenin 26'sı hâlâ
yer tutucu ve boş kutuların indekslenmesi istenmiyor. Kareler yerleşince
5 rehberdeki `<meta name="robots">` satırı SİLİNECEK; hub (`/setup`)
indekslenebilir bırakıldı, onda yer tutucu yok.

**Sayfa içi 2386 link temiz adrese çevrildi** (`clean-urls.mjs`), geriye
`.html` link kalmadı.

## Yayına alma sırası (ilk turda izlendi)

`mailmyra.com` hiç yayına alınmadı; şu an 404. Adresler **uzantısız**
olacak (`/pricing`), dosyalar diskte `.html` kalacak — çeviriyi site
kökündeki `web.config` yapıyor.

⚠️ **Sıra keyfi değil.** Plesk'te `system.webServer` altındaki bazı bölümler
kilitli; yanlış bir web.config sitenin tamamını 0 baytlık 500'e düşürür ve
**2026-07-27'de tam olarak bu sitede yaşandı**. Bu yüzden config İÇERİKTEN
ÖNCE ve TEK BAŞINA denenir. Site zaten 404 olduğu için başarısız denemenin
maliyeti yok — 404'ten 500'e döner, müşteri etkilenmez.

1. **Yalnız `web.config`i yükle.** Sonra `https://mailmyra.com/` iste:
   - `404` geliyorsa config yüklendi, devam et (içerik henüz yok).
   - `500` (gövdesi 0 bayt) geliyorsa **bölüm kilitli** — config'i geri al,
     temiz adresten vazgeç ve `.html` şemasıyla yayına gir
     (`menu-data.ts`teki adresleri `.html`e çevirmen gerekir).
2. **İçeriği yükle** (30 sayfa + `assets/`). `scripts/` ve `.DS_Store`
   GİRMEZ — jeneratörler ve macOS çöpü sunucuda işe yaramaz.
3. **`/pricing` 200 mü, `/pricing.html` 301 mi** kontrol et. İkisi de
   doğruysa şema çalışıyor demektir.
4. **`clean-urls.mjs`i koştur** — sayfa içi 2386 linki temiz adrese çevirir.
   **3. adımdan önce koşturma**: `.html` linkler her iki senaryoda da
   çalışır, temiz adres yalnız config yüklüyse çalışır.
5. İçeriği tekrar yükle (linkler değişti).

**Panel tarafı ayrı deploy ister.** `apps/web/components/nav/menu-data.ts`
artık pazarlama sayfalarına **mutlak** adres veriyor (`https://mailmyra.com/…`)
— önceden göreliydi ve `app.mailmyra.com/pricing`'e gidip 404 oluyordu.
Üç ad dosyayla birebir değil: **For agencies → `solutions-agencies`**,
**For companies → `solutions-teams`**, **Setup guides → `setup`**.

**Kurulum rehberleri hakkında karar:** 30 karenin 26'sı hâlâ yer tutucu.
Rehberler yayına bu hâlde girerse arama motoru onları boş kutularla
indeksler. Seçenek: 5 istemci rehberine `noindex` koyup kareler gelince
kaldırmak (tek satır, lansmanı geciktirmez).

## Kurulum rehberleri — `setup*.html`

Jeneratör YOK; altı sayfayı (hub + 5 istemci) Hüseyin elle kurdu. Bu dizinde
iki şey duruyor:

- `setup-snapshots/*.html.snapshot` — 2026-08-18'deki hâlleri, metin turundan
  ÖNCE alındı. Ham klasör git altında olmadığı için tek geri dönüş noktası bu.
- `setup-screenshots.md` — 30 ekran görüntüsünün çekim listesi (hangi ekran,
  ne görünmeli, hangi imzayla).
- `shoot-builder.mjs` — rehberlerin "adım 01" karesini (builder, demo imzayla
  dolu, `Copy signature` görünür) çeker. **Bağımlılık kurmaz**: projede
  playwright/puppeteer yok ve 30 kare için 150MB tarayıcı indirmesi eklemek
  doğru değildi; sistem Chrome'u CDP üzerinden sürülüyor (Node 24'ün global
  `WebSocket`i yetiyor). `node shoot-builder.mjs <klasör>`.
  ⚠️ Çıkış yapmış builder'da düğme "Sign in to save" diyor; giriş yapılmış
  hâlini çekmek için tarayıcıda oturum açıp tekrar koştur.
- `clean-urls.mjs` — sayfa içi linkleri `pricing.html` → `/pricing` yapar
  (`--dry` kuru koşu, `--revert` geri alır). **web.config canlıda
  doğrulanmadan koşturma** — gerekçesi dosyanın başında.
- `place-shots.mjs` — `assets/img/setup/` klasörüne düşen kareleri sayfalara
  yerleştirir: `<figure data-shot="X.png">` → gerçek `<img>`. Eşleştirme
  tahmin değil, `data-shot` dosyayı zaten adlandırıyor. Olmayan kareyi
  ATLAR, o figure'a dokunmaz — kareler parça parça gelebilir, script tekrar
  koşulur. `width`/`height` PNG başlığından okunuyor (yoksa yüklenirken
  sayfa zıplar). `--dry` ile kuru koşu.

**2026-08-18 metin turu** (6 istemci testi geçtikten sonra, ürünle
karşılaştırarak): "Copy as HTML" → **"Copy signature"** (üründeki gerçek
düğme adı) · adım 01'e builder yolu eklendi (kopyala düğmeleri önizleme
diyaloğunda DEĞİL, builder'da) · Gmail sayfasının kahraman başlığı `PASTE`
idi → `GMAIL` · iOS adım 01 "builder'dan gönder" diyordu, **Mailmyra posta
göndermiyor** → bilgisayardan kopyala-yapıştır-yolla · Apple Mail koyu mod
tavsiyesi olmayan bir "guarded export" özelliğine işaret ediyordu → logonun
kendi dolgusunu taşıması önerisiyle değiştirildi.

**2026-08-18 ikinci tur** (`edit` klasöründe): ① metin turu `ham`dan taşındı
② `templates.html` başlığı `Mailmyra | Şablonlar` → `Templates` ③ kayıt
formu "8+ characters" diyordu, sunucu politikası **10** (`password.ts:137`)
— ikisi de 10'a çekildi ④ **206 HTML + 6 jeneratör linki** ölü
`builder.html`'den `https://app.mailmyra.com/builder`'a çevrildi
⑤ giriş/kayıt formları uygulamanın uçlarına post ediyor, hata şeridi eklendi
(`mm-auth__error`), "Forgot password?" gerçek sayfaya gidiyor, `name` →
`orgName`, gizli `termsVersion` ⑥ SSO düğmeleri ve "Keep me signed in"
kutusu **yorum içine alındı** (ürün karşılıkları yok — bkz. `docs/backlog.md`
§SSO) ⑦ builder'ın 4 karesi çekilip yerleştirildi, 26 kare bekliyor.

**Rapor edildi, DOKUNULMADI** (bölüm kararı Hüseyin'in): beş rehberin
kahraman görseli hâlâ tema demosu (`assets/img/about-me/about-me-thumb-1.png`)
· beş rehberde `mm-hiw-rail` var ve "Connect / Design / Roll out / Send"
diyor — bu how-it-works sayfasının adımları, kurulum akışıyla örtüşmüyor.

## `patch-mega-menu.py` — 13 sayfadaki menü metni

```bash
python3 scripts/marketing-site/patch-mega-menu.py          # kuru koşu
python3 scripts/marketing-site/patch-mega-menu.py --apply  # yaz
```

Mega-menü fiyat satırlarını değiştirir. Her kalıp her dosyada **tam 2 kez**
(masaüstü + mobil) geçmeli; sapma varsa o dosyaya dokunmadan durur — yarım
yama bırakmaz. Kaynakta `&mdash;` değil **gerçek em-dash** (U+2014) var.

## `faq.css` · `pricing.css`

`assets/css/main.css` **sonuna eklenen** blok (proje kuralı: yeni CSS dosyası
yok, inline `<style>` yok). Yeniden uygularken:

```bash
cat main.css.faq-oncesi-yedek \
    scripts/marketing-site/faq.css \
    scripts/marketing-site/pricing.css > assets/css/main.css
```

Her değişiklikten sonra HTML'deki `main.css?v=mailmyra-…` damgasını bump et
(script'teki `CSS_VER`), sunucu agresif önbellekliyor.

## Sayfanın üç teknik kararı

1. **`position: sticky` kullanılmıyor** — ScrollSmoother `#smooth-content`'i
   transform ettiği için bu temada çalışmıyor (ölçüldü). Sol ray ≥992px'te
   ScrollTrigger `pin` ile sabitleniyor.
2. **Akordeon `<details>`**, Bootstrap collapse değil. Bootstrap mobilde de
   yükleniyor ama iki `rAF` sonra async; o aralıkta dokunuşlar ölü.
   Açılış/kapanış Web Animations API ile sürülüyor (native `<details>`
   yüksekliği animate edilemez).
3. **FAQPage JSON-LD yalnız bu sayfada.** `how-it-works.html`'deki `.mm-faq`
   bölümü aynı soruların bir kısmını tekrarlıyor (bilinçli karar); şema oraya
   konmadı ki iki sayfa çakışmasın.
