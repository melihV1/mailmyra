# Dalga B — Müşteri Paneli + Builder TR/EN (Tasarım)

Tarih: 2026-08-24 · Onay: Hüseyin (sohbet, "onaylıyorum") · Durum: spec —
plan bundan üretilecek.

Karar zinciri: CLAUDE.md revizyonu 2026-08-22 (`fc1fbe0`) TR/EN'i müşteri
paneli + builder için açtı; 2026-08-24 sözlü revizyon **varsayılanı
tarayıcı diline** bağladı (bu dalgada CLAUDE.md'ye tarihli not düşülür).
Migration YOK, yeni bağımlılık YOK.

---

## 1. Kapsam

**İçeride:** `(app)` müşteri paneli (kabuk + tüm sayfalar + toast/diyalog
metinleri + aktivite/bildirim sözlükleri + tarih biçimleri) · `app/builder`
(adımlar, kaydetme, sayfa metinleri) · panel içi kurulum rehberleri
İÇERİĞİ (guides.data — ~2.300 kelime, Hüseyin onayladı: bu dalgada) ·
ortak `components/` içinden panel/builder'ın kullandığı metinli bileşenler
(ör. ExportButtons).

**Dışarıda (değişmez):** pazarlama sitesi · işlemsel e-postalar · süper
admin `(admin)` (iç yüzey, İngilizce kalır) · `packages/renderer` ve imza
ÇIKTISI (dil sızmaz) · `/kvkk` ve legal sayfalar (kendi düzenleri var) ·
hreflang/URL yerelleştirme (SEO maliyeti bilinçli ertelenmiş kalır — URL
değişmez, `/tr/` rotası açılmaz).

## 2. Dil seçimi ve kalıcılık

- **Sıra: çerez > tarayıcı > EN.** `mm-lang` çerezi (`tr`|`en`) varsa o;
  yoksa `Accept-Language` başlığında en yüksek öncelikli `tr`/`en`
  eşleşmesi; hiçbiri yoksa `en`.
- Elle seçim `mm-lang` çerezini yazar: `path=/`, `max-age=31536000`
  (1 yıl), `SameSite=Lax` — cihaz başına kalıcı. **DB kolonu YOK**
  (migration'sız; tema tercihi localStorage emsali). Cihazlar arası
  senkron gerekirse v2'de kolon.
- Seçim noktaları: `(app)` navbar'daki **LanguageMenu** canlanır
  (English / Türkçe, aktif işaretli; seçimde çerez + `router.refresh()`).
  **Builder**'ın navbar'ı yok — başlık satırına ("Signature builder"
  `<h4>` hizasına) küçük bir EN/TR düğmesi eklenir, aynı çerez;
  girişsiz ziyaretçi de değiştirebilir.
- `lang` özniteliği YALNIZ alt ağaca: `(app)` kabuğunun kök sarmalayıcısı
  (PanelShell) ve builder layout'unun `.mm-panel` div'i `lang={lang}`
  taşır. Kök `<html lang="en">` DEĞİŞMEZ (pazarlama etkilenmez).
  Belgeli "JOB TİTLE" uppercase tuzağı gerçek TR metinle doğru davranışa
  dönüşür (Türkçe metinde İ doğrudur).

## 3. Mimari — kütüphanesiz, tip-güvenli sözlükler

`apps/web/lib/i18n/` (YENİ):

- `types.ts` — `type Lang = 'en' | 'tr'` · `LANG_COOKIE = 'mm-lang'` ·
  `Mirror<T>` yardımcı tipi: `tr` sözlüğü `en`'in şeklini birebir taşımak
  ZORUNDA (string yaprak → `string`, fonksiyon yaprak → aynı imza).
  **Eksik/fazla anahtar derlemede kırılır — eksik çeviri canlıya
  çıkamaz; test değil derleyici bekçidir.**
- `detect.ts` — SAF `preferredLang(acceptLanguage: string): Lang`
  (q-değerli listeyi ayrıştırır; test edilir).
- `lang.server.ts` — `getLang(): Promise<Lang>` (`cookies()` +
  `headers()`; yalnız sunucu).
- `LangProvider.tsx` — `'use client'` context: `<LangProvider lang>` +
  `useLang()`. `(app)/layout.tsx` ve builder `page.tsx` sunucuda
  `getLang()` çağırıp sarar; istemci bileşenleri `useLang()` ile alır.
- `cookie.ts` — istemci `setLangCookie(lang)` (document.cookie yazımı tek
  yerde).
- `format.ts` — `formatDate(lang, date)` (`tr-TR`/`en-GB`), gerekirse
  `formatDateTime`. `timeAgo` da dil alır (bkz. §5).
- `dict/` — **alan başına modül, en+tr YAN YANA** (iki dev paralel dosya
  değil): `common.ts` · `nav.ts` (PanelShell menü + navbar bileşenleri) ·
  `dashboard.ts` · `signatures.ts` · `senders.ts` · `members.ts` ·
  `brand.ts` · `account.ts` · `activity.ts` · `notifications.ts` ·
  `support.ts` · `guides.ts` (rehber KABUK metinleri; içerik §6'da ayrı) ·
  `builder.ts`. Kalıp:

  ```ts
  const en = {
    title: 'Senders',
    seatNote: (active: number, entitled: number) =>
      `${active}/${entitled} seats in use`,
  } as const;
  const tr: Mirror<typeof en> = {
    title: 'Göndericiler',
    seatNote: (active, entitled) => `${active}/${entitled} koltuk dolu`,
  };
  export const senders = { en, tr } as const;
  ```

  Kullanım — sunucu: `const t = senders[await getLang()]`; istemci:
  `const t = senders[useLang()]`. İki dil de bundle'a girer (UI metni
  küçük; guides İÇERİĞİ istemci bundle'ına girmez, sunucuda kalır).

## 4. Mevcut merkezî sözlüklerin uyarlanması

- `(app)/activity-looks.ts` → `ACTIVITY_LOOKS[lang][type]` +
  `ACTIVITY_FILTERS(lang)`; TR gövdeler `Mirror` ile zorunlu.
- `(app)/notification-looks.ts` → aynı kalıp; `timeAgo(lang, date)`
  ("just now"/"şimdi", "3s önce" vb.).
- `(app)/app/support/support-labels.ts` → `TICKET_CATEGORIES(lang)`,
  `CASE_STATUS_LOOKS[lang]` (müşteri dili korunur: waiting_customer →
  "Awaiting your reply" / "Cevabınız bekleniyor" gibi — birebir çeviri
  Hüseyin onayına sunulacak metin listesindedir).
- Sayfa `metadata`ları `generateMetadata()`'ya döner (`getLang()` ile
  sekme başlığı da yerelleşir; sayfalar zaten oturumla dinamik).

## 5. Metin taşıma kuralları

- Kullanıcının GÖRDÜĞÜ her metin sözlüğe taşınır: JSX metinleri, `label/
  placeholder/title/aria-label`, toast çağrıları, form hata mesajları,
  boş-durum kartları, buton/rozet etiketleri.
- Sunucudan gelen HATA KODLARI çevrilmez — kod makine tarafı; ekrana
  basılan karşılığı sözlükten seçilir (auth `_shared` deseniyle uyumlu).
- Kullanıcı VERİSİ çevrilmez (imza adları, org adı, e-posta, vaka konusu).
- Referans/teknik terimler: "SUP-2026-0001", dosya adları, `SPF/DKIM`
  gibi terimler olduğu gibi kalır.
- `(admin)` bu sözlükleri İTHAL ETMEZ (İngilizce iç yüzey); tek paylaşım
  ToastProvider mekanizmasıdır (metin taşımaz).

## 6. Guides içeriği (Hüseyin onayı: bu dalgada TR)

- `guides.data.ts` üçe ayrılır: tipler + `getGuides(lang)`/`getExportChain(lang)`
  girişi (`guides.data.ts` kalır) · `guides-content.en.ts` (mevcut içerik
  taşınır) · `guides-content.tr.ts` (YENİ çeviri, ~2.300 kelime).
- İçerik kuralları aynen: 6 istemci birebir · kapsam dışı vaat yok ·
  `backtick` → code tek işaretleme.
- **Yapısal eşlik testi:** iki dilde aynı slug listesi, aynı grup/adım
  sayıları, EXPORT_CHAIN aynı uzunluk — çeviri adım atlayamaz.
- TR çeviriyi ben yazarım; **Hüseyin yayın öncesi okur** (bekçi metinler
  emsali). Onay gelene dek TR rehber "çeviri taslağı" değil — dalga
  sonunda toplu onaya sunulur.

## 7. Test ve doğrulama

- Birim: `preferredLang` ayrıştırma (çerezsiz senaryolar; q-değerleri,
  `tr-TR`, karışık listeler) · guides eşlik testi · `Mirror` zaten
  derleme bekçisi.
- Mevcut 1198/51/277 yeşil kalır (DOM testi yok; admin testleri
  etkilenmez).
- `npm run typecheck` + placeholder DATABASE_URL ile prod build.
- Görsel duman: worktree dev sunucusu (ana ağaçtan `.env.local`
  kopyalanır) — TR tarayıcı diliyle panelin TR açılışı, menüden EN/TR
  geçişi, builder düğmesi, guides TR.

## 8. Bilinçli dışarıda / ertelenen

- DB'de dil kolonu (cihazlar arası senkron) → v2.
- E-posta/pazarlama çevirisi → kilitli karar, dokunulmaz.
- Sağ-sol/başka dil altyapısı, ICU çoğul kuralları → YAGNI (TR/EN'de
  elle fonksiyonlu anahtar yeter).
- Dalga A minor'ları bu dalgaya biner: destek durum birliğinin
  paylaşımı + `CASE_STATUS_LOOKS` fallback'i · NewTicketForm fetch
  try/catch · (ayrı çip: referans max-parse — bu dalgada DEĞİL).

## Açık karar bayrakları (Hüseyin'e, blokaj değil)

1. TR metinlerin ÜSLUBU: "sen" diye hitap (panelin samimi tonu) — resmi
   "siz" istersen söyle, tek yerden değişir.
2. Builder'daki dil düğmesinin biçimi: başlık hizasında iki harfli
   (EN | TR) sade düğme çifti — LanguageMenu'daki gibi ikon menü değil.
3. `escalated` → TR karşılığı "İşlemde" olarak çevrilecek (EN "In
   progress" kararının aynası).
