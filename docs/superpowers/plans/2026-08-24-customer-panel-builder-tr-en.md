# Dalga B — Müşteri Paneli + Builder TR/EN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `(app)` müşteri paneli + builder TR/EN olur: dil çerez > tarayıcı (`Accept-Language`) > EN sırasıyla seçilir, LanguageMenu ve builder düğmesiyle değiştirilir, tüm arayüz metinleri (guides içeriği dahil) tip-güvenli sözlüklerden gelir.

**Architecture:** Kütüphanesiz i18n: `lib/i18n/` çekirdeği (Lang tipi, `Mirror<T>` derleme bekçisi, `preferredLang` saf ayrıştırıcı, `getLang()` sunucu okuyucu, `LangProvider/useLang` istemci bağlamı, `mm-lang` çerezi) + alan başına `dict/` modülleri (en+tr yan yana, `Mirror` eksik çeviriyi derlemede kırar). Metin taşıma görevleri yüzey yüzey ilerler; guides içeriği en/tr dosyalarına ayrılır ve yapısal eşlik testiyle korunur.

**Tech Stack:** Next.js App Router (cookies/headers async) · TypeScript · Vitest (node) · Vuexy markup.

**Spec:** `docs/superpowers/specs/2026-08-24-customer-panel-builder-tr-en-design.md`

## Global Constraints

- Paket yöneticisi **npm** (pnpm YASAK). Kökten `npm test`, `npm run typecheck`; tek dosya: `npm test -w apps/web -- test/<dosya>.test.ts`. Prod build: `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web`.
- **EN metinler BİREBİR korunur:** sözlüğe taşınan `en` değeri bugünkü literal'in aynısıdır — bu dalga İngilizce UX'i DEĞİŞTİRMEZ. (Tek istisna yok; "iyileştireyim" yok.)
- **Kapsam dışına dokunulmaz:** `(admin)` · `(marketing)` · `lib/mail` şablonları · `packages/renderer` · `/kvkk` ve legal. `(admin)` hiçbir `lib/i18n/dict/*` modülünü import ETMEZ.
- Kök `apps/web/app/layout.tsx` `<html lang="en">` DEĞİŞMEZ; `lang={lang}` yalnız panel/builder sarmalayıcılarına.
- Kullanıcı VERİSİ ve teknik terimler çevrilmez: imza/org/kişi adları, e-postalar, `SUP-2026-0001`, dosya adları, SPF/DKIM. Sunucu hata KODLARI çevrilmez; ekrandaki karşılığı sözlükten.
- **TR üslup: "sen"** hitabı; başlıklarda Türkçe cümle düzeni (yalnız ilk harf büyük). Marka adları kalır: **Mailmyra**, **Builder** (ürün adı muamelesi).
- **Sözlükçe (bağlayıcı, tüm görevlerde aynı):** sender→gönderici · seat→koltuk · signature→imza · workspace→çalışma alanı · draft→taslak · live→yayında · publish→yayına al · inactive→pasif · deactivate→pasifleştir · export→dışa aktar(ım) · member→üye · invitation→davet · Owner→Sahip · Admin→Yönetici · Editor→Düzenleyici · Viewer→Görüntüleyici · brand→marka · Dashboard→Panel · Support→Destek · support case→destek talebi · Setup guides→Kurulum rehberleri · Activity→Aktivite · Billing & Plan→Fatura ve Plan · Security→Güvenlik · Notifications→Bildirimler.
- Yeni bağımlılık YOK · migration YOK.
- Commit mesajları İngilizce, conventional; sonunda `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: i18n çekirdeği (`lib/i18n/`) — TDD

**Files:**
- Create: `apps/web/lib/i18n/types.ts`
- Create: `apps/web/lib/i18n/detect.ts`
- Create: `apps/web/lib/i18n/lang.server.ts`
- Create: `apps/web/lib/i18n/LangProvider.tsx`
- Create: `apps/web/lib/i18n/cookie.ts`
- Create: `apps/web/lib/i18n/format.ts`
- Create: `apps/web/lib/i18n/dict/common.ts`
- Test: `apps/web/test/i18n-detect.test.ts`

**Interfaces:**
- Consumes: yok (yaprak modül).
- Produces (sonraki TÜM görevler bunlara yaslanır):
  - `types.ts`: `type Lang = 'en' | 'tr'` · `LANGS` · `LANG_COOKIE = 'mm-lang'` · `isLang(v): v is Lang` · `Mirror<T>`
  - `detect.ts`: `preferredLang(acceptLanguage: string): Lang`
  - `lang.server.ts`: `getLang(): Promise<Lang>` (yalnız sunucu)
  - `LangProvider.tsx`: `<LangProvider lang>` + `useLang(): Lang` (istemci)
  - `cookie.ts`: `setLangCookie(lang: Lang): void` (istemci)
  - `format.ts`: `formatDate(lang, date): string`
  - `dict/common.ts`: `common = { en, tr }` (ortak düğme/durum metinleri)

- [ ] **Step 1: Başarısız testi yaz** — `apps/web/test/i18n-detect.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { preferredLang } from '../lib/i18n/detect';

