# Şablon Serisi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3 yeni imza şablonu (`divider-columns`, `photo-first`, `cta-banner`) — her biri gerçek yapı farkı taşır, mevcut sözleşmenin tamamına uyar, builder/admin yüzeylerine bağlanır.

**Architecture:** Şablon = `packages/renderer/src/templates/<id>.ts` saf modülü + `render.ts` `TEMPLATES` kaydı; `TEMPLATE_IDS` haritadan türediği için guardrails/dev-render/BrandClient kendiliğinden genişler. Önce ortak `utils/social.ts` çıkarılır (6 kopyayı önler), sonra şablonlar TDD ile tek tek, sonda entegrasyon (builder dict en+tr, StyleStep, admin META, emit-htm, CLAUDE.md revizyonu).

**Tech Stack:** TypeScript saf fonksiyonlar (React/DOM YOK) · vitest · e-posta HTML kısıtları (CLAUDE.md §E-posta HTML Kısıtları).

**Spec:** `docs/superpowers/specs/2026-08-26-template-series-design.md`

## Global Constraints

- npm (pnpm YASAK). Komutlar: `npm test -w packages/renderer`, tek dosya `npm test -w packages/renderer -- test/<dosya>.test.ts`, kökten `npm run typecheck`, build `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web`.
- **KANON = mevcut şablonlar:** `classic-horizontal.ts` / `stacked-minimal.ts` / `card-bordered.ts` dosyalarını OKU ve aynı konvansiyonlarla yaz (dosya başı "neden farklı" doc-yorumu · `SIZES` `?? SIZES.medium` · her renk `normalizeHex` · `table()/row()/cell()` util'leri — elle `<table>` YAZMA · `htmlEscape`/`sanitizeUrl`/`ensureHttp` · CTA `label && url` · ikon çift modu). Renderer'a React/DOM/tarayıcı API'si giremez.
- **E-posta kısıtları pazarlıksız:** `<div>`/flex/grid/float/position YOK · `<style>`/`class` YOK · SVG/WebP/base64 YOK · her `<img>`de `width` (ikonlarda `height` de) · web-safe font · kök `max-width:600px`. Guardrails (test/guardrails.test.ts) bunları yeni şablon için OTOMATİK zorlar — kayıt sonrası kırmızıysa şablon yanlıştır, test değil.
- Her SignatureData alanı her şablonda yaşar (avatar+logo BAĞIMSIZ slotlar; customFields; disclaimer; handSignature; social; CTA) — hiçbir alan sessizce düşmez.
- Şablon görünen adları/blurb'ları bu planda sabit (Task 5) — EN/TR metinleri Hüseyin'in okumasına kadar plandan çıkmaz.
- Commit mesajları İngilizce, conventional; sonunda `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: `utils/social.ts` çıkarımı (davranış bayt-bayt aynı)

**Files:**
- Create: `packages/renderer/src/utils/social.ts`
- Modify: `packages/renderer/src/templates/classic-horizontal.ts`, `stacked-minimal.ts`, `card-bordered.ts` (yalnız import + kopya blokların silinmesi)

**Interfaces:**
- Produces (Task 2-4 bunları kullanır):

```ts
export const PLATFORM_LABELS: Record<SocialPlatform, string>; // mevcut kopyaların AYNISI
/** 'filled' → 'filled'; outline/mono → `${style}-${iconHex.slice(1)}` — mevcut variantPath mantığı birebir. */
export function socialIconPath(iconStyle: IconStyle, iconHex: string, platform: SocialPlatform): string;
```

(Tip adları `types.ts`'teki gerçek adlarla eşleşir — dosyayı oku; union tipler zaten export ediliyorsa onları kullan, edilmiyorsa export etmeden `SignatureData` alt tiplerinden türet.)

- [ ] **Step 1:** Üç şablondaki `PLATFORM_LABELS` ve variantPath mantığını karşılaştır — BİREBİR aynı olduklarını doğrula (değillerse DUR, farkı raporla).
- [ ] **Step 2:** `social.ts`'i yaz (kopyanın taşınması; yeni davranış YOK), üç şablonu ona geçir.
- [ ] **Step 3:** `npm test -w packages/renderer` → 277/277 PASS (davranış kanıtı) · `npm run typecheck` → PASS.
- [ ] **Step 4:** Commit: `refactor(renderer): shared social labels and icon-path helper`

---

### Task 2: `divider-columns` şablonu (TDD)

**Files:**
- Create: `packages/renderer/src/templates/divider-columns.ts`
- Modify: `packages/renderer/src/render.ts` (import + `TEMPLATES`'a `'divider-columns': dividerColumns`)
- Test: `packages/renderer/test/divider-columns.test.ts`

**Interfaces:** `export function dividerColumns(data: SignatureData, opts?: RenderOptions): string`

**Yapı (spec §1.1, bağlayıcı):** SOL hücre logo üstte + avatar altta (bağımsız slotlar, classic emsali) · SAĞ hücre `border-left: 2px solid <normalizeHex(brandColor)>` + padding-left ile AYRAÇ (her zaman — şablon kimliği) · sağda ad bold → ünvan`·`departman → şirket bold → iletişim satırları → (`showDividers` ise ince yatay çizgi) → sosyal → CTA · el imzası+disclaimer classic deseni (altta iki hücre) · `SIZES` değerleri classic-horizontal'dan kopyalanır.

- [ ] **Step 1: Başarısız test dosyasını yaz** — `classic-horizontal.test.ts`'i kanon al; şu iddialar ZORUNLU (+ kanondaki genel alan/kaçış/boyut/ikon testlerinin karşılıkları):
  - ayraç HER ZAMAN: `showDividers:false` fixture'ında bile çıktı `border-left:2px solid #<brand6>` içerir;
  - `showDividers:true` ek yatay çizgi üretir, `false` üretmez (yatay çizgi rengiyle ayır);
  - avatar ve logo bağımsız: yalnız-logo fixture'ında avatar `<img>` yok, logo var;
  - CTA çifti sözleşmesi (yalnız label → yok; ikisi → brandColor zemin + `readableTextOn` metin rengi);
  - ikon çift modu + variantPath (`socialIconPath` üzerinden; mono-hex yolu asserti).
- [ ] **Step 2:** RED gör: `npm test -w packages/renderer -- test/divider-columns.test.ts` → modül yok hatası.
- [ ] **Step 3:** Şablonu yaz + `render.ts`'e kaydet.
- [ ] **Step 4:** GREEN: kendi dosyası + `npm test -w packages/renderer` TAMAMI (guardrails yeni id'yi otomatik kapsar — kırmızıysa şablonu düzelt).
- [ ] **Step 5:** Commit: `feat(renderer): divider-columns template — corporate split with brand rule`

---

### Task 3: `photo-first` şablonu (TDD)

**Files:** Create `templates/photo-first.ts` · Modify `render.ts` · Test `test/photo-first.test.ts`

**Yapı (spec §1.2, bağlayıcı):** avatar baskın solda — SIZES avatar **88/104/120** px, `border-radius:50%` inline (Outlook kare düşer, kabul edilen bozulma — dosya doc-yorumuna yaz) · sağda ad bir kademe büyük, ünvan brandColor · ince iletişim satırları → sosyal → CTA · **logo alt satırda küçük** (yükseklik verilmez, genişlik ölçekli) · `showDividers` → ad bloğu altında 40px vurgu çubuğu (stacked-minimal emsali, brandColor).

- [ ] **Step 1: Başarısız test** — kanon iddialar + şablona özgü: avatar `<img>` `border-radius:50%` ve boyut ölçeğine göre width (fixture size'ına denk değer) · logo çıktıda avatar'dan SONRA (alt satır) ve `height` özniteliği YOK · ad font-size'ı ünvandan büyük · vurgu çubuğu `showDividers` ile açılıp kapanıyor.
- [ ] **Step 2:** RED · **Step 3:** yaz+kaydet · **Step 4:** GREEN (dosya + tüm renderer).
- [ ] **Step 5:** Commit: `feat(renderer): photo-first template — portrait-led creative layout`

---

### Task 4: `cta-banner` şablonu (TDD)

**Files:** Create `templates/cta-banner.ts` · Modify `render.ts` · Test `test/cta-banner.test.ts`

**Yapı (spec §1.3, bağlayıcı):** üstte kompakt yatay kimlik (avatar küçük solda · ad/ünvan/şirket + iletişim ortada · logo sağda) · `showDividers` → kimlikle iletişim arası yatay çizgi · **altta TAM GENİŞLİK CTA bandı**: brandColor zemin, `readableTextOn(brand)` metin, bold `ctaLabel`, hücre padding'iyle buton hissi; CTA verisi eksikse bant HİÇ yok · el imzası + disclaimer bandın ALTINDA.

- [ ] **Step 1: Başarısız test** — kanon iddialar + şablona özgü: bant hücresi `width:100%`/kök genişliğinde ve brandColor zeminli · CTA'sız fixture'da brandColor zeminli bant hücresi YOK · disclaimer çıktıda bant markup'ından SONRA · logo `height`siz.
- [ ] **Step 2:** RED · **Step 3:** yaz+kaydet · **Step 4:** GREEN (dosya + tüm renderer).
- [ ] **Step 5:** Commit: `feat(renderer): cta-banner template — full-width action bar close`

---

### Task 5: Entegrasyon — builder, admin, emit-htm, CLAUDE.md

**Files:**
- Modify: `apps/web/lib/i18n/dict/builder.ts` (`steps.style.template` — en+tr, Mirror ikisini de zorlar)
- Modify: `apps/web/app/builder/steps/StyleStep.tsx` (`templateLooks()` 3 giriş)
- Modify: `apps/web/app/(admin)/ui/ProductOperationsViews.tsx` (`TEMPLATE_META` 3 giriş — İngilizce, mevcut giriş şekliyle)
- Modify: `packages/renderer/scripts/emit-htm.ts` (sabit id yerine `TEMPLATE_IDS` döngüsü)
- Modify: `CLAUDE.md` (YAPILMAYACAKLAR istisna notu)

**Bağlayıcı metinler** (dict anahtar adlandırması mevcut kalıpla: `dividerColumnsName` vb.):

| id | EN name | EN blurb | TR name | TR blurb |
|---|---|---|---|---|
| divider-columns | Corporate divider | Logo left, a strong brand rule, contact on the right. | Kurumsal ayraçlı | Logo solda, güçlü marka çizgisi, iletişim sağda. |
| photo-first | Photo first | A big round portrait leads — built for personal brands. | Fotoğraf önde | Büyük portre önde — kişisel marka için. |
| cta-banner | CTA banner | A full-width action bar closes the signature. | CTA bantlı | İmzayı tam genişlik eylem bandı kapatır. |

StyleStep ikonları: `tabler-layout-columns` · `tabler-user-circle` · `tabler-rectangle`. Admin `TEMPLATE_META`: aynı adlar (EN), ikonlar aynı, ton `primary`/`info`/`warning`, copy tek cümle (blurb'dan).

CLAUDE.md — YAPILMAYACAKLAR'daki "❌ 3'ten fazla şablon" maddesinin altına:

```markdown
> **İstisna (2026-08-26, Hüseyin, sözlü):** motor oturdu sayıldı (3 şablon
> canlıda, 277 renderer testi); 3 yeni şablon onaylandı (divider-columns,
> photo-first, cta-banner — toplam 6). Şablon başına 6-istemci test
> matrisi YAYIN ŞARTI olmaya devam eder.
```

- [ ] **Step 1:** Dict + StyleStep + TEMPLATE_META + emit-htm + CLAUDE.md düzenlemeleri.
- [ ] **Step 2:** `npm run typecheck` → PASS (dict Mirror + Record eksikleri burada kırılır) · `npm test` (kök) → tümü PASS · prod build → PASS.
- [ ] **Step 3:** Commit: `feat(builder,admin): register template series — names, blurbs, meta; emit-htm iterates registry; CLAUDE.md exception note`

---

### Task 6: Tam doğrulama + görsel duman

**Files:** Yok (kontrolör koşar).

- [ ] **Step 1:** `npm run typecheck` · `npm test` (kök; renderer ~330+, web 1217, core 51 beklenir) · prod build.
- [ ] **Step 2:** Dev sunucu + `/dev/render`: 6 şablon × fixture'lar açık/koyu — ekran görüntüleri; builder'da 6 şablon kartı (EN+TR adlarla).
- [ ] **Step 3:** Rapor: Hüseyin'e 6-istemci matrisi hatırlatması (yayın şartı) + görseller.

## Self-Review Notu

- Spec kapsaması: §1.1-1.3→T2-4 · §2→T1 · §3→T5 · §4→her görevin test adımları+T6 · §5 bayrakları Hüseyin'e rapor.
- Bilinçli sapma: şablon modüllerinin tam kodu planda değil — kanon mevcut üç şablon dosyası; bağlayıcı yapı listeleri + zorunlu test iddiaları + guardrails ağı tamlığı güvenceler (Dalga B emsali).
- Tip tutarlılığı: `socialIconPath` T1'de tanımlı, T2-4 aynı adı kullanıyor; dict anahtarları T5 tablosunda sabit.
