# Mailmyra — Tasarım Sistemi

Bu belge, pazarlama sitesi (landing + halka açık sayfalar) için tasarım dilini
tanımlar. **Kaynak `apps/web/app/tokens.css`'i ve `packages/renderer/src/brand.ts`'i
genişletir, çelişmez.** Yeni bir token önerildiğinde mevcut isimlendirme
kalıbı (`--dark-*`, `--brand-*`, `--step-*`, `--space-*`) korunur.

E-posta imzası HTML'i bu belgenin kapsamı DIŞINDADIR — o motorun kısıtları
`CLAUDE.md §E-posta HTML Kısıtları`'nda ayrı ve daha katıdır (table-based,
inline stil, web-safe font, CSS değişkeni yok). Burada anlatılan her şey
yalnız **site arayüzü** (Next.js + CSS) içindir.

---

## 0. Rakip Araştırması — Neyi Alıyoruz, Neyi Bilerek Reddediyoruz

5 site incelendi: bir referans (koyu tema/glow hissi için) ve dört doğrudan
rakip (imza yönetimi pazarı için).

### Referans — ai-agency-op-tailwind (Optim AI şablonu)

Katmanlı radyal degrade + parıltı + doku birleşimi, kart/buton dilinde
tutarlılık, üretim bolluğu (30+ entegrasyon logosu, 9 testimonial, takım
kartları) ile "kanıt yoğunluğu" hissi veriyor. **Aldığımız:** koyu zeminde
çok katmanlı radial-gradient + doku tarifi (zaten `home.module.css`'te bu
yönde başlamışız — bu belge onu resmileştiriyor). **Bilerek almadığımız:**
15+ linkli mega-menü ve 14 slaytlık özellik carousel'i — bunlar geniş, çok
ürünlü bir ajans kataloğu için mantıklı; Mailmyra'nın tek ürünü ve 10
sayfalık site haritası var, aynı yoğunluk gereksiz karmaşıklık üretir.

### Exclaimer — kurumsal/IT lideri