/**
 * Tarayıcı dili ayrıştırma sözleşmesi (Dalga B): yalnız tr/en tanınır,
 * en yüksek q kazanır, eşitlikte listede önce gelen; boş/bozuk → en.
 */
describe('preferredLang', () => {
  it('boş ya da tanınmayan başlık en', () => {
    expect(preferredLang('')).toBe('en');
    expect(preferredLang('de-DE,fr;q=0.8')).toBe('en');
  });

  it('tr-TR bölge etiketi tanınır', () => {
    expect(preferredLang('tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('tr');
  });

  it('q değeri sırayı yener', () => {
    expect(preferredLang('en;q=0.5,tr;q=0.9')).toBe('tr');
    expect(preferredLang('tr;q=0.3,en')).toBe('en');
  });

  it('eşit q değerinde listede önce gelen kazanır', () => {
    expect(preferredLang('en,tr')).toBe('en');
    expect(preferredLang('tr,en')).toBe('tr');
  });

  it('büyük harf ve boşluk toleransı', () => {
    expect(preferredLang(' TR-tr ')).toBe('tr');
  });

  it('bozuk q değeri 1 sayılır', () => {
    expect(preferredLang('tr;q=abc,en;q=0.9')).toBe('tr');
  });
});
```

- [ ] **Step 2: Başarısızlığı gör**

Run: `npm test -w apps/web -- test/i18n-detect.test.ts`
Expected: FAIL — `Cannot find module '../lib/i18n/detect'`.

- [ ] **Step 3: `types.ts`**

```ts
/** Panel/builder dil altyapısının çekirdek tipleri (Dalga B, spec 2026-08-24). */

export type Lang = 'en' | 'tr';

export const LANGS = ['en', 'tr'] as const;

/** Elle seçim çerezi — cihaz başına kalıcı, DB kolonu bilinçli yok (spec §2). */
export const LANG_COOKIE = 'mm-lang';

export function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'tr';
}

/**
 * tr sözlüğü en'in şeklini BİREBİR taşımak zorunda: string yaprak →
 * string, fonksiyon yaprak → aynı imza, iç içe nesne → aynı iskelet.
 * Eksik/fazla anahtar derlemede kırılır — bekçi test değil derleyicidir.
 */
export type Mirror<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : T[K] extends string
      ? string
      : T[K] extends readonly string[]
        ? readonly string[]
        : Mirror<T[K]>;
};
```

- [ ] **Step 4: `detect.ts`**

```ts
import type { Lang } from './types';

/**
 * Accept-Language'tan panel dili. Yalnız tr/en tanınır; en yüksek q
 * kazanır, eşitlikte listede önce gelen. Boş/bozuk başlık → en.
 * SAF fonksiyon — Next başlık API'sine dokunmaz, birim testte koşar.
 */
export function preferredLang(acceptLanguage: string): Lang {
  let best: { lang: Lang; q: number } | null = null;
  for (const part of acceptLanguage.split(',')) {
    const [tagRaw, ...params] = part.trim().split(';');
    const tag = (tagRaw ?? '').trim().toLowerCase();
    let lang: Lang | null = null;
    if (tag === 'tr' || tag.startsWith('tr-')) lang = 'tr';
    else if (tag === 'en' || tag.startsWith('en-')) lang = 'en';
    if (!lang) continue;

    let q = 1;
    for (const param of params) {
      const [key, value] = param.trim().split('=');
      if (key === 'q' && value !== undefined) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) q = parsed;
      }
    }
    if (!best || q > best.q) best = { lang, q };
  }
  return best?.lang ?? 'en';
}
```

- [ ] **Step 5: Testler geçsin**

Run: `npm test -w apps/web -- test/i18n-detect.test.ts`
Expected: PASS (6 test).

- [ ] **Step 6: `lang.server.ts`**

```ts
import { cookies, headers } from 'next/headers';

import { preferredLang } from './detect';
import { LANG_COOKIE, isLang, type Lang } from './types';

