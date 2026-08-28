# Pazarlama sitesi ↔ ürün bağlantı envanteri

**Tarih:** 2026-08-28 · **Kaynak klasör:** `~/Desktop/mailmyra edit` (30 HTML, git altında değil)
**Canlı:** `mailmyra.com` (statik, Plesk `/site`) · **Panel:** `app.mailmyra.com` (Next.js)

Bu tur **yalnız ön yüz → ürün bağlantısıdır.** Panelin siteyi yönetmesi (CMS) ayrı ve
sonraki iştir. Site statik HTML olarak kalır — Next.js'e taşıma yok, yeni sayfa yok.

Bu belge **tespit** belgesidir. Hüseyin onaylamadan hiçbir düzeltme yapılmaz.

---

## Özet

| | Adet |
|---|---|
| Ölü/çalışmayan form | 2 (biri canlıda HTTP 500) |
| Ürün gerçeğiyle çelişen iddia | 23 başlık |
| Yanlış hedefe giden link | 7 desen (~450 örnek) |
| Tema artığı / yer tutucu içerik | 6 blok |
| Uydurma şablon adı | 12 (4 sayfada, 4 ayrı set) |
| Altyapı boşluğu | 4 |

**Zaten bağlı olan (dokunulmayacak):** `login.html` / `register.html` → `app.mailmyra.com/api/auth/*`
(form-post → `seeOther` + `Set-Cookie`, kodda bilinçli tasarlanmış) · 202 builder linki ·
panelin `menu-data.ts`'i pazarlama sayfalarına mutlak adresle bağlı · fiyat rakamları
(`$1` / `$25` / `$200`, 7 gün deneme, kartsız) ürünle tutarlı · `web.config` temiz adres şeması.

---

## A · Canlıda zarar veren (öncelik 1)

### A1. Anasayfadaki "Schedule a demo" formu canlıda kırık

- **Yer:** `index.html:2289` → `action="assets/mail.php"`
- **Kanıt:** `POST https://mailmyra.com/assets/mail.php` → **HTTP 500**, gövde:
  *"Oops! Something went wrong and we couldn't send your message."* (GET → 403)
- **Sebep:** `assets/mail.php` tema mirası PHP mailer; Windows/Plesk'te `mail()` yok.
- **Etki:** Anasayfanın tek lead formu. Şu an gelen **her talep sessizce kayboluyor.**
- 🔴 **Ayrıca:** `assets/mail.php:76` → `$recipient = "mdsalim400@gmail.com";` — **tema
  yazarının kendi Gmail adresi** alıcı olarak gömülü. Form 500 verdiği için bugün kimseye
  bir şey gitmiyor; ama PHP mail çalışır hâle gelseydi anasayfadan gelen her talep
  yabancı birinin kutusuna düşerdi. Dosya sunucuda duruyor.
- **Nereye bağlanmalı:** Üründe **`Lead` modeli ve `admin/leads` ekranı zaten var**
  (`prisma/schema.prisma:812`, `lib/repo/admin.ts:2009 createLead`). Ama `POST /api/admin/leads`
  **staff oturumu istiyor** — pazarlama sitesinin kullanabileceği **halka açık uç yok.**
  Gereken: yeni public uç (rate-limit + honeypot), `source='inbound'`, formdaki
  `team_size` → `seats`. Bildirim `lib/mail/` üzerinden.

### A2. `contact.html` formu hiçbir yere gitmiyor

- **Yer:** `contact.html:759` `<form id="mm-contact-form" novalidate>` — **action yok**;
  sayfa içi script (`contact.html:1499`) `submit` olayını `e.preventDefault()` ile yutuyor.
- **Etki:** "Send message" düğmesi ölü. Altındaki KVKK/gizlilik onay kutusu da anlamsız.
- **Nereye bağlanmalı:** A1 ile aynı uç. Formdaki `mm-ct-segment` alanı
  (`agency`/`enterprise`/`team`/`freelancer`/`support`) `source`'a; `support` seçimi
  ürünün destek akışına mı gitmeli, yoksa hepsi lead mi olmalı — **karar Hüseyin'in.**

### A3. Anasayfada Lorem ipsum + uydurma referans (canlıda)

