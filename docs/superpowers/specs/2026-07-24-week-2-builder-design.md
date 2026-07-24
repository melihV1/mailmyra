# Hafta 2 — Builder + Görsel Boru Hattı + Export Kapısı

**Tarih:** 2026-07-24
**Durum:** Onaylandı (Hüseyin)
**Kapsam:** Mailmyra 4 haftalık planın 2. haftası

---

## Amaç

Kullanıcının sıfırdan imza üretebildiği step-tab builder'ı, canlı önizlemeyi,
görsel yükleme + CDN boru hattını ve export akışını kurmak.

**Kontrol noktası:** Kullanıcı sıfırdan imza üretip kopyalayabiliyor.
(Doğrulama dev ortamında `EXPORT_REQUIRES_AUTH=false` ile yapılır; üretimde
kapı açık olacak.)

---

## Onaylanan Kararlar (bu spec'te kilitlendi)

| Karar | Seçim |
|---|---|
| CDN | `cdn.mailmyra.com` hazır; **Cloudflare YOK** (CLAUDE.md güncellendi) |
| CDN yazma | Aynı abonelik, uygulama belge köküne doğrudan yazar; `CDN_WRITE_PATH` + `CDN_PUBLIC_URL` env'den; adapter arayüzü korunur, dev'de yerel klasör |
| Görsel politikası | CLAUDE.md "Görsel Boyut Politikası" birebir (5MB, PNG/JPG/SVG kabul, SVG→PNG, 2x hedefler, bütçeler, hash isim) |
| Bütçe aşımı | **Kabul et + uyar** (reddetme) |
| Builder adımları | 4 adım: Bilgiler · Görseller · Sosyal · Stil — serbest gezinme, yalnızca ad zorunlu |
| Form state | Tek `SignatureData`, `useReducer`; form kütüphanesi yok |
| Taslak | localStorage; **yalnızca form metni + görsel URL'leri (asla base64)**; `savedAt` ile **30 gün** sonra otomatik temizlik; görünür "Taslak kaydedildi" + "Temizle / sıfırdan başla" |
| İş modeli | **Ücretsiz plan yok.** Export giriş + ödeme gerektirir; `EXPORT_REQUIRES_AUTH=true\|false` bayrağı (CLAUDE.md güncellendi) |
| Upload koruması | IP başına saatlik limit + toplam disk kotası — auth'suz, bu hafta |
| SVG belleği | sharp `limitInputPixels` ile koruma |
| Yetim dosyalar | TTL tabanlı temizlik script'i (aşağıda plan) |
| Mobil | Düzenle / Önizle sekme geçişi (aşağıda detay) |
| Harness düzeltmesi | Hafta 1 iframe üst-satır kırpılması giderilecek |

---

## Yapı

```
apps/web/
  app/
    builder/
      page.tsx                # /builder — düzen: form + önizleme
      BuilderClient.tsx       # client: state (useReducer), adım gezinme, taslak
      Preview.tsx             # client: iframe srcDoc önizleme (açık/koyu toggle)
      steps/
        InfoStep.tsx          # kimlik + iletişim + özel alanlar + CTA + yasal
        VisualsStep.tsx       # avatar/logo/el imzası yükleme + yükleme durumu
        SocialStep.tsx        # sosyal platform + URL listesi
        StyleStep.tsx         # renkler, font, boyut, ayraç, ikon stili + kontrast uyarısı
    login/
      page.tsx                # placeholder "Giriş yap" ekranı (H4'te gerçek auth)
    api/upload/route.ts       # POST — doğrula → işle → kaydet
    dev/render/               # mevcut harness (iframe düzeltmesi uygulanır)
  lib/
    storage.ts                # StorageAdapter + FsStorageAdapter
    image-pipeline.ts         # sharp: doğrulama, dönüşüm, sıkıştırma, adlandırma
    rate-limit.ts             # IP başına saatlik pencere (bellek içi)
    draft.ts                  # localStorage taslak: kaydet/yükle/expiry/temizle
    export-gate.ts            # EXPORT_REQUIRES_AUTH okuma (server → client prop)
  components/
    ExportButtons.tsx         # harness'tan taşınır; kapı davranışı eklenir
  scripts/
    cleanup-orphans.ts        # TTL tabanlı yetim dosya temizliği
packages/renderer/
  src/utils/color.ts          # + contrastRatio(a, b): number (saf, test edilir)
```

