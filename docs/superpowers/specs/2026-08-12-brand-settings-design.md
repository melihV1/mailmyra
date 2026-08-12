# Marka Ayarları (Merkezi Şablon) — Tasarım

Tarih: 2026-08-12 · Onay: Hüseyin (aynı gün, bölüm bölüm; dosya incelemesi
Hüseyin'in isteğiyle atlandı — bölüm onayları esas)
Kapsam: Faz 3b. Faz 3a (toplu zip export) canlıda; bu tur ona dokunmaz,
yalnız `collectExportBundle`'a bindirme adımı ekler.

## 1. Amaç ve bugünkü zemin

Panel brief §2.9: org genelinde tek imza sistemi — `/app/brand`, solda
ayarlar sağda canlı önizleme, alan başına kilit anahtarı, kaydetmede etki
diyaloğu. Rol matrisi: Marka ayarları owner+admin (core'da `brand:manage`
anahtarı Faz 1'den beri TANIMLI — yeni izin gerekmez).

Bu tura katılan backlog borçları: ① ortak diyalog bileşeni (zip diyaloğu
odak/Escape eksiği + publish `window.confirm`'ü) ② `Signature.templateId`
kolonunun `saveSignature`'da yazılmaması.

## 2. Bugün verilen kararlar (Hüseyin)

| Karar | Seçim |
|---|---|
| Kilitlenebilir alanlar | **Tüm marka alanları** — şablon · marka/metin/soluk renk · yazı tipi · logo · CTA · yasal metin. Kimlik/iletişim alanları ASLA (kişiye özel) |
| Uygulama semantiği | **Render anında bindirme (overlay)** — yaklaşım A; write-through ve karışık elenmiş |
| Marka kaydı biçimi | `Signature.data` emsali: **tek JSON belge** (değer + mod bir arada) |

## 3. Veri modeli

```prisma
model BrandSetting {
  id        String   @id @default(cuid())
  orgId     String   @unique          // org başına tek kayıt
  data      Json                      // bütün belge okunur/yazılır
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}
```

İlk şema değişikliği (Faz 2'den beri): deploy'da `migrate deploy` +
`generate` ritüeli geri gelir.

Belge şekli — her alan İSTEĞE BAĞLI `{ value, mode }`:

```ts
type BrandMode = 'locked' | 'default';
interface BrandField<T> { value: T; mode: BrandMode }
interface BrandDocument {
  templateId?: BrandField<string>;
  brandColor?: BrandField<string>;   // hex
  textColor?:  BrandField<string>;
  mutedColor?: BrandField<string>;
  fontFamily?: BrandField<WebSafeFont>;
  logoUrl?:    BrandField<string>;   // CDN URL
  cta?:        BrandField<{ label: string; url: string }>; // TEK birim
  disclaimer?: BrandField<string>;
}
```

- Alan belgede YOKSA org o alanı yönetmiyordur — builder serbest.
  (Üçüncü bir "yönetme" modu icat edilmez; yokluk zaten o.)
- Kayıt hiç yoksa marka kurulmamış — her tüketici boş belge gibi okur.
- `cta` label+url tek birim: yarım kilitli CTA anlamsız.

Saf taşıyıcılar (apps/web/lib, birim testli):
- `applyBrand(data, brand)` → yalnız `mode: 'locked'` alanları
  `SignatureData` yollarına bindirir: `visuals.brandColor/textColor/
  mutedColor/fontFamily/logoUrl` · `layout.templateId` ·
  `extras.ctaLabel+ctaUrl` · `extras.disclaimer`. Marka yoksa kimlik
  fonksiyonu. Kayıtlı veri DEĞİŞMEZ — bindirme çıktıya işler; kilit
  kalkınca kişisel değer geri görünür.
- `seedBrandDefaults(brand)` → YENİ imza yaratılırken hem kilitli hem
  varsayılan değerleri tohumlar (kullanıcı markada başlar; varsayılanı
  değiştirebilir, kilitli zaten pasif).

Repo: `lib/repo/brand.ts` — `getBrand(orgId)` (yoksa null) + `saveBrandAs`
(rol sargısı `brand:manage`; org başına upsert).

## 4. Zorlamanın gerçek yeri

Kilitli input UX'tir; **zorlama bindirmenin kendisidir** — `applyBrand`
her render ÇIKIŞINDA koşar, kayıtta marka-dışı değer dursa bile çıktı
markalıdır. Kayıt anında ayrıca doğrulama yapılmaz (gerekmez). Çıkışlar:

1. **Panel builder'ı** (kayıtlı imza): sayfa markayı çekip `BuilderClient`'a
   verir; önizleme `renderSignature(applyBrand(data, brand), …)`. Kilitli
   alan kontrolleri pasif + kilit ikonu + "Marka ayarlarından yönetiliyor"
   (metin builder'ın bugünkü diliyle Türkçe; İngilizce göçü ayrı borç).
2. **Yeni imza:** başlangıç verisi `seedBrandDefaults(brand)`.
3. **Tekli .htm/kopyala:** builder çıktısı zaten bindirilmiş —
   `ExportButtons` kendiliğinden doğru.
4. **Zip export:** `collectExportBundle` render öncesi `applyBrand` uygular.
5. **Anonim /builder:** org yok, marka yok — davranış aynen bugünkü.

`templateId` düzeltmesi bu turda: `saveSignature` kolonu
`data.layout.templateId`'den yazar (kolon HAM veriyi yansıtır; bindirme
yalnız çıktıya işler).

## 5. Marka ekranı (`/app/brand`)

- Yalnız owner/admin (sunucuda rol kontrolü; nav'da gizlemek süs).
- Sol sütun: 8 alan satırı — kontrol + üç konumlu mod anahtarı
  **Not managed / Default / Locked**. Renk kontrolleri builder deseni +
  `contrastWarnings` notları; logo mevcut CDN yükleme borusu (değişmez URL
  politikası); şablon seçici bugün dürüstçe tek seçenek.
- Sağ sütun: builder'ın `Preview` bileşeni aynen (iframe, açık/koyu zemin,
  koyu-zemin notu). İçerik: sabit örnek kimliğe `seedBrandDefaults` +
  `applyBrand` uygulanmış gerçek renderer çıktısı.
- **Autosave YOK (bilinçli):** kayıt anı yayındaki imzaları etkiler —
  tek "Save brand settings" düğmesi → etki diyaloğu → `POST /api/brand`.
  Vazgeçilirse hiçbir şey yazılmaz.

## 6. API ve diyaloglar

`POST /api/brand` — gövde `{ data: BrandDocument }`. Doğrulama SIKI
(imza kaydının aksine; belge org genelini yönetir): mod enum'da mı, renk
geçerli hex mi, font web-safe listesinde mi, CTA/logo URL şekli düzgün mü,
bilinmeyen anahtar yok mu → değilse `400 invalid_input` · rol `403` ·
oturumsuz `401`. Okuma ucu YOK — sayfa server component, repo'dan okur.

Etki diyaloğu (POST'tan önce):

> **Save brand settings**
> This will affect **13 live signatures**.
> Changes apply from the next export — e-mails already sent do not change.
> [Cancel] [Save]

Sayı = yayındaki göndericilere atanmış imza adedi; sayfa render'ında
sunucudan gelir (zip diyaloğu ilkesi: ekrandaki bilgiden türet, ayrı "say"
ucu yok; kayıt sayıya bağlı değil, cümle bilgilendirme).

**Ortak diyalog bileşeni** `components/ui/ConfirmDialog.tsx` — odak
tuzağı, Escape, `aria-modal`, tek stil. Üç kullanıcı: ① etki diyaloğu
② SenderTable zip diyaloğu (taşınır; odak/Escape borcu kapanır)
③ publish onayı (`window.confirm` → gerçek diyalog; rakamlı metin aynı).

## 7. Test planı

- **Birim:** `applyBrand` (kilitli her yola bindirir · default bindirmez ·
  yok olan alan dokunmaz · marka yoksa kimlik · kilit kalkınca kişisel
  değer geri) · `seedBrandDefaults` (kilitli+varsayılan tohum, yönetilmeyen
  boş) · doğrulama bekçisi (geçerli geçer; bozuk hex/mod/font/URL/yabancı
  anahtar tek tek reddedilir).
- **DB (`test-db/brand.test.ts`):** rol kapısı (owner/admin ✓,
  editor/viewer ✗) · org başına tek satır upsert · `getBrand` yoksa null ·
  uçtan uca: kilitli `brandColor`'lı org'da `collectExportBundle` çıktısı
  marka rengini içerir, kişisel rengi içermez · `saveSignature` templateId
  kolonunu yazar (regresyon).
- **Tarayıcı:** marka ekranı kayıt akışı · builder'da pasif kilitli
  kontroller · önizleme markayı yansıtır · üç diyalogda odak/Escape.
- **Canlı kabul:** deploy ŞEMA DEĞİŞTİRİYOR — panel komut ritüeli:
  `exec -- prisma migrate deploy` → `exec -- prisma generate` → restart.

## 8. Kapsam dışı (bilinçli)

Mevcut imzalara "varsayılanları uygula" düğmesi (kilitliler bindirmeyle
zaten işler) · çoklu marka/tema (org başına tek kayıt) · ajans marka
kalıtımı (müşteri org kendi kaydını tutar — Faz 4) · builder dil göçü ·
yeni şablon · analitik.
