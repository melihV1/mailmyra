# Mailmyra — Proje Bağlamı

Bu dosya projenin anayasasıdır. Kararlar burada kilitlidir; değiştirmeden önce sahibiyle konuşulur.

---

## Proje Nedir

Mailmyra, e-posta imzası (email signature) oluşturma ve yönetme platformudur.
Sahibi: **Voldi Creative** (Konya merkezli reklam/kreatif ajans).
Geliştirici: **Hüseyin** (tek kişi, part-time). Kararları o verir, kodu onaylar.

**Dil:** Kullanıcıyla Türkçe konuş. Kod, değişken adları, commit mesajları İngilizce.

---

## Kilitli Kararlar (tartışmaya kapalı)

### Konumlandırma
Ajans ve kurumsal müşteriye satılır. Anasayfa onlara seslenir.
Fabrika, KOBİ ve freelancer da müşteridir ama ön kapı ajans/kurumsaldır.
Sebep: tek satışta 200 koltuk alınır, freelancer'da 1.

### Fiyatlandırma

**Tek ürün, tek fiyat: `$1 / aktif gönderici / yıl`** (karar: 2026-08-07, Hüseyin).
Yalnız yıllık faturalama · minimum 1 aktif gönderici · 7 gün tam deneme, kart
istenmez · kademe, hacim tablosu ve özellik kilidi YOK.