---

## Görsel Boru Hattı — `POST /api/upload`

**Girdi:** multipart form — `file` + `kind: logo | avatar | handSignature`

**Doğrulama sırası (hepsi Türkçe hata mesajıyla):**
1. Rate limit: IP başına saatte `UPLOAD_RATE_LIMIT_PER_HOUR` (varsayılan 20) → aşımda **429**
2. Disk kotası: `CDN_WRITE_PATH` toplamı `CDN_DISK_QUOTA_MB` (varsayılan 5120) üstündeyse → **507**
3. Boyut ≤ 5MB → aşımda **413**
4. MIME + magic-byte kontrolü: PNG/JPG/SVG kabul; WebP/GIF ve diğer her şey → **400**

**İşleme (sharp):**
- `limitInputPixels: 4096 * 4096` — dev boyutlu/bombalı girdi (özellikle SVG) belleği patlatamaz; aşımda **400** "Görsel boyutları çok büyük"
- SVG → PNG rasterize (çıktıda asla SVG olmaz)
- Kind hedefine ölçekle (2x): logo **360px** · avatar **180px** · el imzası **300px** (uzun kenar; ≤600px garantisi bu hedeflerin doğal sonucu)
- Alfa kanalı var → PNG, yok → JPG
- Bütçe hedefi: logo <60KB · avatar <40KB · el imzası <50KB. JPG'de kalite kademeli düşürülür (80→60→40), PNG'de `compressionLevel: 9` + `palette: true`. Bütçeye sığmazsa **en yakın sonuç kaydedilir**, response'ta `warning` alanı döner ("önerilen boyutu aşıyor, e-postaları yavaşlatabilir").

**Adlandırma:** çıktı buffer'ının SHA-256 hash'inden ilk 16 hex + uzantı
(`a3f9c2e1b4d07f11.png`) — içerik-adresli: benzersiz, değişmez, aynı içerik aynı URL
(bedava dedup). (Final review dalgası, 2026-07-24: 8 → 16 hex — `storage.ts`
artık aynı dosya adında farklı içerik gördüğünde reddediyor, 16 hex bu
çakışma riskini üretim ölçeğinde pratikte ortadan kaldırıyor.)

