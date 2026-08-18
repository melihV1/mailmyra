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

## Kurulum rehberleri — `setup*.html`

Jeneratör YOK; altı sayfayı (hub + 5 istemci) Hüseyin elle kurdu. Bu dizinde
iki şey duruyor:

- `setup-snapshots/*.html.snapshot` — 2026-08-18'deki hâlleri, metin turundan
  ÖNCE alındı. Ham klasör git altında olmadığı için tek geri dönüş noktası bu.
- `setup-screenshots.md` — 30 ekran görüntüsünün çekim listesi (hangi ekran,
  ne görünmeli, hangi imzayla).

**2026-08-18 metin turu** (6 istemci testi geçtikten sonra, ürünle
karşılaştırarak): "Copy as HTML" → **"Copy signature"** (üründeki gerçek
düğme adı) · adım 01'e builder yolu eklendi (kopyala düğmeleri önizleme
diyaloğunda DEĞİL, builder'da) · Gmail sayfasının kahraman başlığı `PASTE`
idi → `GMAIL` · iOS adım 01 "builder'dan gönder" diyordu, **Mailmyra posta
göndermiyor** → bilgisayardan kopyala-yapıştır-yolla · Apple Mail koyu mod
tavsiyesi olmayan bir "guarded export" özelliğine işaret ediyordu → logonun
kendi dolgusunu taşıması önerisiyle değiştirildi.

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
