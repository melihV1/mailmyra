# FAQ sayfası — tasarım kararı

Tarih: 2026-08-07 · Karar sahibi: Hüseyin · Yazan: Claude

## Amaç

Pazarlama sitesine `/faq` sayfası eklemek. İki iş yapar: satış itirazlarını
karşılar (plan, koltuk, gizlilik) ve destek yükünü düşürür (Outlook, export,
kurulum). İkincisi aynı zamanda en çok aranan SEO içeriği — 5 kurulum
rehberine iç link verir.

## Rakip taraması (2026-08-07)

| Marka | Yapı |
|---|---|
| Newoldstamp | Pazarlama sitesinde `/faq`: **12 soru, tek düz akordeon**, arama yok, kategori yok. Araya "contact us" serpiştirilmiş. |
| WiseStamp | Pazarlama sitesinde FAQ **yok**. Her şey ayrı Intercom yardım merkezinde, koleksiyonlara bölünmüş. |
| Exclaimer | Aynı desen — FAQ'lar Zendesk bilgi bankasında kategori kategori (Getting started · Purchase/Billing · Signature Rules). |

Genel SaaS pratiği: arama/filtre **50+ soruda** kendini amorti ediyor; altında
kategori + akordeon yetiyor. Ortak nokta: sayfa sonunda destek çıkışı.

**Bizim konumumuz:** ~28 soru — filtrenin gerektiği eşiğin altında ama düz
listenin rahat okunduğu eşiğin üstünde. Bu yüzden ortası seçildi.

## Seçilen yapı

**Kategori rayı + canlı arama.** Tüm sorular her zaman sayfada; arama
yerinde filtreliyor, hiçbir şey varsayılan olarak gizli değil.

Reddedilen alternatifler:
- **Sekmeli filtre** (templates galerisinin 5 çipli mekaniği): sorular
  varsayılan gizli → derin link zor, tarayıcı içi arama çalışmıyor.
- **Düz tek akordeon** (Newoldstamp yolu): 28 soruda okunmaz duvar.

## Sayfa

- **Dosya:** `faq.html` → `/faq`. Header ve footer zaten `faq.html`'e link
  veriyor. Temanın `faq-light.html`'i **kullanılmıyor** (hero'su bizim
  hero'muz değil; FAQ bileşeni zaten `app-faq-area`, onu how-it-works'te
  `.mm-faq` olarak kullandık).
- **Kabuk:** `works-with.html`'den satır aralığı + assert ile dilinir.
  Head+header+hero = 1..622 (`.pp-top-wrap` kapanışı dahil),
  `</main>`+footer+scriptler = 1128..son.
- Hero/header/footer/preloader **değişmez** (Hüseyin kuralı). Değişenler:
  `<title>`, `<meta description>`, hero başlığı (`WORKS WITH` → `FAQ`,
  masaüstü h4 + 5 mobil swiper slaytı), kicker, lead, CTA etiketi,
  hero rayının 4 etiketi, `main.css?v=` damgası.

### Yerleşim

```
≥992px                       <992px
┌──────┬────────────────┐    ┌──────────────┐
│ ray  │ 01 Basics      │    │ arama        │
│ pin  │ 02 Compat…     │    │ çip şeridi   │
│      │ …              │    │ 01 Basics…   │
└──────┴────────────────┘    └──────────────┘
```

- **Sol ray** (`col-lg-4`): arama kutusu + 6 kategori bağlantısı, her
  birinde soru sayacı. Kaydırdıkça aktif kategori yanar
  (IntersectionObserver).
- **Sağ** (`col-lg-8`): 6 `<section>`, her biri kategori başlığı +
  `<details>` listesi.
- **<992px:** ray yatay çip şeridine döner, arama kutusu üstte kalır.

### Arama

Yerinde filtre: eşleşmeyen `<details>` gizlenir, boşalan kategori başlığı
gizlenir, ray sayaçları düşer. 0 sonuçta kurulum rehberleri + iletişim
öneren blok çıkar.

### Kapanış