**Depolama:** `StorageAdapter.save(filename, buffer): Promise<{ url }>`
- Tek implementasyon: `FsStorageAdapter` — `CDN_WRITE_PATH`'e yazar, URL'yi `CDN_PUBLIC_URL`'den kurar
- Dev `.env.local`: `CDN_WRITE_PATH=./public/cdn-dev`, `CDN_PUBLIC_URL=http://localhost:3000/cdn-dev` (Next public'i kendisi servis eder)
- Prod: Plesk'te cdn.mailmyra.com belge kökü + `https://cdn.mailmyra.com`

**Response:** `{ url, width, height, bytes, warning? }`

### Rate limiter notu
Bellek içi sabit pencere (IP → saat başına sayaç). Tek Node süreci varsayımı —
Plesk'te tek instance çalışacak; çoklu instance gelirse (öngörülmüyor) Redis'e
geçilir. Bu sınırlama spec'e bilinçli kayıt edilir.

---

## Yetim Dosya Temizliği — Plan

**Sorun:** İmzaya bağlanmayan yüklemeler diski doldurur. Ama CLAUDE.md kuralı:
üretilen URL **asla değişmez** — sahadaki imzaların görselleri silinemez.

**Hafta 2 (lansmandan önce, kapı açıkken):**
- `scripts/cleanup-orphans.ts`: `CDN_WRITE_PATH`'te mtime'ı `ORPHAN_TTL_DAYS`
  (varsayılan 7) günden eski dosyaları siler.
- **Yalnızca elle çalıştırılır — cron'a bağlanmaz.** `--dry-run` bayrağı
  vardır: hiçbir şey silmez, silinecek dosyaları listeler. Standart prosedür:
  önce `--dry-run`, çıktı incelenir, sonra gerçek çalıştırma.
- Bu dönemde export kapısı açık olduğundan hiçbir imza sahaya çıkmış olamaz —
  TTL silmesi güvenlidir.

**Hafta 4 (DB gelince, lansman ÖNCESİ zorunlu geçiş):**
- Kayıtlı imzalar görsel URL'lerini DB'de referanslar. Script yalnızca
  **hiçbir imzada referansı olmayan** VE TTL'i geçmiş dosyaları siler.
- Lansmandan sonra referanslı dosya silmek kalıcı olarak yasak.

---

## Builder — `/builder`

**Düzen (desktop ≥1024px):** solda adım sekmeleri + form, sağda sabit önizleme
paneli. Önizleme her state değişiminde `renderSignature` (client-side, saf
fonksiyon) → iframe `srcDoc`. Açık/koyu zemin toggle'ı.

**Mobil (<1024px):** üstte iki sekme — **Düzenle / Önizle**. Düzenle: adımlar
tam genişlik. Önizle: imza + export butonları tam ekran. Kullanıcı sekmeyle
gidip gelir; state ortak.

**Adımlar (serbest gezinme, yalnızca `fullName` zorunlu):**
1. **Bilgiler** — ad*, ünvan, departman, şirket · e-posta, telefon, mobil, web, adres · özel alanlar (etiket+değer+URL, ekle/sil) · CTA (etiket+URL) · yasal metin
2. **Görseller** — avatar / logo / el imzası: dosya seç → `/api/upload` → dönen URL state'e; yükleme sırasında spinner, hata/uyarı gösterimi; kaldır butonu
3. **Sosyal** — platform seç + URL, ekle/sil, sırala (yukarı/aşağı)
4. **Stil** — brand/text/muted renk seçiciler, font (WebSafeFont listesi), boyut (S/M/L), ayraç aç/kapa, ikon stili (Hafta 2'de görsel etkisi yok — metin-link; seçim saklanır)

**Kontrast uyarısı (Stil adımında):** iki zemine karşı kontrol edilir —
açık `#ffffff` ve koyu `#1a1a1a` (Hafta 1'de görülen sorun koyu zemindeydi;
alıcı e-postayı dark mode'da açabilir). Eşikler:
- `textColor`: oran **< 4.5** ise uyar (WCAG küçük metin asgarisi)
- `mutedColor`: oran **< 3** ise uyar

Hangi zemin başarısızsa mesaj onu söyler: "Bu renkler beyaz zeminde zor
okunur" / "Bu renkler koyu zeminde (dark mode) zor okunur". Engellemez,
sadece uyarır. `contrastRatio(a, b)` `packages/renderer/src/utils/color.ts`'e
eklenir (WCAG formülü, saf, test edilir).

**Taslak (lib/draft.ts):**
- Şekil: `{ version: 1, savedAt: epoch_ms, data: SignatureData }`
- Her değişiklikte 500ms debounce ile yaz; yazım sonrası "Taslak kaydedildi ✓"
  göstergesi (2sn görünür)
- Açılışta: varsa yükle; `savedAt` 30 günden eskiyse sil ve boş başla
- **Asla base64 içermez** — `data:` ile başlayan herhangi bir URL alanı yazım
  sırasında atlanır (savunma hattı; normal akışta URL'ler zaten CDN'den gelir)
- "Temizle / sıfırdan başla" butonu: onay sorusu → localStorage temizle + boş state

---

## Export Kapısı ve Export Akışı

**Bayrak:** `EXPORT_REQUIRES_AUTH` (server env; page.tsx server component'te
okunur, client'a prop geçilir; varsayılan `true`).

- **Kapı açık (true):** Export butonları görünür; tıklanınca `/login`'e
  yönlendirir. `/login` Hafta 2'de placeholder: marka logosu + "Export için
  giriş gerekli. Hesaplar çok yakında." metni. Hafta 4'te gerçek auth buraya gelir.
- **Kapı kapalı (false):** Butonlar doğrudan çalışır (dev/test ve kontrol
  noktası doğrulaması bu moddadır).

**Export mekanikleri** (harness'tan `components/ExportButtons.tsx`'e taşınır):
- **HTML kopyala:** `ClipboardItem` + `text/html` Blob (CLAUDE.md kuralı)
- **.htm indir:** tam doküman sarmalayıcı + Blob download
- Butonlar önizlemenin altında her zaman görünür (son adıma saklanmaz)

---

## Dev Harness Düzeltmesi

Hafta 1 gözlemi: `/dev/render` iframe'lerinde üst satır kırpılabiliyordu.
Düzeltme: sarmalayıcı body'ye yeterli üst padding + iframe'e `scrolling`
davranışının açık bırakılması; kök sebep implementasyonda doğrulanır
(systematic-debugging ile reproduce → fix). Aynı sarmalayıcı Builder
`Preview.tsx`'te de kullanılır (tek `wrapPreviewDoc` yardımcı fonksiyonu).

---

## Test Stratejisi (TDD — testler önce)

**packages/renderer:**
- `contrastRatio`: bilinen WCAG çiftleri (siyah/beyaz=21, aynı renk=1, #719ad1/beyaz)

**apps/web (vitest eklenir):**
- `image-pipeline`:
  - ret: WebP → 400, GIF → 400, 6MB → 413, 5000×5000 SVG → 400 (limitInputPixels)
  - SVG girdi → PNG çıktı
  - kind hedef boyutları (logo 360, avatar 180, imza 300; uzun kenar)
  - alfalı girdi → PNG, alfasız → JPG
  - bütçe aşımı → `warning` alanı dolu, dosya yine kaydedilmiş
  - hash adlandırma: aynı içerik aynı isim, farklı içerik farklı isim
- `storage`: FsAdapter geçici klasöre yazar, URL `CDN_PUBLIC_URL`'den kurulur
- `rate-limit`: pencere içinde N+1'inci istek reddedilir, pencere geçince sıfırlanır
- `draft`: round-trip · 30 gün expiry · `data:` URL yazılmıyor · temizle
- `export-gate`: bayrak true/false davranışı
- `cleanup-orphans`: TTL'den eski dosya silinir, yenisi kalır · `--dry-run`
  hiçbir dosyayı silmez ama listeler

**Manuel (tarayıcı):** builder akışı uçtan uca — doldur → yükle → önizle →
(kapı kapalıyken) kopyala/indir; mobil genişlikte Düzenle/Önizle geçişi.

---

## Env Değişkenleri (özet)

| Değişken | Dev varsayılan | Prod |
|---|---|---|
| `CDN_WRITE_PATH` | `./public/cdn-dev` | Plesk cdn belge kökü |
| `CDN_PUBLIC_URL` | `http://localhost:3000/cdn-dev` | `https://cdn.mailmyra.com` |
| `EXPORT_REQUIRES_AUTH` | `false` (dev) | `true` |
| `UPLOAD_RATE_LIMIT_PER_HOUR` | `20` | `20` |
| `CDN_DISK_QUOTA_MB` | `5120` | `5120` |
| `ORPHAN_TTL_DAYS` | `7` | `7` |

`.env.example` repoya girer; `.env.local` gitignore'da.

---

## Hafta 2 Sınırları (bilinçli YOK'lar)

- Auth, DB, kayıtlı imzalar → Hafta 4 (`/login` sadece placeholder)
- Yeni şablon → Outlook Classic testi geçene dek yasak (kayıtlı karar)
- Şablon galerisi, landing, fiyat sayfası → Hafta 3
- Görsel kırpma/döndürme UI'ı, çoklu dil, Redis tabanlı rate limit
- Sosyal ikon PNG'leri (CDN'e statik ikon seti koymak) → şablon ikon stiliyle
  birlikte ele alınacak; bu hafta metin-link devam
