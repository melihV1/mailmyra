# Pazarlama sitesini ürüne bağlama — tasarım

**Tarih:** 2026-08-28 · **Karar veren:** Hüseyin · **Envanter:** `docs/marketing-site-connection-inventory.md`

## Kapsam

`mailmyra.com`'daki 30 statik sayfayı tek tek gezip ürüne bağlanması gereken her yeri
bağlamak: ölü formlar, yanlış hedefler, ürün gerçeğiyle çelişen metinler.

**Sınırlar (Hüseyin, 2026-08-28):**
- Site **statik HTML kalır** (Agntix, `~/Desktop/mailmyra edit`). Next.js'e taşıma **yok**.
- **Yeni sayfa üretimi yok.** Şablon başına ayrı URL (CLAUDE.md SEO maddesi) sonraki tura.
- **Panelin siteyi yönetmesi (CMS) bu turun dışında** — ayrı ve sonraki iş.
- Pazarlama **İngilizce kalır** (kilitli karar).
- Tailwind/Bootstrap yok · `main.css` **baştan üretilmez, sonuna eklenir** ·
  CSS değişince `?v=mailmyra-…` damgası bump edilir · **`build-pricing-page.py` koşulmaz.**
- Bölüm **kurmak** Hüseyin'in işi; burada yapılan bölümleri **ürünün gerçeğine bağlamak.**

---

## Alınan kararlar

| # | Konu | Karar |
|---|---|---|
| K1 | Analitik · tıklama takibi · banner kampanyaları | YAPILMAYACAKLAR'dan **çıktı, roadmap'e alındı** (backend sonrası). ✅ CLAUDE.md işlendi |
| K2 | Directory sync | **Yasak listesinde kalır.** Sitede "Yakında" bile denmez → **kaldırılır**, yerine CSV içe aktarma |
| K3 | Kampanya + CTA ölçümü bölümleri | Kalır, **görünür "Yakında"** işaretiyle (küçük gri rozet değil) |
| K4 | Fiyat tablosu | Kurulmamış hiçbir şey için **"Included" yazılmaz** — satır çıkar ya da "Yakında" olarak ayrılır |
| K5 | Agency izole org · white-label · takım/departman | **"Yakında"** işaretle (K4 fiyat tablosuna da uygulanır) |
| K6 | "No tracking" sözü | **Kalır, kapsamı netleşir** — "gizli piksel/sayacı BİZ koymayız" kalıcı söz; gelecekteki CTA ölçümü **açık opt-in ve görünür** |
| K7 | İki ölü form | İkisi de **`Lead`**'e → yeni **public `POST /api/leads`** |
| K8 | "$0 forever" ücretsiz plan kartı | **Kaldır**, 7 gün deneme kartına dönüştür |
| K9 | Six-client preview | **Özellik iddiası → kalite iddiası:** "6 istemcide önizle" değil, "**6 istemciye göre test edilmiş**" |
| K10 | Uydurma referanslar (Lorem ×3, 4.9/5, 5 görüş) | **DOKUNMA** |
| K11 | "Pixel-perfect in 6 clients" rozeti | **DOKUNMA**, matrisi bekle |
| K12 | Tema artığı bölümler (Benefits kartları, BT şeridi) | **Bölümler kalır**, yalnız 3 ölü `href="#"` düzeltilir |
| K13 | Kurulum rehberi kareleri | **Bu turda değil**, `noindex` kalır |
| K14 | `/works-with` ↔ `/compatibility` | `/compatibility` kalır, `/works-with` **301**, dosya silinir, 8 iç link çevrilir |

---

## Hüseyin'in istediği liste: ne "Yakında", ne kaldırıldı

### 🕓 "Yakında" işaretlenecek — bölüm kalır, rozet gelir

| Nerede | Ne |
|---|---|
| `index.html` | "Built for every team" → Marketing sekmesi (Scheduled banners · Team targeting · Live updates) |
| `index.html` | "Performance — Measure banner clicks, CTA performance and active campaigns" |
| `index.html` | "Campaign banners — Turn email into a channel" (Designed to travel şeridi) |
| `index.html` | "Sales" sekmesi → Demo CTA ölçümü kısmı |
| `product.html` | "04 / Campaigns — Schedule campaign creative once…" |
| `product.html` | "06 / Insights — Measure banner clicks and active campaigns" |
| `product.html` | "Reporting live" · "Schedule once. Publish together." |
| `solutions.html` | Marketing sekmesi (Campaign control) · Sales sekmesindeki ölçüm kısmı |
| `solutions-agencies.html` | İzole müşteri org'ları · white-label · pooled senders · Campaign control · Approval flow |
| `solutions.html` | "[ 03 ] For multiple clients" bloğu (white-label / isolated workspaces) |
| `how-it-works.html` + `product.html` | "03. Assign & organise" → Teams & departments · Multiple designs |
| `how-it-works.html` + `product.html` | "Smart assignments" (departman bazlı) · "Flexible signature blocks" |
| Footer, 30 sayfa | Product sütunundaki "Campaigns" başlığı — hedefi de düzeltilir (bkz. L4) |