> **Bu karar önceki modeli iptal etti.** Eskisi: Pro $5/ay · Team $1/koltuk/**ay**
> min 5 · Business $0.83/$0.75 · Agency havuz. Yeni model bilinçli bir pazar
> edinme kararı: kısa vadeli abonelik kârından önce aktif koltuk ve pazar payı.

**Koltuk = aktif gönderici kimliği.** Giriş hesabı değil, kayıtlı imza değil.
Taslak koltuk tüketmez; sayım **ilk publish/deploy**'da başlar. Kendine imza
atanmayan admin 0 koltuk.

**Pro / Team / Agency ayrı plan DEĞİL, çalışma alanı modudur.** Üçü de aynı
sayımı ve aynı `$1` liste fiyatını kullanır: Pro tek kişi · Team tek marka
altında çok gönderici · Agency ana hesap altında izole müşteri organizasyonları
(+ white-label).

**İlk 10 müşteri manuel faturalanacak.** Otomatik abonelik sistemi YAZILMAYACAK.
Ödeme altyapısı (Vakıfbank sanal POS + PayTR) hazır ama entegrasyon ertelendi.
⚠️ Bu iki karar gerilimde: $1'lık siparişi elle faturalamak faturanın
maliyetinden ucuz değil. Hacim gelince yeniden bakılacak.

**Fiyat sayfada elle gömülmez.** Tek kaynak
`scripts/marketing-site/build-pricing-page.py` içindeki sabitler; script
rakamları hem HTML'e (JS kapalıyken de görünsün) hem `MM_PRICING` JS objesine
yazar. Kampanya kutusu `LAUNCH_OFFER["active"]` ile tek satırda açılıp kapanır
(lansmanda **kapalı**).

**Ücretsiz plan YOK** (karar: 2026-07-24, Hüseyin). Builder ve canlı önizleme
herkese açık; **export (kopyala + .htm indir) giriş ve ödeme gerektirir**.
Uygulamada `EXPORT_REQUIRES_AUTH=true|false` bayrağıyla ayarlanır — iş modeli
kararı koda gömülmez.

### Stack
- **TypeScript** her yerde
- **npm workspaces** — paket yöneticisi **npm** (karar: 2026-07-25, Hüseyin).
  pnpm'den göç edildi çünkü Plesk deploy paneli npm bekliyor. Komutlar:
  kökten `npm install`, `npm test`, `npm run typecheck`, `npm run build`;
  tek workspace için `npm run <script> -w apps/web`. **pnpm/corepack
  kullanma**, `pnpm-lock.yaml` veya `pnpm-workspace.yaml` geri ekleme.
- **Next.js (App Router)** — şablon galerisi SEO'su + uygulama tek repoda
- **CSS Modules** + kendi tasarım tokenları (karar: 2026-07-28, Hüseyin —
  Tailwind DEĞİL). Proje zaten baştan beri CSS Modules ile yazılıyordu
  (builder, hero, hepsi) ve tokenlar zaten CSS custom property olarak
  `apps/web/app/tokens.css`'te yaşıyor; Tailwind kurmak token disiplinini
  zayıflatıp iki paralel sistem yaratacaktı. Bkz. `docs/step1-manifesto.md`
  Karar A1.
- **PostgreSQL** (kendi sunucularında, ek maliyet yok)
- **Prisma** ORM
- Auth: basit oturum (email + şifre). Clerk/Auth0 kullanma.
- **Bootstrap KULLANMA.** Hazır SaaS teması kullanma. Jenerik görünüm projenin en büyük düşmanı.

### Marka
- Logo ve renkler **sabit** (`_eski/logo.svg`)
- Tipografi ve tasarım dili yeniden kurulacak
- Eski fontlar (ClashDisplay, Platform) gözden geçirilebilir

---

## İki Kalıcı Mimari Kural

### 1. Renderer asla React bileşeni olmayacak

```ts
// packages/renderer — framework'e bağımsız
renderSignature(data: SignatureData, templateId: string): string
```

Saf fonksiyon. DOM'a dokunmaz, React import etmez, tarayıcı API'si kullanmaz.

**Sebep:** Aynı motor iki yerde çalışacak — tarayıcıda canlı önizleme, sunucuda toplu export (50 kişilik firmanın imzalarını tek seferde üretmek). React'e gömülürse iki kez yazılır.

### 2. Görseller `cdn.mailmyra.com` üzerinden gider

Asla `mailmyra.com/uploads/...`, asla sunucu IP'si, asla üçüncü parti sağlayıcının kendi domaini.

**Sebep:** Üretilen imzalar insanların e-posta istemcilerinde **yıllarca** yaşar. Sunucu veya sağlayıcı değişirse sahadaki bütün logolar kırılır ve geri dönüşü yoktur. Kendi domainimiz arkada istediğimizi değiştirmemizi sağlar.

Cloudflare **kullanılmayacak** — CDN domaini doğrudan kendi sunucumuzdan servis edilir (karar: 2026-07-24, Hüseyin).

### Görsel Boyut Politikası

- Yükleme limiti: **5MB** · kabul: **PNG/JPG/SVG** · ret: WebP/GIF
- **SVG → PNG dönüşümü zorunlu** (çıktıda asla SVG olmaz)
- Çıktı 2x boyutlar: logo **360px/<60KB** · avatar **180px/<40KB** · el imzası **300px/<50KB**
- Uzun kenar max **600px**
- Şeffaflık varsa **PNG**, yoksa **JPG**
- Dosya adları **benzersiz ve değişmez** (ör. `a3f9c2e1b4d07f11.png`, 16 hex karakter) — bir kez üretilen URL asla değişmez

---

## E-posta HTML Kısıtları (en kritik teknik bölüm)

İmza HTML'i normal web HTML'i DEĞİLDİR. Outlook'un masaüstü sürümleri Word render motoru kullanır.

### Zorunlu
- **Table-based layout.** `<div>`, flexbox, grid, float **çalışmaz**
- **Tüm CSS inline.** `<style>` bloğuna veya harici CSS'e güvenme — kopyalanınca gelmez
- **Web-safe fontlar.** Custom font yüklenemez. Arial, Helvetica, Georgia, Times New Roman, Verdana, Tahoma, Trebuchet MS
- **PNG/JPG.** SVG desteklenmez (mevcut logo SVG — PNG'ye çevrilmeli). WebP kullanma
- **Retina:** 2x boyutta görsel yükle, HTML'de `width` attribute ile küçült
- **Max genişlik ~600px**

### Yasak
- `<div>` tabanlı yerleşim, flexbox, grid, float, position
- Harici stylesheet, `<style>` bloğuna bağımlılık
- SVG, WebP, video, JavaScript
- CSS değişkenleri, `calc()`, modern CSS özellikleri
- base64 gömülü görsel (Outlook eke çevirir)

### Dikkat edilecekler
- **Arka plan görseli** için VML fallback gerekir (`<v:rect>`)
- **Dark mode:** şeffaf PNG'de logo kaybolur. Kontur/padding stratejisi gerekir
- **Gmail clipping:** toplam HTML boyutu küçük tutulmalı
- **Outlook 2512** sürümünde imzalara istenmeyen tablo kenarlığı ekleme bug'ı var → `border="0"` ve `style="border:none"` her tabloda açıkça belirtilmeli

### Test matrisi (pazarlıksız)
Her şablon şu 6 istemcide doğrulanacak:
1. Outlook Classic (Windows) ← en çok bozulan, en kritik
2. Yeni Outlook / Outlook.com
3. Gmail web
4. Gmail mobil
5. Apple Mail (Mac)
6. iOS Mail

Test yöntemi: Windows Plesk sunucusuna RDP + Microsoft 365 lisansı.

### Export mekanizması
Kopyalama **`ClipboardItem` ile `text/html`** olarak yapılır:

```ts
new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
```

`clipboard.writeText()` KULLANMA — düz metin yapıştırır, imza görünmez, HTML kodu görünür.

Ayrıca `.htm` dosyası indirme seçeneği (Outlook Signatures klasörüne atmak için).

---

## Eski Koddan Ne Alınır, Ne Atılır

Eski dosyalar `_eski/` klasöründe.

### Al (referans olarak)
- **Alan yapısı** — `_eski/products.html` içindeki form alanları iyi düşünülmüş: ad, ünvan, şirket, telefon (2 adet), e-posta, web, adres, özel alanlar, CTA butonu, yasal metin, profil fotoğrafı, şirket logosu, el imzası
- **Adım adım builder akışı** (step tabs) — UX mantığı sağlam
- **Şablonların görsel fikirleri**

### At (tamamen)
- **`_eski/app.js` export mantığı.** `signature.outerHTML` + `clipboard.writeText()` — mimari olarak yanlış. İmza `<div>`/`<article>` ile kurulmuş, stiller harici CSS'te (8.694 satır `style.css`), kopyalanınca biçimsiz metin çıkıyor
- **Şablon sistemi.** Şablonlar CSS sınıfı (`template-1`, `template-2`) olarak yapılmış — export'ta hiç var olmuyorlar
- **`_eski/auth.js`.** localStorage demo'su, gerçek auth ile değiştirilecek
- **`style.css` ve `mailmyra-v2.css`** — CSS Modules + yeni tasarım dili gelecek (2026-07-28: Tailwind değil, bkz. §Stack)

---

## Şablon Motoru Nasıl Olmalı

Şablon bir CSS sınıfı DEĞİL, bağımsız bir modüldür:

```
packages/renderer/
  src/
    types.ts              # SignatureData
    render.ts             # ana giriş noktası
    templates/
      classic-horizontal.ts
      stacked-minimal.ts
      card-bordered.ts
    utils/
      table.ts            # table builder yardımcıları
      inline-style.ts
      color.ts
```

Her şablon `SignatureData` alır, tam bağımsız table-based HTML döndürür.
Böylece şablonlar sadece renk değil, **gerçek yapı** olarak farklılaşabilir:
yatay/dikey, logo solda/üstte, ayraçlı/ayraçsız, kartlı/kartsız.

---

## SignatureData Tipi

```ts
export interface SignatureData {
  identity: {
    fullName: string;
    jobTitle?: string;
    department?: string;
    company?: string;
  };

  contact: {
    email?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    address?: string;
  };

  visuals: {
    avatarUrl?: string;        // CDN URL, PNG/JPG, 2x
    logoUrl?: string;          // CDN URL, PNG/JPG, 2x
    handSignatureUrl?: string;
    brandColor: string;        // hex
    textColor: string;         // hex
    mutedColor: string;        // hex
    fontFamily: WebSafeFont;
  };

  social: Array<{
    platform: 'linkedin' | 'x' | 'instagram' | 'facebook' | 'youtube' | 'github' | 'behance' | 'dribbble';
    url: string;
  }>;

  extras?: {
    ctaLabel?: string;
    ctaUrl?: string;
    disclaimer?: string;       // yasal metin
    customFields?: Array<{ label: string; value: string; url?: string }>;
  };

  layout: {
    templateId: string;
    size: 'small' | 'medium' | 'large';
    iconStyle: 'filled' | 'outline' | 'mono';
    showDividers: boolean;
  };
}

export type WebSafeFont =
  | 'Arial, Helvetica, sans-serif'
  | 'Georgia, serif'
  | 'Times New Roman, serif'
  | 'Verdana, Geneva, sans-serif'
  | 'Tahoma, Geneva, sans-serif'
  | 'Trebuchet MS, sans-serif';
```

---

## 4 Haftalık Plan

| Hafta | İş | Kontrol noktası |
|---|---|---|
| **1** | Repo + `SignatureData` + renderer çekirdeği + 1 şablon + test sayfası (`/dev/render`) | Tek imza 6 istemcide kusursuz. **Değilse Hafta 2'ye geçme** |
| **2** | Builder arayüzü, canlı önizleme, görsel yükleme + CDN, export akışı | Kullanıcı sıfırdan imza üretip kopyalayabiliyor |
| **3** | Tasarım dili, landing (hero'da canlı builder), şablon 2–3, galeri, fiyat sayfası, ajans sayfası | Site yayına hazır |
| **4** | Auth, organizasyon + koltuk modeli, kayıtlı imzalar, **merkezi şablon uygulama**, CSV toplu içe/dışa aktarma, KVKK metinleri | Satılabilir MVP |

**En büyük risk:** Outlook render düzeltmeleri 1 haftayı aşabilir. Aşarsa şablon sayısını 2'ye düşür, plan 5 haftaya kayar. Bu normaldir, panik yapma.

---

## Site Yapısı

**Halka açık:** Ana sayfa · Nasıl çalışır · Şablon galerisi (her şablon ayrı URL) · Fiyatlandırma · Ajanslar için · Kurumsal için · Kurulum rehberleri (Outlook, Gmail, Apple Mail, iPhone) · SSS · Blog (yapı kurulur, yazılar sonra) · İletişim · KVKK/Gizlilik/Şartlar

**Uygulama:** Kayıt/Giriş · Builder · İmzalarım · Organizasyon (koltuklar, davetler, roller) · Marka ayarları (merkezi şablon) · Hesap ve plan

Kurulum rehberleri öncelikli: hem en çok aranan SEO içeriği hem destek yükünü düşürür.

---

## YAPILMAYACAKLAR (bağlayıcı)

- ❌ Otomatik abonelik, kart saklama, orantılı faturalama → 20+ müşteride
- ❌ Kampanya/kupon motoru → kademeli fiyat elle uygulanır
- ❌ Google Workspace / Entra ID directory sync
- ❌ Outlook eklentisi, server-side transport rule
- ❌ İmza analitiği, tıklama takibi, banner kampanyaları
- ❌ Onay akışları, public API, AI imza üretimi
- ❌ Blog yazıları → lansmandan sonra
- ❌ 3'ten fazla şablon → motor oturunca seri üretilir
- ❌ Bootstrap, hazır tema

Kapsam şişmesi bu projenin bir numaralı ölüm sebebidir. Yeni özellik önerisi gelirse bu listeye bak.

---

## Çalışma Tarzı

- Hüseyin kararları verir, sen kodu yazarsın, o onaylar
- Bir şey belirsizse **tahmin etme, sor**
- Gözden kaçan bir risk görürsen söylemeden geçme
- Küçük ve test edilebilir adımlarla ilerle
- Her hafta sonunda çalışan bir şey olsun
