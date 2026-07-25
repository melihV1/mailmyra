# Hafta 2 Sonrası Düzeltmeler — Renkler, Yerleşim, Sosyal İkonlar

**Tarih:** 2026-07-25
**Durum:** Onaylandı (Hüseyin)
**Branch:** `feat/week-2-builder` üstünde devam (merge, 6-istemci testi geçene dek YOK)

---

## Amaç

Telefon testi bulgularını ve renk varsayılanı kararlarını uygulamak:
metin rengi varsayılanları, classic-horizontal yerleşim güncellemesi
(logo + el imzası), sosyal ikon PNG boru hattı. Sonunda tek turda
6-istemci testine (Outlook Classic dahil) hazır çıktılar üretmek.

---

## Onaylanan Kararlar

| Karar | Seçim |
|---|---|
| Varsayılan renkler | `textColor #333333` · `mutedColor #666666` (brand `#719ad1` kalır) |
| Kontrast mantığı | İki bağımsız kontrol: açık-zemin oranı + saf-siyah tabanı (aşağıda) |
| Logo yerleşimi | Sol sütunda avatarın ALTINA (yalnız classic-horizontal) |
| El imzası | En alt satır, gizlilik notunun SAĞINA (yalnız classic-horizontal) |
| İkon kaynağı | Simple Icons (açık kaynak), 8 platform |
| İkon varyantları | filled: marka renkli yuvarlatılmış kare + beyaz glif · outline: şeffaf + platform renkli glif · mono: şeffaf + kullanıcı brandColor glif |
| Mono üretimi | On-demand + CDN'e kalıcı yazım + dedup; beyaza-yakın renkte otomatik `#666666` glif |
| İkon guardrail | İkon `<img>`'lerinde `width` VE `height` attribute ZORUNLU (Outlook) |
| Export güvenliği | Mono ikonlar hazır olmadan export edilemez — kopyalanan HTML'de asla henüz-yazılmamış ikon URL'i olamaz |
| Renderer API | `renderSignature(data, templateId, opts?)` — geriye uyumlu; `opts.iconBaseUrl` yoksa metin-link |

---

## 1. Renk Varsayılanları + Kontrast

- `createEmptyData()`: `textColor: '#333333'`, `mutedColor: '#666666'`.
- Fixture'lar: `textColor` → `#333333` (muted `#6d6e71` kalır — makul bant).
- `contrastWarnings(visuals)` yeniden yazılır — iki bağımsız kontrol:
  1. **Çok açık:** `contrastRatio(renk, '#ffffff') < 4.5` (textColor) /
     `< 3` (mutedColor) → "… beyaz zeminde zor okunur."
  2. **Saf siyaha yakın:** `contrastRatio(renk, '#000000') < 1.2`
     (≈ #000–#111 bandı) → "… saf siyaha çok yakın; koyu modda sorun
     çıkarabilir." Yeni util gerekmez.
- Susması gerekenler: `#333333`, `#666666`, `#1a1a1a`. Uyarması
  gerekenler: `#000000`, `#ffffff`, açık griler (ör. `#cccccc`).
- `contrast-warnings.test.ts` yeni mantığa göre güncellenir (yukarıdaki
  altı renk açıkça test edilir).

## 2. classic-horizontal Yerleşimi

**Yalnız bu şablona özgü kararlar — backlog'a not düşülür** (gelecek
şablonlar kendi yerleşimini seçer).

- **Sol sütun:** avatar üstte; `logoUrl` varsa avatarın altına ikinci
  `<img>` (aralarında ~8px dikey boşluk). Yalnız biri varsa o gösterilir
  (mevcut `??` önceliği kalkar — iki ayrı slot). İkisi de yoksa sütun yok
  (mevcut davranış).
- **Logo boyutu:** görünüm genişliği = kolon genişliği (`s.avatar`),
  `width` attribute + inline `width` style; `height` BELİRTİLMEZ (oran
  bilinmiyor — `SignatureData` boyut saklamıyor). Bilinen risk: Outlook
  width-only ölçeklemeyi genelde doğru yapar; 6-istemci testinde logo
  özellikle kontrol edilir. Sorun çıkarsa Hafta 4'te `visuals`'a boyut
  alanı eklenir (tip değişikliği + draft migrasyonu).
- **El imzası:** içerik tablosunun en altına yeni satır — 2 hücre:
  sol: disclaimer (mevcut stil), sağ: `handSignatureUrl` `<img>`
  (görünüm ~150px genişlik / 2x kaynak 300px, sağa hizalı, `width`
  attribute). Disclaimer yoksa imza tek hücrede sağa hizalı. İmza yoksa
  mevcut disclaimer davranışı.
- Şablon içerik testleri güncellenir: logo+avatar birlikte render;
  el imzası satırı var/yok durumları.

## 3. Sosyal İkon Boru Hattı

### 3a. Statik üretim — `apps/web/scripts/generate-icons.ts`
- Bağımlılık: `simple-icons` (devDep, apps/web). Glif SVG path'leri ve
  platform marka hex'leri bu paketten.
- 8 platform: linkedin, x, instagram, facebook, youtube, github,
  behance, dribbble.
