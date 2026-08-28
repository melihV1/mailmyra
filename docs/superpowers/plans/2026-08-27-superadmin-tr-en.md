# Süper Admin TR/EN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `(admin)` personel paneli TR/EN olur — aynı `mm-lang` çerezi, navbar'da seçici, tüm krom sözlüklerden; veri/defter içerikleri, e-postalar, para biçimi ve imza önizlemesi dokunulmaz.

**Architecture:** Dalga B makinesi: `(admin)/layout` LangProvider + AdminShell lang attr + `AdminLanguageMenu` → formatlayıcılar `lang = 'en'` varsayılanıyla genişler (kırılmasız) → AdminShell/navbar kabuğu labelKey desenine → domain süpürmeleri (9 sözlük) → sayfa metadata'ları → doğrulama. META/durum tabloları Dalga B "looks" deseniyle dil-anahtarlı `Mirror`'lı olur.

**Tech Stack:** Next.js App Router · mevcut `lib/i18n/` çekirdeği · vitest.

**Spec:** `docs/superpowers/specs/2026-08-27-superadmin-tr-en-design.md`

## Global Constraints

- npm (pnpm YASAK). `npm test -w apps/web` · `npm run typecheck` · build `DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder" npm run build -w apps/web`.
- **EN krom metinleri BAYT-BAYT korunur** (en dict değeri = sökülen literal; em-dash/kesme işaretleri dahil). Bu dalga İngilizce admin UX'ini değiştirmez.
- `tr` HER sözlükte DOĞRUDAN `Mirror<typeof en>` literal'i; ortak kelimeler `common`/`admin-common`dan yeniden kullanılır, kopyalanmaz.
- **VERİ çevrilmez:** org/müşteri adları, e-postalar, referanslar (SUP-/INV-/KVKK-), staff sebepleri, AdminAction/StaffAccess defter içerikleri, fixture verileri, kolon-değeri durum KODLARI (`open`, `trial` gibi ham değerler veri olarak basılıyorsa) — yalnız İNSAN-OKUR ETİKETLERİ sözlüğe gider. Repo'nun Türkçe hata mesajları HAM kalır (spec §2).
- Para 'en' biçiminde KALIR (`formatMoney`, `Intl.NumberFormat('en'…)` çağrıları dil ALMAZ). Tarih/saat formatlayıcıları `lang: Lang = 'en'` parametresiyle genişler — varsayılan bayt-bayt eski davranış.
- "— Mailmyra staff" sekme soneki ve "Mailmyra" markası çevrilmez; breadcrumb kökü "Staff" → TR "Personel".
- TR üslup: "sen"; sözlükçe: spec §4 (onay · veri talebi · defter · erişim/işlem günlüğü · kuyruk · koltuk · deneme · tahsis · dağıtım · iş · bayrak) + Dalga B sözlükçesi.
- Pazarlama, lib/mail, renderer, `(app)` müşteri sözlükleri (yalnız `common` paylaşımı serbest) DOKUNULMAZ. `/dev/admin-preview` fixture verileri dokunulmaz.
- Commit'ler İngilizce conventional + `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: Altyapı — LangProvider, dil seçici, admin-common, CLAUDE.md