- **Yer:** `index.html:1560–1660` — "Feedbacks / Trusted by the World's Fastest Growing
  Companies" bölümü, 3 slayt.
- **İçerik:** *"It uses a directory of over 200 latin words combine a half of model sentence
  structures…"* — **Christian B.** imzasıyla, tema stok fotoğraflarıyla.
- **Canlıda doğrulandı:** `curl https://mailmyra.com/` → 3 örnek.

### A4. Anasayfada 5 uydurma müşteri görüşü + uydurma puan

- **Yer:** `index.html` "Real inbox proof / **Trusted where it matters. 4.9 / 5**" —
  "Early access feedback" etiketli 5 alıntı (ML · IT · AO · SD · HR).
- **Gerçek:** İlk 10 müşteri henüz yok (CLAUDE.md: elle faturalanacak). Bunlar üretilmiş
  referans ve üretilmiş bir puan.
- **Not:** Uydurma müşteri görüşü ve puan, reklam mevzuatı açısından da risklidir.
  Kaldırılmalı ya da açıkça "örnek senaryo" olarak işaretlenmeli — **karar Hüseyin'in.**

### A5. Anasayfada "Mailmyra Free — $0 forever" plan kartı

- **Yer:** `index.html:2010–2060`
- **İçerik:** "Mailmyra Free" · "Free forever" rozeti · **$0 / forever** · "Build for free" ·
  özellikler: *1 active sender · 1 active signature · Basic builder and export ·
  **Mailmyra badge included** · Community support*
- **Çelişki:** CLAUDE.md kilitli kararı — **"Ücretsiz plan YOK" (2026-07-24)** ve
  *"export giriş ve ödeme gerektirir"*. "Mailmyra badge" diye bir ürün özelliği de yok.
- **Sitenin kendisiyle çelişki:** `faq.html` → *"Is there a free plan? **No.**"*
- **Yayılım:** aynı çerçeve "Start free" / "Free to start" / "Start building your Mailmyra
  signature free" / pricing'de *"Start free, then move to one clear annual price"*.
  Ürünün gerçeği: builder + önizleme serbest, **export** hesap ister, 7 gün kartsız deneme.

### A6. Footer'da yanlış marka adı — 30 sayfanın hepsinde

- **Metin:** *"**Signal Ledger** by Mailmyra. Standardized signatures. Trusted conversations."*
- Başka bir projeden kalmış. Her sayfanın altında canlı.

---

## B · Ürün gerçeğiyle çelişen iddialar

> Ürün doğrulaması: `packages/renderer/src/templates/` (6 şablon) ·
> `apps/web/app/builder/steps/` (4 adım) · `apps/web/lib/brand-doc.ts` ·
> `apps/web/prisma/schema.prisma` · `apps/web/app/api/` (uç listesi).

### B1. "Altı istemcide önizleme" — üründe böyle bir özellik yok 🔴

Ürünün builder'ında **tek canlı önizleme** var (`previewPane`, açık/koyu zemin anahtarı).
Adımlar: **Details · Images · Social · Style** — "Preview" diye bir adım yok, istemci
başına önizleme yok. 6-istemci konusu bizim **iç test matrisimiz**, müşteriye satılan
bir ekran değil (ve o matris **hâlâ tamamlanmadı**).

| Sayfa | İddia |
|---|---|
| `features.html` | **"05 Six-client preview** — Outlook Classic, New Outlook, Gmail web, Gmail mobile, Apple Mail ve iOS Mail, **side by side**" |
| `pricing.html` | Karşılaştırma tablosunda **"Preview per inbox** — See the signature as Outlook, Gmail and Apple Mail will render it before you send it" → **Included / Included / Included** |
| `pricing.html` | "Inbox previews — Check the major email clients" |
| `product.html` | "Preview — Inspect the same signature **inside the inboxes your recipients actually use** before anything is exported / 6 clients / Checked before export" |
| `product.html` | "03 / Inbox proof — 6 checked — Preview where people read it" |
| `index.html` | "STEP 03 · PREVIEW — Preview everywhere / One signature, six major clients … **checked pixel for pixel**" |
| `solutions.html` | "**Six inbox previews**" (bireysel paket maddesi) |
| `login.html` | "Live inbox previews" |
| `register.html` | "Preview — **Six email clients**" |
| `templates.html` | "06 clients" |

