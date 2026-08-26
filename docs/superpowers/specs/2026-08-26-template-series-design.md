# Şablon Serisi — 3 Yeni İmza Şablonu (Tasarım)

Tarih: 2026-08-26 · Onay: Hüseyin (sohbet — kavram seçimi: "Dikey ayraçlı
kurumsal + Foto-öne kreatif + CTA vurgulu") · Durum: spec.

Bu dalga CLAUDE.md YAPILMAYACAKLAR'daki "❌ 3'ten fazla şablon → motor
oturunca seri üretilir" maddesinin KOŞULUNU gerçekleşmiş sayar: motor
oturdu (3 şablon canlıda, 277 renderer testi, 6-istemci doğrulaması
geçmişte yapıldı). Dalgayla birlikte CLAUDE.md'ye tarihli istisna notu
düşülür. **Şablon başına 6-istemci matrisi yayın şartı OLMAYA DEVAM
EDER** — kod tamam + yerel görsel doğrulama bizde; matris testi
Hüseyin'in deploy kapısında (RDP + gerçek istemciler).

Migration YOK · yeni bağımlılık YOK · `SignatureData` tipi DEĞİŞMEZ.

---

## 1. Üç yeni şablon (kimlik = YAPI farkı, renk varyasyonu değil)

Kayıt: her şablon `packages/renderer/src/templates/<id>.ts` modülü +
`render.ts`'teki `TEMPLATES` haritasına ekleme. `TEMPLATE_IDS` haritadan
türediği için guardrails (177 test), `/dev/render`, BrandClient seçicisi
ve brand-doc doğrulaması KENDİLİĞİNDEN genişler.

### 1.1 `divider-columns` — Dikey ayraçlı kurumsal

- Kök: 600px tavanlı tek satır; SOL hücre logo (üstte) + avatar (altta,
  ikisi bağımsız slot — classic-horizontal emsali), SAĞ hücre kimlik +
  iletişim + sosyal + CTA.
- **Dikey ayraç = sağ hücrede `border-left: 2px solid <brandColor>` +
  padding-left** (e-posta-güvenli tek yol; ayrı 1px hücre değil —
  Outlook yükseklik kaprisleri). Ayraç şablonun KİMLİĞİ → her zaman
  çizilir; `layout.showDividers` yalnız iletişim bloğu ile sosyal/CTA
  arasındaki İNCE YATAY çizgiyi açar (classic emsali).
- Kimlik: ad (bold, boyut ölçekli) · ünvan`·`departman · şirket bold.
- El imzası + yasal metin: classic-horizontal deseni (altta iki hücre).

### 1.2 `photo-first` — Foto-öne kreatif

- Avatar BASKIN: sol sütunda büyük — SIZES: small 88 / medium 104 /
  large 120 px — `border-radius: 50%` inline (Outlook Word motoru
  yuvarlatmayı yok sayar → KARE düşer; **kabul edilen zarif bozulma**,
  Hüseyin bayrağı §5).
- Sağ sütun: ad DİĞER şablonlardan bir kademe büyük (kreatif vurgu),
  ünvan brandColor renkli, ince iletişim satırları, sosyal, CTA.
- Logo yok sayılMAZ: alt satırda küçük (yükseklik verilmeden, genişlik
  ölçekli) — her SignatureData alanı bu şablonda da yaşar (guardrail
  felsefesi: hiçbir alan sessizce düşmez).
- `showDividers`: ad bloğu ile iletişim arasında kısa vurgu çizgisi
  (stacked-minimal'in 40px accent bar emsali, brandColor).

### 1.3 `cta-banner` — CTA vurgulu

- Üst blok: kompakt yatay kimlik (avatar solda küçük, ad/ünvan/şirket +
  iletişim sağda; logo en sağda).
- **Alt bant: TAM GENİŞLİK CTA şeridi** — brandColor zemin, metin rengi
  `readableTextOn(brand)`, `ctaLabel` bold + ok işareti değil düz metin
  bağlantı (tablo hücresi, buton görünümü padding'le). CTA verisi yoksa
  bant HİÇ çizilmez (mevcut `label && url` sözleşmesi) — şablon CTA'sız
  da eksiksiz durur.
- `showDividers`: kimlik ile iletişim arasında dikey ince çizgi yerine
  yatay çizgi (kompakt blokta yatay uygun).
- El imzası + yasal metin bandın ALTINDA (bant imzanın son güçlü
  vurgusu olarak kalır, yasal metin onu sulandırmaz).

### 1.4 Ortak sözleşme (üçü de)

Mevcut üç şablonun istisnasız uyduğu kurallar aynen: her renk
`normalizeHex`ten geçer · her opsiyonel alan koşullu satır ·
`customFields` `label: value` (+url'liyse link) · sosyal ikonlar çift
mod (`opts.iconBaseUrl` varsa `<img>` 24×24 `width`+`height`+`border=0`,
yoksa `·` ayraçlı metin linkler; `filled` sabit yol, `outline/mono`
iconColor-keyed varyant yolu) · CTA `label && url` · `SIZES` üçlüsü
(`?? SIZES.medium`) · kök `max-width:600px` · TÜM tablolar `table()`
util'inden (border="0" + border:none disiplinini util zorlar) ·
`<div>`/flex/style bloğu/SVG/base64 YOK (guardrails zaten kırar) ·
web-safe font `visuals.fontFamily`den.

## 2. Ortak yardımcı çıkarımı (hedefli DRY)

`PLATFORM_LABELS` haritası ve ikon yol kurucusu (variantPath mantığı) üç
mevcut şablonda BİREBİR kopya; üç yenisiyle altıya çıkacaktı. Yeni
`packages/renderer/src/utils/social.ts`: `PLATFORM_LABELS` +
`socialIconPath(iconStyle, iconHex, platform)` (+ gerekiyorsa
`iconBase(opts)` normalize edicisi). Mevcut üç şablon buna geçirilir —
**davranış bayt-bayt aynı kalır, 277 test yeşil kalarak kanıtlar**.
Satır düzeni/HTML üretimi çıkarılMAZ (şablonlar sosyali farklı yerleşimle
basıyor — orası kimlik).

## 3. Entegrasyon yüzeyleri

- `render.ts` `TEMPLATES` haritası: 3 kayıt (görev başına kendi kaydı).
- **Builder**: `lib/i18n/dict/builder.ts` `steps.style.template`'a 3×
  name+blurb (en+tr, Mirror zorunlu kılar) + `StyleStep.tsx`
  `templateLooks()` 3 giriş (ikonlar: `tabler-layout-columns`,
  `tabler-user-circle`, `tabler-rectangle`). Girilmezse ham id görünür
  (kırılmaz) ama bu dalgada tam girilir.
- **Admin**: `ProductOperationsViews.tsx` `TEMPLATE_META` 3 giriş
  (İngilizce — admin yüzeyi; ad/ikon/ton/copy).
- `packages/renderer/scripts/emit-htm.ts`: sabit 'classic-horizontal'
  yerine `TEMPLATE_IDS` üzerinden döner (küçük onarım).
- `CLAUDE.md`: YAPILMAYACAKLAR maddesine tarihli istisna revizyonu.
- KAPSAM DIŞI: pazarlama şablon galerisi (`/templates` nav linki hâlâ
  sayfasız — ayrı iş) · `dev/admin-preview` fixture gerçekçiliği ·
  builder varsayılanı (classic-horizontal kalır).

## 4. Test ve doğrulama

- Şablon başına özel test dosyası (`test/<id>.test.ts`) — mevcut üçlünün
  deseni (18-26 test): alan varlığı, kaçış, boyut ölçeği, divider
  aç/kapa, slot bağımsızlığı, CTA çifti sözleşmesi, ikon çift modu +
  varyant yolu; artı şablona ÖZGÜ kimlik iddiaları (divider-columns:
  border-left her zaman; photo-first: border-radius + büyük avatar +
  logo alt satırda; cta-banner: bant tam genişlik + CTA'sızken bant yok).
- Guardrails: kayıtla birlikte otomatik 3×4×2 yeni kombinasyon.
- `npm test` (277 → ~350+ renderer) · typecheck · prod build.
- Görsel: `/dev/render` (kendiliğinden büyür) — 6 şablon × fixture'lar
  açık/koyu; ekran görüntüleri Hüseyin'e. Builder'da 6 kart görünümü.
- **Yayın kapısı: 6-istemci matrisi Hüseyin'de** (şablon başına;
  Outlook Classic en kritik). Kod merge edilir, deploy Hüseyin'in
  matris sonucuna bağlı.

## 5. Açık bayraklar (Hüseyin'e, blokaj değil)

1. photo-first'te Outlook'un yuvarlak avatarı KARE göstermesi — kabul
   edilen bozulma; istersen köşe yumuşatmasız tasarlarız.
2. divider-columns'ta ayraç rengi brandColor seçildi (mutedColor değil)
   — kurumsal vurgu tercihi.
3. Şablon görünen adları (builder TR/EN) plan içinde; metin okumasında
   değiştirilebilir.
