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

## `faq.css`

`assets/css/main.css` **sonuna eklenen** blok (proje kuralı: yeni CSS dosyası
yok, inline `<style>` yok). Yeniden uygularken:

```bash
cat main.css.faq-oncesi-yedek scripts/marketing-site/faq.css > assets/css/main.css
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
