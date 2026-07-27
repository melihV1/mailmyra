# Hafta 1 — Renderer Çekirdeği + classic-horizontal + Test Harness

> **NOT (2026-07-25 göçü):** Bu belge yazıldığında proje **pnpm workspaces**
> kullanıyordu; aşağıdaki `pnpm` / `corepack pnpm` komutları o günkü
> çalıştırmaların TARİHSEL kaydıdır ve bilerek olduğu gibi bırakılmıştır.
> Proje o tarihte **npm workspaces**'e geçti (Plesk deploy gereği).
> Güncel karşılıklar: `pnpm install` → `npm install` · `pnpm -r <script>` →
> `npm run <script> --workspaces --if-present` · `pnpm --filter web <script>`
> → `npm run <script> -w apps/web` · `pnpm --filter @mailmyra/renderer
> <script>` → `npm run <script> -w packages/renderer`. Güncel komutlar için
> CLAUDE.md'ye bak.


**Tarih:** 2026-07-24
**Durum:** Onaylandı (Hüseyin)
**Kapsam:** Mailmyra 4 haftalık planın 1. haftası

---

## Amaç

Framework'ten bağımsız imza render motorunun çekirdeğini, ilk table-based
şablonu (`classic-horizontal`) ve üretilen HTML'i gerçek e-posta istemcilerinde
test etmeye yarayan bir dev harness sayfasını (`/dev/render`) kurmak.

**Kontrol noktası:** Tek imza 6 istemcide kusursuz render olmalı
(Outlook Classic, Yeni Outlook, Gmail web, Gmail mobil, Apple Mail, iOS Mail).
Kusursuz değilse Hafta 2'ye geçilmez.

---

## Kilitli Bağlam (CLAUDE.md'den)

- **Renderer asla React bileşeni olmayacak.** Saf fonksiyon: DOM'a dokunmaz,
  React import etmez, tarayıcı API'si kullanmaz. Aynı motor tarayıcıda canlı
  önizleme ve sunucuda toplu export için çalışacak.
- **Görseller `cdn.mailmyra.com` üzerinden gidecek** (Hafta 2'de aktif; Hafta 1
  fixture'ları geçici placeholder URL kullanır).
- **E-posta HTML kısıtları** bağlayıcıdır: table-based layout, tüm CSS inline,
  web-safe font, PNG/JPG (SVG/WebP yok), retina için 2x + `width` küçültme,
  max ~600px, `<div>`/flex/grid/float/position yasak, `<style>` bloğuna
  bağımlılık yasak, base64 gömülü görsel yasak, JS yasak.
- **Outlook 2512 bug'ı:** her tabloda `border="0"` ve `style="border:none"`
  açıkça belirtilecek.
- **Export:** `ClipboardItem` ile `text/html` (asla `clipboard.writeText()`),
  ayrıca `.htm` dosyası indirme.

---

## Onaylanan Kararlar (bu spec'te kilitlendi)

| Karar | Seçim |
|---|---|
| Monorepo aracı | **pnpm workspaces** (Turborepo yok — YAGNI) |
| Yapı | `apps/web` (Next.js App Router) + `packages/renderer` (saf TS) |
| İlk şablon | **classic-horizontal** (logo/avatar solda, bilgi sağda) |
| Test sayfası | Fixture'lı ince harness (düzenleme UI'ı yok) |
| Test framework | **Vitest** |
| Dil | TypeScript strict her yerde |

---

## Repo Yapısı

```
mailmyra-work/
  package.json              # kök, private, pnpm workspace
  pnpm-workspace.yaml
  tsconfig.base.json        # strict TS, paylaşılan taban
  .gitignore
  packages/
    renderer/               # @mailmyra/renderer — SAF TS, React yok, DOM yok
      package.json
      tsconfig.json
      vitest.config.ts
      src/
        index.ts            # public export'lar (renderSignature, tipler, fixtures)
        types.ts            # SignatureData, WebSafeFont (CLAUDE.md'den birebir)
        render.ts           # renderSignature(data, templateId): string — tek giriş
        templates/
          classic-horizontal.ts
        utils/
          table.ts          # table/row/cell kurucular — border="0" gömülü
          inline-style.ts   # stil objesi → inline string
          color.ts          # hex doğrula/normalize + dark-mode kontrast
          escape.ts         # kullanıcı metnini HTML-escape
        fixtures/
          samples.ts        # dolu / minimal / dark / logosuz / uzun-ad
      test/
        guardrails.test.ts
        classic-horizontal.test.ts
  apps/
    web/                    # Next.js App Router
      package.json
      next.config.js
      tsconfig.json
      app/
        dev/render/
          page.tsx          # server: fixture'ları renderla, iframe önizleme
          ExportButtons.tsx # client: Kopyala (ClipboardItem) + .htm indir
```

`apps/web`, `@mailmyra/renderer`'ı workspace bağımlılığı (`workspace:*`) olarak
import eder.

---

## Renderer Sözleşmesi

```ts
renderSignature(data: SignatureData, templateId: string): string
```

- **Dönüş değeri = imza fragment'i.** Table-based, tüm stiller inline. Panoya
  `text/html` olarak giden ve e-postaya yapıştırılan tam olarak budur.
- Tam `.htm` doküman sarmalama (`<html><body>` + meta charset) renderer'ın işi
  **değildir**; export/harness katmanında yapılır. Böylece motor taşınabilir ve
  hem tarayıcı hem sunucu tarafında aynı çıktıyı verir.