**En riskli olan `pricing.html`:** özellik tablosunda "Included" demek satın alma vaadidir.

### B2. Kampanya bandı + tıklama takibi — hem yok hem yasak 🔴

CLAUDE.md YAPILMAYACAKLAR: *"İmza analitiği, tıklama takibi, banner kampanyaları"*.
Üründe `Campaign` modeli, zamanlama, tıklama sayacı **yok**. Olan: marka belgesinde tek
`cta` alanı (`{label,url}`, locked/default) ve `cta-banner` şablonu.

| Sayfa | İddia |
|---|---|
| `index.html` | "Marketing — **Scheduled banners · Trackable CTA** · Team targeting · Live updates" |
| `index.html` | "Sales — Meeting links · Demo CTA · **Click insights** · CRM ready" |
| `index.html` | "Performance — Last 30 days — **Measure banner clicks, CTA performance and active campaigns**" |
| `index.html` | "Campaign banners — Turn email into a channel. Launch and update banners across the team." |
| `index.html` (SSS) | "**Can campaign banners be updated centrally?**" — `product.html` ve `how-it-works.html`'de de var |
| `solutions.html` | "Marketing — Campaign control — Scheduled banners · Trackable CTA · Team targeting" |
| `solutions.html` | "Sales — … measurable calls to action … **Click insights**" |
| `product.html` | "04 / Campaigns — Scheduled — Schedule campaign creative once and publish it across selected teams" |
| `product.html` | "**06 / Insights** — Last 30 days — Measure banner clicks and active campaigns" |
| `product.html` | "Reporting live — See what each signature delivers" · "Schedule once. Publish together." |
| `solutions-agencies.html` | "**Campaign control**" (Agency toolkit maddesi) |
| Footer (30 sayfa) | Product sütununda **"Campaigns"** başlığı |

**Sitenin kendisiyle çelişki:** `features.html` → *"**No tracking.** No open pixels, no click
tracking hidden inside the signatures you send."* · `pricing.html` → *"No tracking — No pixels,
no click counters, no analytics"* · `faq.html` → *"Do you track who opens or clicks…? **No.**"*

### B3. Directory sync / M365 · Google Workspace bağlantısı 🔴

Yasak listesinde (*"Google Workspace / Entra ID directory sync"*) ve üründe yok.

| Sayfa | İddia |
|---|---|
| `index.html` | "IT & Admin — Central control · Role permissions · Bulk rollout · **Directory sync**" |
| `index.html` | "People & HR — Details stay current. **Sync every role and profile automatically.**" |
| `how-it-works.html` + `product.html` | "01. Connect your team" adımı: Microsoft 365 / Google Workspace logoları + **"128 employees synced"** |
| `solutions.html` | "IT & Admin — … **Directory ready**" · "People & Legal — **Profile sync**" |
| `features.html` | "Connect" akışında Microsoft 365 / Google Workspace kutuları |

**Sitenin kendisiyle çelişki:** `features.html` → *"**No directory sync.** We never reach into
your identity provider"* · `pricing.html` → *"no directory sync to negotiate with IT"* ·
`faq.html` → *"does not sync your directory"*.

### B4. Agency: izole müşteri organizasyonları + white-label — kurulmadı

Panelde kullanıcı **tek organizasyona** bağlı: `primaryOrgId()` üyeliklerden ilkini alır
(`lib/repo/senders.ts:223`) ve bütün yazma yolları o org'u kullanır. Çoklu müşteri
organizasyonu, org'lar arası havuz koltuk ve white-label **kodda yok**
(`white-label` yalnız `menu-data.ts` metninde ve dokümanlarda geçiyor).

- `solutions-agencies.html` — sayfanın **tamamı** bu vaadin üstünde: "8 Workspaces",
  "Isolated workspaces · Client permissions · Pooled senders · **White-label delivery** ·
  Bulk export tools · **Campaign control**", "2 Access levels", "Approval flow"
- `pricing.html` — Agency sütununda **"Included"**: *Isolated client organisations ·
  White-label the workspace · Seats pooled across clients*
- `solutions.html` — "Isolated client workspaces · Multi-brand management · White-label delivery"
- `faq.html` — "each client sits in its own isolated organisation under one parent account,
  white-label ready"