### ❌ Kaldırılacak — karşılığı yok, "Yakında" da denmez

| Nerede | Ne | Yerine |
|---|---|---|
| `index.html` | "IT & Admin" sekmesindeki **Directory sync** rozeti | **CSV import** (gerçek) |
| `index.html` | "People & HR — Sync every role and profile automatically" | Rol/profil bilgisinin CSV ile gelmesi |
| `how-it-works.html` + `product.html` | "01. Connect your team" → **Microsoft 365 / Google Workspace logoları + "128 employees synced"** | CSV içe aktarma + koltuk yönetimi |
| `solutions.html` | "IT & Admin — **Directory ready**" · "People & Legal — **Profile sync**" | CSV / rol yönetimi |
| `features.html` | "Connect" akışındaki Microsoft 365 / Google Workspace kutuları | CSV |
| `index.html` | **"Mailmyra Free — $0 forever"** plan kartı (K8) | 7 gün kartsız deneme + "builder serbest, export hesap ister" |
| Site geneli | `assets/mail.php` (K7 sonrası işlevsiz; alıcısı tema yazarının Gmail'i) | — |

### ✏️ Yeniden yazılacak — iddia var, ifadesi yanlış

| Nerede | Şu an | Olacak |
|---|---|---|
| `features.html` · `product.html` · `pricing.html` · `index.html` · `solutions.html` · `login.html` · `register.html` · `templates.html` (10 yer) | "Six-client preview" / "6 clients checked before export" — **özellik** olarak | "6 istemciye göre **test edilmiş**" — kalite iddiası (K9) |
| `pricing.html` karşılaştırma tablosu | "Preview per inbox → Included / Included / Included" | "Tested in 6 clients" ya da satır kalkar (K4) |
| `pricing.html` Agency sütunu | Isolated client orgs · White-label · Pooled seats → **"Included"** ×3 | **"Yakında"** olarak ayrılır, "Included" yazılmaz (K4+K5) |
| `features.html` "No tracking" · `pricing.html` "No tracking" · `faq.html` | "asla takip etmeyeceğiz" (mutlak) | "**gönderdiğin imzaya gizli piksel/sayacı biz koymayız**"; ölçüm gelirse açık opt-in (K6) |

### 🔒 Dokunulmayacak (Hüseyin kararı)

- Lorem ipsum slider ("Christian B." ×3) · "4.9 / 5" + 5 müşteri görüşü (K10)
- "Pixel-perfect in 6 clients" rozeti (K11)
- "Delivering more Than Just Solutions" 3 kartı ve BT-hizmetleri şeridi — **bölümler kalır**;
  yalnız içlerindeki 3 ölü `href="#"` düzeltilir (K12)
- Kurulum rehberi kareleri ve `noindex` satırları (K13)
- `pricing.html`'in yerleşimi ve `build-pricing-page.py` (metin/satır düzeltmesi elle yapılır)

---

## Ürün tarafı — yeni kod

### P1. Public lead ucu: `POST /api/leads`

**Neden yeni uç:** `POST /api/admin/leads` staff oturumu istiyor
(`requireSessionUserId` + `staffCtx`), `createLead()` de `requireStaff` + `audit(reason)`
zinciri koşuyor. Halka açık bir form bu sözleşmeyi karşılayamaz.

**Depo katmanı:** `lib/repo/leads.ts` → `createInboundLead(input)`.
`admin.ts`'teki `createLead` **dokunulmaz** — staff yolu ve denetim sözleşmesi aynı kalır.
Denetim defteri kişi bilgisi biriktirmeme sözleşmesini korur: `contact` ve `note`
`AdminAction` payload'ına **girmez**.

**Şema değişikliği (migration gerekir):**

```prisma
model Lead {
  // ... mevcut alanlar
  /// Formdan gelen serbest metin: mesaj, e-posta platformu, ünvan, şirket URL'i.
  /// Personel yazmaz — yalnız gelen taleplerde dolar.
  note String? @db.Text
}
```

**Gerekçe:** iki formda `Lead`'in taşımadığı dört alan var (mesaj · platform · ünvan ·
şirket URL'i). `nextStep` (VarChar 200) personelin bir sonraki aksiyonu için —
oraya müşteri metni yazmak alanın anlamını bozar ve 200 karakter mesaja yetmez.

**Alan eşlemesi:**

| Form alanı | Lead alanı |
|---|---|
| ad + e-posta | `contact` = `"Ad Soyad <e-posta>"` (VarChar 255) |
| şirket adı (yoksa e-posta alan adı) | `company` |
| demo formu | `source = 'inbound-demo'` |
| contact formu segment çipi | `source = 'inbound-agency'` / `-enterprise` / `-team` / `-freelancer` / `-support` |
| `team_size` / koltuk aralığı | `seats` (aralıklarda alt sınır; "Just me" → 1) |
| mesaj + platform + ünvan + şirket URL'i | `note` |
| — | `stage = 'new'` (varsayılan) |

**Kötüye kullanım koruması:** `lib/rate-limit.ts`'teki `createRateLimiter` kullanılır
(bellek içi sabit pencere, tek Node süreci varsayımı zaten spec'te kayıtlı). IP başına
dar bir pencere + gizli honeypot alanı; honeypot doluysa **200 döner ama kayıt açmaz**
(bot geri bildirim almasın). `clientIp(req)` mevcut.

**Cevap sözleşmesi:** Formlar `login.html`/`register.html` ile aynı deseni izler —
`method="post"`, form-encoded gövde, başarıda `seeOther` ile bir teşekkür durumuna,
hatada `formErrorRedirect` ile geldiği sayfaya (`_shared.ts`'te ikisi de var).
Böylece **JavaScript kapalıyken de çalışır** ve mevcut auth formlarıyla tek desen olur.

**Bildirim:** talep geldiğinde `lib/mail/` üzerinden `hello@mailmyra.com`'a bilgi
e-postası. Sağlayıcıya özel SDK yok, mevcut soyutlama. Şablon İngilizce (işlemsel
e-postalar İngilizce kalır — kilitli karar).

⚠️ **Deploy migration ister:** DURDUR → `deploy.js` → `exec -- prisma migrate deploy`
→ `exec -- prisma generate` → BAŞLAT. (`SupportMessage` turundaki zincirin aynısı.)

### P2. Builder `?template=` desteği

`apps/web/app/builder/page.tsx` şu an yalnız `sig` okuyor. Eklenecek: `template`
parametresi `TEMPLATE_IDS` içindeyse başlangıç şablonu olur; **geçersiz/eksikse
sessizce varsayılana düşer** (404 yok — galeri linki bayatlarsa kullanıcı yine builder'a
girsin). `sig` ile birlikte gelirse **kayıtlı imzanın şablonu kazanır** (düzenleme kipi
bindirmeyi zaten kilitliyor).

---

## Site tarafı — iş kalemleri

### L1. "Yakında" işareti (yeni desen)

Tek bir CSS sınıfı `main.css`'in **sonuna** eklenir, `?v=` damgası bump edilir.
Hüseyin'in şartı: **fark edilir** olmalı, küçük gri rozet değil. Öneri: bölümün
üstünde kontrast bir şerit + ilgili rozetlerde tekrar. **Görsel onayı Hüseyin'in.**

### L2. Metin düzeltmeleri (ürün gerçeği)

| Nerede | Şu an | Olacak |
|---|---|---|
| `faq.html` | "How many templates are there? **Three**: …" | **Altı**, gerçek adlarla |
| `faq.html` | "**One of the three** is single-column" | altıdan biri |
| `faq.html` | "in our own **PostgreSQL** database" | **MariaDB** |
| `features.html` | "**Seven** fonts" | **Altı** |
| `how-it-works.html` | "**7** / web-safe fonts" | **6** |
| `faq.html` | 7 font adı sayıyor | 6 aile (Helvetica, Arial yığınının parçası) |
| `solutions-agencies.html` | mock kartta "3 templates" | 6 |
| `contact.html` | `+90 332 000 00 00` | gerçek numara ya da satır kalkar — **Hüseyin verecek** |
| `security.html` / diğer legal | "Konya, Türkiye" ↔ "Konya, Turkiye" | tek yazım |
| Footer, 30 sayfa | "**Signal Ledger** by Mailmyra" | doğru marka metni |

### L3. Şablon galerisi (C1–C3)

- 4 sayfadaki **12 uydurma ad** → gerçek 6 şablon adı (builder sözlüğü + `TEMPLATE_META` ile
  birebir): Classic horizontal · Stacked minimal · Card bordered · Divider columns ·
  Photo first · CTA banner
- `?template=` linkleri gerçek id'lere (P2 ile birlikte anlam kazanır)
- **"REAL OUTPUT, NOT SCREENSHOTS" iddiası:** `packages/renderer/out/` altında **24 .htm**
  zaten üretiliyor (`emit-htm`, `TEMPLATE_IDS` geziyor). Galeri görselleri bunlardan
  üretilir — iddia doğru hâle gelir. Aynı cümle **panelin `menu-data.ts`'inde de var**
  ("Real renders, not screenshots"), o da bu adımda tutarlanır.
- Aynı düzeltme `faq.html`'deki "rendered by the real engine" cümlesini de doğrular.

### L4. Link düzeltmeleri

| # | Nerede | Şu an | Olacak |
|---|---|---|---|
| L4a | Footer CTA "TRY THE BUILDER" | `/contact` | `app.mailmyra.com/builder` |
| L4b | Footer "Install Guides" | `/how-it-works` | `/setup` |
| L4c | Footer "Schedule a Demo" | `#mailmyra-demo-form` (29 sayfada çapa yok) | `/#mailmyra-demo-form` |
| L4d | Footer "Campaigns" | `solutions.html#campaigns` (çapa hiç yok) | `/solutions#campaigns` + solutions.html'e gerçek `id="campaigns"` |
| L4e | Footer "About" | `/` | link kalkar (About sayfası yok, yeni sayfa bu turda yok) |
| L4f | Footer Compatibility sütunu — 6 etiket | hepsi `/compatibility` | 5'i kendi kurulum rehberine, "HTML Export" `/compatibility`'de kalır |
| L4g | `index.html` ×3 | `href="#"` | düz metne döner (K12) |
| L4h | 292 link | `pricing.html#pro` vb. | `/pricing#pro` — fazladan 301 sıçraması biter |

### L5. Yinelenen sayfa (K14)

`/compatibility` kalır. `works-with.html` **silinir**, `web.config`'e kalıcı yönlendirme
eklenir, 8 iç link çevrilir.
⚠️ **`web.config` tek başına ve ÖNCE denenir** — 2026-07-27'de yanlış bir config bu siteyi
0 baytlık 500'e düşürmüştü. Kural eklenir → canlıda doğrulanır → sonra içerik gider.

### L6. `robots.txt` + `sitemap.xml`

İkisi de şu an **404**. 30 sayfa için sitemap üretilir; kurulum rehberleri `noindex`
olduğu için (K13) sitemap'e **girmez**. `robots.txt` sitemap'i işaret eder.

---

## Doğrulama

1. **Yerel:** `npm test` · `npm run typecheck` · `npm run build` (kök).
2. **Lead ucu:** birim testleri — geçerli gönderim `Lead` açar · honeypot dolu → 200 ama
   kayıt yok · rate limit aşımı → reddedilir · `note` alan eşlemesi · denetim payload'ında
   `contact`/`note` **yok**.
3. **Builder `?template=`:** geçerli id → o şablonla açılır · geçersiz id → varsayılan,
   hata yok · `sig` ile birlikte → kayıtlı imzanın şablonu kazanır.
4. **Site:** 30 sayfa için link taraması tekrar koşar — ölü link 0, `.html` link 0,
   çapasız fragment 0. `works-with` → 301, `compatibility` → 200.
5. **Görsel duman:** anasayfa + pricing + templates + contact, açık/koyu, masaüstü/mobil.
6. **Deploy sonrası dış duman:** demo formu gerçek bir talep açıyor mu (panelde
   `/admin/growth/leads`'te görünüyor mu), bilgi e-postası düşüyor mu.

## Riskler

| Risk | Karşılık |
|---|---|
| `web.config` siteyi 500'e düşürür | Tek başına ve önce denenir; site zaten çalıştığı için geri alma anında |
| `main.css` yeniden üretilirse Hüseyin'in CSS'i silinir | **Yalnız sonuna eklenir**, damga bump edilir |
| `pricing.html` jeneratörle ezilir | `build-pricing-page.py` **koşulmaz**, düzeltmeler elle |
| Migration prod'da atlanır | Deploy notu spec'te ve plan'da; `SupportMessage` turundaki tam zincir |
| "Yakında" rozeti bölümleri çirkinleştirir | Görsel Hüseyin'in onayına sunulur, kod ondan sonra yayılır |
| 30 sayfada tekrarlı düzeltme (footer) elle yapılırsa kaçak kalır | Script'le uygulanır; `patch-mega-menu.py` deseni — her kalıp her dosyada beklenen sayıda geçmezse **o dosyaya dokunmadan durur** |

## Süreç

Spec onayı → `writing-plans` ile uygulama planı → subagent-driven, görev başına
sonnet review → fable final review → site deposuna commit (`mailmyra-site`) +
monorepo'ya commit → deploy.

**Not:** İki ayrı depo var. Site değişiklikleri `melihV1/mailmyra-site`'a, ürün
değişiklikleri (P1, P2) monorepo'ya gider; **deploy'ları da ayrı** (site FTP → Plesk
`/site`, panel FTP → `/app.mailmyra.com/apps/web` + migration).