"Cevabını bulamadın mı" bloğu — iletişim + 5 kurulum rehberi linki.
Bu sayfada `.mm-cta` (builder'a götüren) **yok**; FAQ sonunda destek
çıkışı daha doğru.

## İçerik — 6 kategori, 28 soru

| # | Kategori | Soru | Not |
|---|---|---|---|
| 01 | Basics | 5 | Ne yapar · kimin için · HTML gerekir mi · ne kadar sürer · üye olmadan denenir mi |
| 02 | Compatibility | 6 | Hangi istemciler · Outlook neden bozar · dark mode · alıcıda neden farklı · mobil · görseller görünmüyor. `works-with`'e link |
| 03 | Templates & design | 5 | Kaç şablon · kendi fontum · logo/avatar boyutu · sosyal ikonlar · banner. `templates`'e link |
| 04 | Export & install | 4 | Nasıl kopyalarım · `.htm` ne işe yarar · Outlook'a kurulum · ekibe dağıtım. 5 kurulum sayfasına link |
| 05 | Teams, plans & billing | 5 | Koltuk nedir · minimum koltuk · ücretsiz plan · ajans · ödeme |
| 06 | Data & privacy | 4 | Veriler nerede · görseller nerede barınıyor · takip var mı · hesap silme |

### İçerik kısıtları (pazarlıksız)

- **"Test edildi / verified / doğrulandı" YAZILMAZ.** 6 istemci test matrisi
  henüz koşulmadı.
- Uydurma istatistik, sahte sosyal kanıt, sahip olmadığımız özellik yok.
- **Fiyat: model evet, rakam hayır.** "Koltuk başına ücretlendiriyoruz,
  Team minimum 5 koltuk, ekip büyüdükçe koltuk fiyatı düşüyor, ücretsiz plan
  yok — önizleme herkese açık, hesap yalnız export için." $ rakamı yok.
  Gerekçe: fiyat sayfası henüz yok; rakam iki yere yazılırsa biri bayatlar.
  (Hüseyin: "sonra bakacağız ona".)
- **Directory sync / eklenti / takip sorularının cevabı "hayır"** —
  `features.html`'deki `.mm-skip` bölümü zaten böyle diyor
  (No tracking · Nothing to install · No directory sync). FAQ onunla
  hizalanır.
- `privacy.html` ve `kvkk.html` **yok** → 06'daki linkler şimdilik
  `contact.html`'e gider.

## Teknik kararlar

1. **Bölüm sınıfı `.mm-qa`.** `main.css`'te 0 eşleşme (grep'lendi).
   `.mm-faq` DOLU — how-it-works kullanıyor.
2. **`position: sticky` KULLANILMAZ — bu temada çalışmıyor.** ScrollSmoother
   `#smooth-content`'i transform ediyor; ölçüldü (2026-08-07, `/works-with`,
   1213px): 100px'te sabitlenmesi gereken sonda içerikle birlikte kaydı
   (10295px → 2587px). Sol ray **ScrollTrigger `pin`** ile sabitlenir,
   yalnız ≥992px. Altında ray zaten yatay şerit.
3. **Akordeon `<details>/<summary>`, Bootstrap collapse değil.** Bootstrap
   mobilde de yükleniyor ama iki `rAF` sonra async — o aralıkta dokunuşlar
   ölü. `<details>` JS'siz anında çalışır, klavye/ekran okuyucu native.
   *(Bu, hafızadaki "bootstrap mobilde hiç yüklenmiyor" notunu düzeltir:
   yükleniyor, geç yükleniyor.)*
4. **FAQPage JSON-LD yalnız `/faq`'ta.** how-it-works'teki `.mm-faq` aynen
   kalıyor (Hüseyin kararı, metin tekrarı biliniyor) ama şema oraya
   konmayacak ki iki sayfa çakışmasın.
5. Her sorunun `id`'si olur → `/faq#outlook-neden-bozar` derin link.
6. **CSS yalnız `assets/css/main.css` sonuna**, yeni dosya yok, inline
   `<style>` yok. Bitince `?v=mailmyra-0807-N` bump.
7. Sayfa JS'i (arama + ray + pin) sayfa sonunda inline — how-it-works ve
   works-with'te yerleşik desen.
8. Tema `.agntix-dark` metinleri beyaz yapıyor → `.agntix-dark .mm-qa …`
   ile ezilecek.
9. Font Awesome **altküme** — yeni ikon seçmeden
   `grep -o 'fa-[a-z]* fa-[a-z0-9-]*' index-it-solution-dark.html` havuzuna
   bakılacak.

## Görsel dil (kilitli reçete)

- Zemin: kâğıt (`.mm-lz-paper` gradyanları) — uzun okuma sayfası.
- Kart: nötr sıcak yüzey `#fffefb → #fbf6ef` + sabit lacivert hairline
  `inset 0 0 0 1px rgba(0,16,43,.11)`; **açık** `<details>`te üstüne dönen
  conic kenar (`edring`, mavi `#89b4ef` → şeftali).
- Çipler = index hero pill'i (koyu lacivert cam, 10.5px ClashDisplay-Medium).
- Açık zeminde şeftali **`#c96a2e`** (`#f2a573` krem üstünde 1.76:1).
- Renkli glow kartların içinde yok — renk yalnız ikon/kenarda.

## Doğrulama

- 1440 · 1199 · 992 · 768 · 390'da yatay taşma 0.
- Konsol temiz.
- `<details>` JS kapalıyken de açılıp kapanıyor.
- Arama: eşleşme, boş kategori gizleme, sayaç, 0 sonuç bloğu.
- Ray pin'i ≥992px'te tutuyor, altında şerit.
- Klavye: Tab ile her soruya ulaşılıyor, Enter/Space açıyor.

## Açık kalanlar

- Fiyat rakamları — fiyat sayfası yazılınca FAQ'a link eklenecek.
- `privacy.html` / `kvkk.html` gelince 06'daki linkler oraya çevrilecek.
- how-it-works'teki 6 soru ile metin tekrarı bilinçli kabul edildi.