- Mega menü + footer (30 sayfa) — "Pooled seats & white-label." / "Isolated clients & white-label."

**Not:** Bu, CLAUDE.md'de "çalışma alanı modu" olarak tarif edilmiş bir hedef — yasak değil,
**henüz kurulmadı**. Karar: metni bugünkü gerçeğe çekmek mi, "yakında" olarak işaretlemek mi.

### B5. Takım / departman ve blok sistemi — kurulmadı

Veri modelinde `Team` / `Department` **yok** (Organization · Membership · SenderIdentity ·
Signature · BrandSetting). "Blok kütüphanesi" de yok; marka belgesi alan bazlı kilit sunuyor.

- `how-it-works.html` + `product.html` — "03. Assign & organise — **Teams & departments** ·
  Roles & seats · Multiple designs" + "Sales Team 24 employees / Marketing Team 12 employees"
- `how-it-works.html` + `product.html` — "**Flexible signature blocks** — Manage banners,
  social links, contact details and legal text as separate blocks"
- `how-it-works.html` + `product.html` — "**Role-based access** — Marketing updates banners
  and campaigns" (roller var ✅, "banners and campaigns" yok)

**Gerçekten var olanlar (bunlar kalabilir):** `signatures/[id]/assign` (imza atama) ·
`senders/bulk` · `senders/export-zip` (toplu export) · `senders/export-csv` + `ImportCsv`
(CSV içe/dışa) · roller · marka belgesi kilitleri · davetler.

### B6. Sayı hataları

| Yer | Yazan | Gerçek |
|---|---|---|
| `faq.html` — "How many templates are there?" | **"Three:** a classic horizontal layout, a single-column minimal one, and a bordered card…" | **6** (classic-horizontal, stacked-minimal, card-bordered, divider-columns, photo-first, cta-banner) |
| `faq.html` — "Does it work on phones?" | "**One of the three** is single-column by design" | altıdan biri |
| `features.html` | "Web-safe typography — **Seven** fonts" | **6** (`WEB_SAFE_FONTS`, `lib/brand-doc.ts`) |
| `how-it-works.html` istatistik şeridi | "**7** / web-safe fonts" | 6 |
| `faq.html` | "Arial, Helvetica, Georgia, Times New Roman, Verdana, Tahoma **and** Trebuchet MS" (7 ad) | 6 aile — Helvetica, Arial yığınının parçası |
| `faq.html` — "Where does my data live?" | "in our own **PostgreSQL** database" | **MariaDB 11.8.3** (kilitli karar: PostgreSQL DEĞİL) |
| `solutions-agencies.html` | mock kartta "3 templates" | 6 |
| `index.html` · `how-it-works.html` · `product.html` | "128 employees synced" / "Published to 128 users" / "128 active" / "Sales **+24%**" | uydurma rakamlar |

**Not:** `faq.html` sayfası genel olarak sitenin **en dürüst** metni — ücretsiz plan yok,
takip yok, directory sync yok, "an account is only required when you want to export" hepsi
doğru. Sorun şu ki **sitenin geri kalanı bu sayfayla çelişiyor** ve bu sayfa da şablon
sayısında/veritabanında bayatlamış.

### B7. "Pixel-perfect in 6 clients" — henüz doğrulanmadı

Rozet `index.html` ve `pricing.html`'de tekrarlanıyor. **6-istemci test matrisi hâlâ
Hüseyin'de ve tamamlanmadı** (CLAUDE.md: matris yayın şartı). Matris bitene kadar bu
iddia kanıtsız. Yeni 3 şablon hiç test edilmedi.

---

## C · Şablon galerisi ↔ ürün kopukluğu

### C1. 4 sayfada 12 uydurma şablon adı, hiçbiri üründe yok

| Sayfa | Tanıtılan adlar |
|---|---|
| `templates.html` | Modern split · Executive line · Campaign ready |
| `templates-teams.html` | Shared identity · Department lead · Launch campaign |
| `templates-professionals.html` | Modern profile · Executive mark · Campaign ready |
| `templates-agencies.html` | Client minimal · Client executive · Client campaign |

