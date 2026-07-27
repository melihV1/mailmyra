# Marka Kimliği ve Sosyal İkon Renk Modeli

**Tarih:** 2026-07-27
**Durum:** Onaylandı (Hüseyin)
**Kapsam:** Hafta 3 tasarım işinin ilk parçası — landing'den ÖNCE

---

## Amaç

Marka renklerini tasarım tokenı olarak kilitlemek ve sosyal ikonların renk
davranışını netleştirmek: kurumsal kullanıcı marka rengini **bir kez** seçer,
tüm ikonlar o renge gelir.

---

## Onaylanan Kararlar

| Karar | Seçim |
|---|---|
| Ana renk | `#7b9fd3` (mavi) |
| İkincil renk | `#e0a66c` (turuncu) |
| Logo | Mavi güvercin + turuncu vurgu — **sabit**, değişmez |
| Builder varsayılan `brandColor` | `#7b9fd3` |
| İkon rengi kaynağı | `visuals.brandColor` — ayrı alan AÇILMAZ |
| Dolu (filled) | Platform resmi renkleri, renk seçici YOK |
| Kontur (outline) | brandColor'a bağlı; çerçeveli |
| Tek renk (mono) | brandColor'a bağlı; çerçevesiz |
| Kontrast koruması | **Yalnız uyarı** — renk ASLA değiştirilmez |

---

## 1. Tasarım Tokenları

**Tek kaynak:** `packages/renderer/src/brand.ts`

```ts
export const BRAND = {
  primary: '#7b9fd3',    // mavi — marka
  secondary: '#e0a66c',  // turuncu — vurgu
} as const;
```

Renderer paketinde durur çünkü iki tarafın da paylaştığı katman odur ve bu
değerler `SignatureData`'ya giren **alan verisidir**. Renderer saf kalır —
bunlar sabit, davranış değil.

Tüketiciler:
- `apps/web/app/builder/reducer.ts` → `createEmptyData().visuals.brandColor`
- `packages/renderer/src/fixtures/samples.ts` → `baseVisuals.brandColor`
- `apps/web/app/tokens.css` → site UI'ı için CSS custom property
  (`--brand-primary`, `--brand-secondary`). Hafta 3 landing bunları kullanır.

**Ayrım korunur:** CSS değişkenleri YALNIZ site arayüzü içindir. E-posta
HTML'inde CSS değişkeni kullanılamaz — orada daima literal hex gider.

Fixture'lardaki `#719ad1` → `#7b9fd3` güncellenir.

## 2. İkon Renk Modeli

Renk kaynağı `visuals.brandColor`. Aynı anda tek stil aktif olduğu için ayrı
bir ikon rengi alanına gerek yok; link ve CTA rengi de aynı alandan geldiği
için marka bütünlüğü kendiliğinden sağlanır.

| Stil | Görünüm | Renk seçici | CDN yolu |
|---|---|---|---|
| **filled** | Platform markasının renginde yuvarlatılmış kare + beyaz glif | ❌ sabit | `icons/filled/<platform>.png` |
| **outline** | Seçilen renkte yuvarlatılmış kare **çerçeve** + şeffaf iç + aynı renkte glif | ✅ brandColor | `icons/outline-<hex6>/<platform>.png` |
| **mono** | Yalnız düz glif, çerçeve yok | ✅ brandColor | `icons/mono-<hex6>/<platform>.png` |

`filled` sabit kalır: platform tanınırlığı ve marka hakları.

**Statik `icons/outline/` klasörü KALKAR** — kontur artık renge göre üretilir.
`generate-icons` script'i yalnız `filled` üretir.

### Outlook güvenliği (kayda geçirildi)

Kontur çerçevesi **CSS değil**: ikonlar sunucuda sharp ile PNG'ye rasterize
edilir, çerçeve `<rect>` olarak görüntünün İÇİNE çizilir. Outlook onu düz bir
görsel olarak görür; `border-radius` desteği, table-based çerçeve veya köşeli
fallback GEREKMEZ. Mevcut `filled` stili zaten böyle çalışıyor.

### Üretim uç noktası

`POST /api/icons/mono` yerine tek uç nokta, bir renk için **hem outline hem
mono setini birlikte** üretir (16 dosya, ~16KB).

Sebep: kullanıcı stiller arasında gezinirken yeni istek atılmaz; builder'da
tek "hazır mı" durumu olur.

- Girdi: `{ color: string }` (hex). Geçersizse 400.
- Çıktı: `{ ready: true, lowContrast?: true }`
- Dedup, rate limit ve disk tavanı korunur. `ICON_MONO_DIR_CAP` artık
  `outline-*` ve `mono-*` klasörlerinin **toplamını** sayar.

### Export kilidi

`iconStyle` **outline veya mono** iken ve `social` doluyken, dosyalar yazılana
kadar kopyala/indir kapalı kalır — pazarlıksız kural aynen sürer: kopyalanan
HTML'de asla henüz-yazılmamış ikon URL'i olamaz. `filled` stilinde kilit yok.

## 3. Kontrast Koruması

**Renk ASLA değiştirilmez.** `#7b9fd3` seçildiyse ikonlar `#7b9fd3` basılır.

- Degrade mantığı (`#666666`'ya düşürme) **tamamen kaldırılır**
- Eşik uyarı olarak kalır: `contrastRatio(brandColor, '#ffffff') < 3` ise
  builder'ın Stil adımında bilgi notu:
  *"Marka rengin açık tonda — beyaz zeminde ikonlar soluk görünebilir."*
- Uyarı bilgi amaçlıdır, **engelleyici değil**

Ölçülen değerler (beyaza karşı): `#7b9fd3` → 2.71 · `#e0a66c` → 2.13 ·
`#666666` → 5.74. Yani marka renkleriyle uyarı **her zaman** görünecek; bu
beklenen davranıştır, hata değildir.

**Bilinçli sonuç:** kullanıcı `#ffffff` seçerse ikonlar görünmez olur. Uyarı
çıkar, engellenmez — "marka rengi korunsun" kararının doğal bedeli.

Metin renkleri için mevcut `contrastWarnings` mantığı (beyaz-zemin oranı +
saf-siyah tabanı) **değişmez**; bu bölüm yalnız ikonları kapsar.

---

## Kapsam Dışı (bilinçli)

- Landing sayfası ve tasarım dili → bu spec'ten SONRA, ayrı iş
- Her ikona ayrı renk → istenmedi, stil başına tek renk
- İkon rengi için `SignatureData`'ya yeni alan → YAGNI, brandColor yeter
- Yeni platform ekleme → 8 platform sabit
- `filled` stiline renk seçici → marka hakları gereği asla

---

## Test Notu

Üç stil de 6 istemcide doğrulanacak (Outlook Classic dahil) — özellikle
kontur çerçevesinin köşe yuvarlaklığı ve şeffaf PNG'nin koyu modda davranışı.
