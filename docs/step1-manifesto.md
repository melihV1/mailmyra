# Adım 1 — Kullanım Manifestosu (kod öncesi)

**Kapsam:** teknik temel + mega menülü Header. **Hiçbir sayfa/bölüm yazılmaz.**
Bitince durulur, gösterilir, onay alınmadan devam edilmez.

**Override:** `docs/design-system.md §3.3` "basit nav" diyordu — bu karar
değişti, Header **mega menü** olacak. Dokümanın diğer tüm kuralları
(renk, token, erişilebilirlik, motion, glow) aynen geçerli. §3.3 bu adımda
güncellenecek ki doküman kodla çelişmesin.

---

## 1. Oluşacak / değişecek dosyalar

### Değişecek
| Dosya | Değişiklik |
|---|---|
| `apps/web/app/tokens.css` | Skalalar eklenir (mevcut isim kalıbı korunur, hiçbir token silinmez) |
| `apps/web/app/layout.tsx` | Font sağlayıcı + motion sağlayıcı |
| `apps/web/app/fonts.css` | General Sans `@font-face` (veya `next/font/local`'a taşınır) |
| `docs/design-system.md` | §3.3 mega menü kararıyla güncellenir |
| `package.json` (apps/web) | Yeni bağımlılıklar |

### Yeni
| Dosya | Sorumluluk |
|---|---|
| `apps/web/app/(marketing)/layout.tsx` | Pazarlama route grubu: koyu tema + Header (bkz. Karar C) |
| `apps/web/components/motion/MotionProvider.tsx` | `LazyMotion` + reduced-motion bağlamı |
| `apps/web/components/motion/SmoothScroll.tsx` | Lenis sarmalayıcı (reduced-motion'da tamamen devre dışı) |
| `apps/web/components/ui/Button.tsx` + `.module.css` | primary / secondary / ghost |
| `apps/web/components/ui/Badge.tsx` + `.module.css` | rozet / pill |
| `apps/web/components/ui/glass.module.css` | paylaşılan cam yüzey util |
| `apps/web/components/nav/Header.tsx` + `.module.css` | üst bar, scroll'da cam zemin |
| `apps/web/components/nav/MegaMenuPanel.tsx` + `.module.css` | genel panel: sol link sütunları + sağ featured |
| `apps/web/components/nav/MobileNav.tsx` + `.module.css` | tam ekran overlay, akordeon, focus trap |
| `apps/web/components/nav/menu-data.ts` | menü içeriği (TR), tek kaynak |
| `apps/web/public/fonts/GeneralSans-*.woff2` | gövde fontu |

**Yazılmayacak:** hiçbir `page.tsx`, hiçbir bölüm bileşeni, footer.
Mevcut `app/page.tsx` (hero) bu adımda **değişmez** — yalnız route grubuna
taşınırsa yolu değişir, içeriği değil.

---

## 2. Tokenlar (tokens.css'e eklenecek)

Mevcut `--brand-*`, `--dark-*`, `--hero-*`, `--pill-*` **aynen kalır**.
Eklenecekler, mevcut isim kalıbına uyar:

- **Mavi skala** `--blue-100..900` — `#7b9fd3` (300 bandı) ve `#2f66c8`
  (600 bandı) skalanın içine oturur, yeni renk icat edilmez.
- **Turuncu skala** `--accent-100..800` — `#e0a66c` merkez.
- **Nötrler** `--dark-raised`, `--dark-strong`, `--dark-faint`.
- **Durum renkleri** `--success/-warning/-danger/-info` × `-onlight`/`-ondark`.
- **Tipografi** `--step-h3`, `--step-caption`; `--font-body` General Sans'a
  bağlanır, `--font-display` ClashDisplay kalır.
- **Efekt** `--shadow-sm`; `--ease-standard`, `--duration-fast/base/slow`.
- **Util sınıflar** (yeni `apps/web/app/effects.css`): glow reçetesi (§5.2)
  ve arka plan atmosferi (§6) yeniden kullanılabilir sınıflar olarak.

Kural: her yeni renk ya mevcut markadan `color-mix()` ile türetilir ya da
skalanın matematiksel adımıdır. Kontrast oranı yazılmadan token eklenmez.

---

## 3. Kütüphaneler

| Paket | Ne için | Not |
|---|---|---|
| `framer-motion` | Panel açılış/kapanış, hover geçişleri | `LazyMotion` + `domAnimation` ile parça yüklenir, tam paket değil |
| `lenis` | Yumuşak scroll | **Bkz. Karar D** — riskli, önerim koşullu |
| `next/font/local` | Font self-host | Zaten Next içinde, yeni bağımlılık değil |

Bootstrap yok, hazır tema yok, UI kütüphanesi yok.

---

## 4. Erişilebilirlik sözleşmesi (mega menü)

- Tetikleyiciler gerçek `<button aria-expanded aria-controls>`.
- Panel `role="menu"` **değil** — `<nav>` + odaklanabilir `<a>` listesi.
- Hover **ve** klavye/focus ile açılır; hover intent gecikmesi (~120ms aç,
  ~200ms kapa) yanlışlıkla kapanmayı önler.
- `Escape` kapatır + odağı tetikleyiciye döndürür; dış tıklama kapatır.
- Aynı anda tek panel; diğerine geçince öncekini kapatır.
- Tab paneli doğal sırayla gezer; son öğeden sonra panel kapanır ve sıradaki
  üst-bar öğesine geçer.
- Mobil overlay: focus trap + body scroll kilidi.
- `prefers-reduced-motion`: tüm hareket kapanır, **görsel sonuç korunur**
  (panel yine açılır, sadece anında). Yalnız `transform`/`opacity` animasyonu.

---

## 5. Doğrulama (bitiş ölçütü)

- Türkçe karakterler ekranda kontrol edilir: **ı İ ş ğ ç ö ü**, özellikle
  noktasız `ı`. General Sans Türkçe'de zayıfsa gövde **Inter**'e düşürülür
  ve bildirilir.
- Klavyeyle tam tur: Tab / Escape / dış tıklama / panel geçişi.
- `prefers-reduced-motion: reduce` açıkken hareket yok, işlev aynı.
- 375px'te yatay taşma yok; mobil overlay çalışır.
- Lighthouse 90+ (performans + erişilebilirlik).
- `npm test && npm run typecheck && npm run build` yeşil.

---

## 6. Onayını beklediğim kararlar

Bunlar cevaplanmadan kodlamaya başlamıyorum — dördü de sonradan
değiştirmesi pahalı.

### Karar A — Tailwind gelsin mi?

İsteğinde "site normal Next/React/**Tailwind**" yazıyor ve CLAUDE.md de
"Tailwind + kendi tasarım tokenları" diyor. Ama proje bugüne kadar **CSS
Modules** ile yazıldı (builder, hero, hepsi) ve Tailwind **kurulu değil**.

- **A1 — CSS Modules'te kal (önerim):** tokenlar zaten CSS değişkeni,
  mevcut kodla tutarlı, sıfır göç maliyeti. Tailwind'in getireceği fayda
  (hızlı prototipleme) bizde token disiplinini zayıflatabilir.
- **A2 — Tailwind kur:** CLAUDE.md'ye harfiyen uyar, ama mevcut CSS Modules
  dosyaları ya kalır (iki sistem yan yana) ya da göç ettirilir (ek iş).

### Karar B — Gövde fontu

General Sans (Fontshare) Türkçe karakterleri **destekliyor** ama noktasız
`ı` ve `ğ` kalitesini ekranda görmeden garanti veremem. Planım: kur, Türkçe
panagramla test et, zayıfsa **Inter**'e düş ve sana bildir. Onay: bu otomatik
düşüş serbest mi, yoksa her durumda sana mı sorayım?

### Karar C — Header nereye? (mimari)

Builder **açık tema**, landing **koyu**. Header'ı kök `layout.tsx`'e koyarsam
koyu header builder'ın üstünde de çıkar ve çakışır.

- **C1 — Route grubu (önerim):** `app/(marketing)/` altında koyu layout +
  Header; `app/builder/` dokunulmaz. Mevcut `app/page.tsx` grubun içine
  taşınır (URL değişmez, `/` yine `/`).
- **C2 — Header'ı kök layout'a koy, builder'da gizle:** daha kırılgan,
  koşullu render gerekir.

### Karar D — Lenis (yumuşak scroll)

Dürüst uyarı: Lenis scroll'u JS ile ele geçirir. Riskleri: trackpad/mouse
hissi doğallığını kaybedebilir, `scroll-behavior` ve derin bağlantılarla
çakışabilir, klavye scroll'unu etkileyebilir, Lighthouse'ta TBT'ye yazar.
"Awwwards hissi"nin büyük kısmı aslında glow + motion + tipografiden gelir,
scroll hijack'ten değil.

- **D1 — Şimdilik Lenis YOK (önerim):** Framer Motion + CSS ile başla;
  sayfalar oturunca gerçekten eksik hissedersen ekleriz.
- **D2 — Lenis kur:** isteğin bu; reduced-motion'da tamamen devre dışı
  bırakır, Lighthouse'u ölçer ve 90'ın altına düşerse sana bildiririm.

---

**Cevabın gelince kodlamaya başlıyorum. Varsayılanım: A1 · B otomatik düşüş
serbest · C1 · D1.**