- **Bilinmeyen `templateId` → net hata fırlatır** (sessiz fallback yok).
- Kullanıcıdan gelen tüm serbest metin alanları HTML-escape edilir (`escape.ts`).

### SignatureData tipi

CLAUDE.md'deki tip birebir `types.ts`'e taşınır (identity, contact, visuals,
social, extras, layout + `WebSafeFont` union). Bu spec o tipi değiştirmez.

---

## classic-horizontal Şablonu

Yapı: **dış tablo 2 sütun**
- **Sol sütun:** görsel önceliği: `avatarUrl` varsa o, yoksa `logoUrl`. İkisi de
  yoksa sol sütun hiç render edilmez ve metin tam genişliği kullanır.
- **Sağ sütun:** metin bloğu, şu sırayla:
  1. Ad (kalın, `textColor`)
  2. Ünvan · departman (muted)
  3. Şirket
  4. Ayraç satırı (yalnızca `layout.showDividers` true ise)
  5. İletişim: telefon, mobil, e-posta (`mailto:` link), web (`https:` link), adres
  6. Sosyal linkler
  7. CTA butonu (`extras.ctaLabel` + `ctaUrl` varsa)
  8. Yasal metin / disclaimer (küçük, muted)

Davranış kuralları:
- **`layout.size`** (small/medium/large) → font boyutları ve görsel boyutlarını
  ölçekler.
- **Retina:** `<img>` her zaman `width` (ve `height`) attribute ile küçültülür;
  kaynağın 2x olduğu varsayılır.
- **CTA:** bulletproof-button deseni (dolgulu tablo hücresi + `bgcolor` + inline
  stilli anchor). VML fallback şimdilik yok; RDP testinde Outlook'ta gerekirse
  eklenir.
- **Max genişlik ~600px.**

---

## Bilinçli Hafta 1 Sadeleştirmeleri (YAGNI)

Bunlar eksiklik değil, planlı ertelemedir:

1. **Sosyal ikonlar metin-link olarak** render edilir (ör. "LinkedIn"). Gerçek
   PNG ikonlar CDN gerektirir → Hafta 2. `layout.iconStyle` alanı okunur ama
   görsel etkisi Hafta 2'de aktifleşir.
2. **Logo/avatar** `visuals.logoUrl` / `visuals.avatarUrl`'den `<img>` olarak
   çıkar; fixture'lar geçici placeholder URL kullanır. SVG→PNG dönüşümü +
   `cdn.mailmyra.com` → Hafta 2.
3. Builder UI yok, auth yok, DB yok (sırasıyla Hafta 2 ve Hafta 4).

---

## Dev Harness — `/dev/render`

Fixture'lı ince test sayfası (düzenleme UI'ı yok):

- **Server component (`page.tsx`):** `@mailmyra/renderer`'dan fixture listesini
  ve `renderSignature`'ı import eder. Her fixture için:
  - Başlık (fixture adı)
  - iframe önizleme: fragment minimal bir `<html><body>` sarmalayıcı içinde
    `srcDoc` ile render edilir (beyaz zemin)
  - Export butonları (client component)
- **Client component (`ExportButtons.tsx`):**
  - **Kopyala:** `new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })`
  - **.htm indir:** fragment tam `.htm` dokümanına sarılıp `Blob` ile indirilir
    (Outlook Signatures klasörüne atmak için).

Amaç: motoru bütün kullanmadan, üretilen HTML'i 6-istemci matrisine besleyip
uç durumları (dark-mode, logosuz, uzun ad) erken yakalamak.

---

## Otomatik Test Stratejisi (TDD — testler önce yazılır)

### `guardrails.test.ts`
Her şablon × her fixture için üretilen HTML şunları doğrular:
- `<div`, flexbox/grid/`float:`/`position:` **içermez**
- `<style` bloğu **içermez**, layout için `class=` **kullanmaz**
- her `<table` → `border="0"` **ve** `border:none` içerir (Outlook 2512)
- `<svg`, `.webp`, `data:` görsel URI, `<script` **içermez**
- `font-family` yalnızca `WebSafeFont` değerlerinden biri
- her `<img` → `width` attribute'una sahip

### `classic-horizontal.test.ts`
İçerik doğrulaması:
- Ad çıktıda mevcut
- E-posta `mailto:` linki olarak render ediliyor, web `https:` linki
- `layout.showDividers` true/false davranışı doğru
- `layout.size` font ölçeklemesini değiştiriyor
- Kullanıcı alanlarındaki HTML özel karakterleri escape ediliyor (XSS/kırılma)
- `avatarUrl`/`logoUrl` yoksa sol sütun render edilmiyor

TDD akışı: guardrail ve içerik testleri önce yazılır (kırmızı), şablon
implementasyonu testleri geçirir (yeşil).

---

## Araç / Sürüm Kararları

- Node LTS (20+)
- Next.js (App Router) — güncel kararlı sürüm
- TypeScript strict mode
- Vitest (renderer paketinde)
- pnpm workspaces

---

## Hafta 1 Teslimat Sınırı

Bu spec'in dışındaki her şey (2.–4. şablon, builder, CDN, auth, sosyal ikon
PNG'leri, VML fallback) kapsam dışıdır. Kapsam şişmesi bu projenin bir numaralı
ölüm sebebi olarak işaretlenmiştir.

**Teslimat:** Çalışan `packages/renderer` + `classic-horizontal` + `/dev/render`
+ geçen otomatik testler + fixture'ların `.htm` çıktıları (6-istemci RDP testi
için hazır).