Üründeki gerçek adlar (builder sözlüğü + `TEMPLATE_META`): **Classic horizontal ·
Stacked minimal · Card bordered · Divider columns · Photo first · CTA banner.**
Dört sayfa birbiriyle de tutarsız. Sayım doğru ("06 layouts"), adlar değil.

### C2. "Gerçek çıktı" iddiası — aslında PNG mockup

- `templates.html`: *"**REAL OUTPUT, NOT SCREENSHOTS.** Every preview on this page is the
  real thing: the same table-based HTML you copy out of the builder, rendered live in its
  own frame. **No mockups, no screenshots.**"* ve *"Real Mailmyra output"* rozeti
- Gerçek: `<img src="assets/img/mailmyra/templates/template-modern.png">` — 3 adet
  ~1.5MB PNG, **31 Temmuz tarihli**, yani gerçek şablonlar yazılmadan önce üretilmiş
- `templates-{teams,professionals,agencies}.html`: *"These are working structures, not screenshots."*
- Aynı iddia **panelin nav'ında da var**: `menu-data.ts` → Template gallery →
  *"Real renders, not screenshots."* · mega menüde de aynı satır
- `faq.html`: *"rendered by the real engine rather than shown as screenshots"*

**Nereye bağlanmalı:** `packages/renderer/out/` altında **24 .htm** zaten üretiliyor
(`emit-htm`, `TEMPLATE_IDS` geziyor). Galeri bunlardan beslenmeli.

### C3. `?template=` parametresi builder tarafından okunmuyor

- Sitede: `https://app.mailmyra.com/builder?template=modern-split` (+ `executive-line`,
  `campaign-ready`, bir de boş `?template=`)
- Builder `page.tsx:30` yalnız **`sig`** parametresini okuyor. `template` yok sayılıyor.
- **Etki:** "Open in builder" düğmeleri seçilen şablonu değil, varsayılan builder'ı açıyor.
- **Nereye bağlanmalı:** builder'a `?template=<TEMPLATE_IDS>` desteği (geçersiz değer
  sessizce varsayılana düşmeli) + linklerin gerçek id'lere çevrilmesi.

### C4. Şablon başına ayrı URL yok

CLAUDE.md site yapısı: *"Şablon galerisi (**her şablon ayrı URL**)"* — SEO gerekçesiyle.
Bugün tek `/templates` + 3 hedef kitle varyantı var. **Yeni sayfa üretimi bu turun dışında**
(Hüseyin: "yeni sayfa üretimi yok") — kaydediliyor, sonraki tura.

---

## D · Yanlış hedefe giden linkler

| # | Nerede | Şu an | Olması gereken |
|---|---|---|---|
| D1 | Footer, 30 sayfa — büyük CTA **"TRY THE BUILDER"** | `/contact` | `app.mailmyra.com/builder` |
| D2 | Footer, 30 sayfa — **"Install Guides"** | `/how-it-works` | `/setup` |
| D3 | Footer, 30 sayfa — **"Schedule a Demo"** | `#mailmyra-demo-form` | Bu id **yalnız `index.html`'de var** → 29 sayfada tıklama hiçbir şey yapmıyor. `/#mailmyra-demo-form` ya da `/contact` |
| D4 | Footer, 30 sayfa — **"Campaigns"** | `solutions.html#campaigns` | `#campaigns` **hiçbir sayfada yok**; üstelik özellik de yok (bkz. B2) |
| D5 | Footer, 30 sayfa — **"About"** | `/` | About sayfası yok — ya link kalkar ya sayfa gelir (bu tur değil) |
| D6 | Footer, 30 sayfa — Compatibility sütunu: Outlook Classic · New Outlook · Gmail · Apple Mail · iOS Mail · HTML Export — **6 ayrı etiket** | hepsi `/compatibility` | 5 kurulum rehberine (`/setup-outlook-classic` …). Mega menüde bu **doğru** yapılmış, footer'da yapılmamış |
| D7 | `index.html:1757, 1779, 1800` | `href="#"` × 3 | "Grow your business / Cost savings ideas / Boost performance" — tema artığı, bkz. E1 |

### D8. 292 link hâlâ `.html` uzantılı

`clean-urls.mjs` fragment'li linkleri atlamış (`README` "geriye `.html` link kalmadı" diyor,
doğru değil):