**Güçlü:** sertifika yoğunluğu (SOC 2, ISO 27001/27018, HIPAA, GDPR), somut
rakamlar ("9 milyon hesap", "80.000+ müşteri"), 4 farklı inceleme
platformunda puan. **Zayıf — ve bizim ders çıkardığımız yer:** sayfada 8'den
fazla "Ücretsiz Dene" butonu ve IT/Marketing/Sales/CS/HR için 5 ayrı sekme —
karar felci yaratıyor. **Aldığımız:** sertifika + rakam kanıtı prensibi
(bizde henüz rakam yok, ama "6 istemci test matrisi", "koltuk başına şeffaf
fiyat" gibi *doğrulanabilir* iddialar aynı işlevi görür — bkz.
`home.content.ts`'teki mevcut `trustItems` deseni, uydurma sayı içermiyor).
**Reddettiğimiz:** çoklu CTA + çoklu persona sekmesi. Header planımızda tek
bir CTA ve en fazla 2 seviyeli tek bir dropdown var (bkz. §3.3).

### WiseStamp — segment bazlı satış

**Güçlü:** "Marketing'in sevdiği, IT'nin güvendiği" gibi iki tarafı aynı
cümlede bağlayan konumlandırma; rol bazlı erişim anlatısı. **Zayıf:**
6 sekmeli rol bölümü somut örnek vermiyor, "sekmenizi seçin" diyor ama neyin
kilitli/açık olduğunu göstermiyor — soyut kalıyor. **Aldığımız:** ajans VE
kurumsal ekseni tek cümlede birleştirme fikri (Mailmyra'da zaten "Ajanslar
için" / "Kurumsal için" ayrı sayfalar var — WiseStamp'ın yaptığı gibi ayrı
sekmelerde eritmek yerine ayrı SAYFA yapmak, karar felcini baştan önlüyor).
**Reddettiğimiz:** dizin senkronizasyonu (Google Workspace/Entra ID) vaadi —
`CLAUDE.md §YAPILMAYACAKLAR` bunu açıkça yasaklıyor; sayfa metninde bu
özellik ASLA ima edilmeyecek.

### MySignature — özellik zenginliği, fiyat şeffaflığı yok

**Zayıf (ders):** "Ücretsiz" vurgusu tekrar tekrar geçiyor ama gerçek fiyat
hiçbir yerde yok — ziyaretçi ayrı sayfaya gitmek zorunda, güven kırılıyor.
**Aldığımız:** Mailmyra'nın tam tersini yapması gerektiği netleşti —
Fiyatlandırma sayfasında koltuk fiyatları TABLO olarak, ilk ekranda, saklama
olmadan gösterilecek (`CLAUDE.md`'deki fiyat tablosu zaten net — sayfa
planında bunu birebir yansıtıyoruz). Analitik/takip/banner kampanya
özellikleri listeleri (MySignature'da var) — **bilerek almıyoruz**,
`CLAUDE.md §YAPILMAYACAKLAR`'da "imza analitiği, tıklama takibi, banner
kampanyaları" açıkça yasak.

### CodeTwo — kurumsal güven, sıfır insan hikayesi

**Güçlü:** rakam yoğunluğu ("2.3 milyar+ imza/ay", "%99 memnuniyet"),
Microsoft ortaklık rozetleri. **Zayıf (ders):** hiç müşteri alıntısı yok,
sadece logo ve rozet — "somut sonuç" anlatısı eksik, tamamen özellik
listesi + rozet yığını. **Aldığımız:** rozet/sertifika kanıtı önemli ama
**tek başına yetmez** — Kurumsal sayfa planımızda en az bir isimlendirilmiş
kullanım senaryosu/alıntı alanı MVP'de yer alıyor (gerçek müşteri
geldikçe doldurulur, boşsa bölüm gizlenir — uydurma testimonial yazılmaz).

**Genel sonuç — 3 karar bu araştırmadan doğrudan etkilendi:**
1. Header **basit** kalacak, mega-menü değil (§3.3 gerekçesi).
2. Fiyatlandırma **ilk ekranda, saklamadan, tablo halinde** gösterilecek —
   dört rakibin dördü de bunu farklı derecelerde gizliyor, biz gizlemiyoruz.
3. Kurumsal/Ajans sayfalarında dizin senkronizasyonu, analitik, transport
   rule gibi `CLAUDE.md`'de yasaklı özellikler **asla ima edilmeyecek** —
   rakiplerin vitrin özelliği olan şeyler bizim kapsamımızda yok, metin
   bunun etrafından dolanmayacak, sessizce atlanacak.

---

## 1. Renk Skalası

Tüm değerler `packages/renderer/src/brand.ts`'teki üç kilitli renkten
(`#2f66c8`, `#7b9fd3`, `#e0a66c`) türetildi — `color-mix(in srgb, X Y%,
white|black)` mantığıyla, tokens.css'in zaten kullandığı `color-mix()`
yaklaşımıyla tutarlı. Hiçbir yeni ana renk icat edilmedi.

**Kontrast ölçüm yöntemi:** WCAG 2.1 göreli parlaklık formülü, sRGB.
Aşağıdaki her oran gerçek hesaplamadır (bkz. `brand.ts`'teki mevcut
2.71/5.45/8.11 ölçümleriyle aynı yöntem). **Kural: beyaz metin taşıyan her
yüzey ≥4.5 olmalı** — bu proje bir kere `#7b9fd3`'ün beyazla 2.71 verdiğini
gözden kaçırıp CTA'da kullanmıştı (bkz. `brand.ts` yorumu); bu belge o
hatanın tekrarını önlemek için her rengin yanına ölçümü yazıyor.

### 1.1 Marka çekirdeği (kilitli, değiştirilemez)

| Token | Hex | Beyaza karşı | `#0a0e1a`'ya karşı | Kullanım |
|---|---|---|---|---|
| `--brand-strong` | `#2f66c8` | **5.45** ✅ AA | 3.54 (yalnız büyük metin/ikon) | Buton zemini, link, imza CTA'sı — beyaz metin taşıyan HER yerde budur |
| `--brand-light` | `#7b9fd3` | 2.71 ❌ | **7.10** ✅ | Yalnız koyu zeminde vurgu; buton zemini OLARAK KULLANILMAZ |
| `--brand-accent` | `#e0a66c` | 2.13 ❌ | **9.02** ✅ | Turuncu vurgu; koyu zeminde metin/ikon, açık zeminde yalnız dekoratif |

### 1.2 Mavi skala (`--blue-100`…`--blue-900`)

`--blue-500` = `--brand-light`, `--blue-600` = `--brand-strong`. Yani CTA
mavisi rastgele bir renk değil, kimlik mavisinin skalada **bir sonraki
koyu adımı** — iki mavi arasındaki ilişki bu belgeyle görünür kılınıyor.

| Token | Hex | Türetim | Beyaza karşı | Koyuya karşı (`#0a0e1a`) | Not |
|---|---|---|---|---|---|
| `--blue-100` | `#ebf1f8` | light + %85 beyaz | 1.14 | 16.94 | Açık zeminde en soluk arka plan (ör. bilgi kutusu dolgusu) |
| `--blue-200` | `#d7e2f2` | light + %70 beyaz | 1.31 | 14.72 | Açık zeminde hover dolgusu |
| `--blue-300` | `#bdcfe9` | light + %50 beyaz | 1.58 | 12.16 | Açık zeminde border/ayraç |
| `--blue-400` | `#8fadda` | light + %15 beyaz | 2.29 | 8.40 | Dekoratif, metin taşımaz |
| `--blue-500` | `#7b9fd3` | = brand-light | 2.71 ❌ | 7.10 ✅ | Koyu zemin vurgu metni/ikon (mevcut kullanım) |
| `--blue-600` | `#2f66c8` | = brand-strong | **5.45** ✅ | 3.54 | Buton zemini, link — her iki temada da güvenli varsayılan |
| `--blue-700` | `#566f94` | light + %30 siyah | **5.13** ✅ | 4.10 | Açık zeminde koyu link/ikon alternatifi |
| `--blue-800` | `#3e506a` | light + %50 siyah | **8.20** ✅ | 2.56 | Açık zeminde en koyu metin-mavisi |
| `--blue-900` | `#25303f` | light + %70 siyah | **13.35** ✅ | 1.57 | Koyu panel zemini (dark-surface'e yakın, panel-üstü-panel için) |

### 1.3 Turuncu skala (`--accent-100`…`--accent-800`)

`--accent-500` = `--brand-accent`. Turuncu **koyu zeminde metin/ikon
rengi** olarak güvenli (9.02); açık zeminde yalnız `--accent-700` ve
`--accent-800` normal metin için yeterli kontrast verir — bu yüzden açık
temada (builder) turuncu asla düz metin rengi olarak kullanılmaz, yalnız
nokta/rozet/ikon gibi küçük dekoratif vurgularda geçer (WCAG "non-text
contrast" 3:1 eşiği yeterlidir).

| Token | Hex | Türetim | Beyaza karşı | Koyuya karşı (`#0a0e1a`) | Not |
|---|---|---|---|---|---|
| `--accent-100` | `#faf2e9` | accent + %85 beyaz | 1.11 | 17.37 | Açık zeminde soluk dolgu |
| `--accent-200` | `#f6e4d3` | accent + %70 beyaz | 1.24 | 15.55 | Açık zeminde hover dolgusu |
| `--accent-300` | `#f0d2b6` | accent + %50 beyaz | 1.44 | 13.39 | Açık zeminde border |
| `--accent-400` | `#e5b382` | accent + %15 beyaz | 1.89 | 10.18 | Dekoratif |
| `--accent-500` | `#e0a66c` | = brand-accent | 2.13 ❌ | **9.02** ✅ | Koyu zemin vurgu metni/ikon (mevcut kullanım) |
| `--accent-600` | `#be8d5c` | accent + %15 siyah | 2.94 ❌ | 6.56 | Yalnız dekoratif/ikon |
| `--accent-700` | `#9d744c` | accent + %30 siyah | 4.17 (yalnız büyük metin/UI 3:1) | 4.62 | Açık zeminde büyük metin/ikon sınırı |
| `--accent-800` | `#705336` | accent + %50 siyah | **7.05** ✅ | 2.73 | Açık zeminde turuncu tonlu koyu metin gerekirse |

### 1.4 Nötrler — koyu yüzeyler (landing)

Mevcut `tokens.css` değerleri korunur, iki yeni token eklenir (`*-raised`,
`*-strong`, `*-faint`) — kart üstü kart ve devre dışı durumlar için.

| Token | Hex | Kaynak | Not |
|---|---|---|---|
| `--hero-bg-deep` | `#0a0e1a` | mevcut | En derin katman, hero'nun altı |
| `--dark-bg` | `#0d1b2e` | mevcut | Genel koyu zemin |
| `--dark-surface` | `#142438` | mevcut | Kart zemini |
| `--dark-surface-raised` *(yeni)* | `#223144` | surface + %6 beyaz | Kart içi kart / dropdown zemini — surface'ten görünür şekilde ayrışsın diye |
| `--dark-border` | `#1f3350` | mevcut | Standart ayraç |
| `--dark-border-strong` *(yeni)* | `#53637a` | border + %25 dark-text | Odak/aktif durum kenarlığı, form input border |
| `--dark-text` | `#eef3fa` | mevcut | Gövde metni — `#0a0e1a`'ya karşı **17.27** |
| `--dark-text-muted` | `#9db0c9` | mevcut | İkincil metin — `#0a0e1a`'ya karşı **8.70** |
| `--dark-text-faint` *(yeni)* | `#6b7c93` | muted + %35 dark-bg | Yalnız dekoratif/disabled metin — `#0d1b2e`'ye karşı 4.06, **gerçek içerik metni için kullanılmaz** |

### 1.5 Nötrler — açık yüzeyler (builder)

Mevcut değerler korunur, bir `--border-strong` eklenir.

| Token | Hex | Not |
|---|---|---|
| `--bg` | `#ffffff` | mevcut |
| `--surface` | `#f6f8fb` | mevcut |
| `--border` | `#dfe5ee` | mevcut |
| `--border-strong` *(yeni)* | `#b4b8bf` | Form input focus öncesi kenarlık, ayrılmış tablo satırı |
| `--text` | `#333333` | mevcut, beyaza karşı 12.63 |
| `--text-muted` | `#666666` | mevcut, beyaza karşı 5.74 |

### 1.6 Durum renkleri — "iki tonlu" ilkesi tüm durumlara uygulanır

`brand.ts`'teki iki-tonlu mavi çözümü (açık zeminde koyu ton, koyu zeminde
açık ton) burada **her durum rengine** genelleştirilir: her durumun bir
`-onlight` ve bir `-ondark` varyantı vardır, ikisi de kendi zemininde ≥4.5.

| Durum | `-onlight` (beyaz zemin) | Kontrast | `-ondark` (koyu zemin) | Kontrast |
|---|---|---|---|---|
| Başarı (success) | `#1c7a53` | **5.31** ✅ | `#3fbd85` | **8.10 / 7.28** ✅ |
| Uyarı (warning) | `#a8660f` | **4.59** ✅ | `--brand-accent` `#e0a66c` | **9.02 / 8.11** ✅ |
| Hata (danger) | `#b3352a` | **6.07** ✅ | `#e8685c` | **6.02 / 5.41** ✅ |
| Bilgi (info) | `--brand-strong` `#2f66c8` | **5.45** ✅ | `--brand-light` `#7b9fd3` | **7.10 / 6.38** ✅ |

Uygulama: form doğrulama mesajları builder'da (açık zemin) `-onlight`
kullanır; landing'de rozet/durum metni (koyu zemin) `-ondark` kullanır.
Bir bileşen asla iki temayı karıştırmaz.

### 1.7 Gölge/degrade rengi kuralı

- Koyu temada glow ve gölge renkleri **her zaman** `color-mix(in srgb, VAR
  ORAN%, transparent)` ile mevcut bir marka tokenından türetilir — asla
  literal `rgba()` icat edilmez (tek tarihi istisna `--shadow-card`, o da
  zaten `--dark-bg`'nin kendisinden). Bu, `--hero-glow-blue`,
  `--hero-glow-accent`, `--shadow-card-glow`, `--demo-card-edge`,
  `--pill-bg`, `--pill-border` desenini genelleştirir (bkz. §5).
- Açık temada (builder) glow/parıltı **kullanılmaz** — builder'ın işi
  imza önizlemesine odaklanmak, atmosfer değil. Açık temada yalnız
  `--shadow-card`'ın yumuşak versiyonu (bkz. §5.1) geçerlidir.

---

## 2. Tipografi

### 2.1 Mevcut envanter ve karar

Şu an `apps/web/public/fonts/`'ta yalnız **ClashDisplay Semibold (600)** ve
**ClashDisplay Medium (500)** var — Regular/body ağırlığı yok.
ClashDisplay bir *display* (başlık) fontu: geniş harf boşluğu, yüksek
kontrast, uzun paragraf metninde okunabilirliği düşük. Bu iki ağırlıkla
gövde metni yazmak hem tipografik olarak yanlış (display font gövdede
yorucu) hem de eksik (Regular ağırlığı hiç yok).

**Karar: gövde metni sistem fontu kalır, ClashDisplay yalnız başlık/etiket
rolünde genişler.** Gerekçe — `CLAUDE.md`'nin "Bootstrap/hazır tema
kullanma, kapsam şişmesi bu projenin 1 numaralı ölüm sebebi" ilkesiyle
aynı disiplin: üçüncü bir font ailesi indirmek (ör. Inter) ekstra ağırlık,
ekstra FOUT yönetimi ve marka kararı gerektirir; mevcut iki dosya zaten
başlık işini görüyor. `--font-body` tokenı bilerek `system-ui` ailesine
genişletilir (aşağıda) — Arial'den daha "yerel" görünür, sıfır ek yükleme
maliyeti, e-posta imzası motoruna dokunmaz (o zaten ayrı ve sabit web-safe
listesini kullanıyor, `WebSafeFont` tipi bu kararı etkilemiyor).

**LATER (owner onayı gerekir):** Site metni büyüdükçe (SSS, kurulum
rehberleri gibi uzun içerik sayfaları) sistem fontu yetersiz görünürse,
tek bir gövde ailesi (ör. self-hosted Inter, 2 ağırlık: Regular + Medium)
eklenmesi değerlendirilebilir. Şu an için **gerekli değil** — MVP kapsamı
dışında tutulur.

```css
/* Öneri — tokens.css'e eklenecek satır (mevcut --font-body'nin yerine) */
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
  system-ui, sans-serif;
--font-display: 'ClashDisplay', Arial, Helvetica, sans-serif; /* değişmiyor */
```

### 2.2 Ölçek ve ağırlık haritası

Mevcut `--step-*` tokenları korunur, iki yeni adım eklenir (`--step-h3`,
`--step-caption`) — bileşen listesindeki kart başlıkları ve mikro etiketler
için mevcut ölçekte boşluk vardı.

| Token | Değer | Font ailesi | Ağırlık | Kullanım |
|---|---|---|---|---|
| `--step-hero` | `clamp(2.5rem, 5vw, 4rem)` | display | 600 (Semibold) | Sayfa H1'i (yalnız her sayfada BİR tane) |
| `--step-h1` | `clamp(2rem, 3.5vw, 3rem)` | display | 600 | Bölüm başlığı (section heading) |
| `--step-h2` | `clamp(1.5rem, 2.5vw, 2rem)` | display | 500 (Medium) | Alt bölüm başlığı |
| `--step-h3` *(yeni)* | `1.25rem` | display | 500 | Kart başlığı (özellik kartı, fiyat kartı planı) |
| `--step-body` | `1rem` | body | 400 | Paragraf |
| `--step-small` | `0.875rem` | display | 500 | Etiket, buton metni, nav linki (mevcut kullanım) |
| `--step-caption` *(yeni)* | `0.75rem` | body | 400 | Dipnot, yasal metin, tarih |

`--leading-tight` (1.15) başlıklarda, `--leading-normal` (1.55) gövdede —
değişmiyor.

### 2.3 Kural: display font nerede durur

ClashDisplay yalnız **kısa dizilerde** kullanılır: başlıklar, nav linkleri,
buton metni, rozet/kicker etiketleri, fiyat kartı plan adı. Üç satırı aşan
hiçbir metin (paragraf, SSS cevabı, testimonial alıntısı, form etiketi
açıklaması) display fontla yazılmaz — bu ayrım mevcut `home.module.css`'te
zaten örtük olarak var (`.subtitle` body, `.title` display); bu belge
kuralı adlandırıyor.

---

## 3. Bileşenler

Her bileşen: amaç, varyantlar, durumlar, tükettiği tokenlar, erişilebilirlik notu.

### 3.1 Buton

**Amaç:** Birincil ve ikincil eylem çağrısı.

| Varyant | Zemin | Metin | Kenarlık | Kullanım |
|---|---|---|---|---|
| Primary | `--blue-600` (`--brand-strong`) | `#ffffff` (5.45 ✅) | yok | Sayfa başına en fazla 1-2 kez; ana dönüşüm eylemi |
| Secondary | şeffaf | `--blue-500` koyu zeminde / `--blue-600` açık zeminde | 1px `--pill-border` (koyu) veya `--border-strong` (açık) | İkincil eylem ("Örnek imzaya bak" gibi) |
| Ghost | şeffaf | tema metin rengi | yok, yalnız alt çizgi (link gibi) | Metin içi eylem, "daha fazla oku" |

**Durumlar:**
- `:hover` / `:focus-visible` — Primary: `opacity: 0.92` + `box-shadow: 0
  12px 30px -10px var(--hero-glow-accent)` (mevcut `.ctaPrimary` deseni,
  aynen genelleştirilir). Secondary/Ghost: kenarlık veya metin rengi tam
  tema rengine geçer (mevcut `.navCta:hover` deseni).
- `:active` — `transform: translateY(0)` (hover'daki `-2px` geri alınır),
  `opacity: 1`.
- `:disabled` — `opacity: 0.45`, `cursor: not-allowed`, hover/focus efekti
  yok, `pointer-events: none`.
- `:focus-visible` — TÜM varyantlarda `outline: 2px solid var(--blue-500)`
  (koyu zeminde) veya `var(--blue-600)` (açık zeminde) + `outline-offset:
  2px`. Yalnız box-shadow'a güvenilmez — klavye kullanıcıları için gerçek
  `outline` şart.

**Hareket:** `transform`/`box-shadow`/`opacity` geçişleri yalnız
`prefers-reduced-motion: no-preference` altında (mevcut `.ctaPrimary`
deseni — bkz. §5.4).

**Hit target:** Minimum `44×44px` dokunma alanı (mobil), mevcut
`padding: 14px 28px` bunu zaten karşılıyor.

### 3.2 Kart (genel)

**Amaç:** Özellik, fiyat planı, testimonial gibi gruplanmış içeriği
zeminden ayırmak.

- Koyu zeminde: `background: var(--dark-surface)`, `border: 1px solid
  var(--dark-border)`, `border-radius: var(--radius-lg)`, hover'da
  `border-color: var(--dark-border-strong)` + hafif `translateY(-2px)`.
- Açık zeminde (yalnız demo kartı gibi istisnai yerlerde): mevcut
  `.demoCard` deseni — `linear-gradient(180deg, var(--bg), var(--surface))`
  + `box-shadow: var(--shadow-card), var(--shadow-card-glow)`.
- Vurgulanmış kart (ör. önerilen fiyat planı): `border-color:
  var(--blue-500)` + üstte küçük rozet ("Önerilen"), zemin
  `--dark-surface-raised`.

**Erişilebilirlik:** Kart tamamen tıklanabilirse (`<a>` sarmalıyorsa) tek
bir erişilebilir isim taşır; içindeki buton ayrıca odaklanabilir olmamalı
(iç içe interaktif eleman çakışması — kart linkse içindeki "İncele" görsel
buton, gerçek `<a>` değil `<span>` olur).

### 3.3 Header — mega menü

**OVERRIDE (2026-07-28, owner kararı, `docs/step1-manifesto.md`):** Bu
bölüm aşağıda önce "basit nav" öneriyordu; owner bunu değiştirdi — Header
**mega menü**. Aşağıdaki gerekçe (§0 rakip araştırması, kapsam şişmesi
ilkesi) hâlâ geçerli bir *öneri* olarak kayıtta kalıyor ama bağlayıcı karar
değil; uygulanan yapı budur. Rengin, tokenın, erişilebilirliğin, motion'ın
ve glow'un tüm diğer kuralları aynen geçerli.

**Yapı (uygulanan):**

```
[Logo]   Ürün ▾   Çözümler ▾   Fiyatlandırma   Kurulum Rehberleri   SSS        [Giriş yap]  [Builder'ı Dene]
          │         │
          │         ├─ Ajanslar için
          │         └─ Kurumsal için
          ├─ Nasıl çalışır
          ├─ Özellikler
          └─ Şablon galerisi
```

- İki mega-panel tetikleyicisi ("Ürün", "Çözümler") — her biri sol link
  sütunu (başlık + kısa açıklama) + sağ tek bir "featured" kart. Kalan
  öğeler (Fiyatlandırma, Kurulum Rehberleri, SSS) düz link, panel açmıyor
  — §0'daki "gereksiz yoğunluk" dersi burada da geçerli: yalnız gerçekten
  gruplanabilir 2 kategori mega-panel, geri kalanı tek satırda kalıyor.
- Mobilde: hamburger → tam ekran overlay, aynı liste dikey, `Ürün`/
  `Çözümler` akordeon olarak açılır (aynı `menu-data.ts` kaynağından
  beslenir, ayrı bir içerik kopyası yok).
- Zemin: `--hero-bg-deep`'ten `color-mix()` ile hafif şeffaf +
  `backdrop-filter: blur(12px)` (scroll'da), `--pill-bg`/`--pill-border`
  diliyle tutarlı cam hissi (bkz. `components/ui/glass.module.css`).
- **Erişilebilirlik:** panel tetikleyicisi gerçek `<button aria-expanded
  aria-controls>`; panel `role="menu"` DEĞİL — `<nav>` + odaklanabilir
  `<a>` listesi. Hover VE klavye/focus ile açılır (hover-intent gecikmesi:
  ~120ms aç / ~200ms kapa). `Escape` kapatır + odağı tetikleyiciye
  döndürür; dışarı tıklama kapatır; aynı anda tek panel açık; `Tab` panelin
  son öğesinden sonra doğal olarak kapanıp sıradaki üst-bar öğesine geçer.
  Mobil overlay açıkken body scroll kilitlenir ve odak overlay içine
  hapsedilir (focus trap). `prefers-reduced-motion`: tüm geçişler anlık,
  panel yine açılır/kapanır — yalnız hareket kaybolur. Uygulama:
  `apps/web/components/nav/Header.tsx`, `MegaMenuPanel.tsx`,
  `MobileNav.tsx`, `menu-data.ts` (tek içerik kaynağı).

### 3.4 Footer

4 sütun: Ürün (Şablonlar, Fiyatlandırma, Builder), Çözümler (Ajanslar,
Kurumsal), Kaynaklar (Kurulum Rehberleri, SSS, İletişim), Yasal (KVKK,
Gizlilik, Şartlar). Alt satırda logo + telif + dil anahtarı yeri (TR/EN
routing'i bu belgenin kapsamı dışında, bkz. `docs/page-plan.md` notu).
Zemin `--hero-bg-deep`, üst kenarlık `--dark-border`, aynı `--maxw` grid.

### 3.5 Rozet / Pill

Mevcut `.badge`/`.brandKicker`/`.navCta` deseni resmileştirilir: `border-
radius: 999px`, `background: var(--pill-bg)`, `border: 1px solid var(--
pill-border)`, önünde 6px'lik nokta (`--brand-accent` veya durum rengi).
Varyant: nötr (mevcut), başarı/uyarı/hata (§1.6 `-ondark` renkleriyle,
yalnız koyu zeminde kullanılır).

### 3.6 Form alanı (İletişim, SSS arama varsa)

Açık temaya özgü değil — pazarlama sitesindeki formlar (İletişim) koyu
zeminde oturur, bu yüzden builder'ın açık form dilinden ayrı bir koyu
varyant tanımlanır:
- `background: var(--dark-surface)`, `border: 1px solid var(--dark-
  border)`, `color: var(--dark-text)`, placeholder `--dark-text-muted`.
- `:focus` → `border-color: var(--blue-500)` + `outline: 2px solid
  color-mix(in srgb, var(--blue-500) 40%, transparent)`.
- Hata durumu: `border-color` `-ondark` danger tokenı, altında `--step-
  caption` boyutunda hata metni aynı renkte.
- Her input'un görünür bir `<label>`'ı vardır (placeholder tek başına
  label yerine geçmez — ekran okuyucu erişilebilirliği).

### 3.7 Bölüm başlığı (section heading)

Kicker (küçük büyük harf etiket, `--brand-accent` veya `--brand-light`) +
`--step-h1` başlık + isteğe bağlı `--step-body` açıklama, ortalanmış veya
sola yaslı, `max-width: 42em` açıklamada (mevcut `.subtitle`'daki `46em`
kalıbıyla aynı aile).

### 3.8 Testimonial kartı

Avatar/inisiyal (görsel yoksa `--blue-600` zeminde beyaz baş harf), 4-5
yıldız (yalnız gerçek puanımız olursa — CodeTwo'nun "rozet var ama alıntı
yok" zaafının tersine, **alıntı olmadan yıldız da yok**; ikisi birlikte
gelir ya da bölüm MVP'de tamamen gizlenir), alıntı metni `--step-body`,
altında isim + unvan + şirket `--step-caption` + `--dark-text-muted`.
**Kural:** uydurma/örnek testimonial ASLA yayınlanmaz (owner onayı olmadan
placeholder metin bile yayına çıkmaz) — bu doğrudan §0'daki CodeTwo dersine
bağlı: sahte kanıt gerçek kanıttan daha kötüdür, hiç olmasın.

### 3.9 Fiyat kartı

3 sütun (Pro / Team / Business — Agency ayrı satırda "Bize ulaşın" olarak,
sütun değil, çünkü havuzlanmış koltuk modeli tablo formatına uymuyor).
Her kartta: plan adı (`--step-h3`, display), fiyat (`--step-hero` boyutunun
yarısı kadar büyük bir rakam, ör. yeni `--step-h1` display 600), "/koltuk/ay"
veya "/ay" birim etiketi `--step-caption`, madde listesi (`✓` ikonu
`--blue-500`), CTA butonu (§3.1). "Business" kartında kademeli fiyat üç
satır halinde gösterilir (10–49 / 50–199 / 200+), tek rakam değil — bu,
`CLAUDE.md`'deki tabloyu birebir yansıtmak zorunda, basitleştirilip tek
rakama indirilmez. **Kupon/indirim alanı YOK** (`CLAUDE.md
§YAPILMAYACAKLAR`: kampanya/kupon motoru yasak).

### 3.10 SSS akordeonu

Her soru `<button aria-expanded aria-controls>` başlığında, cevap
`<div id role="region">` içinde. `aria-expanded` durumuna göre `+`/`−`
ikonu döner (`transform: rotate()`, reduced-motion'da anlık geçiş).
Klavye: `Enter`/`Space` açar-kapar, `Tab` sıradaki soruya geçer (ok
tuşlarıyla gezinme opsiyonel, zorunlu değil — WAI-ARIA accordion pattern
minimum gereksinimi karşılanır). Aynı anda birden fazla soru açık
kalabilir (exclusive değil) — SSS içeriği birbirine bağımlı değil.

### 3.11 Logo bulutu (logo cloud)

Müşteri/ajans logoları gri tonlamalı (`filter: grayscale(1)
opacity(0.6)`), hover'da renkli. **MVP'de içerik yok** — ilk 10 müşteri
manuel faturalanıyor (`CLAUDE.md`), gerçek logo izni alınmadan bu bölüm
yayınlanmaz. Bileşen tanımlanır ama Ana sayfa/Kurumsal sayfa planında
"LATER — ilk 5-10 referans müşteriden izin alınınca" olarak işaretlenir
(bkz. `docs/page-plan.md`).

---

## 4. Aralık, Konteyner Genişliği, Grid

Mevcut `--space-1`…`--space-6` (0.5rem–6rem) ve `--maxw: 1120px` korunur.
Eklenen tek token:

- `--maxw-wide: 1320px` — hero gibi tam genişlik arka planlı bölümlerde
  dış konteyner; içerik yine `--maxw` (1120px) ile ortalanır. İki
  konteyner iç içe: dış `--maxw-wide` arka plan/glow'un nefes alanı için,
  iç `--maxw` metin/kart hizası için.

**Grid kalıpları** (12 sütunlu soyut ızgara yerine somut `repeat()`
kalıpları — proje CSS Grid/Flexbox kullanıyor, `<div>` tabanlı olması
sorun değil çünkü bu SİTE arayüzü, e-posta HTML'i değil):
- Özellik kartları: `grid-template-columns: repeat(auto-fit,
  minmax(280px, 1fr))`, `gap: var(--space-3)`.
- Fiyat kartları: `repeat(3, 1fr)` ≥900px, altında `1fr` (tek sütun,
  yığın).
- Hero (mevcut `.inner`): `minmax(0,1.05fr) minmax(0,0.95fr)` ≥900px,
  altında `1fr` — değişmiyor.

---

## 5. Efektler

### 5.1 Gölge seviyeleri

| Token | Değer | Kullanım |
|---|---|---|
| `--shadow-sm` *(yeni)* | `0 2px 8px -2px rgba(10, 14, 26, 0.35)` | Küçük kaldırma (dropdown, tooltip) |
| `--shadow-card` | mevcut, `0 24px 60px -12px rgba(13,27,46,0.55)` | Standart kart |
| `--shadow-card-glow` | mevcut | Vurgulu kart (demo, önerilen fiyat planı) |

### 5.2 Glow tarifi (yeniden kullanılabilir reçete)

Her koyu bölüm arka planı aynı 4 katmanlı desenden kurulur (mevcut
`.hero` background-image listesi genelleştirilir):

```css
background-color: var(--hero-bg-deep);
background-image:
  radial-gradient(620px 420px at 10% -10%, var(--hero-glow-blue), transparent 65%),
  radial-gradient(520px 380px at 104% 6%, var(--hero-glow-accent), transparent 60%),
  radial-gradient(var(--hero-grid-dot) 1px, transparent 1px),
  linear-gradient(180deg, var(--hero-bg-deep) 0%, var(--dark-bg) 45%, var(--hero-bg-deep) 100%);
background-repeat: no-repeat, no-repeat, repeat, no-repeat;
background-size: auto, auto, 26px 26px, 100% 100%;
```

**Kural:** mavi glow her zaman sol-üst, turuncu glow her zaman sağ-üst
(mevcut hero'daki yerleşim) — "mavi baskın, turuncu vurgu" hiyerarşisini
(brand.ts'in iki-tonlu mavi mantığıyla aynı disiplin) sayfa sayfa tekrar
icat etmemek için pozisyon sabitlenir. Nokta ızgara (`--hero-grid-dot`)
her koyu bölümde AYNI `26px 26px` boyutuyla tekrarlanır — sayfa geçişlerinde
doku sürekliliği hissi verir.

**Bölüm çeşitlemesi:** Her koyu bölüm aynı tarifi kullanmak zorunda değil
ama nokta ızgara + zemin degrade her zaman sabit kalır; yalnız glow
blob'larının konumu ve `opacity`'si (0.3–0.5 arası) bölüm bazında
değişebilir — art arda gelen bölümler birbirinin fotokopisi görünmesin.

### 5.3 Yuvarlaklık

Mevcut `--radius-sm` (6px), `--radius` (10px), `--radius-lg` (16px)
korunur. Pill/rozet için `999px` literal kalır (ayrı bir token'a gerek
yok, zaten tam yuvarlak sabit bir değer).

### 5.4 Geçiş süreleri ve `prefers-reduced-motion`

| Token *(yeni)* | Değer | Kullanım |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Genel UI geçişi |
| `--duration-fast` | `120ms` | Renk/kenarlık geçişi (hover) |
| `--duration-base` | `200ms` | Transform, box-shadow geçişi |
| `--duration-slow` | `400ms` | Sayfa/bölüm giriş animasyonu (varsa) |

**Kural (mevcut `.hero::after` deseninin genellemesi):** `transform` ve
`opacity` dışındaki hiçbir özellik animasyona/transition'a girmez (layout
thrashing önlenir — GPU compositor katmanında kalır). Her animasyon/
transition tanımı `@media (prefers-reduced-motion: no-preference)` içine
alınır; reduced-motion kullanıcıları için tüm durumlar (hover dahil) anlık
geçer, hareket kaybolur ama görsel sonuç (renk, gölge) korunur.

---

## 6. Arka Plan Atmosferi — Genel Reçete

Özet: **her koyu bölüm** = 1) `--hero-bg-deep`'ten `--dark-bg`'ye dikey
degrade taban, 2) sol-üstte mavi radial glow, 3) sağ-üstte turuncu radial
glow, 4) sabit 26px nokta ızgara doku, 5) opsiyonel tek bir "nefes alan"
animasyonlu blob katmanı (yalnız hero'da — her bölümde tekrarlanırsa
dikkat dağıtıcı olur, bu yüzden `heroGlowBreathe` animasyonu SADECE Ana
sayfa hero'sunda kalır, diğer bölümler statik glow kullanır).

Bu, `home.module.css`'teki `.hero` kuralının zaten uyguladığı desenin
adlandırılmış, tekrar kullanılabilir hali — yeni sayfalar/bölümler bunu
kopyalayıp glow konumunu/`opacity`'sini değiştirerek türetir, sıfırdan
degrade icat etmez.