**Files:**
- Modify: `apps/web/app/(admin)/layout.tsx` (getLang + LangProvider sarmalı — `(app)/layout.tsx` emsali birebir)
- Modify: `apps/web/app/(admin)/AdminShell.tsx` (YALNIZ kök sarmalayıcı div'e `lang={useLang()}` — menü etiketleri Task 3'ün işi)
- Create: `apps/web/app/(admin)/AdminLanguageMenu.tsx` (`(app)/navbar/LanguageMenu.tsx`in admin sürümü — aynı çerez+refresh; navbar araç listesinde `ThemeMenu` yanına, AdminShell'de tek satır ekleme)
- Create: `apps/web/lib/i18n/dict/admin-common.ts` (süpürmelerin ortak kelimeleri: Refresh, Cancel/Close `common`dan; buraya yalnız admin-geneli olanlar — örn. 'Reason', 'Required', 'Staff', 'Preview', 'Live', 'Setup', 'Never', 'Unassigned' gibi tekrar edenler; envanteri Task 3-12 süpürmeleri doldurur, başlangıçta bilinen çekirdek)
- Modify: `CLAUDE.md` (iki tarihli revizyon — spec başlığındaki ① ve ②; mevcut revizyon bloklarının biçimiyle)

- [ ] Uygula → `npm run typecheck` + `npm test -w apps/web` + prod build → Commit: `feat(admin-i18n): language plumbing — provider, picker, admin-common dict; CLAUDE.md revisions`

---

### Task 2: Formatlayıcılar dil alır (kırılmasız)

**Files:**
- Modify: `apps/web/app/(admin)/ui/OperationsShared.tsx` (`formatCompactDate(value, lang: Lang = 'en')`; 'Not recorded' fallback'i dil-anahtarlı — admin-common'a) 
- Modify: `apps/web/app/(admin)/ui/AdminActionLogView.tsx:299`, `StaffAccessLogView.tsx:285,451`, `PlatformOperationsViews.tsx:83`, `ReportingOperationsViews.tsx:61` (Intl/`toLocale*` çağrıları lang parametreli yardımcılara — mümkünse OperationsShared'a `formatDateTime(value, lang = 'en')` eklenerek)
- Modify: `apps/web/app/(admin)/operations-model.ts:133`, `product-analytics-model.ts:120,141`, `growth-analytics-model.ts:76` (ay-adı üretimi `lang = 'en'` parametresi)

Kural: HER imza `= 'en'` varsayılanıyla — hiçbir çağıran bu görevde güncellenmez, davranış bayt-bayt aynı (testler kanıt). Para formatlayıcıları DOKUNULMAZ.

- [ ] Uygula → typecheck + tam takım (asserti olan model testleri değişmeden geçmeli) → Commit: `refactor(admin): date/time formatters accept lang with en default`

---

## Süpürme görevleri (Task 3–11) — ORTAK YÖNTEM

Dalga B yöntemi aynen: ① dosyalardaki kullanıcıya görünen HER metni
çıkar ② domain sözlüğünü yaz (en = literal BİREBİR; tr Mirror literal)
③ çağrı yerleri `useLang()`/prop ile bağlanır (görünümler istemci —
çoğunda `useLang()` doğrudan; sunucu sayfa parçaları `getLang()`)
④ META/durum tabloları dil-anahtarlı `Record<Lang, …>` + Mirror (Dalga
B looks emsali) ⑤ bu görevin dosyalarındaki formatlayıcı çağrılarına
`lang` geçilir ⑥ kaçak grep + gerekçe listesi ⑦ commit. Test etiket
assert'i kırılırsa: EN-default sayesinde çoğu kırılmaz; kırılan varsa
test yeni imzaya güncellenir ve raporlanır.

### Task 3: Kabuk + navbar (`admin-nav.ts`)
AdminShell MENU→labelKey (PanelShell deseni BİREBİR; href/icon/status
yapısı değişmez) + WORKSPACE_SHORTCUTS + kabuk metinleri ("Staff
console", rail, footer) · AdminNavbarTools (CREATE_ACTIONS,
SOURCE_STATUS, operations inbox) · AdminSearch · StaffUserMenu ·
AdminPageHeader ("Staff"→"Personel" kökü) · RefreshButton ·
AdminEmptyState · StaffDialog · AdminQueue (EMPTY_TEXT looks-deseni) ·
AdminAuditTimeline.
Commit: `feat(admin-i18n): shell, navbar and shared chrome from dictionaries`

### Task 4: Command center (`admin-command.ts`)
CommandCenterView + CommandCenterControls (+ ana `admin/page.tsx`
kromu). Commit: `feat(admin-i18n): command center translated`

### Task 5: Customers (`admin-customers.ts`)
CustomerOperationsViews + CustomerTable + TrialsEntitlementsView +
orgs/[id] diyalogları (EntitlementDialog, SignaturePreviewButton kromu —
iframe içeriği DOKUNULMAZ). Commit: `feat(admin-i18n): customers surface translated`

### Task 6: Product (`admin-product.ts`)
ProductOperationsViews (TEMPLATE_META looks-deseni — şablon adları
builder dict'iyle TERİM-uyumlu: Kurumsal ayraçlı/Fotoğraf önde/CTA
bantlı). Commit: `feat(admin-i18n): product surface translated`

### Task 7: Revenue (`admin-revenue.ts`)
RevenueOperationsViews + InvoiceWorkbenchView + InvoiceCreateDialog +
InvoiceRowActions + invoices sayfa kromu. Para biçimi dokunulmaz.
Commit: `feat(admin-i18n): revenue surface translated`

### Task 8: Growth (`admin-growth.ts`)
GrowthOperationsViews (LEAD_META looks) + LeadActions.
Commit: `feat(admin-i18n): growth surface translated`

### Task 9: Support + Platform (`admin-support.ts`, `admin-platform.ts`)
SupportOperationsViews (STATUS_META/PRIORITY_TONE/CATEGORY_ICON looks;
Task 7'nin iplik/composer metinleri dahil) + SupportActions ·
PlatformOperationsViews (SERVICE/MAIL/JOB/ERROR/RELEASE/FLAG_META) +
ErrorActions + ScheduleActions.
Commit: `feat(admin-i18n): support and platform surfaces translated`

### Task 10: Security/Governance (`admin-security.ts`) — EN AĞIR
GovernanceOperationsViews + ApprovalActions + KvkkActions +
StaffAccessLogView + AdminActionLogView + StaffFlagActions + security
sayfa kromları. Defter İÇERİKLERİ (before/after değerleri, sebepler)
veri — çevrilmez; yalnız etiket/başlık/boş-durum.
Commit: `feat(admin-i18n): security and governance surfaces translated`

### Task 11: Reports (`admin-reports.ts`)
ReportingOperationsViews + ScheduleActions'ın rapor kromu (Task 9'da
bitmediyse) + reports sayfaları. Commit: `feat(admin-i18n): reports surface translated`

---

### Task 12: Sayfa metadata'ları

44 sayfa: 34 `export const metadata` → `generateMetadata()` (getLang;
başlık sözlükten + değişmez " — Mailmyra staff" soneki) + 10 eksik
sayfaya backfill (platform×7, playbooks, onboarding, [...workspace]).
Sayfaların `title/crumb/support` PROP'ları da (AdminPageHeader'a giden)
sözlükten gelir — süpürme görevlerinde domain sözlüklerine girmişse
oradan, kalanlar burada tamamlanır.
Commit: `feat(admin-i18n): page titles and headers localized`

### Task 13: Tam doğrulama + görsel duman

typecheck · `npm test` (kök) · prod build · kaçak grep (admin geneli) ·
görsel: yerel staff kullanıcıyla admin EN↔TR geçişi (navbar seçici),
menü/komuta merkezi/kuyruk/destek ipliği/bir yazma diyaloğu + toast
başlığı TR; fixture önizleme sayfası kromu TR ama verisi EN.
Ekran görüntüleri + rapor.

## Self-Review Notu

- Spec kapsaması: §1→T1 · §3→T2 · §2 içeriler→T3-12 · §5→T13. §6
  bayrakları rapora.
- Kırılmasızlık: T2'nin `= 'en'` varsayılanı sayesinde süpürülmemiş
  domain'ler her an EN ve testler yeşil — dalga istenirse bölünebilir.
- Bilinçli sapma: süpürme görevleri satır satır kod içermez (Dalga B
  emsali) — kalıp + sözlükçe + kaçak taraması + Mirror güvencesi.