```
pricing.html#agency  61   solutions.html#campaigns  30   solutions.html#agencies       17
pricing.html#pro     60   privacy.html#ccpa         30   solutions.html#professionals  17
pricing.html#team    60                                  solutions.html#teams          17
```

Hepsi çalışıyor (web.config `.html` → temiz adres 301'i var) ama her tıklama **fazladan bir
301 sıçraması.** Çapalar `#campaigns` hariç mevcut.

### D9. `/works-with` ve `/compatibility` **birebir aynı dosya**

`md5` aynı (`a43d51af…`), ikisi de canlıda 200, ikisinin de `<title>` etiketi
*"Mailmyra | Works with"*. `/compatibility`'ye 436, `/works-with`'e 8 iç link var.
İki adres = aynı içerik → yinelenen içerik. Biri canonical olmalı ya da diğeri 301.

### D10. `/register` sitede yalnız **1 kez** linklenmiş

Tek link `login.html` → "Create an account". Site genelindeki bütün CTA'lar `/builder`'a
gidiyor, hiçbir yerde "Sign up" yok. Kayıt sayfası pratikte öksüz.

### D11. `/product` panelin nav'ında yok

Sitede 33 link alıyor ve mega menüde başlık; ama `menu-data.ts`'teki Product menüsünde
How it works / Features / Template gallery var, `/product` yok. İki nav asimetrik.

---

## E · Tema artığı ve yer tutucu içerik

| # | Yer | İçerik |
|---|---|---|
| E1 | `index.html:1740–1815` | **"Benefits / Delivering more Than Just Solutions"** — 3 kart: *Grow your business · Cost savings ideas · Boost performance*, üçünün de metni **"We believe in challenges and so we have made challenges."**, üçü de `href="#"` |
| E2 | `index.html` | Tema hizmet şeridi: **IT Consultation · Data Security · Website Development · Cloud Services · UI/UX Design · Cybersecurity · Networking Solution** — imza ürününde bir BT-hizmetleri marquee'si |
| E3 | `contact.html` | Telefon **`+90 332 000 00 00`** — yer tutucu numara, canlıda |
| E4 | Footer, 30 sayfa | Dil seçici: **English · Turkce · Deutsch · Francais · Espanol · Italiano · Portugues · Nederlands · Polski · Arabic · Japanese** — 11 dil, hiçbiri çalışmıyor. Pazarlama sitesi **İngilizce kalır** (kilitli karar). "Turkce" ayrıca şapkasız |
| E5 | 12 sayfa | `assets/img/about-me/about-me-thumb-1.png` — tema demo görseli hâlâ kahraman/yan görsel olarak (5 kurulum rehberi dahil; daha önce raporlanmış, dokunulmamış) |
| E6 | 5 kurulum rehberi | **26 ekran görüntüsü yer tutucu.** Diskte 4 kare var (`outlook-new-step-01`, `outlook-classic-step-01`, `gmail-step-01`, `apple-mail-step-01`); `setup-ios-mail` sıfır. Bu yüzden 5 rehberde `<meta name="robots" content="noindex, follow">` duruyor |
| E7 | 5 kurulum rehberi | `mm-hiw-rail` adımları **"Connect · Design · Roll out · Send"** — bunlar how-it-works'ün adımları, kurulum akışıyla ilgisiz. `templates.html`, `features.html`, `works-with.html`, `contact.html`'de de aynı ray var (daha önce raporlanmış, dokunulmamış) |

---

## F · Altyapı ve SEO

| # | Konu | Durum |
|---|---|---|
| F1 | `robots.txt` | **404** — yok |
| F2 | `sitemap.xml` | **404** — yok. 30 sayfa, galeri ve rehberler SEO'ya oynuyor |
| F3 | `mailmyra edit` klasörü | ✅ **Çözüldü (2026-08-28).** Klasör kendi git deposu oldu (`main`, ilk commit `44eac8d`). İlk commit canlının **birebir fotoğrafı** — 30 sayfanın 30'unda diskteki dosya ile `mailmyra.com`'daki çıktı md5 olarak aynı. Remote henüz yok; açılırsa **private** olmalı (Agntix tema dosyaları) |
| F4 | `hello@mailmyra.com` | 106 mailto linki bu adrese gidiyor. Kutunun gerçekten çalıştığı **doğrulanmalı** |
| F5 | Sosyal hesaplar | Footer: `facebook.com/mailmyra` · `youtube.com/@mailmyra` · `linkedin.com/company/mailmyra` · `instagram.com/mailmyra` — hesaplar var mı, **Hüseyin doğrulamalı** |
| F6 | `assets/mail.php` | Kaldırılacak mı? Yeni uca bağlanınca işlevsiz kalıyor ve sunucuda çalışan bir PHP dosyası olarak duruyor |

---

## G · Sayfa sayfa özet

| Sayfa | Bulgu |
|---|---|
| `index.html` | A1 A3 A4 A5 · B1 B2 B3 B5 B6 B7 · D3 D7 · E1 E2 — **en yoğun sayfa** |
| `pricing.html` | B1 (özellik tablosunda "Included") · B4 · B7 · D8 |
| `templates.html` | C1 C2 C3 · B1 |
| `templates-{teams,professionals,agencies}.html` | C1 C2 |
| `features.html` | B1 · B2 (Campaigns and banners maddesi) · B3 (Connect akışı) · B6 (7 font) — ama "What Mailmyra will not do" bölümü **doğru ve korunmalı** |
| `product.html` | B1 B2 B3 B5 B6 — `how-it-works.html` ile büyük ölçüde **aynı blokları** taşıyor |
| `how-it-works.html` | B3 B5 B6 — `product.html` ile çakışan içerik |
| `solutions.html` | B1 B2 B3 B4 · D8 (`#campaigns` yok) |
| `solutions-agencies.html` | B4 (sayfanın tamamı) · B6 |
| `solutions-{teams,professionals}.html` | B4 (mega menü/footer satırları) |
| `faq.html` | B6 (3 şablon · 7 font · PostgreSQL) — geri kalanı **doğru, referans metin** |
| `contact.html` | A2 · E3 |
| `works-with.html` / `compatibility.html` | D9 — birebir aynı dosya |
| `setup*.html` (6) | E6 E7 · `setup-ios-mail` hiç kare yok |
| `login.html` · `register.html` | B1 · D10 · auth bağlantısı ✅ sağlam |
| `security.html` · `privacy.html` · `kvkk.html` · `terms.html` · `cookies.html` | Metinler ihtiyatlı yazılmış; "campaign content" geçiyor ama koşullu. Düşük öncelik. "Konya, Turkiye" / "Konya, Türkiye" tutarsız |
| Footer (30 sayfa) | A6 · D1 D2 D3 D4 D5 D6 · E4 |
| Mega menü (30 sayfa) | C2 ("Real renders, not screenshots") · B4 (white-label satırları) — hedefler ✅ doğru |

---

## Hüseyin'in vermesi gereken kararlar

1. **Kurulmamış özellikler ne olacak?** (B2 kampanya · B3 directory sync · B4 agency/white-label ·
   B5 takım/departman) — metni bugünkü gerçeğe çekmek mi, "yakında" olarak işaretlemek mi,
   yoksa bölümleri kaldırmak mı? *Kampanya ve tıklama takibi ayrıca YAPILMAYACAKLAR listesinde —
   onlar "yakında" bile olamaz.*
2. **Ücretsiz plan kartı** (A5) kalkacak mı, 7 gün deneme kartına mı dönüşecek?
3. **Uydurma referanslar ve 4.9/5 puan** (A3 A4) — kaldır mı, "örnek senaryo" etiketiyle mi kalsın?
4. **Formlar** (A1 A2) — ikisi de `Lead`'e mi düşsün, `contact`'taki "support" seçimi ayrı mı gitsin?
   Otomatik bilgilendirme e-postası gidecek mi?
5. **`/works-with` vs `/compatibility`** (D9) — hangisi kalsın?
6. **6-istemci matrisi** (B7) — matris bitene kadar "pixel-perfect in 6 clients" rozeti kalsın mı?
7. **Kurulum kareleri** (E6) — bu turda çekilecek mi, yoksa `noindex` bir tur daha kalsın mı?
8. ~~**`mailmyra edit` sürüm altına alınsın mı** (F3)~~ — ✅ yapıldı 2026-08-28. Kalan tek soru:
   GitHub'da **private** bir remote açılsın mı, yoksa depo yerel mi kalsın?