- Çıktı (48×48 PNG, 2x retina; HTML'de 24×24 kullanılır):
  - `<CDN_WRITE_PATH>/icons/filled/<platform>.png` — platform marka
    renkli yuvarlatılmış kare (radius ~10px) + beyaz glif
  - `<CDN_WRITE_PATH>/icons/outline/<platform>.png` — şeffaf zemin +
    platform marka renkli glif
- Elle çalıştırılır (`corepack pnpm --filter web icons`); deploy
  prosedürünün parçası. Var olan dosya yeniden yazılmaz (değişmezlik).

### 3b. Mono on-demand — `POST /api/icons/mono`
- Girdi: `{ color: string }` (hex). Doğrulama: geçerli hex değilse 400.
- Çıktı yolu: `<CDN_WRITE_PATH>/icons/mono-<hex6>/<platform>.png`
  (8 dosya). `hex6` küçük harf, `#`'siz.
- **Kontrast düşüşü:** `contrastRatio(color, '#ffffff') < 3` ise glif
  rengi `#666666` basılır; yol yine `mono-<orijinalhex>/` (URL
  deterministik kalır). Response: `{ ready: true, degraded?: true }`.
  `degraded` dönerse builder Stil adımında bilgi notu gösterir:
  "Marka rengin açık olduğu için mono ikonlar koyu gri basıldı."
- **Dedup:** tüm dosyalar mevcutsa üretim atlanır (`wx` + exists-skip
  zaten var); response yine `ready: true`.
- Rate limit: mevcut upload limiter'ından AYRI, daha cömert bir bellek
  içi limiter (ör. 60/saat/IP) — renk denemeleri normal kullanım.
- `cleanup-orphans` `icons/` alt klasörlerine dokunmaz (yalnız kök
  dosyaları tarar — mevcut davranış, test edilmiş).

### 3c. Renderer değişikliği (geriye uyumlu)
- `renderSignature(data, templateId, opts?: RenderOptions)`;
  `RenderOptions = { iconBaseUrl?: string }`. Şablon fonksiyon imzası da
  `(data, opts?)` olur; dispatch iletir.
- `iconBaseUrl` YOKSA: mevcut metin-link davranışı (eski testler geçer).
- VARSA: sosyaller `<a><img src="${iconBaseUrl}/icons/<varyant>/<platform>.png"
  width="24" height="24" alt="<Platform>" border="0" style="...border:none;display:inline-block" /></a>`
  olarak basılır; ikonlar arası ~8px boşluk. Varyant yolu `layout.iconStyle`'dan:
  `filled` → `filled/` · `outline` → `outline/` · `mono` →
  `mono-<brandColor hex6>/`.
- **Guardrail (yeni, pazarlıksız):** src'si `/icons/` içeren her `<img>`
  `width` VE `height` attribute taşımak ZORUNDA (Outlook dış boyutu
  height'sız tanımaz). Guardrail testine eklenir; genel "her img width
  taşır" kuralı da kalır. Guardrail suite'i her şablon×fixture için
  **iki modda** koşar: `iconBaseUrl`'süz (metin-link) VE `iconBaseUrl`'lü
  (ikonlu) — ikon `<img>` kuralları ancak ikinci modda tetiklenir.

### 3d. Builder entegrasyonu + export güvenliği
- `iconBaseUrl` server'dan prop olarak iner (`page.tsx` →
  `CDN_PUBLIC_URL` değeri; export-gate deseniyle aynı).
- Önizleme `renderSignature(data, id, { iconBaseUrl })` kullanır.
- **İkon hazırlık durumu (BuilderClient state):**
  - `iconStyle === 'mono'` iken: brandColor veya iconStyle her
    değiştiğinde (500ms debounce) `POST /api/icons/mono` çağrılır;
    dönene kadar `iconsPending = true`.
  - `iconsPending || istek başarısız` iken export butonları DEVRE DIŞI +
    "İkonlar hazırlanıyor…" metni (başarısızlıkta "İkonlar üretilemedi —
    tekrar deneyin" + yeniden dene). **Kopyalanan HTML'de asla
    henüz-yazılmamış ikon URL'i olamaz.**
  - `iconStyle !== 'mono'` veya `social` boşsa export gating yok
    (filled/outline deploy-time statik; dev kurulumunda script bir kez
    çalıştırılır — plan adımı).
- `ExportButtons` yeni prop'lar: `disabled?: boolean`,
  `disabledNote?: string` (harness `disabled` geçmez).

## 4. Fixture + Test Hazırlığı

- Fixture güncellemeleri: `full` fixture'a `logoUrl` ve
  `handSignatureUrl` eklenir (placeholder URL); yeni fixture GEREKMEZ
  (noLogo zaten görselsüz durumu kapsar). Fixture'lar `textColor #333333`.
- `emit-htm.ts`: `renderSignature`'a `iconBaseUrl` olarak
  `https://cdn.mailmyra.com` geçer — .htm çıktıları GERÇEK CDN ikon
  URL'leriyle üretilir (test öncesi ikonların gerçek CDN'e yüklenmesi
  deploy adımı olarak nota düşülür).
- `/dev/render` harness'ı da `iconBaseUrl` ile render eder (dev'de
  yerel `cdn-dev/icons/`).
- **Kontrol noktası:** 4 fixture × classic-horizontal .htm çıktısı +
  ikonlar CDN'de → Hüseyin 6 istemcide test eder (Outlook Classic
  DAHİL). Test geçmeden merge yok.

---

## Kapsam Dışı (bilinçli)

- Yeni şablon yok (Outlook Classic kuralı sürüyor).
- `SignatureData`'ya görsel boyut alanları → Hafta 4 (gerekirse).
- İkon seti dışında sosyal platform ekleme yok.
- Sosyal adıma "ikonlar yakında" notu → bu iş bitince zaten ikonlar
  gelmiş olacak, nota gerek kalmadı.