/** Panel dili: çerez > Accept-Language > en. Yalnız sunucu tarafı. */
export async function getLang(): Promise<Lang> {
  const cookie = (await cookies()).get(LANG_COOKIE)?.value;
  if (isLang(cookie)) return cookie;
  return preferredLang((await headers()).get('accept-language') ?? '');
}
```

- [ ] **Step 7: `LangProvider.tsx`**

```tsx
'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { Lang } from './types';

/**
 * Sunucu layout'un çözdüğü dili istemci ağacına taşır. Varsayılan 'en':
 * provider'sız kalan bir istemci bileşeni sessizce İngilizce kalır,
 * kırılmaz.
 */
const LangContext = createContext<Lang>('en');

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}
```

- [ ] **Step 8: `cookie.ts`**

```ts
import { LANG_COOKIE, type Lang } from './types';

/** Elle dil seçimi — 1 yıl, tüm site, Lax. Çağıran refresh'i kendisi yapar. */
export function setLangCookie(lang: Lang): void {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
}
```

- [ ] **Step 9: `format.ts`**

```ts
import type { Lang } from './types';

const DATE_LOCALE: Record<Lang, string> = { en: 'en-GB', tr: 'tr-TR' };

/** Panel genelinde kısa tarih: "24 Aug 2026" / "24 Ağu 2026". */
export function formatDate(lang: Lang, date: Date): string {
  return date.toLocaleDateString(DATE_LOCALE[lang], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
```

- [ ] **Step 10: `dict/common.ts`** (kalıbın kanonik örneği — sonraki görevler bu deseni kopyalar)

```ts
import type { Mirror } from '../types';

const en = {
  cancel: 'Cancel',
  save: 'Save',
  close: 'Close',
  delete: 'Delete',
  edit: 'Edit',
  loading: 'Loading…',
  failedTryAgain: 'Failed — try again.',
} as const;

const tr: Mirror<typeof en> = {
  cancel: 'Vazgeç',
  save: 'Kaydet',
  close: 'Kapat',
  delete: 'Sil',
  edit: 'Düzenle',
  loading: 'Yükleniyor…',
  failedTryAgain: 'Olmadı — tekrar dene.',
};

export const common = { en, tr } as const;
```

- [ ] **Step 11: Doğrula ve commit**

Run: `npm run typecheck` → PASS · `npm test -w apps/web` → tümü PASS.

```bash
git add apps/web/lib/i18n apps/web/test/i18n-detect.test.ts
git commit -m "feat(i18n): core — Lang type, Mirror guard, Accept-Language parser, server/client access, mm-lang cookie

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Dil seçim yüzeyleri — LanguageMenu, builder düğmesi, layout bağlama

**Files:**
- Modify: `apps/web/app/(app)/layout.tsx` (getLang + LangProvider)
- Modify: `apps/web/app/(app)/PanelShell.tsx` (kök div'e `lang`; menü metinleri Task 3'te)
- Modify: `apps/web/app/(app)/navbar/LanguageMenu.tsx` (pasif → gerçek seçim)
- Modify: `apps/web/app/builder/layout.tsx` (getLang + LangProvider + `lang` özniteliği)
- Create: `apps/web/app/builder/LangToggle.tsx`
- Modify: `apps/web/app/builder/BuilderClient.tsx` (başlık satırına LangToggle)

**Interfaces:**
- Consumes: Task 1'in tamamı.
- Produces: `(app)` ve builder ağacında `useLang()` çalışır durumda; `LangToggle` builder başlığında.

- [ ] **Step 1: `(app)/layout.tsx`** — import ekle ve dönüşü sar:

```tsx
import { LangProvider } from '../../lib/i18n/LangProvider';
import { getLang } from '../../lib/i18n/lang.server';
```

Gövdede `const lang = await getLang();` (session satırından sonra) ve:

```tsx
return (
  <>
    <link rel="stylesheet" href="/vuexy/core.css" />
    <link rel="stylesheet" href="/vuexy/icons.css" />
    <link rel="stylesheet" href="/vuexy/layout.css" />
    <LangProvider lang={lang}>
      <PanelShell
        email={session.user.email}
        role={role}
        seatsFull={seats.entitled > 0 && seats.active >= seats.entitled}
        seatsBadge={`${seats.active}/${seats.entitled}`}
        avatarUrl={session.user.avatarUrl}
        staff={staff}
      >
        {children}
      </PanelShell>
    </LangProvider>
  </>
);
```

- [ ] **Step 2: `PanelShell.tsx` kök div'e `lang`** — bileşen içinde `const lang = useLang();` (import `useLang` `'../../lib/i18n/LangProvider'`) ve kök sarmalayıcı div'ine (mevcut `'mm-panel layout-navbar-fixed layout-menu-fixed layout-compact'` className'li öğe) `lang={lang}` özniteliği ekle. Başka değişiklik YOK (menü metinleri Task 3).

- [ ] **Step 3: `LanguageMenu.tsx` yeniden yaz**

```tsx
'use client';

import { useRouter } from 'next/navigation';

import { useLang } from '../../../lib/i18n/LangProvider';
import { setLangCookie } from '../../../lib/i18n/cookie';
import { LANGS, type Lang } from '../../../lib/i18n/types';
import { useDropdown } from './useDropdown';

/** Dil adı KENDİ dilinde yazılır — evrensel menü kuralı, çevrilmez. */
const LABELS: Record<Lang, string> = { en: 'English', tr: 'Türkçe' };

/**
 * Dil menüsü — 2026-08-13'ten beri bilerek pasifti ("TR gelirse gerçek
 * seçime döner"); TR geldi (Dalga B, spec 2026-08-24). Seçim çerez +
 * refresh: sunucu bileşenleri yeni dille yeniden çizilir.
 */
export function LanguageMenu() {
  const router = useRouter();
  const lang = useLang();
  const { open, setOpen, ref } = useDropdown<HTMLLIElement>();

  const pick = (next: Lang) => {
    setOpen(false);
    if (next === lang) return;
    setLangCookie(next);
    router.refresh();
  };

  return (
    <li className="nav-item dropdown me-2 me-xl-0" ref={ref}>
      <button
        type="button"
        className="nav-link dropdown-toggle hide-arrow btn btn-icon btn-text-secondary rounded-pill"
        aria-label="Language"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <i className="icon-base ti tabler-language icon-22px text-heading" aria-hidden="true" />
      </button>
      <ul className={`dropdown-menu dropdown-menu-end${open ? ' show' : ''}`}>
        {LANGS.map((l) => (
          <li key={l}>
            <button
              type="button"
              className={`dropdown-item${l === lang ? ' active' : ''}`}
              onClick={() => pick(l)}
            >
              {LABELS[l]}
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}
```

- [ ] **Step 4: Builder layout** — `apps/web/app/builder/layout.tsx` async olur:

```tsx
import type { ReactNode } from 'react';

import { LangProvider } from '../../lib/i18n/LangProvider';
import { getLang } from '../../lib/i18n/lang.server';
import '../(app)/panel-overrides.css';

/* (mevcut açıklama yorumu AYNEN kalır) */
export default async function BuilderLayout({ children }: { children: ReactNode }) {
  const lang = await getLang();
  return (
    <>
      <link rel="stylesheet" href="/vuexy/core.css" />
      <link rel="stylesheet" href="/vuexy/icons.css" />
      <div className="mm-panel" data-skin="default" data-bs-theme="light" lang={lang}>
        <LangProvider lang={lang}>{children}</LangProvider>
      </div>
    </>
  );
}
```

- [ ] **Step 5: `LangToggle.tsx`** (yeni):

```tsx
'use client';

import { useRouter } from 'next/navigation';

import { useLang } from '../../lib/i18n/LangProvider';
import { setLangCookie } from '../../lib/i18n/cookie';
import type { Lang } from '../../lib/i18n/types';

/**
 * Builder'ın navbar'ı yok — başlık hizasında iki harfli sade seçim
 * (spec §2; Hüseyin bayrak 2). Panel LanguageMenu'suyla aynı çerez.
 */
export function LangToggle() {
  const router = useRouter();
  const lang = useLang();

  const pick = (next: Lang) => {
    if (next === lang) return;
    setLangCookie(next);
    router.refresh();
  };

  return (
    <div className="btn-group btn-group-sm" role="group" aria-label="Language">
      {(['en', 'tr'] as const).map((l) => (
        <button
          key={l}
          type="button"
          className={`btn ${l === lang ? 'btn-primary' : 'btn-label-secondary'}`}
          onClick={() => pick(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: BuilderClient başlığına yerleştir** — `BuilderClient.tsx` ~342-345'teki başlık bölgesinde `<h4 className="mb-1">Signature builder</h4>` satırını içeren başlık satırını bul; başlıkla aynı hizada sağa `<LangToggle />` ekle (mevcut satır düzenini bozmadan, gerekiyorsa `d-flex justify-content-between align-items-start` sarmalayıcıyla — dosyadaki mevcut düzeni koru). Import: `import { LangToggle } from './LangToggle';`

- [ ] **Step 7: Doğrula ve commit**

Run: `npm run typecheck` → PASS.
Run: `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web` → hatasız.

```bash
git add "apps/web/app/(app)/layout.tsx" "apps/web/app/(app)/PanelShell.tsx" "apps/web/app/(app)/navbar/LanguageMenu.tsx" apps/web/app/builder/layout.tsx apps/web/app/builder/LangToggle.tsx apps/web/app/builder/BuilderClient.tsx
git commit -m "feat(i18n): language pickers live — panel menu, builder toggle, lang attr and providers wired

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Metin taşıma görevleri (Task 3–8) — ORTAK YÖNTEM

Her taşıma görevi aynı reçeteyi izler; görev tanımları yalnız dosya
listesi + sözlük modülü + göreve özgü notları verir.

1. Görevin dosyalarındaki kullanıcıya görünen HER metni çıkar: JSX metni,
   `label/placeholder/title/aria-label`, toast çağrıları, form hataları,
   boş-durum kartları, `metadata` başlıkları.
2. Görevin `dict/` modülünü yaz: `en` = mevcut literal'ler BİREBİR
   (Global Constraints: EN UX değişmez), `tr` = sözlükçeye ve "sen"
   üslubuna uygun çeviri; parametreli metin fonksiyon anahtar olur.
3. Çağrı yerlerini değiştir: sunucu bileşeni `const t = <modül>[await getLang()]`,
   istemci bileşeni `const t = <modül>[useLang()]`.
4. Sayfa `export const metadata`'sını `generateMetadata()`'ya çevir:

```ts
import { getLang } from '../../../../lib/i18n/lang.server';
// dict modülünden: pageTitle: 'Senders — Mailmyra' / 'Göndericiler — Mailmyra'
export async function generateMetadata() {
  return { title: <modül>[await getLang()].pageTitle };
}
```

5. Tarihler: `toLocaleDateString(...)` çağrıları `formatDate(lang, d)`'ye
   döner (görevin dosyalarında geçiyorsa).
6. Doğrulama: `npm run typecheck` + `npm test -w apps/web` + kaçak tarama
   `grep -n "label=\"[A-Z]\|placeholder=\"[A-Z]\|>[A-Z][a-z]" <görev dosyaları>`
   sonucu elde kalan her satırın bilinçli olduğunu (kullanıcı verisi /
   marka adı / teknik terim) raporla.
7. Commit (görev başlığındaki mesajla).

---

### Task 3: Kabuk + navbar + dashboard sözlüğü

**Files:**
- Create: `apps/web/lib/i18n/dict/nav.ts`, `apps/web/lib/i18n/dict/dashboard.ts`
- Modify: `apps/web/app/(app)/PanelShell.tsx` (MENU etiketleri, footer, arama placeholder'ı, aria'lar)
- Modify: `apps/web/app/(app)/navbar/UserMenu.tsx`, `ShortcutsMenu.tsx`, `SearchPalette.tsx`, `ThemeMenu.tsx`, `NotificationsBell.tsx` (yalnız kabuk metinleri; bildirim İÇERİĞİ Task 6), `apps/web/app/(app)/TourLauncher.tsx`
- Modify: `apps/web/app/(app)/app/page.tsx` (dashboard) + `charts/` metinleri

**Interfaces:**
- Consumes: Task 1-2 (`useLang`, `getLang`, `Mirror`, `common`).
- Produces: `nav`, `dashboard` sözlük modülleri (`{ en, tr }` deseni).

Notlar: MENU dizisindeki `label`'lar sözlükten gelir (`Dashboard→Panel`,
`Signatures→İmzalar`, `Senders→Göndericiler`, `Members→Üyeler`,
`Brand→Marka`, `Activity→Aktivite`, `Account→Hesap`, `Profile→Profil`,
`Security→Güvenlik`, `Billing & Plan→Fatura ve Plan`,
`Notifications→Bildirimler`, `Setup guides→Kurulum rehberleri`,
`Support→Destek`, `Open builder→Builder'ı aç`). ShortcutsMenu kısayol
adları/notları aynı karşılıklarla. Rol adları sözlükçeden.

- [ ] Ortak yöntemi uygula (1-7) ve commit:

```bash
git commit -m "feat(i18n): shell, navbar and dashboard strings from dictionaries

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Signatures + Senders

**Files:**
- Create: `apps/web/lib/i18n/dict/signatures.ts`, `apps/web/lib/i18n/dict/senders.ts`
- Modify: `apps/web/app/(app)/app/signatures/` tüm dosyalar (page, SignatureTable, RowActions, …)
- Modify: `apps/web/app/(app)/app/senders/` tüm dosyalar (page, SenderTable, AddSenderForm, ImportCsv, EditSenderDialog, AssignSelect, SenderActions, `[id]` detay + SenderDetailActions, …)

**Interfaces:**
- Consumes: Task 1-2 + `common`.
- Produces: `signatures`, `senders` sözlük modülleri.

Notlar: koltuk sayacı/uyarıları parametreli fonksiyon anahtarlar
(`seatNote(active, entitled)` gibi). CSV içe aktarım hata satırları
sözlükten; CSV BAŞLIK adları (dosya biçimi) çevrilmez — teknik sözleşme.
Toast metinleri (başarı/hata) sözlükten.

- [ ] Ortak yöntemi uygula (1-7) ve commit:

```bash
git commit -m "feat(i18n): signatures and senders surfaces translated

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Members + Brand + Account kümesi

**Files:**
- Create: `apps/web/lib/i18n/dict/members.ts`, `apps/web/lib/i18n/dict/brand.ts`, `apps/web/lib/i18n/dict/account.ts`
- Modify: `apps/web/app/(app)/app/members/` (page, MemberActions, InviteForm, WorkspaceCard, …)
- Modify: `apps/web/app/(app)/app/brand/` (page, BrandClient, …)
- Modify: `apps/web/app/(app)/app/account/` tümü (AccountTabs, DangerZone, EmailChangeForm, SecurityForms, billing/, notifications/ + PreferencesForm, security/, page) + `apps/web/app/(app)/app/profile/` + AvatarUpload

**Interfaces:**
- Consumes: Task 1-2 + `common`.
- Produces: `members`, `brand`, `account` sözlük modülleri.

Notlar: DangerZone onay metinleri birebir anlam korunarak çevrilir
(hukuki/dönülmez eylem uyarıları yumuşatılmaz). Bildirim TERCİH
etiketleri burada (tercih ekranı); bildirim içerik metinleri Task 6.

- [ ] Ortak yöntemi uygula (1-7) ve commit:

```bash
git commit -m "feat(i18n): members, brand and account surfaces translated

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Activity + Notifications içerikleri + zaman/tarih

**Files:**
- Modify: `apps/web/app/(app)/activity-looks.ts` → `ACTIVITY_LOOKS: Record<Lang, Record<ActivityType, Look>>` + `activityFilters(lang)`
- Modify: `apps/web/app/(app)/notification-looks.ts` → aynı kalıp + `timeAgo(lang, date)`
- Modify: `apps/web/app/(app)/app/activity/page.tsx`, `apps/web/app/(app)/app/notifications/` (InboxClient, page), `navbar/NotificationsBell.tsx` (içerik çağrıları)
- Modify: `timeAgo`/tarih çağıran diğer (app) dosyaları (grep: `timeAgo(`, `toLocaleDateString`)

**Interfaces:**
- Consumes: Task 1-2 (`Lang`, `Mirror`, `formatDate`).
- Produces: dil-farkında `ACTIVITY_LOOKS`, `NOTIFICATION_LOOKS`, `timeAgo(lang, date)` imzaları — çağıranlar bu imzayla güncellenir.

Notlar: `tr` gövdeleri `Mirror` ile zorunlu (14 aktivite + 3 bildirim
tipi + filtre etiketleri). Olay dili GEÇMİŞ ZAMANLI kalır ("Gönderici
yayına alındı"). "Mailmyra support" öznesi TR'de "Mailmyra destek".

- [ ] Ortak yöntemi uygula (1-7) ve commit:

```bash
git commit -m "feat(i18n): activity/notification looks and relative time localized

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Support + ortak bileşenler + Dalga A minor'ları

**Files:**
- Create: `apps/web/lib/i18n/dict/support.ts`
- Modify: `apps/web/app/(app)/app/support/support-labels.ts` → `TICKET_CATEGORIES(lang)`, `CASE_STATUS_LOOKS[lang]`
- Modify: `apps/web/app/(app)/app/support/page.tsx`, `NewTicketForm.tsx`
- Modify: `apps/web/components/ExportButtons.tsx` (+ panel/builder'ın kullandığı, metin taşıyan diğer `components/` dosyaları — görev başında grep ile doğrula)

**Interfaces:**
- Consumes: Task 1-2 + `common`.
- Produces: `support` sözlük modülü; dil-farkında `support-labels` imzaları.

Notlar (Dalga A minor'ları BURADA kapanır):
1. `CASE_STATUS_LOOKS` erişimine savunmacı fallback: bilinmeyen durum
   çökertmez, ham durum adı + `secondary` ton gösterir.
2. `NewTicketForm.submit` fetch'i try/catch'e alınır: ağ hatasında
   `busy` sıfırlanır ve sözlükten genel hata gösterilir.
3. Durum etiketleri TR: open→"Açık", waiting_customer→"Cevabınız
   bekleniyor", escalated→"İşlemde", resolved→"Çözüldü". Dürüstlük bandı:
   "Yanıtlar e-postayla gelir — bu sayfa talebinin durumunu gösterir."

- [ ] Ortak yöntemi uygula (1-7) ve commit:

```bash
git commit -m "feat(i18n): support surface translated; status fallback and form error handling hardened

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Builder

**Files:**
- Create: `apps/web/lib/i18n/dict/builder.ts`
- Modify: `apps/web/app/builder/page.tsx` (generateMetadata), `BuilderClient.tsx`, `SaveDialog.tsx`, `Preview.tsx` (arayüz metinleri — imza İÇERİĞİ değil), `steps/InfoStep.tsx`, `steps/SocialStep.tsx`, `steps/StyleStep.tsx`, `steps/VisualsStep.tsx`, `fields.tsx` (yalnız metin prop'ları çağıranlardan gelir — primitives değişmez)

**Interfaces:**
- Consumes: Task 1-2 + `common` (builder ağacı LangProvider'lı — Task 2).
- Produces: `builder` sözlük modülü.

Notlar: **renderer'a ve imza ÇIKTISINA dil sızmaz** — `SignatureData`
alan DEĞERLERİ, önizleme iframe'inin ürettiği HTML, export çıktısı
DOKUNULMAZ. Yalnız builder KABUĞU çevrilir (adım adları, alan
etiketleri, placeholder'lar, kaydet/kopyala düğmeleri, kilit ipuçları).
Form alan adları sözlükçeyle uyumlu (Full name→Ad soyad, Job title→Ünvan,
Company→Şirket, Phone→Telefon, Website→Web sitesi, Address→Adres,
Button label→Buton etiketi, Button link→Buton bağlantısı).

- [ ] Ortak yöntemi uygula (1-7) ve commit:

```bash
git commit -m "feat(i18n): builder chrome translated — steps, fields, save/export copy

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Guides içeriği TR — TDD (eşlik testi)

**Files:**
- Create: `apps/web/app/(app)/app/guides/guides-content.en.ts` (mevcut içerik taşınır)
- Create: `apps/web/app/(app)/app/guides/guides-content.tr.ts` (YENİ çeviri)
- Modify: `apps/web/app/(app)/app/guides/guides.data.ts` (tipler kalır; `getGuides(lang)`, `getExportChain(lang)` girişleri)
- Modify: `apps/web/app/(app)/app/guides/page.tsx`, `GuidesClient.tsx` (kabuk metinleri `dict/guides.ts`'ten; içerik `getGuides(lang)`'dan)
- Create: `apps/web/lib/i18n/dict/guides.ts` (sayfa kabuğu: başlık, sekme aria'ları, rozetler)
- Test: `apps/web/test/guides-parity.test.ts`

**Interfaces:**
- Consumes: Task 1-2.
- Produces: `getGuides(lang: Lang): readonly Guide[]` · `getExportChain(lang: Lang): readonly GuideStep[]` (tipler `guides.data.ts`'te kalır).

- [ ] **Step 1: Başarısız eşlik testini yaz** — `apps/web/test/guides-parity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { getExportChain, getGuides } from '../app/(app)/app/guides/guides.data';

/** Çeviri adım atlayamaz: iki dil aynı iskeleti taşır (spec §6). */
describe('guides içerik eşliği', () => {
  const en = getGuides('en');
  const tr = getGuides('tr');

  it('aynı slug listesi, aynı sırada', () => {
    expect(tr.map((g) => g.slug)).toEqual(en.map((g) => g.slug));
  });

  it('grup, adım ve not sayıları birebir', () => {
    en.forEach((guide, i) => {
      const t = tr[i]!;
      expect(t.groups.length).toBe(guide.groups.length);
      guide.groups.forEach((group, j) => {
        expect(t.groups[j]!.steps.length).toBe(group.steps.length);
      });
      expect((t.notes ?? []).length).toBe((guide.notes ?? []).length);
    });
  });

  it('ikon ve fidelity çeviride değişmez', () => {
    en.forEach((guide, i) => {
      expect(tr[i]!.icon).toBe(guide.icon);
      expect(tr[i]!.fidelity).toBe(guide.fidelity);
    });
  });

  it('export zinciri aynı uzunlukta', () => {
    expect(getExportChain('tr').length).toBe(getExportChain('en').length);
  });
});
```

- [ ] **Step 2: Başarısızlığı gör** — `npm test -w apps/web -- test/guides-parity.test.ts` → FAIL (`getGuides` yok).

- [ ] **Step 3: İçeriği böl** — mevcut `EXPORT_CHAIN` + `GUIDES` sabitlerini `guides-content.en.ts`'e taşı (metinler BİREBİR); `guides.data.ts`'te tipler kalır ve giriş eklenir:

```ts
import type { Lang } from '../../../../lib/i18n/types';
import { EXPORT_CHAIN_EN, GUIDES_EN } from './guides-content.en';
import { EXPORT_CHAIN_TR, GUIDES_TR } from './guides-content.tr';

export function getGuides(lang: Lang): readonly Guide[] {
  return lang === 'tr' ? GUIDES_TR : GUIDES_EN;
}
export function getExportChain(lang: Lang): readonly GuideStep[] {
  return lang === 'tr' ? EXPORT_CHAIN_TR : EXPORT_CHAIN_EN;
}
```

- [ ] **Step 4: TR içeriği yaz** — `guides-content.tr.ts`: ~2.300 kelimelik çeviri. Kurallar: içerik dosyasının başındaki iki pazarlıksız kural aynen (6 istemci birebir; kapsam dışı vaat yok) · `backtick` → code tek işaretleme korunur · UI menü adları çevrilmez, gerektiğinde TR karşılık parantezle ("Settings (Ayarlar)") — kullanıcı İngilizce e-posta istemcisinde o menüyü arayacak · "sen" üslubu · slug/icon/fidelity EN ile birebir.

- [ ] **Step 5: Sayfayı bağla** — `page.tsx`/`GuidesClient.tsx` `getGuides(lang)`/`getExportChain(lang)` kullanır; kabuk metinleri `dict/guides.ts`'ten; `generateMetadata()`.

- [ ] **Step 6: Testler geçsin** — `npm test -w apps/web -- test/guides-parity.test.ts` → PASS; `npm run typecheck` → PASS; `npm test -w apps/web` → tümü PASS.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/(app)/app/guides" apps/web/lib/i18n/dict/guides.ts apps/web/test/guides-parity.test.ts
git commit -m "feat(i18n): setup guides content in Turkish with structural parity test

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Tam doğrulama + görsel duman

**Files:** Yok (komut + tarayıcı; bulgu çıkarsa rapor).

- [ ] **Step 1:** `npm run typecheck` → PASS.
- [ ] **Step 2:** `npm test` (kök) → tümü PASS; sayıları raporla.
- [ ] **Step 3:** Prod build (placeholder DATABASE_URL) → hatasız.
- [ ] **Step 4:** Kaçak metin taraması: `(app)` + `builder` dosyalarında `grep -rn "label=\"[A-Z]\|placeholder=\"[A-Z]" …` — kalan her satır bilinçli mi (kullanıcı verisi/marka/teknik) kontrol et, listeyi raporla.
- [ ] **Step 5:** Görsel duman (kontrolör koşar, subagent değil): ana ağaçtan `apps/web/.env.local` worktree'ye kopyalanır, dev sunucu açılır; kontroller — TR `Accept-Language` ile panel TR açılır · LanguageMenu EN↔TR geçişi ve kalıcılığı (yenilemede korunur) · builder düğmesi · guides TR · admin `(admin)` İNGİLİZCE kaldı · imza önizlemesi/çıktısı dilden ETKİLENMEDİ. Ekran görüntüleri Hüseyin'e.
- [ ] **Step 6:** TR metinlerin toplu listesi (özellikle guides + destek durum etiketleri) Hüseyin onayına sunulur — yayın kapısı.

---

## Self-Review Notu

- Spec kapsaması: §2 seçim/kalıcılık→T1-2 · §3 mimari→T1 · §4 mevcut sözlükler→T6-7 · §5 kurallar→Global+ortak yöntem · §6 guides→T9 · §7 test→T1/T9/T10 · §8 Dalga A minor'ları→T7. 
- Bilinçli sapma: taşıma görevleri (T3-8) satır satır kod içermez — kaynak metin envanteri implementer'ın işi; kalıp (T1 Step 10), sözlükçe ve kaçak taraması tamlığı güvenceler. `Mirror` + typecheck eksik çeviriyi derlemede yakalar.
- Tip tutarlılığı: `getLang/useLang/Mirror/formatDate/setLangCookie` adları T1'de tanımlı, sonraki görevler aynı adları kullanıyor; `getGuides/getExportChain` T9 Interfaces'te.
